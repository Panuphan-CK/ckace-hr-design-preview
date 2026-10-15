/**
 * Annual (vacation) leave days by length of service (Owner, 2026-10-15):
 * under 1 year = 5; up to 3 years = 6; up to 6 years = 7; up to 9 years = 8;
 * 10 years and over = 10. No carry-over; leave year = calendar year.
 * The table is policy data: this is only the company default.
 */

export interface TenureLeaveTier {
  /** Tier applies while completed service years are below this limit. */
  readonly belowYears: number;
  readonly days: number;
}

export const DEFAULT_VACATION_TIERS: readonly TenureLeaveTier[] = [
  { belowYears: 1, days: 5 },
  { belowYears: 4, days: 6 }, // 1 up to and including 3 completed years
  { belowYears: 7, days: 7 }, // 4–6
  { belowYears: 10, days: 8 }, // 7–9 (and until the 10th anniversary)
  { belowYears: Number.POSITIVE_INFINITY, days: 10 }, // 10 and over
];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDate(
  value: string,
  label: string,
): { year: number; month: number; day: number } {
  const match = ISO_DATE.exec(value);

  if (!match) {
    throw new Error(`${label} must use YYYY-MM-DD`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));

  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new Error(`${label} is invalid`);
  }

  return { year, month, day };
}

/** Completed whole years between two ISO dates (never negative). */
export function completedServiceYears(
  employmentStart: string,
  asOf: string,
): number {
  const start = parseDate(employmentStart, "employmentStart");
  const end = parseDate(asOf, "asOf");
  let years = end.year - start.year;

  if (
    end.month < start.month ||
    (end.month === start.month && end.day < start.day)
  ) {
    years -= 1;
  }

  return Math.max(0, years);
}

export function vacationDaysForTenure(
  completedYears: number,
  tiers: readonly TenureLeaveTier[] = DEFAULT_VACATION_TIERS,
): number {
  if (!Number.isInteger(completedYears) || completedYears < 0) {
    throw new Error("completed service years must be a whole number");
  }

  const tier = tiers.find((item) => completedYears < item.belowYears);

  if (!tier) {
    throw new Error("vacation tiers do not cover this service length");
  }

  return tier.days;
}

/**
 * Vacation days for a leave year. By default tenure is measured on 1 January
 * of that calendar year (leave year = calendar year, no carry-over); pass
 * `asOf` to measure on another date, for example the employee's anniversary.
 */
export function vacationEntitlementForYear(input: {
  readonly employmentStart: string;
  readonly leaveYear: number;
  readonly asOf?: string;
  readonly tiers?: readonly TenureLeaveTier[];
}): number {
  if (
    !Number.isInteger(input.leaveYear) ||
    input.leaveYear < 2000 ||
    input.leaveYear > 2100
  ) {
    throw new Error("leave year is invalid");
  }

  const asOf = input.asOf ?? `${input.leaveYear}-01-01`;
  const years = completedServiceYears(input.employmentStart, asOf);

  return vacationDaysForTenure(years, input.tiers);
}
