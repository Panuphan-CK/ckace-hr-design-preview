/**
 * Overtime allowances (Owner, 2026-10-15):
 * - meal allowance: fixed amount (50 baht) per overtime day, paid when the
 *   overtime actually runs until 20:00 or later;
 * - transport allowance: fixed per-person amount (differs between people),
 *   paid when the overtime actually runs until 21:30 or later.
 * Thresholds and amounts are policy data; the numbers below are only the
 * company defaults. Money is handled in satang (integer) to avoid float drift.
 */

export type OvertimeAllowanceKind = "MEAL" | "TRANSPORT";

export interface OvertimeAllowanceRule {
  readonly kind: OvertimeAllowanceKind;
  /** HH:mm — allowance is paid when the actual overtime end is at or after it. */
  readonly paidWhenEndsAtOrAfter: string;
  /** Fixed amount in satang for one overtime day. */
  readonly amountSatang: number;
}

export interface OvertimeAllowanceLineResult {
  readonly kind: OvertimeAllowanceKind;
  readonly amountSatang: number;
  readonly ruleSnapshot: OvertimeAllowanceRule;
}

export const DEFAULT_MEAL_ALLOWANCE_RULE: OvertimeAllowanceRule = {
  kind: "MEAL",
  paidWhenEndsAtOrAfter: "20:00",
  amountSatang: 5000,
};

/** Transport defaults to no threshold amount; the amount is per person. */
export const DEFAULT_TRANSPORT_THRESHOLD = "21:30";

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;

function minutesOf(value: string, label: string): number {
  const match = CLOCK.exec(value);

  if (!match) {
    throw new Error(`${label} must use HH:mm`);
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function transportAllowanceRule(
  amountSatang: number,
  paidWhenEndsAtOrAfter: string = DEFAULT_TRANSPORT_THRESHOLD,
): OvertimeAllowanceRule {
  return {
    kind: "TRANSPORT",
    paidWhenEndsAtOrAfter,
    amountSatang,
  };
}

function assertRule(rule: OvertimeAllowanceRule): void {
  minutesOf(rule.paidWhenEndsAtOrAfter, "allowance threshold");

  if (
    !Number.isInteger(rule.amountSatang) ||
    rule.amountSatang < 0
  ) {
    throw new Error(
      "allowance amount must be a non-negative whole number of satang",
    );
  }
}

export interface OvertimeAllowanceInput {
  /**
   * Actual overtime end (HH:mm): the earlier of real check-out and the
   * approved end. Null when there is no attendance, which pays nothing.
   */
  readonly actualEndTime: string | null;
  /** Payable overtime minutes (after breaks); zero pays nothing. */
  readonly payableMinutes: number;
  readonly rules: readonly OvertimeAllowanceRule[];
}

/**
 * Pure allowance calculation for one overtime day. One line per rule that is
 * satisfied. No attendance (null end) or no payable minutes pays nothing.
 */
export function calculateOvertimeAllowances(
  input: OvertimeAllowanceInput,
): readonly OvertimeAllowanceLineResult[] {
  input.rules.forEach(assertRule);

  if (
    input.actualEndTime === null ||
    !(input.payableMinutes > 0)
  ) {
    return [];
  }

  const end = minutesOf(input.actualEndTime, "actual end time");
  const seen = new Set<OvertimeAllowanceKind>();
  const lines: OvertimeAllowanceLineResult[] = [];

  for (const rule of input.rules) {
    if (seen.has(rule.kind)) {
      throw new Error(
        `duplicate ${rule.kind} allowance rule for one overtime day`,
      );
    }

    seen.add(rule.kind);

    if (
      end >= minutesOf(rule.paidWhenEndsAtOrAfter, "threshold") &&
      rule.amountSatang > 0
    ) {
      lines.push({
        kind: rule.kind,
        amountSatang: rule.amountSatang,
        ruleSnapshot: rule,
      });
    }
  }

  return lines;
}

export function sumAllowanceSatang(
  lines: readonly OvertimeAllowanceLineResult[],
): number {
  return lines.reduce((sum, line) => sum + line.amountSatang, 0);
}
