import { describe, expect, it } from "vitest";

import {
  countByStatus,
  medicalApprovalStepTransformer,
  medicalArchiveHistoryDisposition,
  medicalAttachmentTransformer,
  medicalClaimTransformer,
  reconcileMedicalModule,
} from "./index";
import type { LegacyExtractedRecord } from "./migration-contracts";

function record(input: {
  readonly tab: string;
  readonly period: string;
  readonly legacyId: string;
  readonly values: Readonly<
    Record<string, string | number | null>
  >;
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
      migrationRunId: "m7-medical-test",
    },
    values: input.values,
    payloadHash: "b".repeat(64),
  };
}

function claim(
  tab = "MedicalClaims",
  period = "CURRENT",
  overrides: Readonly<
    Record<string, string | number | null>
  > = {},
): LegacyExtractedRecord {
  return record({
    tab,
    period,
    legacyId: "MED-00001",
    values: {
      ClaimID: "MED-00001",
      UserID: "USER-001",
      LeaveID: "",
      ClaimDate: "05/10/2026",
      SicknessDate: "04/10/2026",
      Amount: 1000,
      Description: "Medical receipt",
      Status: "Approved",
      CurrentStep: 1,
      RejectedReason: "",
      UpdatedDate: "05/10/2026",
      ...overrides,
    },
  });
}

function step(
  overrides: Readonly<
    Record<string, string | number | null>
  > = {},
  period = "CURRENT",
): LegacyExtractedRecord {
  return record({
    tab: "Medical_ApprovalSteps",
    period,
    legacyId: "MED-00001-STEP1",
    values: {
      step_id: "MED-00001-STEP1",
      request_id: "MED-00001",
      step: 1,
      approver_id: "USER-002",
      createdDate: "05/10/2026",
      approvedDate: "",
      status: "Pending",
      comment: "",
      ...overrides,
    },
  });
}

function attachment(
  overrides: Readonly<
    Record<string, string | number | null>
  > = {},
  period = "CURRENT",
): LegacyExtractedRecord {
  return record({
    tab: "MedicalAttachments",
    period,
    legacyId: "MF-00001",
    values: {
      FileID: "MF-00001",
      ClaimID: "MED-00001",
      FileURL:
        "https://drive.google.com/file/d/legacy-ref/view",
      FileName: "receipt.pdf",
      UploadedBy: "USER-001",
      UploadedAt: "05/10/2026",
      ...overrides,
    },
  });
}

