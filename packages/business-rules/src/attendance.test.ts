import { describe, expect, it } from "vitest";

import {
  assertAttendanceDateNotFuture,
  assertAttendanceDayAllowed,
  assertNoActiveTimeCorrection,
  assertTimeCorrectionChanged,
  assertTimeCorrectionOriginalExists,
  attendanceDistanceKm,
  calculateAttendanceWorkMinutes,
  calculateCorrectedWorkMinutes,
  classifyAttendanceRadius,
  classifyAttendanceTiming,
  normalizeAttendanceLocation,
  normalizeAttendancePolicy,
  normalizeTimeCorrection,
  normalizeTimeCorrectionDecision,
} from "./attendance";

const policy = {
  timezone: "Asia/Bangkok",
  officeLatitude: 13.84574,
  officeLongitude: 100.439546,
  radiusKm: 5,
  lateAfter: "09:05",
  workEnd: "17:30",
  breakStart: "12:00",
  breakEnd: "13:00",
} as const;

describe("attendance business rules", () => {
  it("preserves 09:05 late and 17:30 early-out boundaries", () => {
    expect(
      classifyAttendanceTiming({
        checkInTime: "09:04",
        checkOutTime: "17:29",
        policy,
        hasApprovedOvertime: false,
      }),
    ).toMatchObject({
      isLate: false,
      isEarly: true,
      earlyMinutes: 1,
    });

    expect(
      classifyAttendanceTiming({
        checkInTime: "09:05",
        checkOutTime: "17:30",
        policy,
        hasApprovedOvertime: false,
      }),
    ).toMatchObject({
      isLate: true,
      lateMinutes: 0,
      isEarly: false,
    });
  });

  it("does not mark early checkout when approved overtime exists", () => {
    expect(
      classifyAttendanceTiming({
        checkInTime: "09:00",
        checkOutTime: "17:00",
        policy,
        hasApprovedOvertime: true,
      }),
    ).toMatchObject({
      isEarly: false,
      earlyMinutes: 0,
    });
  });

  it("classifies the 5km radius without hard-blocking outside locations", () => {
    const edgeLatitude =
      policy.officeLatitude +
      (5 / 6371) * (180 / Math.PI);

    expect(
      classifyAttendanceRadius({
        location: {
          latitude: edgeLatitude - 0.000001,
          longitude: policy.officeLongitude,
          accuracyMeters: 10,
        },
        policy,
      }),
    ).toBe("INSIDE");

    expect(
      classifyAttendanceRadius({
        location: {
          latitude: edgeLatitude + 0.000001,
          longitude: policy.officeLongitude,
          accuracyMeters: 10,
        },
        policy,
      }),
    ).toBe("OUTSIDE");
  });

  it("accepts zero coordinates as valid numeric GPS values", () => {
    expect(
      normalizeAttendanceLocation({
        latitude: 0,
        longitude: 0,
        accuracyMeters: 0,
      }),
    ).toEqual({
      latitude: 0,
      longitude: 0,
      accuracyMeters: 0,
    });
  });

  it("requires approved overtime for non-workday attendance", () => {
    expect(() =>
      assertAttendanceDayAllowed({
        isWorkingDay: false,
        hasApprovedOvertime: false,
      }),
    ).toThrow("requires approved overtime");

    expect(() =>
      assertAttendanceDayAllowed({
        isWorkingDay: false,
        hasApprovedOvertime: true,
      }),
    ).not.toThrow();
  });

  it("calculates regular attendance minutes only through work end and subtracts lunch overlap", () => {
    expect(
      calculateAttendanceWorkMinutes({
        checkInTime: "09:00",
        checkOutTime: "18:00",
        policy,
      }),
    ).toBe(450);

    expect(
      calculateAttendanceWorkMinutes({
        checkInTime: "11:30",
        checkOutTime: "12:30",
        policy,
      }),
    ).toBe(0);
  });

  it("preserves the legacy full lunch deduction for attendance but partial overlap for corrections", () => {
    expect(
      calculateCorrectedWorkMinutes({
        checkInTime: "11:30",
        checkOutTime: "12:30",
        policy,
      }),
    ).toBe(30);
  });

  it("preserves correction work-hour cap at 7.5 hours", () => {
    expect(
      calculateCorrectedWorkMinutes({
        checkInTime: "08:00",
        checkOutTime: "19:00",
        policy,
      }),
    ).toBe(450);

    expect(
      calculateCorrectedWorkMinutes({
        checkInTime: "13:00",
        checkOutTime: "14:00",
        policy,
      }),
    ).toBe(60);
  });

  it("validates policy break pairs and positive radius", () => {
    expect(() =>
      normalizeAttendancePolicy({
        ...policy,
        breakEnd: null,
      }),
    ).toThrow("must both be configured");

    expect(() =>
      normalizeAttendancePolicy({
        ...policy,
        radiusKm: 0,
      }),
    ).toThrow("policy is invalid");
  });

  it("rejects future attendance dates for time correction", () => {
    expect(() =>
      assertAttendanceDateNotFuture({
        attendanceDate: "2026-10-06",
        today: "2026-10-05",
      }),
    ).toThrow("future attendance date");

    expect(() =>
      assertAttendanceDateNotFuture({
        attendanceDate: "2026-10-05",
        today: "2026-10-05",
      }),
    ).not.toThrow();
  });

  it("normalizes explicit-record time correction input", () => {
    expect(
      normalizeTimeCorrection({
        attendanceRecordId:
          "00000000-0000-4000-8000-000000000001",
        correctionType: "CHECK_IN",
        correctedTime: "09:15",
        reason: "  forgot to clock in  ",
        clientKey: "attendance-correction-0001",
      }),
    ).toEqual({
      attendanceRecordId:
        "00000000-0000-4000-8000-000000000001",
      correctionType: "CHECK_IN",
      correctedTime: "09:15",
      reason: "forgot to clock in",
      clientKey: "attendance-correction-0001",
    });
  });

  it("requires the original event and a changed correction time", () => {
    expect(() =>
      assertTimeCorrectionOriginalExists({
        correctionType: "CHECK_OUT",
        originalCheckIn: "09:00",
        originalCheckOut: null,
      }),
    ).toThrow("requires an original");

    expect(() =>
      assertTimeCorrectionChanged({
        originalTime: "09:15",
        correctedTime: "09:15",
      }),
    ).toThrow("must differ");
  });

  it("blocks another pending or approved correction for the same target/type", () => {
    expect(() =>
      assertNoActiveTimeCorrection([
        "REJECTED",
        "PENDING",
      ]),
    ).toThrow("already exists");

    expect(() =>
      assertNoActiveTimeCorrection([
        "REJECTED",
        "CANCELLED",
      ]),
    ).not.toThrow();
  });

  it("requires a rejection comment and bounds decision comments", () => {
    expect(() =>
      normalizeTimeCorrectionDecision({
        decision: "REJECTED",
        comment: " ",
      }),
    ).toThrow("requires a comment");

    expect(
      normalizeTimeCorrectionDecision({
        decision: "APPROVED",
        comment: " ok ",
      }),
    ).toEqual({
      decision: "APPROVED",
      comment: "ok",
    });
  });

  it("uses haversine distance in kilometers", () => {
    expect(
      attendanceDistanceKm(
        { latitude: 13.84574, longitude: 100.439546 },
        { latitude: 13.84574, longitude: 100.439546 },
      ),
    ).toBe(0);
  });
});
