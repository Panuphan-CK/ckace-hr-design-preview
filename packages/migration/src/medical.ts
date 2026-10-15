import {
  legacyProvenanceKey,
} from "@ckace/contracts";

import type {
  JsonValue,
  LegacyExtractedRecord,
  MigrationTransformer,
} from "./migration-contracts";
import {
  KNOWN_LEGACY_EXCEPTION,
} from "./known-legacy-exceptions";
import {
  mapLegacyRequestStatus,
  parseLegacyDateDdMmYyyy,
} from "./legacy-mappings";
import type { ReconciliationResult } from "./reconciliation";
import { canonicalJson } from "./source-snapshot";

const CURRENT_REQUEST_TAB = "MedicalClaims";
const ARCHIVE_REQUEST_TAB = "MedicalClaims_2025";
const APPROVAL_TAB = "Medical_ApprovalSteps";
const ATTACHMENT_TAB = "MedicalAttachments";

type LegacyValue = JsonValue | undefined;

function firstValue(
  record: LegacyExtractedRecord,
  keys: readonly string[],
): LegacyValue {
  for (const key of keys) {
    const value = record.values[key];

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function requiredString(
  record: LegacyExtractedRecord,
  keys: readonly string[],
): string {
  for (const key of keys) {
    const value = record.values[key];

    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  throw new Error(
    `Missing or invalid legacy ${keys[0]}`,
  );
}

function optionalString(
  record: LegacyExtractedRecord,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = record.values[key];

    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  return null;
}

function numericValue(
  record: LegacyExtractedRecord,
  keys: readonly string[],
): number {
  const value = firstValue(record, keys);
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value.trim())
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    throw new Error(
      `Invalid numeric legacy ${keys[0]}`,
    );
  }

  return parsed;
}

function integerValue(
  record: LegacyExtractedRecord,
  keys: readonly string[],
): number {
  const value = numericValue(record, keys);

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(
      `Invalid integer legacy ${keys[0]}`,
    );
  }

  return value;
}

function parseLegacyDateValue(
  value: string,
  key: string,
): string {
  const trimmed = value.trim();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return parseLegacyDateDdMmYyyy(trimmed);
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
    trimmed,
  );

  if (!iso) {
    throw new Error(
      `Invalid legacy ${key} date`,
    );
  }

  const year = Number(iso[1]);
  const month = Number(iso[2]);
  const day = Number(iso[3]);
  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(
      `Invalid legacy ${key} date`,
    );
  }

  return trimmed;
}

function requiredDate(
  record: LegacyExtractedRecord,
  keys: readonly string[],
): string {
  return parseLegacyDateValue(
    requiredString(record, keys),
    keys[0] ?? "date",
  );
}

function optionalDate(
  record: LegacyExtractedRecord,
  keys: readonly string[],
): string | null {
  const value = optionalString(record, keys);

  return value
    ? parseLegacyDateValue(
        value,
        keys[0] ?? "date",
      )
    : null;
}

function medicalRequestStatus(
  rawStatus: string,
):
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED" {
  const mapped = mapLegacyRequestStatus(rawStatus);

  if (mapped === "REVISION_REQUESTED") {
    throw new Error(
      "Medical request status REVISION_REQUESTED is unsupported",
    );
  }

  return mapped;
}

function medicalApprovalStepStatus(
  rawStatus: string,
):
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED" {
  const mapped = mapLegacyRequestStatus(rawStatus);

  return mapped === "REVISION_REQUESTED"
    ? "PENDING"
    : mapped;
}

function requestProvenanceKey(input: {
  readonly record: LegacyExtractedRecord;
  readonly sourceTab: string;
  readonly sourcePeriod: string | null;
  readonly legacyId: string;
}): string {
  return legacyProvenanceKey({
    sourceSystem:
      input.record.provenance.sourceSystem,
    sourceWorkbook:
      input.record.provenance.sourceWorkbook,
    sourceTab: input.sourceTab,
    sourcePeriod: input.sourcePeriod,
    legacyId: input.legacyId,
  });
}

