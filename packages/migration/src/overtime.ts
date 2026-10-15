import {
  legacyProvenanceKey,
} from "@ckace/contracts";
import {
  normalizeOvertimeClock,
} from "@ckace/business-rules";

import type {
  JsonValue,
  LegacyExtractedRecord,
  MigrationTransformer,
} from "./migration-contracts";
import { parseLegacyDateDdMmYyyy } from "./legacy-mappings";
import type { ReconciliationResult } from "./reconciliation";
import { canonicalJson } from "./source-snapshot";

const OVERTIME_REQUEST_TAB = "OvertimeRequests";
const OVERTIME_STEP_TAB = "OT_ApprovalSteps";

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
  const value = firstValue(record, keys);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing or invalid legacy ${keys[0]}`);
  }

  return value.trim();
}

function optionalString(
  record: LegacyExtractedRecord,
  keys: readonly string[],
): string | null {
  const value = firstValue(record, keys);

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`Invalid legacy ${keys[0]}`);
  }

  return value.trim() || null;
}

function rawValue(
  record: LegacyExtractedRecord,
  keys: readonly string[],
): JsonValue | null {
  return firstValue(record, keys) ?? null;
}

function parseLegacyDateValue(
  value: string,
  key: string,
): string {
  const trimmed = value.trim();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return parseLegacyDateDdMmYyyy(trimmed);
  }

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
    trimmed,
  );

  if (!isoMatch) {
    throw new Error(`Invalid legacy ${key} date`);
  }

  const year = Number(isoMatch[1]);
  const month = Number(isoMatch[2]);
  const day = Number(isoMatch[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid legacy ${key} date`);
  }

  return trimmed;
}

function requiredDate(
  record: LegacyExtractedRecord,
  keys: readonly string[],
): string {
  const value = requiredString(record, keys);
  return parseLegacyDateValue(value, keys[0] ?? "date");
}

function requiredClock(
  record: LegacyExtractedRecord,
  keys: readonly string[],
): string {
  const value = requiredString(record, keys);

  try {
    return normalizeOvertimeClock(value);
  } catch (error) {
    throw new Error(
      `${keys[0]} is invalid: ${
        error instanceof Error ? error.message : "invalid time"
      }`,
    );
  }
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
    throw new Error(`Invalid numeric legacy ${keys[0]}`);
  }

  return parsed;
}

function nonnegativeNumber(
  record: LegacyExtractedRecord,
  keys: readonly string[],
): number {
  const value = numericValue(record, keys);

  if (value < 0) {
    throw new Error(`Legacy ${keys[0]} cannot be negative`);
  }

  return value;
}

