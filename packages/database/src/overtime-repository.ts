import { createHash, randomUUID } from "node:crypto";

import {
  IdempotencyConflictError,
  createIdempotencyClaim,
} from "@ckace/auth";
import {
  assertNoOverlappingOvertime,
  assertOvertimeCancelable,
  expandOvertimeDays,
  normalizeOvertimeCreate,
  normalizeOvertimeDecision,
  type ExistingOvertimeWindow,
  type OvertimeCalendarDay,
} from "@ckace/business-rules";
import type {
  ApprovalChainPreview,
  OvertimeApprovalQueueItem,
  OvertimeCancelResult,
  OvertimeCreateInput,
  OvertimeCreateResult,
  OvertimeDecisionInput,
  OvertimeDecisionResult,
  OvertimeRequestView,
  OvertimeResubmitInput,
  OvertimeResubmitResult,
  OvertimeSelfOverview,
  OvertimeWithdrawResult,
} from "@ckace/contracts";
import {
  Prisma,
  type PrismaClient,
} from "@prisma/client";

import { actorMayDecideStep, delegatorIdsFor } from "./approval-delegation";
import {
  resubmitSentBackOvertime,
  withdrawApprovedOvertime,
} from "./overtime-revision-repository";
import {
  resolveCompanyApprovalRoute,
  systemSelectedApprovals,
} from "./approval-route-loader";

export interface OvertimeRepository {
  previewApprovalChain(employeeId: string): Promise<ApprovalChainPreview>;

  getSelfOverview(
    employeeId: string,
  ): Promise<OvertimeSelfOverview>;

  getAssignedApprovals(
    approverEmployeeId: string,
  ): Promise<readonly OvertimeApprovalQueueItem[]>;

  createSelfOvertime(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly request: OvertimeCreateInput;
    readonly canonicalPayload: string;
  }): Promise<OvertimeCreateResult>;

  cancelSelfOvertime(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
  }): Promise<OvertimeCancelResult>;

  decideAssignedOvertime(input: {
    readonly approverEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly decision: OvertimeDecisionInput;
  }): Promise<OvertimeDecisionResult>;

  resubmitOvertime(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly request: OvertimeResubmitInput;
    readonly canonicalPayload: string;
  }): Promise<OvertimeResubmitResult>;

  withdrawApprovedOvertime(input: {
    readonly actorEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly reason: string;
  }): Promise<OvertimeWithdrawResult>;
}

interface ActiveEmployeeContext {
  readonly id: string;
  readonly agencyId: string | null;
  readonly departmentId: string | null;
}

interface OvertimeApprovalResolution {
  readonly policyId: string;
  readonly steps: readonly {
    readonly stepOrder: number;
    readonly approverEmployeeId: string;
  }[];
}

async function approverNames(
  prisma: Pick<PrismaClient, "employee">,
  ids: readonly string[],
): Promise<Map<string, string>> {
  const rows = await prisma.employee.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, fullName: true },
  });

  return new Map(rows.map((row) => [row.id, row.fullName]));
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function timeOnly(value: Date): string {
  return value.toISOString().slice(11, 16);
}

