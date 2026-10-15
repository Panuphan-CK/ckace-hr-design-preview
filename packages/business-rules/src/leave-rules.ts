import {
  assertLeaveQuotaAvailable as assertQuota,
  calculateLeaveUnits,
  normalizeLeavePeriod,
  type LeaveDurationRule,
} from "./leave";

export type LeaveDuration = LeaveDurationRule;

export interface LeaveCalendarPolicy {
  readonly workingIsoWeekdays: readonly number[];
  readonly holidays: readonly string[];
}

export interface LeaveUsageInput {
  readonly startDate: string;
  readonly endDate: string;
  readonly duration: LeaveDuration;
  readonly startTime: string | null;
  readonly endTime: string | null;
}

/**
 * Compatibility wrapper retained for M7 callers created before the canonical
 * leave rule module was consolidated. Business semantics live in leave.ts.
 */
export function calculateLeaveUsageDays(
  input: LeaveUsageInput,
  calendar: LeaveCalendarPolicy,
): number {
  return calculateLeaveUnits(
    normalizeLeavePeriod({
      startDate: input.startDate,
      endDate: input.endDate,
      durationCode: input.duration,
      startTime: input.startTime,
      endTime: input.endTime,
    }),
    {
      workingIsoWeekdays: new Set(
        calendar.workingIsoWeekdays,
      ),
      holidayDates: new Set(calendar.holidays),
    },
  );
}

export function assertLeaveQuotaAvailable(input: {
  readonly quota: number;
  readonly used: number;
  readonly requested: number;
}): void {
  assertQuota(input);
}
