import {
  Prisma,
  type PrismaClient,
} from "@prisma/client";

import {
  IdempotencyConflictError,
  type IdempotencyClaim,
  type IdempotencyClaimResult,
  type IdempotencyStore,
} from "@ckace/auth";

export class PrismaIdempotencyStore
implements IdempotencyStore {
  constructor(
    private readonly prisma: PrismaClient,
  ) {}

  async claim(
    claim: IdempotencyClaim,
  ): Promise<IdempotencyClaimResult> {
    try {
      const created =
        await this.prisma.idempotencyKey.create({
          data: claim,
          select: {
            resultReferenceId: true,
          },
        });

      return {
        replayed: false,
        resultReferenceId:
          created.resultReferenceId,
      };
    } catch (error) {
      if (
        !(
          error instanceof
          Prisma.PrismaClientKnownRequestError
        ) ||
        error.code !== "P2002"
      ) {
        throw error;
      }
    }

    const existing =
      await this.prisma.idempotencyKey.findUnique({
        where: {
          actorEmployeeId_operationKind_clientKey: {
            actorEmployeeId: claim.actorEmployeeId,
            operationKind: claim.operationKind,
            clientKey: claim.clientKey,
          },
        },
        select: {
          payloadHash: true,
          resultReferenceId: true,
        },
      });

    if (!existing) {
      throw new Error(
        "Idempotency key disappeared after conflict",
      );
    }

    if (existing.payloadHash !== claim.payloadHash) {
      throw new IdempotencyConflictError();
    }

    return {
      replayed: true,
      resultReferenceId:
        existing.resultReferenceId,
    };
  }

  async complete(input: {
    readonly actorEmployeeId: string;
    readonly operationKind: string;
    readonly clientKey: string;
    readonly resultReferenceId: string;
  }): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: {
        actorEmployeeId_operationKind_clientKey: {
          actorEmployeeId: input.actorEmployeeId,
          operationKind: input.operationKind,
          clientKey: input.clientKey,
        },
      },
      data: {
        resultReferenceId:
          input.resultReferenceId,
      },
    });
  }
}
