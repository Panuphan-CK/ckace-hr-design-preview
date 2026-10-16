import {
  assertValidManager,
  normalizeRoleScope,
} from "@ckace/business-rules";
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
import type { Prisma, PrismaClient } from "@prisma/client";
import { ATTENDANCE_STATS_EMPLOYEE_FILTER, isAttendanceExempt } from "./attendance-exemption";
import {
  loadOvertimeReportRows,
  recordOvertimeReportExport,
  type OvertimeReportFilters,
} from "./overtime-report-repository";
import { generateVacationEntitlementsForYear } from "./vacation-entitlement";

export interface ManagementRepository {
  calendar(from: Date, to: Date): Promise<LeaveCalendarView>;
  reports(from: Date, to: Date): Promise<ManagementReportView>;
  listEmployees(): Promise<readonly ManagedEmployeeItem[]>;
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
  ): Promise<ManagedEmployeeItem>;
  setEmployeeRoleAssignments(
    employeeId: string,
    assignments: readonly RoleAssignmentInput[],
    actorEmployeeId: string,
  ): Promise<ManagedEmployeeItem>;
  listOvertimeAllowancePolicies(): Promise<readonly OvertimeAllowancePolicyItem[]>;
  saveOvertimeAllowancePolicy(
    input: OvertimeAllowancePolicyItem,
    actorEmployeeId: string,
  ): Promise<OvertimeAllowancePolicyItem>;
  listApprovalPolicies(): Promise<readonly ApprovalPolicyItem[]>;
  saveApprovalPolicy(
    input: ApprovalPolicyInput,
    actorEmployeeId: string,
  ): Promise<ApprovalPolicyItem>;
  listProfessionalRoles(): Promise<readonly ProfessionalRoleItem[]>;
  createProfessionalRole(
    input: { readonly key: string; readonly name: string; readonly attendanceExempt: boolean },
    actorEmployeeId: string,
  ): Promise<ProfessionalRoleItem>;
  updateProfessionalRole(
    id: string,
    input: {
      readonly name?: string;
      readonly attendanceExempt?: boolean;
      readonly active?: boolean;
    },
    actorEmployeeId: string,
  ): Promise<ProfessionalRoleItem>;
  setEmployeeProfessionalRoles(
    employeeId: string,
    professionalRoleIds: readonly string[],
    actorEmployeeId: string,
  ): Promise<ManagedEmployeeItem>;
  listCompanies(): Promise<readonly OrganizationUnitItem[]>;
  createCompany(name: string, actorEmployeeId: string): Promise<OrganizationUnitItem>;
  updateCompany(
    id: string,
    input: { readonly name?: string; readonly active?: boolean },
    actorEmployeeId: string,
  ): Promise<OrganizationUnitItem>;
  setEmployeeRoles(
    employeeId: string,
    roleIds: readonly string[],
    actorEmployeeId: string,
  ): Promise<ManagedEmployeeItem>;
  listAgencies(): Promise<readonly OrganizationUnitItem[]>;
  createAgency(name: string, actorEmployeeId: string): Promise<OrganizationUnitItem>;
  updateAgency(
    id: string,
    input: {
      readonly name?: string;
      readonly active?: boolean;
      readonly companyId?: string | null;
    },
    actorEmployeeId: string,
  ): Promise<OrganizationUnitItem>;
  listDepartments(): Promise<readonly OrganizationUnitItem[]>;
  createDepartment(name: string, actorEmployeeId: string): Promise<OrganizationUnitItem>;
  updateDepartment(
    id: string,
    input: { readonly name?: string; readonly active?: boolean },
    actorEmployeeId: string,
  ): Promise<OrganizationUnitItem>;
  listEntitlements(): Promise<readonly LeaveEntitlementAdminItem[]>;
  entitlementOptions(): Promise<LeaveEntitlementOptions>;
  generateVacationEntitlements(
    year: number,
    actorEmployeeId: string,
  ): Promise<VacationGenerationResult>;
  overtimeReport(
    filters: OvertimeReportFilters,
    actorEmployeeId: string,
  ): Promise<readonly OvertimeReportRow[]>;
  upsertEntitlement(
    input: {
      readonly employeeId: string;
      readonly leaveTypeId: string;
      readonly quota: string;
      readonly validFrom: Date | null;
      readonly validTo: Date | null;
    },
    actorEmployeeId: string,
  ): Promise<LeaveEntitlementAdminItem>;
  workCalendar(): Promise<WorkCalendarAdminView>;
  upsertHoliday(
    input: {
      readonly id?: string;
      readonly holidayDate: Date;
      readonly description: string;
      readonly active: boolean;
    },
    actorEmployeeId: string,
  ): Promise<WorkCalendarAdminView>;
  setWeeklyWorkday(
    isoWeekday: number,
    isWorking: boolean,
    actorEmployeeId: string,
  ): Promise<WorkCalendarAdminView>;
  rbac(): Promise<RbacAdminView>;
  setRolePermissions(
    roleId: string,
    permissions: readonly string[],
    actorEmployeeId: string,
  ): Promise<RbacAdminView>;
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

