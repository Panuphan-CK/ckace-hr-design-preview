import { IdempotencyConflictError } from "@ckace/auth";
import {
  normalizeClientKey,
  normalizeLeaveDescription,
  normalizeLeavePeriod,
} from "@ckace/business-rules";
import type {
  LeaveApprovalDecisionInput,
  LeaveApprovalDecisionResult,
  LeaveApprovalStepOptions,
  LeaveCancelResult,
  LeaveCreateInput,
  LeaveCreateResult,
  LeaveDurationCode,
  LeaveResubmitInput,
  LeaveResubmitResult,
  LeaveSelfOverview,
  LeaveWithdrawResult,
} from "@ckace/contracts";
import type { LeaveRepository } from "@ckace/database";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

export const LEAVE_REPOSITORY =
  "CKACE_LEAVE_REPOSITORY";

const durations = new Set<LeaveDurationCode>([
  "FULL_DAY",
  "HOURLY",
  "MORNING",
  "AFTERNOON",
]);

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredUuid(value: unknown, name: string): string {
  if (typeof value !== "string" || !UUID.test(value.trim())) {
    throw new BadRequestException(`${name} must be a valid ID`);
  }

  return value.trim();
}

function requiredString(
  value: unknown,
  name: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new BadRequestException(`${name} is required`);
  }

  const normalized = value.trim();

  if (!normalized || normalized.length > maxLength) {
    throw new BadRequestException(`${name} is invalid`);
  }

  return normalized;
}

function optionalAttachmentIds(value: unknown): readonly string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value) || value.length > 3) {
    throw new BadRequestException("attachmentIds is invalid");
  }

  const ids = value.map((entry) => {
    if (typeof entry !== "string") {
      throw new BadRequestException("attachmentIds is invalid");
    }

    return requiredUuid(entry, "attachmentId");
  });

  if (new Set(ids).size !== ids.length) {
    throw new BadRequestException("attachmentIds must be unique");
  }

  return ids;
}

function optionalTime(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (
    typeof value !== "string" ||
    !/^\d{2}:\d{2}$/.test(value)
  ) {
    throw new BadRequestException("Leave time is invalid");
  }

  return value;
}

function parseCreateBody(body: unknown): LeaveCreateInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestException("Leave request body is invalid");
  }

  const source = body as Record<string, unknown>;
  const durationCode = source.durationCode;

  if (
    typeof durationCode !== "string" ||
    !durations.has(durationCode as LeaveDurationCode)
  ) {
    throw new BadRequestException(
      "Leave duration code is invalid",
    );
  }

  if (!Array.isArray(source.approverEmployeeIds)) {
    throw new BadRequestException(
      "Leave approver selection is required",
    );
  }

  const approverEmployeeIds =
    source.approverEmployeeIds.map((value) =>
      requiredString(value, "approverEmployeeId", 128),
    );

  try {
    const period = normalizeLeavePeriod({
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
      durationCode: durationCode as LeaveDurationCode,
      startTime: optionalTime(source.startTime),
      endTime: optionalTime(source.endTime),
    });

    return {
      clientKey: normalizeClientKey(
        requiredString(
          source.clientKey,
          "clientKey",
          120,
        ),
      ),
      entitlementId: requiredString(
        source.entitlementId,
        "entitlementId",
        128,
      ),
      description: normalizeLeaveDescription(
        requiredString(
          source.description,
          "description",
          2000,
        ),
      ),
      startDate: period.startDate,
      endDate: period.endDate,
      durationCode: period.durationCode,
      startTime: period.startTime,
      endTime: period.endTime,
      approverEmployeeIds,
      attachmentIds: optionalAttachmentIds(source.attachmentIds),
    };
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    throw new BadRequestException(
      error instanceof Error
        ? error.message
        : "Leave request body is invalid",
    );
  }
}

function parseDecisionBody(
  body: unknown,
): LeaveApprovalDecisionInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestException(
      "Leave decision body is invalid",
    );
  }

  const source = body as Record<string, unknown>;
  const approvalStepId = requiredUuid(source.approvalStepId, "approvalStepId");
  const decision = source.decision;

  if (
    decision !== "APPROVED" &&
    decision !== "REJECTED" &&
    decision !== "REVISION_REQUESTED"
  ) {
    throw new BadRequestException(
      "Leave decision is invalid",
    );
  }

  const comment =
    source.comment === undefined ||
    source.comment === null ||
    source.comment === ""
      ? null
      : requiredString(source.comment, "comment", 1000);

  if (decision === "REJECTED" && !comment) {
    throw new BadRequestException(
      "Leave rejection comment is required",
    );
  }

  if (decision === "REVISION_REQUESTED" && !comment) {
    throw new BadRequestException(
      "Leave revision comment is required",
    );
  }

  return {
    approvalStepId,
    decision,
    comment,
  };
}

