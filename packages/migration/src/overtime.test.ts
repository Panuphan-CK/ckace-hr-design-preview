import { describe, expect, it } from "vitest";

import {
  countByStatus,
  overtimeApprovalStepTransformer,
  overtimeRequestTransformer,
  reconcileOvertimeModule,
} from "./index";
import type { LegacyExtractedRecord } from "./migration-contracts";

function record(input: {
  readonly tab: string;
  readonly legacyId: string;
  readonly values: Readonly<
    Record<string, string | number | null>
  >;
  readonly period?: "CURRENT" | "ARCHIVE";
}): LegacyExtractedRecord {
  return {
    rowNumber: 2,
    provenance: {
      sourceSystem: "APP_LEAVE_GAS",
      sourceWorkbook: "Data_CK&RR_Requests",
      sourceTab: input.tab,
      sourcePeriod: input.period ?? "CURRENT",
      legacyId: input.legacyId,
      rowFingerprint: "a".repeat(64),
      migrationRunId: "m7-overtime-test",
    },
    values: input.values,
    payloadHash: "b".repeat(64),
  };
}

function overtimeRequest(
  overrides: Readonly<
    Record<string, string | number | null>
  > = {},
): LegacyExtractedRecord {
  return record({
    tab: "OvertimeRequests",
    legacyId: "OT-00508",
    values: {
      RequestID: "OT-00508",
      UserID: "USER-001",
      Fullname: "Employee One",
      RequestDate: "05/10/2026",
      StartDate: "05/10/2026",
      EndDate: "05/10/2026",
      StartTime: "17:30",
      EndTime: "20:00",
      Hours: "2.50",
      Reason: "Close month",
      Status: "Approved",
      CurrentStep: 3,
      Comment: "",
      UpdatedAt: "05/10/2026",
      Days: 1,
      ...overrides,
    },
  });
}

function overtimeStep(
  overrides: Readonly<
    Record<string, string | number | null>
  > = {},
  period: "CURRENT" | "ARCHIVE" = "CURRENT",
): LegacyExtractedRecord {
  return record({
    tab: "OT_ApprovalSteps",
    legacyId: "OT-00508-STEP3",
    period,
    values: {
      step_id: "OT-00508-STEP3",
      request_id: "OT-00508",
      step: 3,
      approver_id: "USER-003",
      createdDate: "05/10/2026",
      approvedDate: "",
      status: "Pending",
      comment: "",
      ...overrides,
    },
  });
}

