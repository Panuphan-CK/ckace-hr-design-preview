import type {
  EmployeeRegistrationResult,
  OnboardingApprovalOptions,
  PendingEmployeeAdminItem,
  ImportedDesktopActivationResult,
  PendingEmployeeApprovalResult,
  PendingLineBindingResult,
} from "@ckace/contracts";
import type { AccountState, PrismaClient } from "@prisma/client";
import {
  currentLeaveYear,
  ensureVacationEntitlement,
  VACATION_LEAVE_TYPE_KEY,
} from "./vacation-entitlement";

export interface OnboardingCredentialRecord {
  readonly employeeId: string;
  readonly accountState: AccountState;
  readonly passwordHash: string | null;
  readonly legacyPasswordHash: string | null;
}

export interface OnboardingRegistrationRecord {
  readonly username: string;
  readonly passwordHash: string;
  readonly fullName: string;
  readonly nickname: string | null;
  readonly dateOfBirth: Date;
  readonly employmentStart: Date;
}

export interface OnboardingRepository {
  register(input: OnboardingRegistrationRecord): Promise<EmployeeRegistrationResult>;
  findCredentials(normalizedLogin: string): Promise<OnboardingCredentialRecord | null>;
  findActiveEmployeeIdByLineUserId(lineUserId: string): Promise<string | null>;
  bindLine(
    employeeId: string,
    lineUserId: string,
  ): Promise<PendingLineBindingResult>;
  activateImportedDesktopCredential(
    lineUserId: string,
    passwordHash: string,
  ): Promise<ImportedDesktopActivationResult>;
  listPending(): Promise<readonly PendingEmployeeAdminItem[]>;
  getApprovalOptions(): Promise<OnboardingApprovalOptions>;
  approve(
    employeeId: string,
    agencyId: string,
    departmentId: string,
    actorEmployeeId: string,
  ): Promise<PendingEmployeeApprovalResult>;
}

const DEFAULT_ENTITLEMENTS = [
  { leaveTypeKey: "ANNUAL", quota: 5 },
  { leaveTypeKey: "PERSONAL", quota: 6 },
  { leaveTypeKey: "SICK", quota: 30 },
] as const;

export class PrismaOnboardingRepository implements OnboardingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async register(input: OnboardingRegistrationRecord): Promise<EmployeeRegistrationResult> {
    const normalizedLogin = input.username.trim().toLowerCase();
    if (!normalizedLogin) throw new Error("Username is required");
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.userAccount.findUnique({
        where: { normalizedLogin },
        select: { id: true },
      });
      if (existing) throw new Error("Username is already registered");

