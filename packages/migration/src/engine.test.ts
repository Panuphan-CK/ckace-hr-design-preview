import { describe, expect, it } from "vitest";

import {
  buildResetPlan,
  extractReadOnlySnapshot,
  runMigration,
  type ExistingTargetRecord,
  type MigrationTargetStore,
  type MigrationTransformer,
  type ReadOnlyLegacySource,
  type TargetCreateInput,
} from "./index";

class InMemoryTargetStore implements MigrationTargetStore {
  readonly records = new Map<string, ExistingTargetRecord>();
  readonly createInputs: TargetCreateInput[] = [];
  createCalls = 0;
  throwAfterPersistOnce = false;

  async findByProvenanceKey(
    provenanceKey: string,
  ): Promise<ExistingTargetRecord | null> {
    return this.records.get(provenanceKey) ?? null;
  }

  async create(
    input: TargetCreateInput,
  ): Promise<{ targetEntityId: string }> {
    this.createCalls += 1;
    this.createInputs.push(input);
    const targetEntityId = `target-${this.createCalls}`;

    this.records.set(input.provenanceKey, {
      provenanceKey: input.provenanceKey,
      sourcePayloadHash: input.sourcePayloadHash,
      transformedPayloadHash: input.transformedPayloadHash,
      transformerVersion: input.transformerVersion,
      targetEntityType: input.targetEntityType,
      targetEntityId,
    });

    if (this.throwAfterPersistOnce) {
      this.throwAfterPersistOnce = false;
      throw new Error("simulated ambiguous transport failure");
    }

    return { targetEntityId };
  }
}

function makeSource(
  rows: readonly {
    rowNumber: number;
    legacyId: string;
    values: Readonly<Record<string, string | number | boolean | null>>;
  }[],
): ReadOnlyLegacySource {
  return {
    descriptor: {
      sourceSystem: "APP_LEAVE_GAS",
      sourceWorkbook: "Data_CK&RR_Requests",
      sourceTab: "LeaveRequests",
      sourcePeriod: "CURRENT",
    },
    async readRows() {
      return rows;
    },
  };
}

const transformer: MigrationTransformer = {
  version: "leave-v1",
  transform(record) {
    const userId = record.values.userId;

    if (typeof userId !== "string" || !userId.trim()) {
      return {
        action: "REJECT",
        code: "MISSING_USER_ID",
        reason: "Legacy leave row has no employee identity",
      };
    }

    return {
      action: "IMPORT",
      targetEntityType: "leave_request",
      payload: {
        legacyId: record.provenance.legacyId,
        employeeLegacyId: userId,
      },
    };
  },
};

async function snapshot(
  rows: Parameters<typeof makeSource>[0],
  runId: string,
) {
  return extractReadOnlySnapshot({
    source: makeSource(rows),
    migrationRunId: runId,
    extractedAt: "2026-10-05T00:00:00Z",
  });
}

