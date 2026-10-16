import { IdempotencyConflictError, createIdempotencyClaim } from "@ckace/auth";
import {
  assertNoOverlappingOvertime,
  expandOvertimeDays,
  normalizeOvertimeCreate,
  type ExistingOvertimeWindow,
} from "@ckace/business-rules";
import type {
  OvertimeResubmitInput,
  OvertimeResubmitResult,
  OvertimeWithdrawResult,
} from "@ckace/contracts";
import { Prisma, type PrismaClient } from "@prisma/client";

import { actorHasRoleOverEmployee } from "./approval-route-loader";
import { LEAVE_WITHDRAW_ROLE_KEY } from "./leave-revision-repository";

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function timeOnly(value: Date): string {
  return value.toISOString().slice(11, 16);
}

async function isWorkday(tx: Prisma.TransactionClient, date: string): Promise<boolean> {
  const [rules, holiday] = await Promise.all([
    tx.weeklyWorkRule.findMany({ select: { isoWeekday: true, isWorking: true } }),
    tx.holiday.findFirst({
      where: { active: true, holidayDate: new Date(`${date}T00:00:00.000Z`) },
      select: { id: true },
    }),
  ]);
  const isoWeekday = ((new Date(`${date}T00:00:00.000Z`).getUTCDay() + 6) % 7) + 1;
  const rule = rules.find((row) => row.isoWeekday === isoWeekday);

  if (!rule) {
    throw new Error(`Weekly overtime work rule is unavailable for ${date}`);
  }

  return rule.isWorking && !holiday;
}

