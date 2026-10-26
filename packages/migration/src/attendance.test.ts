import { describe, expect, it } from "vitest";

import {
  attendanceRecordTransformer,
  countByStatus,
  reconcileAttendanceModule,
  timeCorrectionTransformer,
} from "./index";
import type { LegacyExtractedRecord } from "./migration-contracts";

function record(input: {
  tab: string;
  legacyId: string;
  values: Readonly<Record<string, string | number | null>>;
}): LegacyExtractedRecord {
  return {
    rowNumber: 2,
    provenance: {
      sourceSystem: "APP_LEAVE_GAS",
      sourceWorkbook: "Data_CK&RR_Requests",
      sourceTab: input.tab,
      sourcePeriod: "CURRENT",
      legacyId: input.legacyId,
      rowFingerprint: "a".repeat(64),
      migrationRunId: "attendance-run",
    },
    values: input.values,
    payloadHash: "b".repeat(64),
  };
}

function timeLog(
  overrides: Readonly<Record<string, string | number | null>> = {},
): LegacyExtractedRecord {
  return record({
    tab: "TimeLog",
    legacyId: "LOG-000001",
    values: {
      LogID: "LOG-000001",
      UserID: "USER-001",
      Fullname: "Employee One",
      Date: "05/10/2026",
      CheckInTime: "09:05:30",
      CheckOutTime: "17:30:00",
      WorkHours: 7.5,
      Comment1: "มาสาย",
      Comment2: "",
      LocationIn: "13.845740,100.439546",
      LocationOut: "13.845740,100.439546",
      Comment3: "ในรัศมี",
      Comment4: "ในรัศมี",
      OT_Hours: 0,
      OT_Status: "ไม่มีการอนุมัติ",
      Linked_OT_RequestID: "",
      ...overrides,
    },
  });
}

function correction(
  overrides: Readonly<Record<string, string | number | null>> = {},
): LegacyExtractedRecord {
  return record({
    tab: "TimeCorrections",
    legacyId: "COR-00001",
    values: {
      RequestID: "COR-00001",
      UserID: "USER-001",
      Fullname: "Employee One",
      RequestDate: "05/10/2026",
      OriginalDate: "04/10/2026",
      OriginalCheckIn: "09:01",
      OriginalCheckOut: "17:30",
      CorrectedCheckIn: "09:00",
      CorrectedCheckOut: "",
      Reason: "Forgot to clock in",
      Status: "อนุมัติ",
      ApproverID: "USER-002",
      ApproverComment: "",
      ApprovalDate: "05/10/2026",
      ClientKey: "correction-0001",
      ...overrides,
    },
  });
}

