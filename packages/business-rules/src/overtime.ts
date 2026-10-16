export interface OvertimeCalendarDay {
  readonly date: string;
  readonly isWorkday: boolean;
}

export interface ExistingOvertimeWindow {
  readonly workDate: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly status: string;
}

/**
 * Optional unpaid breaks an employee may take inside an overtime window.
 * Company default (Owner, 2026-10-15): work 09:00-17:30 Mon-Fri, lunch 12:00-13:00,
 * activity break 13:00-14:00; overtime breaks are optional and chosen per request.
 */
export type OvertimeBreakCode =
  | "LUNCH"
  | "ACTIVITY"
  | "DINNER"
  | "DINNER_SHORT";

export const OVERTIME_BREAK_CODES: readonly OvertimeBreakCode[] =
  ["LUNCH", "ACTIVITY", "DINNER", "DINNER_SHORT"];

interface OvertimeBreakWindow {
  readonly start: number;
  readonly end: number;
  /** Most minutes that can be deducted for this break. */
  readonly maxMinutes: number;
}

const OVERTIME_BREAK_WINDOWS: Readonly<
  Record<OvertimeBreakCode, OvertimeBreakWindow>
> = {
  LUNCH: { start: 12 * 60, end: 13 * 60, maxMinutes: 60 },
  ACTIVITY: { start: 13 * 60, end: 14 * 60, maxMinutes: 60 },
  DINNER: { start: 17 * 60 + 30, end: 18 * 60 + 30, maxMinutes: 60 },
  DINNER_SHORT: {
    start: 17 * 60 + 30,
    end: 18 * 60 + 30,
    maxMinutes: 30,
  },
};

export interface NormalizedOvertimeCreate {
  readonly startDate: string;
  readonly endDate: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly reason: string;
  readonly clientKey: string;
  /**
   * Breaks the employee takes during the overtime. When omitted the legacy
   * default applies (lunch always, evening break on non-workdays).
   */
  readonly breaks?: readonly OvertimeBreakCode[];
}

