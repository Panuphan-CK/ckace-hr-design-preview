export interface DesktopNavigationCapabilities {
  readonly leave: boolean;
  readonly requestStatus: boolean;
  readonly approvals: boolean;
  readonly leaveApprovals: boolean;
  readonly leaveWithdraw: boolean;
  readonly timeCorrectionApprovals: boolean;
  readonly overtimeApprovals: boolean;
  readonly medicalApprovals: boolean;
  readonly attendance: boolean;
  readonly overtime: boolean;
  readonly medical: boolean;
  readonly benefits: boolean;
  readonly announcements: boolean;
  readonly calendar: boolean;
  readonly reports: boolean;
  readonly notifications: boolean;
  readonly profile: boolean;
  readonly onboarding: boolean;
  readonly announcementAdmin: boolean;
  readonly announcementDeleteAdmin: boolean;
  readonly managementAdmin: boolean;
  readonly usersAdmin: boolean;
  readonly organizationAdmin: boolean;
  readonly entitlementAdmin: boolean;
  readonly workCalendarAdmin: boolean;
  readonly usersAdminWrite: boolean;
  readonly organizationAdminWrite: boolean;
  readonly entitlementAdminWrite: boolean;
  readonly workCalendarAdminWrite: boolean;
  readonly rbacAdmin: boolean;
  readonly rbacAdminWrite: boolean;
  readonly passwordRecoveryAdmin: boolean;
  readonly adminSettings: boolean;
  readonly admin: boolean;
}

export function desktopNavigationForPermissions(
  permissions: readonly string[],
): DesktopNavigationCapabilities {
  const has = (permission: string) =>
    permissions.includes(permission);

  const managementAdmin =
    has("users.admin.read") ||
    has("organization.admin.read") ||
    has("leave.entitlements.admin.read") ||
    has("work_calendar.admin.read");

  return {
    leave: has("leave.self.read"),
    requestStatus: has("requests.self.read"),
    approvals:
      has("requests.approval.read") ||
      has("leave.approve") ||
      has("time_correction.approve") ||
      has("overtime.approve") ||
      has("medical.approve"),
    leaveApprovals: has("leave.approve"),
    leaveWithdraw: has("leave.approved.withdraw"),
    timeCorrectionApprovals: has("time_correction.approve"),
    overtimeApprovals: has("overtime.approve"),
    medicalApprovals: has("medical.approve"),
    attendance: has("attendance.self.read"),
    overtime: has("overtime.self.read"),
    medical: has("medical.self.read"),
    benefits: has("benefits.self.read"),
    announcements: has("announcements.read"),
    calendar: has("calendar.leave.read"),
    reports: has("reports.management.read"),
    notifications: has("notifications.admin.read"),
    profile: has("profile.self.read"),
    onboarding: has("onboarding.admin.approve"),
    announcementAdmin: has("announcements.admin.write"),
    announcementDeleteAdmin: has("announcements.admin.delete"),
    managementAdmin,
    usersAdmin: has("users.admin.read"),
    organizationAdmin: has("organization.admin.read"),
    entitlementAdmin: has("leave.entitlements.admin.read"),
    workCalendarAdmin: has("work_calendar.admin.read"),
    usersAdminWrite: has("users.admin.write"),
    organizationAdminWrite: has("organization.admin.write"),
    entitlementAdminWrite: has("leave.entitlements.admin.write"),
    workCalendarAdminWrite: has("work_calendar.admin.write"),
    rbacAdmin: has("rbac.admin.read"),
    rbacAdminWrite: has("rbac.admin.write"),
    passwordRecoveryAdmin: has("credentials.reset.issue"),
    adminSettings: has("admin.settings.read"),
    admin:
      has("admin.settings.read") ||
      has("onboarding.admin.approve") ||
      has("announcements.admin.write") ||
      has("announcements.admin.delete") ||
      has("notifications.admin.read") ||
      managementAdmin ||
      has("rbac.admin.read") ||
      has("credentials.reset.issue"),
  };
}
