export type AuthorityTarget = "LEGACY" | "NEW";

export type ModuleAccessMode = "READ" | "WRITE";

export const MODULE_ROUTE_DEFINITIONS = Object.freeze({
  IDENTITY_READ: { module: "IDENTITY", access: "READ" },
  IDENTITY_WRITE: { module: "IDENTITY", access: "WRITE" },
  LEAVE_READ: { module: "LEAVE", access: "READ" },
  LEAVE_WRITE: { module: "LEAVE", access: "WRITE" },
  ATTENDANCE_READ: { module: "ATTENDANCE", access: "READ" },
  ATTENDANCE_WRITE: { module: "ATTENDANCE", access: "WRITE" },
  TIME_CORRECTION_READ: { module: "TIME_CORRECTION", access: "READ" },
  TIME_CORRECTION_WRITE: { module: "TIME_CORRECTION", access: "WRITE" },
  OT_READ: { module: "OT", access: "READ" },
  OT_WRITE: { module: "OT", access: "WRITE" },
  MEDICAL_READ: { module: "MEDICAL", access: "READ" },
  MEDICAL_WRITE: { module: "MEDICAL", access: "WRITE" },
  BENEFITS_READ: { module: "BENEFITS", access: "READ" },
  BENEFITS_WRITE: { module: "BENEFITS", access: "WRITE" },
  REQUEST_STATUS_READ: { module: "REQUEST_STATUS", access: "READ" },
  REQUEST_STATUS_WRITE: { module: "REQUEST_STATUS", access: "WRITE" },
  ATTACHMENTS_READ: { module: "ATTACHMENTS", access: "READ" },
  ATTACHMENTS_WRITE: { module: "ATTACHMENTS", access: "WRITE" },
  ANNOUNCEMENTS_READ: { module: "ANNOUNCEMENTS", access: "READ" },
  ANNOUNCEMENTS_WRITE: { module: "ANNOUNCEMENTS", access: "WRITE" },
  NOTIFICATIONS_READ: { module: "NOTIFICATIONS", access: "READ" },
  NOTIFICATIONS_WRITE: { module: "NOTIFICATIONS", access: "WRITE" },
  ADMIN_READ: { module: "ADMIN", access: "READ" },
  ADMIN_WRITE: { module: "ADMIN", access: "WRITE" },
  ONBOARDING_READ: { module: "ONBOARDING", access: "READ" },
  ONBOARDING_WRITE: { module: "ONBOARDING", access: "WRITE" },
} as const);

export type ModuleRouteKey = keyof typeof MODULE_ROUTE_DEFINITIONS;

export type HrModuleKey =
  (typeof MODULE_ROUTE_DEFINITIONS)[ModuleRouteKey]["module"];

export interface ModuleRouteDefinition {
  readonly module: HrModuleKey;
  readonly access: ModuleAccessMode;
}

export type ModuleRoutingState = Readonly<
  Record<ModuleRouteKey, AuthorityTarget>
>;

export interface ServerModuleRouteContext {
  readonly routeKey: ModuleRouteKey;
  readonly module: HrModuleKey;
  readonly access: ModuleAccessMode;
  readonly authority: AuthorityTarget;
  readonly writeFrozen: boolean;
}

export const MODULE_ROUTE_KEYS = Object.freeze(
  Object.keys(MODULE_ROUTE_DEFINITIONS) as ModuleRouteKey[],
);

export const HR_MODULE_KEYS = Object.freeze(
  Array.from(
    new Set(
      MODULE_ROUTE_KEYS.map(
        (routeKey) => MODULE_ROUTE_DEFINITIONS[routeKey].module,
      ),
    ),
  ) as HrModuleKey[],
);

export const LEGACY_ONLY_ROUTING: ModuleRoutingState =
  Object.freeze(
    Object.fromEntries(
      MODULE_ROUTE_KEYS.map((routeKey) => [routeKey, "LEGACY"]),
    ) as Record<ModuleRouteKey, AuthorityTarget>,
  );
