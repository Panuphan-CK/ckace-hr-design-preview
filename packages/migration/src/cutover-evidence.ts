import {
  HR_MODULE_KEYS,
  legacyProvenanceKey,
  type AuthorityTarget,
  type HrModuleKey,
} from "@ckace/contracts";

import type {
  LegacyExtractedRecord,
  LegacySourceDescriptor,
  LegacySourceSnapshot,
  MigrationRunReport,
} from "./migration-contracts";
import {
  countByStatus,
  hasBlockingReconciliationFailure,
  type ReconciliationResult,
  type ReconciliationStatus,
  validateReconciliationResult,
} from "./reconciliation";
import {
  buildRunReconciliationResults,
  classifyMigrationRun,
} from "./reporting";
import {
  canonicalJson,
  computeLegacySnapshotHash,
  normalizeSourcePeriod,
  sha256Hex,
} from "./source-snapshot";

export type LegacyDeltaChangeType =
  | "ADDED"
  | "CHANGED"
  | "REMOVED";

export interface LegacyDeltaRecord {
  readonly provenanceKey: string;
  readonly changeType: LegacyDeltaChangeType;
  readonly sourceWorkbook: string;
  readonly sourceTab: string;
  readonly sourcePeriod: string;
  readonly legacyId: string;
  readonly baselinePayloadHash: string | null;
  readonly finalPayloadHash: string | null;
}

export interface FinalLegacyDeltaCapture {
  readonly module: HrModuleKey;
  readonly baselineSnapshotSetHash: string;
  readonly finalSnapshotSetHash: string;
  readonly deltaHash: string;
  readonly addedCount: number;
  readonly changedCount: number;
  readonly removedCount: number;
  readonly records: readonly LegacyDeltaRecord[];
  readonly importSnapshots: readonly LegacySourceSnapshot[];
}

export interface RemovedDeltaReconciliation {
  readonly provenanceKey: string;
  readonly status: ReconciliationStatus;
  readonly targetValue: string;
  readonly exceptionCode: string | null;
  readonly disposition: string | null;
}

export interface CutoverRuntimeVerification {
  readonly health: boolean;
  readonly readiness: boolean;
  readonly authentication: boolean;
  readonly idempotency: boolean;
}

export type ModuleCutoverGateStatus =
  | "PASS"
  | "PASS_WITH_EXCEPTIONS"
  | "BLOCKED";

export interface ModuleCutoverEvidence {
  readonly schemaVersion: "m9.3-v1";
  readonly mode: "DEV_TEST_EVIDENCE_ONLY";
  readonly productionMutationAuthorized: false;
  readonly module: HrModuleKey;
  readonly generatedAt: string;
  readonly preSwitchAuthority: {
    readonly read: AuthorityTarget;
    readonly write: AuthorityTarget;
    readonly writeFreezeActive: boolean;
  };
  readonly delta: FinalLegacyDeltaCapture;
  readonly migrationRuns: readonly {
    readonly sourceSnapshot: string;
    readonly transformerVersion: string;
    readonly status:
      | "COMPLETED"
      | "COMPLETED_WITH_EXCEPTIONS"
      | "FAILED";
    readonly outcomeCount: number;
  }[];
  readonly reconciliationCounts: Readonly<
    Record<ReconciliationStatus, number>
  >;
  readonly reconciliation: readonly ReconciliationResult[];
  readonly runtimeVerification: CutoverRuntimeVerification;
  readonly blockers: readonly string[];
  readonly gateStatus: ModuleCutoverGateStatus;
  readonly evidenceHash: string;
}

function assertModule(module: HrModuleKey): void {
  if (!HR_MODULE_KEYS.includes(module)) {
    throw new Error("Unknown HR module");
  }
}

function descriptorKey(
  descriptor: LegacySourceDescriptor,
): string {
  return [
    descriptor.sourceSystem,
    descriptor.sourceWorkbook,
    descriptor.sourceTab,
    normalizeSourcePeriod(descriptor.sourcePeriod),
  ].join("::");
}

