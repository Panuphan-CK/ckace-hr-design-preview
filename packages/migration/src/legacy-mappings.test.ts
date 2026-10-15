import { describe, expect, it } from "vitest";

import {
  mapLegacyLeaveDuration,
  mapLegacyLeaveType,
  mapLegacyRequestStatus,
  parseLegacyDateDdMmYyyy,
} from "./legacy-mappings";

describe("legacy explicit mappings", () => {
  it.each([
    ["F", "FULL_DAY"],
    ["H", "HOURLY"],
    ["AM", "MORNING"],
    ["PM", "AFTERNOON"],
  ] as const)("maps leave duration %s explicitly", (legacyCode, expected) => {
    expect(mapLegacyLeaveDuration(legacyCode)).toBe(expected);
  });

  it.each([
    ["Pending", "PENDING"],
    ["Approved", "APPROVED"],
    ["Rejected", "REJECTED"],
    ["Cancelled", "CANCELLED"],
    ["Revise", "REVISION_REQUESTED"],
    ["รออนุมัติ", "PENDING"],
    ["อนุมัติ", "APPROVED"],
    ["ไม่อนุมัติ", "REJECTED"],
  ] as const)("maps request status %s explicitly", (legacy, expected) => {
    expect(mapLegacyRequestStatus(legacy)).toBe(expected);
  });

  it("normalizes the verified Annual/Vacation alias intentionally", () => {
    expect(mapLegacyLeaveType("Annual")).toBe("ANNUAL");
    expect(mapLegacyLeaveType("Vacation")).toBe("ANNUAL");
    expect(mapLegacyLeaveType("Personal")).toBe("PERSONAL");
    expect(mapLegacyLeaveType("Sick")).toBe("SICK");
  });

  it("parses verified D/M/YYYY and DD/MM/YYYY source dates without timezone inference", () => {
    expect(parseLegacyDateDdMmYyyy("05/10/2026")).toBe("2026-10-05");
    expect(parseLegacyDateDdMmYyyy("5/10/2026")).toBe("2026-10-05");
    expect(parseLegacyDateDdMmYyyy("5/1/2026")).toBe("2026-01-05");
  });

  it("fails closed for unknown or invalid historical values", () => {
    expect(() => mapLegacyLeaveDuration("UNKNOWN")).toThrow(
      "Unknown legacy leave duration code",
    );
    expect(() => mapLegacyRequestStatus("Mystery")).toThrow(
      "Unknown legacy request status",
    );
    expect(() => mapLegacyLeaveType("Other")).toThrow(
      "Unknown legacy leave type",
    );
    expect(() => parseLegacyDateDdMmYyyy("31/02/2026")).toThrow(
      "Invalid legacy calendar date",
    );
  });
});
