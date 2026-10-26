import { describe, expect, it } from "vitest";

import {
  archiveApprovalHistoryDisposition,
  countByStatus,
  leaveApprovalStepTransformer,
  leaveAttachmentTransformer,
  leaveEntitlementTransformer,
  leaveRequestTransformer,
  reconcileLeaveModule,
} from "./index";
import type { LegacyExtractedRecord } from "./migration-contracts";

function record(input: {
  tab: string;
  period: string;
  legacyId: string;
  values: Readonly<Record<string, string | number | null>>;
}): LegacyExtractedRecord {
  return {
    rowNumber: 2,
    provenance: {
      sourceSystem: "APP_LEAVE_GAS",
      sourceWorkbook: "Data_CK&RR_Requests",
      sourceTab: input.tab,
      sourcePeriod: input.period,
      legacyId: input.legacyId,
      rowFingerprint: "a".repeat(64),
      migrationRunId: "leave-run",
    },
    values: input.values,
    payloadHash: "b".repeat(64),
  };
}

function leaveRequest(
  tab = "LeaveRequests",
  period = "CURRENT",
  overrides: Readonly<Record<string, string | number | null>> = {},
): LegacyExtractedRecord {
  return record({
    tab,
    period,
    legacyId: "LEV-0001",
    values: {
      leave_id: "LEV-0001",
      description: "Annual leave",
      startDate: "05/10/2026",
      endDate: "05/10/2026",
      userId: "USER-001",
      PolicyID: "PL-00001",
      leaveType: "Annual",
      status: "Approved",
      currentStep: 1,
      rejectedReason: "",
      submitDate: "01/10/2026",
      updatedDate: "02/10/2026",
      leaveDuration: "F",
      startTime: "",
      endTime: "",
      ...overrides,
    },
  });
}

