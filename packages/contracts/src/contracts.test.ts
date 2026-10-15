import { describe, expect, it } from "vitest";

import { LEGACY_ONLY_ROUTING, legacyProvenanceKey } from "./index";

describe("foundation contracts", () => {
  it("defaults every module route to legacy", () => {
    expect(new Set(Object.values(LEGACY_ONLY_ROUTING))).toEqual(new Set(["LEGACY"]));
  });

  it("source-qualifies reused legacy identifiers", () => {
    const current = legacyProvenanceKey({
      sourceSystem: "APP_LEAVE_GAS",
      sourceWorkbook: "Data_CK&RR_Requests",
      sourceTab: "TimeLog",
      sourcePeriod: "CURRENT",
      legacyId: "LOG-000001",
    });

    const archive = legacyProvenanceKey({
      sourceSystem: "APP_LEAVE_GAS",
      sourceWorkbook: "Data_CK&RR_Requests",
      sourceTab: "TimeLog_2025",
      sourcePeriod: "2025",
      legacyId: "LOG-000001",
    });

    expect(current).not.toBe(archive);
  });
});
