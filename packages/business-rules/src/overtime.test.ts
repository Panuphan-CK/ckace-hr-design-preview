import { describe, expect, it } from "vitest";

import {
  assertNoOverlappingOvertime,
  assertOvertimeCancelable,
  calculateOvertimeRequestedMinutes,
  expandOvertimeDays,
  defaultOvertimeBreaks,
  normalizeOvertimeBreaks,
  normalizeOvertimeCreate,
  normalizeOvertimeDecision,
} from "./overtime";

describe("overtime business rules", () => {
  it("normalizes legacy dot clocks and validates safe client keys", () => {
    expect(
      normalizeOvertimeCreate({
        startDate: "2026-10-05",
        endDate: "2026-10-06",
        startTime: "17.30",
        endTime: "20:00",
        reason: " close month ",
        clientKey: "ot-client-0001",
      }),
    ).toEqual({
      startDate: "2026-10-05",
      endDate: "2026-10-06",
      startTime: "17:30",
      endTime: "20:00",
      reason: "close month",
      clientKey: "ot-client-0001",
    });

    expect(() =>
      normalizeOvertimeCreate({
        startDate: "2026-10-05",
        endDate: "2026-10-05",
        startTime: "17:30",
        endTime: "20:00",
        reason: "close month",
        clientKey: "short",
      }),
    ).toThrow("clientKey");
  });

  it("rejects overnight/equal-end intervals", () => {
    expect(() =>
      calculateOvertimeRequestedMinutes(
        "20:00",
        "08:00",
        true,
      ),
    ).toThrow("after start");

    expect(() =>
      calculateOvertimeRequestedMinutes(
        "20:00",
        "20:00",
        false,
      ),
    ).toThrow("after start");
  });

  it("deducts actual lunch overlap on workdays", () => {
    expect(
      calculateOvertimeRequestedMinutes(
        "11:30",
        "14:00",
        true,
      ),
    ).toBe(90);

    expect(
      calculateOvertimeRequestedMinutes(
        "13:00",
        "17:00",
        true,
      ),
    ).toBe(240);
  });

  it("deducts actual lunch and evening-break overlap on non-workdays", () => {
    expect(
      calculateOvertimeRequestedMinutes(
        "11:30",
        "19:00",
        false,
      ),
    ).toBe(330);
    expect(
      calculateOvertimeRequestedMinutes(
        "13:00",
        "21:30",
        false,
      ),
    ).toBe(450);
  });

  it("expands a desktop date range into one daily request", () => {
    const normalized = normalizeOvertimeCreate({
      startDate: "2026-10-05",
      endDate: "2026-10-06",
      startTime: "17:30",
      endTime: "20:00",
      reason: "close month",
      clientKey: "ot-client-0002",
    });

    expect(
      expandOvertimeDays(normalized, [
        { date: "2026-10-05", isWorkday: true },
        { date: "2026-10-06", isWorkday: false },
      ]),
    ).toEqual([
      {
        workDate: "2026-10-05",
        startTime: "17:30",
        endTime: "20:00",
        requestedMinutes: 150,
      },
      {
        workDate: "2026-10-06",
        startTime: "17:30",
        endTime: "20:00",
        requestedMinutes: 90,
      },
    ]);
  });

  it("blocks overlap with active requests but ignores rejected/cancelled rows", () => {
    const requested = {
      workDate: "2026-10-05",
      startTime: "18:00",
      endTime: "20:00",
    };

    expect(() =>
      assertNoOverlappingOvertime(requested, [
        {
          workDate: "2026-10-05",
          startTime: "17:30",
          endTime: "18:30",
          status: "PENDING",
        },
      ]),
    ).toThrow("overlaps");

    expect(() =>
      assertNoOverlappingOvertime(requested, [
        {
          workDate: "2026-10-05",
          startTime: "17:30",
          endTime: "18:30",
          status: "Rejected",
        },
        {
          workDate: "2026-10-05",
          startTime: "18:30",
          endTime: "19:30",
          status: "Cancelled",
        },
      ]),
    ).not.toThrow();
  });

  it("allows owner cancellation only while pending", () => {
    expect(() =>
      assertOvertimeCancelable("Pending"),
    ).not.toThrow();
    expect(() =>
      assertOvertimeCancelable("Approved"),
    ).toThrow("pending");
  });

  it("normalizes approval decisions and requires rejection comments", () => {
    expect(
      normalizeOvertimeDecision({
        decision: "approved",
        comment: " ok ",
      }),
    ).toEqual({
      decision: "APPROVED",
      comment: "ok",
    });

    expect(() =>
      normalizeOvertimeDecision({
        decision: "rejected",
        comment: " ",
      }),
    ).toThrow("requires a comment");

    expect(() =>
      normalizeOvertimeDecision({
        decision: "revise",
      }),
    ).toThrow("APPROVED, REJECTED or REVISION_REQUESTED");

    expect(
      normalizeOvertimeDecision({
        decision: "revision_requested",
        comment: " แก้เวลา ",
      }),
    ).toEqual({ decision: "REVISION_REQUESTED", comment: "แก้เวลา" });

    expect(() =>
      normalizeOvertimeDecision({ decision: "REVISION_REQUESTED" }),
    ).toThrow("requires a comment");
  });

  it("allows cancelling pending and sent-back overtime only", () => {
    expect(() => assertOvertimeCancelable("PENDING")).not.toThrow();
    expect(() => assertOvertimeCancelable("REVISION_REQUESTED")).not.toThrow();
    expect(() => assertOvertimeCancelable("APPROVED")).toThrow("only pending");
  });
});

