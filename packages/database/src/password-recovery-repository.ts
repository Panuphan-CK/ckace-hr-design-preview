import type { AccountState, PrismaClient } from "@prisma/client";

export interface PasswordRecoveryAccount {
  readonly id: string;
  readonly employeeId: string;
  readonly state: AccountState;
  readonly passwordHash: string | null;
  readonly legacyPasswordHash: string | null;
  readonly updatedAt: Date;
}

export interface PasswordRecoveryRepository {
  findByEmployeeId(
    employeeId: string,
  ): Promise<PasswordRecoveryAccount | null>;
  findByAccountId(
    userAccountId: string,
  ): Promise<PasswordRecoveryAccount | null>;
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
