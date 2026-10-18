import { describe, expect, it, vi } from "vitest";

import { loadOvertimeReportRows } from "./overtime-report-repository";

const DATE = new Date("2026-10-15T00:00:00.000Z"); // Thursday, working day

function prismaWith(options: {
  status?: string;
  checkOutUtc?: string | null;
  breakCodes?: unknown;
  transportSatang?: number;
}) {
  return {
    overtimeAllowancePolicy: {
      findMany: vi.fn().mockResolvedValue([
        { kind: "MEAL", amountSatang: 5000, paidWhenEndsAtOrAfter: "20:00", active: true },
        { kind: "TRANSPORT", amountSatang: 0, paidWhenEndsAtOrAfter: "21:30", active: true },
      ]),
    },
    weeklyWorkRule: {
      findMany: vi
        .fn()
        .mockResolvedValue([1, 2, 3, 4, 5].map((d) => ({ isoWeekday: d, isWorking: true }))),
    },
    holiday: { findMany: vi.fn().mockResolvedValue([]) },
    overtimeSegment: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "s1",
          workDate: DATE,
          startTime: new Date("1970-01-01T17:30:00.000Z"),
          endTime: new Date("1970-01-01T22:00:00.000Z"),
          requestedMinutes: 270,
          breakCodes: options.breakCodes ?? [],
          request: {
            id: "req1",
            status: options.status ?? "APPROVED",
            employee: {
              id: "e1",
              fullName: "สมชาย",
              overtimeTransportSatang: options.transportSatang ?? 12000,
              agency: { name: "ทีม A", company: { name: "บริษัท 1" } },
              company: null,
            },
          },
        },
      ]),
    },
    attendanceRecord: {
      findMany: vi.fn().mockResolvedValue(
        options.checkOutUtc === null
          ? []
          : [
              {
                employeeId: "e1",
                workDate: DATE,
                checkInAt: new Date("2026-10-15T01:55:00.000Z"),
                checkOutAt: new Date(options.checkOutUtc ?? "2026-10-15T15:10:00.000Z"),
              },
            ],
      ),
    },
  } as never;
}

const filters = { from: DATE, to: DATE };

describe("overtime report rows", () => {
  it("pays meal and transport when the real check-out is late enough", async () => {
    // check-out 22:10 Bangkok (15:10 UTC) -> actual end capped to approved 22:00
    const [row] = await loadOvertimeReportRows(prismaWith({}), filters);

    expect(row).toMatchObject({
      workDate: "2026-10-15",
      approvedStart: "17:30",
      approvedEnd: "22:00",
      actualCheckIn: "08:55",
      actualCheckOut: "22:10",
      paidMinutes: 270,
      mealSatang: 5000,
      transportSatang: 12000,
      totalSatang: 17000,
      dayType: "WORKDAY",
    });
  });

  it("limits paid minutes and allowances to the real check-out", async () => {
    // check-out 20:30 Bangkok (13:30 UTC): meal yes, transport no (needs 21:30)
    const [row] = await loadOvertimeReportRows(
      prismaWith({ checkOutUtc: "2026-10-15T13:30:00.000Z" }),
      filters,
    );

    expect(row?.paidMinutes).toBe(180);
    expect(row?.mealSatang).toBe(5000);
    expect(row?.transportSatang).toBe(0);
  });

  it("pays the approved time and flags a past day with no punches", async () => {
    const [none] = await loadOvertimeReportRows(prismaWith({ checkOutUtc: null }), filters);
    expect(none).toMatchObject({
      attendanceCheck: "NO_RECORD",
      paidMinutes: 270,
      totalSatang: 17000,
      actualCheckOut: null,
    });
  });

  it("pays the real time and flags an early check-out", async () => {
    // check-out 19:00 Bangkok (12:00 UTC), approved until 22:00
    const [early] = await loadOvertimeReportRows(
      prismaWith({ checkOutUtc: "2026-10-15T12:00:00.000Z" }),
      filters,
    );
    expect(early).toMatchObject({ attendanceCheck: "LEFT_EARLY", mealSatang: 0 });
    expect(early?.paidMinutes).toBeLessThan(270);
  });

  it("pays nothing for requests that are not approved", async () => {
    const [pending] = await loadOvertimeReportRows(prismaWith({ status: "PENDING" }), filters);
    expect(pending).toMatchObject({ paidMinutes: 0, totalSatang: 0 });
  });
});