export interface OvertimeDayRequest {
  readonly workDate: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly requestedMinutes: number;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const CLOCK = /^(\d{1,2})[:.](\d{2})$/;

export function normalizeOvertimeIsoDate(
  value: string,
): string {
  const normalized = value.trim();
  const match = ISO_DATE.exec(normalized);

  if (!match) {
    throw new Error("overtime date must use YYYY-MM-DD");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error("overtime date is invalid");
  }

  return normalized;
}

export function normalizeOvertimeClock(
  value: string,
): string {
  const match = CLOCK.exec(value.trim());

  if (!match) {
    throw new Error("overtime time must use HH:mm");
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error("overtime time is invalid");
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(
    2,
    "0",
  )}`;
}

function clockMinutes(value: string): number {
  const [hour, minute] = normalizeOvertimeClock(value)
    .split(":")
    .map(Number);

  return (hour ?? 0) * 60 + (minute ?? 0);
}

export function normalizeOvertimeReason(
  value: string,
): string {
  const normalized = value.trim();

  if (!normalized || normalized.length > 1000) {
    throw new Error(
      "overtime reason must be 1 to 1000 characters",
    );
  }

  return normalized;
}

export function normalizeOvertimeClientKey(
  value: string,
): string {
  const normalized = value.trim();

  if (
    normalized.length < 8 ||
    normalized.length > 120 ||
    !/^[A-Za-z0-9._:-]+$/.test(normalized)
  ) {
    throw new Error("overtime clientKey is invalid");
  }

  return normalized;
}

export function normalizeOvertimeCreate(
  input: NormalizedOvertimeCreate,
): NormalizedOvertimeCreate {
  const startDate = normalizeOvertimeIsoDate(input.startDate);
  const endDate = normalizeOvertimeIsoDate(input.endDate);
  const startTime = normalizeOvertimeClock(input.startTime);
  const endTime = normalizeOvertimeClock(input.endTime);

  if (endDate < startDate) {
    throw new Error(
      "overtime endDate must not precede startDate",
    );
  }

  if (clockMinutes(endTime) <= clockMinutes(startTime)) {
    throw new Error(
      "overtime end time must be after start time",
    );
  }

  const normalized = {
    startDate,
    endDate,
    startTime,
    endTime,
    reason: normalizeOvertimeReason(input.reason),
    clientKey: normalizeOvertimeClientKey(input.clientKey),
  };

  return input.breaks === undefined
    ? normalized
    : { ...normalized, breaks: normalizeOvertimeBreaks(input.breaks) };
}

export function normalizeOvertimeBreaks(
  value: readonly string[],
): readonly OvertimeBreakCode[] {
  if (!Array.isArray(value)) {
    throw new Error("overtime breaks must be a list");
  }

  const known = new Set<string>(OVERTIME_BREAK_CODES);
  const unique = new Set<OvertimeBreakCode>();

  for (const item of value) {
    if (typeof item !== "string" || !known.has(item)) {
      throw new Error("overtime break is not supported");
    }
    unique.add(item as OvertimeBreakCode);
  }

  // A full evening break already covers the short one.
  if (unique.has("DINNER")) {
    unique.delete("DINNER_SHORT");
  }

  return OVERTIME_BREAK_CODES.filter((code) => unique.has(code));
}

/** Legacy behaviour: lunch is always taken out; evening break only off workdays. */
export function defaultOvertimeBreaks(
  isWorkday: boolean,
): readonly OvertimeBreakCode[] {
  return isWorkday ? ["LUNCH"] : ["LUNCH", "DINNER"];
}

export function assertOvertimeDateRangeNotFuture(input: {
  readonly startDate: string;
  readonly endDate: string;
  readonly today: string;
}): void {
  const startDate = normalizeOvertimeIsoDate(input.startDate);
  const endDate = normalizeOvertimeIsoDate(input.endDate);
  const today = normalizeOvertimeIsoDate(input.today);

  if (startDate > today || endDate > today) {
    throw new Error(
      "overtime request cannot target a future date",
    );
  }
}

function overlap(
  start: number,
  end: number,
  breakStart: number,
  breakEnd: number,
): number {
  return Math.max(
    0,
    Math.min(end, breakEnd) - Math.max(start, breakStart),
  );
}

export function calculateOvertimeRequestedMinutes(
  startTime: string,
  endTime: string,
  isWorkday: boolean,
  breaks?: readonly OvertimeBreakCode[],
): number {
  const start = clockMinutes(startTime);
  const end = clockMinutes(endTime);

  if (end <= start) {
    throw new Error(
      "overtime end time must be after start time",
    );
  }

  const chosen =
    breaks === undefined
      ? defaultOvertimeBreaks(isWorkday)
      : normalizeOvertimeBreaks(breaks);

  let minutes = end - start;

  for (const code of chosen) {
    const window = OVERTIME_BREAK_WINDOWS[code];
    minutes -= Math.min(
      window.maxMinutes,
      overlap(start, end, window.start, window.end),
    );
  }

  if (minutes <= 0) {
    throw new Error(
      "overtime request contains no payable minutes",
    );
  }

  return minutes;
}

export function overtimeWindowsOverlap(
  startTime: string,
  endTime: string,
  existingStartTime: string,
  existingEndTime: string,
): boolean {
  const start = clockMinutes(startTime);
  const end = clockMinutes(endTime);
  const existingStart = clockMinutes(existingStartTime);
  const existingEnd = clockMinutes(existingEndTime);

  if (end <= start || existingEnd <= existingStart) {
    throw new Error(
      "overtime interval end must be after start time",
    );
  }

  return start < existingEnd && end > existingStart;
}

export function assertNoOverlappingOvertime(
  requested: {
    readonly workDate: string;
    readonly startTime: string;
    readonly endTime: string;
  },
  existing: readonly ExistingOvertimeWindow[],
): void {
  const requestedDate = normalizeOvertimeIsoDate(
    requested.workDate,
  );

  const conflict = existing.some((window) => {
    const status = window.status.trim().toUpperCase();

    if (status === "REJECTED" || status === "CANCELLED") {
      return false;
    }

    return (
      normalizeOvertimeIsoDate(window.workDate) ===
        requestedDate &&
      overtimeWindowsOverlap(
        requested.startTime,
        requested.endTime,
        window.startTime,
        window.endTime,
      )
    );
  });

  if (conflict) {
    throw new Error(
      "overtime request overlaps an existing active request",
    );
  }
}

export function expandOvertimeDays(
  input: NormalizedOvertimeCreate,
  calendarDays: readonly OvertimeCalendarDay[],
): readonly OvertimeDayRequest[] {
  const normalized = normalizeOvertimeCreate(input);
  const byDate = new Map(
    calendarDays.map((day) => [
      normalizeOvertimeIsoDate(day.date),
      day.isWorkday,
    ]),
  );
  const result: OvertimeDayRequest[] = [];
  const current = new Date(
    `${normalized.startDate}T00:00:00.000Z`,
  );
  const end = new Date(
    `${normalized.endDate}T00:00:00.000Z`,
  );

  while (current <= end) {
    const date = current.toISOString().slice(0, 10);

    if (!byDate.has(date)) {
      throw new Error(
        `missing overtime calendar classification for ${date}`,
      );
    }

    result.push({
      workDate: date,
      startTime: normalized.startTime,
      endTime: normalized.endTime,
      requestedMinutes: calculateOvertimeRequestedMinutes(
        normalized.startTime,
        normalized.endTime,
        byDate.get(date) ?? false,
        normalized.breaks,
      ),
    });

    current.setUTCDate(current.getUTCDate() + 1);
  }

  if (!result.length) {
    throw new Error(
      "overtime request contains no payable minutes",
    );
  }

  return result;
}

export function assertOvertimeCancelable(
  status: string,
): void {
  const normalized = status.trim().toUpperCase();

  if (normalized !== "PENDING" && normalized !== "REVISION_REQUESTED") {
    throw new Error(
      "only pending overtime requests can be cancelled",
    );
  }
}

export function normalizeOvertimeDecision(input: {
  readonly decision: string;
  readonly comment?: string | null;
}): {
  readonly decision: "APPROVED" | "REJECTED" | "REVISION_REQUESTED";
  readonly comment: string | null;
} {
  const decision = input.decision.trim().toUpperCase();

  if (
    decision !== "APPROVED" &&
    decision !== "REJECTED" &&
    decision !== "REVISION_REQUESTED"
  ) {
    throw new Error(
      "overtime decision must be APPROVED, REJECTED or REVISION_REQUESTED",
    );
  }

  const comment = input.comment?.trim() || null;

  if (comment && comment.length > 1000) {
    throw new Error(
      "overtime decision comment is too long",
    );
  }

  if (decision === "REJECTED" && !comment) {
    throw new Error(
      "rejected overtime decision requires a comment",
    );
  }

  if (decision === "REVISION_REQUESTED" && !comment) {
    throw new Error(
      "overtime revision request requires a comment",
    );
  }

  return {
    decision,
    comment,
  };
}
