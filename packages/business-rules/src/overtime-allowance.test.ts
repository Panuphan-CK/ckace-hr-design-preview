import { describe, expect, it } from "vitest";

import {
  calculateOvertimeAllowances,
  DEFAULT_MEAL_ALLOWANCE_RULE,
  sumAllowanceSatang,
  transportAllowanceRule,
} from "./overtime-allowance";

const transport = transportAllowanceRule(12000); // 120 baht for this person

describe("overtime allowances", () => {
  it("pays nothing before 20:00", () => {
    expect(
      calculateOvertimeAllowances({
        actualEndTime: "19:59",
        payableMinutes: 150,
        rules: [DEFAULT_MEAL_ALLOWANCE_RULE, transport],
      }),
    ).toEqual([]);
  });

  it("pays the fixed meal allowance from 20:00 and not transport yet", () => {
    const lines = calculateOvertimeAllowances({
      actualEndTime: "20:00",
      payableMinutes: 150,
      rules: [DEFAULT_MEAL_ALLOWANCE_RULE, transport],
    });

    expect(lines.map((line) => line.kind)).toEqual(["MEAL"]);
    expect(sumAllowanceSatang(lines)).toBe(5000);
  });

  it("pays transport from 21:30 with the person's own amount", () => {
    const lines = calculateOvertimeAllowances({
      actualEndTime: "21:30",
      payableMinutes: 240,
      rules: [DEFAULT_MEAL_ALLOWANCE_RULE, transport],
    });

    expect(lines.map((line) => line.kind)).toEqual([
      "MEAL",
      "TRANSPORT",
    ]);
    expect(sumAllowanceSatang(lines)).toBe(17000);
    expect(lines[1]?.ruleSnapshot.amountSatang).toBe(12000);
  });

  it("pays nothing without attendance or payable minutes", () => {
    expect(
      calculateOvertimeAllowances({
        actualEndTime: null,
        payableMinutes: 240,
        rules: [DEFAULT_MEAL_ALLOWANCE_RULE, transport],
      }),
    ).toEqual([]);

    expect(
      calculateOvertimeAllowances({
        actualEndTime: "22:00",
        payableMinutes: 0,
        rules: [DEFAULT_MEAL_ALLOWANCE_RULE],
      }),
    ).toEqual([]);
  });

  it("skips rules with a zero amount and rejects bad input", () => {
    expect(
      calculateOvertimeAllowances({
        actualEndTime: "22:00",
        payableMinutes: 60,
        rules: [transportAllowanceRule(0)],
      }),
    ).toEqual([]);

    expect(() =>
      calculateOvertimeAllowances({
        actualEndTime: "22:00",
        payableMinutes: 60,
        rules: [transportAllowanceRule(-1)],
      }),
    ).toThrow("non-negative");

    expect(() =>
      calculateOvertimeAllowances({
        actualEndTime: "22:00",
        payableMinutes: 60,
        rules: [DEFAULT_MEAL_ALLOWANCE_RULE, DEFAULT_MEAL_ALLOWANCE_RULE],
      }),
    ).toThrow("duplicate");

    expect(() =>
      calculateOvertimeAllowances({
        actualEndTime: "25:00",
        payableMinutes: 60,
        rules: [DEFAULT_MEAL_ALLOWANCE_RULE],
      }),
    ).toThrow("HH:mm");
  });
});
