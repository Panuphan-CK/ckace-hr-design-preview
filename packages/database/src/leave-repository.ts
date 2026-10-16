import {
  IdempotencyConflictError,
  createIdempotencyClaim,
} from "@ckace/auth";
import {
  CALENDAR_HOLDING_LEAVE_STATUSES,
  assertLeaveQuotaAvailable,
  assertNoOverlappingLeave,
  calculateLeaveUnits,
  normalizeLeavePeriod,
  type LeaveWorkingCalendar,
} from "@ckace/business-rules";
import type {
  LeaveApprovalDecisionInput,
  LeaveApprovalDecisionResult,
  LeaveApprovalStepOptions,
  LeaveCancelResult,
  LeaveCreateInput,
  LeaveCreateResult,
  LeaveRequestView,
  LeaveResubmitInput,
  LeaveResubmitResult,
  LeaveSelfOverview,
  LeaveWithdrawResult,
} from "@ckace/contracts";
import {
  Prisma,
  type PrismaClient,
} from "@prisma/client";

import { resolveCompanyApprovalRoute } from "./approval-route-loader";
import { actorMayDecideStep, bangkokToday } from "./approval-delegation";
import {
  overlapPeriodOf,
  resubmitSentBackLeave,
  withdrawApprovedLeave,
} from "./leave-revision-repository";

/** Request states whose days count against the entitlement when a new request is checked. */
export const QUOTA_RESERVING_STATUSES = ["APPROVED", "PENDING", "REVISION_REQUESTED"] as const;

/**
 * Splits an entitlement's usage into approved days and days held by open requests,
 * and what is still available to request. Pure so it can be unit tested.
 */
export function summarizeEntitlementUsage<T extends { readonly status: string; readonly entitlementId: string | null }>(
  requests: readonly T[],
  entitlementId: string,
  quota: number,
  usageOf: (request: T) => number,
): { used: number; pending: number; remaining: number } {
  let used = 0;
  let pending = 0;
  for (const request of requests) {
    if (request.entitlementId !== entitlementId) continue;
    if (request.status === "APPROVED") used += usageOf(request);
    else if (request.status === "PENDING" || request.status === "REVISION_REQUESTED") pending += usageOf(request);
  }
  return { used, pending, remaining: Math.max(0, quota - used - pending) };
}

export interface LeaveRepository {
  getSelfOverview(
    employeeId: string,
  ): Promise<LeaveSelfOverview>;

  getApprovalOptions(
    employeeId: string,
  ): Promise<readonly LeaveApprovalStepOptions[]>;

  createSelfLeave(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly request: LeaveCreateInput;
    readonly canonicalPayload: string;
  }): Promise<LeaveCreateResult>;

  cancelSelfLeave(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
  }): Promise<LeaveCancelResult>;

  decideLeave(input: {
    readonly approverEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly decision: LeaveApprovalDecisionInput;
  }): Promise<LeaveApprovalDecisionResult>;

  resubmitLeave(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly request: LeaveResubmitInput;
    readonly canonicalPayload: string;
  }): Promise<LeaveResubmitResult>;

  withdrawApprovedLeave(input: {
    readonly actorEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly reason: string;
  }): Promise<LeaveWithdrawResult>;
}

/** LEV-0001 style number; grows past four digits when needed. */
export function formatLeaveRequestNo(value: number): string {
  return "LEV-" + String(value).padStart(4, "0");
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function timeOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(11, 16) : null;
}

function asNumber(value: Prisma.Decimal): number {
  const numberValue = value.toNumber();

  if (!Number.isFinite(numberValue)) {
    throw new Error("Leave decimal value is not finite");
  }

  return numberValue;
}

async function calendarPolicy(
  prisma: Pick<Prisma.TransactionClient, "weeklyWorkRule" | "holiday">,
): Promise<LeaveWorkingCalendar> {
  const [rules, holidays] = await Promise.all([
    prisma.weeklyWorkRule.findMany({
      select: {
        isoWeekday: true,
        isWorking: true,
      },
      orderBy: { isoWeekday: "asc" },
    }),
    prisma.holiday.findMany({
      where: { active: true },
      select: { holidayDate: true },
    }),
  ]);

  return {
    workingIsoWeekdays: new Set(
      rules
        .filter((rule) => rule.isWorking)
        .map((rule) => rule.isoWeekday),
    ),
    holidayDates: new Set(
      holidays.map((holiday) =>
        dateOnly(holiday.holidayDate),
      ),
    ),
  };
}