describe("M7 leave migration", () => {
  it("preserves source-qualified current/archive request identity", () => {
    const current = leaveRequestTransformer.transform(
      leaveRequest("LeaveRequests", "CURRENT"),
    );
    const archive = leaveRequestTransformer.transform(
      leaveRequest("LeaveRequests_2025", "2025"),
    );

    expect(current).toMatchObject({
      action: "IMPORT",
      payload: {
        legacyLeaveId: "LEV-0001",
        durationCode: "FULL_DAY",
        status: "APPROVED",
      },
    });
    expect(archive).toMatchObject({
      action: "IMPORT",
      payload: {
        legacyLeaveId: "LEV-0001",
      },
    });

    if (
      current.action !== "IMPORT" ||
      archive.action !== "IMPORT"
    ) {
      throw new Error("expected import decisions");
    }

    expect(current.payload.legacySourceRef).not.toBe(
      archive.payload.legacySourceRef,
    );
  });

  it("maps H using verified hourly semantics rather than fixed half day", () => {
    const hourly = leaveRequest(
      "LeaveRequests",
      "CURRENT",
      {
        leaveDuration: "H",
        startTime: "09:00",
        endTime: "11:00",
      },
    );

    expect(
      leaveRequestTransformer.transform(hourly),
    ).toMatchObject({
      action: "IMPORT",
      payload: {
        durationCode: "HOURLY",
        startTime: "09:00",
        endTime: "11:00",
      },
    });
  });

  it("rejects malformed hourly history instead of guessing", () => {
    const hourly = leaveRequest(
      "LeaveRequests",
      "CURRENT",
      {
        leaveDuration: "H",
        startTime: "",
        endTime: "",
      },
    );

    expect(
      leaveRequestTransformer.transform(hourly),
    ).toMatchObject({
      action: "REJECT",
      code: "LEAVE_REQUEST_INVALID_SOURCE",
    });
  });

  it("imports only explicit entitlement rows and never manufactures missing policies", () => {
    expect(
      leaveEntitlementTransformer.transform(
        record({
          tab: "UserPolicies",
          period: "CURRENT",
          legacyId: "PL-00001",
          values: {
            PolicyID: "PL-00001",
            UserID: "USER-001",
            LeaveType: "Annual",
            LeaveQuota: 5,
            targetQuota: 6,
          },
        }),
      ),
    ).toMatchObject({
      action: "IMPORT",
      payload: {
        legacyPolicyId: "PL-00001",
        employeeLegacyId: "USER-001",
        leaveTypeKey: "ANNUAL",
        quota: 6,
        comparisonQuota: 5,
        quotaDifference: 1,
      },
    });
  });

  it("pins current approval steps to current request provenance only", () => {
    const decision = leaveApprovalStepTransformer.transform(
      record({
        tab: "ApprovalSteps",
        period: "CURRENT",
        legacyId: "LEV-0001-STEP1",
        values: {
          stepId: "LEV-0001-STEP1",
          requestId: "LEV-0001",
          stepOrder: 1,
          approverId: "USER-002",
          assignedAt: "01/10/2026",
          approvedAt: "02/10/2026",
          status: "Approved",
          comment: "",
        },
      }),
    );

    expect(decision).toMatchObject({
      action: "IMPORT",
      payload: {
        currentRequestProvenanceKey:
          "APP_LEAVE_GAS::Data_CK&RR_Requests::LeaveRequests::CURRENT::LEV-0001",
      },
    });
  });

  it("preserves Revise as raw history while mapping approval-step state to PENDING", () => {
    const decision = leaveApprovalStepTransformer.transform(
      record({
        tab: "ApprovalSteps",
        period: "CURRENT",
        legacyId: "LEV-0001-STEP1",
        values: {
          stepId: "LEV-0001-STEP1",
          requestId: "LEV-0001",
          stepOrder: 1,
          approverId: "USER-002",
          assignedAt: "01/10/2026",
          approvedAt: "",
          status: "Revise",
          comment: "Please revise",
        },
      }),
    );

    expect(decision).toMatchObject({
      action: "IMPORT",
      payload: {
        rawStatus: "Revise",
        normalizedStatus: "PENDING",
      },
    });
  });

  it("imports current leave attachment references without inferring archive ownership", () => {
    const decision = leaveAttachmentTransformer.transform(
      record({
        tab: "Attachments",
        period: "CURRENT",
        legacyId: "FILE-0001",
        values: {
          FileID: "FILE-0001",
          LeaveID: "LEV-0001",
          FileURL:
            "https://drive.google.com/file/d/legacy-file",
          UserID: "USER-001",
          CreatedDate: "01/10/2026",
        },
      }),
    );

    expect(decision).toMatchObject({
      action: "IMPORT",
      targetEntityType: "leave_attachment_reference",
      payload: {
        legacyFileId: "FILE-0001",
        legacyLeaveId: "LEV-0001",
        currentRequestProvenanceKey:
          "APP_LEAVE_GAS::Data_CK&RR_Requests::LeaveRequests::CURRENT::LEV-0001",
        ownerEmployeeLegacyId: "USER-001",
        createdDate: "2026-10-01",
        privacyClass: "EMPLOYEE_PRIVATE",
        archiveAssociationRule:
          "CURRENT_REQUEST_ONLY_DO_NOT_INFER_ARCHIVE_HISTORY_BY_LEAVE_ID",
      },
    });
  });

  it("accepts explicit row-qualified provenance for duplicate current attachment FileID rows", () => {
    expect(
      leaveAttachmentTransformer.transform(
        {
          ...record({
            tab: "Attachments",
            period: "CURRENT",
            legacyId: "FILE-0001::ROW:13",
            values: {
              FileID: "FILE-0001",
              LeaveID: "LEV-0001",
              FileURL: "https://drive.google.com/file/d/legacy-file-2",
              UserID: "USER-001",
              CreatedDate: "1/10/2026",
            },
          }),
          rowNumber: 13,
        },
      ),
    ).toMatchObject({
      action: "IMPORT",
      payload: {
        legacyFileId: "FILE-0001",
        createdDate: "2026-10-01",
      },
    });
  });

  it("rejects non-current or mismatched leave attachment provenance", () => {
    expect(
      leaveAttachmentTransformer.transform(
        record({
          tab: "Attachments",
          period: "2025",
          legacyId: "FILE-0001",
          values: {
            FileID: "FILE-0001",
            LeaveID: "LEV-0001",
            FileURL: "https://drive.google.com/file/d/legacy-file",
            UserID: "USER-001",
            CreatedDate: "01/10/2026",
          },
        }),
      ),
    ).toMatchObject({
      action: "REJECT",
      code: "LEAVE_ATTACHMENT_INVALID_SOURCE",
    });

    expect(
      leaveAttachmentTransformer.transform(
        record({
          tab: "Attachments",
          period: "CURRENT",
          legacyId: "FILE-0001",
          values: {
            FileID: "FILE-OTHER",
            LeaveID: "LEV-0001",
            FileURL: "https://drive.google.com/file/d/legacy-file",
            UserID: "USER-001",
            CreatedDate: "01/10/2026",
          },
        }),
      ),
    ).toMatchObject({
      action: "REJECT",
      code: "LEAVE_ATTACHMENT_INVALID_SOURCE",
    });
  });

  it("records archive approval history ambiguity as an explicit exception", () => {
    const disposition =
      archiveApprovalHistoryDisposition(84);

    expect(disposition).toMatchObject({
      status: "EXCEPTION",
      exceptionCode:
        "LEGACY_ARCHIVE_APPROVAL_HISTORY_INCOMPLETE",
    });
    expect(disposition.disposition).toContain(
      "DO_NOT_ATTACH_CURRENT_STEPS",
    );
  });

  it("makes reconciliation mismatches blocking", () => {
    const source = {
      requestCount: 107,
      statusCounts: { APPROVED: 99, PENDING: 3 },
      typeCounts: { ANNUAL: 56, PERSONAL: 14, SICK: 37 },
      durationCounts: {
        FULL_DAY: 75,
        HOURLY: 13,
        MORNING: 12,
        AFTERNOON: 7,
      },
      entitlementCount: 66,
      quotaTotal: 902,
      attachmentCount: 13,
    };

    expect(
      countByStatus(reconcileLeaveModule(source, source)),
    ).toEqual({ PASS: 7, EXCEPTION: 0, FAIL: 0 });

    const mismatch = reconcileLeaveModule(source, {
      ...source,
      requestCount: 106,
    });
    expect(countByStatus(mismatch)).toEqual({
      PASS: 6,
      EXCEPTION: 0,
      FAIL: 1,
    });
    expect(
      mismatch.find((entry) => entry.status === "FAIL")
        ?.disposition,
    ).toContain("BLOCK_LEAVE_ACCEPTANCE");
  });
});
