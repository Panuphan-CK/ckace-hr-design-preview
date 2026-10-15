import {
  legacyProvenanceKey,
} from "@ckace/contracts";

import type {
  JsonValue,
  LegacyExtractedRecord,
  MigrationTransformer,
} from "./migration-contracts";
import {
  mapLegacyLeaveDuration,
  mapLegacyLeaveType,
  mapLegacyRequestStatus,
  parseLegacyDateDdMmYyyy,
} from "./legacy-mappings";
import type { ReconciliationResult } from "./reconciliation";
import { canonicalJson } from "./source-snapshot";

function requiredString(
  record: LegacyExtractedRecord,
  key: string,
): string {
  const value = record.values[key];

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing or invalid legacy ${key}`);
  }

  return value.trim();
}

function requiredAliasedString(
  record: LegacyExtractedRecord,
  keys: readonly string[],
): string {
  for (const key of keys) {
    const value = record.values[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  throw new Error(
    `Missing or invalid legacy ${keys.join("/")}`,
  );
}

function optionalString(
  record: LegacyExtractedRecord,
  key: string,
): string | null {
  const value = record.values[key];

  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`Invalid legacy ${key}`);
  }

  return value.trim() || null;
}

function numericValue(
  record: LegacyExtractedRecord,
  key: string,
): number {
  const raw = record.values[key];
  const parsed =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number(raw.trim())
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric legacy ${key}`);
  }

  return parsed;
}

