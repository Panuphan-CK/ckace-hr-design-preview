import { describe, expect, it } from "vitest";
import type { AttendanceRecordView, TimeCorrectionRequestView } from "@ckace/contracts";
import {
  bangkokMonthKey,
  bangkokTime,
  correctionErrorMessage,
  correctionMetrics,
  checkAddRecord,
  correctionTargets,
  correctionTimeSummary,
  correctionTitle,
  hasPendingRequest,
  recordTime,
  sortRecords,
  sortRequests,
} from "./time-correction-view";

const RECORD_ID = "00000000-0000-4000-8000-000000000001";

function record(overrides: Partial<AttendanceRecordView> = {}): AttendanceRecordView {
  return {
    attendanceRecordId: RECORD_ID,
    workDate: "2026-10-13",
    checkInAt: "2026-10-13T01:58:00.000Z",
    checkOutAt: null,
    checkInSource: "DEVICE",
    checkOutSource: null,
    workMinutes: null,
    lateMinutes: null,
    earlyMinutes: null,
    overtimeMinutes: null,
    checkInRadius: "INSIDE",
    checkOutRadius: "UNKNOWN",
    policyVersion: null,
    ...overrides,
  };
}

function request(overrides: Partial<TimeCorrectionRequestView> = {}): TimeCorrectionRequestView {
  return {
    requestId: "00000000-0000-4000-8000-0000000000a1",
    attendanceRecordId: RECORD_ID,
    attendanceDate: "2026-10-13",
    correctionType: "CHECK_IN",
    originalTime: "09:20",
    correctedTime: "08:58",
    reason: "ลืมสแกน",
    status: "PENDING",
    decisionComment: null,
    requestedAt: "2026-10-13T05:00:00.000Z",
    decidedAt: null,
    canDecide: false,
    ...overrides,
  };
}

describe("time correction view", () => {
  it("formats timestamps on the Bangkok clock", () => {
    expect(bangkokTime("2026-10-13T01:58:00.000Z")).toBe("08:58");
    expect(bangkokTime("2026-10-13T17:05:00.000Z")).toBe("00:05");
    expect(bangkokTime(null)).toBeNull();
    expect(bangkokTime("not a date")).toBeNull();
  });

  it("offers check-out correction even when the check-out was never scanned", () => {
    expect(correctionTargets()).toEqual(["CHECK_IN", "CHECK_OUT"]);
    const done = record({ checkOutAt: "2026-10-13T11:05:00.000Z" });
    expect(recordTime(done, "CHECK_OUT")).toBe("18:05");
    expect(recordTime(record(), "CHECK_OUT")).toBeNull();
  });

  it("sorts records and requests newest first", () => {
    const older = record({ attendanceRecordId: "a", workDate: "2026-10-01" });
    const newer = record({ attendanceRecordId: "b", workDate: "2026-10-14" });
    expect(sortRecords([older, newer]).map((r) => r.attendanceRecordId)).toEqual(["b", "a"]);
    const r1 = request({ requestId: "1", requestedAt: "2026-10-01T00:00:00.000Z" });
    const r2 = request({ requestId: "2", requestedAt: "2026-10-10T00:00:00.000Z" });
    expect(sortRequests([r1, r2]).map((r) => r.requestId)).toEqual(["2", "1"]);
  });

  it("counts this month's requests without cancelled ones, and pending ones", () => {
    const rows = [
      request(),
      request({ requestId: "2", status: "APPROVED", attendanceDate: "2026-10-02" }),
      request({ requestId: "3", status: "CANCELLED", attendanceDate: "2026-10-03" }),
      request({ requestId: "4", status: "APPROVED", attendanceDate: "2026-09-30" }),
    ];
    expect(correctionMetrics(rows, "2026-10")).toEqual({ thisMonth: 2, pending: 1 });
  });

  it("detects a pending request for the same record and type", () => {
    expect(hasPendingRequest([request()], RECORD_ID, "CHECK_IN")).toBe(true);
    expect(hasPendingRequest([request()], RECORD_ID, "CHECK_OUT")).toBe(false);
    expect(hasPendingRequest([request({ status: "REJECTED" })], RECORD_ID, "CHECK_IN")).toBe(false);
  });

  it("uses the Bangkok month", () => {
    expect(bangkokMonthKey(new Date("2026-09-30T18:00:00.000Z"))).toBe("2026-10");
  });

  it("maps API errors to Thai messages", () => {
    expect(correctionErrorMessage(409, "create")).toContain("ชน");
    expect(correctionErrorMessage(409, "cancel")).toContain("รีเฟรช");
    expect(correctionErrorMessage(401, "load")).toContain("เข้าสู่ระบบ");
  });
});

describe("add-record requests", () => {
  const added = request({ correctionType: "ADD_RECORD", correctedTime: "09:00", correctedCheckOutTime: "17:30", originalTime: "" });

  it("titles a whole added record with both times", () => {
    expect(correctionTitle(added)).toBe("เพิ่มบันทึกลงเวลา 09:00-17:30");
    expect(correctionTimeSummary(added)).toBe("เข้า 09:00 ออก 17:30");
  });

  it("validates the form before it is sent", () => {
    const base = { date: "2026-10-14", checkIn: "09:00", checkOut: "17:30", reason: "ลืมสแกน", today: "2026-10-17", recordDates: [], activeRequestDates: [] };
    expect(checkAddRecord(base)).toEqual({ ok: true });
    expect(checkAddRecord({ ...base, reason: " " }).ok).toBe(false);
    expect(checkAddRecord({ ...base, date: "2026-10-18" }).ok).toBe(false);
    expect(checkAddRecord({ ...base, checkOut: "09:00" }).ok).toBe(false);
    expect(checkAddRecord({ ...base, recordDates: ["2026-10-14"] }).ok).toBe(false);
    expect(checkAddRecord({ ...base, activeRequestDates: ["2026-10-14"] }).ok).toBe(false);
  });
});