describe("migration engine", () => {
  it("is idempotent for an identical repeated import", async () => {
    const rows = [
      {
        rowNumber: 2,
        legacyId: "LEV-0001",
        values: { userId: "USER-001" },
      },
      {
        rowNumber: 3,
        legacyId: "LEV-0002",
        values: { userId: "USER-002" },
      },
    ] as const;
    const store = new InMemoryTargetStore();

    const first = await runMigration({
      migrationRunId: "run-1",
      snapshot: await snapshot(rows, "run-1"),
      transformer,
      targetStore: store,
    });
    const second = await runMigration({
      migrationRunId: "run-2",
      snapshot: await snapshot(rows, "run-2"),
      transformer,
      targetStore: store,
    });

    expect(first.importedCount).toBe(2);
    expect(second.importedCount).toBe(0);
    expect(second.skippedCount).toBe(2);
    expect(store.createCalls).toBe(2);
    expect(
      second.outcomes.every(
        (outcome) => outcome.status === "SKIPPED_IDENTICAL",
      ),
    ).toBe(true);
  });

  it("stops after an ambiguous write and safely resumes by provenance", async () => {
    const rows = [
      {
        rowNumber: 2,
        legacyId: "LEV-0001",
        values: { userId: "USER-001" },
      },
      {
        rowNumber: 3,
        legacyId: "LEV-0002",
        values: { userId: "USER-002" },
      },
    ] as const;
    const store = new InMemoryTargetStore();
    store.throwAfterPersistOnce = true;

    const first = await runMigration({
      migrationRunId: "run-interrupted",
      snapshot: await snapshot(rows, "run-interrupted"),
      transformer,
      targetStore: store,
    });

    expect(first.stoppedEarly).toBe(true);
    expect(first.ambiguousWriteCount).toBe(1);
    expect(store.records.size).toBe(1);

    const resumed = await runMigration({
      migrationRunId: "run-resume",
      snapshot: await snapshot(rows, "run-resume"),
      transformer,
      targetStore: store,
    });

    expect(resumed.stoppedEarly).toBe(false);
    expect(resumed.skippedCount).toBe(1);
    expect(resumed.importedCount).toBe(1);
    expect(store.records.size).toBe(2);
    expect(store.createCalls).toBe(2);
  });

  it("does not overwrite when the source row changes under the same provenance", async () => {
    const store = new InMemoryTargetStore();

    await runMigration({
      migrationRunId: "run-1",
      snapshot: await snapshot(
        [
          {
            rowNumber: 2,
            legacyId: "LEV-0001",
            values: { userId: "USER-001", status: "Pending" },
          },
        ],
        "run-1",
      ),
      transformer,
      targetStore: store,
    });

    const changed = await runMigration({
      migrationRunId: "run-2",
      snapshot: await snapshot(
        [
          {
            rowNumber: 2,
            legacyId: "LEV-0001",
            values: { userId: "USER-001", status: "Approved" },
          },
        ],
        "run-2",
      ),
      transformer,
      targetStore: store,
    });

    expect(changed.exceptionCount).toBe(1);
    expect(changed.outcomes[0]?.status).toBe(
      "EXCEPTION_SOURCE_CHANGED",
    );
    expect(store.createCalls).toBe(1);
  });

  it("requires explicit review when transformer output/version changes", async () => {
    const store = new InMemoryTargetStore();
    const rows = [
      {
        rowNumber: 2,
        legacyId: "LEV-0001",
        values: { userId: "USER-001" },
      },
    ] as const;

    await runMigration({
      migrationRunId: "run-1",
      snapshot: await snapshot(rows, "run-1"),
      transformer,
      targetStore: store,
    });

    const v2: MigrationTransformer = {
      version: "leave-v2",
      transform(record) {
        return {
          action: "IMPORT",
          targetEntityType: "leave_request",
          payload: {
            legacyId: record.provenance.legacyId,
            employeeLegacyId: record.values.userId as string,
            versionMarker: 2,
          },
        };
      },
    };

    const changed = await runMigration({
      migrationRunId: "run-2",
      snapshot: await snapshot(rows, "run-2"),
      transformer: v2,
      targetStore: store,
    });

    expect(changed.outcomes[0]?.status).toBe(
      "EXCEPTION_TRANSFORM_CHANGED",
    );
    expect(store.createCalls).toBe(1);
  });

  it("records transform rejection instead of silently repairing source", async () => {
    const store = new InMemoryTargetStore();

    const result = await runMigration({
      migrationRunId: "run-reject",
      snapshot: await snapshot(
        [
          {
            rowNumber: 2,
            legacyId: "LEV-0001",
            values: { userId: "" },
          },
        ],
        "run-reject",
      ),
      transformer,
      targetStore: store,
    });

    expect(result.rejectedCount).toBe(1);
    expect(result.outcomes[0]).toMatchObject({
      status: "REJECTED_TRANSFORM",
      code: "MISSING_USER_ID",
    });
    expect(store.createCalls).toBe(0);
  });

  it("builds a plan-only reset from records created by that run only", async () => {
    const store = new InMemoryTargetStore();
    const rows = [
      {
        rowNumber: 2,
        legacyId: "LEV-0001",
        values: { userId: "USER-001" },
      },
    ] as const;

    const first = await runMigration({
      migrationRunId: "run-1",
      snapshot: await snapshot(rows, "run-1"),
      transformer,
      targetStore: store,
    });
    const replay = await runMigration({
      migrationRunId: "run-2",
      snapshot: await snapshot(rows, "run-2"),
      transformer,
      targetStore: store,
    });

    expect(buildResetPlan(first)).toMatchObject({
      migrationRunId: "run-1",
      mode: "PLAN_ONLY",
      requiresExplicitExecutionApproval: true,
      targets: [{ targetEntityType: "leave_request" }],
    });
    expect(buildResetPlan(replay).targets).toEqual([]);
  });

  it("passes complete source-qualified provenance into target creation", async () => {
    const store = new InMemoryTargetStore();

    await runMigration({
      migrationRunId: "run-trace",
      snapshot: await snapshot(
        [
          {
            rowNumber: 2,
            legacyId: "LEV-0100",
            values: { userId: "USER-100" },
          },
        ],
        "run-trace",
      ),
      transformer,
      targetStore: store,
    });

    expect(store.createInputs[0]).toMatchObject({
      migrationRunId: "run-trace",
      rowNumber: 2,
      provenance: {
        sourceSystem: "APP_LEAVE_GAS",
        sourceWorkbook: "Data_CK&RR_Requests",
        sourceTab: "LeaveRequests",
        sourcePeriod: "CURRENT",
        legacyId: "LEV-0100",
        migrationRunId: "run-trace",
      },
    });
    expect(
      store.createInputs[0]?.provenance.rowFingerprint,
    ).toMatch(/^[0-9a-f]{64}$/);
  });

  it("requires snapshot provenance to belong to the active migration run", async () => {
    const store = new InMemoryTargetStore();
    const mismatchedSnapshot = await snapshot(
      [
        {
          rowNumber: 2,
          legacyId: "LEV-0001",
          values: { userId: "USER-001" },
        },
      ],
      "snapshot-run",
    );

    await expect(
      runMigration({
        migrationRunId: "different-run",
        snapshot: mismatchedSnapshot,
        transformer,
        targetStore: store,
      }),
    ).rejects.toThrow(
      "Snapshot provenance migrationRunId does not match run",
    );
  });

  it("keeps explicit transformer skips as disposition-backed mismatches", async () => {
    const store = new InMemoryTargetStore();
    const skipTransformer: MigrationTransformer = {
      version: "attendance-v1",
      transform() {
        return {
          action: "SKIP",
          code: "LEGACY_DUPLICATE_BUSINESS_DAY",
          reason: "Known duplicate employee/date requires review",
          disposition:
            "PRESERVE_DISTINCT_RECORDS_AND_REQUIRE_OWNER_REVIEW",
        };
      },
    };

    const result = await runMigration({
      migrationRunId: "run-skip",
      snapshot: await snapshot(
        [
          {
            rowNumber: 2,
            legacyId: "LEV-0001",
            values: { userId: "USER-001" },
          },
        ],
        "run-skip",
      ),
      transformer: skipTransformer,
      targetStore: store,
    });

    expect(result.mismatchCount).toBe(1);
    expect(result.outcomes[0]).toMatchObject({
      status: "SKIPPED_TRANSFORM",
      code: "LEGACY_DUPLICATE_BUSINESS_DAY",
      disposition:
        "PRESERVE_DISTINCT_RECORDS_AND_REQUIRE_OWNER_REVIEW",
    });
    expect(store.createCalls).toBe(0);
  });
});
