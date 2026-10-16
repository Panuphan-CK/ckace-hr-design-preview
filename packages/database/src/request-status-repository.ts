import type {
  ApprovalHistoryItem,
  ApprovalHistoryOverview,
  RequestStatusItem,
  RequestStatusOverview,
  RequestTimeline,
} from "@ckace/contracts";
import type { PrismaClient } from "@prisma/client";

import { formatLeaveRequestNo } from "./leave-repository";

/** OT-0001 / MED-0001 / TC-0001 style numbers; grows past four digits when needed. */
export function formatRequestNo(prefix: "OT" | "MED" | "TC", value: number): string {
  return prefix + "-" + String(value).padStart(4, "0");
}

export interface RequestStatusRepository {
  getSelf(employeeId: string): Promise<RequestStatusOverview>;
  getAssigned(approverEmployeeId: string): Promise<RequestStatusOverview>;
  getApprovalHistory(
    approverEmployeeId: string,
  ): Promise<ApprovalHistoryOverview>;
  /** null when the request does not exist or the actor is neither the requester nor an approver on it. */
  getTimeline(actorEmployeeId: string, requestId: string): Promise<RequestTimeline | null>;
}

async function assertActive(
  prisma: Pick<PrismaClient, "employee">,
  employeeId: string,
): Promise<void> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { userAccount: { select: { state: true } } },
  });
  if (!employee?.userAccount || employee.userAccount.state !== "ACTIVE") {
    throw new Error("Active employee account is required");
  }
}

export function sortRequestStatusItems(
  items: readonly RequestStatusItem[],
): readonly RequestStatusItem[] {
  return [...items].sort((a, b) =>
    b.submittedAt.localeCompare(a.submittedAt) || b.id.localeCompare(a.id),
  );
}

