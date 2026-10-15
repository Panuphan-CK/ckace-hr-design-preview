import { describe, expect, it } from "vitest";

import {
  enabledProfileCapabilities,
  profileAccountStateClass,
  profileAccountStateLabel,
  profileInitials,
} from "./profile-view";

describe("Desktop Profile view helpers", () => {
  it("derives initials from nickname before full name", () => {
    expect(
      profileInitials({
        fullName: "Somchai Example",
        nickname: "Beam",
      }),
    ).toBe("BE");
  });

  it("renders canonical account state labels", () => {
    expect(profileAccountStateLabel("ACTIVE")).toBe("ใช้งานอยู่");
    expect(profileAccountStateLabel("RESIGNED")).toBe("พ้นสภาพ");
    expect(profileAccountStateClass("PENDING")).toBe(
      "profile-account-state state-pending",
    );
  });

  it("returns only enabled server-derived functional capabilities", () => {
    expect(
      enabledProfileCapabilities({
        leave: true,
        requestStatus: true,
        approvals: false,
        attendance: true,
        overtime: false,
        medical: false,
        benefits: false,
        announcements: true,
        notifications: false,
        profile: true,
        admin: false,
      }),
    ).toEqual([
      "การลา",
      "สถานะคำขอ",
      "เวลาเข้างาน",
      "ข่าวสาร",
      "โปรไฟล์",
    ]);
  });
});