function assertSnapshotIntegrity(
  snapshot: LegacySourceSnapshot,
): void {
  const descriptorPeriod = normalizeSourcePeriod(
    snapshot.descriptor.sourcePeriod,
  );

  for (const record of snapshot.records) {
    const provenance = record.provenance;
    if (
      provenance.sourceSystem !== snapshot.descriptor.sourceSystem ||
      provenance.sourceWorkbook !== snapshot.descriptor.sourceWorkbook ||
      provenance.sourceTab !== snapshot.descriptor.sourceTab ||
      normalizeSourcePeriod(provenance.sourcePeriod) !==
        descriptorPeriod
    ) {
      throw new Error(
        "Legacy snapshot provenance does not match source descriptor",
      );
    }

    const payloadHash = sha256Hex(canonicalJson(record.values));
    if (
      record.payloadHash !== payloadHash ||
      provenance.rowFingerprint !== payloadHash
    ) {
      throw new Error(
        "Legacy snapshot record payload fingerprint mismatch",
      );
    }
  }

  const snapshotHash = computeLegacySnapshotHash({
    descriptor: snapshot.descriptor,
    records: snapshot.records,
  });
  if (snapshot.snapshotHash !== snapshotHash) {
    throw new Error("Legacy snapshot hash mismatch");
  }
}

function snapshotMap(
  snapshots: readonly LegacySourceSnapshot[],
): Map<string, LegacySourceSnapshot> {
  const result = new Map<string, LegacySourceSnapshot>();

  for (const snapshot of snapshots) {
    assertSnapshotIntegrity(snapshot);
    const key = descriptorKey(snapshot.descriptor);
    if (result.has(key)) {
      throw new Error(
        `Duplicate legacy source descriptor in snapshot set: ${key}`,
      );
    }
    result.set(key, snapshot);
  }

  if (result.size === 0) {
    throw new Error("At least one legacy source snapshot is required");
  }

  return result;
}

function snapshotSetHash(
  snapshots: readonly LegacySourceSnapshot[],
): string {
  return sha256Hex(
    canonicalJson(
      [...snapshots]
        .sort((left, right) =>
          descriptorKey(left.descriptor).localeCompare(
            descriptorKey(right.descriptor),
          ),
        )
        .map((snapshot) => ({
          descriptor: descriptorKey(snapshot.descriptor),
          snapshotHash: snapshot.snapshotHash,
        })),
    ),
  );
}

function recordMap(
  snapshots: readonly LegacySourceSnapshot[],
): Map<
  string,
  {
    readonly record: LegacyExtractedRecord;
    readonly descriptor: LegacySourceDescriptor;
  }
> {
  const result = new Map<
    string,
    {
      readonly record: LegacyExtractedRecord;
      readonly descriptor: LegacySourceDescriptor;
    }
  >();

  for (const snapshot of snapshots) {
    for (const record of snapshot.records) {
      const key = legacyProvenanceKey(record.provenance);
      if (result.has(key)) {
        throw new Error(
          `Duplicate source-qualified legacy record: ${key}`,
        );
      }
      result.set(key, {
        record,
        descriptor: snapshot.descriptor,
      });
    }
  }

  return result;
}

function assertSameSourceSet(
  baseline: Map<string, LegacySourceSnapshot>,
  final: Map<string, LegacySourceSnapshot>,
): void {
  const baselineKeys = [...baseline.keys()].sort();
  const finalKeys = [...final.keys()].sort();

  if (
    baselineKeys.length !== finalKeys.length ||
    baselineKeys.some((key, index) => key !== finalKeys[index])
  ) {
    throw new Error(
      "Legacy source descriptor set changed during bounded delta capture",
    );
  }
}

function deltaRecord(input: {
  readonly key: string;
  readonly changeType: LegacyDeltaChangeType;
  readonly baseline: LegacyExtractedRecord | null;
  readonly final: LegacyExtractedRecord | null;
}): LegacyDeltaRecord {
  const provenance =
    input.final?.provenance ?? input.baseline?.provenance;

  if (!provenance) {
    throw new Error("Delta record has no provenance");
  }

  return {
    provenanceKey: input.key,
    changeType: input.changeType,
    sourceWorkbook: provenance.sourceWorkbook,
    sourceTab: provenance.sourceTab,
    sourcePeriod: normalizeSourcePeriod(
      provenance.sourcePeriod,
    ),
    legacyId: provenance.legacyId,
    baselinePayloadHash: input.baseline?.payloadHash ?? null,
    finalPayloadHash: input.final?.payloadHash ?? null,
  };
}

