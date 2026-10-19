import type { ManagementReportRow } from "@ckace/contracts";
import ExcelJS from "exceljs";

import { safeCell } from "./overtime-report-workbook";

type ReportKind = ManagementReportRow["kind"];

interface KindConfig {
  readonly sheet: string;
  readonly title: string;
  readonly unit: string;
  readonly amountHeader: string;
}

const KIND_CONFIG: Readonly<Record<Exclude<ReportKind, "OVERTIME">, KindConfig>> = {
  LEAVE: { sheet: "รายงานการลา", title: "รายงานการลา", unit: "วัน", amountHeader: "จำนวน (วัน)" },
  ATTENDANCE: {
    sheet: "รายงานเข้าออกงาน",
    title: "รายงานเข้าออกงาน",
    unit: "ชม.",
    amountHeader: "จำนวน (ชม.)",
  },
  MEDICAL: {
    sheet: "รายงานเบิกค่ารักษา",
    title: "รายงานเบิกค่ารักษา",
    unit: "บาท",
    amountHeader: "จำนวน (บาท)",
  },
};

/** "2026-10-15" -> "15/10/2569" (Buddhist era). Non-ISO input is returned unchanged. */
export function buddhistDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${Number(match[1]) + 543}`;
}

/** Same sub-type rule as the on-screen report (first word of the summary). */
function rowType(row: ManagementReportRow): string {
  return row.summary.trim().split(/\s+/)[0] || row.status;
}

function rowValue(row: ManagementReportRow): number {
  const parsed = Number(row.amount);
  return row.amount !== undefined && Number.isFinite(parsed) ? parsed : 1;
}

function amountCell(row: ManagementReportRow): number | string {
  if (row.amount === undefined) return "";
  const parsed = Number(row.amount);
  return Number.isFinite(parsed) ? parsed : safeCell(row.amount);
}

async function buildReportWorkbook(
  kind: Exclude<ReportKind, "OVERTIME">,
  allRows: readonly ManagementReportRow[],
  range: { readonly from: string; readonly to: string },
): Promise<Buffer> {
  const config = KIND_CONFIG[kind];
  // Exactly the screen's selection: rows of this kind, in the order the API returned them.
  const rows = allRows.filter((row) => row.kind === kind);
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(config.sheet);

  sheet.addRow([`${config.title} ${buddhistDate(range.from)} ถึง ${buddhistDate(range.to)}`]).font = {
    bold: true,
    size: 14,
  };
  sheet.addRow([]);
  sheet.addRow(["วันที่", "พนักงาน", "สถานะ", "รายละเอียด", config.amountHeader]).font = { bold: true };
  for (const row of rows) {
    sheet.addRow([
      buddhistDate(row.date),
      safeCell(row.employeeName),
      safeCell(row.status),
      safeCell(row.summary || rowType(row)),
      amountCell(row),
    ]);
  }
  sheet.addRow([
    "รวมทั้งหมด",
    "",
    "",
    `${rows.length} รายการ`,
    rows.reduce((sum, row) => sum + rowValue(row), 0),
  ]).font = { bold: true };
  sheet.columns.forEach((column, index) => {
    column.width = index === 3 ? 40 : index === 1 ? 26 : 16;
  });

  const perPerson = new Map<string, { name: string; count: number; value: number }>();
  for (const row of rows) {
    const entry = perPerson.get(row.employeeId) ?? { name: row.employeeName, count: 0, value: 0 };
    entry.count += 1;
    entry.value += rowValue(row);
    perPerson.set(row.employeeId, entry);
  }
  const summary = workbook.addWorksheet("สรุปรายบุคคล");
  summary.addRow(["พนักงาน", "จำนวนรายการ", config.amountHeader]).font = { bold: true };
  for (const entry of [...perPerson.values()].sort((a, b) => b.value - a.value)) {
    summary.addRow([safeCell(entry.name), entry.count, entry.value]);
  }
  summary.columns.forEach((column, index) => {
    column.width = index === 0 ? 26 : 16;
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export const buildLeaveWorkbook = (
  rows: readonly ManagementReportRow[],
  range: { readonly from: string; readonly to: string },
): Promise<Buffer> => buildReportWorkbook("LEAVE", rows, range);

export const buildAttendanceWorkbook = (
  rows: readonly ManagementReportRow[],
  range: { readonly from: string; readonly to: string },
): Promise<Buffer> => buildReportWorkbook("ATTENDANCE", rows, range);

export const buildMedicalWorkbook = (
  rows: readonly ManagementReportRow[],
  range: { readonly from: string; readonly to: string },
): Promise<Buffer> => buildReportWorkbook("MEDICAL", rows, range);
