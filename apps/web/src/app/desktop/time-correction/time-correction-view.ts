import type { AttendanceRecordView, TimeCorrectionRequestView, TimeCorrectionStatus, TimeCorrectionType } from "@ckace/contracts";

export const CORRECTION_TYPE_LABEL: Readonly<Record<TimeCorrectionType, string>> = {
  CHECK_IN: "เข้างาน",
  CHECK_OUT: "ออกงาน",
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

/** Check-out can only be corrected once a check-out exists on the record. */
export function correctionTargets(record: AttendanceRecordView): readonly TimeCorrectionType[] {
  return record.checkOutAt ? ["CHECK_IN", "CHECK_OUT"] : ["CHECK_IN"];
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
