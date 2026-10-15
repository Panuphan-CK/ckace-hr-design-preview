import type { LeaveCalendarItem, RequestStatusItem } from "@ckace/contracts";

import type { Tone } from "./ui/kit";

/** "YYYY-MM-DD" of the given instant on the Bangkok calendar. */
export function bangkokDateKey(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function bangkokHour(now: Date): number {
  const hour = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", hourCycle: "h23" }).format(now);
  return Number(hour);
}

export function greeting(now: Date): string {
  const hour = bangkokHour(now);
  if (hour < 12) return "สวัสดีตอนเช้า";
  if (hour < 17) return "สวัสดีตอนบ่าย";
  return "สวัสดีตอนเย็น";
}

const WEEKDAYS = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"] as const;
const MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
] as const;

/** "วันพุธที่ 15 ตุลาคม 2569" */
export function longThaiDate(dateKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return dateKey;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return `${WEEKDAYS[date.getUTCDay()]}ที่ ${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${Number(match[1]) + 543}`;
}

function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Monday..Sunday week containing the date key. */
export function weekRange(dateKey: string): { from: string; to: string } {
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  const sinceMonday = (dow + 6) % 7;
  const from = addDays(dateKey, -sinceMonday);
  return { from, to: addDays(from, 6) };
}

export interface TeamLeaveEntry {
  readonly id: string;
  readonly employeeName: string;
  readonly leaveType: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly today: boolean;
}

/** Approved leave of other people that touches the current week; today's first, then by start date. */
export function teamLeaveThisWeek(
  items: readonly LeaveCalendarItem[],
  selfEmployeeId: string | null,
  todayKey: string,
): TeamLeaveEntry[] {
  const { from, to } = weekRange(todayKey);
  return items
    .filter(
      (item) =>
        item.status === "APPROVED" &&
        item.employeeId !== selfEmployeeId &&
        item.startDate <= to &&
        item.endDate >= from,
    )
    .map((item) => ({
      id: item.id,
      employeeName: item.employeeName,
      leaveType: item.leaveType,
      startDate: item.startDate,
      endDate: item.endDate,
      today: item.startDate <= todayKey && item.endDate >= todayKey,
    }))
    .sort((a, b) => Number(b.today) - Number(a.today) || a.startDate.localeCompare(b.startDate));
}

/** Requests still moving: waiting for an approver, or sent back for the employee to fix. Sent-back first. */
export function inProgressRequests(rows: readonly RequestStatusItem[]): RequestStatusItem[] {
  return rows
    .filter((row) => row.status === "PENDING" || row.status === "REVISION_REQUESTED")
    .sort(
      (a, b) =>
        Number(b.status === "REVISION_REQUESTED") - Number(a.status === "REVISION_REQUESTED") ||
        b.submittedAt.localeCompare(a.submittedAt),
    );
}

export function leaveTone(leaveTypeKey: string): Tone {
  if (leaveTypeKey === "VACATION") return "leave";
  if (leaveTypeKey === "SICK") return "sick";
  if (leaveTypeKey === "PERSONAL") return "biz";
  return "gray";
}

export function dayLabel(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function baht(value: number): string {
  return value.toLocaleString("th-TH", { maximumFractionDigits: 2 });
}
