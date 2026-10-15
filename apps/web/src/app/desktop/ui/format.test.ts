import { describe, expect, it } from "vitest";

import { addHours, dmyToIso, isoToDmy, maskDmy, thaiDate, thaiDateRange, weekdaysBetween } from "./format";

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
    expect(dmyToIso("23/10/2026")).toBe("2026-10-23");
    expect(dmyToIso("31/02/2569")).toBe("");
    expect(dmyToIso("23/13/2569")).toBe("");
    expect(dmyToIso("23/10/25")).toBe("");
  });

  it("masks typed digits into DD/MM/YYYY", () => {
    expect(maskDmy("2")).toBe("2");
    expect(maskDmy("2310")).toBe("23/10");
    expect(maskDmy("23102569")).toBe("23/10/2569");
    expect(maskDmy("23/10/2569999")).toBe("23/10/2569");
  });

  it("adds hours to a start time without crossing midnight", () => {
    expect(addHours("13:00", 3)).toBe("16:00");
    expect(addHours("13:30", 1.5)).toBe("15:00");
    expect(addHours("23:00", 2)).toBe("");
    expect(addHours("bad", 1)).toBe("");
  });
});