function usageForRequest(
  request: {
    startDate: Date;
    endDate: Date;
    durationCode: "FULL_DAY" | "HOURLY" | "MORNING" | "AFTERNOON";
    startTime: Date | null;
    endTime: Date | null;
  },
  calendar: LeaveWorkingCalendar,
): number {
  return calculateLeaveUnits(
    normalizeLeavePeriod({
      startDate: dateOnly(request.startDate),
      endDate: dateOnly(request.endDate),
      durationCode: request.durationCode,
      startTime: timeOnly(request.startTime),
      endTime: timeOnly(request.endTime),
    }),
    calendar,
  );
}

async function requesterContext(
  prisma: Pick<Prisma.TransactionClient, "employee">,
  employeeId: string,
) {
  const requester = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      agencyId: true,
      departmentId: true,
      userAccount: {
        select: { state: true },
      },
    },
  });

  if (!requester?.userAccount || requester.userAccount.state !== "ACTIVE") {
    throw new Error("Active employee account is required");
  }

  return requester;
}

async function activeLeavePolicy(
  prisma: Pick<Prisma.TransactionClient, "approvalPolicy">,
  agencyId: string | null,
) {
  const policies = await prisma.approvalPolicy.findMany({
    where: {
      active: true,
      requestKind: "LEAVE",
      OR: [
        { agencyId },
        { agencyId: null },
      ],
    },
    select: {
      id: true,
      agencyId: true,
      steps: {
        select: {
          stepOrder: true,
          requiredRoleId: true,
          scope: true,
          requiredRole: {
            select: { key: true },
          },
        },
        orderBy: { stepOrder: "asc" },
      },
    },
  });

  const policy =
    policies.find((candidate) => candidate.agencyId === agencyId) ??
    policies.find((candidate) => candidate.agencyId === null);

  if (!policy || policy.steps.length === 0) {
    throw new Error("Leave approval policy is unavailable");
  }

  return policy;
}

export function buildLeaveApproverScopeWhere(
  scope: "SAME_AGENCY" | "SAME_DEPARTMENT" | "GLOBAL",
  requester: {
    readonly agencyId: string | null;
    readonly departmentId: string | null;
  },
): Prisma.EmployeeWhereInput {
  if (scope === "SAME_AGENCY") {
    if (!requester.agencyId) {
      throw new Error(
        "Leave approval scope SAME_AGENCY requires requester agency",
      );
    }

    return { agencyId: requester.agencyId };
  }

  if (scope === "SAME_DEPARTMENT") {
    if (!requester.departmentId) {
      throw new Error(
        "Leave approval scope SAME_DEPARTMENT requires requester department",
      );
    }

    return { departmentId: requester.departmentId };
  }

  return {};
}