describe("overtime optional breaks (company defaults 2026-10-15)", () => {
  it("takes no break out when the employee chooses none", () => {
    expect(
      calculateOvertimeRequestedMinutes("09:00", "20:00", false, []),
    ).toBe(660);
    expect(
      calculateOvertimeRequestedMinutes("17:30", "20:00", true, []),
    ).toBe(150);
  });

  it("deducts only the breaks the employee selects", () => {
    // holiday 09:00-18:00 with lunch and activity break
    expect(
      calculateOvertimeRequestedMinutes("09:00", "18:00", false, [
        "LUNCH",
        "ACTIVITY",
      ]),
    ).toBe(420);
    // weekday overtime with a full dinner break, then a short one
    expect(
      calculateOvertimeRequestedMinutes("17:30", "21:00", true, ["DINNER"]),
    ).toBe(150);
    expect(
      calculateOvertimeRequestedMinutes("17:30", "21:00", true, [
        "DINNER_SHORT",
      ]),
    ).toBe(180);
  });

  it("caps each break by the time it actually overlaps", () => {
    expect(
      calculateOvertimeRequestedMinutes("12:30", "15:00", false, [
        "LUNCH",
        "ACTIVITY",
      ]),
    ).toBe(60);
    expect(() =>
      calculateOvertimeRequestedMinutes("17:30", "17:50", true, [
        "DINNER_SHORT",
      ]),
    ).toThrow("payable");
  });

  it("keeps the legacy default when no breaks are given", () => {
    expect(defaultOvertimeBreaks(true)).toEqual(["LUNCH"]);
    expect(defaultOvertimeBreaks(false)).toEqual(["LUNCH", "DINNER"]);
    expect(
      calculateOvertimeRequestedMinutes("11:30", "19:00", false),
    ).toBe(330);
  });

  it("normalizes break lists and rejects unknown codes", () => {
    expect(
      normalizeOvertimeBreaks(["DINNER_SHORT", "LUNCH", "LUNCH"]),
    ).toEqual(["LUNCH", "DINNER_SHORT"]);
    expect(normalizeOvertimeBreaks(["DINNER", "DINNER_SHORT"])).toEqual([
      "DINNER",
    ]);
    expect(() => normalizeOvertimeBreaks(["NAP"])).toThrow("break");
  });

  it("carries chosen breaks through day expansion", () => {
    const days = expandOvertimeDays(
      {
        startDate: "2026-10-17",
        endDate: "2026-10-17",
        startTime: "09:00",
        endTime: "13:00",
        reason: "audit support",
        clientKey: "ot-client-0002",
        breaks: ["LUNCH"],
      },
      [{ date: "2026-10-17", isWorkday: false }],
    );
    expect(days[0]?.requestedMinutes).toBe(180);
  });
});
