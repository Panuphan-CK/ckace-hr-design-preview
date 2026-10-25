import {
  DEFAULT_MEAL_ALLOWANCE_RULE,
  calculateOvertimeAllowances,
  calculateOvertimeRequestedMinutes,
  sumAllowanceSatang,
  transportAllowanceRule,
  type OvertimeAllowanceRule,
  type OvertimeBreakCode,
} from "@ckace/business-rules";
import type { OvertimeReportRow } from "@ckace/contracts";
import type { PrismaClient, RequestStatus } from "@prisma/client";

export interface OvertimeReportFilters {
  readonly from: Date;
  readonly to: Date;
  readonly companyId?: string | null;
  readonly agencyId?: string | null;
  readonly employeeId?: string | null;
  readonly status?: RequestStatus | null;
}

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const MAX_ROWS = 20000;

function clock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function clockOf(value: Date): { minutes: number; text: string } {
  const minutes = value.getUTCHours() * 60 + value.getUTCMinutes();

  return { minutes, text: clock(minutes) };
}

/** Minutes after Bangkok midnight of `workDate` for a real timestamp. */
function minutesSinceBangkokMidnight(workDate: Date, at: Date): number {
  const midnightUtc = workDate.getTime() - BANGKOK_OFFSET_MS;

  return Math.floor((at.getTime() - midnightUtc) / 60000);
}

