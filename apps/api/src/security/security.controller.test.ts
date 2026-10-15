import type { InternalActorContext } from "@ckace/auth";
import { UnauthorizedException } from "@nestjs/common";
import {
  describe,
  expect,
  it,
} from "vitest";

import { SecurityController } from "./security.controller";

const actor: InternalActorContext = {
  employeeId: "employee-1",
  legacyUid: "UID-1",
  roles: ["Employee"],
  permissions: ["profile.self.read"],
  agencyId: "agency-1",
  departmentId: "department-1",
  authenticatedBy: "LEGACY_DESKTOP_BRIDGE",
  correlationId: "request-correlation",
};

describe("SecurityController session diagnostics", () => {
  it("returns Unauthorized for signed-out requests", () => {
    expect(() =>
      new SecurityController().getSession({}),
    ).toThrow(UnauthorizedException);
  });

  it("returns only safe server-populated actor metadata", () => {
    expect(
      new SecurityController().getSession({ actor }),
    ).toEqual({
      authenticated: true,
      employeeId: "employee-1",
      authenticatedBy: "LEGACY_DESKTOP_BRIDGE",
      roleCount: 1,
      permissionCount: 1,
      navigation: {
        leave: false,
        requestStatus: false,
        approvals: false,
        leaveApprovals: false,
        timeCorrectionApprovals: false,
        overtimeApprovals: false,
        medicalApprovals: false,
        attendance: false,
        overtime: false,
        medical: false,
        benefits: false,
        announcements: false,
        calendar: false,
        reports: false,
        notifications: false,
        profile: true,
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
      },
      clientRoleAuthority: false,
      correlationId: "request-correlation",
    });
  });
});