describe("M7 attendance migration", () => {
  it("imports raw punches with Bangkok timestamps and does not reuse legacy calculations", () => {
    expect(
      attendanceRecordTransformer.transform(timeLog()),
    ).toMatchObject({
      action: "IMPORT",
      targetEntityType: "attendance_record_bundle",
      payload: {
        legacyLogId: "LOG-000001",
        employeeLegacyId: "USER-001",
        workDate: "2026-10-05",
        checkInAt: "2026-10-05T09:05:30+07:00",
        checkOutAt: "2026-10-05T17:30:00+07:00",
        calculation: null,
        calculationDisposition:
          "LEGACY_WORKHOURS_AND_OT_HOURS_IGNORED_RECALCULATE_FROM_NEW_POLICY",
      },
    });
  });

  it("preserves nullable historical checkout without inference", () => {
    expect(
      attendanceRecordTransformer.transform(
        timeLog({
          CheckOutTime: "",
          WorkHours: "",
          LocationOut: "",
          Comment4: "",
        }),
      ),
    ).toMatchObject({
      action: "IMPORT",
      payload: {
        checkOutAt: null,
        checkOutLocationText: null,
        calculation: null,
      },
    });
  });

  it("does not interpret redacted legacy comment text as a radius calculation", () => {
    expect(
      attendanceRecordTransformer.transform(
        timeLog({ Comment3: "maybe" }),
      ),
    ).toMatchObject({ action: "IMPORT", payload: { calculation: null } });
  });

  it("requires TimeLog identity to match source-qualified provenance", () => {
    expect(
      attendanceRecordTransformer.transform(
        timeLog({ LogID: "LOG-OTHER" }),
      ),
    ).toMatchObject({
      action: "REJECT",
      code: "ATTENDANCE_INVALID_SOURCE",
    });
  });

  it("maps approved Thai correction status and exactly one corrected event", () => {
    expect(
      timeCorrectionTransformer.transform(correction()),
    ).toMatchObject({
      action: "IMPORT",
      targetEntityType: "time_correction_request",
      payload: {
        legacyCorrectionId: "COR-00001",
        attendanceDate: "2026-10-04",
        correctionType: "CHECK_IN",
        correctedCheckIn: "09:00",
        correctedCheckOut: null,
        rawStatus: "อนุมัติ",
        status: "APPROVED",
        assignedApproverLegacyId: "USER-002",
        attendanceLookup: {
          employeeLegacyId: "USER-001",
          attendanceDate: "2026-10-04",
          resolutionRule:
            "REQUIRE_EXACTLY_ONE_MATCH_OR_EXPLICIT_EXCEPTION",
        },
      },
    });
  });

  it("normalizes source clocks with a trailing colon and the known no-data sentinel", () => {
    expect(
      timeCorrectionTransformer.transform(correction({
        OriginalCheckIn: "9:01:",
        OriginalCheckOut: "ไม่มีข้อมูล",
        CorrectedCheckIn: "9:00:",
      })),
    ).toMatchObject({
      action: "IMPORT",
      payload: {
        originalCheckIn: "09:01",
        originalCheckOut: null,
        correctedCheckIn: "09:00",
        correctedCheckOut: null,
      },
    });
  });

  it("rejects a correction that changes both check-in and check-out", () => {
    expect(
      timeCorrectionTransformer.transform(
        correction({
          CorrectedCheckIn: "09:00",
          CorrectedCheckOut: "17:00",
        }),
      ),
    ).toMatchObject({
      action: "REJECT",
      code: "TIME_CORRECTION_INVALID_SOURCE",
    });
  });

  it("rejects unsupported correction status rather than mapping request-only states", () => {
    expect(
      timeCorrectionTransformer.transform(
        correction({ Status: "ส่งกลับแก้ไข" }),
      ),
    ).toMatchObject({
      action: "REJECT",
      code: "TIME_CORRECTION_INVALID_SOURCE",
    });
  });

  it("keeps duplicate attendance business days visible as a non-blocking exception", () => {
    const snapshot = {
      attendanceRecordCount: 1952,
      employeeDateCounts: {
        "USER-001::2026-10-05": 2,
      },
      duplicateBusinessDayGroupCount: 1,
      checkInPresentCount: 1952,
      checkOutPresentCount: 1700,
      nullableCheckoutCount: 252,
      workMinutesTotal: 820000,
      checkInLocationPresentCount: 1952,
      checkOutLocationPresentCount: 1659,
      linkedOvertimeCount: 0,
      timeCorrectionCount: 64,
      timeCorrectionStatusCounts: { APPROVED: 64 },
      timeCorrectionMissingAttendanceCount: 0,
    };

    const results = reconcileAttendanceModule(
      snapshot,
      snapshot,
    );

    expect(countByStatus(results)).toEqual({
      PASS: 11,
      EXCEPTION: 2,
      FAIL: 0,
    });
    expect(
      results.find(
        (entry) =>
          entry.checkName ===
          "duplicate_employee_date_groups",
      ),
    ).toMatchObject({
      status: "EXCEPTION",
      exceptionCode: "LEGACY_DUPLICATE_BUSINESS_DAY",
      disposition:
        "PRESERVE_DISTINCT_RECORDS_AND_REQUIRE_OWNER_REVIEW",
    });
    expect(
      results.find(
        (entry) =>
          entry.checkName === "nullable_checkout_count",
      ),
    ).toMatchObject({
      status: "EXCEPTION",
      exceptionCode: "NULLABLE_HISTORICAL_CHECKOUT",
    });
  });

  it("makes attendance reconciliation drift blocking", () => {
    const source = {
      attendanceRecordCount: 10,
      employeeDateCounts: { "USER-001::2026-10-05": 1 },
      duplicateBusinessDayGroupCount: 0,
      checkInPresentCount: 10,
      checkOutPresentCount: 9,
      nullableCheckoutCount: 1,
      workMinutesTotal: 4000,
      checkInLocationPresentCount: 10,
      checkOutLocationPresentCount: 9,
      linkedOvertimeCount: 0,
      timeCorrectionCount: 2,
      timeCorrectionStatusCounts: { APPROVED: 2 },
      timeCorrectionMissingAttendanceCount: 0,
    };

    const results = reconcileAttendanceModule(source, {
      ...source,
      attendanceRecordCount: 9,
    });

    expect(countByStatus(results)).toEqual({
      PASS: 11,
      EXCEPTION: 1,
      FAIL: 1,
    });
    expect(
      results.find((entry) => entry.status === "FAIL")
        ?.disposition,
    ).toContain("BLOCK_ATTENDANCE_ACCEPTANCE");
  });
});
