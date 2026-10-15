import { describe, expect, it } from "vitest";

import {
  assertNoOverlappingOvertime,
  assertOvertimeCancelable,
  assertOvertimeDateRangeNotFuture,
  calculateOvertimeRequestedMinutes,
  expandOvertimeDays,
  normalizeOvertimeCreate,
  normalizeOvertimeDecision,
} from "./overtime";

describe("overtime business rules", () => {
  it("normalizes legacy dot clocks and validates safe client keys", () => {
    expect(
      normalizeOvertimeCreate({
        startDate: "2026-10-05",
        endDate: "2026-10-06",
        startTime: "17.30",
        endTime: "20:00",
        reason: " close month ",
        clientKey: "ot-client-0001",
      }),
    ).toEqual({
      startDate: "2026-10-05",
      endDate: "2026-10-06",
      startTime: "17:30",
      endTime: "20:00",
      reason: "close month",
      clientKey: "ot-client-0001",
    });

    expect(() =>
      normalizeOvertimeCreate({
        startDate: "2026-10-05",
        endDate: "2026-10-05",
        startTime: "17:30",
        endTime: "20:00",
        reason: "close month",
        clientKey: "short",
      }),
    ).toThrow("clientKey");
  });

  it("rejects future dates and overnight/equal-end intervals", () => {
    expect(() =>
      assertOvertimeDateRangeNotFuture({
        startDate: "2026-10-05",
        endDate: "2026-10-06",
        today: "2026-10-05",
      }),
    ).toThrow("future");

    expect(() =>
      calculateOvertimeRequestedMinutes(
        "20:00",
        "08:00",
        true,
      ),
    ).toThrow("after start");

    expect(() =>
      calculateOvertimeRequestedMinutes(
        "20:00",
        "20:00",
        false,
      ),
    ).toThrow("after start");
  });

  it("deducts actual lunch overlap on workdays", () => {
    expect(
      calculateOvertimeRequestedMinutes(
        "11:30",
        "14:00",
        true,
      ),
    ).toBe(90);

    expect(
      calculateOvertimeRequestedMinutes(
        "13:00",
        "17:00",
        true,
      ),
    ).toBe(240);
  });

  it("deducts actual lunch and evening-break overlap on non-workdays", () => {
    expect(
      calculateOvertimeRequestedMinutes(
        "11:30",
        "19:00",
        false,
      ),
    ).toBe(330);
    expect(
      calculateOvertimeRequestedMinutes(
        "13:00",
        "21:30",
        false,
      ),
    ).toBe(450);
  });

  it("expands a desktop date range into one daily request", () => {
    const normalized = normalizeOvertimeCreate({
      startDate: "2026-10-05",
      endDate: "2026-10-06",
      startTime: "17:30",
      endTime: "20:00",
      reason: "close month",
      clientKey: "ot-client-0002",
    });

    expect(
      expandOvertimeDays(normalized, [
        { date: "2026-10-05", isWorkday: true },
        { date: "2026-10-06", isWorkday: false },
      ]),
    ).toEqual([
      {
        workDate: "2026-10-05",
        startTime: "17:30",
        endTime: "20:00",
        requestedMinutes: 150,
      },
      {
        workDate: "2026-10-06",
        startTime: "17:30",
        endTime: "20:00",
        requestedMinutes: 90,
      },
    ]);
  });

  it("blocks overlap with active requests but ignores rejected/cancelled rows", () => {
    const requested = {
      workDate: "2026-10-05",
      startTime: "18:00",
      endTime: "20:00",
    };

    expect(() =>
      assertNoOverlappingOvertime(requested, [
        {
          workDate: "2026-10-05",
          startTime: "17:30",
          endTime: "18:30",
          status: "PENDING",
        },
      ]),
    ).toThrow("overlaps");

    expect(() =>
      assertNoOverlappingOvertime(requested, [
        {
          workDate: "2026-10-05",
          startTime: "17:30",
          endTime: "18:30",
          status: "Rejected",
        },
        {
          workDate: "2026-10-05",
          startTime: "18:30",
          endTime: "19:30",
          status: "Cancelled",
        },
      ]),
    ).not.toThrow();
  });

  it("allows owner cancellation only while pending", () => {
    expect(() =>
      assertOvertimeCancelable("Pending"),
    ).not.toThrow();
    expect(() =>
      assertOvertimeCancelable("Approved"),
    ).toThrow("pending");
  });

  it("normalizes approval decisions and requires rejection comments", () => {
    expect(
      normalizeOvertimeDecision({
        decision: "approved",
        comment: " ok ",
      }),
    ).toEqual({
      decision: "APPROVED",
      comment: "ok",
    });

    expect(() =>
      normalizeOvertimeDecision({
        decision: "rejected",
        comment: " ",
      }),
    ).toThrow("requires a comment");

    expect(() =>
      normalizeOvertimeDecision({
        decision: "revise",
      }),
    ).toThrow("APPROVED or REJECTED");
  });
});
