import { IdempotencyConflictError } from "@ckace/auth";
import {
  normalizeAttendanceClientKey,
  normalizeAttendanceLocation,
  normalizeAttendanceRecordId,
  normalizeTimeCorrection,
  normalizeTimeCorrectionDecision,
} from "@ckace/business-rules";
import type {
  AttendanceCheckInInput,
  AttendanceCheckOutInput,
  AttendanceSelfOverview,
  AttendanceWriteResult,
  TimeCorrectionCancelResult,
  TimeCorrectionCreateInput,
  TimeCorrectionCreateResult,
  TimeCorrectionDecisionInput,
  TimeCorrectionDecisionResult,
  TimeCorrectionRequestView,
} from "@ckace/contracts";
import type { AttendanceRepository } from "@ckace/database";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

export const ATTENDANCE_REPOSITORY =
  "CKACE_ATTENDANCE_REPOSITORY";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function objectBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestException("Attendance request body is invalid");
  }

  return body as Record<string, unknown>;
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

function requiredNumber(
  value: unknown,
  name: string,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new BadRequestException(`${name} is invalid`);
  }

  return value;
}

function requiredUuid(
  value: string,
  name: string,
): string {
  const normalized = value.trim();

  if (!UUID.test(normalized)) {
    throw new BadRequestException(`${name} is invalid`);
  }

  return normalized;
}

function parseLocation(
  source: Record<string, unknown>,
) {
  return normalizeAttendanceLocation({
    latitude: requiredNumber(
      source.latitude,
      "latitude",
    ),
    longitude: requiredNumber(
      source.longitude,
      "longitude",
    ),
    accuracyMeters: requiredNumber(
      source.accuracyMeters,
      "accuracyMeters",
    ),
  });
}

function parseCheckInBody(
  body: unknown,
): AttendanceCheckInInput {
  const source = objectBody(body);

  try {
    return {
      clientKey: normalizeAttendanceClientKey(
        requiredString(
          source.clientKey,
          "clientKey",
          120,
        ),
      ),
      ...parseLocation(source),
    };
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    throw new BadRequestException(
      error instanceof Error
        ? error.message
        : "Attendance check-in body is invalid",
    );
  }
}

function parseCheckOutBody(
  body: unknown,
): AttendanceCheckOutInput {
  const source = objectBody(body);

  try {
    return {
      clientKey: normalizeAttendanceClientKey(
        requiredString(
          source.clientKey,
          "clientKey",
          120,
        ),
      ),
      attendanceRecordId: normalizeAttendanceRecordId(
        requiredString(
          source.attendanceRecordId,
          "attendanceRecordId",
          128,
        ),
      ),
      ...parseLocation(source),
    };
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    throw new BadRequestException(
      error instanceof Error
        ? error.message
        : "Attendance check-out body is invalid",
    );
  }
}

function parseTimeCorrectionBody(
  body: unknown,
): TimeCorrectionCreateInput {
  const source = objectBody(body);
  const correctionType = source.correctionType;

  if (
    correctionType !== "CHECK_IN" &&
    correctionType !== "CHECK_OUT"
  ) {
    throw new BadRequestException(
      "Time correction type is invalid",
    );
  }

  try {
    return normalizeTimeCorrection({
      clientKey: requiredString(
        source.clientKey,
        "clientKey",
        120,
      ),
      attendanceRecordId: requiredString(
        source.attendanceRecordId,
        "attendanceRecordId",
        128,
      ),
      correctionType,
      correctedTime: requiredString(
        source.correctedTime,
        "correctedTime",
        5,
      ),
      reason: requiredString(
        source.reason,
        "reason",
        1000,
      ),
    });
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    throw new BadRequestException(
      error instanceof Error
        ? error.message
        : "Time correction body is invalid",
    );
  }
}

