import type {
  JsonValue,
  LegacyExtractedRecord,
  MigrationTransformer,
} from "./migration-contracts";
import {
  mapLegacyRequestStatus,
  parseLegacyDateDdMmYyyy,
} from "./legacy-mappings";
import {
  KNOWN_LEGACY_EXCEPTION,
} from "./known-legacy-exceptions";
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
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  throw new Error(`Missing or invalid legacy ${keys.join("/")}`);
}

function optionalString(
  record: LegacyExtractedRecord,
  key: string,
): string | null {
  const value = record.values[key];

  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(`Invalid legacy ${key}`);
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function optionalAliasedString(
  record: LegacyExtractedRecord,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = record.values[key];
    if (value !== null && value !== undefined && value !== "") {
      if (typeof value !== "string" && typeof value !== "number") {
        throw new Error(`Invalid legacy ${key}`);
      }
      return String(value).trim() || null;
    }
  }
  return null;
}

function parseLegacyClock(
  value: string | null,
  key: string,
): string | null {
  if (!value) {
    return null;
  }

  if (value.trim() === "ไม่มีข้อมูล") {
    return null;
  }

  const match =
    /^(\d{1,2}):(\d{2})(?::(\d{2})?)?$/.exec(value.trim());

  if (!match) {
    throw new Error(`Invalid legacy ${key} time`);
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? "0");

  if (hour > 23 || minute > 59 || second > 59) {
    throw new Error(`Invalid legacy ${key} time`);
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(
    2,
    "0",
  )}:${String(second).padStart(2, "0")}`;
}

function timeOnly(
  value: string | null,
  key: string,
): string | null {
  const clock = parseLegacyClock(value, key);
  return clock ? clock.slice(0, 5) : null;
}

function bangkokTimestamp(
  date: string,
  clock: string | null,
): string | null {
  if (!clock) {
    return null;
  }

  return `${date}T${clock}+07:00`;
}

function correctionStatus(
  value: string,
): "PENDING" | "APPROVED" | "REJECTED" {
  const mapped = mapLegacyRequestStatus(value);

  if (
    mapped !== "PENDING" &&
    mapped !== "APPROVED" &&
    mapped !== "REJECTED"
  ) {
    throw new Error(
      "Unsupported legacy TimeCorrection status: " + value,
    );
  }

  return mapped;
}

function timeCorrectionType(input: {
  readonly correctedCheckIn: string | null;
  readonly correctedCheckOut: string | null;
}): "CHECK_IN" | "CHECK_OUT" {
  if (input.correctedCheckIn && !input.correctedCheckOut) {
    return "CHECK_IN";
  }

  if (input.correctedCheckOut && !input.correctedCheckIn) {
    return "CHECK_OUT";
  }

  throw new Error(
    "Legacy TimeCorrection must correct exactly one attendance event",
  );
}

export const attendanceRecordTransformer: MigrationTransformer = {
  version: "attendance-record-v1",
  transform(record) {
    try {
      if (
        record.provenance.sourceTab !== "TimeLog" &&
        record.provenance.sourceTab !== "TimeLog_2025"
      ) {
        throw new Error(
          "Attendance transformer only accepts TimeLog",
        );
      }

      const logId = requiredString(record, "LogID");

      if (logId !== record.provenance.legacyId) {
        throw new Error(
          "TimeLog LogID does not match source-qualified provenance",
        );
      }

      const workDate = parseLegacyDateDdMmYyyy(
        requiredString(record, "Date"),
      );
      const checkInClock = parseLegacyClock(
        optionalString(record, "CheckInTime"),
        "CheckInTime",
      );

      if (!checkInClock) {
        throw new Error(
          "Legacy TimeLog row is missing check-in",
        );
      }

      const checkOutClock = parseLegacyClock(
        optionalString(record, "CheckOutTime"),
        "CheckOutTime",
      );

      return {
        action: "IMPORT",
        targetEntityType: "attendance_record_bundle",
        payload: {
          legacyLogId: logId,
          employeeLegacyId: requiredString(record, "UserID"),
          workDate,
          checkInAt: bangkokTimestamp(workDate, checkInClock),
          checkOutAt: bangkokTimestamp(workDate, checkOutClock),
          checkInLocationText: optionalString(
            record,
            "LocationIn",
          ),
          checkOutLocationText: optionalString(
            record,
            "LocationOut",
          ),
          calculation: null,
          calculationDisposition:
            "LEGACY_WORKHOURS_AND_OT_HOURS_IGNORED_RECALCULATE_FROM_NEW_POLICY",
          legacyTrace: {
            fullName: optionalString(record, "Fullname"),
            checkInComment: optionalAliasedString(
              record,
              ["Comment1", "comments1", "Comments1"],
            ),
            checkOutComment: optionalAliasedString(
              record,
              ["Comment2", "comments2", "Comments2"],
            ),
            rawInRadius: optionalAliasedString(record, ["Comment3", "comments3", "Comments3"]),
            rawOutRadius: optionalAliasedString(record, ["Comment4", "comments4", "Comments4"]),
            rawOtStatus: optionalString(record, "OT_Status"),
            linkedOtLegacyId: optionalString(
              record,
              "Linked_OT_RequestID",
            ),
            sourceTimezone: "Asia/Bangkok",
          },
        } satisfies JsonValue,
      };
    } catch (error) {
      return {
        action: "REJECT",
        code: "ATTENDANCE_INVALID_SOURCE",
        reason:
          error instanceof Error
            ? error.message
            : "Invalid attendance source",
      };
    }
  },
};

export const timeCorrectionTransformer: MigrationTransformer = {
  version: "time-correction-v1",
  transform(record) {
    try {
      if (record.provenance.sourceTab !== "TimeCorrections") {
        throw new Error(
          "Time correction transformer only accepts TimeCorrections",
        );
      }

      const requestId = requiredString(record, "RequestID");

      if (requestId !== record.provenance.legacyId) {
        throw new Error(
          "TimeCorrection RequestID does not match source-qualified provenance",
        );
      }

      const attendanceDate = parseLegacyDateDdMmYyyy(
        requiredString(record, "OriginalDate"),
      );
      const correctedCheckIn = timeOnly(
        optionalString(record, "CorrectedCheckIn"),
        "CorrectedCheckIn",
      );
      const correctedCheckOut = timeOnly(
        optionalString(record, "CorrectedCheckOut"),
        "CorrectedCheckOut",
      );
      const type = timeCorrectionType({
        correctedCheckIn,
        correctedCheckOut,
      });
      const rawStatus = requiredString(record, "Status");

      return {
        action: "IMPORT",
        targetEntityType: "time_correction_request",
        payload: {
          legacyCorrectionId: requestId,
          employeeLegacyId: requiredString(record, "UserID"),
          attendanceLookup: {
            employeeLegacyId: requiredString(
              record,
              "UserID",
            ),
            attendanceDate,
            resolutionRule:
              "REQUIRE_EXACTLY_ONE_MATCH_OR_EXPLICIT_EXCEPTION",
          },
          attendanceDate,
          originalCheckIn: timeOnly(
            optionalString(record, "OriginalCheckIn"),
            "OriginalCheckIn",
          ),
          originalCheckOut: timeOnly(
            optionalString(record, "OriginalCheckOut"),
            "OriginalCheckOut",
          ),
          correctedCheckIn,
          correctedCheckOut,
          correctionType: type,
          reason: requiredString(record, "Reason"),
          rawStatus,
          status: correctionStatus(rawStatus),
          assignedApproverLegacyId: requiredString(
            record,
            "ApproverID",
          ),
          decisionComment: optionalString(
            record,
            "ApproverComment",
          ),
          requestedDate: parseLegacyDateDdMmYyyy(
            requiredAliasedString(record, ["RequestDate", "SubmissionDate"]),
          ),
          decidedDate: optionalString(record, "ApprovalDate")
            ? parseLegacyDateDdMmYyyy(
                requiredString(record, "ApprovalDate"),
              )
            : null,
          legacyClientKey: optionalString(record, "ClientKey"),
        } satisfies JsonValue,
      };
    } catch (error) {
      return {
        action: "REJECT",
        code: "TIME_CORRECTION_INVALID_SOURCE",
        reason:
          error instanceof Error
            ? error.message
            : "Invalid time correction source",
      };
    }
  },
};

export interface AttendanceReconciliationSnapshot {
  readonly attendanceRecordCount: number;
  readonly employeeDateCounts: Readonly<Record<string, number>>;
  readonly duplicateBusinessDayGroupCount: number;
  readonly checkInPresentCount: number;
  readonly checkOutPresentCount: number;
  readonly nullableCheckoutCount: number;
  readonly workMinutesTotal: number;
  readonly checkInLocationPresentCount: number;
  readonly checkOutLocationPresentCount: number;
  readonly linkedOvertimeCount: number;
  readonly timeCorrectionCount: number;
  readonly timeCorrectionStatusCounts: Readonly<Record<string, number>>;
  readonly timeCorrectionMissingAttendanceCount: number;
}

function failOrPass(input: {
  readonly entityType: string;
  readonly checkName: string;
  readonly sourceValue: string;
  readonly targetValue: string;
  readonly code: string;
}): ReconciliationResult {
  if (input.sourceValue === input.targetValue) {
    return {
      entityType: input.entityType,
      checkName: input.checkName,
      status: "PASS",
      sourceValue: input.sourceValue,
      targetValue: input.targetValue,
      exceptionCode: null,
      disposition: null,
    };
  }

  return {
    entityType: input.entityType,
    checkName: input.checkName,
    status: "FAIL",
    sourceValue: input.sourceValue,
    targetValue: input.targetValue,
    exceptionCode: input.code,
    disposition:
      "BLOCK_ATTENDANCE_ACCEPTANCE_UNTIL_SOURCE_AND_TARGET_RECONCILE",
  };
}

function duplicateBusinessDayResult(
  source: number,
  target: number,
): ReconciliationResult {
  if (source !== target) {
    return failOrPass({
      entityType: "attendance",
      checkName: "duplicate_employee_date_groups",
      sourceValue: String(source),
      targetValue: String(target),
      code: "ATTENDANCE_DUPLICATE_GROUP_COUNT_MISMATCH",
    });
  }

  if (source > 0) {
    return {
      entityType: "attendance",
      checkName: "duplicate_employee_date_groups",
      status: "EXCEPTION",
      sourceValue: String(source),
      targetValue: String(target),
      exceptionCode:
        KNOWN_LEGACY_EXCEPTION.ATTENDANCE_DUPLICATE_BUSINESS_DAY.code,
      disposition:
        KNOWN_LEGACY_EXCEPTION.ATTENDANCE_DUPLICATE_BUSINESS_DAY
          .disposition,
    };
  }

  return failOrPass({
    entityType: "attendance",
    checkName: "duplicate_employee_date_groups",
    sourceValue: "0",
    targetValue: "0",
    code: "ATTENDANCE_DUPLICATE_GROUP_COUNT_MISMATCH",
  });
}

function nullableCheckoutResult(
  source: number,
  target: number,
): ReconciliationResult {
  if (source !== target) {
    return failOrPass({
      entityType: "attendance",
      checkName: "nullable_checkout_count",
      sourceValue: String(source),
      targetValue: String(target),
      code: "ATTENDANCE_NULLABLE_CHECKOUT_COUNT_MISMATCH",
    });
  }

  if (source > 0) {
    return {
      entityType: "attendance",
      checkName: "nullable_checkout_count",
      status: "EXCEPTION",
      sourceValue: String(source),
      targetValue: String(target),
      exceptionCode:
        KNOWN_LEGACY_EXCEPTION.NULLABLE_HISTORICAL_CHECKOUT.code,
      disposition:
        KNOWN_LEGACY_EXCEPTION.NULLABLE_HISTORICAL_CHECKOUT
          .disposition,
    };
  }

  return failOrPass({
    entityType: "attendance",
    checkName: "nullable_checkout_count",
    sourceValue: "0",
    targetValue: "0",
    code: "ATTENDANCE_NULLABLE_CHECKOUT_COUNT_MISMATCH",
  });
}

export function reconcileAttendanceModule(
  source: AttendanceReconciliationSnapshot,
  target: AttendanceReconciliationSnapshot,
): readonly ReconciliationResult[] {
  return [
    failOrPass({
      entityType: "attendance",
      checkName: "record_count",
      sourceValue: String(source.attendanceRecordCount),
      targetValue: String(target.attendanceRecordCount),
      code: "ATTENDANCE_RECORD_COUNT_MISMATCH",
    }),
    failOrPass({
      entityType: "attendance",
      checkName: "employee_date_counts",
      sourceValue: canonicalJson(source.employeeDateCounts),
      targetValue: canonicalJson(target.employeeDateCounts),
      code: "ATTENDANCE_EMPLOYEE_DATE_COUNT_MISMATCH",
    }),
    duplicateBusinessDayResult(
      source.duplicateBusinessDayGroupCount,
      target.duplicateBusinessDayGroupCount,
    ),
    failOrPass({
      entityType: "attendance",
      checkName: "checkin_present_count",
      sourceValue: String(source.checkInPresentCount),
      targetValue: String(target.checkInPresentCount),
      code: "ATTENDANCE_CHECKIN_COUNT_MISMATCH",
    }),
    failOrPass({
      entityType: "attendance",
      checkName: "checkout_present_count",
      sourceValue: String(source.checkOutPresentCount),
      targetValue: String(target.checkOutPresentCount),
      code: "ATTENDANCE_CHECKOUT_COUNT_MISMATCH",
    }),
    nullableCheckoutResult(
      source.nullableCheckoutCount,
      target.nullableCheckoutCount,
    ),
    failOrPass({
      entityType: "attendance",
      checkName: "work_minutes_total",
      sourceValue: String(source.workMinutesTotal),
      targetValue: String(target.workMinutesTotal),
      code: "ATTENDANCE_WORK_MINUTES_MISMATCH",
    }),
    failOrPass({
      entityType: "attendance",
      checkName: "checkin_location_present_count",
      sourceValue: String(source.checkInLocationPresentCount),
      targetValue: String(target.checkInLocationPresentCount),
      code: "ATTENDANCE_CHECKIN_LOCATION_COUNT_MISMATCH",
    }),
    failOrPass({
      entityType: "attendance",
      checkName: "checkout_location_present_count",
      sourceValue: String(source.checkOutLocationPresentCount),
      targetValue: String(target.checkOutLocationPresentCount),
      code: "ATTENDANCE_CHECKOUT_LOCATION_COUNT_MISMATCH",
    }),
    failOrPass({
      entityType: "attendance",
      checkName: "linked_overtime_count",
      sourceValue: String(source.linkedOvertimeCount),
      targetValue: String(target.linkedOvertimeCount),
      code: "ATTENDANCE_LINKED_OT_COUNT_MISMATCH",
    }),
    failOrPass({
      entityType: "time_correction",
      checkName: "request_count",
      sourceValue: String(source.timeCorrectionCount),
      targetValue: String(target.timeCorrectionCount),
      code: "TIME_CORRECTION_COUNT_MISMATCH",
    }),
    failOrPass({
      entityType: "time_correction",
      checkName: "status_counts",
      sourceValue: canonicalJson(
        source.timeCorrectionStatusCounts,
      ),
      targetValue: canonicalJson(
        target.timeCorrectionStatusCounts,
      ),
      code: "TIME_CORRECTION_STATUS_COUNT_MISMATCH",
    }),
    failOrPass({
      entityType: "time_correction",
      checkName: "missing_attendance_reference_count",
      sourceValue: String(
        source.timeCorrectionMissingAttendanceCount,
      ),
      targetValue: String(
        target.timeCorrectionMissingAttendanceCount,
      ),
      code: "TIME_CORRECTION_ATTENDANCE_REFERENCE_MISMATCH",
    }),
  ];
}
