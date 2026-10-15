import type { MigrationSourceRecord } from "./provenance";
import { migrationRecordKey } from "./provenance";
import { canonicalJson, sha256Hex } from "./source-snapshot";
import type {
  JsonValue,
  LegacySourceSnapshot,
  MigrationRecordOutcome,
  MigrationRunReport,
  MigrationTargetStore,
  MigrationTransformer,
  TargetCreateInput,
} from "./migration-contracts";

function pushOutcome(
  outcomes: MigrationRecordOutcome[],
  outcome: MigrationRecordOutcome,
): void {
  outcomes.push(outcome);
}

export async function runMigration<
  TPayload extends JsonValue,
>(input: {
  readonly migrationRunId: string;
  readonly snapshot: LegacySourceSnapshot;
  readonly transformer: MigrationTransformer<TPayload>;
  readonly targetStore: MigrationTargetStore;
}): Promise<MigrationRunReport> {
  if (!input.migrationRunId.trim()) {
    throw new Error("migrationRunId is required");
  }

  if (!input.transformer.version.trim()) {
    throw new Error("transformer version is required");
  }

  const outcomes: MigrationRecordOutcome[] = [];
  let stoppedEarly = false;

  for (const record of input.snapshot.records) {
    if (record.provenance.migrationRunId !== input.migrationRunId) {
      throw new Error(
        "Snapshot provenance migrationRunId does not match run",
      );
    }

    const sourceRecord: MigrationSourceRecord = {
      provenance: record.provenance,
      payloadHash: record.payloadHash,
    };
    const provenanceKey = migrationRecordKey(sourceRecord);
    const decision = input.transformer.transform(record);

    if (decision.action === "SKIP") {
      pushOutcome(outcomes, {
        provenanceKey,
        legacyId: record.provenance.legacyId,
        rowNumber: record.rowNumber,
        status: "SKIPPED_TRANSFORM",
        code: decision.code,
        detail: decision.reason,
        disposition: decision.disposition,
        targetEntityType: null,
        targetEntityId: null,
      });
      continue;
    }

    if (decision.action === "REJECT") {
      pushOutcome(outcomes, {
        provenanceKey,
        legacyId: record.provenance.legacyId,
        rowNumber: record.rowNumber,
        status: "REJECTED_TRANSFORM",
        code: decision.code,
        detail: decision.reason,
        disposition: null,
        targetEntityType: null,
        targetEntityId: null,
      });
      continue;
    }

    const transformedPayloadHash = sha256Hex(
      canonicalJson(decision.payload),
    );
    const existing =
      await input.targetStore.findByProvenanceKey(provenanceKey);

    if (existing) {
      if (existing.sourcePayloadHash !== record.payloadHash) {
        pushOutcome(outcomes, {
          provenanceKey,
          legacyId: record.provenance.legacyId,
          rowNumber: record.rowNumber,
          status: "EXCEPTION_SOURCE_CHANGED",
          code: "LEGACY_SOURCE_CHANGED",
          detail:
            "Same source-qualified legacy identity now has different source payload",
          disposition: null,
          targetEntityType: existing.targetEntityType,
          targetEntityId: existing.targetEntityId,
        });
        continue;
      }

      if (
        existing.transformedPayloadHash !== transformedPayloadHash ||
        existing.transformerVersion !== input.transformer.version
      ) {
        pushOutcome(outcomes, {
          provenanceKey,
          legacyId: record.provenance.legacyId,
          rowNumber: record.rowNumber,
          status: "EXCEPTION_TRANSFORM_CHANGED",
          code: "TRANSFORM_OUTPUT_CHANGED",
          detail:
            "Existing imported record differs by transformer version or transformed payload",
          disposition: null,
          targetEntityType: existing.targetEntityType,
          targetEntityId: existing.targetEntityId,
        });
        continue;
      }

      pushOutcome(outcomes, {
        provenanceKey,
        legacyId: record.provenance.legacyId,
        rowNumber: record.rowNumber,
        status: "SKIPPED_IDENTICAL",
        code: "IDEMPOTENT_REPLAY",
        detail: null,
        disposition: null,
        targetEntityType: existing.targetEntityType,
        targetEntityId: existing.targetEntityId,
      });
      continue;
    }

    const createInput: TargetCreateInput = {
      migrationRunId: input.migrationRunId,
      provenance: record.provenance,
      provenanceKey,
      rowNumber: record.rowNumber,
      sourcePayloadHash: record.payloadHash,
      transformedPayloadHash,
      transformerVersion: input.transformer.version,
      targetEntityType: decision.targetEntityType,
      payload: decision.payload,
    };

    try {
      const created = await input.targetStore.create(createInput);

      pushOutcome(outcomes, {
        provenanceKey,
        legacyId: record.provenance.legacyId,
        rowNumber: record.rowNumber,
        status: "IMPORTED",
        code: null,
        detail: null,
        disposition: null,
        targetEntityType: decision.targetEntityType,
        targetEntityId: created.targetEntityId,
      });
    } catch {
      pushOutcome(outcomes, {
        provenanceKey,
        legacyId: record.provenance.legacyId,
        rowNumber: record.rowNumber,
        status: "AMBIGUOUS_WRITE",
        code: "TARGET_WRITE_RESULT_UNKNOWN",
        detail:
          "Target write outcome is ambiguous; do not automatically retry in this run",
        disposition: null,
        targetEntityType: decision.targetEntityType,
        targetEntityId: null,
      });
      stoppedEarly = true;
      break;
    }
  }

  const importedCount = outcomes.filter(
    (outcome) => outcome.status === "IMPORTED",
  ).length;
  const skippedCount = outcomes.filter((outcome) =>
    outcome.status.startsWith("SKIPPED_"),
  ).length;
  const rejectedCount = outcomes.filter(
    (outcome) => outcome.status === "REJECTED_TRANSFORM",
  ).length;
  const exceptionCount = outcomes.filter((outcome) =>
    outcome.status.startsWith("EXCEPTION_"),
  ).length;
  const ambiguousWriteCount = outcomes.filter(
    (outcome) => outcome.status === "AMBIGUOUS_WRITE",
  ).length;
  const mismatchCount = outcomes.filter(
    (outcome) =>
      !["IMPORTED", "SKIPPED_IDENTICAL"].includes(
        outcome.status,
      ),
  ).length;

  return {
    migrationRunId: input.migrationRunId,
    sourceSnapshot: input.snapshot.snapshotHash,
    transformerVersion: input.transformer.version,
    importedCount,
    skippedCount,
    rejectedCount,
    exceptionCount,
    mismatchCount,
    ambiguousWriteCount,
    stoppedEarly,
    outcomes,
  };
}