function rejection(
  code: string,
  error: unknown,
): {
  readonly action: "REJECT";
  readonly code: string;
  readonly reason: string;
} {
  return {
    action: "REJECT",
    code,
    reason:
      error instanceof Error
        ? error.message
        : "Invalid legacy source",
  };
}

export const medicalClaimTransformer: MigrationTransformer = {
  version: "medical-claim-v1",
  transform(record) {
    try {
      if (
        record.provenance.sourceTab !==
          CURRENT_REQUEST_TAB &&
        record.provenance.sourceTab !==
          ARCHIVE_REQUEST_TAB
      ) {
        throw new Error(
          "Medical claim transformer accepts only current/archive MedicalClaims",
        );
      }

      const claimId = requiredString(record, [
        "ClaimID",
      ]);

      if (
        claimId !==
        record.provenance.legacyId
      ) {
        throw new Error(
          "Medical ClaimID does not match source-qualified provenance",
        );
      }

      const amount = numericValue(record, [
        "Amount",
      ]);

      if (
        amount <= 0 ||
        Math.abs(
          amount * 100 -
            Math.round(amount * 100),
        ) >
          Number.EPSILON *
            Math.max(100, Math.abs(amount * 100))
      ) {
        throw new Error(
          "Legacy medical Amount must be positive with at most 2 decimals",
        );
      }

      const rawStatus = requiredString(
        record,
        ["Status"],
      );
      const isArchive =
        record.provenance.sourceTab ===
        ARCHIVE_REQUEST_TAB;
      const sourcePeriod =
        record.provenance.sourcePeriod ??
        (isArchive ? "2025" : "CURRENT");

      return {
        action: "IMPORT",
        targetEntityType: "medical_claim",
        payload: {
          legacyClaimId: claimId,
          legacySourceRef:
            requestProvenanceKey({
              record,
              sourceTab:
                record.provenance.sourceTab,
              sourcePeriod,
              legacyId: claimId,
            }),
          sourcePeriod,
          archiveHistoryEvidence: isArchive
            ? "APPROVAL_AND_ATTACHMENT_HISTORY_MAY_BE_INCOMPLETE_OR_AMBIGUOUS"
            : "CURRENT_REQUEST_HISTORY_ONLY",
          employeeLegacyId: requiredString(
            record,
            ["UserID"],
          ),
          linkedLeaveLegacyId:
            optionalString(record, [
              "LeaveID",
              "Linked_LeaveID",
            ]),
          claimDate: requiredDate(record, [
            "ClaimDate",
          ]),
          sicknessDate: requiredDate(
            record,
            ["SicknessDate"],
          ),
          amount,
          description:
            optionalString(record, [
              "Description",
            ]) ?? "",
          rawStatus,
          status:
            medicalRequestStatus(rawStatus),
          currentStepOrder: integerValue(
            record,
            ["CurrentStep", "currentStep"],
          ),
          decisionReason:
            optionalString(record, [
              "RejectedReason",
              "comment",
              "Comment",
            ]),
          updatedDate: requiredDate(record, [
            "UpdatedDate",
            "UpdatedAt",
          ]),
          legacyRaw: record.values,
        } satisfies JsonValue,
      };
    } catch (error) {
      return rejection(
        "MEDICAL_CLAIM_INVALID_SOURCE",
        error,
      );
    }
  },
};

