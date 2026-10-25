import type { OvertimeReportRow } from "@ckace/contracts";
import ExcelJS from "exceljs";

const BREAK_LABEL: Readonly<Record<string, string>> = {
  LUNCH: "พักเที่ยง",
  ACTIVITY: "พักกิจกรรม",
  DINNER: "พักเย็น 1 ชม.",
  DINNER_SHORT: "พักเย็น 30 นาที",
};

const ATTENDANCE_CHECK_LABEL: Readonly<Record<OvertimeReportRow["attendanceCheck"], string>> = {
  COMPLETE: "ครบ",
  LEFT_EARLY: "ออกก่อนเวลาที่อนุมัติ",
  NO_CHECK_OUT: "ลืมลงเวลาออก (จ่ายตามที่อนุมัติ)",
  NO_RECORD: "ไม่มีเวลาเข้า-ออก (จ่ายตามที่อนุมัติ)",
  PENDING: "ยังไม่ถึงเวลา",
};

const STATUS_LABEL: Readonly<Record<string, string>> = {
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติ",
  REJECTED: "ไม่อนุมัติ",
  CANCELLED: "ยกเลิก",
  REVISION_REQUESTED: "ส่งกลับแก้ไข",
};

/** Stops spreadsheet formula injection: text that starts like a formula is kept as text. */
export function safeCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function baht(satang: number): number {
  return satang / 100;
}

function breakText(row: OvertimeReportRow): string {
  if (row.breaks === null) return "ค่าเริ่มต้น";
  if (row.breaks.length === 0) return "ไม่พัก";
  return row.breaks.map((code) => BREAK_LABEL[code] ?? code).join(", ");
}

export async function buildOvertimeWorkbook(
  rows: readonly OvertimeReportRow[],
  range: { readonly from: string; readonly to: string },
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("รายงาน OT");

  sheet.addRow([`รายงานการทำงานล่วงเวลา ${range.from} ถึง ${range.to}`]).font = { bold: true, size: 14 };
  sheet.addRow([]);
  const header = sheet.addRow([
    "รหัสคำขอ",
    "วันที่",
    "พนักงาน",
    "ทีม",
    "บริษัท",
    "เวลาอนุมัติ (เริ่ม)",
    "เวลาอนุมัติ (สิ้นสุด)",
    "เข้างานจริง",
    "ออกงานจริง",
    "การลงเวลา",
    "นาทีที่ขอ",
    "นาทีที่จ่ายจริง",
    "พักที่ใช้",
    "ประเภทวัน",
    "สถานะ",
    "ค่ารถ (บาท)",
    "ค่าข้าว (บาท)",
    "รวม (บาท)",
  ]);
  header.font = { bold: true };

  for (const row of rows) {
    sheet.addRow([
      row.requestId,
      row.workDate,
      safeCell(row.employeeName),
      safeCell(row.teamName),
      safeCell(row.companyName),
      row.approvedStart,
      row.approvedEnd,
      row.actualCheckIn ?? "",
      row.actualCheckOut ?? "",
      ATTENDANCE_CHECK_LABEL[row.attendanceCheck] +
        (row.confirmed && (row.attendanceCheck === "NO_CHECK_OUT" || row.attendanceCheck === "NO_RECORD")
          ? " · แอดมินยืนยันแล้ว"
          : ""),
      row.requestedMinutes,
      row.paidMinutes,
      breakText(row),
      row.dayType === "WORKDAY" ? "วันทำงาน" : "วันหยุด",
      STATUS_LABEL[row.status] ?? row.status,
      baht(row.transportSatang),
      baht(row.mealSatang),
      baht(row.totalSatang),
    ]);
  }

  const total = sheet.addRow([
    "รวมทั้งหมด",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    rows.reduce((sum, row) => sum + row.requestedMinutes, 0),
    rows.reduce((sum, row) => sum + row.paidMinutes, 0),
    "",
    "",
    "",
    baht(rows.reduce((sum, row) => sum + row.transportSatang, 0)),
    baht(rows.reduce((sum, row) => sum + row.mealSatang, 0)),
    baht(rows.reduce((sum, row) => sum + row.totalSatang, 0)),
  ]);
  total.font = { bold: true };
  sheet.columns.forEach((column, index) => {
    column.width = index === 0 ? 38 : index < 5 ? 22 : 14;
  });

  const perPerson = new Map<
    string,
    { name: string; team: string; company: string; days: number; paid: number; transport: number; meal: number }
  >();
  for (const row of rows) {
    const entry = perPerson.get(row.employeeId) ?? {
      name: row.employeeName,
      team: row.teamName,
      company: row.companyName,
      days: 0,
      paid: 0,
      transport: 0,
      meal: 0,
    };
    entry.days += 1;
    entry.paid += row.paidMinutes;
    entry.transport += row.transportSatang;
    entry.meal += row.mealSatang;
    perPerson.set(row.employeeId, entry);
  }

  const summary = workbook.addWorksheet("สรุปรายบุคคล");
  summary.addRow(["พนักงาน", "ทีม", "บริษัท", "จำนวนวัน", "นาทีที่จ่ายจริง", "ค่ารถ (บาท)", "ค่าข้าว (บาท)", "รวม (บาท)"]).font = {
    bold: true,
  };
  for (const entry of [...perPerson.values()].sort((a, b) => a.name.localeCompare(b.name, "th"))) {
    summary.addRow([
      safeCell(entry.name),
      safeCell(entry.team),
      safeCell(entry.company),
      entry.days,
      entry.paid,
      baht(entry.transport),
      baht(entry.meal),
      baht(entry.transport + entry.meal),
    ]);
  }
  summary.columns.forEach((column, index) => {
    column.width = index < 3 ? 24 : 16;
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