const APPROVAL_POLICY_KINDS = ["LEAVE", "TIME_CORRECTION", "OVERTIME", "MEDICAL"] as const;

const APPROVAL_POLICY_SELECT = {
  id: true,
  requestKind: true,
  agencyId: true,
  name: true,
  active: true,
  agency: { select: { name: true } },
  steps: {
    select: {
      stepOrder: true,
      scope: true,
      requiredRole: { select: { key: true, name: true } },
    },
    orderBy: { stepOrder: "asc" },
  },
} as const;

function approvalPolicyView(row: {
  id: string;
  requestKind: string;
  agencyId: string | null;
  name: string;
  active: boolean;
  agency: { name: string } | null;
  steps: readonly {
    stepOrder: number;
    scope: "SAME_AGENCY" | "SAME_DEPARTMENT" | "GLOBAL";
    requiredRole: { key: string; name: string };
  }[];
}): ApprovalPolicyItem {
  return {
    id: row.id,
    requestKind: row.requestKind as ApprovalPolicyItem["requestKind"],
    agencyId: row.agencyId,
    agencyName: row.agency?.name ?? null,
    name: row.name,
    active: row.active,
    steps: row.steps.map((step) => ({
      stepOrder: step.stepOrder,
      roleKey: step.requiredRole.key,
      roleName: step.requiredRole.name,
      scope: step.scope,
    })),
  };
}

const PROFESSIONAL_ROLE_SELECT = {
  id: true,
  key: true,
  name: true,
  attendanceExempt: true,
  active: true,
} as const;

const MANAGED_EMPLOYEE_SELECT = {
  id: true,
  fullName: true,
  agencyId: true,
  departmentId: true,
  companyId: true,
  managerEmployeeId: true,
  approvalRouteMode: true,
  overtimeTransportSatang: true,
  attendanceExempt: true,
  professionalRoles: {
    select: {
      professionalRole: {
        select: { id: true, key: true, name: true, attendanceExempt: true, active: true },
      },
    },
    orderBy: { assignedAt: "asc" },
  },
  agency: {
    select: {
      name: true,
      companyId: true,
      company: { select: { name: true } },
    },
  },
  department: { select: { name: true } },
  company: { select: { name: true } },
  manager: { select: { fullName: true } },
  userAccount: {
    select: {
      loginName: true,
      state: true,
      roles: {
        select: {
          scopeType: true,
          scopeCompanyId: true,
          scopeAgencyIds: true,
          role: { select: { id: true, key: true, name: true } },
        },
        orderBy: { assignedAt: "asc" },
      },
    },
  },
} as const;

type ManagedEmployeeRow = Prisma.EmployeeGetPayload<{
  select: typeof MANAGED_EMPLOYEE_SELECT;
}>;

function employeeView(row: ManagedEmployeeRow): ManagedEmployeeItem {
  const roleRows = row.userAccount?.roles ?? [];

  return {
    id: row.id,
    fullName: row.fullName,
    loginName: row.userAccount?.loginName ?? null,
    state: (row.userAccount?.state ?? null) as ManagedAccountState | null,
    agencyId: row.agencyId,
    agencyName: row.agency?.name ?? null,
    departmentId: row.departmentId,
    departmentName: row.department?.name ?? null,
    companyId: row.companyId ?? row.agency?.companyId ?? null,
    companyName: row.company?.name ?? row.agency?.company?.name ?? null,
    managerEmployeeId: row.managerEmployeeId,
    managerName: row.manager?.fullName ?? null,
    approvalRouteMode: row.approvalRouteMode,
    overtimeTransportSatang: row.overtimeTransportSatang,
    attendanceExempt: row.attendanceExempt,
    attendanceExemptEffective: isAttendanceExempt(row),
    professionalRoles: row.professionalRoles.map((item) => item.professionalRole),
    roles: roleRows.map(({ role }) => role),
    roleAssignments: roleRows.map((item) => ({
      roleId: item.role.id,
      roleKey: item.role.key,
      scopeType: item.scopeType,
      scopeCompanyId: item.scopeCompanyId,
      scopeAgencyIds: [...(item.scopeAgencyIds ?? [])],
    })),
  };
}

async function loadManagedEmployee(
  tx: Pick<Prisma.TransactionClient, "employee">,
  employeeId: string,
): Promise<ManagedEmployeeItem> {
  const row = await tx.employee.findUnique({
    where: { id: employeeId },
    select: MANAGED_EMPLOYEE_SELECT,
  });
  if (!row) throw new Error("Employee was not found");
  return employeeView(row);
}

