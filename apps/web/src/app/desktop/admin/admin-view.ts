export interface AdminCapabilities {
  readonly onboarding: boolean;
  readonly announcementAdmin: boolean;
  readonly notifications: boolean;
  readonly managementAdmin: boolean;
  readonly rbacAdmin: boolean;
  readonly passwordRecoveryAdmin: boolean;
  readonly adminSettings: boolean;
}

export interface AdminToolSummary {
  readonly key:
    | "onboarding"
    | "announcements"
    | "notifications"
    | "management"
    | "rbac"
    | "password-recovery"
    | "settings";
  readonly enabled: boolean;
}

export function adminToolSummary(
  capabilities: AdminCapabilities,
): readonly AdminToolSummary[] {
  return [
    { key: "onboarding", enabled: capabilities.onboarding },
    {
      key: "announcements",
      enabled: capabilities.announcementAdmin,
    },
    {
      key: "notifications",
      enabled: capabilities.notifications,
    },
    {
      key: "management",
      enabled: capabilities.managementAdmin,
    },
    {
      key: "rbac",
      enabled: capabilities.rbacAdmin,
    },
    {
      key: "password-recovery",
      enabled: capabilities.passwordRecoveryAdmin,
    },
    {
      key: "settings",
      enabled: capabilities.adminSettings,
    },
  ];
}
