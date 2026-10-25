export type DesktopRouteCapability =
  | "admin"
  | "announcementAdmin"
  | "announcements"
  | "attendance"
  | "benefits"
  | "calendar"
  | "delegation"
  | "entitlementAdmin"
  | "leave"
  | "leaveApprovals"
  | "medical"
  | "medicalApprovals"
  | "notifications"
  | "onboarding"
  | "organizationAdmin"
  | "overtime"
  | "overtimeApprovals"
  | "profile"
  | "rbacAdmin"
  | "reports"
  | "requestStatus"
  | "timeCorrectionApprovals"
  | "usersAdmin"
  | "workCalendarAdmin";

type NavigationCapabilities = Readonly<Partial<Record<DesktopRouteCapability, boolean>>>;

function normalizePath(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

/**
 * Return the capability required by a Desktop URL. Multiple capabilities mean
 * that any one of them is sufficient (for example, read-only announcements or
 * announcement administration).
 *
 * Unknown routes are left to Next's own 404 handling. Known routes fail closed
 * before their page component is mounted when the session lacks the capability.
 */
export function desktopRouteCapabilities(
  pathname: string,
  hash = "",
): readonly DesktopRouteCapability[] | null {
  const path = normalizePath(pathname);

  if (path === "/desktop") return null;
  if (path === "/desktop/calendar") return ["calendar"];
  if (path === "/desktop/leave") return ["leave"];
  if (path === "/desktop/overtime") return ["overtime"];
  if (path === "/desktop/time-correction") return ["attendance"];
  if (path === "/desktop/attendance") return ["attendance"];
  if (path === "/desktop/medical") return ["medical"];
  if (path === "/desktop/requests") return ["requestStatus"];
  if (path === "/desktop/delegation") return ["delegation"];
  if (path === "/desktop/onboarding") return ["onboarding"];
  if (path === "/desktop/notifications") return ["notifications"];
  if (path === "/desktop/profile" || path === "/desktop/inbox") return ["profile"];
  if (path === "/desktop/benefits") return ["benefits"];

  if (path === "/desktop/approvals") {
    if (hash === "#leave") return ["leaveApprovals"];
    if (hash === "#overtime") return ["overtimeApprovals"];
    if (hash === "#time-correction") return ["timeCorrectionApprovals"];
    if (hash === "#medical") return ["medicalApprovals"];
    return ["leaveApprovals", "overtimeApprovals", "timeCorrectionApprovals", "medicalApprovals"];
  }

  if (path === "/desktop/reports" || path.startsWith("/desktop/reports/")) {
    return ["reports"];
  }

  if (path === "/desktop/announcements/manage") return ["announcementAdmin"];
  if (path === "/desktop/announcements") return ["announcements", "announcementAdmin"];

  if (path === "/desktop/admin") return ["admin"];
  if (path === "/desktop/admin/management" || path.startsWith("/desktop/admin/management/")) {
    if (hash === "#entitlements") return ["entitlementAdmin"];
    if (hash === "#work-calendar") return ["workCalendarAdmin"];
    if (hash === "#users") return ["usersAdmin"];
    if (hash === "#organization") return ["organizationAdmin"];
    if (hash === "#roles") return ["rbacAdmin"];
    return [
      "organizationAdmin",
      "rbacAdmin",
      "usersAdmin",
      "entitlementAdmin",
      "workCalendarAdmin",
    ];
  }
  if (path === "/desktop/admin/professional-roles") return ["usersAdmin"];
  if (path === "/desktop/admin/approval-policies") return ["rbacAdmin"];
  if (path === "/desktop/admin/overtime-allowance") return ["organizationAdmin"];
  if (path === "/desktop/admin/medical-policy") return ["organizationAdmin"];
  if (path === "/desktop/admin/attendance-policy") return ["organizationAdmin"];

  return null;
}

export function canAccessDesktopRoute(
  navigation: NavigationCapabilities,
  pathname: string,
  hash = "",
): boolean {
  const required = desktopRouteCapabilities(pathname, hash);
  return required === null || required.some((capability) => navigation[capability] === true);
}
