import { describe, expect, it } from "vitest";

import {
  assertNoOverlappingLeave,
  leavePeriodsOverlap,
  type LeaveOverlapPeriod,
} from "./leave-overlap";

function full(start: string, end = start): LeaveOverlapPeriod {
  return { startDate: start, endDate: end, durationCode: "FULL_DAY" };
}

describe("leave overlap", () => {
  it("separates different days and detects shared days", () => {
    expect(leavePeriodsOverlap(full("2026-10-05"), full("2026-10-06"))).toBe(
      false,
    );
    expect(
      leavePeriodsOverlap(full("2026-10-05", "2026-10-07"), full("2026-10-07")),
    ).toBe(true);
  });

  it("lets a morning and an afternoon of the same day coexist", () => {
    const morning: LeaveOverlapPeriod = {
      startDate: "2026-10-05",
      endDate: "2026-10-05",
      durationCode: "MORNING",
    };
    const afternoon: LeaveOverlapPeriod = {
      ...morning,
      durationCode: "AFTERNOON",
    };

    expect(leavePeriodsOverlap(morning, afternoon)).toBe(false);
    expect(leavePeriodsOverlap(morning, morning)).toBe(true);
    expect(leavePeriodsOverlap(morning, full("2026-10-05"))).toBe(true);
  });

  it("compares hourly ranges against each other and against half days", () => {
    const hourly = (start: string, end: string): LeaveOverlapPeriod => ({
      startDate: "2026-10-05",
      endDate: "2026-10-05",
      durationCode: "HOURLY",
      startTime: start,
      endTime: end,
    });

    expect(leavePeriodsOverlap(hourly("09:00", "11:00"), hourly("11:00", "12:00"))).toBe(
      false,
    );
    expect(leavePeriodsOverlap(hourly("09:00", "11:30"), hourly("11:00", "12:00"))).toBe(
      true,
    );
    expect(
      leavePeriodsOverlap(hourly("14:00", "16:00"), {
        startDate: "2026-10-05",
        endDate: "2026-10-05",
        durationCode: "MORNING",
      }),
    ).toBe(false);
  });

  it("throws when the requested period collides with an existing one", () => {
    expect(() =>
      assertNoOverlappingLeave(full("2026-10-05"), [full("2026-10-05", "2026-10-06")]),
    ).toThrow("overlaps");
    expect(() =>
      assertNoOverlappingLeave(full("2026-10-07"), [full("2026-10-05", "2026-10-06")]),
    ).not.toThrow();
  });
});
