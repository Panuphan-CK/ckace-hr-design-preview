import {
  IdempotencyConflictError,
  createIdempotencyClaim,
} from "@ckace/auth";
import {
  assertAttendanceDateNotFuture,
  assertAttendanceDayAllowed,
  assertNoActiveTimeCorrection,
  assertTimeCorrectionChanged,
  assertTimeCorrectionOriginalExists,
  calculateAttendanceWorkMinutes,
  calculateCorrectedWorkMinutes,
  classifyAttendanceRadius,
  classifyAttendanceTiming,
  normalizeTimeCorrection,
  normalizeTimeCorrectionDecision,
  type AttendancePolicyRule,
} from "@ckace/business-rules";
import type {
  AttendanceCheckInInput,
  AttendanceCheckOutInput,
  AttendanceRadiusState,
  AttendanceSelfOverview,
  AttendanceWriteResult,
  TimeCorrectionCancelResult,
  TimeCorrectionCreateInput,
  TimeCorrectionCreateResult,
  TimeCorrectionDecisionInput,
  TimeCorrectionDecisionResult,
  TimeCorrectionRequestView,
} from "@ckace/contracts";
import {
  Prisma,
  type PrismaClient,
} from "@prisma/client";

import { resolveCompanyApprovalRoute } from "./approval-route-loader";

export interface AttendanceRepository {
  getSelfOverview(
    employeeId: string,
  ): Promise<AttendanceSelfOverview>;

  checkIn(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly request: AttendanceCheckInInput;
    readonly canonicalPayload: string;
  }): Promise<AttendanceWriteResult>;

  checkOut(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly request: AttendanceCheckOutInput;
    readonly canonicalPayload: string;
  }): Promise<AttendanceWriteResult>;

  getSelfTimeCorrections(
    employeeId: string,
  ): Promise<readonly TimeCorrectionRequestView[]>;

  getAssignedTimeCorrections(
    approverEmployeeId: string,
  ): Promise<readonly TimeCorrectionRequestView[]>;

  createSelfTimeCorrection(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly request: TimeCorrectionCreateInput;
    readonly canonicalPayload: string;
  }): Promise<TimeCorrectionCreateResult>;

  cancelSelfTimeCorrection(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
  }): Promise<TimeCorrectionCancelResult>;

  decideAssignedTimeCorrection(input: {
    readonly approverEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly decision: TimeCorrectionDecisionInput;
  }): Promise<TimeCorrectionDecisionResult>;
}

interface ActiveEmployeeContext {
  readonly id: string;
  readonly agencyId: string | null;
  readonly departmentId: string | null;
  readonly roleKeys: readonly string[];
}

interface AttendanceDayContext {
  readonly dateKey: string;
  readonly workDate: Date;
  readonly isWorkingDay: boolean;
  readonly approvedOvertimeMinutes: number;
}

export interface CorrectionApproverPlanStep {
  readonly roleKey: "SUPERUSER" | "ADMIN";
  readonly scope: "SAME_AGENCY" | "GLOBAL";
}

const BANGKOK_TIMEZONE = "Asia/Bangkok";

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dbTime(value: Date | null): string | null {
  return value ? value.toISOString().slice(11, 16) : null;
}

function timeValue(clock: string): Date {
  return new Date(`1970-01-01T${clock}:00.000Z`);
}

