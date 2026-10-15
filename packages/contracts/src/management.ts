import type { UnifiedRequestStatus } from "./request-status";

export interface ManagementDateRange {
  readonly from: string;
  readonly to: string;
}

export interface LeaveCalendarItem {
  readonly id: string;
  readonly employeeId: string;
  readonly employeeName: string;
  readonly leaveType: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly durationCode: "FULL_DAY" | "HOURLY" | "MORNING" | "AFTERNOON";
  readonly status: UnifiedRequestStatus;
  readonly currentApprovalStep: number | null;
}

export interface LeaveCalendarView extends ManagementDateRange {
  readonly items: readonly LeaveCalendarItem[];
}

export interface ManagementReportRow {
  readonly id: string;
  readonly employeeId: string;
  readonly employeeName: string;
  readonly kind: "LEAVE" | "ATTENDANCE" | "OVERTIME" | "MEDICAL";
  readonly date: string;
  readonly status: string;
  readonly summary: string;
  readonly amount?: string;
}

export interface ManagementReportView extends ManagementDateRange {
  readonly totals: {
    readonly leave: number;
    readonly attendance: number;
    readonly overtime: number;
    readonly medical: number;
  };
  readonly rows: readonly ManagementReportRow[];
}

export type ManagedAccountState = "ACTIVE" | "PENDING" | "INACTIVE" | "RESIGNED";

export type RoleScopeKind = "PLATFORM" | "COMPANY" | "TEAM_SET" | "SELF";

export interface ManagedRoleAssignment {
  readonly roleId: string;
  readonly roleKey: string;
  readonly scopeType: RoleScopeKind;
  readonly scopeCompanyId: string | null;
  readonly scopeAgencyIds: readonly string[];
}

export interface RoleAssignmentInput {
  readonly roleId: string;
  readonly scopeType: RoleScopeKind;
  readonly scopeCompanyId?: string | null;
  readonly scopeAgencyIds?: readonly string[];
}

export interface ManagedEmployeeItem {
  readonly id: string;
  readonly fullName: string;
  readonly loginName: string | null;
  readonly state: ManagedAccountState | null;
  readonly agencyId: string | null;
  readonly agencyName: string | null;
  readonly departmentId: string | null;
  readonly departmentName: string | null;
  readonly companyId: string | null;
  readonly companyName: string | null;
  readonly managerEmployeeId: string | null;
  readonly managerName: string | null;
  readonly roles: readonly { readonly id: string; readonly key: string; readonly name: string }[];
  readonly roleAssignments: readonly ManagedRoleAssignment[];
}

export interface OrganizationUnitItem {
  readonly id: string;
  readonly name: string;
  readonly active: boolean;
  /** Teams (agencies) only: the company the team belongs to. */
  readonly companyId?: string | null;
  readonly companyName?: string | null;
}

export interface LeaveEntitlementAdminItem {
  readonly id: string;
  readonly employeeId: string;
  readonly employeeName: string;
  readonly leaveTypeId: string;
  readonly leaveTypeKey: string;
  readonly leaveTypeName: string;
  readonly quota: string;
  readonly validFrom: string | null;
  readonly validTo: string | null;
}

export interface LeaveEntitlementOptions {
  readonly employees: readonly { readonly id: string; readonly name: string }[];
  readonly leaveTypes: readonly { readonly id: string; readonly key: string; readonly name: string }[];
}

export interface HolidayAdminItem {
  readonly id: string;
  readonly holidayDate: string;
  readonly description: string;
  readonly active: boolean;
}

export interface WeeklyWorkdayAdminItem {
  readonly id: string;
  readonly isoWeekday: number;
  readonly isWorking: boolean;
}

export interface WorkCalendarAdminView {
  readonly holidays: readonly HolidayAdminItem[];
  readonly weeklyWorkdays: readonly WeeklyWorkdayAdminItem[];
}

export interface RolePermissionAdminItem {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly description: string | null;
  readonly permissions: readonly string[];
}

export interface RbacAdminView {
  readonly roles: readonly RolePermissionAdminItem[];
  readonly permissionCatalog: readonly string[];
}
