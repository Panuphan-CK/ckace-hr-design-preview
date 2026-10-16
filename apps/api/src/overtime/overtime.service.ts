import { IdempotencyConflictError } from "@ckace/auth";
import {
  normalizeOvertimeCreate,
  normalizeOvertimeDecision,
} from "@ckace/business-rules";
import type {
  ApprovalChainPreview,
  OvertimeBulkApproveResult,
  OvertimeApprovalQueueItem,
  OvertimeCancelResult,
  OvertimeBreakCode,
  OvertimeCreateInput,
  OvertimeCreateResult,
  OvertimeDecisionInput,
  OvertimeDecisionResult,
  OvertimeResubmitInput,
  OvertimeResubmitResult,
  OvertimeSelfOverview,
  OvertimeWithdrawResult,
} from "@ckace/contracts";
import type { OvertimeRepository } from "@ckace/database";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

export const OVERTIME_REPOSITORY =
  "CKACE_OVERTIME_REPOSITORY";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function objectBody(
  body: unknown,
): Record<string, unknown> {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    throw new BadRequestException(
      "Overtime request body is invalid",
    );
  }

  return body as Record<string, unknown>;
}

function requiredString(
  value: unknown,
  name: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new BadRequestException(
      `${name} is required`,
    );
  }

  const normalized = value.trim();

  if (
    !normalized ||
    normalized.length > maxLength
  ) {
    throw new BadRequestException(
      `${name} is invalid`,
    );
  }

  return normalized;
}

function requiredUuid(
  value: string,
  name: string,
): string {
  const normalized = value.trim();

  if (!UUID.test(normalized)) {
    throw new BadRequestException(
      `${name} is invalid`,
    );
  }

  return normalized;
}

function parseCreateBody(
  body: unknown,
): OvertimeCreateInput {
  const source = objectBody(body);

  try {
    return normalizeOvertimeCreate({
      startDate: requiredString(
        source.startDate,
        "startDate",
        10,
      ),
      endDate: requiredString(
        source.endDate,
        "endDate",
        10,
      ),
      startTime: requiredString(
        source.startTime,
        "startTime",
        5,
      ),
      endTime: requiredString(
        source.endTime,
        "endTime",
        5,
      ),
      reason: requiredString(
        source.reason,
        "reason",
        1000,
      ),
      clientKey: requiredString(
        source.clientKey,
        "clientKey",
        120,
      ),
      ...(Array.isArray(source.breaks)
        ? { breaks: source.breaks as OvertimeBreakCode[] }
        : {}),
    });
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    throw new BadRequestException(
      error instanceof Error
        ? error.message
        : "Overtime request body is invalid",
    );
  }
}

function parseDecisionBody(
  body: unknown,
): OvertimeDecisionInput {
  const source = objectBody(body);
  const decision = source.decision;

  if (
    decision !== "APPROVED" &&
    decision !== "REJECTED" &&
    decision !== "REVISION_REQUESTED"
  ) {
    throw new BadRequestException(
      "Overtime decision is invalid",
    );
  }

  if (
    source.comment !== undefined &&
    source.comment !== null &&
    typeof source.comment !== "string"
  ) {
    throw new BadRequestException(
      "Overtime decision comment is invalid",
    );
  }

  try {
    return normalizeOvertimeDecision({
      decision,
      comment:
        typeof source.comment === "string"
          ? source.comment
          : null,
    });
  } catch (error) {
    throw new BadRequestException(
      error instanceof Error
        ? error.message
        : "Overtime decision is invalid",
    );
  }
}

function canonicalCreatePayload(
  request: OvertimeCreateInput,
): string {
  return JSON.stringify({
    startDate: request.startDate,
    endDate: request.endDate,
    startTime: request.startTime,
    endTime: request.endTime,
    reason: request.reason,
  });
}

function translateRepositoryError(
  error: unknown,
): never {
  if (error instanceof IdempotencyConflictError) {
    throw new ConflictException(
      "Idempotency conflict",
    );
  }

  if (!(error instanceof Error)) {
    throw error;
  }

  if (
    error.message ===
    "Active employee account is required"
  ) {
    throw new ForbiddenException(error.message);
  }

  if (
    error.message ===
      "Overtime request is not assigned to this approver" ||
    error.message.startsWith("Not allowed to withdraw")
  ) {
    throw new ForbiddenException(error.message);
  }

  const notFoundMessages = new Set([
    "Overtime request is unavailable for this employee",
    "Overtime approval state is unavailable",
  ]);

  if (notFoundMessages.has(error.message)) {
    throw new NotFoundException(error.message);
  }

  const conflictPrefixes = [
    "overtime request overlaps ",
    "only pending overtime ",
    "Overtime request has already ",
    "Overtime idempotency ",
    "Overtime request is not waiting ",
    "Only an approved overtime ",
  ];

  if (
    conflictPrefixes.some((prefix) =>
      error.message.startsWith(prefix),
    )
  ) {
    throw new ConflictException(error.message);
  }

  const badRequestPrefixes = [
    "overtime ",
    "Overtime ",
    "Weekly overtime ",
    "No eligible approver ",
  ];

  if (
    badRequestPrefixes.some((prefix) =>
      error.message.startsWith(prefix),
    )
  ) {
    throw new BadRequestException(error.message);
  }

  throw error;
}

