import type { AttendanceRecordView, TimeCorrectionRequestView, TimeCorrectionStatus, TimeCorrectionType } from "@ckace/contracts";

export const CORRECTION_TYPE_LABEL: Readonly<Record<TimeCorrectionType, string>> = {
  CHECK_IN: "เข้างาน",
  CHECK_OUT: "ออกงาน",
  ADD_RECORD: "เพิ่มบันทึกลงเวลา",
};

export const CORRECTION_STATUS: Readonly<Record<TimeCorrectionStatus, { label: string; tone: string }>> = {
  PENDING: { label: "รออนุมัติ", tone: "wait" },
  APPROVED: { label: "อนุมัติ", tone: "ok" },
  REJECTED: { label: "ไม่อนุมัติ", tone: "bad" },
  CANCELLED: { label: "ยกเลิก", tone: "muted" },
  REVISION_REQUESTED: { label: "ส่งกลับให้แก้ไข", tone: "wait" },
};

const bangkokClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** ISO timestamp -> "HH:MM" on the Bangkok clock; null when missing or invalid. */
export function bangkokTime(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = bangkokClock.formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "";
  return hour && minute ? `${hour}:${minute}` : null;
}

/** Both times can be corrected; a missing check-out (forgot to scan out) is filled in by the correction. */
export function correctionTargets(): readonly TimeCorrectionType[] {
  return ["CHECK_IN", "CHECK_OUT"];
}

export function recordTime(record: AttendanceRecordView, type: TimeCorrectionType): string | null {
  return bangkokTime(type === "CHECK_IN" ? record.checkInAt : record.checkOutAt);
}

/** Newest work date first. */
export function sortRecords(records: readonly AttendanceRecordView[]): AttendanceRecordView[] {
  return [...records].sort((a, b) => b.workDate.localeCompare(a.workDate));
}

export function sortRequests(rows: readonly TimeCorrectionRequestView[]): TimeCorrectionRequestView[] {
  return [...rows].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export interface CorrectionMetrics {
  readonly thisMonth: number;
  readonly pending: number;
}

/** monthKey is "YYYY-MM"; cancelled requests do not count toward the month. */
export function correctionMetrics(rows: readonly TimeCorrectionRequestView[], monthKey: string): CorrectionMetrics {
  return rows.reduce<CorrectionMetrics>(
    (total, row) => ({
      thisMonth: total.thisMonth + (row.status !== "CANCELLED" && row.attendanceDate.startsWith(monthKey) ? 1 : 0),
      pending: total.pending + (row.status === "PENDING" ? 1 : 0),
    }),
    { thisMonth: 0, pending: 0 },
  );
}

/** A record that already has a pending request for the same check-in/out cannot take another one. */
export function hasPendingRequest(
  rows: readonly TimeCorrectionRequestView[],
  attendanceRecordId: string,
  type: TimeCorrectionType,
): boolean {
  return rows.some((row) => row.status === "PENDING" && row.attendanceRecordId === attendanceRecordId && row.correctionType === type);
}

export function bangkokMonthKey(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" }).format(now).slice(0, 7);
}

export function correctionErrorMessage(status: number, action: "load" | "create" | "cancel"): string {
  if (status === 401) return "หมดเวลาการเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่";
  if (status === 403) {
    if (action === "load") return "บัญชีนี้ไม่มีสิทธิ์ใช้งานการแก้ไขเวลา";
    return action === "create" ? "บัญชีนี้ไม่มีสิทธิ์ส่งคำขอแก้ไขเวลา" : "บัญชีนี้ไม่มีสิทธิ์ยกเลิกคำขอนี้";
  }
  if (status === 409) return action === "create" ? "มีคำขอแก้ไขเวลาที่ชนกับรายการนี้ กรุณาตรวจสอบประวัติ" : "สถานะคำขอเปลี่ยนแล้ว กรุณารีเฟรช";
  if (status === 503) return "ระบบแก้ไขเวลายังไม่เปิดใช้งานในตอนนี้";
  if (status === 400) return "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบวันที่และเวลา";
  if (action === "load") return "ไม่สามารถโหลดข้อมูลการแก้ไขเวลาได้";
  return action === "create" ? "ส่งคำขอแก้ไขเวลาไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" : "ยกเลิกคำขอแก้ไขเวลาไม่สำเร็จ";
}

/** Card/dialog title: a whole added record shows both times, other corrections the corrected one. */
export function correctionTitle(request: TimeCorrectionRequestView): string {
  if (request.correctionType === "ADD_RECORD") {
    return `${CORRECTION_TYPE_LABEL.ADD_RECORD} ${request.correctedTime}-${request.correctedCheckOutTime ?? "—"}`;
  }
  return `แก้เวลา${CORRECTION_TYPE_LABEL[request.correctionType]} ${request.correctedTime}`;
}

export function correctionTimeSummary(request: TimeCorrectionRequestView): string {
  if (request.correctionType === "ADD_RECORD") {
    return `เข้า ${request.correctedTime} ออก ${request.correctedCheckOutTime ?? "—"}`;
  }
  return `${request.originalTime || "—"} เป็น ${request.correctedTime}`;
}

export function bangkokToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export type AddRecordCheck = { readonly ok: true } | { readonly ok: false; readonly message: string };

/** Client-side guard for the add-record form; the server repeats every check. */
export function checkAddRecord(input: {
  readonly date: string;
  readonly checkIn: string;
  readonly checkOut: string;
  readonly reason: string;
  readonly today: string;
  readonly recordDates: readonly string[];
  readonly activeRequestDates: readonly string[];
}): AddRecordCheck {
  if (!input.date || !input.checkIn || !input.checkOut || !input.reason.trim()) {
    return { ok: false, message: "กรุณาระบุวันที่ เวลาเข้า เวลาออก และเหตุผลให้ครบ" };
  }
  if (input.date > input.today) return { ok: false, message: "เลือกวันที่ในอนาคตไม่ได้" };
  if (input.checkOut <= input.checkIn) return { ok: false, message: "เวลาออกต้องหลังเวลาเข้า" };
  if (input.recordDates.includes(input.date)) {
    return { ok: false, message: "วันนี้มีบันทึกลงเวลาอยู่แล้ว ให้ใช้ฟอร์มแก้ไขเวลาด้านบนแทน" };
  }
  if (input.activeRequestDates.includes(input.date)) {
    return { ok: false, message: "มีคำขอสำหรับวันที่นี้อยู่แล้ว กรุณาตรวจสอบประวัติ" };
  }
  return { ok: true };
}