function parseDecisionBody(
  body: unknown,
): TimeCorrectionDecisionInput {
  const source = objectBody(body);
  const decision = source.decision;

  if (
    decision !== "APPROVED" &&
    decision !== "REJECTED"
  ) {
    throw new BadRequestException(
      "Time correction decision is invalid",
    );
  }

  if (
    source.comment !== undefined &&
    source.comment !== null &&
    typeof source.comment !== "string"
  ) {
    throw new BadRequestException(
      "Time correction decision comment is invalid",
    );
  }

  try {
    return normalizeTimeCorrectionDecision({
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
        : "Time correction decision is invalid",
    );
  }
}

function canonicalCheckInPayload(
  request: AttendanceCheckInInput,
): string {
  return JSON.stringify({
    latitude: request.latitude,
    longitude: request.longitude,
    accuracyMeters: request.accuracyMeters,
  });
}

function canonicalCheckOutPayload(
  request: AttendanceCheckOutInput,
): string {
  return JSON.stringify({
    attendanceRecordId: request.attendanceRecordId,
    latitude: request.latitude,
    longitude: request.longitude,
    accuracyMeters: request.accuracyMeters,
  });
}

function canonicalCorrectionPayload(
  request: TimeCorrectionCreateInput,
): string {
  return JSON.stringify({
    attendanceRecordId: request.attendanceRecordId,
    correctionType: request.correctionType,
    correctedTime: request.correctedTime,
    reason: request.reason,
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
    throw new ForbiddenException(error.message);
  }

  if (
    error.message ===
      "Time correction is not assigned to this approver"
  ) {
    throw new ForbiddenException(error.message);
  }

  const notFoundMessages = new Set([
    "Attendance record is unavailable",
    "Attendance record is unavailable for this employee",
    "Time correction request is unavailable for this employee",
    "Time correction approval state is unavailable",
    "Time correction attendance record is unavailable",
  ]);

  if (notFoundMessages.has(error.message)) {
    throw new NotFoundException(error.message);
  }

  const conflictPrefixes = [
    "Attendance already exists ",
    "Attendance record is already ",
    "Duplicate attendance business day ",
    "Time correction request has already ",
    "Only pending time correction ",
    "Approved time correction ",
    "An active time correction ",
    "Idempotency record ",
  ];

  if (
    conflictPrefixes.some((prefix) =>
      error.message.startsWith(prefix),
    )
  ) {
    throw new ConflictException(error.message);
  }

  const badRequestPrefixes = [
    "Attendance ",
    "Checkout ",
    "Time correction ",
    "Corrected ",
    "Rejected ",
    "Weekly attendance ",
    "Approved overtime ",
    "No eligible time correction ",
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
export class AttendanceService {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly repository: AttendanceRepository,
  ) {}

  async getSelfOverview(
    employeeId: string,
  ): Promise<AttendanceSelfOverview> {
    try {
      return await this.repository.getSelfOverview(employeeId);
    } catch (error) {
      return translateRepositoryError(error);
    }
  }

  async checkIn(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly body: unknown;
  }): Promise<AttendanceWriteResult> {
    const request = parseCheckInBody(input.body);

    try {
      return await this.repository.checkIn({
        employeeId: input.employeeId,
        correlationId: input.correlationId,
        request,
        canonicalPayload: canonicalCheckInPayload(request),
      });
    } catch (error) {
      return translateRepositoryError(error);
    }
  }

  async checkOut(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly body: unknown;
  }): Promise<AttendanceWriteResult> {
    const request = parseCheckOutBody(input.body);

    try {
      return await this.repository.checkOut({
        employeeId: input.employeeId,
        correlationId: input.correlationId,
        request,
        canonicalPayload: canonicalCheckOutPayload(request),
      });
    } catch (error) {
      return translateRepositoryError(error);
    }
  }

  async getSelfTimeCorrections(
    employeeId: string,
  ): Promise<readonly TimeCorrectionRequestView[]> {
    try {
      return await this.repository.getSelfTimeCorrections(
        employeeId,
      );
    } catch (error) {
      return translateRepositoryError(error);
    }
  }

  async getAssignedTimeCorrections(
    approverEmployeeId: string,
  ): Promise<readonly TimeCorrectionRequestView[]> {
    try {
      return await this.repository.getAssignedTimeCorrections(
        approverEmployeeId,
      );
    } catch (error) {
      return translateRepositoryError(error);
    }
  }

  async createSelfTimeCorrection(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly body: unknown;
  }): Promise<TimeCorrectionCreateResult> {
    const request = parseTimeCorrectionBody(input.body);

    try {
      return await this.repository.createSelfTimeCorrection({
        employeeId: input.employeeId,
        correlationId: input.correlationId,
        request,
        canonicalPayload:
          canonicalCorrectionPayload(request),
      });
    } catch (error) {
      return translateRepositoryError(error);
    }
  }

  async cancelSelfTimeCorrection(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
  }): Promise<TimeCorrectionCancelResult> {
    const requestId = requiredUuid(
      input.requestId,
      "requestId",
    );

    try {
      return await this.repository.cancelSelfTimeCorrection({
        ...input,
        requestId,
      });
    } catch (error) {
      return translateRepositoryError(error);
    }
  }

  async decideAssignedTimeCorrection(input: {
    readonly approverEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly body: unknown;
  }): Promise<TimeCorrectionDecisionResult> {
    const requestId = requiredUuid(
      input.requestId,
      "requestId",
    );
    const decision = parseDecisionBody(input.body);

    try {
      return await this.repository.decideAssignedTimeCorrection({
        approverEmployeeId: input.approverEmployeeId,
        correlationId: input.correlationId,
        requestId,
        decision,
      });
    } catch (error) {
      return translateRepositoryError(error);
    }
  }
}