async function approvalOptionsFor(
  prisma: Pick<
    Prisma.TransactionClient,
    "employee" | "approvalPolicy" | "agency"
  >,
  employeeId: string,
): Promise<{
  readonly policyId: string;
  readonly options: readonly LeaveApprovalStepOptions[];
}> {
  const requester = await requesterContext(prisma, employeeId);
  const policy = await activeLeavePolicy(prisma, requester.agencyId);

  // Company-aware routing (owner organisation 2026-10-15). Requesters whose
  // team is not attached to a company keep the legacy behaviour below.
  const routed = await resolveCompanyApprovalRoute(
    prisma,
    employeeId,
    policy.steps.map((step) => ({
      kind: "ROLE" as const,
      roleKey: step.requiredRole.key,
      peerFallback: true,
    })),
  );

  if (routed) {
    if (routed.route.steps.length === 0) {
      throw new Error("No eligible approver for leave");
    }

    return {
      policyId: policy.id,
      options: routed.route.steps.map((resolved) => {
        const policyStep = policy.steps[resolved.policyStepIndex];

        return {
          stepOrder: resolved.stepOrder,
          requiredRoleKey:
            resolved.source.kind === "ROLE"
              ? resolved.source.roleKey
              : (policyStep?.requiredRole.key ?? ""),
          scope: policyStep?.scope ?? "GLOBAL",
          candidates: resolved.candidateIds.map((id) => ({
            employeeId: id,
            displayName: routed.displayNames.get(id) ?? "",
          })),
        };
      }),
    };
  }

  const options: LeaveApprovalStepOptions[] = [];

  for (const step of policy.steps) {
    const candidates = await prisma.employee.findMany({
      where: {
        ...buildLeaveApproverScopeWhere(
          step.scope,
          requester,
        ),
        userAccount: {
          is: {
            state: "ACTIVE",
            roles: {
              some: {
                roleId: step.requiredRoleId,
              },
            },
          },
        },
      },
      select: {
        id: true,
        fullName: true,
      },
      orderBy: [
        { fullName: "asc" },
        { id: "asc" },
      ],
    });

    if (candidates.length === 0) {
      throw new Error(
        `No eligible approver for leave step ${step.stepOrder}`,
      );
    }

    options.push({
      stepOrder: step.stepOrder,
      requiredRoleKey: step.requiredRole.key,
      scope: step.scope,
      candidates: candidates.map((candidate) => ({
        employeeId: candidate.id,
        displayName: candidate.fullName,
      })),
    });
  }

  return {
    policyId: policy.id,
    options,
  };
}

function validateSelectedApprovers(
  selected: readonly string[],
  options: readonly LeaveApprovalStepOptions[],
): void {
  if (selected.length !== options.length) {
    throw new Error("Leave approval chain selection is incomplete");
  }

  const duplicates = new Set(selected);

  if (duplicates.size !== selected.length) {
    throw new Error("Leave approval chain contains duplicate approvers");
  }

  for (let index = 0; index < options.length; index += 1) {
    const employeeId = selected[index];
    const step = options[index];

    if (
      !employeeId ||
      !step ||
      !step.candidates.some(
        (candidate) => candidate.employeeId === employeeId,
      )
    ) {
      throw new Error(
        `Selected approver is not eligible for leave step ${step?.stepOrder ?? index + 1}`,
      );
    }
  }
}

export class PrismaLeaveRepository implements LeaveRepository {
  constructor(
    private readonly prisma: PrismaClient,
  ) {}