export const medicalApprovalStepTransformer: MigrationTransformer = {
  version: "medical-approval-step-v1",
  transform(record) {
    try {
      if (
        record.provenance.sourceTab !==
          APPROVAL_TAB ||
        record.provenance.sourcePeriod !==
          "CURRENT"
      ) {
        throw new Error(
          "Medical approval transformer only accepts current Medical_ApprovalSteps",
        );
      }

      const stepId = requiredString(record, [
        "step_id",
        "stepId",
      ]);
      const requestId = requiredString(record, [
        "request_id",
        "requestId",
      ]);

      if (
        stepId !==
        record.provenance.legacyId
      ) {
        throw new Error(
          "Medical step ID does not match source-qualified provenance",
        );
      }

      const rawStatus = requiredString(
        record,
        ["status", "Status"],
      );
      const normalizedStatus =
        medicalApprovalStepStatus(rawStatus);

      return {
        action: "IMPORT",
        targetEntityType:
          "medical_approval_step",
        payload: {
          legacyStepId: stepId,
          legacyClaimId: requestId,
          currentRequestProvenanceKey:
            requestProvenanceKey({
              record,
              sourceTab:
                CURRENT_REQUEST_TAB,
              sourcePeriod: "CURRENT",
              legacyId: requestId,
            }),
          stepOrder: integerValue(record, [
            "step",
            "stepOrder",
          ]),
          approverLegacyId: requiredString(
            record,
            ["approver_id", "approverId"],
          ),
          assignedDate: requiredDate(
            record,
            ["createdDate", "assignedAt"],
          ),
          approvedDate: optionalDate(
            record,
            ["approvedDate", "approvedAt"],
          ),
          rawStatus,
          normalizedStatus,
          status: normalizedStatus,
          comment: optionalString(record, [
            "comment",
            "Comment",
          ]),
          legacyRaw: record.values,
        } satisfies JsonValue,
      };
    } catch (error) {
      return rejection(
        "MEDICAL_APPROVAL_INVALID_SOURCE",
        error,
      );
    }
  },
};

export const medicalAttachmentTransformer: MigrationTransformer = {
  version: "medical-attachment-v1",
  transform(record) {
    try {
      if (
        record.provenance.sourceTab !==
          ATTACHMENT_TAB ||
        record.provenance.sourcePeriod !==
          "CURRENT"
      ) {
        throw new Error(
          "Medical attachment transformer only accepts current MedicalAttachments",
        );
      }

      const fileId = requiredString(record, [
        "FileID",
      ]);
      const claimId = requiredString(record, [
        "ClaimID",
        "RequestID",
      ]);

      if (
        fileId !==
        record.provenance.legacyId
      ) {
        throw new Error(
          "Medical FileID does not match source-qualified provenance",
        );
      }

      return {
        action: "IMPORT",
        targetEntityType:
          "medical_attachment_reference",
        payload: {
          legacyFileId: fileId,
          legacyClaimId: claimId,
          currentRequestProvenanceKey:
            requestProvenanceKey({
              record,
              sourceTab:
                CURRENT_REQUEST_TAB,
              sourcePeriod: "CURRENT",
              legacyId: claimId,
            }),
          ownerEmployeeLegacyId:
            requiredString(record, [
              "UploadedBy",
              "UserID",
            ]),
          originalFilename: requiredString(
            record,
            ["FileName", "Filename"],
          ),
          uploadedDate: requiredDate(record, [
            "UploadedAt",
            "CreatedDate",
          ]),
          privacyClass: "MEDICAL_PRIVATE",
          migrationRuntimeAuthority:
            "LEGACY_DRIVE_REFERENCE_ONLY_UNTIL_R2_COPY_CHECKSUM_AND_AUTHORIZATION_RECONCILE",
          legacyDriveUrl:
            requiredString(record, [
              "FileURL",
            ]),
          archiveAssociationRule:
            "CURRENT_REQUEST_ONLY_DO_NOT_INFER_ARCHIVE_HISTORY_BY_CLAIM_ID",
          legacyRaw: record.values,
        } satisfies JsonValue,
      };
    } catch (error) {
      return rejection(
        "MEDICAL_ATTACHMENT_INVALID_SOURCE",
        error,
      );
    }
  },
};

export interface MedicalReconciliationSnapshot {
  readonly currentClaimCount: number;
  readonly currentClaimLegacyIds:
    readonly string[];
  readonly currentStatusCounts:
    Readonly<Record<string, number>>;
  readonly amountTotal: number;
  readonly linkedLeaveCount: number;
  readonly approvalStepCount: number;
  readonly approvalStepStatusCounts:
    Readonly<Record<string, number>>;
  readonly attachmentCount: number;
  readonly orphanEmployeeCount: number;
  readonly orphanApprovalStepRequestCount: number;
  readonly missingOrInactiveApproverCount: number;
  readonly attachmentOrphanRequestCount: number;
  readonly attachmentOwnerMismatchCount: number;
  readonly amountParseFailureCount: number;
  readonly archiveClaimCount: number;
  readonly archiveCurrentCollisionCount: number;
  readonly ambiguousAttachmentHistoryCount: number;
}

