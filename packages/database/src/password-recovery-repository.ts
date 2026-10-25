import type { AccountState, PrismaClient } from "@prisma/client";

export interface PasswordRecoveryAccount {
  readonly id: string;
  readonly employeeId: string;
  readonly state: AccountState;
  readonly passwordHash: string | null;
  readonly legacyPasswordHash: string | null;
  readonly updatedAt: Date;
}

export interface PasswordRecoveryContact {
  readonly account: PasswordRecoveryAccount;
  readonly loginName: string;
  readonly lineUserId: string | null;
}

export interface PasswordRecoveryRepository {
  findByEmployeeId(
    employeeId: string,
  ): Promise<PasswordRecoveryAccount | null>;
  findByAccountId(
    userAccountId: string,
  ): Promise<PasswordRecoveryAccount | null>;
  findLoginName(userAccountId: string): Promise<string | null>;
  /** Looks an active account up by what the user types on the login page, with the addresses a link can be sent to. */
  findContactByLogin(
    login: string,
  ): Promise<PasswordRecoveryContact | null>;
  resetPassword(
    userAccountId: string,
    expectedUpdatedAt: Date,
    passwordHash: string,
  ): Promise<{ readonly employeeId: string }>;
}

const selectAccount = {
  id: true,
  employeeId: true,
  state: true,
  passwordHash: true,
  legacyPasswordHash: true,
  updatedAt: true,
} as const;

export class PrismaPasswordRecoveryRepository
  implements PasswordRecoveryRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  findByEmployeeId(
    employeeId: string,
  ): Promise<PasswordRecoveryAccount | null> {
    return this.prisma.userAccount.findUnique({
      where: { employeeId },
      select: selectAccount,
    });
  }

  findByAccountId(
    userAccountId: string,
  ): Promise<PasswordRecoveryAccount | null> {
    return this.prisma.userAccount.findUnique({
      where: { id: userAccountId },
      select: selectAccount,
    });
  }

  async findLoginName(userAccountId: string): Promise<string | null> {
    const row = await this.prisma.userAccount.findUnique({
      where: { id: userAccountId },
      select: { loginName: true },
    });
    return row?.loginName ?? null;
  }

  async findContactByLogin(
    login: string,
  ): Promise<PasswordRecoveryContact | null> {
    const row = await this.prisma.userAccount.findUnique({
      where: { normalizedLogin: login.trim().toLowerCase() },
      select: {
        ...selectAccount,
        loginName: true,
        employee: { select: { lineAccount: { select: { lineUserId: true } } } },
      },
    });
    if (!row) return null;
    const { loginName, employee, ...account } = row;
    return {
      account,
      loginName,
      lineUserId: employee?.lineAccount?.lineUserId ?? null,
    };
  }

  async resetPassword(
    userAccountId: string,
    expectedUpdatedAt: Date,
    passwordHash: string,
  ): Promise<{ readonly employeeId: string }> {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.userAccount.findUnique({
        where: { id: userAccountId },
        select: {
          employeeId: true,
          state: true,
          updatedAt: true,
        },
      });
      if (
        !account ||
        account.state !== "ACTIVE" ||
        account.updatedAt.getTime() !== expectedUpdatedAt.getTime()
      ) {
        throw new Error("Password recovery token is no longer valid");
      }

      const updated = await tx.userAccount.updateMany({
        where: {
          id: userAccountId,
          state: "ACTIVE",
          updatedAt: expectedUpdatedAt,
        },
        data: {
          passwordHash,
          legacyPasswordHash: null,
        },
      });
      if (updated.count !== 1) {
        throw new Error("Password recovery token is no longer valid");
      }

      await tx.auditLog.create({
        data: {
          actorEmployeeId: account.employeeId,
          action: "PASSWORD_RECOVERY_COMPLETED",
          entityType: "UserAccount",
          entityId: userAccountId,
          metadata: {
            method: "SIGNED_15_MINUTE_RECOVERY_LINK",
          },
        },
      });
      return { employeeId: account.employeeId };
    });
  }
}
