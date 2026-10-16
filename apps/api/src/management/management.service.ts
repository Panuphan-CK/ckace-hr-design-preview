import type {
  LeaveCalendarView,
  LeaveEntitlementAdminItem,
  LeaveEntitlementOptions,
  ApprovalPolicyInput,
  ApprovalPolicyItem,
  OvertimeAllowancePolicyItem,
  OvertimeReportRow,
  ProfessionalRoleItem,
  VacationGenerationResult,
  ManagedAccountState,
  ManagedEmployeeItem,
  ManagementReportView,
  OrganizationUnitItem,
  RbacAdminView,
  RoleAssignmentInput,
  WorkCalendarAdminView,
} from "@ckace/contracts";
import type {
  ManagementRepository,
  OvertimeReportFilters,
} from "@ckace/database";
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
      readonly companyId?: string | null;
      readonly managerEmployeeId?: string | null;
      readonly approvalRouteMode?: "STANDARD" | "MANAGER_FIRST";
      readonly overtimeTransportSatang?: number;
      readonly attendanceExempt?: boolean;
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

  setEmployeeRoleAssignments(
    employeeId: string,
    assignments: readonly RoleAssignmentInput[],
    actorEmployeeId: string,
  ): Promise<ManagedEmployeeItem> {
    return this.repository.setEmployeeRoleAssignments(
      employeeId,
      assignments,
      actorEmployeeId,
    );
  }

  companies(): Promise<readonly OrganizationUnitItem[]> {
    return this.repository.listCompanies();
  }

  createCompany(
    name: string,
    actorEmployeeId: string,
  ): Promise<OrganizationUnitItem> {
    return this.repository.createCompany(name, actorEmployeeId);
  }

  updateCompany(
    id: string,
    input: { readonly name?: string; readonly active?: boolean },
    actorEmployeeId: string,
  ): Promise<OrganizationUnitItem> {
    return this.repository.updateCompany(id, input, actorEmployeeId);
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
    input: {
      readonly name?: string;
      readonly active?: boolean;
      readonly companyId?: string | null;
    },
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

  overtimeAllowancePolicies(): Promise<readonly OvertimeAllowancePolicyItem[]> {
    return this.repository.listOvertimeAllowancePolicies();
  }

  saveOvertimeAllowancePolicy(
    input: OvertimeAllowancePolicyItem,
    actorEmployeeId: string,
  ): Promise<OvertimeAllowancePolicyItem> {
    return this.repository.saveOvertimeAllowancePolicy(input, actorEmployeeId);
  }

  approvalPolicies(): Promise<readonly ApprovalPolicyItem[]> {
    return this.repository.listApprovalPolicies();
  }

  saveApprovalPolicy(
    input: ApprovalPolicyInput,
    actorEmployeeId: string,
  ): Promise<ApprovalPolicyItem> {
    return this.repository.saveApprovalPolicy(input, actorEmployeeId);
  }

  professionalRoles(): Promise<readonly ProfessionalRoleItem[]> {
    return this.repository.listProfessionalRoles();
  }

  createProfessionalRole(
    input: { readonly key: string; readonly name: string; readonly attendanceExempt: boolean },
    actorEmployeeId: string,
  ): Promise<ProfessionalRoleItem> {
    return this.repository.createProfessionalRole(input, actorEmployeeId);
  }

  updateProfessionalRole(
    id: string,
    input: {
      readonly name?: string;
      readonly attendanceExempt?: boolean;
      readonly active?: boolean;
    },
    actorEmployeeId: string,
  ): Promise<ProfessionalRoleItem> {
    return this.repository.updateProfessionalRole(id, input, actorEmployeeId);
  }

  setEmployeeProfessionalRoles(
    employeeId: string,
    professionalRoleIds: readonly string[],
    actorEmployeeId: string,
  ) {
    return this.repository.setEmployeeProfessionalRoles(
      employeeId,
      professionalRoleIds,
      actorEmployeeId,
    );
  }

  overtimeReport(
    filters: OvertimeReportFilters,
    actorEmployeeId: string,
  ): Promise<readonly OvertimeReportRow[]> {
    return this.repository.overtimeReport(filters, actorEmployeeId);
  }

  generateVacationEntitlements(
    year: number,
    actorEmployeeId: string,
  ): Promise<VacationGenerationResult> {
    return this.repository.generateVacationEntitlements(year, actorEmployeeId);
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
