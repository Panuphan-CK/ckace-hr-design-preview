import type { Prisma, PrismaClient } from "@prisma/client";

type DelegationClient = Pick<PrismaClient, "approvalDelegation"> | Pick<Prisma.TransactionClient, "approvalDelegation">;

/** Today's date in Bangkok as a Date at UTC midnight (matches @db.Date columns). */
export function bangkokToday(now: Date = new Date()): Date {
  return new Date(new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10) + "T00:00:00.000Z");
}

/** Employees who have delegated their approvals to `actorId` for today. */
export async function delegatorIdsFor(
  prisma: DelegationClient,
  actorEmployeeId: string,
  now: Date = new Date(),
): Promise<readonly string[]> {
  const today = bangkokToday(now);
  const rows = await prisma.approvalDelegation.findMany({
    where: {
      delegateEmployeeId: actorEmployeeId,
      active: true,
      startDate: { lte: today },
      endDate: { gte: today },
    },
    select: { delegatorEmployeeId: true },
  });

  return rows.map((row) => row.delegatorEmployeeId);
}

/**
 * True when `actorEmployeeId` may decide a step assigned to `stepApproverId`: either they are the
 * approver, or the approver has an active delegation to them today. A delegate can never decide
 * their own request.
 */
export async function actorMayDecideStep(
  prisma: DelegationClient,
  input: {
    readonly stepApproverId: string | null;
    /** Other eligible approvers of the step (any of them may decide). */
    readonly coApproverIds?: readonly string[];
    readonly actorEmployeeId: string;
    readonly requesterEmployeeId: string;
  },
): Promise<boolean> {
  if (!input.stepApproverId) {
    return false;
  }

  if (input.stepApproverId === input.actorEmployeeId) {
    return true;
  }

  if (
    input.requesterEmployeeId !== input.actorEmployeeId &&
    input.coApproverIds?.includes(input.actorEmployeeId)
  ) {
    return true;
  }

  if (input.requesterEmployeeId === input.actorEmployeeId) {
    return false;
  }

  const delegators = await delegatorIdsFor(prisma, input.actorEmployeeId);

  return (
    delegators.includes(input.stepApproverId) ||
    (input.coApproverIds ?? []).some((id) => delegators.includes(id))
  );
}
