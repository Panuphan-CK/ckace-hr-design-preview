import { describe, expect, it } from "vitest";

import {
  DESKTOP_NAV_ACCESSIBLE_NAMES,
  desktopSectionAccessibleName,
} from "./desktop-nav-accessibility";

describe("desktop navigation accessible names", () => {
  it("names icon-only navigation links and the profile control", () => {
    expect(DESKTOP_NAV_ACCESSIBLE_NAMES).toEqual({
      dashboard: "ภาพรวม",
      calendar: "ปฏิทิน",
      profile: "โปรไฟล์และการแจ้งเตือน",
    });
  });

  it("keeps the approval section name and pending count together", () => {
    expect(desktopSectionAccessibleName("งานอนุมัติ", 3)).toBe(
      "งานอนุมัติ, รออนุมัติ 3 รายการ",
    );
  });

  it("does not announce a pending count when none is present", () => {
    expect(desktopSectionAccessibleName("ยื่นคำขอ")).toBe("ยื่นคำขอ");
    expect(desktopSectionAccessibleName("งานอนุมัติ", 0)).toBe("งานอนุมัติ");
    expect(desktopSectionAccessibleName("งานอนุมัติ", Number.NaN)).toBe("งานอนุมัติ");
  });
});
