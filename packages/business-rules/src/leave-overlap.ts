/**
 * Detects an employee's leave requests that collide on the calendar.
 * Production only checked quota (in the browser); two open requests for the
 * same days were possible. Half days only collide with the same half or a
 * full day; hourly leave collides when the time ranges overlap.
 */

export type OverlapDuration =
  | "FULL_DAY"
  | "MORNING"
  | "AFTERNOON"
  | "HOURLY";

export interface LeaveOverlapPeriod {
  /** ISO date YYYY-MM-DD */
  readonly startDate: string;
  readonly endDate: string;
  readonly durationCode: OverlapDuration;
  /** HH:mm, only for HOURLY */
  readonly startTime?: string | null;
  readonly endTime?: string | null;
}

/** Statuses that still hold the calendar days. */
export const CALENDAR_HOLDING_LEAVE_STATUSES = [
  "PENDING",
  "APPROVED",
  "REVISION_REQUESTED",
] as const;

const LUNCH_END_MINUTES = 13 * 60;
const DAY_MINUTES = 24 * 60;

function minutes(value: string | null | undefined, label: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value ?? "").trim());

  if (!match) {
    throw new Error(`${label} must use HH:mm`);
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

/** Minute range a single day of this period occupies. */
function dayRange(period: LeaveOverlapPeriod): [number, number] {
  switch (period.durationCode) {
    case "FULL_DAY":
      return [0, DAY_MINUTES];
    case "MORNING":
      return [0, LUNCH_END_MINUTES];
    case "AFTERNOON":
      return [LUNCH_END_MINUTES, DAY_MINUTES];
    case "HOURLY":
      return [
        minutes(period.startTime, "start time"),
        minutes(period.endTime, "end time"),
      ];
  }
}

export function leavePeriodsOverlap(
  left: LeaveOverlapPeriod,
  right: LeaveOverlapPeriod,
): boolean {
  if (left.endDate < right.startDate || right.endDate < left.startDate) {
    return false;
  }

  const [leftStart, leftEnd] = dayRange(left);
  const [rightStart, rightEnd] = dayRange(right);

  return leftStart < rightEnd && rightStart < leftEnd;
}

export function assertNoOverlappingLeave(
  requested: LeaveOverlapPeriod,
  existing: readonly LeaveOverlapPeriod[],
): void {
  if (existing.some((period) => leavePeriodsOverlap(requested, period))) {
    throw new Error(
      "leave request overlaps another open or approved leave request",
    );
  }
}
