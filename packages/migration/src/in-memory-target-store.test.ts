import { describe, expect, it } from "vitest";

import { InMemoryMigrationTargetStore } from "./in-memory-target-store";

describe("InMemoryMigrationTargetStore", () => {
  it("creates and re-reads provenance records without a database", async () => {
    const store = new InMemoryMigrationTargetStore();
    const input = {
      migrationRunId: "run-test",
      provenance: {
        sourceSystem: "APP_LEAVE_GAS" as const,
        sourceWorkbook: "sanitized.xlsx",
        sourceTab: "Users",
        sourcePeriod: "CURRENT",
        legacyId: "USER-900",
        rowFingerprint: "hash-source",
        migrationRunId: "run-test",
      },
      provenanceKey: "APP_LEAVE_GAS:sanitized.xlsx:Users:CURRENT:USER-900",
      rowNumber: 2,
      sourcePayloadHash: "hash-source",
      transformedPayloadHash: "hash-target",
      transformerVersion: "identity-v1",
      targetEntityType: "employee",
      payload: { legacyUid: "USER-900" },
    };

    const created = await store.create(input);
    expect(await store.findByProvenanceKey(input.provenanceKey)).toMatchObject({
      provenanceKey: input.provenanceKey,
      targetEntityId: created.targetEntityId,
      sourcePayloadHash: "hash-source",
    });
    expect(store.size).toBe(1);
    await expect(store.create(input)).rejects.toThrow("Duplicate provenance key");
  });
});