function isBreakCodes(value: unknown): value is OvertimeBreakCode[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

const BANGKOK_DAY_OFFSET_MS = 7 * 60 * 60 * 1000;

function bangkokToday(now: Date = new Date()): string {
  return new Date(now.getTime() + BANGKOK_DAY_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * One row per approved/pending overtime day with attendance and fixed
 * allowances (meal and per-person transport). Allowances are only computed for
 * APPROVED requests with a real check-out; they are snapshots of the rule values
 * in force when the report is produced.
 */
export async function loadOvertimeReportRows(
  prisma: PrismaClient,
  filters: OvertimeReportFilters,
): Promise<readonly OvertimeReportRow[]> {
  const todayBangkok = bangkokToday();
  const [policies, weeklyRules, holidays] = await Promise.all([
    prisma.overtimeAllowancePolicy.findMany(),
    prisma.weeklyWorkRule.findMany({ select: { isoWeekday: true, isWorking: true } }),
    prisma.holiday.findMany({
      where: { active: true, holidayDate: { gte: filters.from, lte: filters.to } },
      select: { holidayDate: true },
    }),
  ]);
  const meal = policies.find((row) => row.kind === "MEAL");
  const transport = policies.find((row) => row.kind === "TRANSPORT");
  const mealRule: OvertimeAllowanceRule = meal
    ? {
        kind: "MEAL",
        paidWhenEndsAtOrAfter: meal.paidWhenEndsAtOrAfter,
        amountSatang: meal.active ? meal.amountSatang : 0,
      }
    : DEFAULT_MEAL_ALLOWANCE_RULE;
  const workingWeekdays = new Set(
    weeklyRules.filter((rule) => rule.isWorking).map((rule) => rule.isoWeekday),
  );
  const holidayDates = new Set(
    holidays.map((row) => row.holidayDate.toISOString().slice(0, 10)),
  );

  const segments = await prisma.overtimeSegment.findMany({
    where: {
      workDate: { gte: filters.from, lte: filters.to },
      request: {
        is: {
          ...(filters.status ? { status: filters.status } : {}),
          employee: {
            ...(filters.employeeId ? { id: filters.employeeId } : {}),
            ...(filters.agencyId ? { agencyId: filters.agencyId } : {}),
            ...(filters.companyId
              ? {
                  OR: [
                    { companyId: filters.companyId },
                    { companyId: null, agency: { is: { companyId: filters.companyId } } },
                  ],
                }
              : {}),
          },
        },
      },
    },
    select: {
      id: true,
      workDate: true,
      startTime: true,
      endTime: true,
      requestedMinutes: true,
      breakCodes: true,
      confirmedAt: true,
      request: {
        select: {
          id: true,
          status: true,
          employee: {
            select: {
              id: true,
              fullName: true,
              overtimeTransportSatang: true,
              agency: { select: { name: true, company: { select: { name: true } } } },
              company: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ workDate: "asc" }, { id: "asc" }],
    take: MAX_ROWS + 1,
  });

  if (segments.length > MAX_ROWS) {
    throw new Error("Overtime report is too large; narrow the filters");
  }

  const employeeIds = [...new Set(segments.map((row) => row.request.employee.id))];
  const attendance = employeeIds.length
    ? await prisma.attendanceRecord.findMany({
        where: {
          employeeId: { in: employeeIds },
          workDate: { gte: filters.from, lte: filters.to },
        },
        select: { employeeId: true, workDate: true, checkInAt: true, checkOutAt: true },
        orderBy: { checkInAt: "asc" },
      })
    : [];
  const attendanceByDay = new Map<string, (typeof attendance)[number]>();
  for (const record of attendance) {
    const key = `${record.employeeId}|${record.workDate.toISOString().slice(0, 10)}`;
    const current = attendanceByDay.get(key);
    // Keep the record with a check-out when a day has duplicates.
    if (!current || (!current.checkOutAt && record.checkOutAt)) {
      attendanceByDay.set(key, record);
    }
  }

  return segments.map((segment): OvertimeReportRow => {
    const employee = segment.request.employee;
    const date = segment.workDate.toISOString().slice(0, 10);
    const start = clockOf(segment.startTime);
    const end = clockOf(segment.endTime);
    const record = attendanceByDay.get(`${employee.id}|${date}`);
    const isoWeekday = ((segment.workDate.getUTCDay() + 6) % 7) + 1;
    const isWorkday = workingWeekdays.has(isoWeekday) && !holidayDates.has(date);
    const breaks = isBreakCodes(segment.breakCodes) ? segment.breakCodes : undefined;

    let actualEnd: string | null = null;
    let paidMinutes = 0;
    let attendanceCheck: OvertimeReportRow["attendanceCheck"] = "PENDING";

    // Forgotten punches are paid to the approved time once the day is over and
    // flagged; the employee can still file a time correction to set the real time.
    const dayOver = date < todayBangkok;
    const realOut = record?.checkOutAt
      ? Math.max(0, minutesSinceBangkokMidnight(segment.workDate, record.checkOutAt))
      : null;

    if (realOut !== null) {
      attendanceCheck = realOut < end.minutes ? "LEFT_EARLY" : "COMPLETE";
    } else if (dayOver) {
      attendanceCheck = record ? "NO_CHECK_OUT" : "NO_RECORD";
    }

    if (realOut !== null || dayOver) {
      const out = realOut === null ? end.minutes : Math.min(end.minutes, realOut);
      actualEnd = clock(out);
      if (out > start.minutes) {
        try {
          paidMinutes = calculateOvertimeRequestedMinutes(start.text, actualEnd, isWorkday, breaks);
        } catch {
          paidMinutes = 0;
        }
      }
    }

    const approved = segment.request.status === "APPROVED";
    const lines = approved
      ? calculateOvertimeAllowances({
          actualEndTime: actualEnd,
          payableMinutes: paidMinutes,
          rules: [
            mealRule,
            transportAllowanceRule(
              employee.overtimeTransportSatang,
              transport?.paidWhenEndsAtOrAfter,
            ),
          ],
        })
      : [];
    const amountOf = (kind: "MEAL" | "TRANSPORT") =>
      lines.find((line) => line.kind === kind)?.amountSatang ?? 0;
    const company = employee.company?.name ?? employee.agency?.company?.name ?? "";

    return {
      segmentId: segment.id,
      confirmed: segment.confirmedAt !== null,
      requestId: segment.request.id,
      workDate: date,
      employeeId: employee.id,
      employeeName: employee.fullName,
      teamName: employee.agency?.name ?? "",
      companyName: company,
      approvedStart: start.text,
      approvedEnd: end.text,
      actualCheckIn: record ? clockOf(new Date(record.checkInAt.getTime() + BANGKOK_OFFSET_MS)).text : null,
      actualCheckOut: record?.checkOutAt
        ? clockOf(new Date(record.checkOutAt.getTime() + BANGKOK_OFFSET_MS)).text
        : null,
      attendanceCheck,
      requestedMinutes: segment.requestedMinutes,
      paidMinutes: approved ? paidMinutes : 0,
      breaks: breaks ?? null,
      dayType: isWorkday ? "WORKDAY" : "NON_WORKDAY",
      status: segment.request.status,
      transportSatang: amountOf("TRANSPORT"),
      mealSatang: amountOf("MEAL"),
      totalSatang: sumAllowanceSatang(lines),
    };
  });
}

export async function recordOvertimeReportExport(
  prisma: PrismaClient,
  input: {
    readonly actorEmployeeId: string;
    readonly filters: OvertimeReportFilters;
    readonly rowCount: number;
  },
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorEmployeeId: input.actorEmployeeId,
      action: "OVERTIME_REPORT_EXPORTED",
      entityType: "OvertimeReport",
      entityId: input.actorEmployeeId,
      metadata: {
        from: input.filters.from.toISOString().slice(0, 10),
        to: input.filters.to.toISOString().slice(0, 10),
        companyId: input.filters.companyId ?? null,
        agencyId: input.filters.agencyId ?? null,
        employeeId: input.filters.employeeId ?? null,
        status: input.filters.status ?? null,
        rowCount: input.rowCount,
      },
    },
  });
}

/** Marks flagged segments as checked by an admin; returns how many were newly confirmed. */
export async function confirmOvertimeSegments(
  prisma: PrismaClient,
  input: { readonly segmentIds: readonly string[]; readonly actorEmployeeId: string },
): Promise<number> {
  const now = new Date();
  const result = await prisma.overtimeSegment.updateMany({
    where: { id: { in: [...input.segmentIds] }, confirmedAt: null },
    data: { confirmedAt: now, confirmedById: input.actorEmployeeId },
  });
  if (result.count > 0) {
    await prisma.auditLog.create({
      data: {
        actorEmployeeId: input.actorEmployeeId,
        action: "OVERTIME_SEGMENTS_CONFIRMED",
        entityType: "OvertimeSegment",
        entityId: input.actorEmployeeId,
        metadata: { segmentIds: [...input.segmentIds], count: result.count },
      },
    });
  }
  return result.count;
}
