import { describe, expect, it } from "vitest";

import { adminToolSummary } from "./admin-view";

describe("Admin Desktop view", () => {
  it("derives tool availability only from server capabilities", () => {
    expect(
      adminToolSummary({
        onboarding: true,
        announcementAdmin: false,
        notifications: true,
        managementAdmin: true,
        rbacAdmin: false,
        passwordRecoveryAdmin: true,
        adminSettings: false,
      }),
    ).toEqual([
      { key: "onboarding", enabled: true },
      { key: "announcements", enabled: false },
      { key: "notifications", enabled: true },
      { key: "management", enabled: true },
      { key: "rbac", enabled: false },
      { key: "password-recovery", enabled: true },
      { key: "settings", enabled: false },
    ]);
  });
});
