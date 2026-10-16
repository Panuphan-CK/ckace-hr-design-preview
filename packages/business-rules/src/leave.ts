export type LeaveDurationRule =
  | "FULL_DAY"
  | "HOURLY"
  | "MORNING"
  | "AFTERNOON";

export interface LeaveWorkingCalendar {
  readonly workingIsoWeekdays: ReadonlySet<number>;
  readonly holidayDates: ReadonlySet<string>;
}

export interface NormalizedLeavePeriod {
  readonly startDate: string;
  readonly endDate: string;
  readonly durationCode: LeaveDurationRule;
  readonly startTime: string | null;
  readonly endTime: string | null;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const CLOCK = /^(\d{2}):(\d{2})$/;

export function normalizeIsoDate(value: string): string {
  const trimmed = value.trim();
  const match = ISO_DATE.exec(trimmed);

  if (!match) {
    throw new Error("Leave date must use YYYY-MM-DD");
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
    throw new Error("Leave date is invalid");
  }

  return trimmed;
}

export function normalizeClock(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined || !value.trim()) {
    return null;
  }

  const trimmed = value.trim();
  const match = CLOCK.exec(trimmed);

  if (!match) {
    throw new Error("Leave time must use HH:mm");
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour > 23 || minute > 59) {
    throw new Error("Leave time is invalid");
  }

  return trimmed;
}

function isoWeekday(date: Date): number {
  const weekday = date.getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

function clockMinutes(value: string): number {
  const match = CLOCK.exec(value);

  if (!match) {
    throw new Error("Leave time must use HH:mm");
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function normalizeLeavePeriod(input: {
  readonly startDate: string;
  readonly endDate: string;
  readonly durationCode: LeaveDurationRule;
  readonly startTime?: string | null;
  readonly endTime?: string | null;
}): NormalizedLeavePeriod {
  const startDate = normalizeIsoDate(input.startDate);
  const endDate = normalizeIsoDate(input.endDate);
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  if (end < start) {
    throw new Error("Leave end date must not precede start date");
  }

  if (
    input.durationCode === "HOURLY" &&
    startDate !== endDate
  ) {
    throw new Error(
      "Hourly leave must use one calendar day",
    );
  }

  const startTime = normalizeClock(input.startTime);
  const endTime = normalizeClock(input.endTime);

  if (input.durationCode === "HOURLY") {
    if (!startTime || !endTime) {
      throw new Error(
        "Timed leave requires start and end time",
      );
    }

    if (clockMinutes(endTime) <= clockMinutes(startTime)) {
      throw new Error(
        "Timed leave end time must be after start time",
      );
    }
  } else if (startTime || endTime) {
    throw new Error(
      "Start/end time is allowed only for timed leave",
    );
  }

  return {
    startDate,
    endDate,
    durationCode: input.durationCode,
    startTime,
    endTime,
  };
}

export function defaultLeaveWorkingCalendar(
  holidays: readonly string[] = [],
): LeaveWorkingCalendar {
  return {
    workingIsoWeekdays: new Set([1, 2, 3, 4, 5]),
    holidayDates: new Set(holidays),
  };
}

export function calculateLeaveUnits(
  period: NormalizedLeavePeriod,
  calendar: LeaveWorkingCalendar,
): number {
  if (period.durationCode === "HOURLY") {
    // Hourly leave only counts on a working day (not a weekend or company holiday).
    const day = new Date(`${period.startDate}T00:00:00.000Z`);
    if (
      !calendar.workingIsoWeekdays.has(isoWeekday(day)) ||
      calendar.holidayDates.has(period.startDate)
    ) {
      return 0;
    }

    const minutes =
      clockMinutes(period.endTime ?? "") -
      clockMinutes(period.startTime ?? "");
    return Math.max(0, minutes / 60 / 8);
  }

  if (calendar.workingIsoWeekdays.size === 0) {
    throw new Error("Leave working calendar is unavailable");
  }

  const dailyValue =
    period.durationCode === "MORNING" ||
    period.durationCode === "AFTERNOON"
      ? 0.5
      : 1;
  const start = new Date(
    `${period.startDate}T00:00:00.000Z`,
  );
  const end = new Date(
    `${period.endDate}T00:00:00.000Z`,
  );
  let total = 0;

  for (
    let cursor = new Date(start);
    cursor <= end;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    const date = cursor.toISOString().slice(0, 10);

    if (
      calendar.workingIsoWeekdays.has(isoWeekday(cursor)) &&
      !calendar.holidayDates.has(date)
    ) {
      total += dailyValue;
    }
  }

  return total;
}

export function assertLeaveQuotaAvailable(input: {
  readonly quota: number;
  readonly used: number;
  readonly requested: number;
}): void {
  for (const value of [input.quota, input.used, input.requested]) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(
        "Leave quota values must be finite and non-negative",
      );
    }
  }

  if (input.requested <= 0) {
    throw new Error(
      "Leave request must consume positive leave quota",
    );
  }

  if (input.used + input.requested > input.quota + 1e-9) {
    throw new Error("Leave entitlement exceeded");
  }
}

export function normalizeLeaveDescription(
  description: string,
): string {
  const trimmed = description.trim();

  if (!trimmed) {
    throw new Error("Leave description is required");
  }

  if (trimmed.length > 2000) {
    throw new Error("Leave description is too long");
  }

  return trimmed;
}

export function normalizeClientKey(
  clientKey: string,
): string {
  const trimmed = clientKey.trim();

  if (
    trimmed.length < 8 ||
    trimmed.length > 120 ||
    !/^[A-Za-z0-9._:-]+$/.test(trimmed)
  ) {
    throw new Error("Leave client key is invalid");
  }

  return trimmed;
}
