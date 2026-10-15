import { describe, expect, it } from "vitest";

import {
  assertLeaveQuotaAvailable,
  calculateLeaveUsageDays,
} from "./leave-rules";

const weekdays = {
  workingIsoWeekdays: [1, 2, 3, 4, 5],
  holidays: ["2026-10-06"],
} as const;

describe("leave usage rules", () => {
  it("counts only configured working days and excludes holidays", () => {
    expect(
      calculateLeaveUsageDays(
        {
          startDate: "2026-10-05",
          endDate: "2026-10-09",
          duration: "FULL_DAY",
          startTime: null,
          endTime: null,
        },
        weekdays,
      ),
    ).toBe(4);
  });

  it("preserves AM/PM as half of each working day", () => {
    expect(
      calculateLeaveUsageDays(
        {
          startDate: "2026-10-05",
          endDate: "2026-10-07",
          duration: "MORNING",
          startTime: null,
          endTime: null,
        },
        weekdays,
      ),
    ).toBe(1);
  });

  it("preserves legacy hourly conversion of 8 hours to one day", () => {
    expect(
      calculateLeaveUsageDays(
        {
          startDate: "2026-10-05",
          endDate: "2026-10-05",
          duration: "HOURLY",
          startTime: "09:00",
          endTime: "11:30",
        },
        weekdays,
      ),
    ).toBe(0.3125);
  });

  it("fails closed for cross-date/invalid hourly leave", () => {
    expect(() =>
      calculateLeaveUsageDays(
        {
          startDate: "2026-10-05",
          endDate: "2026-10-06",
          duration: "HOURLY",
          startTime: "09:00",
          endTime: "10:00",
        },
        weekdays,
      ),
    ).toThrow("one calendar day");

    expect(() =>
      calculateLeaveUsageDays(
        {
          startDate: "2026-10-05",
          endDate: "2026-10-05",
          duration: "HOURLY",
          startTime: "10:00",
          endTime: "09:00",
        },
        weekdays,
      ),
    ).toThrow("after start time");
  });

  it("requires real calendar policy for day-based leave", () => {
    expect(() =>
      calculateLeaveUsageDays(
        {
          startDate: "2026-10-05",
          endDate: "2026-10-05",
          duration: "FULL_DAY",
          startTime: null,
          endTime: null,
        },
        { workingIsoWeekdays: [], holidays: [] },
      ),
    ).toThrow("calendar is unavailable");
  });

  it("enforces quota without silently manufacturing entitlement", () => {
    expect(() =>
      assertLeaveQuotaAvailable({
        quota: 5,
        used: 4.5,
        requested: 1,
      }),
    ).toThrow("exceeded");

    expect(() =>
      assertLeaveQuotaAvailable({
        quota: 5,
        used: 4,
        requested: 1,
      }),
    ).not.toThrow();
  });
});