function parseResubmitBody(body: unknown): LeaveResubmitInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestException("Leave resubmission body is invalid");
  }

  const source = body as Record<string, unknown>;
  const durationCode = source.durationCode;

  if (
    typeof durationCode !== "string" ||
    !durations.has(durationCode as LeaveDurationCode)
  ) {
    throw new BadRequestException("Leave duration code is invalid");
  }

  try {
    const period = normalizeLeavePeriod({
      startDate: requiredString(source.startDate, "startDate", 10),
      endDate: requiredString(source.endDate, "endDate", 10),
      durationCode: durationCode as LeaveDurationCode,
      startTime: optionalTime(source.startTime),
      endTime: optionalTime(source.endTime),
    });

    return {
      clientKey: normalizeClientKey(
        requiredString(source.clientKey, "clientKey", 120),
      ),
      description: normalizeLeaveDescription(
        requiredString(source.description, "description", 2000),
      ),
      startDate: period.startDate,
      endDate: period.endDate,
      durationCode: period.durationCode,
      startTime: period.startTime,
      endTime: period.endTime,
      attachmentIds: optionalAttachmentIds(source.attachmentIds),
    };
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    throw new BadRequestException(
      error instanceof Error ? error.message : "Leave resubmission body is invalid",
    );
  }
}

function parseWithdrawBody(body: unknown): string {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestException("Leave withdrawal body is invalid");
  }

  return requiredString((body as Record<string, unknown>).reason, "reason", 1000);
}

function canonicalCreatePayload(
  request: LeaveCreateInput,
): string {
  return JSON.stringify({
    entitlementId: request.entitlementId,
    description: request.description,
    startDate: request.startDate,
    endDate: request.endDate,
    durationCode: request.durationCode,
    startTime: request.startTime ?? null,
    endTime: request.endTime ?? null,
    approverEmployeeIds: [
      ...request.approverEmployeeIds,
    ],
    attachmentIds: [...(request.attachmentIds ?? [])].sort(),
  });
}

