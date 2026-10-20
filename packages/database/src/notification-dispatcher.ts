import {
  classifyNotificationEvent,
  isReminderDue,
  isReminderWindow,
  notificationText,
  type NotificationAudience,
  type NotificationKind,
} from "@ckace/business-rules";
import type { NotificationChannel, Prisma, PrismaClient } from "@prisma/client";

import { bangkokToday } from "./approval-delegation";
import { formatLeaveRequestNo } from "./leave-repository";
import { formatRequestNo } from "./request-status-repository";

/** ISO date (YYYY-MM-DD) -> DD/MM/YYYY with the Buddhist-era year, the project-wide date format. */
function displayIsoDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${Number(match[1]) + 543}` : iso;
}

function displayDate(value: Date): string {
  return displayIsoDate(value.toISOString().slice(0, 10));
}

/** A delivery channel (LINE push, email...). `send` throws when the provider refuses the message. */
export interface NotificationSender {
  readonly channel: Extract<NotificationChannel, "LINE" | "EMAIL">;
  send(input: { readonly to: string; readonly title: string; readonly body: string }): Promise<string | null>;
}

export interface DispatchResult {
  readonly processed: number;
  readonly sent: number;
  readonly retried: number;
  readonly failed: number;
  readonly skipped: number;
}

const MAX_ATTEMPTS = 5;
const BACKOFF_MINUTES = 5;

interface RequestContext {
  readonly requestNo: string | null;
  readonly label: string;
  readonly requesterEmployeeId: string | null;
  readonly requesterName: string | null;
  readonly summary: string | null;
  readonly comment: string | null;
  readonly status: string | null;
  /** Approver of the step that is waiting right now (null when nothing is waiting). */
  readonly currentApproverId: string | null;
  readonly coApproverIds: readonly string[];
}

const EMPTY_CONTEXT: RequestContext = {
  requestNo: null,
  label: "คำขอ",
  requesterEmployeeId: null,
  requesterName: null,
  summary: null,
  comment: null,
  status: null,
  currentApproverId: null,
  coApproverIds: [],
};

type InstanceShape = {
  currentStepOrder: number | null;
  steps: {
    stepOrder: number;
    approverEmployeeId: string | null;
    coApproverEmployeeIds: string[];
    status: string;
  }[];
} | null;

function waitingApprover(instance: InstanceShape): string | null {
  const step = instance?.steps.find(
    (candidate) => candidate.stepOrder === instance.currentStepOrder && candidate.status === "PENDING",
  );

  return step?.approverEmployeeId ?? null;
}

function waitingCoApprovers(instance: InstanceShape): readonly string[] {
  const step = instance?.steps.find(
    (candidate) => candidate.stepOrder === instance.currentStepOrder && candidate.status === "PENDING",
  );

  return step?.coApproverEmployeeIds ?? [];
}

const INSTANCE_SELECT = {
  select: {
    currentStepOrder: true,
    steps: { select: { stepOrder: true, approverEmployeeId: true, coApproverEmployeeIds: true, status: true } },
  },
} as const;

async function loadContext(
  prisma: PrismaClient,
  aggregateType: string,
  aggregateId: string,
): Promise<RequestContext> {
  switch (aggregateType) {
    case "LEAVE_REQUEST": {
      const row = await prisma.leaveRequest.findUnique({
        where: { id: aggregateId },
        select: {
          requestNo: true,
          status: true,
          requesterEmployeeId: true,
          decisionReason: true,
          startDate: true,
          endDate: true,
          requester: { select: { fullName: true } },
          leaveType: { select: { name: true } },
          approvalInstance: INSTANCE_SELECT,
        },
      });

      return row
        ? {
            requestNo: formatLeaveRequestNo(row.requestNo),
            label: "ใบลา",
            requesterEmployeeId: row.requesterEmployeeId,
            requesterName: row.requester.fullName,
            summary: `${row.leaveType.name} ${displayDate(row.startDate)}${
              row.endDate.getTime() !== row.startDate.getTime() ? " ถึง " + displayDate(row.endDate) : ""
            }`,
            comment: row.decisionReason,
            status: row.status,
            currentApproverId: waitingApprover(row.approvalInstance),
            coApproverIds: waitingCoApprovers(row.approvalInstance),
          }
        : EMPTY_CONTEXT;
    }
    case "OVERTIME_REQUEST": {
      const row = await prisma.overtimeRequest.findUnique({
        where: { id: aggregateId },
        select: {
          requestNo: true,
          status: true,
          employeeId: true,
          reason: true,
          decisionReason: true,
          employee: { select: { fullName: true } },
          segments: { select: { workDate: true, startTime: true, endTime: true }, take: 1 },
          approvalInstance: INSTANCE_SELECT,
        },
      });
      const segment = row?.segments[0];

      return row
        ? {
            requestNo: formatRequestNo("OT", row.requestNo),
            label: "คำขอ OT",
            requesterEmployeeId: row.employeeId,
            requesterName: row.employee.fullName,
            summary: segment
              ? `${displayDate(segment.workDate)} ${segment.startTime.toISOString().slice(11, 16)}-${segment.endTime.toISOString().slice(11, 16)} ${row.reason}`
              : row.reason,
            comment: row.decisionReason,
            status: row.status,
            currentApproverId: waitingApprover(row.approvalInstance),
            coApproverIds: waitingCoApprovers(row.approvalInstance),
          }
        : EMPTY_CONTEXT;
    }
    case "MEDICAL_CLAIM": {
      const row = await prisma.medicalClaim.findUnique({
        where: { id: aggregateId },
        select: {
          requestNo: true,
          status: true,
          employeeId: true,
          amount: true,
          description: true,
          decisionReason: true,
          employee: { select: { fullName: true } },
          approvalInstance: INSTANCE_SELECT,
        },
      });

      return row
        ? {
            requestNo: formatRequestNo("MED", row.requestNo),
            label: "คำขอเบิกค่ารักษา",
            requesterEmployeeId: row.employeeId,
            requesterName: row.employee.fullName,
            summary: `${row.amount.toString()} บาท ${row.description}`,
            comment: row.decisionReason,
            status: row.status,
            currentApproverId: waitingApprover(row.approvalInstance),
            coApproverIds: waitingCoApprovers(row.approvalInstance),
          }
        : EMPTY_CONTEXT;
    }
    case "TIME_CORRECTION": {
      const row = await prisma.timeCorrectionRequest.findUnique({
        where: { id: aggregateId },
        select: {
          requestNo: true,
          status: true,
          employeeId: true,
          attendanceDate: true,
          reason: true,
          decisionComment: true,
          employee: { select: { fullName: true } },
          approvalInstance: INSTANCE_SELECT,
        },
      });

      return row
        ? {
            requestNo: formatRequestNo("TC", row.requestNo),
            label: "คำขอแก้ไขเวลา",
            requesterEmployeeId: row.employeeId,
            requesterName: row.employee.fullName,
            summary: `${displayDate(row.attendanceDate)} ${row.reason}`,
            comment: row.decisionComment,
            status: row.status,
            currentApproverId: waitingApprover(row.approvalInstance),
            coApproverIds: waitingCoApprovers(row.approvalInstance),
          }
        : EMPTY_CONTEXT;
    }
    default:
      return EMPTY_CONTEXT;
  }
}

async function resolveRecipients(
  prisma: PrismaClient,
  audience: NotificationAudience,
  kind: NotificationKind,
  context: RequestContext,
  event: { aggregateId: string; payload: Prisma.JsonValue },
  now: Date,
): Promise<readonly string[]> {
  const payload = (event.payload ?? {}) as Record<string, unknown>;

  switch (audience) {
    case "REQUESTER":
      return context.requesterEmployeeId ? [context.requesterEmployeeId] : [];
    case "APPROVER": {
      // A waiting notice is stale when the request moved on before the message went out.
      if (!context.currentApproverId || context.status !== "PENDING") {
        return [];
      }

      const today = bangkokToday(now);
      const delegates = await prisma.approvalDelegation.findMany({
        where: {
          delegatorEmployeeId: context.currentApproverId,
          active: true,
          startDate: { lte: today },
          endDate: { gte: today },
        },
        select: { delegateEmployeeId: true },
      });
      const ids = new Set([
        context.currentApproverId,
        ...context.coApproverIds,
        ...delegates.map((row) => row.delegateEmployeeId),
      ]);

      // Never tell someone to approve their own request.
      if (context.requesterEmployeeId) {
        ids.delete(context.requesterEmployeeId);
      }

      return [...ids];
    }
    case "PRIOR_APPROVERS": {
      const ids = Array.isArray(payload.approverEmployeeIds)
        ? payload.approverEmployeeIds.filter((id): id is string => typeof id === "string")
        : [];
      return ids.filter((id) => id !== context.requesterEmployeeId);
    }
    case "DELEGATE":
      return typeof payload.delegateEmployeeId === "string" ? [payload.delegateEmployeeId] : [];
    case "EMPLOYEE":
      return [event.aggregateId];
    case "NONE":
      return [];
  }

  void kind;

  return [];
}

async function recipientAddresses(prisma: PrismaClient, employeeId: string) {
  const row = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      lineAccount: { select: { lineUserId: true } },
      userAccount: { select: { loginName: true, state: true } },
    },
  });
  const login = row?.userAccount?.state === "ACTIVE" ? row.userAccount.loginName : null;

  return {
    line: row?.lineAccount?.lineUserId ?? null,
    email: login && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login) ? login : null,
  };
}

function messageFor(
  kind: NotificationKind,
  context: RequestContext,
  payload: Record<string, unknown>,
  extra: { delegatorName?: string | null; delegationPeriod?: string | null },
) {
  return notificationText({
    kind,
    requestNo: context.requestNo,
    requestLabel: context.label,
    requesterName: context.requesterName,
    summary: context.summary,
    comment: context.comment,
    ...(typeof payload.hoursPending === "number" ? { hoursPending: payload.hoursPending } : {}),
    delegatorName: extra.delegatorName ?? null,
    delegationPeriod: extra.delegationPeriod ?? null,
  });
}

/**
 * Turns pending outbox events into in-app messages and channel deliveries (LINE, email).
 * Idempotent: one inbox row per (event, person) and one delivery per (event, channel, person); a
 * failed channel is retried with backoff and never re-sends to a channel that already succeeded.
 */
export async function dispatchNotifications(
  prisma: PrismaClient,
  input: { readonly senders: readonly NotificationSender[]; readonly now?: Date; readonly limit?: number },
): Promise<DispatchResult> {
  const now = input.now ?? new Date();
  const events = await prisma.notificationOutbox.findMany({
    where: { status: "PENDING", availableAt: { lte: now } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: input.limit ?? 50,
  });
  let sent = 0;
  let retried = 0;
  let failed = 0;
  let skipped = 0;

  for (const event of events) {
    const claimed = await prisma.notificationOutbox.updateMany({
      where: { id: event.id, status: "PENDING" },
      data: { status: "PROCESSING", attempts: { increment: 1 } },
    });

    if (claimed.count !== 1) {
      continue;
    }

    try {
      const payload = (event.payload ?? {}) as Record<string, unknown>;
      const context = await loadContext(prisma, event.aggregateType, event.aggregateId);
      // A decision event describes the status it produced, not whatever the request became since.
      const classification = classifyNotificationEvent(
        event.eventType,
        typeof payload.resultingStatus === "string" ? payload.resultingStatus : context.status,
      );
      const recipients = await resolveRecipients(
        prisma,
        classification.audience,
        classification.kind,
        context,
        event,
        now,
      );

      let extra: { delegatorName?: string | null; delegationPeriod?: string | null } = {};

      if (classification.kind === "DELEGATION_RECEIVED") {
        const delegator =
          typeof payload.delegatorEmployeeId === "string"
            ? await prisma.employee.findUnique({
                where: { id: payload.delegatorEmployeeId },
                select: { fullName: true },
              })
            : null;
        extra = {
          delegatorName: delegator?.fullName ?? null,
          delegationPeriod:
            typeof payload.startDate === "string" && typeof payload.endDate === "string"
              ? `${displayIsoDate(payload.startDate)} ถึง ${displayIsoDate(payload.endDate)}`
              : null,
        };
      }

      if (recipients.length === 0) {
        await prisma.notificationOutbox.update({
          where: { id: event.id },
          data: { status: "SENT", lastError: null },
        });
        skipped += 1;
        continue;
      }

      const text = messageFor(classification.kind, context, payload, extra);
      let anyFailure: string | null = null;

      for (const employeeId of recipients) {
        await prisma.inAppNotification.upsert({
          where: { sourceOutboxId_employeeId: { sourceOutboxId: event.id, employeeId } },
          update: {},
          create: {
            employeeId,
            kind: classification.kind,
            title: text.title,
            body: text.body,
            requestNo: context.requestNo,
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
            sourceOutboxId: event.id,
          },
        });

        const addresses = await recipientAddresses(prisma, employeeId);

        for (const sender of input.senders) {
          const to = sender.channel === "LINE" ? addresses.line : addresses.email;

          if (!to) {
            continue;
          }

          const existing = await prisma.notificationDelivery.findUnique({
            where: {
              outboxId_channel_recipientEmployeeId: {
                outboxId: event.id,
                channel: sender.channel,
                recipientEmployeeId: employeeId,
              },
            },
            select: { id: true, status: true },
          });

          if (existing?.status === "SENT") {
            continue;
          }

          try {
            const providerRef = await sender.send({ to, title: text.title, body: text.body });

            await prisma.notificationDelivery.upsert({
              where: {
                outboxId_channel_recipientEmployeeId: {
                  outboxId: event.id,
                  channel: sender.channel,
                  recipientEmployeeId: employeeId,
                },
              },
              update: { status: "SENT", providerRef, error: null, attemptedAt: now },
              create: {
                outboxId: event.id,
                channel: sender.channel,
                recipientEmployeeId: employeeId,
                status: "SENT",
                providerRef,
                attemptedAt: now,
              },
            });
          } catch (error) {
            const message = (error instanceof Error ? error.message : "send failed").slice(0, 300);

            anyFailure = `${sender.channel}: ${message}`;
            await prisma.notificationDelivery.upsert({
              where: {
                outboxId_channel_recipientEmployeeId: {
                  outboxId: event.id,
                  channel: sender.channel,
                  recipientEmployeeId: employeeId,
                },
              },
              update: { status: "FAILED", error: message, attemptedAt: now },
              create: {
                outboxId: event.id,
                channel: sender.channel,
                recipientEmployeeId: employeeId,
                status: "FAILED",
                error: message,
                attemptedAt: now,
              },
            });
          }
        }
      }

      if (!anyFailure) {
        await prisma.notificationOutbox.update({ where: { id: event.id }, data: { status: "SENT", lastError: null } });
        sent += 1;
      } else if (event.attempts + 1 < MAX_ATTEMPTS) {
        await prisma.notificationOutbox.update({
          where: { id: event.id },
          data: {
            status: "PENDING",
            lastError: anyFailure,
            availableAt: new Date(now.getTime() + (event.attempts + 1) * BACKOFF_MINUTES * 60_000),
          },
        });
        retried += 1;
      } else {
        await prisma.notificationOutbox.update({
          where: { id: event.id },
          data: { status: "FAILED", lastError: anyFailure },
        });
        failed += 1;
      }
    } catch (error) {
      const message = (error instanceof Error ? error.message : "dispatch failed").slice(0, 300);

      await prisma.notificationOutbox.update({
        where: { id: event.id },
        data: event.attempts + 1 < MAX_ATTEMPTS
          ? {
              status: "PENDING",
              lastError: message,
              availableAt: new Date(now.getTime() + (event.attempts + 1) * BACKOFF_MINUTES * 60_000),
            }
          : { status: "FAILED", lastError: message },
      });
      if (event.attempts + 1 < MAX_ATTEMPTS) {
        retried += 1;
      } else {
        failed += 1;
      }
    }
  }

  return { processed: events.length, sent, retried, failed, skipped };
}

/**
 * Queues one reminder per overdue approval step: after 24 hours pending, then every 24 hours, only
 * inside working hours on working days (Bangkok). Returns the number of reminders queued.
 */
export async function queueOverdueApprovalReminders(
  prisma: PrismaClient,
  input: { readonly now?: Date } = {},
): Promise<number> {
  const now = input.now ?? new Date();
  const local = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const dateKey = local.toISOString().slice(0, 10);
  const isoWeekday = ((local.getUTCDay() + 6) % 7) + 1;
  const [rule, holiday] = await Promise.all([
    prisma.weeklyWorkRule.findUnique({ where: { isoWeekday }, select: { isWorking: true } }),
    prisma.holiday.findFirst({
      where: { active: true, holidayDate: new Date(`${dateKey}T00:00:00.000Z`) },
      select: { id: true },
    }),
  ]);

  if (
    !isReminderWindow({
      isoWeekday,
      minutesOfDay: local.getUTCHours() * 60 + local.getUTCMinutes(),
      isWorkday: Boolean(rule?.isWorking) && !holiday,
    })
  ) {
    return 0;
  }

  const steps = await prisma.approvalStep.findMany({
    where: {
      status: "PENDING",
      assignedAt: { not: null, lte: new Date(now.getTime() - 24 * 3_600_000) },
      approvalInstance: {
        is: {
          status: "PENDING",
          requestKind: { in: ["LEAVE", "OVERTIME", "MEDICAL", "TIME_CORRECTION"] },
        },
      },
    },
    select: {
      id: true,
      stepOrder: true,
      assignedAt: true,
      lastReminderAt: true,
      approverEmployeeId: true,
      approvalInstance: {
        select: {
          currentStepOrder: true,
          leaveRequest: { select: { id: true } },
          overtimeRequest: { select: { id: true } },
          medicalClaim: { select: { id: true } },
          timeCorrection: { select: { id: true } },
        },
      },
    },
    orderBy: [{ assignedAt: "asc" }, { id: "asc" }],
    take: 500,
  });
  let queued = 0;

  for (const step of steps) {
    const instance = step.approvalInstance;

    if (
      !step.assignedAt ||
      !step.approverEmployeeId ||
      instance.currentStepOrder !== step.stepOrder ||
      !isReminderDue({ assignedAt: step.assignedAt, lastReminderAt: step.lastReminderAt, now })
    ) {
      continue;
    }

    const target = instance.leaveRequest
      ? { aggregateType: "LEAVE_REQUEST", aggregateId: instance.leaveRequest.id }
      : instance.overtimeRequest
        ? { aggregateType: "OVERTIME_REQUEST", aggregateId: instance.overtimeRequest.id }
        : instance.medicalClaim
          ? { aggregateType: "MEDICAL_CLAIM", aggregateId: instance.medicalClaim.id }
          : instance.timeCorrection
            ? { aggregateType: "TIME_CORRECTION", aggregateId: instance.timeCorrection.id }
            : null;

    if (!target) {
      continue;
    }

    await prisma.$transaction([
      prisma.notificationOutbox.create({
        data: {
          ...target,
          eventType: "APPROVAL_REMINDER",
          payload: {
            stepId: step.id,
            approverEmployeeId: step.approverEmployeeId,
            hoursPending: Math.floor((now.getTime() - step.assignedAt.getTime()) / 3_600_000),
          },
        },
      }),
      prisma.approvalStep.update({ where: { id: step.id }, data: { lastReminderAt: now } }),
    ]);
    queued += 1;
  }

  return queued;
}
