import { IdempotencyConflictError } from "@ckace/auth";
import {
  normalizeMedicalCreate,
  normalizeMedicalDecision,
} from "@ckace/business-rules";
import type {
  ApprovalChainPreview,
  MedicalApprovalQueueItem,
  MedicalCancelResult,
  MedicalCreateInput,
  MedicalCreateResult,
  MedicalDecisionInput,
  MedicalDecisionResult,
  MedicalResubmitInput,
  MedicalResubmitResult,
  MedicalSelfOverview,
  MedicalWithdrawResult,
} from "@ckace/contracts";
import type { MedicalRepository } from "@ckace/database";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

export const MEDICAL_REPOSITORY =
  "CKACE_MEDICAL_REPOSITORY";

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
      "Medical request body is invalid",
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

function requiredNumber(
  value: unknown,
  name: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    throw new BadRequestException(
      `${name} is invalid`,
    );
  }

  return value;
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

function optionalUuid(
  value: unknown,
  name: string,
): string | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new BadRequestException(
      `${name} is invalid`,
    );
  }

  return requiredUuid(value, name);
}

function attachmentIds(
  value: unknown,
): readonly string[] {
  if (!Array.isArray(value)) {
    throw new BadRequestException(
      "attachmentIds is invalid",
    );
  }

  if (
    value.some(
      (entry) =>
        typeof entry !== "string",
    )
  ) {
    throw new BadRequestException(
      "attachmentIds is invalid",
    );
  }

  return value.map((entry) =>
    requiredUuid(
      entry as string,
      "attachmentId",
    ),
  );
}

function parseCreateBody(
  body: unknown,
): MedicalCreateInput {
  const source = objectBody(body);

  try {
    const normalized =
      normalizeMedicalCreate({
        sicknessDate: requiredString(
          source.sicknessDate,
          "sicknessDate",
          10,
        ),
        amount: requiredNumber(
          source.amount,
          "amount",
        ),
        description: requiredString(
          source.description,
          "description",
          1000,
        ),
        attachmentIds: attachmentIds(
          source.attachmentIds,
        ),
        leaveRequestId:
          optionalUuid(
            source.leaveRequestId,
            "leaveRequestId",
          ),
        clientKey: requiredString(
          source.clientKey,
          "clientKey",
          120,
        ),
      });

    return {
      sicknessDate:
        normalized.sicknessDate,
      amount:
        normalized.requestedAmount,
      description:
        normalized.description,
      attachmentIds:
        normalized.attachmentIds,
      leaveRequestId:
        normalized.leaveRequestId,
      clientKey:
        normalized.clientKey,
    };
  } catch (error) {
    if (
      error instanceof
      BadRequestException
    ) {
      throw error;
    }

    throw new BadRequestException(
      error instanceof Error
        ? error.message
        : "Medical request body is invalid",
    );
  }
}

function parseDecisionBody(
  body: unknown,
): MedicalDecisionInput {
  const source = objectBody(body);
  const decision = source.decision;

  if (
    decision !== "APPROVED" &&
    decision !== "REJECTED" &&
    decision !== "REVISION_REQUESTED"
  ) {
    throw new BadRequestException(
      "Medical decision is invalid",
    );
  }

  if (
    source.comment !== undefined &&
    source.comment !== null &&
    typeof source.comment !== "string"
  ) {
    throw new BadRequestException(
      "Medical decision comment is invalid",
    );
  }

  try {
    return normalizeMedicalDecision({
      decision,
      comment:
        typeof source.comment ===
        "string"
          ? source.comment
          : null,
    });
  } catch (error) {
    throw new BadRequestException(
      error instanceof Error
        ? error.message
        : "Medical decision is invalid",
    );
  }
}

function canonicalCreatePayload(
  request: MedicalCreateInput,
): string {
  return JSON.stringify({
    sicknessDate:
      request.sicknessDate,
    requestedAmount:
      request.amount,
    description:
      request.description,
    attachmentIds:
      [...request.attachmentIds].sort(),
    leaveRequestId:
      request.leaveRequestId ?? null,
  });
}

