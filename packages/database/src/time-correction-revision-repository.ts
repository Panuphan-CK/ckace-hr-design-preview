import { IdempotencyConflictError, createIdempotencyClaim } from "@ckace/auth";
import {
  assertTimeCorrectionChanged,
  normalizeAttendanceClock,
} from "@ckace/business-rules";
import type {
  TimeCorrectionResubmitInput,
  TimeCorrectionResubmitResult,
} from "@ckace/contracts";
import { Prisma, type PrismaClient } from "@prisma/client";

function clock(value: Date | null): string | null {
  return value ? value.toISOString().slice(11, 16) : null;
}

/** Employee edits the corrected time/reason of a time correction that was sent back and submits it again. */
export async function resubmitSentBackTimeCorrection(
  prisma: PrismaClient,
  input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly request: TimeCorrectionResubmitInput;
    readonly canonicalPayload: string;
  },
): Promise<TimeCorrectionResubmitResult> {
  const reason = input.request.reason.trim();

  if (!reason || reason.length > 1000) {
    throw new Error("Time correction reason must be 1 to 1000 characters");
  }

  const correctedTime = normalizeAttendanceClock(input.request.correctedTime);
  const claim = createIdempotencyClaim({
    actorEmployeeId: input.employeeId,
    operationKind: "TIME_CORRECTION_RESUBMIT",
    clientKey: input.request.clientKey,
    canonicalPayload: input.canonicalPayload,
  });

  const existing = await prisma.idempotencyKey.findUnique({
    where: {
      actorEmployeeId_operationKind_clientKey: {
        actorEmployeeId: claim.actorEmployeeId,
        operationKind: claim.operationKind,
        clientKey: claim.clientKey,
      },
    },
    select: { payloadHash: true, resultReferenceId: true },
  });

  if (existing) {
    if (existing.payloadHash !== claim.payloadHash) {
      throw new IdempotencyConflictError();
    }

    if (!existing.resultReferenceId) {
      throw new Error("Idempotency record is incomplete and requires review");
    }

    return { requestId: existing.resultReferenceId, returnedToStep: 1, replayed: true };
  }

  return prisma.$transaction(
    async (tx) => {
      await tx.idempotencyKey.create({ data: claim });

      const request = await tx.timeCorrectionRequest.findUnique({
        where: { id: input.requestId },
        select: {
          id: true,
          employeeId: true,
          status: true,
          approvalInstanceId: true,
          originalCheckIn: true,
          originalCheckOut: true,
          correctedCheckIn: true,
          correctedCheckOut: true,
        },
      });

      if (!request || request.employeeId !== input.employeeId) {
        throw new Error("Time correction request is unavailable for this employee");
      }

      if (request.status !== "REVISION_REQUESTED" || !request.approvalInstanceId) {
        throw new Error("Time correction request is not waiting for revision");
      }

      const isCheckIn = request.correctedCheckIn !== null;
      const original = clock(isCheckIn ? request.originalCheckIn : request.originalCheckOut);

      if (!original) {
        throw new Error("Time correction approval state is unavailable");
      }

      assertTimeCorrectionChanged({ originalTime: original, correctedTime });

      const step = await tx.approvalStep.findFirst({
        where: { approvalInstanceId: request.approvalInstanceId, status: "REVISION_REQUESTED" },
        select: { id: true, stepOrder: true },
      });

      if (!step) {
        throw new Error("Time correction approval state is unavailable");
      }

      const corrected = new Date(`1970-01-01T${correctedTime}:00.000Z`);

      await tx.timeCorrectionRequest.update({
        where: { id: request.id },
        data: {
          reason,
          status: "PENDING",
          decisionComment: null,
          decidedAt: null,
          ...(isCheckIn ? { correctedCheckIn: corrected } : { correctedCheckOut: corrected }),
        },
      });

      await Promise.all([
        tx.approvalStep.update({
          where: { id: step.id },
          data: { status: "PENDING", decidedAt: null, comment: null, assignedAt: new Date() },
        }),
        tx.approvalInstance.update({
          where: { id: request.approvalInstanceId },
          data: { status: "PENDING", currentStepOrder: step.stepOrder, decidedAt: null },
        }),
        tx.idempotencyKey.update({
          where: {
            actorEmployeeId_operationKind_clientKey: {
              actorEmployeeId: claim.actorEmployeeId,
              operationKind: claim.operationKind,
              clientKey: claim.clientKey,
            },
          },
          data: { resultReferenceId: request.id },
        }),
        tx.notificationOutbox.create({
          data: {
            aggregateType: "TIME_CORRECTION",
            aggregateId: request.id,
            eventType: "TIME_CORRECTION_RESUBMITTED",
            payload: { requestId: request.id, requesterEmployeeId: input.employeeId },
          },
        }),
        tx.auditLog.create({
          data: {
            actorEmployeeId: input.employeeId,
            action: "TIME_CORRECTION_RESUBMIT",
            entityType: "TimeCorrectionRequest",
            entityId: request.id,
            correlationId: input.correlationId,
            metadata: { correctedTime },
          },
        }),
      ]);

      return { requestId: request.id, returnedToStep: step.stepOrder, replayed: false };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