describe("M7 overtime migration", () => {
  it("imports one legacy OT row as one canonical daily bundle", () => {
    expect(
      overtimeRequestTransformer.transform(
        overtimeRequest(),
      ),
    ).toMatchObject({
      action: "IMPORT",
      targetEntityType: "overtime_request_bundle",
      payload: {
        legacyRequestId: "OT-00508",
        employeeLegacyId: "USER-001",
        requestDate: "2026-10-05",
        startDate: "2026-10-05",
        endDate: "2026-10-05",
        startTime: "17:30",
        endTime: "20:00",
        requestedMinutes: 150,
        status: "APPROVED",
        rawStatus: "Approved",
        currentStep: 3,
        totalDays: 1,
        segments: [
          {
            workDate: "2026-10-05",
            startTime: "17:30",
            endTime: "20:00",
            requestedMinutes: 150,
            attendanceRecordId: null,
          },
        ],
      },
    });
  });

  it("rejects malformed or nonpositive legacy TotalHours", () => {
    expect(
      overtimeRequestTransformer.transform(
        overtimeRequest({ Hours: "not-a-number" }),
      ),
    ).toMatchObject({
      action: "REJECT",
      code: "OVERTIME_REQUEST_INVALID_SOURCE",
    });

    expect(
      overtimeRequestTransformer.transform(
        overtimeRequest({ Hours: 0 }),
      ),
    ).toMatchObject({
      action: "REJECT",
      code: "OVERTIME_REQUEST_INVALID_SOURCE",
    });
  });

  it("rejects multi-day legacy rows because live storage is one row per day", () => {
    expect(
      overtimeRequestTransformer.transform(
        overtimeRequest({
          EndDate: "06/10/2026",
        }),
      ),
    ).toMatchObject({
      action: "REJECT",
      code: "OVERTIME_REQUEST_INVALID_SOURCE",
    });
  });

  it("imports CURRENT approval steps with source-qualified request provenance", () => {
    expect(
      overtimeApprovalStepTransformer.transform(
        overtimeStep({
          status: "Approved",
          approvedDate: "05/10/2026",
        }),
      ),
    ).toMatchObject({
      action: "IMPORT",
      targetEntityType: "overtime_approval_step",
      payload: {
        legacyStepId: "OT-00508-STEP3",
        legacyRequestId: "OT-00508",
        stepOrder: 3,
        approverLegacyId: "USER-003",
        rawStatus: "Approved",
        normalizedStatus: "APPROVED",
        status: "APPROVED",
      },
    });
  });

  it("preserves downstream Pending after a historical Rejected step", () => {
    expect(
      overtimeApprovalStepTransformer.transform(
        overtimeStep({ status: "Pending" }),
      ),
    ).toMatchObject({
      action: "IMPORT",
      payload: {
        rawStatus: "Pending",
        normalizedStatus: "PENDING",
        status: "PENDING",
      },
    });

    expect(
      overtimeApprovalStepTransformer.transform(
        overtimeStep({
          status: "Rejected",
          approvedDate: "05/10/2026",
          comment: "Rejected earlier in chain",
        }),
      ),
    ).toMatchObject({
      action: "IMPORT",
      payload: {
        rawStatus: "Rejected",
        normalizedStatus: "REJECTED",
        status: "REJECTED",
      },
    });
  });

  it("rejects non-CURRENT OT approval steps rather than guessing provenance", () => {
    expect(
      overtimeApprovalStepTransformer.transform(
        overtimeStep({}, "ARCHIVE"),
      ),
    ).toMatchObject({
      action: "REJECT",
      code: "OVERTIME_APPROVAL_INVALID_SOURCE",
    });
  });

  it("accepts the M0 508-request / 1550-step baseline when source and target match", () => {
    const ids = Array.from(
      { length: 508 },
      (_, index) =>
        `OT-${String(index + 1).padStart(5, "0")}`,
    );
    const snapshot = {
      requestCount: 508,
      requestLegacyIds: ids,
      requestStatusCounts: {
        APPROVED: 506,
        REJECTED: 1,
        PENDING: 1,
      },
      requestedMinutesTotal: 76_200,
      approvalStepCount: 1550,
      approvalStepStatusCounts: {
        APPROVED: 1547,
        REJECTED: 1,
        PENDING: 2,
      },
      orphanEmployeeCount: 0,
      orphanApprovalStepRequestCount: 0,
      missingOrInactiveApproverCount: 0,
      dateShapeCounts: {
        valid: 508,
        invalid: 0,
      },
      timeShapeCounts: {
        valid: 508,
        invalid: 0,
      },
    };

    expect(
      countByStatus(
        reconcileOvertimeModule(snapshot, snapshot),
      ),
    ).toEqual({
      PASS: 11,
      EXCEPTION: 0,
      FAIL: 0,
    });
  });

  it("makes true source/target drift blocking", () => {
    const source = {
      requestCount: 508,
      requestLegacyIds: ["OT-00001", "OT-00002"],
      requestStatusCounts: {
        APPROVED: 506,
        REJECTED: 1,
        PENDING: 1,
      },
      requestedMinutesTotal: 120,
      approvalStepCount: 1550,
      approvalStepStatusCounts: {
        APPROVED: 1547,
        REJECTED: 1,
        PENDING: 2,
      },
      orphanEmployeeCount: 0,
      orphanApprovalStepRequestCount: 0,
      missingOrInactiveApproverCount: 0,
      dateShapeCounts: { valid: 508 },
      timeShapeCounts: { valid: 508 },
    };

    const results = reconcileOvertimeModule(source, {
      ...source,
      requestCount: 507,
    });

    expect(countByStatus(results)).toEqual({
      PASS: 10,
      EXCEPTION: 0,
      FAIL: 1,
    });
    expect(
      results.find((entry) => entry.status === "FAIL"),
    ).toMatchObject({
      checkName: "request_count",
      disposition:
        "BLOCK_OVERTIME_ACCEPTANCE_UNTIL_SOURCE_AND_TARGET_RECONCILE",
    });
  });
});