function workDateValue(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function bangkokTimestamp(
  dateKey: string,
  clock: string,
): Date {
  return new Date(`${dateKey}T${clock}:00+07:00`);
}

function finiteDecimal(
  value: Prisma.Decimal,
  label: string,
): number {
  const result = value.toNumber();

  if (!Number.isFinite(result)) {
    throw new Error(`${label} is not finite`);
  }

  return result;
}

export function attendanceBusinessParts(
  value: Date,
): {
  readonly dateKey: string;
  readonly time: string;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGKOK_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const map = new Map(
    parts.map((part) => [part.type, part.value]),
  );
  const year = map.get("year");
  const month = map.get("month");
  const day = map.get("day");
  const hour = map.get("hour");
  const minute = map.get("minute");

  if (!year || !month || !day || !hour || !minute) {
    throw new Error(
      "Unable to derive Asia/Bangkok attendance time",
    );
  }

  return {
    dateKey: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}

export function formatAttendanceLocationText(input: {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyMeters: number;
}): string {
  return [
    input.latitude.toFixed(6),
    input.longitude.toFixed(6),
    `accuracy=${Math.round(input.accuracyMeters)}m`,
  ].join(",");
}

export function correctionApproverPlan(
  roleKeys: readonly string[],
): readonly CorrectionApproverPlanStep[] {
  const normalized = new Set(
    roleKeys.map((role) => role.trim().toUpperCase()),
  );

  if (normalized.has("EMPLOYEE")) {
    return [
      {
        roleKey: "SUPERUSER",
        scope: "SAME_AGENCY",
      },
      {
        roleKey: "ADMIN",
        scope: "SAME_AGENCY",
      },
    ];
  }

  if (normalized.has("SUPERUSER")) {
    return [
      {
        roleKey: "ADMIN",
        scope: "SAME_AGENCY",
      },
      {
        roleKey: "ADMIN",
        scope: "GLOBAL",
      },
    ];
  }

  throw new Error(
    "Time correction approver chain is unavailable for requester role",
  );
}

/**
 * Company-aware plan: approvers must be above the requester. A top-level
 * requester (SUPERADMIN) is approved by the other SUPERADMIN (peer).
 */
export function companyCorrectionApproverRoles(
  roleKeys: readonly string[],
): readonly string[] {
  const normalized = new Set(
    roleKeys.map((role) => role.trim().toUpperCase()),
  );

  if (normalized.has("SUPERADMIN")) {
    return ["SUPERADMIN"];
  }

  if (normalized.has("ADMIN")) {
    return ["SUPERADMIN"];
  }

  if (normalized.has("SUPERUSER")) {
    return ["ADMIN", "SUPERADMIN"];
  }

  return ["SUPERUSER", "ADMIN", "SUPERADMIN"];
}

export function assertCorrectionAttendanceDateMatch(
  requestDate: Date,
  recordDate: Date,
): void {
  if (dateOnly(requestDate) !== dateOnly(recordDate)) {
    throw new Error(
      "Time correction attendance date does not match target record",
    );
  }
}

export function assertSingleAttendanceBusinessDayRecord(
  count: number,
): void {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error("Attendance business-day count is invalid");
  }

  if (count > 1) {
    throw new Error(
      "Duplicate attendance business day requires review",
    );
  }

  if (count === 0) {
    throw new Error("Attendance record is unavailable");
  }
}

function contractRadius(
  value: "IN_RADIUS" | "OUTSIDE_RADIUS" | "UNKNOWN",
): AttendanceRadiusState {
  if (value === "IN_RADIUS") {
    return "INSIDE";
  }

  if (value === "OUTSIDE_RADIUS") {
    return "OUTSIDE";
  }

  return "UNKNOWN";
}

function storedRadius(
  value: "INSIDE" | "OUTSIDE",
): "IN_RADIUS" | "OUTSIDE_RADIUS" {
  return value === "INSIDE"
    ? "IN_RADIUS"
    : "OUTSIDE_RADIUS";
}

function isoWeekday(dateKey: string): number {
  const weekday = new Date(
    `${dateKey}T00:00:00.000Z`,
  ).getUTCDay();

  return weekday === 0 ? 7 : weekday;
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
        select: {
          state: true,
          roles: {
            select: {
              role: {
                select: { key: true },
              },
            },
          },
        },
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
    roleKeys: employee.userAccount.roles.map(
      (assignment) => assignment.role.key,
    ),
  };
}

async function attendancePolicyFor(
  prisma: Pick<
    Prisma.TransactionClient,
    "attendancePolicy"
  >,
  workDate: Date,
): Promise<{
  readonly id: string;
  readonly rule: AttendancePolicyRule;
}> {
  const policy = await prisma.attendancePolicy.findFirst({
    where: {
      active: true,
      effectiveFrom: { lte: workDate },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: workDate } },
      ],
    },
    select: {
      id: true,
      timezone: true,
      officeLatitude: true,
      officeLongitude: true,
      radiusKm: true,
      lateAfter: true,
      workEnd: true,
      breakStart: true,
      breakEnd: true,
    },
    orderBy: [
      { effectiveFrom: "desc" },
      { id: "asc" },
    ],
  });

  if (!policy) {
    throw new Error("Attendance policy is unavailable");
  }

  if (policy.timezone !== BANGKOK_TIMEZONE) {
    throw new Error(
      "Attendance policy timezone is not supported",
    );
  }

  return {
    id: policy.id,
    rule: {
      timezone: policy.timezone,
      officeLatitude: finiteDecimal(
        policy.officeLatitude,
        "Attendance office latitude",
      ),
      officeLongitude: finiteDecimal(
        policy.officeLongitude,
        "Attendance office longitude",
      ),
      radiusKm: finiteDecimal(
        policy.radiusKm,
        "Attendance radius",
      ),
      lateAfter: dbTime(policy.lateAfter) ?? "",
      workEnd: dbTime(policy.workEnd) ?? "",
      breakStart: dbTime(policy.breakStart),
      breakEnd: dbTime(policy.breakEnd),
    },
  };
}

async function approvedOvertimeSegments(
  prisma: Pick<
    Prisma.TransactionClient,
    "overtimeSegment"
  >,
  employeeId: string,
  workDate: Date,
): Promise<
  readonly {
    readonly startTime: Date;
    readonly endTime: Date;
    readonly requestedMinutes: number;
  }[]
> {
  return prisma.overtimeSegment.findMany({
    where: {
      workDate,
      request: {
        is: {
          employeeId,
          status: "APPROVED",
        },
      },
    },
    select: {
      startTime: true,
      endTime: true,
      requestedMinutes: true,
    },
    orderBy: [
      { startTime: "asc" },
      { id: "asc" },
    ],
  });
}

function clockMinutes(clock: string): number {
  const [hourText, minuteText] = clock.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error("Attendance clock is invalid");
  }

  return hour * 60 + minute;
}

export function calculateActualApprovedOvertimeMinutes(
  segments: readonly {
    readonly startTime: Date;
    readonly endTime: Date;
  }[],
  checkoutTime: string,
): number {
  const checkout = clockMinutes(checkoutTime);

  return segments.reduce((total, segment) => {
    const start = clockMinutes(dbTime(segment.startTime) ?? "");
    const end = clockMinutes(dbTime(segment.endTime) ?? "");

    if (end <= start) {
      throw new Error(
        "Approved overtime segment end must be after start",
      );
    }

    const actualEnd = Math.min(checkout, end);
    return total + Math.max(0, actualEnd - start);
  }, 0);
}

