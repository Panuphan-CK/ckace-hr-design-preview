import { describe, expect, it } from "vitest";

import {
  buildFinalLegacyDelta,
  buildModuleCutoverEvidence,
  extractReadOnlySnapshot,
  type LegacySourceSnapshot,
  type MigrationRunReport,
  type ReadOnlyLegacySource,
  type ReconciliationResult,
} from "./index";

function source(input: {
  readonly tab?: string;
  readonly period?: string | null;
  readonly rows: readonly {
    readonly rowNumber: number;
    readonly legacyId: string;
    readonly values: Readonly<
      Record<string, string | number | boolean | null>
    >;
  }[];
}): ReadOnlyLegacySource {
  return {
    descriptor: {
      sourceSystem: "APP_LEAVE_GAS",
      sourceWorkbook: "Data_CK&RR_Requests",
      sourceTab: input.tab ?? "LeaveRequests",
      sourcePeriod: input.period ?? "CURRENT",
    },
    async readRows() {
      return input.rows;
    },
  };
}

async function snapshot(input: {
  readonly runId: string;
  readonly rows: readonly {
    readonly rowNumber: number;
    readonly legacyId: string;
    readonly values: Readonly<
      Record<string, string | number | boolean | null>
    >;
  }[];
  readonly tab?: string;
  readonly period?: string | null;
}): Promise<LegacySourceSnapshot> {
  return extractReadOnlySnapshot({
    source: source(input),
    migrationRunId: input.runId,
    extractedAt: "2026-10-06T18:00:00+07:00",
  });
}

function cleanReport(
  deltaSnapshot: LegacySourceSnapshot,
): MigrationRunReport {
  const outcomes = deltaSnapshot.records.map((record, index) => ({
    provenanceKey: [
      record.provenance.sourceSystem,
      record.provenance.sourceWorkbook,
      record.provenance.sourceTab,
      record.provenance.sourcePeriod ?? "CURRENT",
      record.provenance.legacyId,
    ].join("::"),
    legacyId: record.provenance.legacyId,
    rowNumber: record.rowNumber,
    status: "IMPORTED" as const,
    code: null,
    detail: null,
    disposition: null,
    targetEntityType: "leave_request",
    targetEntityId: `target-${index + 1}`,
  }));

  return {
    migrationRunId: "m9-3-delta-import",
    sourceSnapshot: deltaSnapshot.snapshotHash,
    transformerVersion: "leave-v1",
    importedCount: outcomes.length,
    skippedCount: 0,
    rejectedCount: 0,
    exceptionCount: 0,
    mismatchCount: 0,
    ambiguousWriteCount: 0,
    stoppedEarly: false,
    outcomes,
  };
}

const modulePass: ReconciliationResult = {
  entityType: "leave_request",
  checkName: "source-target-count",
  status: "PASS",
  sourceValue: "2",
  targetValue: "2",
  exceptionCode: null,
  disposition: null,
};

const runtimePass = {
  health: true,
  readiness: true,
  authentication: true,
  idempotency: true,
} as const;

