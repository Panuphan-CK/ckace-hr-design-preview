import { describe, expect, it } from "vitest";

import {
  assertCorrectionAttendanceDateMatch,
  assertSingleAttendanceBusinessDayRecord,
  attendanceBusinessParts,
  calculateActualApprovedOvertimeMinutes,
  companyCorrectionApproverRoles,
  correctionApproverPlan,
  formatAttendanceLocationText,
} from "./attendance-repository";

describe("attendance repository guards", () => {
  it("derives Asia/Bangkok business date/time across a UTC date boundary", () => {
    expect(
      attendanceBusinessParts(
        new Date("2026-10-04T18:30:00.000Z"),
      ),
    ).toEqual({
      dateKey: "2026-10-05",
      time: "01:30",
    });
  });

  it("formats deterministic location text without treating zero as missing", () => {
    expect(
      formatAttendanceLocationText({
        latitude: 0,
        longitude: 0,
        accuracyMeters: 12.4,
      }),
    ).toBe("0.000000,0.000000,accuracy=12m");
  });

  it("preserves legacy User approver fallback order", () => {
    expect(
      correctionApproverPlan(["EMPLOYEE"]),
    ).toEqual([
      {
        roleKey: "SUPERUSER",
        scope: "SAME_AGENCY",
      },
      {
        roleKey: "ADMIN",
        scope: "SAME_AGENCY",
      },
    ]);
  });

  it("preserves legacy SuperUser approver fallback order", () => {
    expect(
      correctionApproverPlan(["SUPERUSER"]),
    ).toEqual([
      {
        roleKey: "ADMIN",
        scope: "SAME_AGENCY",
      },
      {
        roleKey: "ADMIN",
        scope: "GLOBAL",
      },
    ]);
  });

  it("caps actual OT by the approved segment and checkout time", () => {
    const startTime = new Date("1970-01-01T17:30:00.000Z");
    const endTime = new Date("1970-01-01T20:00:00.000Z");

    expect(
      calculateActualApprovedOvertimeMinutes(
        [{ startTime, endTime }],
        "19:00",
      ),
    ).toBe(90);

    expect(
      calculateActualApprovedOvertimeMinutes(
        [{ startTime, endTime }],
        "21:00",
      ),
    ).toBe(150);

    expect(
      calculateActualApprovedOvertimeMinutes(
        [{ startTime, endTime }],
        "17:00",
      ),
    ).toBe(0);
  });

  it("fails closed for requester roles without a legacy correction chain", () => {
    expect(() =>
      correctionApproverPlan(["ADMIN"]),
    ).toThrow("approver chain is unavailable");
  });

  it("fails closed when a correction is linked to a different attendance date", () => {
    expect(() =>
      assertCorrectionAttendanceDateMatch(
        new Date("2026-10-05T00:00:00.000Z"),
        new Date("2026-10-06T00:00:00.000Z"),
      ),
    ).toThrow("does not match target record");

    expect(() =>
      assertCorrectionAttendanceDateMatch(
        new Date("2026-10-05T00:00:00.000Z"),
        new Date("2026-10-05T00:00:00.000Z"),
      ),
    ).not.toThrow();
  });

  it("accepts exactly one attendance row and blocks duplicate business days", () => {
    expect(() =>
      assertSingleAttendanceBusinessDayRecord(1),
    ).not.toThrow();

    expect(() =>
      assertSingleAttendanceBusinessDayRecord(2),
    ).toThrow("Duplicate attendance business day");

    expect(() =>
      assertSingleAttendanceBusinessDayRecord(0),
    ).toThrow("Attendance record is unavailable");
  });
});

describe("company-aware time correction approver roles", () => {
  it("only picks approvers above the requester", () => {
    expect(companyCorrectionApproverRoles(["EMPLOYEE"])).toEqual([
      "SUPERUSER",
      "ADMIN",
      "SUPERADMIN",
    ]);
    expect(companyCorrectionApproverRoles(["SUPERUSER"])).toEqual([
      "ADMIN",
      "SUPERADMIN",
    ]);
    expect(companyCorrectionApproverRoles(["admin"])).toEqual(["SUPERADMIN"]);
    expect(companyCorrectionApproverRoles(["SUPERADMIN"])).toEqual([
      "SUPERADMIN",
    ]);
  });
});
