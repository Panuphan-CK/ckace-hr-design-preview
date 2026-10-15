import { describe, expect, it } from "vitest";

import { classifyLegacyAccountState } from "./account-state";

describe("classifyLegacyAccountState", () => {
  it("keeps active users active even without a LINE binding concern", () => {
    expect(
      classifyLegacyAccountState({
        active: true,
        resignationDate: null,
        agencyId: "AGC-001",
        departmentId: "DPM-001",
      }),
    ).toBe("ACTIVE");
  });

  it("distinguishes resigned from pending legacy false status", () => {
    expect(
      classifyLegacyAccountState({
        active: false,
        resignationDate: "01/10/2026",
        agencyId: "AGC-001",
        departmentId: "DPM-001",
      }),
    ).toBe("RESIGNED");

    expect(
      classifyLegacyAccountState({
        active: false,
        resignationDate: null,
        agencyId: null,
        departmentId: null,
      }),
    ).toBe("PENDING");
  });

  it("distinguishes a disabled assigned account from a pending account", () => {
    expect(
      classifyLegacyAccountState({
        active: false,
        resignationDate: null,
        agencyId: "AGC-001",
        departmentId: "DPM-001",
      }),
    ).toBe("INACTIVE");
  });
});
