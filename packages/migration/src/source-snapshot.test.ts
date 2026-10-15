import { describe, expect, it } from "vitest";

import {
  canonicalJson,
  extractReadOnlySnapshot,
  migrationRecordKey,
  type ReadOnlyLegacySource,
} from "./index";

function source(input: {
  period: string | null;
  rows: readonly {
    rowNumber: number;
    legacyId: string;
    values: Readonly<Record<string, string | number | boolean | null>>;
  }[];
}): ReadOnlyLegacySource {
  return {
    descriptor: {
      sourceSystem: "APP_LEAVE_GAS",
      sourceWorkbook: "Data_CK&RR_Requests",
      sourceTab: "LeaveRequests",
      sourcePeriod: input.period,
    },
    async readRows() {
      return input.rows;
    },
  };
}

describe("read-only source snapshot", () => {
  it("canonicalizes object keys deterministically", () => {
    expect(
      canonicalJson({
        z: 1,
        a: { y: true, x: "value" },
      }),
    ).toBe('{"a":{"x":"value","y":true},"z":1}');

    expect(
      canonicalJson({
        a: { x: "value", y: true },
        z: 1,
      }),
    ).toBe('{"a":{"x":"value","y":true},"z":1}');
  });

  it("produces the same snapshot hash for the same source snapshot", async () => {
    const legacySource = source({
      period: null,
      rows: [
        {
          rowNumber: 2,
          legacyId: "LEV-0001",
          values: {
            leave_id: "LEV-0001",
            userId: "USER-001",
            leaveDuration: "F",
          },
        },
      ],
    });

    const first = await extractReadOnlySnapshot({
      source: legacySource,
      migrationRunId: "run-a",
      extractedAt: "2026-10-05T00:00:00+07:00",
    });
    const second = await extractReadOnlySnapshot({
      source: legacySource,
      migrationRunId: "run-b",
      extractedAt: "2026-10-05T01:00:00+07:00",
    });

    expect(second.snapshotHash).toBe(first.snapshotHash);
    expect(second.records[0]?.payloadHash).toBe(
      first.records[0]?.payloadHash,
    );
  });

  it("changes row/snapshot fingerprints when legacy values change", async () => {
    const first = await extractReadOnlySnapshot({
      source: source({
        period: "CURRENT",
        rows: [
          {
            rowNumber: 2,
            legacyId: "LEV-0001",
            values: { status: "Pending" },
          },
        ],
      }),
      migrationRunId: "run-a",
      extractedAt: "2026-10-05T00:00:00Z",
    });
    const second = await extractReadOnlySnapshot({
      source: source({
        period: "CURRENT",
        rows: [
          {
            rowNumber: 2,
            legacyId: "LEV-0001",
            values: { status: "Approved" },
          },
        ],
      }),
      migrationRunId: "run-b",
      extractedAt: "2026-10-05T00:00:00Z",
    });

    expect(second.snapshotHash).not.toBe(first.snapshotHash);
    expect(second.records[0]?.payloadHash).not.toBe(
      first.records[0]?.payloadHash,
    );
  });

  it("source-qualifies reused legacy IDs across archive/current periods", async () => {
    const current = await extractReadOnlySnapshot({
      source: source({
        period: "CURRENT",
        rows: [
          {
            rowNumber: 2,
            legacyId: "LEV-0001",
            values: { startDate: "01/10/2026" },
          },
        ],
      }),
      migrationRunId: "run-current",
      extractedAt: "2026-10-05T00:00:00Z",
    });
    const archive = await extractReadOnlySnapshot({
      source: source({
        period: "2025",
        rows: [
          {
            rowNumber: 2,
            legacyId: "LEV-0001",
            values: { startDate: "01/10/2025" },
          },
        ],
      }),
      migrationRunId: "run-archive",
      extractedAt: "2026-10-05T00:00:00Z",
    });

    expect(
      migrationRecordKey({
        provenance: current.records[0]!.provenance,
        payloadHash: current.records[0]!.payloadHash,
      }),
    ).not.toBe(
      migrationRecordKey({
        provenance: archive.records[0]!.provenance,
        payloadHash: archive.records[0]!.payloadHash,
      }),
    );
  });

  it("rejects blank legacy IDs instead of inferring row identity", async () => {
    await expect(
      extractReadOnlySnapshot({
        source: source({
          period: null,
          rows: [
            {
              rowNumber: 2,
              legacyId: " ",
              values: { value: "x" },
            },
          ],
        }),
        migrationRunId: "run-a",
        extractedAt: "2026-10-05T00:00:00Z",
      }),
    ).rejects.toThrow("Legacy row identifier is required");
  });

  it("extracts from frozen source rows without mutating legacy input", async () => {
    const values = Object.freeze({
      leave_id: "LEV-0001",
      status: "Pending",
    });
    const row = Object.freeze({
      rowNumber: 2,
      legacyId: "LEV-0001",
      values,
    });
    const rows = Object.freeze([row]);
    const before = JSON.stringify(rows);

    await extractReadOnlySnapshot({
      source: source({
        period: "CURRENT",
        rows,
      }),
      migrationRunId: "run-read-only",
      extractedAt: "2026-10-05T00:00:00Z",
    });

    expect(JSON.stringify(rows)).toBe(before);
    expect(Object.isFrozen(row)).toBe(true);
    expect(Object.isFrozen(values)).toBe(true);
  });
});
