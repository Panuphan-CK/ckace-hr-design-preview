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
import type { PrismaClient } from "@prisma/client";

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
    },
    actorEmployeeId: string,
  ): Promise<ManagedEmployeeItem>;
  setEmployeeRoles(
    employeeId: string,
    roleIds: readonly string[],
    actorEmployeeId: string,
  ): Promise<ManagedEmployeeItem>;
  listAgencies(): Promise<readonly OrganizationUnitItem[]>;
  createAgency(name: string, actorEmployeeId: string): Promise<OrganizationUnitItem>;
  updateAgency(
    id: string,
    input: { readonly name?: string; readonly active?: boolean },
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

function employeeView(row: {
  id: string;
  fullName: string;
  agencyId: string | null;
  departmentId: string | null;
  agency: { name: string } | null;
  department: { name: string } | null;
  userAccount: {
    loginName: string;
    state: ManagedAccountState;
    roles: readonly {
      role: { id: string; key: string; name: string };
    }[];
  } | null;
}): ManagedEmployeeItem {
  return {
    id: row.id,
    fullName: row.fullName,
    loginName: row.userAccount?.loginName ?? null,
    state: row.userAccount?.state ?? null,
    agencyId: row.agencyId,
    agencyName: row.agency?.name ?? null,
    departmentId: row.departmentId,
    departmentName: row.department?.name ?? null,
    roles: row.userAccount?.roles.map(({ role }) => role) ?? [],
  };
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
      select: {
        id: true,
        fullName: true,
        agencyId: true,
        departmentId: true,
        agency: { select: { name: true } },
        department: { select: { name: true } },
        userAccount: {
          select: {
            loginName: true,
            state: true,
            roles: {
              select: { role: { select: { id: true, key: true, name: true } } },
              orderBy: { assignedAt: "asc" },
            },
          },
        },
      },
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
    },
    actorEmployeeId: string,
  ): Promise<ManagedEmployeeItem> {
    return this.prisma.$transaction(async (tx) => {
      if (input.state) {
        await tx.userAccount.update({
          where: { employeeId },
          data: { state: input.state },
        });
      }
      const employee = await tx.employee.update({
        where: { id: employeeId },
        data: {
          ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
          ...(input.agencyId !== undefined ? { agencyId: input.agencyId } : {}),
          ...(input.departmentId !== undefined
            ? { departmentId: input.departmentId }
            : {}),
        },
        select: {
          id: true,
          fullName: true,
          agencyId: true,
          departmentId: true,
          agency: { select: { name: true } },
          department: { select: { name: true } },
          userAccount: {
            select: {
              loginName: true,
              state: true,
              roles: {
                select: { role: { select: { id: true, key: true, name: true } } },
                orderBy: { assignedAt: "asc" },
              },
            },
          },
        },
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
          },
        },
      });
      return employeeView(employee);
    });
  }

  async setEmployeeRoles(
    employeeId: string,
    roleIds: readonly string[],
    actorEmployeeId: string,
  ): Promise<ManagedEmployeeItem> {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.userAccount.findUnique({
        where: { employeeId },
        select: { id: true },
      });
      if (!account) throw new Error("User account was not found");

      const uniqueRoleIds = [...new Set(roleIds)];
      const roles = await tx.role.findMany({
        where: { id: { in: uniqueRoleIds } },
        select: { id: true, key: true },
      });
      if (roles.length !== uniqueRoleIds.length) {
        throw new Error("Unknown role ID");
      }

      await tx.userRole.deleteMany({
        where: { userAccountId: account.id },
      });
      if (roles.length > 0) {
        await tx.userRole.createMany({
          data: roles.map((role) => ({
            userAccountId: account.id,
            roleId: role.id,
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
            roleKeys: roles.map((role) => role.key).sort(),
          },
        },
      });

      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          fullName: true,
          agencyId: true,
          departmentId: true,
          agency: { select: { name: true } },
          department: { select: { name: true } },
          userAccount: {
            select: {
              loginName: true,
              state: true,
              roles: {
                select: {
                  role: {
                    select: { id: true, key: true, name: true },
                  },
                },
                orderBy: { assignedAt: "asc" },
              },
            },
          },
        },
      });
      if (!employee) throw new Error("Employee was not found");
      return employeeView(employee);
    });
  }

  async listAgencies(): Promise<readonly OrganizationUnitItem[]> {
    return this.prisma.agency.findMany({
      select: { id: true, name: true, active: true },
      orderBy: [{ active: "desc" }, { name: "asc" }, { id: "asc" }],
    });
  }

  async createAgency(
    name: string,
    actorEmployeeId: string,
  ): Promise<OrganizationUnitItem> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.agency.create({
        data: { name },
        select: { id: true, name: true, active: true },
      });
      await tx.auditLog.create({
        data: {
          actorEmployeeId,
          action: "AGENCY_CREATED",
          entityType: "Agency",
          entityId: row.id,
        },
      });
      return row;
    });
  }

  async updateAgency(
    id: string,
    input: { readonly name?: string; readonly active?: boolean },
    actorEmployeeId: string,
  ): Promise<OrganizationUnitItem> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.agency.update({
        where: { id },
        data: input,
        select: { id: true, name: true, active: true },
      });
      await tx.auditLog.create({
        data: {
          actorEmployeeId,
          action: "AGENCY_UPDATED",
          entityType: "Agency",
          entityId: id,
        },
      });
      return row;
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