export class PrismaRequestStatusRepository implements RequestStatusRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getSelf(employeeId: string): Promise<RequestStatusOverview> {
    await assertActive(this.prisma, employeeId);
    const [leaves, corrections, overtime, medical] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: { requesterEmployeeId: employeeId },
        select: {
          id: true, requestNo: true, status: true, submittedAt: true, decisionReason: true,
          description: true, leaveType: { select: { name: true } },
        },
      }),
      this.prisma.timeCorrectionRequest.findMany({
        where: { employeeId },
        select: {
          id: true, requestNo: true, status: true, requestedAt: true, decisionComment: true,
          reason: true,
        },
      }),
      this.prisma.overtimeRequest.findMany({
        where: { employeeId },
        select: {
          id: true, requestNo: true, status: true, submittedAt: true, decisionReason: true,
          reason: true,
        },
      }),
      this.prisma.medicalClaim.findMany({
        where: { employeeId },
        select: {
          id: true, requestNo: true, status: true, submittedAt: true, decisionReason: true,
          description: true,
        },
      }),
    ]);

    const requests: RequestStatusItem[] = [
      ...leaves.map((row) => ({
        id: row.id,
        requestNo: formatLeaveRequestNo(row.requestNo),
        kind: "LEAVE" as const,
        status: row.status,
        submittedAt: row.submittedAt.toISOString(),
        summary: `${row.leaveType.name}: ${row.description}`,
        decisionReason: row.decisionReason,
        employeeId,
        canDecide: false,
        approvalStepId: null,
        stepOrder: null,
      })),
      ...corrections.map((row) => ({
        id: row.id,
        requestNo: formatRequestNo("TC", row.requestNo),
        kind: "TIME_CORRECTION" as const,
        status: row.status,
        submittedAt: row.requestedAt.toISOString(),
        summary: row.reason,
        decisionReason: row.decisionComment,
        employeeId,
        canDecide: false,
        approvalStepId: null,
        stepOrder: null,
      })),
      ...overtime.map((row) => ({
        id: row.id,
        requestNo: formatRequestNo("OT", row.requestNo),
        kind: "OVERTIME" as const,
        status: row.status === "REVISION_REQUESTED" ? "REVISION_REQUESTED" as const : row.status,
        submittedAt: row.submittedAt.toISOString(),
        summary: row.reason,
        decisionReason: row.decisionReason,
        employeeId,
        canDecide: false,
        approvalStepId: null,
        stepOrder: null,
      })),
      ...medical.map((row) => ({
        id: row.id,
        requestNo: formatRequestNo("MED", row.requestNo),
        kind: "MEDICAL" as const,
        status: row.status,
        submittedAt: row.submittedAt.toISOString(),
        summary: row.description,
        decisionReason: row.decisionReason,
        employeeId,
        canDecide: false,
        approvalStepId: null,
        stepOrder: null,
      })),
    ];
    return { requests: sortRequestStatusItems(requests) };
  }

  async getAssigned(approverEmployeeId: string): Promise<RequestStatusOverview> {
    await assertActive(this.prisma, approverEmployeeId);
    const steps = await this.prisma.approvalStep.findMany({
      where: {
        approverEmployeeId,
        status: "PENDING",
        approvalInstance: { is: { status: "PENDING" } },
      },
      select: {
        id: true,
        stepOrder: true,
        approvalInstance: {
          select: {
            currentStepOrder: true,
            requesterEmployeeId: true,
            requester: { select: { fullName: true } },
            leaveRequest: {
              select: {
                id: true, requestNo: true, status: true, submittedAt: true, decisionReason: true,
                description: true, leaveType: { select: { name: true } },
              },
            },
            timeCorrection: {
              select: {
                id: true, requestNo: true, status: true, requestedAt: true, decisionComment: true,
                reason: true,
              },
            },
            overtimeRequest: {
              select: {
                id: true, requestNo: true, status: true, submittedAt: true, decisionReason: true,
                reason: true,
              },
            },
            medicalClaim: {
              select: {
                id: true, requestNo: true, status: true, submittedAt: true, decisionReason: true,
                description: true,
              },
            },
          },
        },
      },
      orderBy: [{ assignedAt: "asc" }, { id: "asc" }],
    });

    const items: RequestStatusItem[] = [];
    for (const step of steps) {
      const instance = step.approvalInstance;
      if (instance.currentStepOrder !== step.stepOrder) continue;
      const common = {
        employeeId: instance.requesterEmployeeId,
        employeeDisplayName: instance.requester.fullName,
        canDecide: true,
        approvalStepId: step.id,
        stepOrder: step.stepOrder,
      };
      if (instance.leaveRequest) {
        const row = instance.leaveRequest;
        items.push({
          ...common,
          id: row.id, requestNo: formatLeaveRequestNo(row.requestNo), kind: "LEAVE", status: row.status,
          submittedAt: row.submittedAt.toISOString(),
          summary: `${row.leaveType.name}: ${row.description}`,
          decisionReason: row.decisionReason,
        });
      } else if (instance.timeCorrection) {
        const row = instance.timeCorrection;
        items.push({
          ...common,
          id: row.id, requestNo: formatRequestNo("TC", row.requestNo), kind: "TIME_CORRECTION", status: row.status,
          submittedAt: row.requestedAt.toISOString(),
          summary: row.reason,
          decisionReason: row.decisionComment,
        });
      } else if (instance.overtimeRequest) {
        const row = instance.overtimeRequest;
        items.push({
          ...common,
          id: row.id, requestNo: formatRequestNo("OT", row.requestNo), kind: "OVERTIME", status: row.status,
          submittedAt: row.submittedAt.toISOString(),
          summary: row.reason,
          decisionReason: row.decisionReason,
        });
      } else if (instance.medicalClaim) {
        const row = instance.medicalClaim;
        items.push({
          ...common,
          id: row.id, requestNo: formatRequestNo("MED", row.requestNo), kind: "MEDICAL", status: row.status,
          submittedAt: row.submittedAt.toISOString(),
          summary: row.description,
          decisionReason: row.decisionReason,
        });
      }
    }
    return { requests: sortRequestStatusItems(items) };
  }

  async getTimeline(
    actorEmployeeId: string,
    requestId: string,
  ): Promise<RequestTimeline | null> {
    await assertActive(this.prisma, actorEmployeeId);
    const instance = await this.prisma.approvalInstance.findFirst({
      where: {
        OR: [
          { leaveRequest: { is: { id: requestId } } },
          { timeCorrection: { is: { id: requestId } } },
          { overtimeRequest: { is: { id: requestId } } },
          { medicalClaim: { is: { id: requestId } } },
        ],
      },
      select: {
        requesterEmployeeId: true,
        leaveRequest: { select: { requestNo: true } },
        timeCorrection: { select: { requestNo: true } },
        overtimeRequest: { select: { requestNo: true } },
        medicalClaim: { select: { requestNo: true } },
        steps: {
          select: {
            stepOrder: true,
            status: true,
            decidedAt: true,
            comment: true,
            approverEmployeeId: true,
            approver: { select: { fullName: true } },
          },
          orderBy: { stepOrder: "asc" },
        },
      },
    });
    if (!instance) return null;
    const allowed =
      instance.requesterEmployeeId === actorEmployeeId ||
      instance.steps.some((step) => step.approverEmployeeId === actorEmployeeId);
    if (!allowed) return null;

    const head = instance.leaveRequest
      ? { kind: "LEAVE" as const, requestNo: formatLeaveRequestNo(instance.leaveRequest.requestNo) }
      : instance.timeCorrection
        ? { kind: "TIME_CORRECTION" as const, requestNo: formatRequestNo("TC", instance.timeCorrection.requestNo) }
        : instance.overtimeRequest
          ? { kind: "OVERTIME" as const, requestNo: formatRequestNo("OT", instance.overtimeRequest.requestNo) }
          : instance.medicalClaim
            ? { kind: "MEDICAL" as const, requestNo: formatRequestNo("MED", instance.medicalClaim.requestNo) }
            : null;
    if (!head) return null;

    return {
      requestId,
      ...head,
      steps: instance.steps.map((step) => ({
        stepOrder: step.stepOrder,
        approverName: step.approver?.fullName ?? null,
        status: step.status,
        decidedAt: step.decidedAt ? step.decidedAt.toISOString() : null,
        comment: step.comment,
      })),
    };
  }

  async getApprovalHistory(
    approverEmployeeId: string,
  ): Promise<ApprovalHistoryOverview> {
    await assertActive(this.prisma, approverEmployeeId);
    const steps = await this.prisma.approvalStep.findMany({
      where: {
        approverEmployeeId,
        status: { in: ["APPROVED", "REJECTED"] },
        decidedAt: { not: null },
      },
      select: {
        id: true,
        stepOrder: true,
        status: true,
        decidedAt: true,
        comment: true,
        approvalInstance: {
          select: {
            requesterEmployeeId: true,
            requester: { select: { fullName: true } },
            leaveRequest: {
              select: {
                id: true,
                requestNo: true,
                submittedAt: true,
                description: true,
                leaveType: { select: { name: true } },
              },
            },
            timeCorrection: {
              select: {
                id: true,
                requestNo: true,
                requestedAt: true,
                reason: true,
              },
            },
            overtimeRequest: {
              select: {
                id: true,
                requestNo: true,
                submittedAt: true,
                reason: true,
              },
            },
            medicalClaim: {
              select: {
                id: true,
                requestNo: true,
                submittedAt: true,
                description: true,
              },
            },
          },
        },
      },
      orderBy: [{ decidedAt: "desc" }, { id: "desc" }],
      take: 2000,
    });

    const decisions: ApprovalHistoryItem[] = [];
    for (const step of steps) {
      if (
        !step.decidedAt ||
        (step.status !== "APPROVED" && step.status !== "REJECTED")
      ) {
        continue;
      }

      const instance = step.approvalInstance;
      const common = {
        id: step.id,
        decision: step.status,
        decidedAt: step.decidedAt.toISOString(),
        comment: step.comment,
        employeeId: instance.requesterEmployeeId,
        employeeDisplayName: instance.requester.fullName,
        stepOrder: step.stepOrder,
      } as const;

      if (instance.leaveRequest) {
        const row = instance.leaveRequest;
        decisions.push({
          ...common,
          requestId: row.id,
          requestNo: formatLeaveRequestNo(row.requestNo),
          kind: "LEAVE",
          submittedAt: row.submittedAt.toISOString(),
          summary: `${row.leaveType.name}: ${row.description}`,
        });
      } else if (instance.timeCorrection) {
        const row = instance.timeCorrection;
        decisions.push({
          ...common,
          requestId: row.id,
          requestNo: formatRequestNo("TC", row.requestNo),
          kind: "TIME_CORRECTION",
          submittedAt: row.requestedAt.toISOString(),
          summary: row.reason,
        });
      } else if (instance.overtimeRequest) {
        const row = instance.overtimeRequest;
        decisions.push({
          ...common,
          requestId: row.id,
          requestNo: formatRequestNo("OT", row.requestNo),
          kind: "OVERTIME",
          submittedAt: row.submittedAt.toISOString(),
          summary: row.reason,
        });
      } else if (instance.medicalClaim) {
        const row = instance.medicalClaim;
        decisions.push({
          ...common,
          requestId: row.id,
          requestNo: formatRequestNo("MED", row.requestNo),
          kind: "MEDICAL",
          submittedAt: row.submittedAt.toISOString(),
          summary: row.description,
        });
      }
    }

    return { decisions };
  }
}
