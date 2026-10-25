import { describe, expect, it, vi } from "vitest";

import { ensureYearlyEntitlements } from "./vacation-entitlement";

function txWith(existing: Record<string, boolean>) {
  const create = vi.fn().mockResolvedValue({});
  const types: Record<string, string> = { ANNUAL: "t-annual", PERSONAL: "t-personal", SICK: "t-sick" };
  return {
    create,
    tx: {
      leaveType: {
        findUnique: vi.fn(({ where }: { where: { key: string } }) =>
          Promise.resolve({ id: types[where.key], active: true }),
        ),
      },
      employee: {
        findUnique: vi.fn().mockResolvedValue({ employmentStart: new Date("2022-03-01T00:00:00.000Z") }),
      },
      leaveEntitlement: {
        findFirst: vi.fn(({ where }: { where: { leaveTypeId: string } }) =>
          Promise.resolve(existing[where.leaveTypeId] ? { id: "x", quota: 7 } : null),
        ),
        create,
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    },
  } as never as { create: ReturnType<typeof vi.fn>; tx: never };
}

describe("ensureYearlyEntitlements", () => {
  it("creates vacation, personal and sick for the calendar year", async () => {
    const { tx, create } = txWith({});
    const result = await ensureYearlyEntitlements(tx, { employeeId: "e1", year: 2027 });

    expect(result.created).toBe(true);
    expect(create).toHaveBeenCalledTimes(3);
    const personal = create.mock.calls.map((call) => call[0].data).find((d) => d.leaveTypeId === "t-personal");
    expect(personal).toMatchObject({ quota: 6 });
    expect(personal.validFrom.toISOString().slice(0, 10)).toBe("2027-01-01");
    expect(personal.validTo.toISOString().slice(0, 10)).toBe("2027-12-31");
  });

  it("never overwrites existing entitlements and is safe to repeat", async () => {
    const { tx, create } = txWith({ "t-annual": true, "t-personal": true, "t-sick": true });
    const result = await ensureYearlyEntitlements(tx, { employeeId: "e1", year: 2027 });

    expect(result.created).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });
});
