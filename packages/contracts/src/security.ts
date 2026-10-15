export type AuthenticatedBy =
  | "LEGACY_DESKTOP_BRIDGE"
  | "LINE_LIFF"
  | "PROJECT_B_WEB";

export type AuthorizationScope =
  | "SELF"
  | "AGENCY"
  | "DEPARTMENT"
  | "GLOBAL";

export interface AuthorizationTarget {
  readonly employeeId?: string | null;
  readonly agencyId?: string | null;
  readonly departmentId?: string | null;
}

export interface PermissionRequirement {
  readonly permission: string;
  readonly scope: AuthorizationScope;
}
