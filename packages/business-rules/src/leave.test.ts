import { describe, expect, it } from "vitest";

import {
  calculateLeaveUnits,
  defaultLeaveWorkingCalendar,
  normalizeClientKey,
  normalizeLeaveDescription,
  normalizeLeavePeriod,
} from "./leave";

describe("leave business rules", () => {
  it("counts only configured working weekdays and excludes holidays", () => {
    const period = normalizeLeavePeriod({
      startDate: "2026-10-05",
      endDate: "2026-10-09",
      durationCode: "FULL_DAY",
    });
    const calendar = defaultLeaveWorkingCalendar([
      "2026-10-07",
    ]);

    expect(calculateLeaveUnits(period, calendar)).toBe(4);
  });

  it("maps morning and afternoon to 0.5 day on one working day", () => {
    const calendar = defaultLeaveWorkingCalendar();

    expect(
      calculateLeaveUnits(
        normalizeLeavePeriod({
          startDate: "2026-10-05",
          endDate: "2026-10-05",
          durationCode: "MORNING",
        }),
        calendar,
      ),
    ).toBe(0.5);

    expect(
      calculateLeaveUnits(
        normalizeLeavePeriod({
          startDate: "2026-10-05",
          endDate: "2026-10-05",
          durationCode: "AFTERNOON",
        }),
        calendar,
      ),
    ).toBe(0.5);
  });

  it("preserves legacy timed-leave semantics as hours divided by eight", () => {
    const period = normalizeLeavePeriod({
      startDate: "2026-10-05",
      endDate: "2026-10-05",
      durationCode: "HOURLY",
      startTime: "09:00",
      endTime: "11:30",
    });

    expect(
      calculateLeaveUnits(
        period,
        defaultLeaveWorkingCalendar(),
      ),
    ).toBe(0.3125);
  });

  it("counts no hourly leave on a weekend or company holiday", () => {
    const hourly = (date: string) =>
      normalizeLeavePeriod({
        startDate: date,
        endDate: date,
        durationCode: "HOURLY",
        startTime: "09:00",
        endTime: "11:00",
      });

    expect(calculateLeaveUnits(hourly("2026-10-10"), defaultLeaveWorkingCalendar())).toBe(0);
    expect(
      calculateLeaveUnits(hourly("2026-10-13"), defaultLeaveWorkingCalendar(["2026-10-13"])),
    ).toBe(0);
  });

  it("requires hourly leave to remain within one day", () => {
    expect(() =>
      normalizeLeavePeriod({
        startDate: "2026-10-05",
        endDate: "2026-10-06",
        durationCode: "HOURLY",
        startTime: "09:00",
        endTime: "10:00",
      }),
    ).toThrow("one calendar day");
  });

  it("preserves legacy multi-day and cross-year day-based calculation", () => {
    expect(() =>
      normalizeLeavePeriod({
        startDate: "2026-12-31",
        endDate: "2027-01-04",
        durationCode: "FULL_DAY",
      }),
    ).not.toThrow();

    expect(() =>
      normalizeLeavePeriod({
        startDate: "2026-10-05",
        endDate: "2026-10-06",
        durationCode: "MORNING",
      }),
    ).not.toThrow();
  });

  it("requires valid timed-leave clocks", () => {
    expect(() =>
      normalizeLeavePeriod({
        startDate: "2026-10-05",
        endDate: "2026-10-05",
        durationCode: "HOURLY",
        startTime: "11:00",
        endTime: "10:00",
      }),
    ).toThrow("after start time");
  });

  it("validates description and client-key boundaries", () => {
    expect(normalizeLeaveDescription("  sick  ")).toBe("sick");
    expect(normalizeClientKey("leave-1234")).toBe("leave-1234");
    expect(() => normalizeLeaveDescription(" ")).toThrow();
    expect(() => normalizeClientKey("short")).toThrow();
  });
});
