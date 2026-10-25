import { describe, expect, it } from "vitest";

import type {
  AttendanceSelfOverview,
} from "@ckace/contracts";

import {
  ATTENDANCE_SESSION_EXPIRED_MESSAGE,
  attendanceMetrics,
  correctionTargets,
  radiusLabel,
  sourceLabel,
} from "./attendance-view";

const overview: AttendanceSelfOverview = {
  dayKind: "WORKDAY",
  canCheckIn: false,
  canCheckOut: false,
  currentAttendanceRecordId: null,
  records: [
    {
      attendanceRecordId:
        "00000000-0000-4000-8000-000000000001",
      workDate: "2026-10-07",
      checkInAt: "2026-10-07T02:10:00.000Z",
      checkOutAt: "2026-10-07T10:00:00.000Z",
      checkInSource: "DEVICE",
      checkOutSource: "CORRECTION",
      workMinutes: 470,
      lateMinutes: 10,
      earlyMinutes: 0,
      overtimeMinutes: 20,
      checkInRadius: "OUTSIDE",
      checkOutRadius: "INSIDE",
      policyVersion: "v1",
    },
    {
      attendanceRecordId:
        "00000000-0000-4000-8000-000000000002",
      workDate: "2026-10-06",
      checkInAt: "2026-10-06T02:00:00.000Z",
      checkOutAt: null,
      checkInSource: "LEGACY",
      checkOutSource: null,
      workMinutes: null,
      lateMinutes: 0,
      earlyMinutes: 15,
      overtimeMinutes: null,
      checkInRadius: "UNKNOWN",
      checkOutRadius: "UNKNOWN",
      policyVersion: null,
    },
  ],
};

describe("Desktop Attendance view helpers", () => {
  it("uses the shared session-expiry message", () => {
    expect(ATTENDANCE_SESSION_EXPIRED_MESSAGE).toBe(
      "การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่",
    );
  });

  it("derives operational metrics from server records", () => {
    expect(attendanceMetrics(overview)).toEqual({
      totalRecords: 2,
      lateRecords: 1,
      earlyRecords: 1,
      outsideRadiusEvents: 1,
      overtimeMinutes: 20,
    });
  });

  it("offers both correction targets, including a check-out that was never scanned", () => {
    expect(correctionTargets()).toEqual(["CHECK_IN", "CHECK_OUT"]);
  });

  it("renders radius/source semantics without client inference", () => {
    expect(radiusLabel("OUTSIDE")).toBe("นอกพื้นที่");
    expect(sourceLabel("CORRECTION")).toBe("แก้ไขเวลา");
    expect(sourceLabel(null)).toBe("ไม่ทราบ");
  });
});