function workDateValue(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function timeValue(value: string): Date {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

function isoWeekday(dateKey: string): number {
  const weekday = workDateValue(dateKey).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function enumerateOvertimeDates(
  startDate: string,
  endDate: string,
): readonly string[] {
  const start = workDateValue(startDate);
  const end = workDateValue(endDate);

  if (end < start) {
    throw new Error(
      "Overtime endDate must not precede startDate",
    );
  }

  const result: string[] = [];
  const current = new Date(start);

  while (current <= end) {
    result.push(dateOnly(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return result;
}

export function deriveOvertimeRequestId(
  batchId: string,
  workDate: string,
): string {
  const bytes = createHash("sha256")
    .update("CKACE_HR_OVERTIME_REQUEST\0")
    .update(batchId)
    .update("\0")
    .update(workDate)
    .digest()
    .subarray(0, 16);

  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = bytes.toString("hex");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

async function activeEmployeeContext(
  prisma: Pick<Prisma.TransactionClient, "employee">,
  employeeId: string,
): Promise<ActiveEmployeeContext> {
  const employee = await prisma.employee.findUnique({
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

  if (
    !employee?.userAccount ||
    employee.userAccount.state !== "ACTIVE"
  ) {
    throw new Error("Active employee account is required");
  }

  return {
    id: employee.id,
    agencyId: employee.agencyId,
    departmentId: employee.departmentId,
  };
}

export function buildOvertimeApproverScopeWhere(
  scope: "SAME_AGENCY" | "SAME_DEPARTMENT" | "GLOBAL",
  requester: {
    readonly agencyId: string | null;
    readonly departmentId: string | null;
  },
): Prisma.EmployeeWhereInput {
  if (scope === "SAME_AGENCY") {
    if (!requester.agencyId) {
      throw new Error(
        "Overtime approval scope SAME_AGENCY requires requester agency",
      );
    }

    return { agencyId: requester.agencyId };
  }

  if (scope === "SAME_DEPARTMENT") {
    if (!requester.departmentId) {
      throw new Error(
        "Overtime approval scope SAME_DEPARTMENT requires requester department",
      );
    }

    return { departmentId: requester.departmentId };
  }

  return {};
}

async function resolveOvertimeApproval(
  prisma: Pick<
    Prisma.TransactionClient,
    "approvalPolicy" | "employee" | "agency"
  >,
  requester: ActiveEmployeeContext,
): Promise<OvertimeApprovalResolution> {
  const policies = await prisma.approvalPolicy.findMany({
    where: {
      active: true,
      requestKind: "OVERTIME",
      OR: [
        { agencyId: requester.agencyId },
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
          requiredRole: { select: { key: true } },
        },
        orderBy: { stepOrder: "asc" },
      },
    },
  });

  const policy =
    policies.find(
      (candidate) =>
        candidate.agencyId === requester.agencyId,
    ) ??
    policies.find(
      (candidate) => candidate.agencyId === null,
    );

  if (!policy || policy.steps.length === 0) {
    throw new Error(
      "Overtime approval policy is unavailable",
    );
  }

  // Company-aware routing (Owner organisation). Teams that are not attached to
  // a company keep the legacy per-agency lookup below.
  const routed = await resolveCompanyApprovalRoute(
    prisma,
    requester.id,
    policy.steps.map((step) => ({
      kind: "ROLE" as const,
      roleKey: step.requiredRole.key,
      selection: "SYSTEM_PICKS_FIRST" as const,
      peerFallback: true,
    })),
    { defaultSelection: "SYSTEM_PICKS_FIRST" },
  );

  if (routed) {
    if (routed.route.steps.length === 0) {
      throw new Error("No eligible approver for overtime");
    }

    return {
      policyId: policy.id,
      steps: [...systemSelectedApprovals(routed.route)],
    };
  }

  const steps: {
    stepOrder: number;
    approverEmployeeId: string;
  }[] = [];

  for (const step of policy.steps) {
    const approver = await prisma.employee.findFirst({
      where: {
        id: { not: requester.id },
        ...buildOvertimeApproverScopeWhere(
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
      select: { id: true },
      orderBy: [
        { createdAt: "asc" },
        { id: "asc" },
      ],
    });

    if (!approver) {
      throw new Error(
        `No eligible approver for overtime step ${step.stepOrder}`,
      );
    }

    steps.push({
      stepOrder: step.stepOrder,
      approverEmployeeId: approver.id,
    });
  }

  return {
    policyId: policy.id,
    steps,
  };
}

async function overtimeCalendar(
  prisma: Pick<
    Prisma.TransactionClient,
    "weeklyWorkRule" | "holiday"
  >,
  dates: readonly string[],
): Promise<readonly OvertimeCalendarDay[]> {
  const [rules, holidays] = await Promise.all([
    prisma.weeklyWorkRule.findMany({
      select: {
        isoWeekday: true,
        isWorking: true,
      },
    }),
    prisma.holiday.findMany({
      where: {
        active: true,
        holidayDate: {
          in: dates.map(workDateValue),
        },
      },
      select: { holidayDate: true },
    }),
  ]);

  const ruleMap = new Map(
    rules.map((rule) => [
      rule.isoWeekday,
      rule.isWorking,
    ]),
  );
  const holidayDates = new Set(
    holidays.map((holiday) =>
      dateOnly(holiday.holidayDate),
    ),
  );

  return dates.map((date) => {
    const weekday = isoWeekday(date);

    if (!ruleMap.has(weekday)) {
      throw new Error(
        `Weekly overtime work rule is unavailable for ${date}`,
      );
    }

    return {
      date,
      isWorkday:
        ruleMap.get(weekday) === true &&
        !holidayDates.has(date),
    };
  });
}

function requestView(
  request: {
    readonly id: string;
    readonly employeeId: string;
    readonly reason: string;
    readonly status:
      | "PENDING"
      | "APPROVED"
      | "REJECTED"
      | "CANCELLED"
      | "REVISION_REQUESTED";
    readonly decisionReason: string | null;
    readonly submittedAt: Date;
    readonly segments: readonly {
      readonly id: string;
      readonly workDate: Date;
      readonly startTime: Date;
      readonly endTime: Date;
      readonly requestedMinutes: number;
      readonly attendanceRecordId: string | null;
    }[];
  },
): OvertimeRequestView {
  return {
    id: request.id,
    employeeId: request.employeeId,
    reason: request.reason,
    status: request.status,
    decisionReason: request.decisionReason,
    submittedAt: request.submittedAt.toISOString(),
    segments: request.segments.map((segment) => ({
      id: segment.id,
      workDate: dateOnly(segment.workDate),
      startTime: timeOnly(segment.startTime),
      endTime: timeOnly(segment.endTime),
      requestedMinutes: segment.requestedMinutes,
      attendanceRecordId: segment.attendanceRecordId,
    })),
  };
}

async function loadRequestsByBatch(
  prisma: Pick<PrismaClient, "overtimeRequest">,
  input: {
    readonly employeeId: string;
    readonly batchId: string;
    readonly dates: readonly string[];
  },
): Promise<readonly OvertimeRequestView[]> {
  const expected = input.dates.map((date) => ({
    date,
    id: deriveOvertimeRequestId(input.batchId, date),
  }));

  const rows = await prisma.overtimeRequest.findMany({
    where: {
      id: {
        in: expected.map((entry) => entry.id),
      },
      employeeId: input.employeeId,
    },
    select: {
      id: true,
      employeeId: true,
      reason: true,
      status: true,
      decisionReason: true,
      submittedAt: true,
      segments: {
        select: {
          id: true,
          workDate: true,
          startTime: true,
          endTime: true,
          requestedMinutes: true,
          attendanceRecordId: true,
        },
        orderBy: [
          { workDate: "asc" },
          { startTime: "asc" },
          { id: "asc" },
        ],
      },
    },
  });

  if (rows.length !== expected.length) {
    throw new Error(
      "Overtime idempotency batch is incomplete and requires review",
    );
  }

  const byId = new Map(
    rows.map((row) => [row.id, row]),
  );

  return expected.map((entry) => {
    const row = byId.get(entry.id);

    if (!row) {
      throw new Error(
        "Overtime idempotency batch is incomplete and requires review",
      );
    }

    return requestView(row);
  });
}

async function existingBatchReference(
  prisma: Pick<PrismaClient, "idempotencyKey">,
  claim: {
    readonly actorEmployeeId: string;
    readonly operationKind: string;
    readonly clientKey: string;
    readonly payloadHash: string;
  },
): Promise<string | null> {
  const existing = await prisma.idempotencyKey.findUnique({
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
    return null;
  }

  if (existing.payloadHash !== claim.payloadHash) {
    throw new IdempotencyConflictError();
  }

  if (!existing.resultReferenceId) {
    throw new Error(
      "Overtime idempotency record is incomplete and requires review",
    );
  }

  return existing.resultReferenceId;
}

export class PrismaOvertimeRepository
  implements OvertimeRepository
{
  constructor(
    private readonly prisma: PrismaClient,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async getSelfOverview(
    employeeId: string,
  ): Promise<OvertimeSelfOverview> {
    await activeEmployeeContext(this.prisma, employeeId);

    const rows = await this.prisma.overtimeRequest.findMany({
      where: { employeeId },
      select: {
        id: true,
        employeeId: true,
        reason: true,
        status: true,
        decisionReason: true,
        submittedAt: true,
        segments: {
          select: {
            id: true,
            workDate: true,
            startTime: true,
            endTime: true,
            requestedMinutes: true,
            attendanceRecordId: true,
          },
          orderBy: [
            { workDate: "asc" },
            { startTime: "asc" },
            { id: "asc" },
          ],
        },
      },
      orderBy: [
        { submittedAt: "desc" },
        { id: "desc" },
      ],
    });

    return {
      requests: rows.map(requestView),
    };
  }

  async getAssignedApprovals(
    approverEmployeeId: string,
  ): Promise<readonly OvertimeApprovalQueueItem[]> {
    await activeEmployeeContext(
      this.prisma,
      approverEmployeeId,
    );

    const delegators = await delegatorIdsFor(this.prisma, approverEmployeeId);
    const steps = await this.prisma.approvalStep.findMany({
      where: {
        approverEmployeeId: { in: [approverEmployeeId, ...delegators] },
        status: "PENDING",
        approvalInstance: {
          is: {
            requestKind: "OVERTIME",
            status: "PENDING",
          },
        },
      },
      select: {
        id: true,
        stepOrder: true,
        approvalInstance: {
          select: {
            currentStepOrder: true,
            overtimeRequest: {
              select: {
                id: true,
                employeeId: true,
                reason: true,
                status: true,
                decisionReason: true,
                submittedAt: true,
                segments: {
                  select: {
                    id: true,
                    workDate: true,
                    startTime: true,
                    endTime: true,
                    requestedMinutes: true,
                    attendanceRecordId: true,
                  },
                  orderBy: [
                    { workDate: "asc" },
                    { startTime: "asc" },
                    { id: "asc" },
                  ],
                },
              },
            },
          },
        },
      },
      orderBy: [
        { assignedAt: "asc" },
        { id: "asc" },
      ],
    });

    return steps
      .filter(
        (step) =>
          step.approvalInstance.currentStepOrder ===
            step.stepOrder &&
          step.approvalInstance.overtimeRequest !== null,
      )
      .map((step) => ({
        ...requestView(
          step.approvalInstance.overtimeRequest!,
        ),
        approvalStepId: step.id,
        stepOrder: step.stepOrder,
      }));
  }

  async createSelfOvertime(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly request: OvertimeCreateInput;
    readonly canonicalPayload: string;
  }): Promise<OvertimeCreateResult> {
    const normalized = normalizeOvertimeCreate(
      input.request,
    );
    const dates = enumerateOvertimeDates(
      normalized.startDate,
      normalized.endDate,
    );
    const claim = createIdempotencyClaim({
      actorEmployeeId: input.employeeId,
      operationKind: "OVERTIME_CREATE",
      clientKey: normalized.clientKey,
      canonicalPayload: input.canonicalPayload,
    });

    await activeEmployeeContext(
      this.prisma,
      input.employeeId,
    );

    const existingBatch = await existingBatchReference(
      this.prisma,
      claim,
    );

    if (existingBatch) {
      return {
        requests: await loadRequestsByBatch(this.prisma, {
          employeeId: input.employeeId,
          batchId: existingBatch,
          dates,
        }),
        replayed: true,
        warnings: [],
      };
    }

    const batchId = randomUUID();
    const now = this.clock();

    try {
      const created = await this.prisma.$transaction(
        async (tx) => {
          await tx.idempotencyKey.create({
            data: {
              ...claim,
              resultReferenceId: batchId,
            },
          });

          const requester = await activeEmployeeContext(
            tx,
            input.employeeId,
          );
          const calendar = await overtimeCalendar(
            tx,
            dates,
          );
          const dayRequests = expandOvertimeDays(
            normalized,
            calendar,
          );

          const existing =
            await tx.overtimeSegment.findMany({
              where: {
                workDate: {
                  in: dates.map(workDateValue),
                },
                request: {
                  is: {
                    employeeId: input.employeeId,
                    status: {
                      notIn: ["REJECTED", "CANCELLED"],
                    },
                  },
                },
              },
              select: {
                workDate: true,
                startTime: true,
                endTime: true,
                request: {
                  select: { status: true },
                },
              },
            });

          const windows: ExistingOvertimeWindow[] =
            existing.map((segment) => ({
              workDate: dateOnly(segment.workDate),
              startTime: timeOnly(segment.startTime),
              endTime: timeOnly(segment.endTime),
              status: segment.request.status,
            }));

          for (const day of dayRequests) {
            assertNoOverlappingOvertime(day, windows);
          }

          const approval = await resolveOvertimeApproval(
            tx,
            requester,
          );
          const requestRows: OvertimeRequestView[] = [];

          for (const day of dayRequests) {
            const requestId = deriveOvertimeRequestId(
              batchId,
              day.workDate,
            );
            const approvalInstance =
              await tx.approvalInstance.create({
                data: {
                  requestKind: "OVERTIME",
                  requesterEmployeeId: input.employeeId,
                  policyId: approval.policyId,
                  status: "PENDING",
                  currentStepOrder:
                    approval.steps[0]?.stepOrder ?? null,
                  steps: {
                    create: approval.steps.map((step) => ({
                      stepOrder: step.stepOrder,
                      approverEmployeeId:
                        step.approverEmployeeId,
                      status: "PENDING",
                      assignedAt: now,
                    })),
                  },
                },
                select: { id: true },
              });

            const createdRequest =
              await tx.overtimeRequest.create({
                data: {
                  id: requestId,
                  employeeId: input.employeeId,
                  approvalInstanceId:
                    approvalInstance.id,
                  reason: normalized.reason,
                  status: "PENDING",
                  submittedAt: now,
                  segments: {
                    create: {
                      attendanceRecordId: null,
                      workDate: workDateValue(
                        day.workDate,
                      ),
                      startTime: timeValue(
                        day.startTime,
                      ),
                      endTime: timeValue(day.endTime),
                      requestedMinutes:
                        day.requestedMinutes,
                      ...(normalized.breaks
                        ? { breakCodes: [...normalized.breaks] }
                        : {}),
                    },
                  },
                },
                select: {
                  id: true,
                  employeeId: true,
                  reason: true,
                  status: true,
                  decisionReason: true,
                  submittedAt: true,
                  segments: {
                    select: {
                      id: true,
                      workDate: true,
                      startTime: true,
                      endTime: true,
                      requestedMinutes: true,
                      attendanceRecordId: true,
                    },
                  },
                },
              });

            await Promise.all([
              tx.notificationOutbox.create({
                data: {
                  aggregateType: "OVERTIME_REQUEST",
                  aggregateId: requestId,
                  eventType:
                    "OVERTIME_REQUEST_CREATED",
                  payload: {
                    requestId,
                    requesterEmployeeId:
                      input.employeeId,
                    workDate: day.workDate,
                  },
                },
              }),
              tx.auditLog.create({
                data: {
                  actorEmployeeId:
                    input.employeeId,
                  action: "OVERTIME_CREATE",
                  entityType: "OvertimeRequest",
                  entityId: requestId,
                  correlationId:
                    input.correlationId,
                  metadata: {
                    batchId,
                    workDate: day.workDate,
                    requestedMinutes:
                      day.requestedMinutes,
                  },
                },
              }),
            ]);

            requestRows.push(
              requestView(createdRequest),
            );
          }

          return requestRows;
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      return {
        requests: created,
        replayed: false,
        warnings: [],
      };
    } catch (error) {
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const racedBatch =
          await existingBatchReference(
            this.prisma,
            claim,
          );

        if (racedBatch) {
          return {
            requests: await loadRequestsByBatch(
              this.prisma,
              {
                employeeId: input.employeeId,
                batchId: racedBatch,
                dates,
              },
            ),
            replayed: true,
            warnings: [],
          };
        }
      }

      throw error;
    }
  }

  async cancelSelfOvertime(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
  }): Promise<OvertimeCancelResult> {
    return this.prisma.$transaction(
      async (tx) => {
        await activeEmployeeContext(
          tx,
          input.employeeId,
        );
        const request =
          await tx.overtimeRequest.findUnique({
            where: { id: input.requestId },
            select: {
              id: true,
              employeeId: true,
              status: true,
              approvalInstanceId: true,
            },
          });

        if (
          !request ||
          request.employeeId !== input.employeeId
        ) {
          throw new Error(
            "Overtime request is unavailable for this employee",
          );
        }

        if (request.status === "CANCELLED") {
          return {
            requestId: request.id,
            status: "CANCELLED" as const,
          };
        }

        assertOvertimeCancelable(request.status);
        const decidedAt = this.clock();

        await tx.overtimeRequest.update({
          where: { id: request.id },
          data: {
            status: "CANCELLED",
          },
        });

        if (request.approvalInstanceId) {
          await Promise.all([
            tx.approvalInstance.update({
              where: {
                id: request.approvalInstanceId,
              },
              data: {
                status: "CANCELLED",
                currentStepOrder: null,
                decidedAt,
              },
            }),
            tx.approvalStep.updateMany({
              where: {
                approvalInstanceId:
                  request.approvalInstanceId,
                status: "PENDING",
              },
              data: {
                status: "CANCELLED",
                decidedAt,
              },
            }),
          ]);
        }

        await Promise.all([
          tx.notificationOutbox.create({
            data: {
              aggregateType: "OVERTIME_REQUEST",
              aggregateId: request.id,
              eventType:
                "OVERTIME_REQUEST_CANCELLED",
              payload: {
                requestId: request.id,
                requesterEmployeeId:
                  input.employeeId,
              },
            },
          }),
          tx.auditLog.create({
            data: {
              actorEmployeeId: input.employeeId,
              action: "OVERTIME_CANCEL",
              entityType: "OvertimeRequest",
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

  async decideAssignedOvertime(input: {
    readonly approverEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly decision: OvertimeDecisionInput;
  }): Promise<OvertimeDecisionResult> {
    const normalized = normalizeOvertimeDecision(
      input.decision,
    );
    const decidedAt = this.clock();

    return this.prisma.$transaction(
      async (tx) => {
        await activeEmployeeContext(
          tx,
          input.approverEmployeeId,
        );

        const request =
          await tx.overtimeRequest.findUnique({
            where: { id: input.requestId },
            select: {
              id: true,
              employeeId: true,
              reason: true,
              status: true,
              decisionReason: true,
              submittedAt: true,
              approvalInstanceId: true,
              segments: {
                select: {
                  id: true,
                  workDate: true,
                  startTime: true,
                  endTime: true,
                  requestedMinutes: true,
                  attendanceRecordId: true,
                },
                orderBy: [
                  { workDate: "asc" },
                  { startTime: "asc" },
                  { id: "asc" },
                ],
              },
              approvalInstance: {
                select: {
                  id: true,
                  currentStepOrder: true,
                  status: true,
                  steps: {
                    select: {
                      id: true,
                      stepOrder: true,
                      approverEmployeeId: true,
                      status: true,
                    },
                    orderBy: { stepOrder: "asc" },
                  },
                },
              },
            },
          });

        if (!request?.approvalInstance) {
          throw new Error(
            "Overtime approval state is unavailable",
          );
        }

        const currentStep =
          request.approvalInstance.steps.find(
            (step) =>
              step.stepOrder ===
              request.approvalInstance
                ?.currentStepOrder,
          );

        const mayDecide = currentStep
          ? await actorMayDecideStep(tx, {
              stepApproverId: currentStep.approverEmployeeId,
              actorEmployeeId: input.approverEmployeeId,
              requesterEmployeeId: request.employeeId,
            })
          : false;

        if (!currentStep || !mayDecide) {
          throw new Error(
            "Overtime request is not assigned to this approver",
          );
        }

        await tx.approvalStep.update({
          where: { id: currentStep.id },
          data: { decidedByEmployeeId: input.approverEmployeeId },
        });

        if (
          request.status === normalized.decision &&
          currentStep.status === normalized.decision
        ) {
          return {
            request: requestView(request),
            completed: true,
            warnings: [],
          };
        }

        if (
          request.status !== "PENDING" ||
          currentStep.status !== "PENDING"
        ) {
          throw new Error(
            "Overtime request has already been decided",
          );
        }

        if (normalized.decision === "REVISION_REQUESTED") {
          await Promise.all([
            tx.approvalStep.update({
              where: { id: currentStep.id },
              data: {
                status: "REVISION_REQUESTED",
                comment: normalized.comment,
                decidedAt,
              },
            }),
            tx.overtimeRequest.update({
              where: { id: request.id },
              data: {
                status: "REVISION_REQUESTED",
                decisionReason: normalized.comment,
              },
            }),
            tx.approvalInstance.update({
              where: { id: request.approvalInstance.id },
              data: { status: "REVISION_REQUESTED", decidedAt: null },
            }),
            tx.notificationOutbox.create({
              data: {
                aggregateType: "OVERTIME_REQUEST",
                aggregateId: request.id,
                eventType: "OVERTIME_REQUEST_REVISION_REQUESTED",
                payload: {
                  requestId: request.id,
                  requesterEmployeeId: request.employeeId,
                  stepOrder: currentStep.stepOrder,
                },
              },
            }),
            tx.auditLog.create({
              data: {
                actorEmployeeId: input.approverEmployeeId,
                action: "OVERTIME_REQUEST_REVISION",
                entityType: "OvertimeRequest",
                entityId: request.id,
                correlationId: input.correlationId,
                metadata: {
                  requesterEmployeeId: request.employeeId,
                  stepOrder: currentStep.stepOrder,
                },
              },
            }),
          ]);

          const sentBack = await tx.overtimeRequest.findUniqueOrThrow({
            where: { id: request.id },
            select: {
              id: true,
              employeeId: true,
              reason: true,
              status: true,
              decisionReason: true,
              submittedAt: true,
              segments: {
                select: {
                  id: true,
                  workDate: true,
                  startTime: true,
                  endTime: true,
                  requestedMinutes: true,
                  attendanceRecordId: true,
                },
                orderBy: [{ workDate: "asc" }, { startTime: "asc" }, { id: "asc" }],
              },
            },
          });

          return {
            request: requestView(sentBack),
            completed: false,
            warnings: [],
          };
        }

        const nextStep =
          normalized.decision === "APPROVED"
            ? request.approvalInstance.steps.find(
                (step) =>
                  step.stepOrder >
                    currentStep.stepOrder &&
                  step.status === "PENDING",
              )
            : undefined;
        const finalStatus =
          normalized.decision === "REJECTED"
            ? "REJECTED"
            : nextStep
              ? "PENDING"
              : "APPROVED";
        const completed =
          finalStatus !== "PENDING";

        await Promise.all([
          tx.approvalStep.update({
            where: { id: currentStep.id },
            data: {
              status: normalized.decision,
              comment: normalized.comment,
              decidedAt,
            },
          }),
          tx.overtimeRequest.update({
            where: { id: request.id },
            data: {
              status: finalStatus,
              decisionReason:
                normalized.decision === "REJECTED"
                  ? normalized.comment
                  : null,
            },
          }),
          tx.approvalInstance.update({
            where: {
              id: request.approvalInstance.id,
            },
            data: {
              status: finalStatus,
              currentStepOrder:
                nextStep?.stepOrder ?? null,
              decidedAt: completed
                ? decidedAt
                : null,
            },
          }),
          tx.notificationOutbox.create({
            data: {
              aggregateType: "OVERTIME_REQUEST",
              aggregateId: request.id,
              eventType:
                normalized.decision === "REJECTED"
                  ? "OVERTIME_REQUEST_REJECTED"
                  : completed
                    ? "OVERTIME_REQUEST_APPROVED"
                    : "OVERTIME_APPROVAL_ADVANCED",
              payload: {
                requestId: request.id,
                requesterEmployeeId:
                  request.employeeId,
                nextStepOrder:
                  nextStep?.stepOrder ?? null,
              },
            },
          }),
          tx.auditLog.create({
            data: {
              actorEmployeeId:
                input.approverEmployeeId,
              action:
                normalized.decision === "REJECTED"
                  ? "OVERTIME_REJECT"
                  : "OVERTIME_APPROVE",
              entityType: "OvertimeRequest",
              entityId: request.id,
              correlationId: input.correlationId,
              metadata: {
                requesterEmployeeId:
                  request.employeeId,
                stepOrder:
                  currentStep.stepOrder,
                completed,
              },
            },
          }),
        ]);

        const updated =
          await tx.overtimeRequest.findUnique({
            where: { id: request.id },
            select: {
              id: true,
              employeeId: true,
              reason: true,
              status: true,
              decisionReason: true,
              submittedAt: true,
              segments: {
                select: {
                  id: true,
                  workDate: true,
                  startTime: true,
                  endTime: true,
                  requestedMinutes: true,
                  attendanceRecordId: true,
                },
                orderBy: [
                  { workDate: "asc" },
                  { startTime: "asc" },
                  { id: "asc" },
                ],
              },
            },
          });

        if (!updated) {
          throw new Error(
            "Overtime request disappeared during decision",
          );
        }

        return {
          request: requestView(updated),
          completed,
          warnings: [],
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async previewApprovalChain(employeeId: string): Promise<ApprovalChainPreview> {
    const requester = await activeEmployeeContext(this.prisma, employeeId);
    const approval = await resolveOvertimeApproval(this.prisma, requester);
    const names = await approverNames(this.prisma, approval.steps.map((step) => step.approverEmployeeId));

    return {
      autoApproved: false,
      steps: approval.steps.map((step) => ({
        stepOrder: step.stepOrder,
        approverEmployeeId: step.approverEmployeeId,
        approverName: names.get(step.approverEmployeeId) ?? null,
      })),
    };
  }

  resubmitOvertime(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly request: OvertimeResubmitInput;
    readonly canonicalPayload: string;
  }): Promise<OvertimeResubmitResult> {
    return resubmitSentBackOvertime(this.prisma, input);
  }

  withdrawApprovedOvertime(input: {
    readonly actorEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly reason: string;
  }): Promise<OvertimeWithdrawResult> {
    return withdrawApprovedOvertime(this.prisma, input);
  }
}
