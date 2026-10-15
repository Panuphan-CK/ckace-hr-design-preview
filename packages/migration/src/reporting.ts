import type {
  MigrationRecordOutcome,
  MigrationRunReport,
} from "./migration-contracts";
import type { ReconciliationResult } from "./reconciliation";

export type MigrationRunCompletionStatus =
  | "COMPLETED"
  | "COMPLETED_WITH_EXCEPTIONS"
  | "FAILED";

export interface MigrationRunPersistenceSummary {
  readonly sourceSnapshot: string;
  readonly transformerVersion: string;
  readonly status: MigrationRunCompletionStatus;
  readonly importedCount: number;
  readonly skippedCount: number;
  readonly rejectedCount: number;
  readonly mismatchCount: number;
}

function isBlockingOutcome(
  outcome: MigrationRecordOutcome,
): boolean {
  return [
    "REJECTED_TRANSFORM",
    "EXCEPTION_SOURCE_CHANGED",
    "EXCEPTION_TRANSFORM_CHANGED",
    "AMBIGUOUS_WRITE",
  ].includes(outcome.status);
}

export function classifyMigrationRun(
  report: MigrationRunReport,
): MigrationRunCompletionStatus {
  if (
    report.stoppedEarly ||
    report.outcomes.some(isBlockingOutcome)
  ) {
    return "FAILED";
  }

  if (
    report.outcomes.some(
      (outcome) => outcome.status === "SKIPPED_TRANSFORM",
    )
  ) {
    return "COMPLETED_WITH_EXCEPTIONS";
  }

  return "COMPLETED";
}

function outcomeDisposition(
  outcome: MigrationRecordOutcome,
): string | null {
  if (outcome.status === "SKIPPED_TRANSFORM") {
    return outcome.disposition;
  }

  if (isBlockingOutcome(outcome)) {
    return "BLOCK_RUN_AND_REQUIRE_EXPLICIT_REVIEW";
  }

  return null;
}

function outcomeStatus(
  outcome: MigrationRecordOutcome,
): ReconciliationResult["status"] {
  if (
    outcome.status === "IMPORTED" ||
    outcome.status === "SKIPPED_IDENTICAL"
  ) {
    return "PASS";
  }

  if (outcome.status === "SKIPPED_TRANSFORM") {
    return "EXCEPTION";
  }

  return "FAIL";
}

export function buildMigrationRunPersistenceSummary(
  report: MigrationRunReport,
): MigrationRunPersistenceSummary {
  return {
    sourceSnapshot: report.sourceSnapshot,
    transformerVersion: report.transformerVersion,
    status: classifyMigrationRun(report),
    importedCount: report.importedCount,
    skippedCount: report.skippedCount,
    rejectedCount: report.rejectedCount,
    mismatchCount: report.mismatchCount,
  };
}

export function buildRunReconciliationResults(
  report: MigrationRunReport,
): readonly ReconciliationResult[] {
  return report.outcomes.map((outcome) => {
    const status = outcomeStatus(outcome);
    const disposition = outcomeDisposition(outcome);

    if (status !== "PASS" && !disposition?.trim()) {
      throw new Error(
        "Migration mismatch requires an explicit disposition",
      );
    }

    return {
      entityType:
        outcome.targetEntityType ?? "migration_source_record",
      checkName: outcome.status,
      status,
      sourceValue: [
        outcome.legacyId,
        `row=${outcome.rowNumber}`,
      ].join(";"),
      targetValue: outcome.targetEntityId ?? "NONE",
      exceptionCode:
        status === "PASS"
          ? null
          : outcome.code ?? outcome.status,
      disposition: status === "PASS" ? null : disposition,
    };
  });
}