describe("M7 medical migration", () => {
  it("preserves distinct source-qualified identity for current/archive ClaimID reuse", () => {
    const current =
      medicalClaimTransformer.transform(
        claim("MedicalClaims", "CURRENT"),
      );
    const archive =
      medicalClaimTransformer.transform(
        claim("MedicalClaims_2025", "2025", {
          UserID: "USER-009",
          ClaimDate: "05/10/2025",
          SicknessDate: "04/10/2025",
          Amount: 750,
          UpdatedDate: "05/10/2025",
        }),
      );

    expect(current).toMatchObject({
      action: "IMPORT",
      payload: {
        legacyClaimId: "MED-00001",
        sourcePeriod: "CURRENT",
        status: "APPROVED",
        archiveHistoryEvidence:
          "CURRENT_REQUEST_HISTORY_ONLY",
      },
    });
    expect(archive).toMatchObject({
      action: "IMPORT",
      payload: {
        legacyClaimId: "MED-00001",
        sourcePeriod: "2025",
        archiveHistoryEvidence:
          "APPROVAL_AND_ATTACHMENT_HISTORY_MAY_BE_INCOMPLETE_OR_AMBIGUOUS",
      },
    });

    if (
      current.action !== "IMPORT" ||
      archive.action !== "IMPORT"
    ) {
      throw new Error(
        "expected medical import decisions",
      );
    }

    expect(
      current.payload.legacySourceRef,
    ).not.toBe(
      archive.payload.legacySourceRef,
    );
  });

  it("preserves optional LeaveID as nullable source reference", () => {
    expect(
      medicalClaimTransformer.transform(
        claim(),
      ),
    ).toMatchObject({
      action: "IMPORT",
      payload: {
        linkedLeaveLegacyId: null,
      },
    });

    expect(
      medicalClaimTransformer.transform(
        claim(
          "MedicalClaims",
          "CURRENT",
          {
            LeaveID: "LEV-0003",
          },
        ),
      ),
    ).toMatchObject({
      action: "IMPORT",
      payload: {
        linkedLeaveLegacyId: "LEV-0003",
      },
    });
  });

  it("rejects malformed amounts instead of silently rounding history", () => {
    expect(
      medicalClaimTransformer.transform(
        claim(
          "MedicalClaims",
          "CURRENT",
          { Amount: "not-a-number" },
        ),
      ),
    ).toMatchObject({
      action: "REJECT",
      code: "MEDICAL_CLAIM_INVALID_SOURCE",
    });

    expect(
      medicalClaimTransformer.transform(
        claim(
          "MedicalClaims",
          "CURRENT",
          { Amount: 10.001 },
        ),
      ),
    ).toMatchObject({
      action: "REJECT",
      code: "MEDICAL_CLAIM_INVALID_SOURCE",
    });
  });

  it("pins current approval steps to current MedicalClaims provenance only", () => {
    expect(
      medicalApprovalStepTransformer.transform(
        step({
          status: "Approved",
          approvedDate: "05/10/2026",
        }),
      ),
    ).toMatchObject({
      action: "IMPORT",
      payload: {
        legacyClaimId: "MED-00001",
        currentRequestProvenanceKey:
          "APP_LEAVE_GAS::Data_CK&RR_Requests::MedicalClaims::CURRENT::MED-00001",
        rawStatus: "Approved",
        normalizedStatus: "APPROVED",
      },
    });
  });

  it("preserves rejected-chain downstream Pending as raw historical state", () => {
    expect(
      medicalApprovalStepTransformer.transform(
        step({
          status: "Rejected",
          approvedDate: "05/10/2026",
          comment: "Rejected",
        }),
      ),
    ).toMatchObject({
      action: "IMPORT",
      payload: {
        rawStatus: "Rejected",
        normalizedStatus: "REJECTED",
      },
    });

    expect(
      medicalApprovalStepTransformer.transform(
        record({
          tab: "Medical_ApprovalSteps",
          period: "CURRENT",
          legacyId: "MED-00001-STEP2",
          values: {
            step_id: "MED-00001-STEP2",
            request_id: "MED-00001",
            step: 2,
            approver_id: "USER-003",
            createdDate: "05/10/2026",
            approvedDate: "",
            status: "Pending",
            comment: "",
          },
        }),
      ),
    ).toMatchObject({
      action: "IMPORT",
      payload: {
        rawStatus: "Pending",
        normalizedStatus: "PENDING",
      },
    });
  });

  it("rejects non-current approval rows rather than attaching them to archive by ClaimID", () => {
    expect(
      medicalApprovalStepTransformer.transform(
        step({}, "2025"),
      ),
    ).toMatchObject({
      action: "REJECT",
      code: "MEDICAL_APPROVAL_INVALID_SOURCE",
    });
  });

  it("imports current attachment metadata as private legacy reference pinned to current request", () => {
    expect(
      medicalAttachmentTransformer.transform(
        attachment(),
      ),
    ).toMatchObject({
      action: "IMPORT",
      payload: {
        legacyFileId: "MF-00001",
        legacyClaimId: "MED-00001",
        currentRequestProvenanceKey:
          "APP_LEAVE_GAS::Data_CK&RR_Requests::MedicalClaims::CURRENT::MED-00001",
        ownerEmployeeLegacyId: "USER-001",
        originalFilename: "receipt.pdf",
        privacyClass: "MEDICAL_PRIVATE",
        migrationRuntimeAuthority:
          "LEGACY_DRIVE_REFERENCE_ONLY_UNTIL_R2_COPY_CHECKSUM_AND_AUTHORIZATION_RECONCILE",
        archiveAssociationRule:
          "CURRENT_REQUEST_ONLY_DO_NOT_INFER_ARCHIVE_HISTORY_BY_CLAIM_ID",
      },
    });
  });

  it("supports live MedicalAttachments header aliases and rejects archive attachment inference", () => {
    expect(
      medicalAttachmentTransformer.transform(
        attachment({
          FileName: null,
          UploadedBy: null,
          UploadedAt: null,
          Filename: "receipt.png",
          UserID: "USER-001",
          CreatedDate: "05/10/2026",
        }),
      ),
    ).toMatchObject({
      action: "IMPORT",
      payload: {
        originalFilename: "receipt.png",
        ownerEmployeeLegacyId: "USER-001",
        uploadedDate: "2026-10-05",
      },
    });

    expect(
      medicalAttachmentTransformer.transform(
        attachment({}, "2025"),
      ),
    ).toMatchObject({
      action: "REJECT",
      code: "MEDICAL_ATTACHMENT_INVALID_SOURCE",
    });
  });

  it("reconciles the M0 live Medical baseline without fabricating history", () => {
    const snapshot = {
      currentClaimCount: 18,
      currentClaimLegacyIds: Array.from(
        { length: 18 },
        (_, index) =>
          `MED-${String(index + 1).padStart(
            5,
            "0",
          )}`,
      ),
      currentStatusCounts: {
        APPROVED: 17,
        REJECTED: 1,
      },
      amountTotal: 18_000,
      linkedLeaveCount: 2,
      approvalStepCount: 28,
      approvalStepStatusCounts: {
        APPROVED: 26,
        REJECTED: 1,
        PENDING: 1,
      },
      attachmentCount: 21,
      orphanEmployeeCount: 0,
      orphanApprovalStepRequestCount: 0,
      missingOrInactiveApproverCount: 0,
      attachmentOrphanRequestCount: 0,
      attachmentOwnerMismatchCount: 0,
      amountParseFailureCount: 0,
      archiveClaimCount: 5,
      archiveCurrentCollisionCount: 5,
      ambiguousAttachmentHistoryCount: 1,
    };

    expect(
      countByStatus(
        reconcileMedicalModule(
          snapshot,
          snapshot,
        ),
      ),
    ).toEqual({
      PASS: 17,
      EXCEPTION: 0,
      FAIL: 0,
    });

    const disposition =
      medicalArchiveHistoryDisposition({
        archiveClaimCount: 5,
        ambiguousAttachmentHistoryCount: 1,
      });

    expect(disposition).toMatchObject({
      status: "EXCEPTION",
      exceptionCode:
        "ARCHIVE_APPROVAL_ATTACHMENT_HISTORY_INCOMPLETE",
      disposition:
        "DO_NOT_ATTACH_CURRENT_HISTORY_BY_LEGACY_ID_ALONE",
    });
  });

  it("makes actual Medical source/target drift blocking", () => {
    const source = {
      currentClaimCount: 18,
      currentClaimLegacyIds: [
        "MED-00001",
      ],
      currentStatusCounts: {
        APPROVED: 17,
        REJECTED: 1,
      },
      amountTotal: 1000,
      linkedLeaveCount: 2,
      approvalStepCount: 28,
      approvalStepStatusCounts: {
        APPROVED: 26,
        REJECTED: 1,
        PENDING: 1,
      },
      attachmentCount: 21,
      orphanEmployeeCount: 0,
      orphanApprovalStepRequestCount: 0,
      missingOrInactiveApproverCount: 0,
      attachmentOrphanRequestCount: 0,
      attachmentOwnerMismatchCount: 0,
      amountParseFailureCount: 0,
      archiveClaimCount: 5,
      archiveCurrentCollisionCount: 5,
      ambiguousAttachmentHistoryCount: 1,
    };

    const results = reconcileMedicalModule(
      source,
      {
        ...source,
        attachmentCount: 20,
      },
    );

    expect(countByStatus(results)).toEqual({
      PASS: 16,
      EXCEPTION: 0,
      FAIL: 1,
    });
    expect(
      results.find(
        (entry) =>
          entry.status === "FAIL",
      )?.disposition,
    ).toContain(
      "BLOCK_MEDICAL_ACCEPTANCE",
    );
  });
});