@Injectable()
export class OvertimeService {
  constructor(
    @Inject(OVERTIME_REPOSITORY)
    private readonly repository: OvertimeRepository,
  ) {}

  async getSelfOverview(
    employeeId: string,
  ): Promise<OvertimeSelfOverview> {
    try {
      return await this.repository.getSelfOverview(
        employeeId,
      );
    } catch (error) {
      return translateRepositoryError(error);
    }
  }

  async getAssignedApprovals(
    approverEmployeeId: string,
  ): Promise<
    readonly OvertimeApprovalQueueItem[]
  > {
    try {
      return await this.repository.getAssignedApprovals(
        approverEmployeeId,
      );
    } catch (error) {
      return translateRepositoryError(error);
    }
  }

  async createSelfOvertime(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly body: unknown;
  }): Promise<OvertimeCreateResult> {
    const request = parseCreateBody(input.body);

    try {
      return await this.repository.createSelfOvertime({
        employeeId: input.employeeId,
        correlationId: input.correlationId,
        request,
        canonicalPayload:
          canonicalCreatePayload(request),
      });
    } catch (error) {
      return translateRepositoryError(error);
    }
  }

  async resubmitOvertime(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly body: unknown;
  }): Promise<OvertimeResubmitResult> {
    const requestId = requiredUuid(input.requestId, "requestId");
    const source = objectBody(input.body);
    const request: OvertimeResubmitInput = {
      clientKey: requiredString(source.clientKey, "clientKey", 120),
      startTime: requiredString(source.startTime, "startTime", 5),
      endTime: requiredString(source.endTime, "endTime", 5),
      reason: requiredString(source.reason, "reason", 1000),
      ...(Array.isArray(source.breaks)
        ? { breaks: source.breaks as OvertimeBreakCode[] }
        : {}),
    };

    try {
      return await this.repository.resubmitOvertime({
        employeeId: input.employeeId,
        correlationId: input.correlationId,
        requestId,
        request,
        canonicalPayload: JSON.stringify({
          requestId,
          startTime: request.startTime,
          endTime: request.endTime,
          reason: request.reason,
          breaks: request.breaks ?? null,
        }),
      });
    } catch (error) {
      return translateRepositoryError(error);
    }
  }

  async withdrawApprovedOvertime(input: {
    readonly actorEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly body: unknown;
  }): Promise<OvertimeWithdrawResult> {
    const requestId = requiredUuid(input.requestId, "requestId");
    const reason = requiredString(objectBody(input.body).reason, "reason", 1000);

    try {
      return await this.repository.withdrawApprovedOvertime({
        actorEmployeeId: input.actorEmployeeId,
        correlationId: input.correlationId,
        requestId,
        reason,
      });
    } catch (error) {
      return translateRepositoryError(error);
    }
  }

  async previewApprovalChain(employeeId: string): Promise<ApprovalChainPreview> {
    try {
      return await this.repository.previewApprovalChain(employeeId);
    } catch (error) {
      return translateRepositoryError(error);
    }
  }

  /** Approves every request currently waiting for this approver, one transaction each. */
  async approveAllAssignedOvertime(input: {
    readonly approverEmployeeId: string;
    readonly correlationId: string;
  }): Promise<OvertimeBulkApproveResult> {
    const queue = await this.getAssignedApprovals(input.approverEmployeeId);
    const failed: { requestId: string; reason: string }[] = [];
    let approved = 0;

    for (const item of queue.slice(0, 200)) {
      try {
        await this.repository.decideAssignedOvertime({
          approverEmployeeId: input.approverEmployeeId,
          correlationId: input.correlationId,
          requestId: item.id,
          decision: { decision: "APPROVED", comment: null },
        });
        approved += 1;
      } catch (error) {
        failed.push({
          requestId: item.id,
          reason: error instanceof Error ? error.message : "Approval failed",
        });
      }
    }

    return { approved, failed };
  }

  async cancelSelfOvertime(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
  }): Promise<OvertimeCancelResult> {
    const requestId = requiredUuid(
      input.requestId,
      "requestId",
    );

    try {
      return await this.repository.cancelSelfOvertime({
        ...input,
        requestId,
      });
    } catch (error) {
      return translateRepositoryError(error);
    }
  }

  async decideAssignedOvertime(input: {
    readonly approverEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly body: unknown;
  }): Promise<OvertimeDecisionResult> {
    const requestId = requiredUuid(
      input.requestId,
      "requestId",
    );
    const decision = parseDecisionBody(input.body);

    try {
      return await this.repository.decideAssignedOvertime({
        approverEmployeeId:
          input.approverEmployeeId,
        correlationId: input.correlationId,
        requestId,
        decision,
      });
    } catch (error) {
      return translateRepositoryError(error);
    }
  }
}