export function buildFinalLegacyDelta(input: {
  readonly module: HrModuleKey;
  readonly baselineSnapshots: readonly LegacySourceSnapshot[];
  readonly finalSnapshots: readonly LegacySourceSnapshot[];
}): FinalLegacyDeltaCapture {
  assertModule(input.module);

  const baselineSources = snapshotMap(input.baselineSnapshots);
  const finalSources = snapshotMap(input.finalSnapshots);
  assertSameSourceSet(baselineSources, finalSources);

  const baselineRecords = recordMap(input.baselineSnapshots);
  const finalRecords = recordMap(input.finalSnapshots);
  const keys = Array.from(
    new Set([
      ...baselineRecords.keys(),
      ...finalRecords.keys(),
    ]),
  ).sort();

  const records: LegacyDeltaRecord[] = [];

  for (const key of keys) {
    const baseline = baselineRecords.get(key)?.record ?? null;
    const final = finalRecords.get(key)?.record ?? null;

    if (!baseline && final) {
      records.push(
        deltaRecord({
          key,
          changeType: "ADDED",
          baseline,
          final,
        }),
      );
      continue;
    }

    if (baseline && !final) {
      records.push(
        deltaRecord({
          key,
          changeType: "REMOVED",
          baseline,
          final,
        }),
      );
      continue;
    }

    if (
      baseline &&
      final &&
      baseline.payloadHash !== final.payloadHash
    ) {
      records.push(
        deltaRecord({
          key,
          changeType: "CHANGED",
          baseline,
          final,
        }),
      );
    }
  }

  const changedOrAdded = new Set(
    records
      .filter((record) => record.changeType !== "REMOVED")
      .map((record) => record.provenanceKey),
  );

  const importSnapshots = [...finalSources.values()]
    .sort((left, right) =>
      descriptorKey(left.descriptor).localeCompare(
        descriptorKey(right.descriptor),
      ),
    )
    .map((snapshot) => {
      const deltaRecords = snapshot.records.filter((record) =>
        changedOrAdded.has(
          legacyProvenanceKey(record.provenance),
        ),
      );

      return {
        descriptor: snapshot.descriptor,
        snapshotHash: computeLegacySnapshotHash({
          descriptor: snapshot.descriptor,
          records: deltaRecords,
        }),
        extractedAt: snapshot.extractedAt,
        records: deltaRecords,
      } satisfies LegacySourceSnapshot;
    })
    .filter((snapshot) => snapshot.records.length > 0);

  const baselineSnapshotSetHash = snapshotSetHash(
    input.baselineSnapshots,
  );
  const finalSnapshotSetHash = snapshotSetHash(
    input.finalSnapshots,
  );
  const deltaHash = sha256Hex(
    canonicalJson({
      module: input.module,
      baselineSnapshotSetHash,
      finalSnapshotSetHash,
      records: records.map((record) => ({
        provenanceKey: record.provenanceKey,
        changeType: record.changeType,
        sourceWorkbook: record.sourceWorkbook,
        sourceTab: record.sourceTab,
        sourcePeriod: record.sourcePeriod,
        legacyId: record.legacyId,
        baselinePayloadHash: record.baselinePayloadHash,
        finalPayloadHash: record.finalPayloadHash,
      })),
      importSnapshots: importSnapshots.map((snapshot) => ({
        descriptor: descriptorKey(snapshot.descriptor),
        snapshotHash: snapshot.snapshotHash,
      })),
    }),
  );

  return {
    module: input.module,
    baselineSnapshotSetHash,
    finalSnapshotSetHash,
    deltaHash,
    addedCount: records.filter(
      (record) => record.changeType === "ADDED",
    ).length,
    changedCount: records.filter(
      (record) => record.changeType === "CHANGED",
    ).length,
    removedCount: records.filter(
      (record) => record.changeType === "REMOVED",
    ).length,
    records,
    importSnapshots,
  };
}