function result(input: {
  readonly checkName: string;
  readonly sourceValue: string;
  readonly targetValue: string;
  readonly code: string;
}): ReconciliationResult {
  if (
    input.sourceValue ===
    input.targetValue
  ) {
    return {
      entityType: "medical",
      checkName: input.checkName,
      status: "PASS",
      sourceValue: input.sourceValue,
      targetValue: input.targetValue,
      exceptionCode: null,
      disposition: null,
    };
  }

  return {
    entityType: "medical",
    checkName: input.checkName,
    status: "FAIL",
    sourceValue: input.sourceValue,
    targetValue: input.targetValue,
    exceptionCode: input.code,
    disposition:
      "BLOCK_MEDICAL_ACCEPTANCE_UNTIL_SOURCE_AND_TARGET_RECONCILE",
  };
}

export function reconcileMedicalModule(
  source: MedicalReconciliationSnapshot,
  target: MedicalReconciliationSnapshot,
): readonly ReconciliationResult[] {
  return [
    result({
      checkName: "current_claim_count",
      sourceValue: String(
        source.currentClaimCount,
      ),
      targetValue: String(
        target.currentClaimCount,
      ),
      code:
        "MEDICAL_CURRENT_CLAIM_COUNT_MISMATCH",
    }),
    result({
      checkName:
        "current_claim_legacy_id_set",
      sourceValue: canonicalJson(
        [...source.currentClaimLegacyIds].sort(),
      ),
      targetValue: canonicalJson(
        [...target.currentClaimLegacyIds].sort(),
      ),
      code:
        "MEDICAL_CURRENT_CLAIM_ID_SET_MISMATCH",
    }),
    result({
      checkName:
        "current_claim_status_counts",
      sourceValue: canonicalJson(
        source.currentStatusCounts,
      ),
      targetValue: canonicalJson(
        target.currentStatusCounts,
      ),
      code:
        "MEDICAL_STATUS_COUNT_MISMATCH",
    }),
    result({
      checkName: "amount_total",
      sourceValue: String(
        source.amountTotal,
      ),
      targetValue: String(
        target.amountTotal,
      ),
      code:
        "MEDICAL_AMOUNT_TOTAL_MISMATCH",
    }),
    result({
      checkName: "linked_leave_count",
      sourceValue: String(
        source.linkedLeaveCount,
      ),
      targetValue: String(
        target.linkedLeaveCount,
      ),
      code:
        "MEDICAL_LINKED_LEAVE_COUNT_MISMATCH",
    }),
    result({
      checkName: "approval_step_count",
      sourceValue: String(
        source.approvalStepCount,
      ),
      targetValue: String(
        target.approvalStepCount,
      ),
      code:
        "MEDICAL_APPROVAL_STEP_COUNT_MISMATCH",
    }),
    result({
      checkName:
        "approval_step_status_counts",
      sourceValue: canonicalJson(
        source.approvalStepStatusCounts,
      ),
      targetValue: canonicalJson(
        target.approvalStepStatusCounts,
      ),
      code:
        "MEDICAL_APPROVAL_STEP_STATUS_MISMATCH",
    }),
    result({
      checkName: "attachment_count",
      sourceValue: String(
        source.attachmentCount,
      ),
      targetValue: String(
        target.attachmentCount,
      ),
      code:
        "MEDICAL_ATTACHMENT_COUNT_MISMATCH",
    }),
    result({
      checkName: "orphan_employee_count",
      sourceValue: String(
        source.orphanEmployeeCount,
      ),
      targetValue: String(
        target.orphanEmployeeCount,
      ),
      code:
        "MEDICAL_ORPHAN_EMPLOYEE_MISMATCH",
    }),
    result({
      checkName:
        "orphan_approval_step_request_count",
      sourceValue: String(
        source.orphanApprovalStepRequestCount,
      ),
      targetValue: String(
        target.orphanApprovalStepRequestCount,
      ),
      code:
        "MEDICAL_ORPHAN_APPROVAL_REQUEST_MISMATCH",
    }),
    result({
      checkName:
        "missing_or_inactive_approver_count",
      sourceValue: String(
        source.missingOrInactiveApproverCount,
      ),
      targetValue: String(
        target.missingOrInactiveApproverCount,
      ),
      code:
        "MEDICAL_MISSING_APPROVER_MISMATCH",
    }),
    result({
      checkName:
        "attachment_orphan_request_count",
      sourceValue: String(
        source.attachmentOrphanRequestCount,
      ),
      targetValue: String(
        target.attachmentOrphanRequestCount,
      ),
      code:
        "MEDICAL_ATTACHMENT_ORPHAN_REQUEST_MISMATCH",
    }),
    result({
      checkName:
        "attachment_owner_mismatch_count",
      sourceValue: String(
        source.attachmentOwnerMismatchCount,
      ),
      targetValue: String(
        target.attachmentOwnerMismatchCount,
      ),
      code:
        "MEDICAL_ATTACHMENT_OWNER_MISMATCH",
    }),
    result({
      checkName:
        "amount_parse_failure_count",
      sourceValue: String(
        source.amountParseFailureCount,
      ),
      targetValue: String(
        target.amountParseFailureCount,
      ),
      code:
        "MEDICAL_AMOUNT_PARSE_FAILURE_MISMATCH",
    }),
    result({
      checkName: "archive_claim_count",
      sourceValue: String(
        source.archiveClaimCount,
      ),
      targetValue: String(
        target.archiveClaimCount,
      ),
      code:
        "MEDICAL_ARCHIVE_CLAIM_COUNT_MISMATCH",
    }),
    result({
      checkName:
        "archive_current_collision_count",
      sourceValue: String(
        source.archiveCurrentCollisionCount,
      ),
      targetValue: String(
        target.archiveCurrentCollisionCount,
      ),
      code:
        "MEDICAL_ARCHIVE_COLLISION_COUNT_MISMATCH",
    }),
    result({
      checkName:
        "ambiguous_attachment_history_count",
      sourceValue: String(
        source.ambiguousAttachmentHistoryCount,
      ),
      targetValue: String(
        target.ambiguousAttachmentHistoryCount,
      ),
      code:
        "MEDICAL_AMBIGUOUS_ATTACHMENT_HISTORY_MISMATCH",
    }),
  ];
}

