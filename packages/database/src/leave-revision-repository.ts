import { IdempotencyConflictError, createIdempotencyClaim } from "@ckace/auth";
import {
  CALENDAR_HOLDING_LEAVE_STATUSES,
  assertLeaveQuotaAvailable,
  assertNoOverlappingLeave,
  calculateLeaveUnits,
  normalizeLeavePeriod,
  type LeaveOverlapPeriod,
  type LeaveWorkingCalendar,
} from "@ckace/business-rules";
import type {
  LeaveResubmitInput,
  LeaveResubmitResult,
  LeaveWithdrawResult,
} from "@ckace/contracts";
import { Prisma, type PrismaClient } from "@prisma/client";

import { actorHasRoleOverEmployee } from "./approval-route-loader";
import { leaveAttachmentRows, validateLeaveAttachments } from "./leave-attachments";

/** Role that may withdraw an already approved leave request (Owner, 2026-10-16). */
export const LEAVE_WITHDRAW_ROLE_KEY = "SUPERADMIN";

type TxClient = Prisma.TransactionClient;

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function timeOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(11, 16) : null;
}

/** Calendar view of an existing request for overlap checks. */
export function overlapPeriodOf(row: {
  startDate: Date;
  endDate: Date;
  durationCode: "FULL_DAY" | "HOURLY" | "MORNING" | "AFTERNOON";
  startTime: Date | null;
  endTime: Date | null;
}): LeaveOverlapPeriod {
  return {
    startDate: dateOnly(row.startDate),
    endDate: dateOnly(row.endDate),
    durationCode: row.durationCode,
    startTime: timeOnly(row.startTime),
    endTime: timeOnly(row.endTime),
  };
}

async function loadCalendar(tx: TxClient): Promise<LeaveWorkingCalendar> {
  const [rules, holidays] = await Promise.all([
    tx.weeklyWorkRule.findMany({
      select: { isoWeekday: true, isWorking: true },
      orderBy: { isoWeekday: "asc" },
    }),
    tx.holiday.findMany({
      where: { active: true },
      select: { holidayDate: true },
    }),
  ]);

  return {
    workingIsoWeekdays: new Set(
      rules.filter((rule) => rule.isWorking).map((rule) => rule.isoWeekday),
    ),
    holidayDates: new Set(holidays.map((row) => dateOnly(row.holidayDate))),
  };
}