function validateRemovedResult(
  delta: LegacyDeltaRecord,
  result: RemovedDeltaReconciliation,
): ReconciliationResult {
  if (delta.changeType !== "REMOVED") {
    throw new Error(
      "Removal reconciliation can only reference removed delta records",
    );
  }

  if (result.provenanceKey !== delta.provenanceKey) {
    throw new Error("Removal reconciliation provenance mismatch");
  }

  const reconciliation: ReconciliationResult = {
    entityType: delta.sourceTab,
    checkName: `REMOVED:${delta.provenanceKey}`,
    status: result.status,
    sourceValue: delta.baselinePayloadHash ?? "NONE",
    targetValue: result.targetValue,
    exceptionCode: result.exceptionCode,
    disposition: result.disposition,
  };
  validateReconciliationResult(reconciliation);
  return reconciliation;
}

function normalizeGeneratedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("generatedAt must be an ISO-compatible timestamp");
  }
  return date.toISOString();
}

function sortedReconciliation(
  results: readonly ReconciliationResult[],
): readonly ReconciliationResult[] {
  return [...results].sort((left, right) =>
    [
      left.entityType,
      left.checkName,
      left.sourceValue,
      left.targetValue,
    ]
      .join("::")
      .localeCompare(
        [
          right.entityType,
          right.checkName,
          right.sourceValue,
          right.targetValue,
        ].join("::"),
      ),
  );
}

