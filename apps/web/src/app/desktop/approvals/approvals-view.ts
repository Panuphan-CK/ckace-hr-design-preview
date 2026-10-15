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
  decision: "APPROVED" | "REJECTED",
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
