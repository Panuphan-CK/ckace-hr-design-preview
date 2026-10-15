import type { LegacyProvenance } from "@ckace/contracts";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export interface LegacySourceDescriptor {
  readonly sourceSystem: LegacyProvenance["sourceSystem"];
  readonly sourceWorkbook: string;
  readonly sourceTab: string;
  readonly sourcePeriod: string | null;
}

export interface LegacyRawRow {
  readonly rowNumber: number;
  readonly legacyId: string;
  readonly values: Readonly<Record<string, JsonValue>>;
}

export interface LegacyExtractedRecord {
  readonly provenance: LegacyProvenance;
  readonly rowNumber: number;
  readonly values: Readonly<Record<string, JsonValue>>;
  readonly payloadHash: string;
}

export interface LegacySourceSnapshot {
  readonly descriptor: LegacySourceDescriptor;
  readonly snapshotHash: string;
  readonly extractedAt: string;
  readonly records: readonly LegacyExtractedRecord[];
}

export interface ReadOnlyLegacySource {
  readonly descriptor: LegacySourceDescriptor;
  readRows(): Promise<readonly LegacyRawRow[]>;
}

export type TransformDecision<TPayload extends JsonValue = JsonValue> =
  | {
      readonly action: "IMPORT";
      readonly targetEntityType: string;
      readonly payload: TPayload;
    }
  | {
      readonly action: "SKIP";
      readonly code: string;
      readonly reason: string;
      readonly disposition: string;
    }
  | {
      readonly action: "REJECT";
      readonly code: string;
      readonly reason: string;
    };

export interface MigrationTransformer<
  TPayload extends JsonValue = JsonValue,
> {
  readonly version: string;
  transform(
    record: LegacyExtractedRecord,
  ): TransformDecision<TPayload>;
}

export interface ExistingTargetRecord {
  readonly provenanceKey: string;
  readonly sourcePayloadHash: string;
  readonly transformedPayloadHash: string;
  readonly transformerVersion: string;
  readonly targetEntityType: string;
  readonly targetEntityId: string;
}

export interface TargetCreateInput {
  readonly migrationRunId: string;
  readonly provenance: LegacyProvenance;
  readonly provenanceKey: string;
  readonly rowNumber: number;
  readonly sourcePayloadHash: string;
  readonly transformedPayloadHash: string;
  readonly transformerVersion: string;
  readonly targetEntityType: string;
  readonly payload: JsonValue;
}

export interface TargetCreateResult {
  readonly targetEntityId: string;
}

export interface MigrationTargetStore {
  findByProvenanceKey(
    provenanceKey: string,
  ): Promise<ExistingTargetRecord | null>;

  create(
    input: TargetCreateInput,
  ): Promise<TargetCreateResult>;
}

export type MigrationRecordOutcomeStatus =
  | "IMPORTED"
  | "SKIPPED_IDENTICAL"
  | "SKIPPED_TRANSFORM"
  | "REJECTED_TRANSFORM"
  | "EXCEPTION_SOURCE_CHANGED"
  | "EXCEPTION_TRANSFORM_CHANGED"
  | "AMBIGUOUS_WRITE";

export interface MigrationRecordOutcome {
  readonly provenanceKey: string;
  readonly legacyId: string;
  readonly rowNumber: number;
  readonly status: MigrationRecordOutcomeStatus;
  readonly code: string | null;
  readonly detail: string | null;
  readonly disposition: string | null;
  readonly targetEntityType: string | null;
  readonly targetEntityId: string | null;
}

export interface MigrationRunReport {
  readonly migrationRunId: string;
  readonly sourceSnapshot: string;
  readonly transformerVersion: string;
  readonly importedCount: number;
  readonly skippedCount: number;
  readonly rejectedCount: number;
  readonly exceptionCount: number;
  readonly mismatchCount: number;
  readonly ambiguousWriteCount: number;
  readonly stoppedEarly: boolean;
  readonly outcomes: readonly MigrationRecordOutcome[];
}

export interface MigrationResetTarget {
  readonly targetEntityType: string;
  readonly targetEntityId: string;
  readonly provenanceKey: string;
}

export interface MigrationResetPlan {
  readonly migrationRunId: string;
  readonly sourceSnapshot: string;
  readonly mode: "PLAN_ONLY";
  readonly requiresExplicitExecutionApproval: true;
  readonly targets: readonly MigrationResetTarget[];
}
