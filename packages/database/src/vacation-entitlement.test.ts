import { describe, expect, it, vi } from "vitest";

import {
  currentLeaveYear,
  ensureVacationEntitlement,
} from "./vacation-entitlement";

function tx(overrides: { employmentStart: Date | null; existing?: { quota: string } | null }) {
  return {
    leaveType: {
      findUnique: vi.fn().mockResolvedValue({ id: "type-annual", active: true }),
    },
    employee: {
      findUnique: vi.fn().mockResolvedValue({ employmentStart: overrides.employmentStart }),
    },
    leaveEntitlement: {
      findFirst: vi.fn().mockResolvedValue(overrides.existing ?? null),
      create: vi.fn(),
    },
    auditLog: { create: vi.fn() },
  };
}

describe("tenure based vacation entitlement", () => {
  it("uses Bangkok calendar year", () => {
    expect(currentLeaveYear(new Date("2026-12-31T20:00:00.000Z"))).toBe(2027);
    expect(currentLeaveYear(new Date("2026-06-01T00:00:00.000Z"))).toBe(2026);
  });

  it.each([
    ["2026-03-01", 5], // under 1 year on 1 Jan 2027? started Mar 2026 -> 0 years
    ["2024-01-01", 6], // 3 years
    ["2021-01-01", 7], // 6 years
    ["2018-01-01", 8], // 9 years
    ["2016-01-01", 10], // 11 years
  ])("grants tenure tier for start %s in 2027", async (start, expected) => {
    const client = tx({ employmentStart: new Date(`${start}T00:00:00.000Z`) });
    const result = await ensureVacationEntitlement(client as never, {
      employeeId: "e1",
      year: 2027,
      actorEmployeeId: "admin",
    });

    expect(result).toEqual({ created: true, quota: expected });
    expect(client.leaveEntitlement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        quota: expected,
        validFrom: new Date("2027-01-01T00:00:00.000Z"),
        validTo: new Date("2027-12-31T00:00:00.000Z"),
      }),
    });
  });

  it("falls back to the lowest tier without a start date and never overwrites an existing year", async () => {
    const none = tx({ employmentStart: null });
    await expect(
      ensureVacationEntitlement(none as never, { employeeId: "e1", year: 2027 }),
    ).resolves.toEqual({ created: true, quota: 5 });

    const existing = tx({ employmentStart: null, existing: { quota: "9" } });
    await expect(
      ensureVacationEntitlement(existing as never, { employeeId: "e1", year: 2027 }),
    ).resolves.toEqual({ created: false, quota: 9 });
    expect(existing.leaveEntitlement.create).not.toHaveBeenCalled();
  });
});