async function attendanceDayContext(
  prisma: Pick<
    Prisma.TransactionClient,
    "weeklyWorkRule" | "holiday" | "overtimeSegment"
  >,
  employeeId: string,
  dateKey: string,
): Promise<AttendanceDayContext> {
  const workDate = workDateValue(dateKey);
  const [rule, holiday, overtimeMinutes] =
    await Promise.all([
      prisma.weeklyWorkRule.findUnique({
        where: { isoWeekday: isoWeekday(dateKey) },
        select: { isWorking: true },
      }),
      prisma.holiday.findUnique({
        where: { holidayDate: workDate },
        select: { active: true },
      }),
      approvedOvertimeSegments(
        prisma,
        employeeId,
        workDate,
      ),
    ]);

  if (!rule) {
    throw new Error(
      "Weekly attendance work rule is unavailable",
    );
  }

  return {
    dateKey,
    workDate,
    isWorkingDay:
      rule.isWorking && holiday?.active !== true,
    approvedOvertimeMinutes: overtimeMinutes.reduce(
      (sum, segment) => sum + segment.requestedMinutes,
      0,
    ),
  };
}

async function resolveCorrectionApprover(
  prisma: Pick<Prisma.TransactionClient, "employee" | "agency">,
  requester: ActiveEmployeeContext,
): Promise<string> {
  if (!requester.agencyId) {
    throw new Error(
      "Time correction requester agency is required",
    );
  }

  // Company-aware routing (Owner organisation); legacy plan below otherwise.
  const routed = await resolveCompanyApprovalRoute(
    prisma,
    requester.id,
    companyCorrectionApproverRoles(requester.roleKeys).map(
      (roleKey) => ({
        kind: "ROLE" as const,
        roleKey,
        selection: "SYSTEM_PICKS_FIRST" as const,
        peerFallback: true,
      }),
    ),
    { defaultSelection: "SYSTEM_PICKS_FIRST" },
  );

  if (routed) {
    const first = routed.route.steps[0]?.selectedId;

    if (!first) {
      throw new Error(
        "No eligible time correction approver is available",
      );
    }

    return first;
  }

  for (const step of correctionApproverPlan(
    requester.roleKeys,
  )) {
    const candidate = await prisma.employee.findFirst({
      where: {
        id: { not: requester.id },
        ...(step.scope === "SAME_AGENCY"
          ? { agencyId: requester.agencyId }
          : {}),
        userAccount: {
          is: {
            state: "ACTIVE",
            roles: {
              some: {
                role: {
                  is: { key: step.roleKey },
                },
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

    if (candidate) {
      return candidate.id;
    }
  }

  throw new Error(
    "No eligible time correction approver is available",
  );
}

function correctionTypeFromStored(input: {
  readonly correctedCheckIn: Date | null;
  readonly correctedCheckOut: Date | null;
}): "CHECK_IN" | "CHECK_OUT" {
  if (input.correctedCheckIn && !input.correctedCheckOut) {
    return "CHECK_IN";
  }

  if (input.correctedCheckOut && !input.correctedCheckIn) {
    return "CHECK_OUT";
  }

  throw new Error(
    "Stored time correction does not target exactly one event",
  );
}

function correctionView(input: {
  readonly row: {
    id: string;
    attendanceRecordId: string | null;
    attendanceDate: Date;
    originalCheckIn: Date | null;
    originalCheckOut: Date | null;
    correctedCheckIn: Date | null;
    correctedCheckOut: Date | null;
    reason: string;
    status:
      | "PENDING"
      | "APPROVED"
      | "REJECTED"
      | "CANCELLED"
      | "REVISION_REQUESTED";
    decisionComment: string | null;
    requestedAt: Date;
    decidedAt: Date | null;
  };
  readonly canDecide: boolean;
  readonly employeeDisplayName?: string;
}): TimeCorrectionRequestView {
  const correctionType = correctionTypeFromStored(input.row);
  const original =
    correctionType === "CHECK_IN"
      ? input.row.originalCheckIn
      : input.row.originalCheckOut;
  const corrected =
    correctionType === "CHECK_IN"
      ? input.row.correctedCheckIn
      : input.row.correctedCheckOut;

  if (!original || !corrected) {
    throw new Error(
      "Stored time correction is missing original/corrected time",
    );
  }

  if (input.row.status === "REVISION_REQUESTED") {
    throw new Error(
      "Unsupported Time Correction persistence status",
    );
  }

  return {
    requestId: input.row.id,
    attendanceRecordId: input.row.attendanceRecordId,
    attendanceDate: dateOnly(input.row.attendanceDate),
    correctionType,
    originalTime: dbTime(original) ?? "",
    correctedTime: dbTime(corrected) ?? "",
    reason: input.row.reason,
    status: input.row.status,
    decisionComment: input.row.decisionComment,
    requestedAt: input.row.requestedAt.toISOString(),
    decidedAt: input.row.decidedAt?.toISOString() ?? null,
    canDecide: input.canDecide,
    ...(input.employeeDisplayName
      ? {
          employeeDisplayName:
            input.employeeDisplayName,
        }
      : {}),
  };
}

async function idempotencyReplay(
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
      "Idempotency record is incomplete and requires review",
    );
  }

  return existing.resultReferenceId;
}

export class PrismaAttendanceRepository
  implements AttendanceRepository
{
  constructor(
    private readonly prisma: PrismaClient,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async getSelfOverview(
    employeeId: string,
  ): Promise<AttendanceSelfOverview> {
    await activeEmployeeContext(this.prisma, employeeId);
    const now = this.clock();
    const today = attendanceBusinessParts(now).dateKey;
    const todayDate = workDateValue(today);

    const [records, todayRows, day] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: { employeeId },
        select: {
          id: true,
          workDate: true,
          checkInAt: true,
          checkOutAt: true,
          calculation: {
            select: {
              workMinutes: true,
              lateMinutes: true,
              earlyMinutes: true,
              overtimeMinutes: true,
              checkInRadius: true,
              checkOutRadius: true,
              policyVersion: true,
            },
          },
          corrections: {
            where: { status: "APPROVED" },
            select: {
              correctedCheckIn: true,
              correctedCheckOut: true,
            },
          },
        },
        orderBy: [
          { workDate: "desc" },
          { checkInAt: "desc" },
          { id: "desc" },
        ],
      }),
      this.prisma.attendanceRecord.findMany({
        where: {
          employeeId,
          workDate: todayDate,
        },
        select: {
          id: true,
          checkOutAt: true,
        },
        orderBy: [
          { checkInAt: "asc" },
          { id: "asc" },
        ],
      }),
      attendanceDayContext(
        this.prisma,
        employeeId,
        today,
      ),
    ]);

    const legacyRows =
      records.length === 0
        ? []
        : await this.prisma.legacyRecord.findMany({
            where: {
              targetEntityType:
                "attendance_record_bundle",
              targetEntityId: {
                in: records.map((record) => record.id),
              },
            },
            select: {
              targetEntityId: true,
            },
          });
    const legacyIds = new Set(
      legacyRows
        .map((row) => row.targetEntityId)
        .filter((value): value is string => Boolean(value)),
    );

    const canCheckIn =
      todayRows.length === 0 &&
      (day.isWorkingDay ||
        day.approvedOvertimeMinutes > 0);
    const canCheckOut =
      todayRows.length === 1 &&
      todayRows[0]?.checkOutAt === null;

    return {
      dayKind: day.isWorkingDay
        ? "WORKDAY"
        : "NON_WORKDAY",
      canCheckIn,
      canCheckOut,
      currentAttendanceRecordId:
        todayRows.length === 1
          ? todayRows[0]?.id ?? null
          : null,
      records: records.map((record) => {
        const correctedCheckIn =
          record.corrections.some(
            (correction) =>
              correction.correctedCheckIn !== null,
          );
        const correctedCheckOut =
          record.corrections.some(
            (correction) =>
              correction.correctedCheckOut !== null,
          );
        const legacy = legacyIds.has(record.id);

        return {
          attendanceRecordId: record.id,
          workDate: dateOnly(record.workDate),
          checkInAt: record.checkInAt.toISOString(),
          checkOutAt:
            record.checkOutAt?.toISOString() ?? null,
          checkInSource: correctedCheckIn
            ? "CORRECTION"
            : legacy
              ? "LEGACY"
              : "DEVICE",
          checkOutSource: record.checkOutAt
            ? correctedCheckOut
              ? "CORRECTION"
              : legacy
                ? "LEGACY"
                : "DEVICE"
            : null,
          workMinutes:
            record.calculation?.workMinutes ?? null,
          lateMinutes:
            record.calculation?.lateMinutes ?? null,
          earlyMinutes:
            record.calculation?.earlyMinutes ?? null,
          overtimeMinutes:
            record.calculation?.overtimeMinutes ?? null,
          checkInRadius: contractRadius(
            record.calculation?.checkInRadius ??
              "UNKNOWN",
          ),
          checkOutRadius: contractRadius(
            record.calculation?.checkOutRadius ??
              "UNKNOWN",
          ),
          policyVersion:
            record.calculation?.policyVersion ?? null,
        };
      }),
    };
  }

  async checkIn(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly request: AttendanceCheckInInput;
    readonly canonicalPayload: string;
  }): Promise<AttendanceWriteResult> {
    const claim = createIdempotencyClaim({
      actorEmployeeId: input.employeeId,
      operationKind: "ATTENDANCE_CHECK_IN",
      clientKey: input.request.clientKey,
      canonicalPayload: input.canonicalPayload,
    });
    const replay = await idempotencyReplay(
      this.prisma,
      claim,
    );

    if (replay) {
      return {
        attendanceRecordId: replay,
        replayed: true,
      };
    }

    const eventAt = this.clock();
    const business = attendanceBusinessParts(eventAt);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.idempotencyKey.create({ data: claim });
          await activeEmployeeContext(tx, input.employeeId);

          const day = await attendanceDayContext(
            tx,
            input.employeeId,
            business.dateKey,
          );
          assertAttendanceDayAllowed({
            isWorkingDay: day.isWorkingDay,
            hasApprovedOvertime:
              day.approvedOvertimeMinutes > 0,
          });

          const existing =
            await tx.attendanceRecord.findMany({
              where: {
                employeeId: input.employeeId,
                workDate: day.workDate,
              },
              select: { id: true },
            });

          if (existing.length > 0) {
            throw new Error(
              "Attendance already exists for this business day",
            );
          }

          const policy = await attendancePolicyFor(
            tx,
            day.workDate,
          );
          const radius = classifyAttendanceRadius({
            location: input.request,
            policy: policy.rule,
          });
          const timing = classifyAttendanceTiming({
            checkInTime: business.time,
            policy: policy.rule,
            hasApprovedOvertime:
              day.approvedOvertimeMinutes > 0,
          });

          const record = await tx.attendanceRecord.create({
            data: {
              employeeId: input.employeeId,
              workDate: day.workDate,
              checkInAt: eventAt,
              checkInLocationText:
                formatAttendanceLocationText(
                  input.request,
                ),
              calculation: {
                create: {
                  lateMinutes: timing.lateMinutes,
                  earlyMinutes: 0,
                  checkInRadius: storedRadius(radius),
                  checkOutRadius: "UNKNOWN",
                  policyVersion: policy.id,
                  calculatedAt: eventAt,
                },
              },
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
              data: { resultReferenceId: record.id },
            }),
            tx.auditLog.create({
              data: {
                actorEmployeeId: input.employeeId,
                action: "ATTENDANCE_CHECK_IN",
                entityType: "AttendanceRecord",
                entityId: record.id,
                correlationId: input.correlationId,
                metadata: {
                  workDate: business.dateKey,
                  radius,
                },
              },
            }),
            tx.notificationOutbox.create({
              data: {
                aggregateType: "ATTENDANCE_RECORD",
                aggregateId: record.id,
                eventType: "ATTENDANCE_CHECKED_IN",
                payload: {
                  attendanceRecordId: record.id,
                  employeeId: input.employeeId,
                },
              },
            }),
          ]);

          return {
            attendanceRecordId: record.id,
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
        const raced = await idempotencyReplay(
          this.prisma,
          claim,
        );

        if (raced) {
          return {
            attendanceRecordId: raced,
            replayed: true,
          };
        }
      }

      throw error;
    }
  }

  async checkOut(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly request: AttendanceCheckOutInput;
    readonly canonicalPayload: string;
  }): Promise<AttendanceWriteResult> {
    const claim = createIdempotencyClaim({
      actorEmployeeId: input.employeeId,
      operationKind: "ATTENDANCE_CHECK_OUT",
      clientKey: input.request.clientKey,
      canonicalPayload: input.canonicalPayload,
    });
    const replay = await idempotencyReplay(
      this.prisma,
      claim,
    );

    if (replay) {
      return {
        attendanceRecordId: replay,
        replayed: true,
      };
    }

    const eventAt = this.clock();
    const business = attendanceBusinessParts(eventAt);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.idempotencyKey.create({ data: claim });
          await activeEmployeeContext(tx, input.employeeId);

          const record =
            await tx.attendanceRecord.findUnique({
              where: { id: input.request.attendanceRecordId },
              select: {
                id: true,
                employeeId: true,
                workDate: true,
                checkInAt: true,
                checkOutAt: true,
              },
            });

          if (
            !record ||
            record.employeeId !== input.employeeId
          ) {
            throw new Error(
              "Attendance record is unavailable for this employee",
            );
          }

          if (record.checkOutAt) {
            throw new Error(
              "Attendance record is already checked out",
            );
          }

          const recordDate = dateOnly(record.workDate);

          if (recordDate !== business.dateKey) {
            throw new Error(
              "Checkout must target the current business day",
            );
          }

          const day = await attendanceDayContext(
            tx,
            input.employeeId,
            recordDate,
          );
          const policy = await attendancePolicyFor(
            tx,
            record.workDate,
          );
          const overtimeSegments =
            await approvedOvertimeSegments(
              tx,
              input.employeeId,
              record.workDate,
            );
          const actualOvertimeMinutes =
            calculateActualApprovedOvertimeMinutes(
              overtimeSegments,
              business.time,
            );
          const radius = classifyAttendanceRadius({
            location: input.request,
            policy: policy.rule,
          });
          const timing = classifyAttendanceTiming({
            checkInTime:
              attendanceBusinessParts(record.checkInAt).time,
            checkOutTime: business.time,
            policy: policy.rule,
            hasApprovedOvertime:
              overtimeSegments.length > 0,
          });
          const workMinutes =
            calculateAttendanceWorkMinutes({
              checkInTime:
                attendanceBusinessParts(record.checkInAt)
                  .time,
              checkOutTime: business.time,
              policy: policy.rule,
            });

          await tx.attendanceRecord.update({
            where: { id: record.id },
            data: {
              checkOutAt: eventAt,
              checkOutLocationText:
                formatAttendanceLocationText(
                  input.request,
                ),
              calculation: {
                upsert: {
                  create: {
                    workMinutes,
                    lateMinutes: timing.lateMinutes,
                    earlyMinutes: timing.earlyMinutes,
                    overtimeMinutes:
                      actualOvertimeMinutes,
                    checkInRadius: "UNKNOWN",
                    checkOutRadius: storedRadius(radius),
                    policyVersion: policy.id,
                    calculatedAt: eventAt,
                  },
                  update: {
                    workMinutes,
                    lateMinutes: timing.lateMinutes,
                    earlyMinutes: timing.earlyMinutes,
                    overtimeMinutes:
                      actualOvertimeMinutes,
                    checkOutRadius: storedRadius(radius),
                    policyVersion: policy.id,
                    calculatedAt: eventAt,
                  },
                },
              },
            },
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
              data: { resultReferenceId: record.id },
            }),
            tx.auditLog.create({
              data: {
                actorEmployeeId: input.employeeId,
                action: "ATTENDANCE_CHECK_OUT",
                entityType: "AttendanceRecord",
                entityId: record.id,
                correlationId: input.correlationId,
                metadata: {
                  workDate: recordDate,
                  workMinutes,
                  approvedOvertimeMinutes:
                    day.approvedOvertimeMinutes,
                  actualOvertimeMinutes,
                  radius,
                },
              },
            }),
            tx.notificationOutbox.create({
              data: {
                aggregateType: "ATTENDANCE_RECORD",
                aggregateId: record.id,
                eventType: "ATTENDANCE_CHECKED_OUT",
                payload: {
                  attendanceRecordId: record.id,
                  employeeId: input.employeeId,
                },
              },
            }),
          ]);

          return {
            attendanceRecordId: record.id,
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
        const raced = await idempotencyReplay(
          this.prisma,
          claim,
        );

        if (raced) {
          return {
            attendanceRecordId: raced,
            replayed: true,
          };
        }
      }

      throw error;
    }
  }

  async getSelfTimeCorrections(
    employeeId: string,
  ): Promise<readonly TimeCorrectionRequestView[]> {
    await activeEmployeeContext(this.prisma, employeeId);

    const rows =
      await this.prisma.timeCorrectionRequest.findMany({
        where: { employeeId },
        select: {
          id: true,
          attendanceRecordId: true,
          attendanceDate: true,
          originalCheckIn: true,
          originalCheckOut: true,
          correctedCheckIn: true,
          correctedCheckOut: true,
          reason: true,
          status: true,
          decisionComment: true,
          requestedAt: true,
          decidedAt: true,
        },
        orderBy: [
          { requestedAt: "desc" },
          { id: "desc" },
        ],
      });

    return rows.map((row) =>
      correctionView({
        row,
        canDecide: false,
      }),
    );
  }

  async getAssignedTimeCorrections(
    approverEmployeeId: string,
  ): Promise<readonly TimeCorrectionRequestView[]> {
    await activeEmployeeContext(
      this.prisma,
      approverEmployeeId,
    );

    const rows =
      await this.prisma.timeCorrectionRequest.findMany({
        where: {
          status: "PENDING",
          approvalInstance: {
            is: {
              steps: {
                some: {
                  approverEmployeeId,
                  status: "PENDING",
                },
              },
            },
          },
        },
        select: {
          id: true,
          attendanceRecordId: true,
          attendanceDate: true,
          originalCheckIn: true,
          originalCheckOut: true,
          correctedCheckIn: true,
          correctedCheckOut: true,
          reason: true,
          status: true,
          decisionComment: true,
          requestedAt: true,
          decidedAt: true,
          employee: {
            select: { fullName: true },
          },
        },
        orderBy: [
          { requestedAt: "asc" },
          { id: "asc" },
        ],
      });

    return rows.map((row) =>
      correctionView({
        row,
        canDecide: true,
        employeeDisplayName: row.employee.fullName,
      }),
    );
  }

  async createSelfTimeCorrection(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly request: TimeCorrectionCreateInput;
    readonly canonicalPayload: string;
  }): Promise<TimeCorrectionCreateResult> {
    const normalized = normalizeTimeCorrection(
      input.request,
    );
    const claim = createIdempotencyClaim({
      actorEmployeeId: input.employeeId,
      operationKind: "TIME_CORRECTION_CREATE",
      clientKey: normalized.clientKey,
      canonicalPayload: input.canonicalPayload,
    });
    const replay = await idempotencyReplay(
      this.prisma,
      claim,
    );

    if (replay) {
      return {
        requestId: replay,
        replayed: true,
      };
    }

    const now = this.clock();
    const today = attendanceBusinessParts(now).dateKey;

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.idempotencyKey.create({ data: claim });
          const requester =
            await activeEmployeeContext(
              tx,
              input.employeeId,
            );

          const record =
            await tx.attendanceRecord.findUnique({
              where: {
                id: normalized.attendanceRecordId,
              },
              select: {
                id: true,
                employeeId: true,
                workDate: true,
                checkInAt: true,
                checkOutAt: true,
              },
            });

          if (
            !record ||
            record.employeeId !== input.employeeId
          ) {
            throw new Error(
              "Attendance record is unavailable for this employee",
            );
          }

          const attendanceDate = dateOnly(record.workDate);
          assertAttendanceDateNotFuture({
            attendanceDate,
            today,
          });
          const originalCheckIn =
            attendanceBusinessParts(record.checkInAt).time;
          const originalCheckOut = record.checkOutAt
            ? attendanceBusinessParts(record.checkOutAt).time
            : null;
          assertTimeCorrectionOriginalExists({
            correctionType: normalized.correctionType,
            originalCheckIn,
            originalCheckOut,
          });
          const originalTime =
            normalized.correctionType === "CHECK_IN"
              ? originalCheckIn
              : originalCheckOut ?? "";
          assertTimeCorrectionChanged({
            originalTime,
            correctedTime: normalized.correctedTime,
          });

          const active =
            await tx.timeCorrectionRequest.findMany({
              where: {
                employeeId: input.employeeId,
                attendanceDate: record.workDate,
                status: { in: ["PENDING", "APPROVED"] },
                ...(normalized.correctionType === "CHECK_IN"
                  ? {
                      correctedCheckIn: { not: null },
                    }
                  : {
                      correctedCheckOut: { not: null },
                    }),
              },
              select: { status: true },
            });
          assertNoActiveTimeCorrection(
            active.map((row) => row.status),
          );

          const approverEmployeeId =
            await resolveCorrectionApprover(
              tx,
              requester,
            );
          const approvalInstance =
            await tx.approvalInstance.create({
              data: {
                requestKind: "TIME_CORRECTION",
                requesterEmployeeId: input.employeeId,
                status: "PENDING",
                currentStepOrder: 1,
                steps: {
                  create: {
                    stepOrder: 1,
                    approverEmployeeId,
                    status: "PENDING",
                    assignedAt: now,
                  },
                },
              },
              select: { id: true },
            });
          const request =
            await tx.timeCorrectionRequest.create({
              data: {
                employeeId: input.employeeId,
                attendanceRecordId: record.id,
                approvalInstanceId: approvalInstance.id,
                attendanceDate: record.workDate,
                originalCheckIn: timeValue(
                  originalCheckIn,
                ),
                originalCheckOut: originalCheckOut
                  ? timeValue(originalCheckOut)
                  : null,
                correctedCheckIn:
                  normalized.correctionType === "CHECK_IN"
                    ? timeValue(normalized.correctedTime)
                    : null,
                correctedCheckOut:
                  normalized.correctionType === "CHECK_OUT"
                    ? timeValue(normalized.correctedTime)
                    : null,
                reason: normalized.reason,
                status: "PENDING",
                requestedAt: now,
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
                resultReferenceId: request.id,
              },
            }),
            tx.auditLog.create({
              data: {
                actorEmployeeId: input.employeeId,
                action: "TIME_CORRECTION_CREATE",
                entityType: "TimeCorrectionRequest",
                entityId: request.id,
                correlationId: input.correlationId,
                metadata: {
                  attendanceRecordId: record.id,
                  correctionType:
                    normalized.correctionType,
                  approverEmployeeId,
                },
              },
            }),
            tx.notificationOutbox.create({
              data: {
                aggregateType: "TIME_CORRECTION",
                aggregateId: request.id,
                eventType: "TIME_CORRECTION_CREATED",
                payload: {
                  requestId: request.id,
                  requesterEmployeeId: input.employeeId,
                  approverEmployeeId,
                },
              },
            }),
          ]);

          return {
            requestId: request.id,
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
        const raced = await idempotencyReplay(
          this.prisma,
          claim,
        );

        if (raced) {
          return {
            requestId: raced,
            replayed: true,
          };
        }
      }

      throw error;
    }
  }

  async cancelSelfTimeCorrection(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
  }): Promise<TimeCorrectionCancelResult> {
    return this.prisma.$transaction(
      async (tx) => {
        await activeEmployeeContext(tx, input.employeeId);
        const request =
          await tx.timeCorrectionRequest.findUnique({
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
            "Time correction request is unavailable for this employee",
          );
        }

        if (request.status === "CANCELLED") {
          return {
            requestId: request.id,
            status: "CANCELLED" as const,
          };
        }

        if (request.status !== "PENDING") {
          throw new Error(
            "Only pending time correction requests can be cancelled",
          );
        }

        await tx.timeCorrectionRequest.update({
          where: { id: request.id },
          data: {
            status: "CANCELLED",
            decidedAt: this.clock(),
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
                decidedAt: this.clock(),
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
                decidedAt: this.clock(),
              },
            }),
          ]);
        }

        await Promise.all([
          tx.auditLog.create({
            data: {
              actorEmployeeId: input.employeeId,
              action: "TIME_CORRECTION_CANCEL",
              entityType: "TimeCorrectionRequest",
              entityId: request.id,
              correlationId: input.correlationId,
            },
          }),
          tx.notificationOutbox.create({
            data: {
              aggregateType: "TIME_CORRECTION",
              aggregateId: request.id,
              eventType: "TIME_CORRECTION_CANCELLED",
              payload: { requestId: request.id },
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

  async decideAssignedTimeCorrection(input: {
    readonly approverEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly decision: TimeCorrectionDecisionInput;
  }): Promise<TimeCorrectionDecisionResult> {
    const normalized = normalizeTimeCorrectionDecision(
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
          await tx.timeCorrectionRequest.findUnique({
            where: { id: input.requestId },
            select: {
              id: true,
              employeeId: true,
              attendanceRecordId: true,
              attendanceDate: true,
              correctedCheckIn: true,
              correctedCheckOut: true,
              status: true,
              approvalInstanceId: true,
              attendanceRecord: {
                select: {
                  id: true,
                  employeeId: true,
                  workDate: true,
                  checkInAt: true,
                  checkOutAt: true,
                  calculation: {
                    select: {
                      overtimeMinutes: true,
                    },
                  },
                },
              },
              approvalInstance: {
                select: {
                  id: true,
                  steps: {
                    select: {
                      id: true,
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
            "Time correction approval state is unavailable",
          );
        }

        const step =
          request.approvalInstance.steps.find(
            (candidate) =>
              candidate.approverEmployeeId ===
              input.approverEmployeeId,
          );

        if (!step) {
          throw new Error(
            "Time correction is not assigned to this approver",
          );
        }

        if (
          request.status === normalized.decision &&
          step.status === normalized.decision
        ) {
          return {
            requestId: request.id,
            status: normalized.decision,
          };
        }

        if (
          request.status !== "PENDING" ||
          step.status !== "PENDING"
        ) {
          throw new Error(
            "Time correction request has already been decided",
          );
        }

        if (normalized.decision === "APPROVED") {
          if (
            !request.attendanceRecord ||
            !request.attendanceRecordId ||
            request.attendanceRecord.employeeId !==
              request.employeeId
          ) {
            throw new Error(
              "Time correction attendance record is unavailable",
            );
          }

          assertCorrectionAttendanceDateMatch(
            request.attendanceDate,
            request.attendanceRecord.workDate,
          );

          const businessDayCount =
            await tx.attendanceRecord.count({
              where: {
                employeeId: request.employeeId,
                workDate: request.attendanceDate,
              },
            });
          assertSingleAttendanceBusinessDayRecord(
            businessDayCount,
          );

          const record = request.attendanceRecord;
          const workDateKey = dateOnly(record.workDate);
          const policy = await attendancePolicyFor(
            tx,
            record.workDate,
          );
          const overtimeSegments =
            await approvedOvertimeSegments(
              tx,
              request.employeeId,
              record.workDate,
            );
          const preservedOvertimeMinutes =
            record.calculation?.overtimeMinutes ?? null;
          const correctedCheckIn = dbTime(
            request.correctedCheckIn,
          );
          const correctedCheckOut = dbTime(
            request.correctedCheckOut,
          );
          const finalCheckIn = correctedCheckIn
            ? bangkokTimestamp(
                workDateKey,
                correctedCheckIn,
              )
            : record.checkInAt;
          const finalCheckOut = correctedCheckOut
            ? bangkokTimestamp(
                workDateKey,
                correctedCheckOut,
              )
            : record.checkOutAt;

          if (!finalCheckOut) {
            throw new Error(
              "Approved time correction requires checkout to remain available",
            );
          }

          const finalCheckInTime =
            attendanceBusinessParts(finalCheckIn).time;
          const finalCheckOutTime =
            attendanceBusinessParts(finalCheckOut).time;
          const workMinutes =
            calculateCorrectedWorkMinutes({
              checkInTime: finalCheckInTime,
              checkOutTime: finalCheckOutTime,
              policy: policy.rule,
            });
          const timing = classifyAttendanceTiming({
            checkInTime: finalCheckInTime,
            checkOutTime: finalCheckOutTime,
            policy: policy.rule,
            hasApprovedOvertime:
              overtimeSegments.length > 0,
          });

          await tx.attendanceRecord.update({
            where: { id: record.id },
            data: {
              checkInAt: finalCheckIn,
              checkOutAt: finalCheckOut,
              calculation: {
                upsert: {
                  create: {
                    workMinutes,
                    lateMinutes: timing.lateMinutes,
                    earlyMinutes: timing.earlyMinutes,
                    overtimeMinutes:
                      preservedOvertimeMinutes,
                    checkInRadius: "UNKNOWN",
                    checkOutRadius: "UNKNOWN",
                    policyVersion: policy.id,
                    calculatedAt: decidedAt,
                  },
                  update: {
                    workMinutes,
                    lateMinutes: timing.lateMinutes,
                    earlyMinutes: timing.earlyMinutes,
                    overtimeMinutes:
                      preservedOvertimeMinutes,
                    policyVersion: policy.id,
                    calculatedAt: decidedAt,
                  },
                },
              },
            },
          });
        }

        await Promise.all([
          tx.timeCorrectionRequest.update({
            where: { id: request.id },
            data: {
              status: normalized.decision,
              decisionComment:
                normalized.comment || null,
              decidedAt,
            },
          }),
          tx.approvalStep.update({
            where: { id: step.id },
            data: {
              status: normalized.decision,
              comment: normalized.comment || null,
              decidedAt,
            },
          }),
          tx.approvalInstance.update({
            where: {
              id: request.approvalInstance.id,
            },
            data: {
              status: normalized.decision,
              currentStepOrder: null,
              decidedAt,
            },
          }),
          tx.auditLog.create({
            data: {
              actorEmployeeId:
                input.approverEmployeeId,
              action:
                normalized.decision === "APPROVED"
                  ? "TIME_CORRECTION_APPROVE"
                  : "TIME_CORRECTION_REJECT",
              entityType: "TimeCorrectionRequest",
              entityId: request.id,
              correlationId: input.correlationId,
              metadata: {
                requesterEmployeeId:
                  request.employeeId,
                attendanceRecordId:
                  request.attendanceRecordId,
              },
            },
          }),
          tx.notificationOutbox.create({
            data: {
              aggregateType: "TIME_CORRECTION",
              aggregateId: request.id,
              eventType:
                normalized.decision === "APPROVED"
                  ? "TIME_CORRECTION_APPROVED"
                  : "TIME_CORRECTION_REJECTED",
              payload: {
                requestId: request.id,
                requesterEmployeeId:
                  request.employeeId,
              },
            },
          }),
        ]);

        return {
          requestId: request.id,
          status: normalized.decision,
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }
}