describe("M9.3 final delta capture", () => {
  it("captures added, changed and removed rows with bounded import snapshots", async () => {
    const baseline = await snapshot({
      runId: "baseline",
      rows: [
        {
          rowNumber: 2,
          legacyId: "LEV-001",
          values: { status: "Pending", userId: "U1" },
        },
        {
          rowNumber: 3,
          legacyId: "LEV-002",
          values: { status: "Pending", userId: "U2" },
        },
        {
          rowNumber: 4,
          legacyId: "LEV-003",
          values: { status: "Pending", userId: "U3" },
        },
      ],
    });
    const final = await snapshot({
      runId: "final",
      rows: [
        {
          rowNumber: 8,
          legacyId: "LEV-001",
          values: { status: "Pending", userId: "U1" },
        },
        {
          rowNumber: 3,
          legacyId: "LEV-002",
          values: { status: "Approved", userId: "U2" },
        },
        {
          rowNumber: 5,
          legacyId: "LEV-004",
          values: { status: "Pending", userId: "U4" },
        },
      ],
    });

    const delta = buildFinalLegacyDelta({
      module: "LEAVE",
      baselineSnapshots: [baseline],
      finalSnapshots: [final],
    });

    expect(delta).toMatchObject({
      addedCount: 1,
      changedCount: 1,
      removedCount: 1,
    });
    expect(delta.records.map((record) => [
      record.legacyId,
      record.changeType,
    ])).toEqual([
      ["LEV-002", "CHANGED"],
      ["LEV-003", "REMOVED"],
      ["LEV-004", "ADDED"],
    ]);
    expect(delta.importSnapshots).toHaveLength(1);
    expect(
      delta.importSnapshots[0]?.records.map(
        (record) => record.provenance.legacyId,
      ),
    ).toEqual(["LEV-002", "LEV-004"]);
    expect(delta.deltaHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("fails closed when a captured snapshot is tampered after extraction", async () => {
    const baseline = await snapshot({
      runId: "baseline",
      rows: [
        {
          rowNumber: 2,
          legacyId: "LEV-001",
          values: { status: "Pending" },
        },
      ],
    });
    const final = await snapshot({
      runId: "final",
      rows: [
        {
          rowNumber: 2,
          legacyId: "LEV-001",
          values: { status: "Approved" },
        },
      ],
    });
    const tampered = {
      ...final,
      records: [
        {
          ...final.records[0]!,
          values: { status: "Rejected" },
        },
      ],
    };

    expect(() =>
      buildFinalLegacyDelta({
        module: "LEAVE",
        baselineSnapshots: [baseline],
        finalSnapshots: [tampered],
      }),
    ).toThrow(/payload fingerprint mismatch/i);
  });

  it("fails closed when source-qualified provenance no longer matches its snapshot descriptor", async () => {
    const baseline = await snapshot({
      runId: "baseline",
      rows: [],
    });
    const final = await snapshot({
      runId: "final",
      rows: [
        {
          rowNumber: 2,
          legacyId: "LEV-001",
          values: { status: "Pending" },
        },
      ],
    });
    const wrongProvenance = {
      ...final,
      records: [
        {
          ...final.records[0]!,
          provenance: {
            ...final.records[0]!.provenance,
            sourceTab: "OtherTab",
          },
        },
      ],
    };

    expect(() =>
      buildFinalLegacyDelta({
        module: "LEAVE",
        baselineSnapshots: [baseline],
        finalSnapshots: [wrongProvenance],
      }),
    ).toThrow(/provenance does not match source descriptor/i);
  });

  it("fails closed when the bounded source descriptor set changes", async () => {
    const baseline = await snapshot({
      runId: "baseline",
      tab: "LeaveRequests",
      rows: [],
    });
    const final = await snapshot({
      runId: "final",
      tab: "DifferentTab",
      rows: [],
    });

    expect(() =>
      buildFinalLegacyDelta({
        module: "LEAVE",
        baselineSnapshots: [baseline],
        finalSnapshots: [final],
      }),
    ).toThrow(/source descriptor set changed/i);
  });
});

describe("M9.3 module cutover evidence", () => {
  it("passes a fully reconciled bounded delta while authority is frozen on LEGACY", async () => {
    const baseline = await snapshot({
      runId: "baseline",
      rows: [
        {
          rowNumber: 2,
          legacyId: "LEV-001",
          values: { status: "Pending" },
        },
      ],
    });
    const final = await snapshot({
      runId: "final",
      rows: [
        {
          rowNumber: 2,
          legacyId: "LEV-001",
          values: { status: "Pending" },
        },
        {
          rowNumber: 3,
          legacyId: "LEV-002",
          values: { status: "Pending" },
        },
      ],
    });
    const delta = buildFinalLegacyDelta({
      module: "LEAVE",
      baselineSnapshots: [baseline],
      finalSnapshots: [final],
    });

    const evidence = buildModuleCutoverEvidence({
      module: "LEAVE",
      generatedAt: "2026-10-06T18:15:00+07:00",
      delta,
      readAuthority: "LEGACY",
      writeAuthority: "LEGACY",
      writeFreezeActive: true,
      migrationReports: [cleanReport(delta.importSnapshots[0]!)],
      removedReconciliation: [],
      moduleReconciliation: [modulePass],
      runtimeVerification: runtimePass,
    });

    expect(evidence.gateStatus).toBe("PASS");
    expect(evidence.blockers).toEqual([]);
    expect(evidence.productionMutationAuthorized).toBe(false);
    expect(evidence.evidenceHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("allows explicit legacy exceptions without disguising them as PASS", async () => {
    const baseline = await snapshot({
      runId: "baseline",
      rows: [
        {
          rowNumber: 2,
          legacyId: "LEV-OLD",
          values: { status: "Cancelled" },
        },
      ],
    });
    const final = await snapshot({
      runId: "final",
      rows: [],
    });
    const delta = buildFinalLegacyDelta({
      module: "LEAVE",
      baselineSnapshots: [baseline],
      finalSnapshots: [final],
    });

    const evidence = buildModuleCutoverEvidence({
      module: "LEAVE",
      generatedAt: "2026-10-06T18:20:00+07:00",
      delta,
      readAuthority: "LEGACY",
      writeAuthority: "LEGACY",
      writeFreezeActive: true,
      migrationReports: [],
      removedReconciliation: [
        {
          provenanceKey: delta.records[0]!.provenanceKey,
          status: "EXCEPTION",
          targetValue: "PRESERVED_FOR_OWNER_REVIEW",
          exceptionCode: "LEGACY_REMOVED_ROW",
          disposition: "PRESERVE_TARGET_AND_REQUIRE_OWNER_REVIEW",
        },
      ],
      moduleReconciliation: [modulePass],
      runtimeVerification: runtimePass,
    });

    expect(evidence.gateStatus).toBe("PASS_WITH_EXCEPTIONS");
    expect(evidence.reconciliationCounts.EXCEPTION).toBe(1);
    expect(evidence.reconciliation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "EXCEPTION",
          exceptionCode: "LEGACY_REMOVED_ROW",
          disposition: "PRESERVE_TARGET_AND_REQUIRE_OWNER_REVIEW",
        }),
      ]),
    );
    expect(evidence.blockers).toEqual([]);
  });

  it("blocks when freeze, runtime, migration coverage or reconciliation is unsafe", async () => {
    const baseline = await snapshot({
      runId: "baseline",
      rows: [],
    });
    const final = await snapshot({
      runId: "final",
      rows: [
        {
          rowNumber: 2,
          legacyId: "LEV-NEW",
          values: { status: "Pending" },
        },
      ],
    });
    const delta = buildFinalLegacyDelta({
      module: "LEAVE",
      baselineSnapshots: [baseline],
      finalSnapshots: [final],
    });

    const evidence = buildModuleCutoverEvidence({
      module: "LEAVE",
      generatedAt: "2026-10-06T18:25:00+07:00",
      delta,
      readAuthority: "NEW",
      writeAuthority: "LEGACY",
      writeFreezeActive: false,
      migrationReports: [],
      removedReconciliation: [],
      moduleReconciliation: [
        {
          entityType: "leave_request",
          checkName: "count",
          status: "FAIL",
          sourceValue: "1",
          targetValue: "0",
          exceptionCode: "COUNT_MISMATCH",
          disposition: "BLOCK_SWITCH_AND_RECONCILE",
        },
      ],
      runtimeVerification: {
        ...runtimePass,
        readiness: false,
      },
    });

    expect(evidence.gateStatus).toBe("BLOCKED");
    expect(evidence.blockers).toEqual(
      expect.arrayContaining([
        "WRITE_FREEZE_NOT_ACTIVE",
        "PRE_SWITCH_AUTHORITY_MUST_BE_LEGACY",
        "MISSING_DELTA_IMPORT_REPORT",
        "RUNTIME_READINESS_NOT_VERIFIED",
        "BLOCKING_RECONCILIATION_FAILURE",
      ]),
    );
  });

  it("blocks a migration report that does not cover the exact bounded delta snapshot", async () => {
    const baseline = await snapshot({
      runId: "baseline",
      rows: [],
    });
    const final = await snapshot({
      runId: "final",
      rows: [
        {
          rowNumber: 2,
          legacyId: "LEV-NEW",
          values: { status: "Pending" },
        },
      ],
    });
    const delta = buildFinalLegacyDelta({
      module: "LEAVE",
      baselineSnapshots: [baseline],
      finalSnapshots: [final],
    });
    const report = cleanReport(delta.importSnapshots[0]!);

    const evidence = buildModuleCutoverEvidence({
      module: "LEAVE",
      generatedAt: "2026-10-06T18:30:00+07:00",
      delta,
      readAuthority: "LEGACY",
      writeAuthority: "LEGACY",
      writeFreezeActive: true,
      migrationReports: [
        {
          ...report,
          outcomes: [],
          importedCount: 0,
        },
      ],
      removedReconciliation: [],
      moduleReconciliation: [modulePass],
      runtimeVerification: runtimePass,
    });

    expect(evidence.gateStatus).toBe("BLOCKED");
    expect(evidence.blockers).toContain(
      "DELTA_IMPORT_REPORT_COVERAGE_MISMATCH",
    );
  });

  it("keeps evidence digest deterministic across generation timestamps", async () => {
    const baseline = await snapshot({
      runId: "baseline",
      rows: [],
    });
    const final = await snapshot({
      runId: "final",
      rows: [],
    });
    const delta = buildFinalLegacyDelta({
      module: "LEAVE",
      baselineSnapshots: [baseline],
      finalSnapshots: [final],
    });
    const base = {
      module: "LEAVE" as const,
      delta,
      readAuthority: "LEGACY" as const,
      writeAuthority: "LEGACY" as const,
      writeFreezeActive: true,
      migrationReports: [],
      removedReconciliation: [],
      moduleReconciliation: [modulePass],
      runtimeVerification: runtimePass,
    };

    const first = buildModuleCutoverEvidence({
      ...base,
      generatedAt: "2026-10-06T18:30:00+07:00",
    });
    const second = buildModuleCutoverEvidence({
      ...base,
      generatedAt: "2026-10-06T18:45:00+07:00",
    });

    expect(second.evidenceHash).toBe(first.evidenceHash);
  });
});