function integerValue(
  record: LegacyExtractedRecord,
  keys: readonly string[],
): number {
  const value = numericValue(record, keys);

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid integer legacy ${keys[0]}`);
  }

  return value;
}

function requestStatus(
  legacyStatus: string,
): "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" {
  const normalized = legacyStatus.trim().toUpperCase();

  switch (normalized) {
    case "PENDING":
    case "รออนุมัติ":
      return "PENDING";
    case "APPROVED":
    case "อนุมัติ":
      return "APPROVED";
    case "REJECTED":
    case "ไม่อนุมัติ":
      return "REJECTED";
    case "CANCELLED":
    case "CANCELED":
    case "ยกเลิก":
      return "CANCELLED";
    default:
      throw new Error(
        `Unknown legacy overtime request status: ${legacyStatus}`,
      );
  }
}

function approvalStepStatus(
  legacyStatus: string,
):
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SKIPPED"
  | "CANCELLED" {
  const normalized = legacyStatus.trim().toUpperCase();

  switch (normalized) {
    case "PENDING":
    case "REVISE":
    case "REVISION_REQUESTED":
    case "รออนุมัติ":
      return "PENDING";
    case "APPROVED":
    case "อนุมัติ":
      return "APPROVED";
    case "REJECTED":
    case "ไม่อนุมัติ":
      return "REJECTED";
    case "SKIPPED":
      return "SKIPPED";
    case "CANCELLED":
    case "CANCELED":
    case "ยกเลิก":
      return "CANCELLED";
    default:
      throw new Error(
        `Unknown legacy overtime approval status: ${legacyStatus}`,
      );
  }
}

function requestSourceRef(
  record: LegacyExtractedRecord,
  legacyId: string,
): string {
  return legacyProvenanceKey({
    sourceSystem: record.provenance.sourceSystem,
    sourceWorkbook: record.provenance.sourceWorkbook,
    sourceTab: OVERTIME_REQUEST_TAB,
    sourcePeriod: record.provenance.sourcePeriod,
    legacyId,
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
      error instanceof Error ? error.message : "Invalid legacy source",
  };
}

export const overtimeRequestTransformer: MigrationTransformer = {
  version: "overtime-request-v1",
  transform(record) {
    try {
      if (record.provenance.sourceTab !== OVERTIME_REQUEST_TAB) {
        throw new Error(
          "Overtime request transformer only accepts OvertimeRequests",
        );
      }

      const requestId = requiredString(record, ["RequestID"]);

      if (requestId !== record.provenance.legacyId) {
        throw new Error(
          "Overtime RequestID does not match source-qualified provenance",
        );
      }

      const startDate = requiredDate(record, [
        "Start_date",
        "StartDate",
      ]);
      const endDate = requiredDate(record, [
        "End_date",
        "EndDate",
      ]);

      if (startDate !== endDate) {
        throw new Error(
          "Legacy overtime row must represent one calendar day",
        );
      }

      const rawStatus = requiredString(record, ["Status"]);
      const rawTotalHours = rawValue(record, [
        "TotalHours",
        "Hours",
      ]);
      const totalHours = numericValue(record, [
        "TotalHours",
        "Hours",
      ]);
      const requestedMinutes = Math.round(totalHours * 60);

      if (requestedMinutes <= 0) {
        throw new Error(
          "Legacy overtime TotalHours must convert to positive minutes",
        );
      }

      const comment = optionalString(record, [
        "comment",
        "Comment",
        "rejected",
        "Rejected",
        "rejectedReason",
      ]);
      const currentStep = integerValue(record, [
        "currentStep",
        "CurrentStep",
      ]);
      const totalDays = nonnegativeNumber(record, [
        "total_days",
        "Days",
      ]);
      const updatedDate = requiredDate(record, [
        "UpdatedDate",
        "UpdatedAt",
      ]);
      const requestDate = requiredDate(record, [
        "RequestDate",
      ]);
      const startTime = requiredClock(record, ["StartTime"]);
      const endTime = requiredClock(record, ["EndTime"]);

      if (endTime <= startTime) {
        throw new Error(
          "Legacy overtime end time must be after start time",
        );
      }

      const legacySourceRef = requestSourceRef(
        record,
        requestId,
      );
      const status = requestStatus(rawStatus);
      const rawCurrentStep = rawValue(record, [
        "currentStep",
        "CurrentStep",
      ]);
      const rawTotalDays = rawValue(record, [
        "total_days",
        "Days",
      ]);
      const rawComment = rawValue(record, [
        "comment",
        "Comment",
        "rejected",
        "Rejected",
        "rejectedReason",
      ]);

      return {
        action: "IMPORT",
        targetEntityType: "overtime_request_bundle",
        payload: {
          legacyRequestId: requestId,
          legacySourceRef,
          employeeLegacyId: requiredString(record, ["UserID"]),
          legacyDisplayName: optionalString(record, ["Fullname"]),
          requestDate,
          startDate,
          endDate,
          reason: requiredString(record, ["Reason"]),
          startTime,
          endTime,
          totalHours,
          requestedMinutes,
          status,
          rawStatus,
          currentStep,
          rawCurrentStep,
          comment,
          rawComment,
          updatedDate,
          totalDays,
          rawTotalDays,
          rawTotalHours,
          legacyRaw: record.values,
          segments: [
            {
              workDate: startDate,
              startTime,
              endTime,
              requestedMinutes,
              attendanceRecordId: null,
            },
          ],
        } satisfies JsonValue,
      };
    } catch (error) {
      return rejection("OVERTIME_REQUEST_INVALID_SOURCE", error);
    }
  },
};

export const overtimeApprovalStepTransformer: MigrationTransformer = {
  version: "overtime-approval-step-v1",
  transform(record) {
    try {
      if (
        record.provenance.sourceTab !== OVERTIME_STEP_TAB ||
        record.provenance.sourcePeriod !== "CURRENT"
      ) {
        throw new Error(
          "Overtime approval transformer only accepts current OT_ApprovalSteps",
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

      if (stepId !== record.provenance.legacyId) {
        throw new Error(
          "Overtime step ID does not match source-qualified provenance",
        );
      }

      const rawStatus = requiredString(record, ["status", "Status"]);
      const normalizedStatus = approvalStepStatus(rawStatus);
      const assignedDate = requiredDate(record, [
        "createdDate",
        "assignedAt",
      ]);
      const approvedDateValue = optionalString(record, [
        "approvedDate",
        "approvedAt",
      ]);
      const approvedDate = approvedDateValue
        ? parseLegacyDateValue(approvedDateValue, "approvedDate")
        : null;
      const comment = optionalString(record, [
        "comment",
        "Comment",
      ]);

      const currentRequestProvenanceKey =
        requestSourceRef(record, requestId);

      return {
        action: "IMPORT",
        targetEntityType: "overtime_approval_step",
        payload: {
          legacyStepId: stepId,
          legacyRequestId: requestId,
          currentRequestProvenanceKey,
          requestProvenanceKey: currentRequestProvenanceKey,
          stepOrder: integerValue(record, ["step", "stepOrder"]),
          approverLegacyId: requiredString(record, [
            "approver_id",
            "approverId",
          ]),
          assignedDate,
          approvedDate,
          rawStatus,
          normalizedStatus,
          status: normalizedStatus,
          comment,
          legacyRaw: record.values,
        } satisfies JsonValue,
      };
    } catch (error) {
      return rejection("OVERTIME_APPROVAL_INVALID_SOURCE", error);
    }
  },
};

export interface OvertimeReconciliationSnapshot {
  readonly requestCount: number;
  readonly requestLegacyIds?: readonly string[];
  readonly legacyRequestIds?: readonly string[];
  readonly requestIdSet?: readonly string[];
  readonly requestStatusCounts?: Readonly<Record<string, number>>;
  readonly statusCounts?: Readonly<Record<string, number>>;
  readonly requestedMinutesTotal?: number;
  readonly requestedMinuteTotal?: number;
  readonly approvalStepCount?: number;
  readonly stepCount?: number;
  readonly approvalStepStatusCounts?: Readonly<Record<string, number>>;
  readonly stepStatusCounts?: Readonly<Record<string, number>>;
  readonly orphanEmployeeCount?: number;
  readonly orphanApprovalStepRequestCount?: number;
  readonly orphanStepRequestCount?: number;
  readonly missingOrInactiveApproverCount?: number;
  readonly missingApproverCount?: number;
  readonly dateShapeCounts?: Readonly<Record<string, number>>;
  readonly dateShape?: Readonly<Record<string, number>>;
  readonly timeShapeCounts?: Readonly<Record<string, number>>;
  readonly timeShape?: Readonly<Record<string, number>>;
}

function idSet(
  snapshot: OvertimeReconciliationSnapshot,
): readonly string[] {
  return [
    ...(snapshot.requestLegacyIds ??
      snapshot.legacyRequestIds ??
      snapshot.requestIdSet ??
      []),
  ].sort();
}

function statusCounts(
  snapshot: OvertimeReconciliationSnapshot,
): Readonly<Record<string, number>> {
  return (
    snapshot.requestStatusCounts ??
    snapshot.statusCounts ??
    {}
  );
}

function stepStatusCounts(
  snapshot: OvertimeReconciliationSnapshot,
): Readonly<Record<string, number>> {
  return (
    snapshot.approvalStepStatusCounts ??
    snapshot.stepStatusCounts ??
    {}
  );
}

function result(input: {
  readonly checkName: string;
  readonly sourceValue: string;
  readonly targetValue: string;
  readonly code: string;
}): ReconciliationResult {
  if (input.sourceValue === input.targetValue) {
    return {
      entityType: "overtime",
      checkName: input.checkName,
      status: "PASS",
      sourceValue: input.sourceValue,
      targetValue: input.targetValue,
      exceptionCode: null,
      disposition: null,
    };
  }

  return {
    entityType: "overtime",
    checkName: input.checkName,
    status: "FAIL",
    sourceValue: input.sourceValue,
    targetValue: input.targetValue,
    exceptionCode: input.code,
    disposition:
      "BLOCK_OVERTIME_ACCEPTANCE_UNTIL_SOURCE_AND_TARGET_RECONCILE",
  };
}

export function reconcileOvertimeModule(
  source: OvertimeReconciliationSnapshot,
  target: OvertimeReconciliationSnapshot,
): readonly ReconciliationResult[] {
  return [
    result({
      checkName: "request_count",
      sourceValue: String(source.requestCount),
      targetValue: String(target.requestCount),
      code: "OVERTIME_REQUEST_COUNT_MISMATCH",
    }),
    result({
      checkName: "request_legacy_id_set",
      sourceValue: canonicalJson(idSet(source) as JsonValue),
      targetValue: canonicalJson(idSet(target) as JsonValue),
      code: "OVERTIME_REQUEST_ID_SET_MISMATCH",
    }),
    result({
      checkName: "request_status_counts",
      sourceValue: canonicalJson(statusCounts(source) as JsonValue),
      targetValue: canonicalJson(statusCounts(target) as JsonValue),
      code: "OVERTIME_REQUEST_STATUS_COUNT_MISMATCH",
    }),
    result({
      checkName: "requested_minutes_total",
      sourceValue: String(
        source.requestedMinutesTotal ??
          source.requestedMinuteTotal ??
          0,
      ),
      targetValue: String(
        target.requestedMinutesTotal ??
          target.requestedMinuteTotal ??
          0,
      ),
      code: "OVERTIME_REQUESTED_MINUTES_MISMATCH",
    }),
    result({
      checkName: "approval_step_count",
      sourceValue: String(
        source.approvalStepCount ?? source.stepCount ?? 0,
      ),
      targetValue: String(
        target.approvalStepCount ?? target.stepCount ?? 0,
      ),
      code: "OVERTIME_APPROVAL_STEP_COUNT_MISMATCH",
    }),
    result({
      checkName: "approval_step_status_counts",
      sourceValue: canonicalJson(
        stepStatusCounts(source) as JsonValue,
      ),
      targetValue: canonicalJson(
        stepStatusCounts(target) as JsonValue,
      ),
      code: "OVERTIME_APPROVAL_STEP_STATUS_COUNT_MISMATCH",
    }),
    result({
      checkName: "orphan_employee_count",
      sourceValue: String(source.orphanEmployeeCount ?? 0),
      targetValue: String(target.orphanEmployeeCount ?? 0),
      code: "OVERTIME_ORPHAN_EMPLOYEE_MISMATCH",
    }),
    result({
      checkName: "orphan_step_request_count",
      sourceValue: String(
        source.orphanApprovalStepRequestCount ??
          source.orphanStepRequestCount ??
          0,
      ),
      targetValue: String(
        target.orphanApprovalStepRequestCount ??
          target.orphanStepRequestCount ??
          0,
      ),
      code: "OVERTIME_ORPHAN_STEP_REQUEST_MISMATCH",
    }),
    result({
      checkName: "missing_or_inactive_approver_count",
      sourceValue: String(
        source.missingOrInactiveApproverCount ??
          source.missingApproverCount ??
          0,
      ),
      targetValue: String(
        target.missingOrInactiveApproverCount ??
          target.missingApproverCount ??
          0,
      ),
      code: "OVERTIME_APPROVER_REFERENCE_MISMATCH",
    }),
    result({
      checkName: "date_shape",
      sourceValue: canonicalJson(
        (source.dateShapeCounts ?? source.dateShape ?? {}) as JsonValue,
      ),
      targetValue: canonicalJson(
        (target.dateShapeCounts ?? target.dateShape ?? {}) as JsonValue,
      ),
      code: "OVERTIME_DATE_SHAPE_MISMATCH",
    }),
    result({
      checkName: "time_shape",
      sourceValue: canonicalJson(
        (source.timeShapeCounts ?? source.timeShape ?? {}) as JsonValue,
      ),
      targetValue: canonicalJson(
        (target.timeShapeCounts ?? target.timeShape ?? {}) as JsonValue,
      ),
      code: "OVERTIME_TIME_SHAPE_MISMATCH",
    }),
  ];
}

export const reconcileOvertime = reconcileOvertimeModule;