export function buildModuleCutoverEvidence(input: {
  readonly module: HrModuleKey;
  readonly generatedAt: string;
  readonly delta: FinalLegacyDeltaCapture;
  readonly readAuthority: AuthorityTarget;
  readonly writeAuthority: AuthorityTarget;
  readonly writeFreezeActive: boolean;
  readonly migrationReports: readonly MigrationRunReport[];
  readonly removedReconciliation: readonly RemovedDeltaReconciliation[];
  readonly moduleReconciliation: readonly ReconciliationResult[];
  readonly runtimeVerification: CutoverRuntimeVerification;
}): ModuleCutoverEvidence {
  assertModule(input.module);

  if (input.delta.module !== input.module) {
    throw new Error("Cutover evidence module does not match delta module");
  }

  const generatedAt = normalizeGeneratedAt(input.generatedAt);
  const blockers: string[] = [];

  if (!input.writeFreezeActive) {
    blockers.push("WRITE_FREEZE_NOT_ACTIVE");
  }
  if (
    input.readAuthority !== "LEGACY" ||
    input.writeAuthority !== "LEGACY"
  ) {
    blockers.push("PRE_SWITCH_AUTHORITY_MUST_BE_LEGACY");
  }

  const expectedSnapshots = new Map(
    input.delta.importSnapshots.map((snapshot) => [
      snapshot.snapshotHash,
      snapshot,
    ]),
  );
  const reports = new Map<string, MigrationRunReport>();

  for (const report of input.migrationReports) {
    if (reports.has(report.sourceSnapshot)) {
      blockers.push("DUPLICATE_MIGRATION_REPORT");
      continue;
    }
    reports.set(report.sourceSnapshot, report);
  }

  for (const expectedHash of expectedSnapshots.keys()) {
    if (!reports.has(expectedHash)) {
      blockers.push("MISSING_DELTA_IMPORT_REPORT");
    }
  }
  for (const reportHash of reports.keys()) {
    if (!expectedSnapshots.has(reportHash)) {
      blockers.push("UNEXPECTED_DELTA_IMPORT_REPORT");
    }
  }

  const migrationReconciliation: ReconciliationResult[] = [];
  const migrationRuns = [...input.migrationReports]
    .sort((left, right) =>
      left.sourceSnapshot.localeCompare(right.sourceSnapshot),
    )
    .map((report) => {
      const status = classifyMigrationRun(report);
      if (status === "FAILED") {
        blockers.push("FAILED_DELTA_IMPORT_REPORT");
      }

      const expectedSnapshot = expectedSnapshots.get(
        report.sourceSnapshot,
      );
      if (expectedSnapshot) {
        const expectedKeys = expectedSnapshot.records
          .map((record) =>
            legacyProvenanceKey(record.provenance),
          )
          .sort();
        const actualKeys = report.outcomes
          .map((outcome) => outcome.provenanceKey)
          .sort();

        if (
          expectedKeys.length !== actualKeys.length ||
          expectedKeys.some(
            (key, index) => key !== actualKeys[index],
          )
        ) {
          blockers.push("DELTA_IMPORT_REPORT_COVERAGE_MISMATCH");
        }
      }

      migrationReconciliation.push(
        ...buildRunReconciliationResults(report),
      );

      return {
        sourceSnapshot: report.sourceSnapshot,
        transformerVersion: report.transformerVersion,
        status,
        outcomeCount: report.outcomes.length,
      };
    });

  const removedDelta = input.delta.records.filter(
    (record) => record.changeType === "REMOVED",
  );
  const removedResults = new Map<
    string,
    RemovedDeltaReconciliation
  >();

  for (const result of input.removedReconciliation) {
    if (removedResults.has(result.provenanceKey)) {
      blockers.push("DUPLICATE_REMOVAL_RECONCILIATION");
      continue;
    }
    removedResults.set(result.provenanceKey, result);
  }

  const removalReconciliation: ReconciliationResult[] = [];
  for (const delta of removedDelta) {
    const result = removedResults.get(delta.provenanceKey);
    if (!result) {
      blockers.push("MISSING_REMOVAL_RECONCILIATION");
      continue;
    }
    removalReconciliation.push(
      validateRemovedResult(delta, result),
    );
  }
  for (const key of removedResults.keys()) {
    if (
      !removedDelta.some(
        (delta) => delta.provenanceKey === key,
      )
    ) {
      blockers.push("UNEXPECTED_REMOVAL_RECONCILIATION");
    }
  }

  if (input.moduleReconciliation.length === 0) {
    blockers.push("MODULE_RECONCILIATION_REQUIRED");
  }
  for (const result of input.moduleReconciliation) {
    validateReconciliationResult(result);
  }

  for (const [name, passed] of Object.entries(
    input.runtimeVerification,
  )) {
    if (!passed) {
      blockers.push(
        `RUNTIME_${name.toUpperCase()}_NOT_VERIFIED`,
      );
    }
  }

  const allReconciliation = sortedReconciliation([
    ...migrationReconciliation,
    ...removalReconciliation,
    ...input.moduleReconciliation,
  ]);

  if (hasBlockingReconciliationFailure(allReconciliation)) {
    blockers.push("BLOCKING_RECONCILIATION_FAILURE");
  }

  const uniqueBlockers = [...new Set(blockers)].sort();
  const reconciliationCounts = countByStatus(
    allReconciliation,
  );
  const gateStatus: ModuleCutoverGateStatus =
    uniqueBlockers.length > 0
      ? "BLOCKED"
      : reconciliationCounts.EXCEPTION > 0
        ? "PASS_WITH_EXCEPTIONS"
        : "PASS";

  const evidenceHash = sha256Hex(
    canonicalJson({
      schemaVersion: "m9.3-v1",
      mode: "DEV_TEST_EVIDENCE_ONLY",
      module: input.module,
      preSwitchAuthority: {
        read: input.readAuthority,
        write: input.writeAuthority,
        writeFreezeActive: input.writeFreezeActive,
      },
      deltaHash: input.delta.deltaHash,
      migrationRuns,
      reconciliation: allReconciliation.map((result) => ({
        entityType: result.entityType,
        checkName: result.checkName,
        status: result.status,
        sourceValue: result.sourceValue,
        targetValue: result.targetValue,
        exceptionCode: result.exceptionCode,
        disposition: result.disposition,
      })),
      runtimeVerification: {
        health: input.runtimeVerification.health,
        readiness: input.runtimeVerification.readiness,
        authentication: input.runtimeVerification.authentication,
        idempotency: input.runtimeVerification.idempotency,
      },
      blockers: uniqueBlockers,
      gateStatus,
    }),
  );

  return {
    schemaVersion: "m9.3-v1",
    mode: "DEV_TEST_EVIDENCE_ONLY",
    productionMutationAuthorized: false,
    module: input.module,
    generatedAt,
    preSwitchAuthority: {
      read: input.readAuthority,
      write: input.writeAuthority,
      writeFreezeActive: input.writeFreezeActive,
    },
    delta: input.delta,
    migrationRuns,
    reconciliationCounts,
    reconciliation: allReconciliation,
    runtimeVerification: input.runtimeVerification,
    blockers: uniqueBlockers,
    gateStatus,
    evidenceHash,
  };
}