export async function resubmitSentBackOvertime(
  prisma: PrismaClient,
  input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly request: OvertimeResubmitInput;
    readonly canonicalPayload: string;
  },
): Promise<OvertimeResubmitResult> {
  const claim = createIdempotencyClaim({
    actorEmployeeId: input.employeeId,
    operationKind: "OVERTIME_RESUBMIT",
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
      throw new Error("Overtime idempotency record is incomplete and requires review");
    }

    const row = await prisma.overtimeRequest.findUnique({
      where: { id: existing.resultReferenceId },
      select: { approvalInstance: { select: { currentStepOrder: true } } },
    });

    return {
      requestId: existing.resultReferenceId,
      returnedToStep: row?.approvalInstance?.currentStepOrder ?? 0,
      replayed: true,
    };
  }

  return prisma.$transaction(
    async (tx) => {
      await tx.idempotencyKey.create({ data: claim });

      const request = await tx.overtimeRequest.findUnique({
        where: { id: input.requestId },
        select: {
          id: true,
          employeeId: true,
          status: true,
          approvalInstanceId: true,
          segments: {
            select: { id: true, workDate: true },
            orderBy: { id: "asc" },
          },
        },
      });

      if (!request || request.employeeId !== input.employeeId) {
        throw new Error("Overtime request is unavailable for this employee");
      }

      const segment = request.segments[0];

      if (
        request.status !== "REVISION_REQUESTED" ||
        !request.approvalInstanceId ||
        request.segments.length !== 1 ||
        !segment
      ) {
        throw new Error("Overtime request is not waiting for revision");
      }

      const steps = await tx.approvalStep.findMany({
        where: { approvalInstanceId: request.approvalInstanceId },
        select: { id: true, stepOrder: true, status: true },
        orderBy: { stepOrder: "asc" },
      });
      const returned = steps.filter((step) => step.status === "REVISION_REQUESTED");
      const revision = returned[0];

      if (returned.length !== 1 || !revision) {
        throw new Error("Overtime approval state is unavailable");
      }

      if (
        steps.some(
          (step) =>
            (step.stepOrder < revision.stepOrder && step.status !== "APPROVED") ||
            (step.stepOrder > revision.stepOrder && step.status !== "PENDING"),
        )
      ) {
        throw new Error("Overtime approval chain is inconsistent");
      }

      const date = dateOnly(segment.workDate);
      const normalized = normalizeOvertimeCreate({
        startDate: date,
        endDate: date,
        startTime: input.request.startTime,
        endTime: input.request.endTime,
        reason: input.request.reason,
        clientKey: input.request.clientKey,
        ...(input.request.breaks ? { breaks: input.request.breaks } : {}),
      });
      const [day] = expandOvertimeDays(normalized, [{ date, isWorkday: await isWorkday(tx, date) }]);

      if (!day) {
        throw new Error("Overtime request contains no payable minutes");
      }

      const others = await tx.overtimeSegment.findMany({
        where: {
          workDate: segment.workDate,
          overtimeRequestId: { not: request.id },
          request: {
            is: { employeeId: input.employeeId, status: { notIn: ["REJECTED", "CANCELLED"] } },
          },
        },
        select: {
          workDate: true,
          startTime: true,
          endTime: true,
          request: { select: { status: true } },
        },
      });
      const windows: ExistingOvertimeWindow[] = others.map((row) => ({
        workDate: dateOnly(row.workDate),
        startTime: timeOnly(row.startTime),
        endTime: timeOnly(row.endTime),
        status: row.request.status,
      }));

      assertNoOverlappingOvertime(day, windows);

      await tx.overtimeSegment.update({
        where: { id: segment.id },
        data: {
          startTime: new Date(`1970-01-01T${day.startTime}:00.000Z`),
          endTime: new Date(`1970-01-01T${day.endTime}:00.000Z`),
          requestedMinutes: day.requestedMinutes,
          ...(normalized.breaks ? { breakCodes: [...normalized.breaks] } : { breakCodes: Prisma.JsonNull }),
        },
      });
      await tx.overtimeRequest.update({
        where: { id: request.id },
        data: { reason: normalized.reason, status: "PENDING", decisionReason: null },
      });

      await Promise.all([
        tx.approvalStep.update({
          where: { id: revision.id },
          data: { status: "PENDING", decidedAt: null, comment: null, assignedAt: new Date() },
        }),
        tx.approvalInstance.update({
          where: { id: request.approvalInstanceId },
          data: { status: "PENDING", currentStepOrder: revision.stepOrder, decidedAt: null },
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
            aggregateType: "OVERTIME_REQUEST",
            aggregateId: request.id,
            eventType: "OVERTIME_REQUEST_RESUBMITTED",
            payload: {
              requestId: request.id,
              requesterEmployeeId: input.employeeId,
              returnedToStep: revision.stepOrder,
            },
          },
        }),
        tx.auditLog.create({
          data: {
            actorEmployeeId: input.employeeId,
            action: "OVERTIME_RESUBMIT",
            entityType: "OvertimeRequest",
            entityId: request.id,
            correlationId: input.correlationId,
            metadata: { returnedToStep: revision.stepOrder, requestedMinutes: day.requestedMinutes },
          },
        }),
      ]);

      return { requestId: request.id, returnedToStep: revision.stepOrder, replayed: false };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function withdrawApprovedOvertime(
  prisma: PrismaClient,
  input: {
    readonly actorEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly reason: string;
  },
): Promise<OvertimeWithdrawResult> {
  const reason = input.reason.trim();

  if (!reason || reason.length > 1000) {
    throw new Error("A withdrawal reason of 1 to 1000 characters is required");
  }

  return prisma.$transaction(
    async (tx) => {
      const request = await tx.overtimeRequest.findUnique({
        where: { id: input.requestId },
        select: { id: true, employeeId: true, status: true, approvalInstanceId: true },
      });

      if (!request) {
        throw new Error("Overtime request is unavailable for this employee");
      }

      if (request.status === "CANCELLED") {
        return { requestId: request.id, status: "CANCELLED" as const };
      }

      if (request.status !== "APPROVED") {
        throw new Error("Only an approved overtime request can be withdrawn");
      }

      const allowed = await actorHasRoleOverEmployee(
        tx,
        input.actorEmployeeId,
        LEAVE_WITHDRAW_ROLE_KEY,
        request.employeeId,
      );

      if (!allowed) {
        throw new Error("Not allowed to withdraw overtime of this employee");
      }

      await tx.overtimeRequest.update({
        where: { id: request.id },
        data: { status: "CANCELLED", decisionReason: reason },
      });

      await Promise.all([
        request.approvalInstanceId
          ? tx.approvalInstance.update({
              where: { id: request.approvalInstanceId },
              data: { status: "CANCELLED", decidedAt: new Date() },
            })
          : Promise.resolve(null),
        tx.notificationOutbox.create({
          data: {
            aggregateType: "OVERTIME_REQUEST",
            aggregateId: request.id,
            eventType: "OVERTIME_REQUEST_WITHDRAWN",
            payload: {
              requestId: request.id,
              requesterEmployeeId: request.employeeId,
              actorEmployeeId: input.actorEmployeeId,
            },
          },
        }),
        tx.auditLog.create({
          data: {
            actorEmployeeId: input.actorEmployeeId,
            action: "OVERTIME_WITHDRAW_APPROVED",
            entityType: "OvertimeRequest",
            entityId: request.id,
            correlationId: input.correlationId,
            metadata: { reason },
          },
        }),
      ]);

      return { requestId: request.id, status: "CANCELLED" as const };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
