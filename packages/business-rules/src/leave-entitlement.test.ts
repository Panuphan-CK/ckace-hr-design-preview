import { describe, expect, it } from "vitest";

import {
  completedServiceYears,
  vacationDaysForTenure,
  vacationEntitlementForYear,
} from "./leave-entitlement";

describe("vacation days by length of service", () => {
  it("counts only completed years", () => {
    expect(completedServiceYears("2024-06-15", "2025-06-14")).toBe(0);
    expect(completedServiceYears("2024-06-15", "2025-06-15")).toBe(1);
    expect(completedServiceYears("2020-02-29", "2024-02-28")).toBe(3);
    expect(completedServiceYears("2026-01-01", "2025-01-01")).toBe(0);
  });

  it("applies the Owner tier table", () => {
    expect(vacationDaysForTenure(0)).toBe(5);
    expect(vacationDaysForTenure(1)).toBe(6);
    expect(vacationDaysForTenure(3)).toBe(6);
    expect(vacationDaysForTenure(4)).toBe(7);
    expect(vacationDaysForTenure(6)).toBe(7);
    expect(vacationDaysForTenure(7)).toBe(8);
    expect(vacationDaysForTenure(9)).toBe(8);
    expect(vacationDaysForTenure(10)).toBe(10);
    expect(vacationDaysForTenure(25)).toBe(10);
  });

  it("measures tenure on 1 January of the leave year by default", () => {
    expect(
      vacationEntitlementForYear({
        employmentStart: "2025-08-01",
        leaveYear: 2026,
      }),
    ).toBe(5);
    expect(
      vacationEntitlementForYear({
        employmentStart: "2025-01-01",
        leaveYear: 2026,
      }),
    ).toBe(6);
    expect(
      vacationEntitlementForYear({
        employmentStart: "2016-12-31",
        leaveYear: 2026,
      }),
    ).toBe(8);
    expect(
      vacationEntitlementForYear({
        employmentStart: "2016-01-01",
        leaveYear: 2026,
      }),
    ).toBe(10);
  });

  it("can measure on another date and accepts custom tiers", () => {
    expect(
      vacationEntitlementForYear({
        employmentStart: "2024-07-01",
        leaveYear: 2026,
        asOf: "2026-07-01",
      }),
    ).toBe(6);
    expect(
      vacationDaysForTenure(2, [
        { belowYears: 2, days: 3 },
        { belowYears: Number.POSITIVE_INFINITY, days: 4 },
      ]),
    ).toBe(4);
  });

  it("rejects invalid input", () => {
    expect(() => vacationDaysForTenure(-1)).toThrow("whole");
    expect(() =>
      vacationEntitlementForYear({
        employmentStart: "2026-13-01",
        leaveYear: 2026,
      }),
    ).toThrow("invalid");
    expect(() =>
      vacationEntitlementForYear({
        employmentStart: "2020-01-01",
        leaveYear: 1999,
      }),
    ).toThrow("year");
  });
});
