import {
  describe,
  expect,
  it,
} from "vitest";

import {
  desktopNavigationForPermissions,
} from "./desktop-navigation";

describe("Desktop navigation capabilities", () => {
  it("derives display capabilities only from server permissions", () => {
    expect(
      desktopNavigationForPermissions([
        "leave.self.read",
        "leave.approve",
        "medical.self.read",
      ]),
    ).toEqual({
      leave: true,
      requestStatus: false,
      approvals: true,
      leaveApprovals: true,
      timeCorrectionApprovals: false,
      overtimeApprovals: false,
      medicalApprovals: false,
      attendance: false,
      overtime: false,
      medical: true,
      benefits: false,
      announcements: false,
      calendar: false,
      reports: false,
      notifications: false,
      profile: false,
      onboarding: false,
      announcementAdmin: false,
      announcementDeleteAdmin: false,
      managementAdmin: false,
      usersAdmin: false,
      organizationAdmin: false,
      entitlementAdmin: false,
      workCalendarAdmin: false,
      usersAdminWrite: false,
      organizationAdminWrite: false,
      entitlementAdminWrite: false,
      workCalendarAdminWrite: false,
      rbacAdmin: false,
      rbacAdminWrite: false,
      passwordRecoveryAdmin: false,
      adminSettings: false,
      admin: false,
    });
  });

  it("exposes TASK-39.5B surfaces only from their narrow server permissions", () => {
    expect(
      desktopNavigationForPermissions([
        "calendar.leave.read",
        "reports.management.read",
        "users.admin.read",
        "rbac.admin.read",
        "credentials.reset.issue",
      ]),
    ).toMatchObject({
      calendar: true,
      reports: true,
      managementAdmin: true,
      rbacAdmin: true,
      passwordRecoveryAdmin: true,
      admin: true,
    });
  });

  it("does not overload unrelated legacy admin permissions", () => {
    expect(
      desktopNavigationForPermissions([
        "admin.settings.read",
        "onboarding.admin.approve",
      ]),
    ).toMatchObject({
      calendar: false,
      reports: false,
      managementAdmin: false,
      rbacAdmin: false,
      passwordRecoveryAdmin: false,
    });
  });

  it("exposes announcements only from announcements.read", () => {
    expect(
      desktopNavigationForPermissions([
        "announcements.read",
      ]),
    ).toMatchObject({
      announcements: true,
    });

    expect(
      desktopNavigationForPermissions([
        "announcements.admin.write",
      ]),
    ).toMatchObject({
      announcements: false,
    });
  });

  it("exposes notifications only from admin read permission", () => {
    expect(
      desktopNavigationForPermissions([
        "notifications.admin.read",
      ]),
    ).toMatchObject({
      notifications: true,
    });

    expect(
      desktopNavigationForPermissions([
        "notifications.admin.retry",
      ]),
    ).toMatchObject({
      notifications: false,
    });
  });

  it("exposes Profile only from profile.self.read", () => {
    expect(
      desktopNavigationForPermissions([
        "profile.self.read",
      ]),
    ).toMatchObject({
      profile: true,
    });

    expect(
      desktopNavigationForPermissions([
        "admin.settings.read",
      ]),
    ).toMatchObject({
      profile: false,
    });
  });

  it("keeps TASK-39.6 module navigation granular for approval and admin read capabilities", () => {
    expect(
      desktopNavigationForPermissions([
        "overtime.approve",
        "users.admin.read",
        "work_calendar.admin.read",
        "admin.settings.read",
      ]),
    ).toMatchObject({
      approvals: true,
      leaveApprovals: false,
      timeCorrectionApprovals: false,
      overtimeApprovals: true,
      medicalApprovals: false,
      managementAdmin: true,
      usersAdmin: true,
      organizationAdmin: false,
      entitlementAdmin: false,
      workCalendarAdmin: true,
      adminSettings: true,
    });
  });

  it("does not expose the self Medical page to approver-only actors", () => {
    expect(
      desktopNavigationForPermissions([
        "medical.approve",
      ]),
    ).toMatchObject({
      medical: false,
      approvals: true,
      medicalApprovals: true,
    });
  });
});
