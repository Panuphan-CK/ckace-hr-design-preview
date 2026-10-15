import { describe, expect, it } from "vitest";

import { monthGrid } from "./date-picker";
import { addHours, dmyToIso, isoToDmy, thaiDate, thaiDateRange, weekdaysBetween } from "./format";

describe("desktop format helpers", () => {
  it("formats ISO dates in Thai with the Buddhist year", () => {
    expect(thaiDate("2026-10-23")).toBe("23 ต.ค. 2569");
    expect(thaiDate("not-a-date")).toBe("not-a-date");
    expect(thaiDate(null)).toBe("—");
  });

  it("collapses a same-month range", () => {
    expect(thaiDateRange("2026-10-23", "2026-10-24")).toBe("23 ถึง 24 ต.ค. 2569");
    expect(thaiDateRange("2026-10-23", "2026-10-23")).toBe("23 ต.ค. 2569");
    expect(thaiDateRange("2026-09-30", "2026-10-01")).toBe("30 ก.ย. 2569 ถึง 1 ต.ค. 2569");
  });

  it("counts weekdays only", () => {
    expect(weekdaysBetween("2026-10-23", "2026-10-26")).toBe(2);
    expect(weekdaysBetween("2026-10-26", "2026-10-23")).toBe(0);
  });

  it("converts between ISO and DD/MM/YYYY", () => {
    expect(isoToDmy("2026-10-23")).toBe("23/10/2569");
    expect(isoToDmy("")).toBe("");
    expect(dmyToIso("23/10/2569")).toBe("2026-10-23");
    expect(dmyToIso("23/10/2026")).toBe("");
    expect(dmyToIso("31/02/2569")).toBe("");
    expect(dmyToIso("23/13/2569")).toBe("");
    expect(dmyToIso("23/10/25")).toBe("");
  });

  it("builds a Monday-first month grid", () => {
    const grid = monthGrid(2026, 9); // October 2026 starts on a Thursday
    expect(grid.slice(0, 4)).toEqual([null, null, null, "2026-10-01"]);
    expect(grid.length % 7).toBe(0);
    expect(grid.filter(Boolean)).toHaveLength(31);
  });

  it("adds hours to a start time without crossing midnight", () => {
    expect(addHours("13:00", 3)).toBe("16:00");
    expect(addHours("13:30", 1.5)).toBe("15:00");
    expect(addHours("23:00", 2)).toBe("");
    expect(addHours("bad", 1)).toBe("");
  });
});
