import { allowanceHint, type AllowanceThresholds } from "../overtime/overtime-view";
import type { ApprovalHistoryItem, RequestStatusItem, UnifiedRequestKind } from "@ckace/contracts";

export type KindFilter = "ALL" | UnifiedRequestKind;

export const KIND_LABEL: Readonly<Record<UnifiedRequestKind, string>> = {
  LEAVE: "การลา",
  TIME_CORRECTION: "แก้ไขเวลา",
  OVERTIME: "ทำงานล่วงเวลา",
  MEDICAL: "ค่ารักษาพยาบาล",
};

export const KIND_TONE: Readonly<Record<UnifiedRequestKind, "leave" | "time" | "ot" | "med">> = {
  LEAVE: "leave",
  TIME_CORRECTION: "time",
  OVERTIME: "ot",
  MEDICAL: "med",
};

export const KIND_ORDER: readonly UnifiedRequestKind[] = ["LEAVE", "OVERTIME", "TIME_CORRECTION", "MEDICAL"];

const HASH_TO_KIND: Readonly<Record<string, KindFilter>> = {
  "#all": "ALL",
  "#leave": "LEAVE",
  "#time-correction": "TIME_CORRECTION",
  "#overtime": "OVERTIME",
  "#medical": "MEDICAL",
};

export function kindFromHash(hash: string): KindFilter {
  return HASH_TO_KIND[hash] ?? "ALL";
}

export function kindHash(kind: KindFilter): string {
  if (kind === "LEAVE") return "#leave";
  if (kind === "TIME_CORRECTION") return "#time-correction";
  if (kind === "OVERTIME") return "#overtime";
  if (kind === "MEDICAL") return "#medical";
  return "#all";
}

export function decisionEndpoint(request: Pick<RequestStatusItem, "id" | "kind">): string {
  const id = encodeURIComponent(request.id);
  switch (request.kind) {
    case "LEAVE":
      return `/api/leave/requests/${id}/decision`;
    case "TIME_CORRECTION":
      return `/api/attendance/time-corrections/${id}/decision`;
    case "OVERTIME":
      return `/api/overtime/requests/${id}/decision`;
    case "MEDICAL":
      return `/api/medical/claims/${id}/decision`;
  }
}

export function decisionPayload(
  request: Pick<RequestStatusItem, "kind" | "approvalStepId">,
  decision: "APPROVED" | "REJECTED" | "REVISION_REQUESTED",
  comment: string,
): Record<string, unknown> {
  return request.kind === "LEAVE"
    ? { approvalStepId: request.approvalStepId, decision, comment: comment || null }
    : { decision, comment };
}

interface Searchable {
  readonly kind: UnifiedRequestKind;
  readonly summary: string;
  readonly employeeDisplayName?: string;
}

export function matchesFilter(row: Searchable & { readonly comment?: string | null }, kind: KindFilter, search: string): boolean {
  if (kind !== "ALL" && row.kind !== kind) return false;
  const key = search.trim().toLocaleLowerCase("th");
  if (!key) return true;
  return [row.employeeDisplayName ?? "", row.summary, row.comment ?? "", KIND_LABEL[row.kind]].join(" ").toLocaleLowerCase("th").includes(key);
}

export function countByKind(rows: readonly { readonly kind: UnifiedRequestKind }[]): ReadonlyMap<UnifiedRequestKind, number> {
  const result = new Map<UnifiedRequestKind, number>();
  for (const row of rows) result.set(row.kind, (result.get(row.kind) ?? 0) + 1);
  return result;
}

export function sortPending(rows: readonly RequestStatusItem[]): RequestStatusItem[] {
  return [...rows].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}

export function sortHistory(rows: readonly ApprovalHistoryItem[]): ApprovalHistoryItem[] {
  return [...rows].sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
}

export function initials(name: string | undefined): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.slice(0, 1) ?? "") + (parts[1]?.slice(0, 1) ?? "");
}

export function loadErrorMessage(status: number): string {
  if (status === 401) return "หมดเวลาการเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่";
  if (status === 403) return "บัญชีนี้ไม่มีสิทธิ์ดูงานอนุมัติ";
  if (status === 503) return "ระบบอนุมัติยังไม่เปิดใช้งานในตอนนี้";
  return "ไม่สามารถโหลดงานอนุมัติได้";
}

export function decideErrorMessage(status: number): string {
  if (status === 403) return "ไม่มีสิทธิ์ตัดสินคำขอนี้ หรือคำขอถูกเปลี่ยนสถานะแล้ว";
  if (status === 409) return "คำขอนี้ถูกเปลี่ยนสถานะแล้ว กรุณารีเฟรช";
  if (status === 503) return "โมดูลนี้ยังไม่เปิดให้บันทึกผลอนุมัติในตอนนี้";
  return "บันทึกผลอนุมัติไม่สำเร็จ";
}

/** Withdrawal endpoint of an approved request (highest-level user only; the API re-checks the permission). */
export function withdrawEndpoint(item: { readonly kind: string; readonly requestId: string }): string {
  const id = encodeURIComponent(item.requestId);

  switch (item.kind) {
    case "LEAVE":
      return "/api/leave/requests/" + id + "/withdraw";
    case "OVERTIME":
      return "/api/overtime/requests/" + id + "/withdraw";
    case "MEDICAL":
      return "/api/medical/claims/" + id + "/withdraw";
    default:
      return "/api/attendance/time-corrections/" + id + "/withdraw";
  }
}

const DURATION_LABEL: Readonly<Record<string, string>> = {
  FULL_DAY: "เต็มวัน",
  MORNING: "ครึ่งวันเช้า",
  AFTERNOON: "ครึ่งวันบ่าย",
  HOURLY: "รายชั่วโมง",
};

function dmy(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${Number(y) + 543}`;
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} นาที`;
  return m === 0 ? `${h} ชั่วโมง` : `${h} ชั่วโมง ${m} นาที`;
}

/** Key facts an approver needs (dates, times, hours) as lines; empty when the request carries none. */
export function requestFactLines(request: Pick<RequestStatusItem, "leave" | "overtime">, thresholds?: AllowanceThresholds): string[] {
  const lines: string[] = [];
  if (request.leave) {
    const { startDate, endDate, durationCode } = request.leave;
    const range = startDate === endDate ? dmy(startDate) : `${dmy(startDate)} ถึง ${dmy(endDate)}`;
    lines.push(`วันที่ลา ${range} (${DURATION_LABEL[durationCode] ?? durationCode})`);
  }
  for (const segment of request.overtime?.segments ?? []) {
    const hint = allowanceHint(segment.endTime, thresholds);
    lines.push(
      `${dmy(segment.workDate)} เวลา ${segment.startTime}–${segment.endTime} น. (${formatMinutes(segment.requestedMinutes)})` +
        (hint.startsWith("คาดว่า") ? ` · ${hint}` : ""),
    );
  }
  const total = (request.overtime?.segments ?? []).reduce((sum, segment) => sum + segment.requestedMinutes, 0);
  if (request.overtime && request.overtime.segments.length > 1) lines.push(`รวม ${formatMinutes(total)}`);
  return lines;
}