function translateRepositoryError(
  error: unknown,
): never {
  if (
    error instanceof
    IdempotencyConflictError
  ) {
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
    throw new ForbiddenException(
      error.message,
    );
  }

  if (
    error.message ===
      "Medical claim is not assigned to this approver" ||
    error.message.startsWith("Not allowed to withdraw")
  ) {
    throw new ForbiddenException(
      error.message,
    );
  }

  if (
    error.message ===
      "Medical claim is unavailable for this employee" ||
    error.message ===
      "Medical approval state is unavailable"
  ) {
    throw new NotFoundException(
      error.message,
    );
  }

  const conflictMessages = [
    "Medical claim has already been decided",
    "only pending medical claims can be cancelled",
    "medical annual committed limit exceeded",
    "Medical receipt attachment is already linked",
    "Medical idempotency record is incomplete and requires review",
    "Medical claim is not waiting for revision",
    "Only an approved medical claim can be withdrawn",
  ];

  if (
    conflictMessages.includes(
      error.message,
    )
  ) {
    throw new ConflictException(
      error.message,
    );
  }

  const conflictPrefixes = [
    "Medical approval policy is unavailable",
    "Medical benefit policy ",
    "No eligible approver for medical step ",
  ];

  if (
    conflictPrefixes.some((prefix) =>
      error.message.startsWith(
        prefix,
      ),
    )
  ) {
    throw new ConflictException(
      error.message,
    );
  }

  const badRequestPrefixes = [
    "medical ",
    "Medical receipt ",
    "Medical linked leave ",
    "Unsupported medical ",
    "Medical approval chain ",
    "A withdrawal reason ",
  ];

  if (
    badRequestPrefixes.some((prefix) =>
      error.message.startsWith(
        prefix,
      ),
    )
  ) {
    throw new BadRequestException(
      error.message,
    );
  }

  throw error;
}

@Injectable()
export class MedicalService {
  constructor(
    @Inject(MEDICAL_REPOSITORY)
    private readonly repository:
      MedicalRepository,
  ) {}

  async getSelfOverview(
    employeeId: string,
  ): Promise<MedicalSelfOverview> {
    try {
      return await this.repository.getSelfOverview(
        employeeId,
      );
    } catch (error) {
      return translateRepositoryError(
        error,
      );
    }
  }

  async getAssignedApprovals(
    approverEmployeeId: string,
  ): Promise<
    readonly MedicalApprovalQueueItem[]
  > {
    try {
      return await this.repository.getAssignedApprovals(
        approverEmployeeId,
      );
    } catch (error) {
      return translateRepositoryError(
        error,
      );
    }
  }

  async createSelfMedical(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly body: unknown;
  }): Promise<MedicalCreateResult> {
    const request =
      parseCreateBody(input.body);

    try {
      return await this.repository.createSelfMedical({
        employeeId:
          input.employeeId,
        correlationId:
          input.correlationId,
        request,
        canonicalPayload:
          canonicalCreatePayload(
            request,
          ),
      });
    } catch (error) {
      return translateRepositoryError(
        error,
      );
    }
  }

  async resubmitMedical(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly claimId: string;
    readonly body: unknown;
  }): Promise<MedicalResubmitResult> {
    const claimId = requiredUuid(input.claimId, "claimId");
    const source = objectBody(input.body);
    const amount = source.amount;

    if (typeof amount !== "number") {
      throw new BadRequestException("amount is required");
    }

    const request: MedicalResubmitInput = {
      clientKey: requiredString(source.clientKey, "clientKey", 120),
      sicknessDate: requiredString(source.sicknessDate, "sicknessDate", 10),
      amount,
      description: requiredString(source.description, "description", 1000),
    };

    try {
      return await this.repository.resubmitMedical({
        employeeId: input.employeeId,
        correlationId: input.correlationId,
        claimId,
        request,
        canonicalPayload: JSON.stringify({ claimId, ...request, clientKey: undefined }),
      });
    } catch (error) {
      return translateRepositoryError(error);
    }
  }

  async withdrawApprovedMedical(input: {
    readonly actorEmployeeId: string;
    readonly correlationId: string;
    readonly claimId: string;
    readonly body: unknown;
  }): Promise<MedicalWithdrawResult> {
    const claimId = requiredUuid(input.claimId, "claimId");
    const reason = requiredString(objectBody(input.body).reason, "reason", 1000);

    try {
      return await this.repository.withdrawApprovedMedical({
        actorEmployeeId: input.actorEmployeeId,
        correlationId: input.correlationId,
        claimId,
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

  async cancelSelfMedical(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly claimId: string;
  }): Promise<MedicalCancelResult> {
    const claimId = requiredUuid(
      input.claimId,
      "claimId",
    );

    try {
      return await this.repository.cancelSelfMedical({
        ...input,
        claimId,
      });
    } catch (error) {
      return translateRepositoryError(
        error,
      );
    }
  }

  async decideAssignedMedical(input: {
    readonly approverEmployeeId: string;
    readonly correlationId: string;
    readonly claimId: string;
    readonly body: unknown;
  }): Promise<MedicalDecisionResult> {
    const claimId = requiredUuid(
      input.claimId,
      "claimId",
    );
    const decision =
      parseDecisionBody(input.body);

    try {
      return await this.repository.decideAssignedMedical({
        approverEmployeeId:
          input.approverEmployeeId,
        correlationId:
          input.correlationId,
        claimId,
        decision,
      });
    } catch (error) {
      return translateRepositoryError(
        error,
      );
    }
  }
}
