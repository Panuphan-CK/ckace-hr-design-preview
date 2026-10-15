import {
  legacyProvenanceKey,
  type LegacyProvenance,
} from "@ckace/contracts";

export interface MigrationSourceRecord {
  readonly provenance: LegacyProvenance;
  readonly payloadHash: string;
}

export function migrationRecordKey(record: MigrationSourceRecord): string {
  return legacyProvenanceKey(record.provenance);
}