export async function resubmitSentBackLeave(
  prisma: PrismaClient,
  input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly request: LeaveResubmitInput;
    readonly canonicalPayload: string;
  },
): Promise<LeaveResubmitResult> {
  const claim = createIdempotencyClaim({
    actorEmployeeId: input.employeeId,
    operationKind: "LEAVE_RESUBMIT",
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

    const instance = await prisma.leaveRequest.findUnique({
      where: { id: existing.resultReferenceId },
      select: { approvalInstance: { select: { currentStepOrder: true } } },
    });

    return {
      requestId: existing.resultReferenceId,
      returnedToStep: instance?.approvalInstance?.currentStepOrder ?? 0,
      replayed: true,
    };
  }

  return prisma.$transaction(
    async (tx) => {
      await tx.idempotencyKey.create({ data: claim });

      const request = await tx.leaveRequest.findUnique({
        where: { id: input.requestId },
        select: {
          id: true,
          requesterEmployeeId: true,
          status: true,
          entitlementId: true,
          approvalInstanceId: true,
          leaveType: { select: { key: true } },
          _count: { select: { attachments: true } },
        },
      });

      if (!request || request.requesterEmployeeId !== input.employeeId) {
        throw new Error("Leave request not found");
      }

      if (request.status !== "REVISION_REQUESTED" || !request.approvalInstanceId) {
        throw new Error("Only a leave request sent back for revision can be resubmitted");
      }

      const steps = await tx.approvalStep.findMany({
        where: { approvalInstanceId: request.approvalInstanceId },
        select: { id: true, stepOrder: true, status: true },
        orderBy: { stepOrder: "asc" },
      });
      const returned = steps.filter((step) => step.status === "REVISION_REQUESTED");
      const revision = returned[0];

      if (returned.length !== 1 || !revision) {
        throw new Error("The step that sent this request back could not be found");
      }

      if (
        steps.some(
          (step) =>
            (step.stepOrder < revision.stepOrder && step.status !== "APPROVED") ||
            (step.stepOrder > revision.stepOrder && step.status !== "PENDING"),
        )
      ) {
        throw new Error("The approval chain of this request is inconsistent");
      }

      const entitlement = request.entitlementId
        ? await tx.leaveEntitlement.findUnique({
            where: { id: request.entitlementId },
            select: {
              id: true,
              quota: true,
              validFrom: true,
              validTo: true,
              leaveType: { select: { active: true } },
            },
          })
        : null;

      const period = normalizeLeavePeriod({
        startDate: input.request.startDate,
        endDate: input.request.endDate,
        durationCode: input.request.durationCode,
        startTime: input.request.startTime ?? null,
        endTime: input.request.endTime ?? null,
      });
      const start = new Date(`${period.startDate}T00:00:00.000Z`);
      const end = new Date(`${period.endDate}T00:00:00.000Z`);

      if (
        !entitlement ||
        !entitlement.leaveType.active ||
        (entitlement.validFrom && entitlement.validFrom > start) ||
        (entitlement.validTo && entitlement.validTo < end)
      ) {
        throw new Error("Leave entitlement is unavailable for this employee and period");
      }

      const calendar = await loadCalendar(tx);
      const requestedUsage = calculateLeaveUnits(period, calendar);
      const others = await tx.leaveRequest.findMany({
        where: {
          requesterEmployeeId: input.employeeId,
          id: { not: request.id },
          status: { in: [...CALENDAR_HOLDING_LEAVE_STATUSES] },
        },
        select: {
          entitlementId: true,
          startDate: true,
          endDate: true,
          durationCode: true,
          startTime: true,
          endTime: true,
        },
      });
      const used = others
        .filter((row) => row.entitlementId === entitlement.id)
        .reduce(
          (sum, row) =>
            sum +
            calculateLeaveUnits(
              normalizeLeavePeriod({
                startDate: dateOnly(row.startDate),
                endDate: dateOnly(row.endDate),
                durationCode: row.durationCode,
                startTime: timeOnly(row.startTime),
                endTime: timeOnly(row.endTime),
              }),
              calendar,
            ),
          0,
        );

      assertLeaveQuotaAvailable({
        quota: Number(entitlement.quota),
        used,
        requested: requestedUsage,
      });
      assertNoOverlappingLeave(
        {
          startDate: period.startDate,
          endDate: period.endDate,
          durationCode: period.durationCode,
          startTime: period.startTime ?? null,
          endTime: period.endTime ?? null,
        },
        others.map(overlapPeriodOf),
      );

      const attachmentIds = [...(input.request.attachmentIds ?? [])];
      validateLeaveAttachments({
        employeeId: input.employeeId,
        leaveTypeKey: request.leaveType.key,
        requestedIds: attachmentIds,
        rows: await leaveAttachmentRows(tx, attachmentIds),
        existingCount: request._count.attachments,
      });

      await tx.leaveRequest.update({
        where: { id: request.id },
        data: {
          ...(attachmentIds.length > 0
            ? { attachments: { create: attachmentIds.map((attachmentId) => ({ attachmentId })) } }
            : {}),
          description: input.request.description.trim(),
          startDate: start,
          endDate: end,
          durationCode: input.request.durationCode,
          startTime: period.startTime
            ? new Date(`1970-01-01T${period.startTime}:00.000Z`)
            : null,
          endTime: period.endTime
            ? new Date(`1970-01-01T${period.endTime}:00.000Z`)
            : null,
          status: "PENDING",
          decisionReason: null,
        },
      });

      await Promise.all([
        tx.approvalStep.update({
          where: { id: revision.id },
          data: {
            status: "PENDING",
            decidedAt: null,
            comment: null,
            assignedAt: new Date(),
          },
        }),
        tx.approvalInstance.update({
          where: { id: request.approvalInstanceId },
          data: {
            status: "PENDING",
            currentStepOrder: revision.stepOrder,
            decidedAt: null,
          },
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
            aggregateType: "LEAVE_REQUEST",
            aggregateId: request.id,
            eventType: "LEAVE_REQUEST_RESUBMITTED",
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
            action: "LEAVE_RESUBMIT",
            entityType: "LeaveRequest",
            entityId: request.id,
            correlationId: input.correlationId,
            metadata: { returnedToStep: revision.stepOrder, usageDays: requestedUsage },
          },
        }),
      ]);

      return {
        requestId: request.id,
        returnedToStep: revision.stepOrder,
        replayed: false,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function withdrawApprovedLeave(
  prisma: PrismaClient,
  input: {
    readonly actorEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly reason: string;
  },
): Promise<LeaveWithdrawResult> {
  const reason = input.reason.trim();

  if (!reason || reason.length > 1000) {
    throw new Error("A withdrawal reason of 1 to 1000 characters is required");
  }

  return prisma.$transaction(
    async (tx) => {
      const request = await tx.leaveRequest.findUnique({
        where: { id: input.requestId },
        select: {
          id: true,
          requesterEmployeeId: true,
          status: true,
          approvalInstanceId: true,
        },
      });

      if (!request) {
        throw new Error("Leave request not found");
      }

      if (request.status === "CANCELLED") {
        return { requestId: request.id, status: "CANCELLED" as const };
      }

      if (request.status !== "APPROVED") {
        throw new Error("Only an approved leave request can be withdrawn");
      }

      const allowed = await actorHasRoleOverEmployee(
        tx,
        input.actorEmployeeId,
        LEAVE_WITHDRAW_ROLE_KEY,
        request.requesterEmployeeId,
      );

      if (!allowed) {
        throw new Error("Not allowed to withdraw leave of this employee");
      }

      await tx.leaveRequest.update({
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
            aggregateType: "LEAVE_REQUEST",
            aggregateId: request.id,
            eventType: "LEAVE_REQUEST_WITHDRAWN",
            payload: {
              requestId: request.id,
              requesterEmployeeId: request.requesterEmployeeId,
              actorEmployeeId: input.actorEmployeeId,
            },
          },
        }),
        tx.auditLog.create({
          data: {
            actorEmployeeId: input.actorEmployeeId,
            action: "LEAVE_WITHDRAW_APPROVED",
            entityType: "LeaveRequest",
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
