import type { ApprovalDelegationItem, ApprovalDelegationOverview } from "@ckace/contracts";
import type { Prisma, PrismaClient } from "@prisma/client";

import { bangkokToday } from "./approval-delegation";

export const APPROVE_PERMISSION_KEYS = [
  "leave.approve",
  "overtime.approve",
  "medical.approve",
  "time_correction.approve",
] as const;

const MAX_DELEGATION_DAYS = 92;

export interface DelegationRepository {
  overview(employeeId: string): Promise<ApprovalDelegationOverview>;
  create(input: {
    readonly delegatorEmployeeId: string;
    readonly delegateEmployeeId: string;
    readonly startDate: string;
    readonly endDate: string;
    readonly correlationId: string;
  }): Promise<ApprovalDelegationItem>;
  cancel(input: {
    readonly delegatorEmployeeId: string;
    readonly delegationId: string;
    readonly correlationId: string;
  }): Promise<ApprovalDelegationItem>;
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

const SELECT = {
  id: true,
  startDate: true,
  endDate: true,
  active: true,
  delegator: { select: { id: true, fullName: true } },
  delegate: { select: { id: true, fullName: true } },
} as const;

function view(row: {
  id: string;
  startDate: Date;
  endDate: Date;
  active: boolean;
  delegator: { id: string; fullName: string };
  delegate: { id: string; fullName: string };
}): ApprovalDelegationItem {
  return {
    id: row.id,
    delegatorEmployeeId: row.delegator.id,
    delegatorName: row.delegator.fullName,
    delegateEmployeeId: row.delegate.id,
    delegateName: row.delegate.fullName,
    startDate: dateOnly(row.startDate),
    endDate: dateOnly(row.endDate),
    active: row.active,
  };
}

function requireDate(value: string, label: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Delegation ${label} must use YYYY-MM-DD`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || dateOnly(date) !== value) {
    throw new Error(`Delegation ${label} is invalid`);
  }

  return date;
}

export class PrismaDelegationRepository implements DelegationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async overview(employeeId: string): Promise<ApprovalDelegationOverview> {
    const today = bangkokToday();
    const [given, received, candidates] = await Promise.all([
      this.prisma.approvalDelegation.findMany({
        where: { delegatorEmployeeId: employeeId, endDate: { gte: today } },
        select: SELECT,
        orderBy: [{ startDate: "asc" }, { id: "asc" }],
      }),
      this.prisma.approvalDelegation.findMany({
        where: { delegateEmployeeId: employeeId, active: true, endDate: { gte: today } },
        select: SELECT,
        orderBy: [{ startDate: "asc" }, { id: "asc" }],
      }),
      this.prisma.employee.findMany({
        where: {
          id: { not: employeeId },
          userAccount: {
            is: {
              state: "ACTIVE",
              roles: {
                some: {
                  role: { permissions: { some: { permission: { key: { in: [...APPROVE_PERMISSION_KEYS] } } } } },
                },
              },
            },
          },
        },
        select: { id: true, fullName: true },
        orderBy: [{ fullName: "asc" }, { id: "asc" }],
        take: 500,
      }),
    ]);

    return {
      given: given.map(view),
      received: received.map(view),
      candidates: candidates.map((row) => ({ employeeId: row.id, name: row.fullName })),
    };
  }

  async create(input: {
    readonly delegatorEmployeeId: string;
    readonly delegateEmployeeId: string;
    readonly startDate: string;
    readonly endDate: string;
    readonly correlationId: string;
  }): Promise<ApprovalDelegationItem> {
    const start = requireDate(input.startDate, "start date");
    const end = requireDate(input.endDate, "end date");

    if (input.delegateEmployeeId === input.delegatorEmployeeId) {
      throw new Error("Delegation cannot target yourself");
    }

    if (end < start) {
      throw new Error("Delegation end date must not be before the start date");
    }

    if (end < bangkokToday()) {
      throw new Error("Delegation end date cannot be in the past");
    }

    if ((end.getTime() - start.getTime()) / 86_400_000 + 1 > MAX_DELEGATION_DAYS) {
      throw new Error(`Delegation cannot be longer than ${MAX_DELEGATION_DAYS} days`);
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const [delegator, delegate] = await Promise.all([
        tx.employee.findUnique({
          where: { id: input.delegatorEmployeeId },
          select: { userAccount: { select: { state: true } } },
        }),
        tx.employee.findUnique({
          where: { id: input.delegateEmployeeId },
          select: {
            userAccount: {
              select: {
                state: true,
                roles: {
                  select: { role: { select: { permissions: { select: { permission: { select: { key: true } } } } } } },
                },
              },
            },
          },
        }),
      ]);

      if (delegator?.userAccount?.state !== "ACTIVE") {
        throw new Error("Active employee account is required");
      }

      const delegateKeys = new Set(
        (delegate?.userAccount?.roles ?? []).flatMap((item) => item.role.permissions.map((p) => p.permission.key)),
      );

      if (
        delegate?.userAccount?.state !== "ACTIVE" ||
        !APPROVE_PERMISSION_KEYS.some((key) => delegateKeys.has(key))
      ) {
        throw new Error("Delegate must be an active employee who can approve requests");
      }

      const overlapping = await tx.approvalDelegation.count({
        where: {
          delegatorEmployeeId: input.delegatorEmployeeId,
          active: true,
          startDate: { lte: end },
          endDate: { gte: start },
        },
      });

      if (overlapping > 0) {
        throw new Error("An active delegation already covers part of this period");
      }

      const row = await tx.approvalDelegation.create({
        data: {
          delegatorEmployeeId: input.delegatorEmployeeId,
          delegateEmployeeId: input.delegateEmployeeId,
          startDate: start,
          endDate: end,
        },
        select: SELECT,
      });

      await Promise.all([
        tx.notificationOutbox.create({
          data: {
            aggregateType: "APPROVAL_DELEGATION",
            aggregateId: row.id,
            eventType: "APPROVAL_DELEGATION_CREATED",
            payload: {
              delegationId: row.id,
              delegatorEmployeeId: input.delegatorEmployeeId,
              delegateEmployeeId: input.delegateEmployeeId,
              startDate: input.startDate,
              endDate: input.endDate,
            },
          },
        }),
        tx.auditLog.create({
          data: {
            actorEmployeeId: input.delegatorEmployeeId,
            action: "APPROVAL_DELEGATION_CREATED",
            entityType: "ApprovalDelegation",
            entityId: row.id,
            correlationId: input.correlationId,
            metadata: {
              delegateEmployeeId: input.delegateEmployeeId,
              startDate: input.startDate,
              endDate: input.endDate,
            },
          },
        }),
      ]);

      return view(row);
    });
  }

  async cancel(input: {
    readonly delegatorEmployeeId: string;
    readonly delegationId: string;
    readonly correlationId: string;
  }): Promise<ApprovalDelegationItem> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.approvalDelegation.findUnique({
        where: { id: input.delegationId },
        select: { delegatorEmployeeId: true, active: true },
      });

      if (!existing || existing.delegatorEmployeeId !== input.delegatorEmployeeId) {
        throw new Error("Delegation is unavailable for this employee");
      }

      const row = await tx.approvalDelegation.update({
        where: { id: input.delegationId },
        data: { active: false, cancelledAt: new Date() },
        select: SELECT,
      });

      if (existing.active) {
        await tx.auditLog.create({
          data: {
            actorEmployeeId: input.delegatorEmployeeId,
            action: "APPROVAL_DELEGATION_CANCELLED",
            entityType: "ApprovalDelegation",
            entityId: row.id,
            correlationId: input.correlationId,
          },
        });
      }

      return view(row);
    });
  }
}