      const employee = await tx.employee.create({
        data: {
          fullName: input.fullName,
          nickname: input.nickname,
          dateOfBirth: input.dateOfBirth,
          employmentStart: input.employmentStart,
          userAccount: {
            create: {
              loginName: input.username.trim(),
              normalizedLogin,
              passwordHash: input.passwordHash,
              state: "PENDING",
            },
          },
        },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          action: "EMPLOYEE_REGISTERED_PENDING",
          entityType: "Employee",
          entityId: employee.id,
          metadata: { normalizedLogin },
        },
      });
      return {
        employeeId: employee.id,
        accountState: "PENDING",
        pendingApproval: true,
      };
    });
  }

  async findCredentials(normalizedLogin: string): Promise<OnboardingCredentialRecord | null> {
    const account = await this.prisma.userAccount.findUnique({
      where: { normalizedLogin: normalizedLogin.trim().toLowerCase() },
      select: {
        employeeId: true,
        state: true,
        passwordHash: true,
        legacyPasswordHash: true,
      },
    });
    return account
      ? {
          employeeId: account.employeeId,
          accountState: account.state,
          passwordHash: account.passwordHash,
          legacyPasswordHash: account.legacyPasswordHash,
        }
      : null;
  }

  async findActiveEmployeeIdByLineUserId(lineUserId: string): Promise<string | null> {
    const binding = await this.prisma.lineAccount.findUnique({
      where: { lineUserId },
      select: {
        employeeId: true,
        employee: { select: { userAccount: { select: { state: true } } } },
      },
    });
    return binding?.employee.userAccount?.state === "ACTIVE"
      ? binding.employeeId
      : null;
  }

  async bindLine(
    employeeId: string,
    lineUserId: string,
  ): Promise<PendingLineBindingResult> {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.userAccount.findUnique({
        where: { employeeId },
        select: {
          state: true,
          employee: {
            select: {
              lineAccount: { select: { lineUserId: true } },
            },
          },
        },
      });
      if (!account || (account.state !== "PENDING" && account.state !== "ACTIVE")) {
        throw new Error("Account is not eligible for LINE binding");
      }

      const boundElsewhere = await tx.lineAccount.findUnique({
        where: { lineUserId },
        select: { employeeId: true },
      });
      if (boundElsewhere && boundElsewhere.employeeId !== employeeId) {
        throw new Error("LINE account is already linked to another employee");
      }
      const existing = account.employee.lineAccount;
      if (existing) {
        if (existing.lineUserId !== lineUserId) {
          throw new Error("Employee already has a different LINE account");
        }
        return {
          employeeId,
          accountState: account.state,
          linked: true,
          unchanged: true,
          pendingApproval: account.state === "PENDING",
        };
      }

      await tx.lineAccount.create({
        data: { employeeId, lineUserId },
      });
      await tx.auditLog.create({
        data: {
          actorEmployeeId: employeeId,
          action: "LINE_ACCOUNT_BOUND_PRE_ACTIVATION",
          entityType: "Employee",
          entityId: employeeId,
        },
      });
      return {
        employeeId,
        accountState: account.state,
        linked: true,
        unchanged: false,
        pendingApproval: account.state === "PENDING",
      };
    });
  }

  async activateImportedDesktopCredential(
    lineUserId: string,
    passwordHash: string,
  ): Promise<ImportedDesktopActivationResult> {
    return this.prisma.$transaction(async (tx) => {
      const binding = await tx.lineAccount.findUnique({
        where: { lineUserId },
        select: {
          employeeId: true,
          employee: {
            select: {
              userAccount: {
                select: {
                  id: true,
                  state: true,
                  passwordHash: true,
                },
              },
            },
          },
        },
      });
      const account = binding?.employee.userAccount;
      if (!binding || !account || account.state !== "ACTIVE") {
        throw new Error(
          "Imported Desktop account is not eligible for activation",
        );
      }
      if (account.passwordHash) {
        throw new Error("Desktop credential is already activated");
      }

      const updated = await tx.userAccount.updateMany({
        where: {
          id: account.id,
          state: "ACTIVE",
          passwordHash: null,
        },
        data: { passwordHash },
      });
      if (updated.count !== 1) {
        throw new Error("Desktop credential activation conflict");
      }

      await tx.auditLog.create({
        data: {
          actorEmployeeId: binding.employeeId,
          action: "DESKTOP_CREDENTIAL_ACTIVATED_WITH_LINE",
          entityType: "UserAccount",
          entityId: account.id,
          metadata: {
            method: "VERIFIED_EXISTING_LINE_BINDING",
          },
        },
      });

      return {
        employeeId: binding.employeeId,
        accountState: "ACTIVE",
        activated: true,
      };
    });
  }

  async listPending(): Promise<readonly PendingEmployeeAdminItem[]> {
    const rows = await this.prisma.employee.findMany({
      where: {
        userAccount: {
          state: "PENDING",
        },
      },
      select: {
        id: true,
        fullName: true,
        nickname: true,
        dateOfBirth: true,
        employmentStart: true,
        userAccount: {
          select: {
            loginName: true,
          },
        },
        lineAccount: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [
        { employmentStart: "asc" },
        { fullName: "asc" },
        { id: "asc" },
      ],
    });

    return rows.flatMap((row) =>
      row.userAccount
        ? [{
            employeeId: row.id,
            fullName: row.fullName,
            nickname: row.nickname,
            loginName: row.userAccount.loginName,
            dateOfBirth: row.dateOfBirth?.toISOString().slice(0, 10) ?? null,
            employmentStart:
              row.employmentStart?.toISOString().slice(0, 10) ?? null,
            lineLinked: Boolean(row.lineAccount),
          }]
        : [],
    );
  }

  async getApprovalOptions(): Promise<OnboardingApprovalOptions> {
    const [agencies, departments] = await Promise.all([
      this.prisma.agency.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
      this.prisma.department.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
    ]);

    return { agencies, departments };
  }

  async approve(
    employeeId: string,
    agencyId: string,
    departmentId: string,
    actorEmployeeId: string,
  ): Promise<PendingEmployeeApprovalResult> {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.userAccount.findUnique({
        where: { employeeId },
        select: {
          id: true,
          state: true,
          employee: {
            select: {
              lineAccount: { select: { id: true } },
            },
          },
        },
      });
      if (!account) throw new Error("Pending employee account was not found");
      if (account.state !== "PENDING" && account.state !== "ACTIVE") {
        throw new Error("Only pending employee account can be approved");
      }

      const [agency, department, employeeRole, leaveTypes] = await Promise.all([
        tx.agency.findFirst({ where: { id: agencyId, active: true }, select: { id: true } }),
        tx.department.findFirst({ where: { id: departmentId, active: true }, select: { id: true } }),
        tx.role.findUnique({ where: { key: "EMPLOYEE" }, select: { id: true } }),
        tx.leaveType.findMany({
          where: { key: { in: DEFAULT_ENTITLEMENTS.map((item) => item.leaveTypeKey) }, active: true },
          select: { id: true, key: true },
        }),
      ]);
      if (!agency) throw new Error("Active agency was not found");
      if (!department) throw new Error("Active department was not found");
      if (!employeeRole) throw new Error("EMPLOYEE role is not configured");
      if (leaveTypes.length !== DEFAULT_ENTITLEMENTS.length) {
        throw new Error("Default leave types are not fully configured");
      }

      const unchanged = account.state === "ACTIVE";
      await tx.employee.update({
        where: { id: employeeId },
        data: { agencyId, departmentId },
      });
      await tx.userAccount.update({
        where: { employeeId },
        data: { state: "ACTIVE" },
      });
      await tx.userRole.upsert({
        where: {
          userAccountId_roleId: {
            userAccountId: account.id,
            roleId: employeeRole.id,
          },
        },
        update: {},
        create: {
          userAccountId: account.id,
          roleId: employeeRole.id,
        },
      });

      const current = await tx.leaveEntitlement.findMany({
        where: {
          employeeId,
          leaveTypeId: { in: leaveTypes.map((item) => item.id) },
        },
        select: { leaveTypeId: true },
      });
      const currentIds = new Set(current.map((item) => item.leaveTypeId));
      for (const rule of DEFAULT_ENTITLEMENTS) {
        const leaveType = leaveTypes.find((item) => item.key === rule.leaveTypeKey);
        if (!leaveType) throw new Error("Default leave type resolution failed");
        if (rule.leaveTypeKey === VACATION_LEAVE_TYPE_KEY) {
          await ensureVacationEntitlement(tx, {
            employeeId,
            year: currentLeaveYear(),
            actorEmployeeId,
          });
        } else if (!currentIds.has(leaveType.id)) {
          const year = currentLeaveYear();

          await tx.leaveEntitlement.create({
            data: {
              employeeId,
              leaveTypeId: leaveType.id,
              quota: rule.quota,
              validFrom: new Date(`${year}-01-01T00:00:00.000Z`),
              validTo: new Date(`${year}-12-31T00:00:00.000Z`),
            },
          });
        }
      }

      let notificationQueued = false;
      if (!unchanged && account.employee.lineAccount) {
        await tx.notificationOutbox.create({
          data: {
            aggregateType: "EMPLOYEE_ACCOUNT",
            aggregateId: employeeId,
            eventType: "ACCOUNT_APPROVED",
            payload: {
              employeeId,
              message: "✅ บัญชีของคุณได้รับการอนุมัติแล้ว",
            },
          },
        });
        notificationQueued = true;
      }
      await tx.auditLog.create({
        data: {
          actorEmployeeId,
          action: unchanged ? "EMPLOYEE_APPROVAL_REPLAYED" : "EMPLOYEE_APPROVED",
          entityType: "Employee",
          entityId: employeeId,
          metadata: { agencyId, departmentId, notificationQueued },
        },
      });

      return {
        employeeId,
        accountState: "ACTIVE",
        unchanged,
        leaveEntitlementsProvisioned: DEFAULT_ENTITLEMENTS.map((item) => ({
          leaveTypeKey: item.leaveTypeKey,
          quota: item.quota,
        })),
        notificationQueued,
      };
    });
  }
}