function translateRepositoryError(error: unknown): never {
  if (error instanceof IdempotencyConflictError) {
    throw new ConflictException("Idempotency conflict");
  }

  if (!(error instanceof Error)) {
    throw error;
  }

  if (error.message === "Active employee account is required") {
    throw new ForbiddenException(
      "Active employee account is required",
    );
  }

  if (error.message === "Leave request not found") {
    throw new NotFoundException("Leave request not found");
  }

  if (
    error.message ===
    "Leave request is not assigned to this approver"
  ) {
    throw new ForbiddenException(
      "Leave request is not assigned to this approver",
    );
  }

  const badRequestPrefixes = [
    "Leave ",
    "Hourly ",
    "Only hourly ",
    "Working weekday ",
    "No eligible approver ",
    "Selected approver ",
    "Active employee ",
    "Idempotency record ",
    "Leave request is not pending approval",
    "Leave request is not assigned to this approver",
    "Only a leave request sent back",
    "Only an approved leave request",
    "The step that sent",
    "The approval chain of this request",
    "A withdrawal reason",
    "leave request overlaps",
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
export class LeaveService {
  constructor(
    @Inject(LEAVE_REPOSITORY)
    private readonly repository: LeaveRepository,
  ) {}

  async getSelfOverview(
    employeeId: string,
  ): Promise<LeaveSelfOverview> {
    try {
      return await this.repository.getSelfOverview(employeeId);
    } catch (error) {
      return translateRepositoryError(error);
    }
  }

  async getApprovalOptions(
    employeeId: string,
  ): Promise<readonly LeaveApprovalStepOptions[]> {
    try {
      return await this.repository.getApprovalOptions(
        employeeId,
      );
    } catch (error) {
      return translateRepositoryError(error);
    }
  }

  async createSelfLeave(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly body: unknown;
  }): Promise<LeaveCreateResult> {
    const request = parseCreateBody(input.body);

    try {
      if (request.startDate.slice(0, 4) !== request.endDate.slice(0, 4)) {
        return await this.createAcrossYears(input, request);
      }

      return await this.repository.createSelfLeave({
        employeeId: input.employeeId,
        correlationId: input.correlationId,
        request,
        canonicalPayload: canonicalCreatePayload(request),
      });
    } catch (error) {
      return translateRepositoryError(error);
    }
  }

  /**
   * A leave across New Year is filed as one request per calendar year (each year has its
   * own balance, nothing carries over). All parts use the same approvers; if one part fails
   * the parts already filed are cancelled so the employee never ends up half-filed.
   */
  private async createAcrossYears(
    input: { readonly employeeId: string; readonly correlationId: string },
    request: LeaveCreateInput,
  ): Promise<LeaveCreateResult> {
    const firstYear = Number(request.startDate.slice(0, 4));
    const lastYear = Number(request.endDate.slice(0, 4));

    if (
      request.durationCode !== "FULL_DAY" ||
      lastYear < firstYear ||
      lastYear - firstYear > 1
    ) {
      throw new BadRequestException(
        "Leave across New Year must be full days and span two calendar years at most",
      );
    }

    const created: string[] = [];
    let replayed = true;
    // A file links to exactly one request: the first part that is actually filed carries it.
    let pendingAttachmentIds = request.attachmentIds ?? [];

    try {
      for (let year = firstYear; year <= lastYear; year += 1) {
        const entitlementId = await this.repository.findEntitlementForYear({
          employeeId: input.employeeId,
          entitlementId: request.entitlementId,
          year,
        });

        if (!entitlementId) {
          throw new BadRequestException(
            `No leave entitlement is available for year ${year}`,
          );
        }

        const part: LeaveCreateInput = {
          ...request,
          clientKey: `${request.clientKey.slice(0, 100)}:y${year}`,
          entitlementId,
          startDate: year === firstYear ? request.startDate : `${year}-01-01`,
          endDate: year === lastYear ? request.endDate : `${year}-12-31`,
          description:
            year === firstYear
              ? request.description
              : `${request.description} (ต่อเนื่องข้ามปี)`,
          attachmentIds: pendingAttachmentIds,
        };

        try {
          const result = await this.repository.createSelfLeave({
            employeeId: input.employeeId,
            correlationId: input.correlationId,
            request: part,
            canonicalPayload: canonicalCreatePayload(part),
          });

          created.push(result.requestId);
          pendingAttachmentIds = [];
          replayed = replayed && result.replayed;
        } catch (error) {
          // A part that covers only holidays/weekends needs no leave of its own.
          if (
            error instanceof Error &&
            error.message.startsWith("Leave request must consume positive leave quota")
          ) {
            continue;
          }

          throw error;
        }
      }
    } catch (error) {
      for (const requestId of created) {
        await this.repository
          .cancelSelfLeave({
            employeeId: input.employeeId,
            correlationId: input.correlationId,
            requestId,
          })
          .catch(() => undefined);
      }

      throw error;
    }

    const [first, ...rest] = created;

    if (!first) {
      throw new BadRequestException(
        "Leave request must consume positive leave quota",
      );
    }

    return {
      requestId: first,
      replayed,
      ...(rest.length > 0 ? { additionalRequestIds: rest } : {}),
    };
  }

  async resubmitLeave(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly body: unknown;
  }): Promise<LeaveResubmitResult> {
    const request = parseResubmitBody(input.body);
    const requestId = requiredUuid(input.requestId, "requestId");

    try {
      return await this.repository.resubmitLeave({
        employeeId: input.employeeId,
        correlationId: input.correlationId,
        requestId,
        request,
        canonicalPayload: JSON.stringify({
          requestId,
          description: request.description,
          startDate: request.startDate,
          endDate: request.endDate,
          durationCode: request.durationCode,
          startTime: request.startTime ?? null,
          endTime: request.endTime ?? null,
          attachmentIds: [...(request.attachmentIds ?? [])].sort(),
        }),
      });
    } catch (error) {
      return translateRepositoryError(error);
    }
  }

  async withdrawApprovedLeave(input: {
    readonly actorEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly body: unknown;
  }): Promise<LeaveWithdrawResult> {
    const reason = parseWithdrawBody(input.body);
    const requestId = requiredUuid(input.requestId, "requestId");

    try {
      return await this.repository.withdrawApprovedLeave({
        actorEmployeeId: input.actorEmployeeId,
        correlationId: input.correlationId,
        requestId,
        reason,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Not allowed to withdraw")
      ) {
        throw new ForbiddenException(error.message);
      }

      return translateRepositoryError(error);
    }
  }

  async cancelSelfLeave(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
  }): Promise<LeaveCancelResult> {
    const requestId = requiredUuid(input.requestId, "requestId");

    try {
      return await this.repository.cancelSelfLeave({ ...input, requestId });
    } catch (error) {
      return translateRepositoryError(error);
    }
  }

  async decideLeave(input: {
    readonly approverEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly body: unknown;
  }): Promise<LeaveApprovalDecisionResult> {
    const decision = parseDecisionBody(input.body);

    try {
      return await this.repository.decideLeave({
        approverEmployeeId: input.approverEmployeeId,
        correlationId: input.correlationId,
        requestId: requiredUuid(input.requestId, "requestId"),
        decision,
      });
    } catch (error) {
      return translateRepositoryError(error);
    }
  }
}