export function medicalArchiveHistoryDisposition(input: {
  readonly archiveClaimCount: number;
  readonly ambiguousAttachmentHistoryCount: number;
}): ReconciliationResult {
  if (
    input.archiveClaimCount === 0 &&
    input.ambiguousAttachmentHistoryCount === 0
  ) {
    return {
      entityType: "medical",
      checkName:
        "archive_approval_attachment_history",
      status: "PASS",
      sourceValue: "0",
      targetValue: "0",
      exceptionCode: null,
      disposition: null,
    };
  }

  return {
    entityType: "medical",
    checkName:
      "archive_approval_attachment_history",
    status: "EXCEPTION",
    sourceValue: canonicalJson({
      archiveClaimCount:
        input.archiveClaimCount,
      ambiguousAttachmentHistoryCount:
        input.ambiguousAttachmentHistoryCount,
    }),
    targetValue:
      "UNAVAILABLE_OR_AMBIGUOUS_IN_OBSERVED_ARCHIVE",
    exceptionCode:
      KNOWN_LEGACY_EXCEPTION
        .ARCHIVE_HISTORY_INCOMPLETE.code,
    disposition:
      KNOWN_LEGACY_EXCEPTION
        .ARCHIVE_HISTORY_INCOMPLETE.disposition,
  };
}
