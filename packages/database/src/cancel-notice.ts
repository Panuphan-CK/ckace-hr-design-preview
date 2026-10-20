import type { Prisma } from "@prisma/client";

/** Approvers still waiting on a request, read before a cancel closes its steps so they can be told it was withdrawn. */
export async function pendingApproverIds(
  tx: Pick<Prisma.TransactionClient, "approvalStep">,
  approvalInstanceId: string | null,
): Promise<string[]> {
  if (!approvalInstanceId) return [];
  const steps = await tx.approvalStep.findMany({
    where: { approvalInstanceId, status: "PENDING" },
    select: { approverEmployeeId: true, coApproverEmployeeIds: true },
  });
  const ids = new Set<string>();
  for (const step of steps) {
    if (step.approverEmployeeId) ids.add(step.approverEmployeeId);
    for (const id of step.coApproverEmployeeIds) ids.add(id);
  }
  return [...ids];
}
