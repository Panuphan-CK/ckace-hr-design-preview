import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PrismaManagementRepository } from "./management-repository";

function repoWith(rows: unknown[]) {
  const findMany = vi.fn().mockResolvedValue(rows);
  const prisma = { attendanceRecord: { findMany } } as never;

  return { findMany, repo: new PrismaManagementRepository(prisma) };
}

describe("missing check-outs report", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-16T03:00:00.000Z")); // 10:00 Bangkok on 16 Oct
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists past days only, skipping clock-in-exempt people through the stats filter", async () => {
    const { findMany, repo } = repoWith([
      {
        employeeId: "e1",
        workDate: new Date("2026-10-14T00:00:00.000Z"),
        checkInAt: new Date("2026-10-14T02:05:00.000Z"),
        employee: { fullName: "สมชาย", agency: { name: "ทีม 1", company: { name: "บริษัท A" } }, company: null },
      },
    ]);
    const result = await repo.missingCheckOuts(new Date("2026-10-01T00:00:00.000Z"), new Date("2026-10-31T00:00:00.000Z"));

    expect(result).toEqual([
      { employeeId: "e1", employeeName: "สมชาย", teamName: "ทีม 1", companyName: "บริษัท A", workDate: "2026-10-14", checkIn: "09:05" },
    ]);

    const where = findMany.mock.calls[0]?.[0].where;
    // today (16 Oct) is not included: a person may still be at work
    expect(where.workDate.lte).toEqual(new Date("2026-10-15T00:00:00.000Z"));
    expect(where.checkOutAt).toBeNull();
    expect(where.employee.is.attendanceExempt).toBe(false);
    expect(where.employee.is.professionalRoles.none.professionalRole).toEqual({ attendanceExempt: true, active: true });
  });

  it("returns nothing when the range only covers today or the future", async () => {
    const { findMany, repo } = repoWith([]);
    const result = await repo.missingCheckOuts(new Date("2026-10-16T00:00:00.000Z"), new Date("2026-10-20T00:00:00.000Z"));

    expect(result).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
