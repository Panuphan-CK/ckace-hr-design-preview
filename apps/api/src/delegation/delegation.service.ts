import { IdempotencyConflictError } from "@ckace/auth";
import type { ApprovalDelegationItem, ApprovalDelegationOverview } from "@ckace/contracts";
import type { DelegationRepository } from "@ckace/database";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

export const DELEGATION_REPOSITORY = "CKACE_DELEGATION_REPOSITORY";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function translate(error: unknown): never {
  if (error instanceof IdempotencyConflictError) {
    throw new ConflictException("Idempotency conflict");
  }

  if (!(error instanceof Error)) {
    throw error;
  }

  if (error.message === "Active employee account is required") {
    throw new ForbiddenException(error.message);
  }

  if (error.message === "Delegation is unavailable for this employee") {
    throw new NotFoundException(error.message);
  }

  if (error.message.startsWith("An active delegation already ")) {
    throw new ConflictException(error.message);
  }

  if (error.message.startsWith("Delegat")) {
    throw new BadRequestException(error.message);
  }

  throw error;
}

@Injectable()
export class DelegationService {
  constructor(
    @Inject(DELEGATION_REPOSITORY)
    private readonly repository: DelegationRepository,
  ) {}

  overview(employeeId: string): Promise<ApprovalDelegationOverview> {
    return this.repository.overview(employeeId);
  }

  async create(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly body: unknown;
  }): Promise<ApprovalDelegationItem> {
    const body = input.body;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new BadRequestException("Delegation body is invalid");
    }

    const { delegateEmployeeId, startDate, endDate } = body as Record<string, unknown>;

    if (
      typeof delegateEmployeeId !== "string" ||
      !UUID.test(delegateEmployeeId) ||
      typeof startDate !== "string" ||
      typeof endDate !== "string"
    ) {
      throw new BadRequestException("delegateEmployeeId, startDate and endDate are required");
    }

    try {
      return await this.repository.create({
        delegatorEmployeeId: input.employeeId,
        delegateEmployeeId,
        startDate,
        endDate,
        correlationId: input.correlationId,
      });
    } catch (error) {
      return translate(error);
    }
  }

  async cancel(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly delegationId: string;
  }): Promise<ApprovalDelegationItem> {
    if (!UUID.test(input.delegationId)) {
      throw new BadRequestException("Invalid delegation ID");
    }

    try {
      return await this.repository.cancel({
        delegatorEmployeeId: input.employeeId,
        delegationId: input.delegationId,
        correlationId: input.correlationId,
      });
    } catch (error) {
      return translate(error);
    }
  }
}
