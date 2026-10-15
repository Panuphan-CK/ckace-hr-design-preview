import { describe, expect, it } from "vitest";

import {
  buildMigrationRunPersistenceSummary,
  buildRunReconciliationResults,
  classifyMigrationRun,
  type MigrationRunReport,
} from "./index";

function report(
  outcomes: MigrationRunReport["outcomes"],
  stoppedEarly = false,
): MigrationRunReport {
  return {
    migrationRunId: "run-1",
    sourceSnapshot: "snapshot",
    transformerVersion: "v1",
    importedCount: outcomes.filter(
      (outcome) => outcome.status === "IMPORTED",
    ).length,
    skippedCount: outcomes.filter((outcome) =>
      outcome.status.startsWith("SKIPPED_"),
    ).length,
    rejectedCount: outcomes.filter(
      (outcome) => outcome.status === "REJECTED_TRANSFORM",
    ).length,
    exceptionCount: outcomes.filter((outcome) =>
      outcome.status.startsWith("EXCEPTION_"),
    ).length,
    mismatchCount: outcomes.filter(
      (outcome) =>
        !["IMPORTED", "SKIPPED_IDENTICAL"].includes(
          outcome.status,
        ),
    ).length,
    ambiguousWriteCount: outcomes.filter(
      (outcome) => outcome.status === "AMBIGUOUS_WRITE",
    ).length,
    stoppedEarly,
    outcomes,
  };
}

describe("migration run reporting", () => {
  it("classifies a clean import as COMPLETED", () => {
    expect(
      classifyMigrationRun(
        report([
          {
            provenanceKey: "book::tab::CURRENT::1",
            legacyId: "1",
            rowNumber: 2,
            status: "IMPORTED",
            code: null,
            detail: null,
            disposition: null,
            targetEntityType: "employee",
            targetEntityId:
              "00000000-0000-4000-8000-000000000001",
          },
        ]),
      ),
    ).toBe("COMPLETED");
  });

  it("classifies a disposition-backed skip as COMPLETED_WITH_EXCEPTIONS", () => {
    const migrationReport = report([
      {
        provenanceKey: "book::TimeLog::CURRENT::LOG-1",
        legacyId: "LOG-1",
        rowNumber: 42,
        status: "SKIPPED_TRANSFORM",
        code: "LEGACY_DUPLICATE_BUSINESS_DAY",
        detail: "Preserve distinct legacy duplicate for review",
        disposition:
          "PRESERVE_DISTINCT_RECORDS_AND_REQUIRE_OWNER_REVIEW",
        targetEntityType: "attendance_record",
        targetEntityId: null,
      },
    ]);

    expect(classifyMigrationRun(migrationReport)).toBe(
      "COMPLETED_WITH_EXCEPTIONS",
    );
    expect(
      buildRunReconciliationResults(migrationReport)[0],
    ).toMatchObject({
      status: "EXCEPTION",
      exceptionCode: "LEGACY_DUPLICATE_BUSINESS_DAY",
      disposition:
        "PRESERVE_DISTINCT_RECORDS_AND_REQUIRE_OWNER_REVIEW",
    });
  });

  it("classifies unresolved source drift and ambiguous writes as FAILED", () => {
    expect(
      classifyMigrationRun(
        report([
          {
            provenanceKey: "book::tab::CURRENT::1",
            legacyId: "1",
            rowNumber: 2,
            status: "EXCEPTION_SOURCE_CHANGED",
            code: "LEGACY_SOURCE_CHANGED",
            detail: "source changed",
            disposition: null,
            targetEntityType: "employee",
            targetEntityId:
              "00000000-0000-4000-8000-000000000001",
          },
        ]),
      ),
    ).toBe("FAILED");

    expect(
      classifyMigrationRun(
        report(
          [
            {
              provenanceKey: "book::tab::CURRENT::1",
              legacyId: "1",
              rowNumber: 2,
              status: "AMBIGUOUS_WRITE",
              code: "TARGET_WRITE_RESULT_UNKNOWN",
              detail: "unknown write outcome",
              disposition: null,
              targetEntityType: "employee",
              targetEntityId: null,
            },
          ],
          true,
        ),
      ),
    ).toBe("FAILED");
  });

  it("converts blocking outcomes to reconciliation FAIL with explicit review disposition", () => {
    const results = buildRunReconciliationResults(
      report([
        {
          provenanceKey: "book::tab::CURRENT::1",
          legacyId: "1",
          rowNumber: 2,
          status: "REJECTED_TRANSFORM",
          code: "INVALID_DATE",
          detail: "invalid date",
          disposition: null,
          targetEntityType: "leave_request",
          targetEntityId: null,
        },
      ]),
    );

    expect(results[0]).toMatchObject({
      status: "FAIL",
      exceptionCode: "INVALID_DATE",
      disposition: "BLOCK_RUN_AND_REQUIRE_EXPLICIT_REVIEW",
    });
  });

  it("builds persistence fields required by migration_runs", () => {
    const migrationReport = report([
      {
        provenanceKey: "book::tab::CURRENT::1",
        legacyId: "1",
        rowNumber: 2,
        status: "IMPORTED",
        code: null,
        detail: null,
        disposition: null,
        targetEntityType: "employee",
        targetEntityId:
          "00000000-0000-4000-8000-000000000001",
      },
      {
        provenanceKey: "book::tab::CURRENT::2",
        legacyId: "2",
        rowNumber: 3,
        status: "SKIPPED_TRANSFORM",
        code: "KNOWN_LEGACY_EXCEPTION",
        detail: "known anomaly",
        disposition: "PRESERVE_AND_REPORT",
        targetEntityType: "employee",
        targetEntityId: null,
      },
    ]);

    expect(
      buildMigrationRunPersistenceSummary(migrationReport),
    ).toEqual({
      sourceSnapshot: "snapshot",
      transformerVersion: "v1",
      status: "COMPLETED_WITH_EXCEPTIONS",
      importedCount: 1,
      skippedCount: 1,
      rejectedCount: 0,
      mismatchCount: 1,
    });
  });
});