function integerValue(
  record: LegacyExtractedRecord,
  key: string,
): number {
  const value = numericValue(record, key);

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid integer legacy ${key}`);
  }

  return value;
}

function mapLegacyApprovalStepStatus(
  legacyStatus: string,
): "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" {
  const status = mapLegacyRequestStatus(legacyStatus);

  return status === "REVISION_REQUESTED"
    ? "PENDING"
    : status;
}

function requestSourceRef(record: LegacyExtractedRecord): string {
  return legacyProvenanceKey({
    sourceSystem: record.provenance.sourceSystem,
    sourceWorkbook: record.provenance.sourceWorkbook,
    sourceTab:
      record.provenance.sourceTab === "LeaveRequests_2025"
        ? "LeaveRequests_2025"
        : "LeaveRequests",
    sourcePeriod: record.provenance.sourcePeriod,
    legacyId: record.provenance.legacyId,
  });
}

export const leaveEntitlementTransformer: MigrationTransformer = {
  version: "leave-entitlement-v1",
  transform(record) {
    try {
      if (record.provenance.sourceTab !== "UserPolicies") {
        throw new Error(
          "Leave entitlement transformer only accepts UserPolicies",
        );
      }

      const policyId = requiredString(record, "PolicyID");
      const employeeLegacyId = requiredString(record, "UserID");
      const leaveTypeKey = mapLegacyLeaveType(
        requiredString(record, "LeaveType"),
      );
      const quota = numericValue(record, "LeaveQuota");

      if (quota < 0) {
        throw new Error("Legacy leave quota cannot be negative");
      }

      return {
        action: "IMPORT",
        targetEntityType: "leave_entitlement",
        payload: {
          legacyPolicyId: policyId,
          employeeLegacyId,
          leaveTypeKey,
          quota,
        } satisfies JsonValue,
      };
    } catch (error) {
      return {
        action: "REJECT",
        code: "LEAVE_ENTITLEMENT_INVALID_SOURCE",
        reason:
          error instanceof Error
            ? error.message
            : "Invalid leave entitlement source",
      };
    }
  },
};

export const leaveRequestTransformer: MigrationTransformer = {
  version: "leave-request-v1",
  transform(record) {
    try {
      if (
        record.provenance.sourceTab !== "LeaveRequests" &&
        record.provenance.sourceTab !== "LeaveRequests_2025"
      ) {
        throw new Error(
          "Leave request transformer accepts only current/archive LeaveRequests",
        );
      }

      const leaveId = requiredString(record, "leave_id");

      if (leaveId !== record.provenance.legacyId) {
        throw new Error(
          "Leave ID does not match source-qualified provenance",
        );
      }

      const duration = mapLegacyLeaveDuration(
        requiredString(record, "leaveDuration"),
      );
      const startTime = optionalString(record, "startTime");
      const endTime = optionalString(record, "endTime");

      if (
        duration === "HOURLY" &&
        (!startTime || !endTime)
      ) {
        throw new Error(
          "Legacy hourly leave is missing start/end time",
        );
      }

      return {
        action: "IMPORT",
        targetEntityType: "leave_request",
        payload: {
          legacyLeaveId: leaveId,
          legacySourceRef: requestSourceRef(record),
          employeeLegacyId: requiredString(record, "userId"),
          legacyPolicyId: optionalString(record, "PolicyID"),
          leaveTypeKey: mapLegacyLeaveType(
            requiredString(record, "leaveType"),
          ),
          description:
            optionalString(record, "description") ?? "",
          startDate: parseLegacyDateDdMmYyyy(
            requiredString(record, "startDate"),
          ),
          endDate: parseLegacyDateDdMmYyyy(
            requiredString(record, "endDate"),
          ),
          status: mapLegacyRequestStatus(
            requiredString(record, "status"),
          ),
          currentStepOrder: integerValue(
            record,
            "currentStep",
          ),
          decisionReason:
            optionalString(record, "rejectedReason"),
          submittedDate: parseLegacyDateDdMmYyyy(
            requiredString(record, "submitDate"),
          ),
          updatedDate: parseLegacyDateDdMmYyyy(
            requiredString(record, "updatedDate"),
          ),
          durationCode: duration,
          startTime,
          endTime,
        } satisfies JsonValue,
      };
    } catch (error) {
      return {
        action: "REJECT",
        code: "LEAVE_REQUEST_INVALID_SOURCE",
        reason:
          error instanceof Error
            ? error.message
            : "Invalid leave request source",
      };
    }
  },
};

export const leaveApprovalStepTransformer: MigrationTransformer = {
  version: "leave-approval-step-v1",
  transform(record) {
    try {
      if (record.provenance.sourceTab !== "ApprovalSteps") {
        throw new Error(
          "Leave approval transformer only accepts current ApprovalSteps",
        );
      }

      const stepId = requiredString(record, "stepId");
      const requestId = requiredString(record, "requestId");

      return {
        action: "IMPORT",
        targetEntityType: "leave_approval_step",
        payload: {
          legacyStepId: stepId,
          currentRequestProvenanceKey: legacyProvenanceKey({
            sourceSystem: record.provenance.sourceSystem,
            sourceWorkbook: record.provenance.sourceWorkbook,
            sourceTab: "LeaveRequests",
            sourcePeriod: "CURRENT",
            legacyId: requestId,
          }),
          stepOrder: integerValue(record, "stepOrder"),
          approverLegacyId: requiredString(
            record,
            "approverId",
          ),
          assignedDate: parseLegacyDateDdMmYyyy(
            requiredString(record, "assignedAt"),
          ),
          approvedDate: optionalString(record, "approvedAt")
            ? parseLegacyDateDdMmYyyy(
                requiredString(record, "approvedAt"),
              )
            : null,
          rawStatus: requiredString(record, "status"),
          normalizedStatus: mapLegacyApprovalStepStatus(
            requiredString(record, "status"),
          ),
          comment: optionalString(record, "comment"),
        } satisfies JsonValue,
      };
    } catch (error) {
      return {
        action: "REJECT",
        code: "LEAVE_APPROVAL_INVALID_SOURCE",
        reason:
          error instanceof Error
            ? error.message
            : "Invalid leave approval source",
      };
    }
  },
};

export const leaveAttachmentTransformer: MigrationTransformer = {
  version: "leave-attachment-v1",
  transform(record) {
    try {
      if (
        record.provenance.sourceTab !== "Attachments" ||
        record.provenance.sourcePeriod !== "CURRENT"
      ) {
        throw new Error(
          "Leave attachment transformer only accepts current Attachments",
        );
      }

      const fileId = requiredAliasedString(record, [
        "FileID",
        "fileId",
        "file_id",
      ]);
      const leaveId = requiredAliasedString(record, [
        "LeaveID",
        "leaveId",
        "leave_id",
        "RequestID",
        "requestId",
      ]);

      const exactProvenance =
        fileId === record.provenance.legacyId;
      const rowQualifiedProvenance =
        record.provenance.legacyId ===
        `${fileId}::ROW:${record.rowNumber}`;

      if (!exactProvenance && !rowQualifiedProvenance) {
        throw new Error(
          "Leave attachment FileID does not match source-qualified provenance",
        );
      }

      return {
        action: "IMPORT",
        targetEntityType: "leave_attachment_reference",
        payload: {
          legacyFileId: fileId,
          legacyLeaveId: leaveId,
          currentRequestProvenanceKey: legacyProvenanceKey({
            sourceSystem: record.provenance.sourceSystem,
            sourceWorkbook: record.provenance.sourceWorkbook,
            sourceTab: "LeaveRequests",
            sourcePeriod: "CURRENT",
            legacyId: leaveId,
          }),
          ownerEmployeeLegacyId: requiredAliasedString(record, [
            "UserID",
            "userId",
            "user_id",
          ]),
          createdDate: parseLegacyDateDdMmYyyy(
            requiredAliasedString(record, [
              "CreatedDate",
              "createdDate",
              "created_date",
            ]),
          ),
          privacyClass: "EMPLOYEE_PRIVATE",
          migrationRuntimeAuthority:
            "LEGACY_DRIVE_REFERENCE_ONLY_UNTIL_R2_COPY_CHECKSUM_AND_AUTHORIZATION_RECONCILE",
          legacyDriveUrl: requiredAliasedString(record, [
            "FileURL",
            "fileUrl",
            "file_url",
          ]),
          archiveAssociationRule:
            "CURRENT_REQUEST_ONLY_DO_NOT_INFER_ARCHIVE_HISTORY_BY_LEAVE_ID",
        } satisfies JsonValue,
      };
    } catch (error) {
      return {
        action: "REJECT",
        code: "LEAVE_ATTACHMENT_INVALID_SOURCE",
        reason:
          error instanceof Error
            ? error.message
            : "Invalid leave attachment source",
      };
    }
  },
};

export interface LeaveReconciliationSnapshot {
  readonly requestCount: number;
  readonly statusCounts: Readonly<Record<string, number>>;
  readonly typeCounts: Readonly<Record<string, number>>;
  readonly durationCounts: Readonly<Record<string, number>>;
  readonly entitlementCount: number;
  readonly quotaTotal: number;
  readonly attachmentCount: number;
}

function result(input: {
  readonly checkName: string;
  readonly sourceValue: string;
  readonly targetValue: string;
  readonly code: string;
}): ReconciliationResult {
  if (input.sourceValue === input.targetValue) {
    return {
      entityType: "leave",
      checkName: input.checkName,
      status: "PASS",
      sourceValue: input.sourceValue,
      targetValue: input.targetValue,
      exceptionCode: null,
      disposition: null,
    };
  }

  return {
    entityType: "leave",
    checkName: input.checkName,
    status: "FAIL",
    sourceValue: input.sourceValue,
    targetValue: input.targetValue,
    exceptionCode: input.code,
    disposition:
      "BLOCK_LEAVE_ACCEPTANCE_UNTIL_SOURCE_AND_TARGET_RECONCILE",
  };
}

export function reconcileLeaveModule(
  source: LeaveReconciliationSnapshot,
  target: LeaveReconciliationSnapshot,
): readonly ReconciliationResult[] {
  return [
    result({
      checkName: "request_count",
      sourceValue: String(source.requestCount),
      targetValue: String(target.requestCount),
      code: "LEAVE_REQUEST_COUNT_MISMATCH",
    }),
    result({
      checkName: "request_status_counts",
      sourceValue: canonicalJson(source.statusCounts),
      targetValue: canonicalJson(target.statusCounts),
      code: "LEAVE_STATUS_COUNT_MISMATCH",
    }),
    result({
      checkName: "leave_type_counts",
      sourceValue: canonicalJson(source.typeCounts),
      targetValue: canonicalJson(target.typeCounts),
      code: "LEAVE_TYPE_COUNT_MISMATCH",
    }),
    result({
      checkName: "duration_counts",
      sourceValue: canonicalJson(source.durationCounts),
      targetValue: canonicalJson(target.durationCounts),
      code: "LEAVE_DURATION_COUNT_MISMATCH",
    }),
    result({
      checkName: "entitlement_count",
      sourceValue: String(source.entitlementCount),
      targetValue: String(target.entitlementCount),
      code: "LEAVE_ENTITLEMENT_COUNT_MISMATCH",
    }),
    result({
      checkName: "quota_total",
      sourceValue: String(source.quotaTotal),
      targetValue: String(target.quotaTotal),
      code: "LEAVE_QUOTA_TOTAL_MISMATCH",
    }),
    result({
      checkName: "attachment_count",
      sourceValue: String(source.attachmentCount),
      targetValue: String(target.attachmentCount),
      code: "LEAVE_ATTACHMENT_COUNT_MISMATCH",
    }),
  ];
}

export function archiveApprovalHistoryDisposition(
  archiveRequestCount: number,
): ReconciliationResult {
  if (archiveRequestCount === 0) {
    return {
      entityType: "leave",
      checkName: "archive_approval_history",
      status: "PASS",
      sourceValue: "0",
      targetValue: "0",
      exceptionCode: null,
      disposition: null,
    };
  }

  return {
    entityType: "leave",
    checkName: "archive_approval_history",
    status: "EXCEPTION",
    sourceValue: String(archiveRequestCount),
    targetValue: "UNAVAILABLE_IN_OBSERVED_ARCHIVE",
    exceptionCode:
      "LEGACY_ARCHIVE_APPROVAL_HISTORY_INCOMPLETE",
    disposition:
      "PRESERVE_ARCHIVE_REQUESTS_WITH_SOURCE_QUALIFIED_PROVENANCE_AND_DO_NOT_ATTACH_CURRENT_STEPS_BY_LEGACY_ID",
  };
}
