import type { ManagementReportRow } from "@ckace/contracts";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import {
  buddhistDate,
  buildAttendanceWorkbook,
  buildLeaveWorkbook,
  buildMedicalWorkbook,
} from "./management-report-workbook";

const row = (overrides: Partial<ManagementReportRow>): ManagementReportRow => ({
  id: "1",
  employeeId: "e1",
  employeeName: "สมชาย",
  kind: "LEAVE",
  date: "2026-10-15",
  status: "APPROVED",
  summary: "พักร้อน 1 วัน",
  amount: "1",
  ...overrides,
});

const rows: readonly ManagementReportRow[] = [
  row({ id: "l1" }),
  row({ id: "l2", employeeId: "e2", employeeName: "=cmd", amount: "2" }),
  row({ id: "a1", kind: "ATTENDANCE", summary: "เข้า 09:00 ออก 18:30", amount: "9.5" }),
  row({ id: "m1", kind: "MEDICAL", summary: "ค่ารักษา", amount: "1250.5" }),
  row({ id: "o1", kind: "OVERTIME", summary: "OT", amount: "3" }),
];
const range = { from: "2026-10-01", to: "2026-10-31" };

async function load(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  return workbook;
}

describe("management report workbooks", () => {
  it("formats Buddhist-era dates", () => {
    expect(buddhistDate("2026-10-15")).toBe("15/10/2569");
    expect(buddhistDate("n/a")).toBe("n/a");
  });

  it("leave: only leave rows, totals and sanitised text", async () => {
    const workbook = await load(await buildLeaveWorkbook(rows, range));
    const sheet = workbook.getWorksheet("รายงานการลา");
    // title, blank, header, 2 rows, total
    expect(sheet?.rowCount).toBe(6);
    expect(sheet?.getRow(4).getCell(1).value).toBe("15/10/2569");
    expect(sheet?.getRow(5).getCell(2).value).toBe("'=cmd");
    expect(sheet?.getRow(6).getCell(5).value).toBe(3);
    expect(workbook.getWorksheet("สรุปรายบุคคล")?.rowCount).toBe(3);
  });

  it("attendance: keeps decimal hours numeric for Excel sums", async () => {
    const workbook = await load(await buildAttendanceWorkbook(rows, range));
    const sheet = workbook.getWorksheet("รายงานเข้าออกงาน");
    expect(sheet?.rowCount).toBe(5);
    expect(sheet?.getRow(4).getCell(5).value).toBe(9.5);
    expect(sheet?.getRow(5).getCell(5).value).toBe(9.5);
    expect(sheet?.getColumn(5).numFmt).toBe("0.00");
    expect(workbook.getWorksheet("สรุปรายบุคคล")?.getRow(2).getCell(3).value).toBe(9.5);
    expect(workbook.getWorksheet("สรุปรายบุคคล")?.getColumn(3).numFmt).toBe("0.00");
  });

  it("medical: only medical rows with decimal amounts", async () => {
    const workbook = await load(await buildMedicalWorkbook(rows, range));
    const sheet = workbook.getWorksheet("รายงานเบิกค่ารักษา");
    expect(sheet?.rowCount).toBe(5);
    expect(sheet?.getRow(5).getCell(5).value).toBe(1250.5);
  });

  it("empty input still yields title, header and zero total", async () => {
    const workbook = await load(await buildMedicalWorkbook([], range));
    expect(workbook.getWorksheet("รายงานเบิกค่ารักษา")?.rowCount).toBe(4);
  });
});
