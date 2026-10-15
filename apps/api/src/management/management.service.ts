import type {
  LeaveCalendarView,
  LeaveEntitlementAdminItem,
  LeaveEntitlementOptions,
  ManagedAccountState,
  ManagedEmployeeItem,
  ManagementReportView,
  OrganizationUnitItem,
  RbacAdminView,
  WorkCalendarAdminView,
} from "@ckace/contracts";
import type { ManagementRepository } from "@ckace/database";
import { Inject, Injectable } from "@nestjs/common";

export const MANAGEMENT_REPOSITORY = "CKACE_MANAGEMENT_REPOSITORY";

@Injectable()
export class ManagementService {
  constructor(
    @Inject(MANAGEMENT_REPOSITORY)
    private readonly repository: ManagementRepository,
  ) {}

  calendar(from: Date, to: Date): Promise<LeaveCalendarView> {
    return this.repository.calendar(from, to);
  }

  reports(from: Date, to: Date): Promise<ManagementReportView> {
    return this.repository.reports(from, to);
  }

  employees(): Promise<readonly ManagedEmployeeItem[]> {
    return this.repository.listEmployees();
  }

  updateEmployee(
    employeeId: string,
    input: {
      readonly fullName?: string;
      readonly state?: ManagedAccountState;
      readonly agencyId?: string | null;
      readonly departmentId?: string | null;
    },
    actorEmployeeId: string,
  ): Promise<ManagedEmployeeItem> {
    return this.repository.updateEmployee(employeeId, input, actorEmployeeId);
  }

  setEmployeeRoles(
    employeeId: string,
    roleIds: readonly string[],
    actorEmployeeId: string,
  ): Promise<ManagedEmployeeItem> {
    return this.repository.setEmployeeRoles(
      employeeId,
      roleIds,
      actorEmployeeId,
    );
  }

  agencies(): Promise<readonly OrganizationUnitItem[]> {
    return this.repository.listAgencies();
  }

  createAgency(
    name: string,
    actorEmployeeId: string,
  ): Promise<OrganizationUnitItem> {
    return this.repository.createAgency(name, actorEmployeeId);
  }

  updateAgency(
    id: string,
    input: { readonly name?: string; readonly active?: boolean },
    actorEmployeeId: string,
  ): Promise<OrganizationUnitItem> {
    return this.repository.updateAgency(id, input, actorEmployeeId);
  }

  departments(): Promise<readonly OrganizationUnitItem[]> {
    return this.repository.listDepartments();
  }

  createDepartment(
    name: string,
    actorEmployeeId: string,
  ): Promise<OrganizationUnitItem> {
    return this.repository.createDepartment(name, actorEmployeeId);
  }

  updateDepartment(
    id: string,
    input: { readonly name?: string; readonly active?: boolean },
    actorEmployeeId: string,
  ): Promise<OrganizationUnitItem> {
    return this.repository.updateDepartment(id, input, actorEmployeeId);
  }

  entitlements(): Promise<readonly LeaveEntitlementAdminItem[]> {
    return this.repository.listEntitlements();
  }

  entitlementOptions(): Promise<LeaveEntitlementOptions> {
    return this.repository.entitlementOptions();
  }

  upsertEntitlement(
    input: {
      readonly employeeId: string;
      readonly leaveTypeId: string;
      readonly quota: string;
      readonly validFrom: Date | null;
      readonly validTo: Date | null;
    },
    actorEmployeeId: string,
  ): Promise<LeaveEntitlementAdminItem> {
    return this.repository.upsertEntitlement(input, actorEmployeeId);
  }

  workCalendar(): Promise<WorkCalendarAdminView> {
    return this.repository.workCalendar();
  }

  upsertHoliday(
    input: {
      readonly id?: string;
      readonly holidayDate: Date;
      readonly description: string;
      readonly active: boolean;
    },
    actorEmployeeId: string,
  ): Promise<WorkCalendarAdminView> {
    return this.repository.upsertHoliday(input, actorEmployeeId);
  }

  setWeeklyWorkday(
    isoWeekday: number,
    isWorking: boolean,
    actorEmployeeId: string,
  ): Promise<WorkCalendarAdminView> {
    return this.repository.setWeeklyWorkday(
      isoWeekday,
      isWorking,
      actorEmployeeId,
    );
  }

  rbac(): Promise<RbacAdminView> {
    return this.repository.rbac();
  }

  setRolePermissions(
    roleId: string,
    permissions: readonly string[],
    actorEmployeeId: string,
  ): Promise<RbacAdminView> {
    return this.repository.setRolePermissions(
      roleId,
      permissions,
      actorEmployeeId,
    );
  }
}
