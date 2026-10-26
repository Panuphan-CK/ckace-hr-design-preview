import type { LeaveDurationCode } from "./leave";

export type RequestDisplayStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "REVISION_REQUESTED";

export type ApprovalStepDisplayStatus = RequestDisplayStatus | "SKIPPED";

export const REQUEST_STATUS_LABELS: Readonly<Record<RequestDisplayStatus, string>> = Object.freeze({
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
  CANCELLED: "ยกเลิก",
  REVISION_REQUESTED: "ส่งกลับแก้ไข",
});

/** Leave page wording, kept aligned with the employee's Leave screen. */
export const LEAVE_REQUEST_STATUS_LABELS: Readonly<Record<RequestDisplayStatus, string>> = Object.freeze({
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติ",
  REJECTED: "ไม่อนุมัติ",
  CANCELLED: "ยกเลิก",
  REVISION_REQUESTED: "รอแก้ไข",
});

export const APPROVAL_STEP_STATUS_LABELS: Readonly<Record<ApprovalStepDisplayStatus, string>> = Object.freeze({
  PENDING: "รอพิจารณา",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
  REVISION_REQUESTED: "ส่งกลับให้แก้ไข",
  SKIPPED: "ข้ามขั้น",
  CANCELLED: "ยกเลิก",
});

export const LEAVE_DURATION_LABELS: Readonly<Record<LeaveDurationCode, string>> = Object.freeze({
  FULL_DAY: "เต็มวัน",
  HOURLY: "รายชั่วโมง",
  MORNING: "ครึ่งเช้า",
  AFTERNOON: "ครึ่งบ่าย",
});

export const LEAVE_TYPE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  ANNUAL: "ลาพักร้อน",
  VACATION: "ลาพักร้อน",
  SICK: "ลาป่วย",
  PERSONAL: "ลากิจ",
});

/** Prefer the canonical Thai label; custom types keep the name configured by HR. */
export function leaveTypeDisplayLabel(key: string, configuredName: string): string {
  const normalizedKey = key.trim().toUpperCase();
  return LEAVE_TYPE_LABELS[normalizedKey] ?? (configuredName.trim() || normalizedKey);
}
