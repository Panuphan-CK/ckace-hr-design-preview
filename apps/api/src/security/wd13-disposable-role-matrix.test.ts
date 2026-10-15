import { describe, expect, it } from "vitest";

import { desktopNavigationForPermissions } from "./desktop-navigation";

/** WD-13 proposed disposable TEST-only role fixtures, NOT production role policy.
 * These test pure permission-to-navigation projections. No DB, secrets, login or writes.
 */
const employee = [
  "profile.self.read",
  "leave.self.read",
  "requests.self.read",
  "attendance.self.read",
  "overtime.self.read",
  "medical.self.read",
  "benefits.self.read",
  "announcements.read",
];
const approvals = [
  "requests.approval.read",
  "leave.approve",
  "time_correction.approve",
  "overtime.approve",
  "medical.approve",
];
const admin = [
  "notifications.admin.read",
  "notifications.admin.retry",
  "onboarding.admin.approve",
  "announcements.admin.write",
];
const superadmin = ["admin.settings.read"];

function proposedTestPermissions(role: string): string[] {
  switch (role) {
    case "employee": return [...employee];
    case "superuser": return [...employee, ...approvals];
    case "admin": return [...employee, ...approvals, ...admin];
    case "superadmin": return [...employee, ...approvals, ...admin, ...superadmin];
    default: throw new Error("Unknown disposable TEST role");
  }
}

describe("WD-13 synthetic four-role UAT acceptance matrix (no identity provisioned)", () => {
  it.each([
    { role: "employee", canApprove: false, canNotify: false, canOnboard: false, canSettings: false },
    { role: "superuser", canApprove: true, canNotify: false, canOnboard: false, canSettings: false },
    { role: "admin", canApprove: true, canNotify: true, canOnboard: true, canSettings: false },
    { role: "superadmin", canApprove: true, canNotify: true, canOnboard: true, canSettings: true },
  ])("projects fixture $role permissions without exposing higher-level menus", ({ role, canApprove, canNotify, canOnboard, canSettings }) => {
    const nav = desktopNavigationForPermissions(proposedTestPermissions(role));
    expect(nav).toMatchObject({
      profile: true, leave: true, requestStatus: true, attendance: true,
      overtime: true, medical: true, benefits: true, announcements: true,
      approvals: canApprove, notifications: canNotify, onboarding: canOnboard,
      announcementAdmin: canNotify, adminSettings: canSettings, admin: canNotify || canSettings,
    });
  });

  it("rejects undocumented fixture role names and never assigns arbitrary permissions", () => {
    expect(() => proposedTestPermissions("root")).toThrow(/Unknown/);
    expect(proposedTestPermissions("employee")).not.toContain("admin.settings.read");
    expect(proposedTestPermissions("superuser")).not.toContain("notifications.admin.read");
    expect(proposedTestPermissions("admin")).not.toContain("admin.settings.read");
  });
});
