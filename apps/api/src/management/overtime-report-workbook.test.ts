import type { OvertimeReportRow } from "@ckace/contracts";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { buildOvertimeWorkbook, safeCell } from "./overtime-report-workbook";

const row = (overrides: Partial<OvertimeReportRow> = {}): OvertimeReportRow => ({
  requestId: "r1",
  workDate: "2026-10-15",
  employeeId: "e1",
  employeeName: "สมชาย",
  teamName: "ทีม A",
  companyName: "บริษัท 1",
  approvedStart: "17:30",
  approvedEnd: "21:30",
  actualCheckIn: "08:55",
  actualCheckOut: "21:40",
  requestedMinutes: 240,
  paidMinutes: 240,
  breaks: [],
  dayType: "WORKDAY",
  status: "APPROVED",
  transportSatang: 12000,
  mealSatang: 5000,
  totalSatang: 17000,
  ...overrides,
});

describe("overtime workbook", () => {
  it("keeps formula-like text as text", () => {
    expect(safeCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(safeCell("@x")).toBe("'@x");
    expect(safeCell("+1")).toBe("'+1");
    expect(safeCell("-1")).toBe("'-1");
    expect(safeCell("สมชาย")).toBe("สมชาย");
  });

  it("writes detail rows, a total row and a per-person summary in baht", async () => {
    const buffer = await buildOvertimeWorkbook(
      [row(), row({ requestId: "r2", employeeId: "e2", employeeName: "=cmd", transportSatang: 0, totalSatang: 5000 })],
      { from: "2026-10-01", to: "2026-10-31" },
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);

    const detail = workbook.getWorksheet("รายงาน OT");
    const summary = workbook.getWorksheet("สรุปรายบุคคล");
    expect(detail).toBeDefined();
    expect(summary).toBeDefined();
    // title, blank, header, 2 rows, total
    expect(detail?.rowCount).toBe(6);
    expect(detail?.getRow(4).getCell(15).value).toBe(120);
    expect(detail?.getRow(4).getCell(16).value).toBe(50);
    expect(detail?.getRow(5).getCell(3).value).toBe("'=cmd");
    expect(detail?.getRow(6).getCell(17).value).toBe(220);
    expect(summary?.rowCount).toBe(3);
  });
});
