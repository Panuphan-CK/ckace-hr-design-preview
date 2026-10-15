import { createHash } from "node:crypto";

import type { LegacyProvenance } from "@ckace/contracts";

import type {
  JsonValue,
  LegacyExtractedRecord,
  LegacyRawRow,
  LegacySourceDescriptor,
  LegacySourceSnapshot,
  ReadOnlyLegacySource,
} from "./migration-contracts";

function assertFiniteNumber(value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error("Legacy JSON values cannot contain non-finite numbers");
  }
}

export function canonicalJson(value: JsonValue): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    assertFiniteNumber(value);
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }

  const objectValue = value as Readonly<Record<string, JsonValue>>;
  const keys = Object.keys(objectValue).sort();

  return `{${keys
    .map(
      (key) =>
        `${JSON.stringify(key)}:${canonicalJson(objectValue[key]!)}`,
    )
    .join(",")}}`;
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function normalizeSourcePeriod(
  sourcePeriod: string | null,
): string {
  const normalized = sourcePeriod?.trim();

  return normalized ? normalized : "CURRENT";
}

function validateDescriptor(
  descriptor: LegacySourceDescriptor,
): void {
  if (descriptor.sourceSystem !== "APP_LEAVE_GAS") {
    throw new Error("Unsupported legacy source system");
  }

  if (
    !descriptor.sourceWorkbook.trim() ||
    !descriptor.sourceTab.trim()
  ) {
    throw new Error("Legacy source workbook and tab are required");
  }
}

function validateRow(row: LegacyRawRow): void {
  if (!Number.isSafeInteger(row.rowNumber) || row.rowNumber < 2) {
    throw new Error("Legacy rowNumber must identify a data row");
  }

  if (!row.legacyId.trim()) {
    throw new Error("Legacy row identifier is required");
  }
}

export function computeLegacySnapshotHash(input: {
  readonly descriptor: LegacySourceDescriptor;
  readonly records: readonly LegacyExtractedRecord[];
}): string {
  validateDescriptor(input.descriptor);

  return sha256Hex(
    canonicalJson({
      descriptor: {
        sourceSystem: input.descriptor.sourceSystem,
        sourceWorkbook: input.descriptor.sourceWorkbook,
        sourceTab: input.descriptor.sourceTab,
        sourcePeriod: normalizeSourcePeriod(
          input.descriptor.sourcePeriod,
        ),
      },
      rows: input.records.map((record) => ({
        rowNumber: record.rowNumber,
        legacyId: record.provenance.legacyId,
        rowFingerprint: record.provenance.rowFingerprint,
      })),
    }),
  );
}

function buildProvenance(
  descriptor: LegacySourceDescriptor,
  row: LegacyRawRow,
  rowFingerprint: string,
  migrationRunId: string,
): LegacyProvenance {
  return {
    sourceSystem: descriptor.sourceSystem,
    sourceWorkbook: descriptor.sourceWorkbook,
    sourceTab: descriptor.sourceTab,
    sourcePeriod: normalizeSourcePeriod(descriptor.sourcePeriod),
    legacyId: row.legacyId,
    rowFingerprint,
    migrationRunId,
  };
}

export async function extractReadOnlySnapshot(input: {
  readonly source: ReadOnlyLegacySource;
  readonly migrationRunId: string;
  readonly extractedAt: string;
}): Promise<LegacySourceSnapshot> {
  validateDescriptor(input.source.descriptor);

  if (!input.migrationRunId.trim()) {
    throw new Error("migrationRunId is required");
  }

  const extractedAt = new Date(input.extractedAt);

  if (Number.isNaN(extractedAt.getTime())) {
    throw new Error("extractedAt must be an ISO-compatible timestamp");
  }

  const rows = await input.source.readRows();
  const records: LegacyExtractedRecord[] = rows.map((row) => {
    validateRow(row);
    const payloadHash = sha256Hex(canonicalJson(row.values));

    return {
      provenance: buildProvenance(
        input.source.descriptor,
        row,
        payloadHash,
        input.migrationRunId,
      ),
      rowNumber: row.rowNumber,
      values: row.values,
      payloadHash,
    };
  });

  return {
    descriptor: input.source.descriptor,
    snapshotHash: computeLegacySnapshotHash({
      descriptor: input.source.descriptor,
      records,
    }),
    extractedAt: extractedAt.toISOString(),
    records,
  };
}