  async getSelfOverview(
    employeeId: string,
  ): Promise<LeaveSelfOverview> {
    await requesterContext(this.prisma, employeeId);

    const [entitlements, requests, calendar] = await Promise.all([
      this.prisma.leaveEntitlement.findMany({
        // Balance cards show only entitlements valid today (calendar-year grants do not pile up).
        where: {
          employeeId,
          AND: [
            { OR: [{ validFrom: null }, { validFrom: { lte: bangkokToday() } }] },
            { OR: [{ validTo: null }, { validTo: { gte: bangkokToday() } }] },
          ],
        },
        select: {
          id: true,
          quota: true,
          leaveTypeId: true,
          validFrom: true,
          validTo: true,
          leaveType: {
            select: {
              key: true,
              name: true,
            },
          },
        },
        orderBy: {
          leaveType: { key: "asc" },
        },
      }),
      this.prisma.leaveRequest.findMany({
        where: { requesterEmployeeId: employeeId },
        select: {
          id: true,
          requestNo: true,
          approvalInstance: {
            select: {
              steps: {
                select: {
                  stepOrder: true,
                  status: true,
                  decidedAt: true,
                  comment: true,
                  approverEmployeeId: true,
                  decidedByEmployeeId: true,
                  decidedBy: { select: { fullName: true } },
                  approver: { select: { fullName: true } },
                },
                orderBy: { stepOrder: "asc" },
              },
            },
          },
          description: true,
          startDate: true,
          endDate: true,
          durationCode: true,
          startTime: true,
          endTime: true,
          status: true,
          decisionReason: true,
          submittedAt: true,
          entitlementId: true,
          leaveType: {
            select: {
              key: true,
              name: true,
            },
          },
        },
        orderBy: [
          { submittedAt: "desc" },
          { id: "desc" },
        ],
      }),
      calendarPolicy(this.prisma),
    ]);

    const requestViews: LeaveRequestView[] = requests.map(
      (request) => ({
        requestId: request.id,
        requestNo: formatLeaveRequestNo(request.requestNo),
        steps: (request.approvalInstance?.steps ?? []).map((step) => ({
          stepOrder: step.stepOrder,
          approverName: step.approver?.fullName ?? null,
          decidedByName:
            step.decidedByEmployeeId && step.decidedByEmployeeId !== step.approverEmployeeId
              ? step.decidedBy?.fullName ?? null
              : null,
          status: step.status,
          decidedAt: step.decidedAt ? step.decidedAt.toISOString() : null,
          comment: step.comment,
        })),
        leaveTypeKey: request.leaveType.key,
        leaveTypeName: request.leaveType.name,
        description: request.description,
        startDate: dateOnly(request.startDate),
        endDate: dateOnly(request.endDate),
        durationCode: request.durationCode,
        startTime: timeOnly(request.startTime),
        endTime: timeOnly(request.endTime),
        usageDays: usageForRequest(request, calendar),
        status: request.status,
        decisionReason: request.decisionReason,
        submittedAt: request.submittedAt.toISOString(),
      }),
    );

    return {
      entitlements: entitlements.map((entitlement) => {
        const quota = asNumber(entitlement.quota);
        const { used, pending, remaining } = summarizeEntitlementUsage(
          requests,
          entitlement.id,
          quota,
          (request) => usageForRequest(request, calendar),
        );

        return {
          entitlementId: entitlement.id,
          leaveTypeId: entitlement.leaveTypeId,
          leaveTypeKey: entitlement.leaveType.key,
          leaveTypeName: entitlement.leaveType.name,
          quota,
          used,
          pending,
          remaining,
        };
      }),
      requests: requestViews,
      holidays: [...calendar.holidayDates].sort(),
      workingWeekdays: [...calendar.workingIsoWeekdays].sort((a, b) => a - b),
    };
  }

  async getApprovalOptions(
    employeeId: string,
  ): Promise<readonly LeaveApprovalStepOptions[]> {
    const result = await approvalOptionsFor(
      this.prisma,
      employeeId,
    );
    return result.options;
  }