export class PrismaManagementRepository implements ManagementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async calendar(from: Date, to: Date): Promise<LeaveCalendarView> {
    const rows = await this.prisma.leaveRequest.findMany({
      where: {
        startDate: { lte: to },
        endDate: { gte: from },
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        requesterEmployeeId: true,
        startDate: true,
        endDate: true,
        durationCode: true,
        status: true,
        requester: { select: { fullName: true } },
        leaveType: { select: { name: true } },
        approvalInstance: { select: { currentStepOrder: true } },
      },
      orderBy: [{ startDate: "asc" }, { submittedAt: "asc" }, { id: "asc" }],
      take: 2000,
    });
    return {
      from: dateOnly(from),
      to: dateOnly(to),
      items: rows.map((row) => ({
        id: row.id,
        employeeId: row.requesterEmployeeId,
        employeeName: row.requester.fullName,
        leaveType: row.leaveType.name,
        startDate: dateOnly(row.startDate),
        endDate: dateOnly(row.endDate),
        durationCode: row.durationCode,
        status: row.status,
        currentApprovalStep: row.approvalInstance?.currentStepOrder ?? null,
      })),
    };
  }

  async reports(from: Date, to: Date): Promise<ManagementReportView> {
    const endExclusive = new Date(to.getTime() + 86_400_000);
    const [leave, attendance, overtime, medical] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: {
          startDate: { gte: from, lte: to },
          status: "APPROVED",
        },
        select: {
          id: true,
          requesterEmployeeId: true,
          startDate: true,
          endDate: true,
          status: true,
          requester: { select: { fullName: true } },
          leaveType: { select: { name: true } },
        },
        orderBy: [{ startDate: "desc" }, { id: "desc" }],
        take: 1000,
      }),
      this.prisma.attendanceRecord.findMany({
        where: {
          workDate: { gte: from, lte: to },
          checkOutAt: { not: null },
          employee: { is: ATTENDANCE_STATS_EMPLOYEE_FILTER },
        },
        select: {
          id: true,
          employeeId: true,
          workDate: true,
          checkInAt: true,
          checkOutAt: true,
          employee: { select: { fullName: true } },
        },
        orderBy: [{ workDate: "desc" }, { id: "desc" }],
        take: 1000,
      }),
      this.prisma.overtimeRequest.findMany({
        where: {
          submittedAt: { gte: from, lt: endExclusive },
          status: "APPROVED",
        },
        select: {
          id: true,
          employeeId: true,
          submittedAt: true,
          status: true,
          reason: true,
          employee: { select: { fullName: true } },
        },
        orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
        take: 1000,
      }),
      this.prisma.medicalClaim.findMany({
        where: {
          sicknessDate: { gte: from, lte: to },
          status: "APPROVED",
        },
        select: {
          id: true,
          employeeId: true,
          sicknessDate: true,
          status: true,
          description: true,
          amount: true,
          employee: { select: { fullName: true } },
        },
        orderBy: [{ sicknessDate: "desc" }, { id: "desc" }],
        take: 1000,
      }),
    ]);
    const rows = [
      ...leave.map((row) => ({
        id: row.id,
        employeeId: row.requesterEmployeeId,
        employeeName: row.requester.fullName,
        kind: "LEAVE" as const,
        date: dateOnly(row.startDate),
        status: row.status,
        summary:
          row.leaveType.name +
          " " +
          dateOnly(row.startDate) +
          " - " +
          dateOnly(row.endDate),
      })),
      ...attendance.map((row) => ({
        id: row.id,
        employeeId: row.employeeId,
        employeeName: row.employee.fullName,
        kind: "ATTENDANCE" as const,
        date: dateOnly(row.workDate),
        status: row.checkOutAt ? "COMPLETED" : "OPEN",
        summary:
          "เข้า " +
          row.checkInAt.toISOString() +
          (row.checkOutAt ? " · ออก " + row.checkOutAt.toISOString() : ""),
      })),
      ...overtime.map((row) => ({
        id: row.id,
        employeeId: row.employeeId,
        employeeName: row.employee.fullName,
        kind: "OVERTIME" as const,
        date: dateOnly(row.submittedAt),
        status: row.status,
        summary: row.reason,
      })),
      ...medical.map((row) => ({
        id: row.id,
        employeeId: row.employeeId,
        employeeName: row.employee.fullName,
        kind: "MEDICAL" as const,
        date: dateOnly(row.sicknessDate),
        status: row.status,
        summary: row.description,
        amount: row.amount.toString(),
      })),
    ].sort((a, b) => b.date.localeCompare(a.date) || a.kind.localeCompare(b.kind));
    return {
      from: dateOnly(from),
      to: dateOnly(to),
      totals: {
        leave: leave.length,
        attendance: attendance.length,
        overtime: overtime.length,
        medical: medical.length,
      },
      rows,
    };
  }

  async listEmployees(): Promise<readonly ManagedEmployeeItem[]> {
    const rows = await this.prisma.employee.findMany({
      select: MANAGED_EMPLOYEE_SELECT,
      orderBy: [{ fullName: "asc" }, { id: "asc" }],
      take: 2000,
    });
    return rows.map(employeeView);
  }

  async updateEmployee(
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
    return this.prisma.$transaction(async (tx) => {
      if (input.companyId) {
        const company = await tx.company.findUnique({
          where: { id: input.companyId },
          select: { id: true },
        });
        if (!company) throw new Error("Company was not found");
      }
      if (input.managerEmployeeId !== undefined) {
        if (input.managerEmployeeId !== null) {
          const manager = await tx.employee.findUnique({
            where: { id: input.managerEmployeeId },
            select: { id: true },
          });
          if (!manager) throw new Error("Manager was not found");
        }
        // Walk the existing hierarchy once so a loop is refused.
        const parents = await tx.employee.findMany({
          select: { id: true, managerEmployeeId: true },
        });
        const managerById = new Map(
          parents.map((row) => [row.id, row.managerEmployeeId]),
        );
        assertValidManager({
          employeeId,
          managerId: input.managerEmployeeId,
          managerOf: (id) => managerById.get(id) ?? null,
        });
      }
      if (input.state) {
        await tx.userAccount.update({
          where: { employeeId },
          data: { state: input.state },
        });
      }
      await tx.employee.update({
        where: { id: employeeId },
        data: {
          ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
          ...(input.agencyId !== undefined ? { agencyId: input.agencyId } : {}),
          ...(input.departmentId !== undefined
            ? { departmentId: input.departmentId }
            : {}),
          ...(input.companyId !== undefined
            ? { companyId: input.companyId }
            : {}),
          ...(input.managerEmployeeId !== undefined
            ? { managerEmployeeId: input.managerEmployeeId }
            : {}),
          ...(input.approvalRouteMode !== undefined
            ? { approvalRouteMode: input.approvalRouteMode }
            : {}),
          ...(input.overtimeTransportSatang !== undefined
            ? { overtimeTransportSatang: input.overtimeTransportSatang }
            : {}),
          ...(input.attendanceExempt !== undefined
            ? { attendanceExempt: input.attendanceExempt }
            : {}),
        },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          actorEmployeeId,
          action: "EMPLOYEE_ADMIN_UPDATED",
          entityType: "Employee",
          entityId: employeeId,
          metadata: {
            fullNameChanged: input.fullName !== undefined,
            state: input.state ?? null,
            agencyChanged: input.agencyId !== undefined,
            departmentChanged: input.departmentId !== undefined,
            companyChanged: input.companyId !== undefined,
            managerChanged: input.managerEmployeeId !== undefined,
            approvalRouteMode: input.approvalRouteMode ?? null,
            overtimeTransportChanged: input.overtimeTransportSatang !== undefined,
            attendanceExempt: input.attendanceExempt ?? null,
          },
        },
      });
      return loadManagedEmployee(tx, employeeId);
    });
  }

  async setEmployeeRoles(
    employeeId: string,
    roleIds: readonly string[],
    actorEmployeeId: string,
  ): Promise<ManagedEmployeeItem> {
    // Legacy endpoint: every role keeps the platform-wide scope.
    return this.setEmployeeRoleAssignments(
      employeeId,
      roleIds.map((roleId) => ({ roleId, scopeType: "PLATFORM" as const })),
      actorEmployeeId,
    );
  }

  async setEmployeeRoleAssignments(
    employeeId: string,
    assignments: readonly RoleAssignmentInput[],
    actorEmployeeId: string,
  ): Promise<ManagedEmployeeItem> {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.userAccount.findUnique({
        where: { employeeId },
        select: { id: true },
      });
      if (!account) throw new Error("User account was not found");

      const roleIds = assignments.map((item) => item.roleId);
      if (new Set(roleIds).size !== roleIds.length) {
        throw new Error("A role can be assigned once per user");
      }
      const roles = await tx.role.findMany({
        where: { id: { in: roleIds } },
        select: { id: true, key: true },
      });
      if (roles.length !== roleIds.length) {
        throw new Error("Unknown role ID");
      }

      const normalized = assignments.map((item) => ({
        roleId: item.roleId,
        ...normalizeRoleScope(item),
      }));
      const companyIds = [
        ...new Set(
          normalized
            .map((item) => item.scopeCompanyId)
            .filter((id): id is string => id !== null),
        ),
      ];
      if (companyIds.length > 0) {
        const found = await tx.company.count({
          where: { id: { in: companyIds } },
        });
        if (found !== companyIds.length) throw new Error("Unknown company ID");
      }
      const teamIds = [
        ...new Set(normalized.flatMap((item) => [...item.scopeAgencyIds])),
      ];
      if (teamIds.length > 0) {
        const found = await tx.agency.count({
          where: { id: { in: teamIds } },
        });
        if (found !== teamIds.length) throw new Error("Unknown team ID");
      }

      await tx.userRole.deleteMany({
        where: { userAccountId: account.id },
      });
      if (normalized.length > 0) {
        await tx.userRole.createMany({
          data: normalized.map((item) => ({
            userAccountId: account.id,
            roleId: item.roleId,
            scopeType: item.scopeType,
            scopeCompanyId: item.scopeCompanyId,
            scopeAgencyIds: [...item.scopeAgencyIds],
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          actorEmployeeId,
          action: "USER_ROLES_REPLACED",
          entityType: "UserAccount",
          entityId: account.id,
          metadata: {
            employeeId,
            assignments: normalized.map((item) => ({
              roleKey: roles.find((role) => role.id === item.roleId)?.key ?? "",
              scopeType: item.scopeType,
              scopeCompanyId: item.scopeCompanyId,
              scopeAgencyIds: [...item.scopeAgencyIds],
            })),
          },
        },
      });

      return loadManagedEmployee(tx, employeeId);
    });
  }

  async listOvertimeAllowancePolicies(): Promise<readonly OvertimeAllowancePolicyItem[]> {
    const rows = await this.prisma.overtimeAllowancePolicy.findMany({
      orderBy: { kind: "asc" },
    });
    return rows.map((row) => ({
      kind: row.kind as OvertimeAllowancePolicyItem["kind"],
      amountSatang: row.amountSatang,
      paidWhenEndsAtOrAfter: row.paidWhenEndsAtOrAfter,
      active: row.active,
    }));
  }

  async saveOvertimeAllowancePolicy(
    input: OvertimeAllowancePolicyItem,
    actorEmployeeId: string,
  ): Promise<OvertimeAllowancePolicyItem> {
    if (input.kind !== "MEAL" && input.kind !== "TRANSPORT") {
      throw new Error("Unsupported allowance kind");
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.paidWhenEndsAtOrAfter)) {
      throw new Error("Threshold must use HH:mm");
    }
    if (
      !Number.isInteger(input.amountSatang) ||
      input.amountSatang < 0 ||
      input.amountSatang > 10_000_000
    ) {
      throw new Error("Amount must be a non-negative whole number of satang");
    }
    // The transport amount is per person (Employee.overtimeTransportSatang); keep the company row at 0.
    const amountSatang = input.kind === "TRANSPORT" ? 0 : input.amountSatang;
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.overtimeAllowancePolicy.upsert({
        where: { kind: input.kind },
        update: {
          amountSatang,
          paidWhenEndsAtOrAfter: input.paidWhenEndsAtOrAfter,
          active: input.active,
        },
        create: {
          kind: input.kind,
          amountSatang,
          paidWhenEndsAtOrAfter: input.paidWhenEndsAtOrAfter,
          active: input.active,
        },
      });
      await tx.auditLog.create({
        data: {
          actorEmployeeId,
          action: "OVERTIME_ALLOWANCE_POLICY_UPDATED",
          entityType: "OvertimeAllowancePolicy",
          entityId: input.kind,
          metadata: {
            amountSatang,
            paidWhenEndsAtOrAfter: input.paidWhenEndsAtOrAfter,
            active: input.active,
          },
        },
      });
      return {
        kind: row.kind as OvertimeAllowancePolicyItem["kind"],
        amountSatang: row.amountSatang,
        paidWhenEndsAtOrAfter: row.paidWhenEndsAtOrAfter,
        active: row.active,
      };
    });
  }

  async listApprovalPolicies(): Promise<readonly ApprovalPolicyItem[]> {
    const rows = await this.prisma.approvalPolicy.findMany({
      where: { requestKind: { in: [...APPROVAL_POLICY_KINDS] } },
      select: APPROVAL_POLICY_SELECT,
      orderBy: [{ requestKind: "asc" }, { agencyId: "asc" }, { id: "asc" }],
    });
    return rows.map(approvalPolicyView);
  }

  async saveApprovalPolicy(
    input: ApprovalPolicyInput,
    actorEmployeeId: string,
  ): Promise<ApprovalPolicyItem> {
    if (!APPROVAL_POLICY_KINDS.includes(input.requestKind)) {
      throw new Error("Unsupported approval policy kind");
    }
    if (input.steps.length < 1 || input.steps.length > 5) {
      throw new Error("An approval policy needs 1 to 5 steps");
    }
    return this.prisma.$transaction(async (tx) => {
      if (input.agencyId) {
        const agency = await tx.agency.findUnique({
          where: { id: input.agencyId },
          select: { id: true },
        });
        if (!agency) throw new Error("Agency was not found");
      }
      const roleKeys = [...new Set(input.steps.map((step) => step.roleKey))];
      const roles = await tx.role.findMany({
        where: { key: { in: roleKeys } },
        select: { id: true, key: true },
      });
      if (roles.length !== roleKeys.length) throw new Error("Unknown approver role");
      const roleId = new Map(roles.map((role) => [role.key, role.id]));
      const existing = await tx.approvalPolicy.findFirst({
        where: { requestKind: input.requestKind, agencyId: input.agencyId },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      const policyId = existing
        ? (
            await tx.approvalPolicy.update({
              where: { id: existing.id },
              data: { name: input.name, active: input.active },
              select: { id: true },
            })
          ).id
        : (
            await tx.approvalPolicy.create({
              data: {
                requestKind: input.requestKind,
                agencyId: input.agencyId,
                name: input.name,
                active: input.active,
              },
              select: { id: true },
            })
          ).id;
      await tx.approvalPolicyStep.deleteMany({ where: { policyId } });
      await tx.approvalPolicyStep.createMany({
        data: input.steps.map((step, index) => ({
          policyId,
          stepOrder: index + 1,
          requiredRoleId: roleId.get(step.roleKey) as string,
          scope: step.scope,
        })),
      });
      await tx.auditLog.create({
        data: {
          actorEmployeeId,
          action: existing ? "APPROVAL_POLICY_UPDATED" : "APPROVAL_POLICY_CREATED",
          entityType: "ApprovalPolicy",
          entityId: policyId,
          metadata: {
            requestKind: input.requestKind,
            agencyId: input.agencyId,
            active: input.active,
            steps: input.steps.map((step) => step.roleKey + ":" + step.scope),
          },
        },
      });
      const row = await tx.approvalPolicy.findUniqueOrThrow({
        where: { id: policyId },
        select: APPROVAL_POLICY_SELECT,
      });
      return approvalPolicyView(row);
    });
  }

  async listProfessionalRoles(): Promise<readonly ProfessionalRoleItem[]> {
    return this.prisma.professionalRole.findMany({
      select: PROFESSIONAL_ROLE_SELECT,
      orderBy: [{ active: "desc" }, { name: "asc" }, { id: "asc" }],
    });
  }

  async createProfessionalRole(
    input: { readonly key: string; readonly name: string; readonly attendanceExempt: boolean },
    actorEmployeeId: string,
  ): Promise<ProfessionalRoleItem> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.professionalRole.create({
        data: input,
        select: PROFESSIONAL_ROLE_SELECT,
      });
      await tx.auditLog.create({
        data: {
          actorEmployeeId,
          action: "PROFESSIONAL_ROLE_CREATED",
          entityType: "ProfessionalRole",
          entityId: row.id,
          metadata: { key: row.key, attendanceExempt: row.attendanceExempt },
        },
      });
      return row;
    });
  }

  async updateProfessionalRole(
    id: string,
    input: {
      readonly name?: string;
      readonly attendanceExempt?: boolean;
      readonly active?: boolean;
    },
    actorEmployeeId: string,
  ): Promise<ProfessionalRoleItem> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.professionalRole.update({
        where: { id },
        data: input,
        select: PROFESSIONAL_ROLE_SELECT,
      });
      await tx.auditLog.create({
        data: {
          actorEmployeeId,
          action: "PROFESSIONAL_ROLE_UPDATED",
          entityType: "ProfessionalRole",
          entityId: id,
          metadata: {
            attendanceExempt: input.attendanceExempt ?? null,
            active: input.active ?? null,
          },
        },
      });
      return row;
    });
  }

  async setEmployeeProfessionalRoles(
    employeeId: string,
    professionalRoleIds: readonly string[],
    actorEmployeeId: string,
  ): Promise<ManagedEmployeeItem> {
    const ids = [...new Set(professionalRoleIds)];
    return this.prisma.$transaction(async (tx) => {
      const found = await tx.professionalRole.count({
        where: { id: { in: ids }, active: true },
      });
      if (found !== ids.length) throw new Error("Unknown or inactive professional role");
      await tx.employeeProfessionalRole.deleteMany({
        where: { employeeId, professionalRoleId: { notIn: ids } },
      });
      await tx.employeeProfessionalRole.createMany({
        data: ids.map((professionalRoleId) => ({ employeeId, professionalRoleId })),
        skipDuplicates: true,
      });
      await tx.auditLog.create({
        data: {
          actorEmployeeId,
          action: "EMPLOYEE_PROFESSIONAL_ROLES_SET",
          entityType: "Employee",
          entityId: employeeId,
          metadata: { professionalRoleIds: ids },
        },
      });
      return loadManagedEmployee(tx, employeeId);
    });
  }

  async listCompanies(): Promise<readonly OrganizationUnitItem[]> {
    return this.prisma.company.findMany({
      select: { id: true, name: true, active: true },
      orderBy: [{ active: "desc" }, { name: "asc" }, { id: "asc" }],
    });
  }

  async createCompany(
    name: string,
    actorEmployeeId: string,
  ): Promise<OrganizationUnitItem> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.company.create({
        data: { name },
        select: { id: true, name: true, active: true },
      });
      await tx.auditLog.create({
        data: {
          actorEmployeeId,
          action: "COMPANY_CREATED",
          entityType: "Company",
          entityId: row.id,
        },
      });
      return row;
    });
  }

  async updateCompany(
    id: string,
    input: { readonly name?: string; readonly active?: boolean },
    actorEmployeeId: string,
  ): Promise<OrganizationUnitItem> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.company.update({
        where: { id },
        data: input,
        select: { id: true, name: true, active: true },
      });
      await tx.auditLog.create({
        data: {
          actorEmployeeId,
          action: "COMPANY_UPDATED",
          entityType: "Company",
          entityId: id,
        },
      });
      return row;
    });
  }

  async listAgencies(): Promise<readonly OrganizationUnitItem[]> {
    const rows = await this.prisma.agency.findMany({
      select: {
        id: true,
        name: true,
        active: true,
        companyId: true,
        company: { select: { name: true } },
      },
      orderBy: [{ active: "desc" }, { name: "asc" }, { id: "asc" }],
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      active: row.active,
      companyId: row.companyId,
      companyName: row.company?.name ?? null,
    }));
  }

  async createAgency(
    name: string,
    actorEmployeeId: string,
  ): Promise<OrganizationUnitItem> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.agency.create({
        data: { name },
        select: { id: true, name: true, active: true, companyId: true },
      });
      await tx.auditLog.create({
        data: {
          actorEmployeeId,
          action: "AGENCY_CREATED",
          entityType: "Agency",
          entityId: row.id,
        },
      });
      return { ...row, companyName: null };
    });
  }

  async updateAgency(
    id: string,
    input: {
      readonly name?: string;
      readonly active?: boolean;
      readonly companyId?: string | null;
    },
    actorEmployeeId: string,
  ): Promise<OrganizationUnitItem> {
    return this.prisma.$transaction(async (tx) => {
      if (input.companyId) {
        const company = await tx.company.findUnique({
          where: { id: input.companyId },
          select: { id: true },
        });
        if (!company) throw new Error("Company was not found");
      }
      const row = await tx.agency.update({
        where: { id },
        data: input,
        select: {
          id: true,
          name: true,
          active: true,
          companyId: true,
          company: { select: { name: true } },
        },
      });
      await tx.auditLog.create({
        data: {
          actorEmployeeId,
          action: "AGENCY_UPDATED",
          entityType: "Agency",
          entityId: id,
          metadata: { companyChanged: input.companyId !== undefined },
        },
      });
      return {
        id: row.id,
        name: row.name,
        active: row.active,
        companyId: row.companyId,
        companyName: row.company?.name ?? null,
      };
    });
  }

  async listDepartments(): Promise<readonly OrganizationUnitItem[]> {
    return this.prisma.department.findMany({
      select: { id: true, name: true, active: true },
      orderBy: [{ active: "desc" }, { name: "asc" }, { id: "asc" }],
    });
  }

  async createDepartment(
    name: string,
    actorEmployeeId: string,
  ): Promise<OrganizationUnitItem> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.department.create({
        data: { name },
        select: { id: true, name: true, active: true },
      });
      await tx.auditLog.create({
        data: {
          actorEmployeeId,
          action: "DEPARTMENT_CREATED",
          entityType: "Department",
          entityId: row.id,
        },
      });
      return row;
    });
  }

  async updateDepartment(
    id: string,
    input: { readonly name?: string; readonly active?: boolean },
    actorEmployeeId: string,
  ): Promise<OrganizationUnitItem> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.department.update({
        where: { id },
        data: input,
        select: { id: true, name: true, active: true },
      });
      await tx.auditLog.create({
        data: {
          actorEmployeeId,
          action: "DEPARTMENT_UPDATED",
          entityType: "Department",
          entityId: id,
        },
      });
      return row;
    });
  }

  async listEntitlements(): Promise<readonly LeaveEntitlementAdminItem[]> {
    const rows = await this.prisma.leaveEntitlement.findMany({
      select: {
        id: true,
        employeeId: true,
        leaveTypeId: true,
        quota: true,
        validFrom: true,
        validTo: true,
        employee: { select: { fullName: true } },
        leaveType: { select: { key: true, name: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5000,
    });
    return rows.map((row) => ({
      id: row.id,
      employeeId: row.employeeId,
      employeeName: row.employee.fullName,
      leaveTypeId: row.leaveTypeId,
      leaveTypeKey: row.leaveType.key,
      leaveTypeName: row.leaveType.name,
      quota: row.quota.toString(),
      validFrom: row.validFrom ? dateOnly(row.validFrom) : null,
      validTo: row.validTo ? dateOnly(row.validTo) : null,
    }));
  }

  async entitlementOptions(): Promise<LeaveEntitlementOptions> {
    const [employees, leaveTypes] = await Promise.all([
      this.prisma.employee.findMany({
        where: { userAccount: { state: { in: ["ACTIVE", "PENDING"] } } },
        select: { id: true, fullName: true },
        orderBy: [{ fullName: "asc" }, { id: "asc" }],
      }),
      this.prisma.leaveType.findMany({
        where: { active: true },
        select: { id: true, key: true, name: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
    ]);
    return {
      employees: employees.map((row) => ({ id: row.id, name: row.fullName })),
      leaveTypes,
    };
  }

  async overtimeReport(
    filters: OvertimeReportFilters,
    actorEmployeeId: string,
  ): Promise<readonly OvertimeReportRow[]> {
    const rows = await loadOvertimeReportRows(this.prisma, filters);
    await recordOvertimeReportExport(this.prisma, {
      actorEmployeeId,
      filters,
      rowCount: rows.length,
    });
    return rows;
  }

  generateVacationEntitlements(
    year: number,
    actorEmployeeId: string,
  ): Promise<VacationGenerationResult> {
    return generateVacationEntitlementsForYear(this.prisma, {
      year,
      actorEmployeeId,
    });
  }

  async upsertEntitlement(
    input: {
      readonly employeeId: string;
      readonly leaveTypeId: string;
      readonly quota: string;
      readonly validFrom: Date | null;
      readonly validTo: Date | null;
    },
    actorEmployeeId: string,
  ): Promise<LeaveEntitlementAdminItem> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.leaveEntitlement.findFirst({
        where: {
          employeeId: input.employeeId,
          leaveTypeId: input.leaveTypeId,
          validFrom: input.validFrom,
          validTo: input.validTo,
        },
        select: { id: true },
        orderBy: { createdAt: "desc" },
      });
      const select = {
        id: true,
        employeeId: true,
        leaveTypeId: true,
        quota: true,
        validFrom: true,
        validTo: true,
        employee: { select: { fullName: true } },
        leaveType: { select: { key: true, name: true } },
      } as const;
      const row = existing
        ? await tx.leaveEntitlement.update({
            where: { id: existing.id },
            data: { quota: input.quota },
            select,
          })
        : await tx.leaveEntitlement.create({
            data: input,
            select,
          });
      await tx.auditLog.create({
        data: {
          actorEmployeeId,
          action: existing
            ? "LEAVE_ENTITLEMENT_UPDATED"
            : "LEAVE_ENTITLEMENT_CREATED",
          entityType: "LeaveEntitlement",
          entityId: row.id,
        },
      });
      return {
        id: row.id,
        employeeId: row.employeeId,
        employeeName: row.employee.fullName,
        leaveTypeId: row.leaveTypeId,
        leaveTypeKey: row.leaveType.key,
        leaveTypeName: row.leaveType.name,
        quota: row.quota.toString(),
        validFrom: row.validFrom ? dateOnly(row.validFrom) : null,
        validTo: row.validTo ? dateOnly(row.validTo) : null,
      };
    });
  }

  async workCalendar(): Promise<WorkCalendarAdminView> {
    const [holidays, weeklyWorkdays] = await Promise.all([
      this.prisma.holiday.findMany({
        select: {
          id: true,
          holidayDate: true,
          description: true,
          active: true,
        },
        orderBy: [{ holidayDate: "asc" }, { id: "asc" }],
      }),
      this.prisma.weeklyWorkRule.findMany({
        select: { id: true, isoWeekday: true, isWorking: true },
        orderBy: { isoWeekday: "asc" },
      }),
    ]);
    return {
      holidays: holidays.map((row) => ({
        ...row,
        holidayDate: dateOnly(row.holidayDate),
      })),
      weeklyWorkdays,
    };
  }

  async upsertHoliday(
    input: {
      readonly id?: string;
      readonly holidayDate: Date;
      readonly description: string;
      readonly active: boolean;
    },
    actorEmployeeId: string,
  ): Promise<WorkCalendarAdminView> {
    await this.prisma.$transaction(async (tx) => {
      const row = input.id
        ? await tx.holiday.update({
            where: { id: input.id },
            data: {
              holidayDate: input.holidayDate,
              description: input.description,
              active: input.active,
            },
            select: { id: true },
          })
        : await tx.holiday.create({
            data: {
              holidayDate: input.holidayDate,
              description: input.description,
              active: input.active,
            },
            select: { id: true },
          });
      await tx.auditLog.create({
        data: {
          actorEmployeeId,
          action: input.id ? "HOLIDAY_UPDATED" : "HOLIDAY_CREATED",
          entityType: "Holiday",
          entityId: row.id,
        },
      });
    });
    return this.workCalendar();
  }

  async setWeeklyWorkday(
    isoWeekday: number,
    isWorking: boolean,
    actorEmployeeId: string,
  ): Promise<WorkCalendarAdminView> {
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.weeklyWorkRule.upsert({
        where: { isoWeekday },
        create: { isoWeekday, isWorking },
        update: { isWorking },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          actorEmployeeId,
          action: "WEEKLY_WORKDAY_UPDATED",
          entityType: "WeeklyWorkRule",
          entityId: row.id,
          metadata: { isoWeekday, isWorking },
        },
      });
    });
    return this.workCalendar();
  }

  async rbac(): Promise<RbacAdminView> {
    const [roles, permissions] = await Promise.all([
      this.prisma.role.findMany({
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          permissions: {
            select: {
              permission: { select: { key: true } },
            },
          },
        },
        orderBy: [{ key: "asc" }, { id: "asc" }],
      }),
      this.prisma.permission.findMany({
        select: { key: true },
        orderBy: { key: "asc" },
      }),
    ]);
    return {
      roles: roles.map((role) => ({
        id: role.id,
        key: role.key,
        name: role.name,
        description: role.description,
        permissions: role.permissions
          .map(({ permission }) => permission.key)
          .sort(),
      })),
      permissionCatalog: permissions.map((permission) => permission.key),
    };
  }

  async setRolePermissions(
    roleId: string,
    permissions: readonly string[],
    actorEmployeeId: string,
  ): Promise<RbacAdminView> {
    await this.prisma.$transaction(async (tx) => {
      const role = await tx.role.findUnique({
        where: { id: roleId },
        select: { id: true, key: true },
      });
      if (!role) throw new Error("Role was not found");
      const unique = [...new Set(permissions)];
      const rows = await tx.permission.findMany({
        where: { key: { in: unique } },
        select: { id: true, key: true },
      });
      if (rows.length !== unique.length) {
        throw new Error("Unknown permission key");
      }
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (rows.length > 0) {
        await tx.rolePermission.createMany({
          data: rows.map((permission) => ({
            roleId,
            permissionId: permission.id,
          })),
        });
      }
      await tx.auditLog.create({
        data: {
          actorEmployeeId,
          action: "ROLE_PERMISSIONS_REPLACED",
          entityType: "Role",
          entityId: roleId,
          metadata: {
            roleKey: role.key,
            permissionCount: rows.length,
          },
        },
      });
    });
    return this.rbac();
  }
}