  async createSelfLeave(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly request: LeaveCreateInput;
    readonly canonicalPayload: string;
  }): Promise<LeaveCreateResult> {
    const claim = createIdempotencyClaim({
      actorEmployeeId: input.employeeId,
      operationKind: "LEAVE_CREATE",
      clientKey: input.request.clientKey,
      canonicalPayload: input.canonicalPayload,
    });

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

    if (existing) {
      if (existing.payloadHash !== claim.payloadHash) {
        throw new IdempotencyConflictError();
      }

      if (!existing.resultReferenceId) {
        throw new Error(
          "Idempotency record is incomplete and requires review",
        );
      }

      return {
        requestId: existing.resultReferenceId,
        replayed: true,
      };
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.idempotencyKey.create({
            data: claim,
          });

          const requester = await requesterContext(
            tx,
            input.employeeId,
          );
          const requestStart = new Date(
            `${input.request.startDate}T00:00:00.000Z`,
          );
          const requestEnd = new Date(
            `${input.request.endDate}T00:00:00.000Z`,
          );
          const entitlement =
            await tx.leaveEntitlement.findUnique({
              where: {
                id: input.request.entitlementId,
              },
              select: {
                id: true,
                employeeId: true,
                quota: true,
                validFrom: true,
                validTo: true,
                leaveType: {
                  select: {
                    id: true,
                    key: true,
                    active: true,
                  },
                },
              },
            });

          if (
            !entitlement ||
            entitlement.employeeId !== input.employeeId ||
            !entitlement.leaveType.active ||
            (entitlement.validFrom &&
              entitlement.validFrom > requestStart) ||
            (entitlement.validTo &&
              entitlement.validTo < requestEnd)
          ) {
            throw new Error(
              "Leave entitlement is unavailable for this employee and period",
            );
          }

          const leaveType = entitlement.leaveType;

          const calendar = await calendarPolicy(tx);
          const requestedUsage = calculateLeaveUnits(
            normalizeLeavePeriod({
              startDate: input.request.startDate,
              endDate: input.request.endDate,
              durationCode: input.request.durationCode,
              startTime: input.request.startTime ?? null,
              endTime: input.request.endTime ?? null,
            }),
            calendar,
          );

          // Pending and sent-back requests reserve quota too, so several open requests cannot exceed it together.
          const approved = await tx.leaveRequest.findMany({
            where: {
              requesterEmployeeId: input.employeeId,
              entitlementId: entitlement.id,
              status: { in: [...QUOTA_RESERVING_STATUSES] },
            },
            select: {
              startDate: true,
              endDate: true,
              durationCode: true,
              startTime: true,
              endTime: true,
            },
          });
          const used = approved.reduce(
            (sum, request) =>
              sum + usageForRequest(request, calendar),
            0,
          );

          assertLeaveQuotaAvailable({
            quota: asNumber(entitlement.quota),
            used,
            requested: requestedUsage,
          });

          // The same employee cannot hold two requests for the same day or hours.
          const holding = await tx.leaveRequest.findMany({
            where: {
              requesterEmployeeId: input.employeeId,
              status: { in: [...CALENDAR_HOLDING_LEAVE_STATUSES] },
            },
            select: {
              startDate: true,
              endDate: true,
              durationCode: true,
              startTime: true,
              endTime: true,
            },
          });
          assertNoOverlappingLeave(
            {
              startDate: input.request.startDate,
              endDate: input.request.endDate,
              durationCode: input.request.durationCode,
              startTime: input.request.startTime ?? null,
              endTime: input.request.endTime ?? null,
            },
            holding.map(overlapPeriodOf),
          );

          const approval = await approvalOptionsFor(
            tx,
            input.employeeId,
          );
          validateSelectedApprovers(
            input.request.approverEmployeeIds,
            approval.options,
          );

          const approvalInstance =
            await tx.approvalInstance.create({
              data: {
                requestKind: "LEAVE",
                requesterEmployeeId: input.employeeId,
                policyId: approval.policyId,
                status: "PENDING",
                currentStepOrder: 1,
                steps: {
                  create: approval.options.map(
                    (step, index) => ({
                      stepOrder: step.stepOrder,
                      approverEmployeeId:
                        input.request.approverEmployeeIds[index]!,
                      status: "PENDING",
                      assignedAt: new Date(),
                    }),
                  ),
                },
              },
              select: { id: true },
            });

          const leaveRequest = await tx.leaveRequest.create({
            data: {
              requesterEmployeeId: input.employeeId,
              leaveTypeId: leaveType.id,
              entitlementId: entitlement.id,
              approvalInstanceId: approvalInstance.id,
              description: input.request.description.trim(),
              startDate: new Date(
                `${input.request.startDate}T00:00:00.000Z`,
              ),
              endDate: new Date(
                `${input.request.endDate}T00:00:00.000Z`,
              ),
              durationCode: input.request.durationCode,
              startTime: input.request.startTime
                ? new Date(
                    `1970-01-01T${input.request.startTime}:00.000Z`,
                  )
                : null,
              endTime: input.request.endTime
                ? new Date(
                    `1970-01-01T${input.request.endTime}:00.000Z`,
                  )
                : null,
              status: "PENDING",
            },
            select: { id: true },
          });

          await Promise.all([
            tx.idempotencyKey.update({
              where: {
                actorEmployeeId_operationKind_clientKey: {
                  actorEmployeeId: claim.actorEmployeeId,
                  operationKind: claim.operationKind,
                  clientKey: claim.clientKey,
                },
              },
              data: {
                resultReferenceId: leaveRequest.id,
              },
            }),
            tx.notificationOutbox.create({
              data: {
                aggregateType: "LEAVE_REQUEST",
                aggregateId: leaveRequest.id,
                eventType: "LEAVE_REQUEST_CREATED",
                payload: {
                  requestId: leaveRequest.id,
                  requesterEmployeeId: input.employeeId,
                },
              },
            }),
            tx.auditLog.create({
              data: {
                actorEmployeeId: input.employeeId,
                action: "LEAVE_CREATE",
                entityType: "LeaveRequest",
                entityId: leaveRequest.id,
                correlationId: input.correlationId,
                metadata: {
                  leaveTypeKey: leaveType.key,
                  usageDays: requestedUsage,
                },
              },
            }),
          ]);

          // Keep this reference alive in the transaction so a future
          // refactor cannot accidentally remove the active-account check.
          void requester;

          return {
            requestId: leaveRequest.id,
            replayed: false,
          };
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const replay =
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

        if (
          replay?.payloadHash === claim.payloadHash &&
          replay.resultReferenceId
        ) {
          return {
            requestId: replay.resultReferenceId,
            replayed: true,
          };
        }

        if (
          replay &&
          replay.payloadHash !== claim.payloadHash
        ) {
          throw new IdempotencyConflictError();
        }
      }

      throw error;
    }
  }

  async cancelSelfLeave(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
  }): Promise<LeaveCancelResult> {
    return this.prisma.$transaction(
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

        if (
          !request ||
          request.requesterEmployeeId !== input.employeeId
        ) {
          throw new Error("Leave request not found");
        }

        if (request.status === "CANCELLED") {
          return {
            requestId: request.id,
            status: "CANCELLED" as const,
          };
        }

        if (
          request.status !== "PENDING" &&
          request.status !== "REVISION_REQUESTED"
        ) {
          throw new Error(
            "Only pending or revision-requested leave can be cancelled",
          );
        }

        await tx.leaveRequest.update({
          where: { id: request.id },
          data: {
            status: "CANCELLED",
          },
        });

        if (request.approvalInstanceId) {
          await Promise.all([
            tx.approvalInstance.update({
              where: { id: request.approvalInstanceId },
              data: {
                status: "CANCELLED",
                decidedAt: new Date(),
              },
            }),
            tx.approvalStep.updateMany({
              where: {
                approvalInstanceId: request.approvalInstanceId,
                status: "PENDING",
              },
              data: {
                status: "CANCELLED",
              },
            }),
          ]);
        }

        await Promise.all([
          tx.notificationOutbox.create({
            data: {
              aggregateType: "LEAVE_REQUEST",
              aggregateId: request.id,
              eventType: "LEAVE_REQUEST_CANCELLED",
              payload: {
                requestId: request.id,
                requesterEmployeeId: input.employeeId,
              },
            },
          }),
          tx.auditLog.create({
            data: {
              actorEmployeeId: input.employeeId,
              action: "LEAVE_CANCEL",
              entityType: "LeaveRequest",
              entityId: request.id,
              correlationId: input.correlationId,
            },
          }),
        ]);

        return {
          requestId: request.id,
          status: "CANCELLED" as const,
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async decideLeave(input: {
    readonly approverEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly decision: LeaveApprovalDecisionInput;
  }): Promise<LeaveApprovalDecisionResult> {
    return this.prisma.$transaction(
      async (tx) => {
        const request = await tx.leaveRequest.findUnique({
          where: { id: input.requestId },
          select: {
            id: true,
            status: true,
            requesterEmployeeId: true,
            approvalInstanceId: true,
            approvalInstance: {
              select: {
                id: true,
                status: true,
                currentStepOrder: true,
              },
            },
          },
        });

        if (
          !request ||
          !request.approvalInstanceId ||
          request.status !== "PENDING" ||
          request.approvalInstance?.status !== "PENDING"
        ) {
          throw new Error(
            "Leave request is not pending approval",
          );
        }

        const step = await tx.approvalStep.findUnique({
          where: {
            id: input.decision.approvalStepId,
          },
          select: {
            id: true,
            approvalInstanceId: true,
            stepOrder: true,
            approverEmployeeId: true,
            status: true,
          },
        });

        const mayDecide = step
          ? await actorMayDecideStep(tx, {
              stepApproverId: step.approverEmployeeId,
              actorEmployeeId: input.approverEmployeeId,
              requesterEmployeeId: request.requesterEmployeeId,
            })
          : false;

        if (
          !step ||
          step.approvalInstanceId !==
            request.approvalInstanceId ||
          !mayDecide ||
          step.status !== "PENDING" ||
          step.stepOrder !==
            request.approvalInstance.currentStepOrder
        ) {
          throw new Error(
            "Leave request is not assigned to this approver",
          );
        }

        await tx.approvalStep.update({
          where: { id: step.id },
          data: {
            decidedByEmployeeId: input.approverEmployeeId,
            status: input.decision.decision,
            decidedAt: new Date(),
            comment: input.decision.comment?.trim() || null,
          },
        });

        let status:
          | "PENDING"
          | "APPROVED"
          | "REJECTED"
          | "REVISION_REQUESTED";

        if (input.decision.decision === "REVISION_REQUESTED") {
          // Sent back: later steps stay PENDING and the request re-enters this step on resubmission.
          status = "REVISION_REQUESTED";
          await Promise.all([
            tx.approvalInstance.update({
              where: { id: request.approvalInstanceId },
              data: { status: "REVISION_REQUESTED" },
            }),
            tx.leaveRequest.update({
              where: { id: request.id },
              data: {
                status: "REVISION_REQUESTED",
                decisionReason: input.decision.comment?.trim() || null,
              },
            }),
          ]);
        } else if (input.decision.decision === "REJECTED") {
          status = "REJECTED";
          await Promise.all([
            tx.approvalInstance.update({
              where: {
                id: request.approvalInstanceId,
              },
              data: {
                status: "REJECTED",
                decidedAt: new Date(),
              },
            }),
            tx.leaveRequest.update({
              where: { id: request.id },
              data: {
                status: "REJECTED",
                decisionReason:
                  input.decision.comment?.trim() || null,
              },
            }),
            tx.approvalStep.updateMany({
              where: {
                approvalInstanceId:
                  request.approvalInstanceId,
                status: "PENDING",
                stepOrder: { gt: step.stepOrder },
              },
              data: {
                status: "SKIPPED",
              },
            }),
          ]);
        } else {
          const next = await tx.approvalStep.findFirst({
            where: {
              approvalInstanceId:
                request.approvalInstanceId,
              status: "PENDING",
              stepOrder: { gt: step.stepOrder },
            },
            select: { stepOrder: true },
            orderBy: { stepOrder: "asc" },
          });

          if (next) {
            status = "PENDING";
            await tx.approvalInstance.update({
              where: {
                id: request.approvalInstanceId,
              },
              data: {
                currentStepOrder: next.stepOrder,
              },
            });
          } else {
            status = "APPROVED";
            await Promise.all([
              tx.approvalInstance.update({
                where: {
                  id: request.approvalInstanceId,
                },
                data: {
                  status: "APPROVED",
                  decidedAt: new Date(),
                },
              }),
              tx.leaveRequest.update({
                where: { id: request.id },
                data: {
                  status: "APPROVED",
                  decisionReason: null,
                },
              }),
            ]);
          }
        }

        await Promise.all([
          tx.notificationOutbox.create({
            data: {
              aggregateType: "LEAVE_REQUEST",
              aggregateId: request.id,
              eventType: "LEAVE_REQUEST_DECIDED",
              payload: {
                requestId: request.id,
                approvalStepId: step.id,
                decision: input.decision.decision,
                approverEmployeeId:
                  input.approverEmployeeId,
              },
            },
          }),
          tx.auditLog.create({
            data: {
              actorEmployeeId:
                input.approverEmployeeId,
              action: "LEAVE_DECISION",
              entityType: "LeaveRequest",
              entityId: request.id,
              correlationId: input.correlationId,
              metadata: {
                approvalStepId: step.id,
                decision: input.decision.decision,
              },
            },
          }),
        ]);

        return {
          requestId: request.id,
          status,
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async resubmitLeave(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly request: LeaveResubmitInput;
    readonly canonicalPayload: string;
  }): Promise<LeaveResubmitResult> {
    return resubmitSentBackLeave(this.prisma, input);
  }

  async withdrawApprovedLeave(input: {
    readonly actorEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly reason: string;
  }): Promise<LeaveWithdrawResult> {
    return withdrawApprovedLeave(this.prisma, input);
  }
}
