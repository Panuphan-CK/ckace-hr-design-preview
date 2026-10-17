/**
 * Who is told what when a request changes (Owner 2026-10-16: LINE first, email as a second channel,
 * in-app inbox always). Pure rules: event classification and Thai message text.
 */

export type NotificationAudience = "APPROVER" | "REQUESTER" | "DELEGATE" | "EMPLOYEE" | "NONE";

export type NotificationKind =
  | "REQUEST_WAITING"
  | "REQUEST_APPROVED"
  | "REQUEST_REJECTED"
  | "REQUEST_REVISION"
  | "REQUEST_WITHDRAWN"
  | "APPROVAL_REMINDER"
  | "DELEGATION_RECEIVED"
  | "ACCOUNT_APPROVED"
  | "NONE";

export interface NotificationClassification {
  readonly audience: NotificationAudience;
  readonly kind: NotificationKind;
}

const NONE: NotificationClassification = { audience: "NONE", kind: "NONE" };

const WAITING_EVENTS = new Set([
  "LEAVE_REQUEST_CREATED",
  "LEAVE_REQUEST_RESUBMITTED",
  "OVERTIME_REQUEST_CREATED",
  "OVERTIME_REQUEST_RESUBMITTED",
  "OVERTIME_APPROVAL_ADVANCED",
  "MEDICAL_CLAIM_CREATED",
  "MEDICAL_CLAIM_RESUBMITTED",
  "MEDICAL_APPROVAL_ADVANCED",
  "TIME_CORRECTION_CREATED",
  "TIME_CORRECTION_RESUBMITTED",
  "TIME_CORRECTION_APPROVAL_ADVANCED",
]);

const APPROVED_EVENTS = new Set([
  "OVERTIME_REQUEST_APPROVED",
  "MEDICAL_CLAIM_APPROVED",
  "MEDICAL_CLAIM_AUTO_APPROVED",
  "TIME_CORRECTION_APPROVED",
]);

const REJECTED_EVENTS = new Set([
  "OVERTIME_REQUEST_REJECTED",
  "MEDICAL_CLAIM_REJECTED",
  "TIME_CORRECTION_REJECTED",
]);

const REVISION_EVENTS = new Set([
  "OVERTIME_REQUEST_REVISION_REQUESTED",
  "MEDICAL_CLAIM_REVISION_REQUESTED",
  "TIME_CORRECTION_REVISION_REQUESTED",
]);

const WITHDRAWN_EVENTS = new Set([
  "LEAVE_REQUEST_WITHDRAWN",
  "OVERTIME_REQUEST_WITHDRAWN",
  "MEDICAL_CLAIM_WITHDRAWN",
  "TIME_CORRECTION_WITHDRAWN",
]);

/**
 * `requestStatus` is the status of the request when the event is processed; it only matters for
 * LEAVE_REQUEST_DECIDED, which covers advance, approval, rejection and send-back.
 */
export function classifyNotificationEvent(
  eventType: string,
  requestStatus?: string | null,
): NotificationClassification {
  if (eventType === "LEAVE_REQUEST_DECIDED") {
    switch (requestStatus) {
      case "PENDING":
        return { audience: "APPROVER", kind: "REQUEST_WAITING" };
      case "APPROVED":
        return { audience: "REQUESTER", kind: "REQUEST_APPROVED" };
      case "REJECTED":
        return { audience: "REQUESTER", kind: "REQUEST_REJECTED" };
      case "REVISION_REQUESTED":
        return { audience: "REQUESTER", kind: "REQUEST_REVISION" };
      default:
        return NONE;
    }
  }

  if (WAITING_EVENTS.has(eventType)) return { audience: "APPROVER", kind: "REQUEST_WAITING" };
  if (APPROVED_EVENTS.has(eventType)) return { audience: "REQUESTER", kind: "REQUEST_APPROVED" };
  if (REJECTED_EVENTS.has(eventType)) return { audience: "REQUESTER", kind: "REQUEST_REJECTED" };
  if (REVISION_EVENTS.has(eventType)) return { audience: "REQUESTER", kind: "REQUEST_REVISION" };
  if (WITHDRAWN_EVENTS.has(eventType)) return { audience: "REQUESTER", kind: "REQUEST_WITHDRAWN" };
  if (eventType === "APPROVAL_REMINDER") return { audience: "APPROVER", kind: "APPROVAL_REMINDER" };
  if (eventType === "APPROVAL_DELEGATION_CREATED") return { audience: "DELEGATE", kind: "DELEGATION_RECEIVED" };
  if (eventType === "ACCOUNT_APPROVED") return { audience: "EMPLOYEE", kind: "ACCOUNT_APPROVED" };

  return NONE;
}

export interface NotificationTextInput {
  readonly kind: NotificationKind;
  /** LEV-0001, OT-0001, MED-0001, TC-0001 when known. */
  readonly requestNo?: string | null;
  /** Thai label of the request type, e.g. "ใบลา". */
  readonly requestLabel?: string;
  readonly requesterName?: string | null;
  readonly summary?: string | null;
  /** Approver or requester comment (send-back reason, rejection reason, withdrawal reason). */
  readonly comment?: string | null;
  readonly hoursPending?: number;
  readonly delegatorName?: string | null;
  readonly delegationPeriod?: string | null;
}

export interface NotificationText {
  readonly title: string;
  readonly body: string;
}

function clip(value: string, max: number): string {
  const text = value.replace(/\s+/g, " ").trim();

  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

export function notificationText(input: NotificationTextInput): NotificationText {
  const label = input.requestLabel ?? "คำขอ";
  // Thai text does not use spaces, but a Latin label such as "คำขอ OT" must be separated from what follows.
  const spaced = /[A-Za-z0-9]$/.test(label) ? label + " " : label;
  const no = input.requestNo ? ` ${input.requestNo}` : "";
  const who = input.requesterName ? ` ของ ${input.requesterName}` : "";
  const summary = input.summary ? `\n${clip(input.summary, 160)}` : "";
  const comment = input.comment ? `\nเหตุผล/ความเห็น: ${clip(input.comment, 200)}` : "";

  switch (input.kind) {
    case "REQUEST_WAITING":
      return { title: `มี${spaced}รออนุมัติ${no}`, body: `มี${label}${no}${who} รอคุณพิจารณา${summary}` };
    case "REQUEST_APPROVED":
      return { title: `${spaced}อนุมัติแล้ว${no}`, body: `${label}${no} ของคุณได้รับการอนุมัติแล้ว${summary}` };
    case "REQUEST_REJECTED":
      return { title: `${spaced}ไม่ได้รับอนุมัติ${no}`, body: `${label}${no} ของคุณไม่ได้รับอนุมัติ${summary}${comment}` };
    case "REQUEST_REVISION":
      return {
        title: `${spaced}ถูกส่งกลับให้แก้ไข${no}`,
        body: `${label}${no} ของคุณถูกส่งกลับให้แก้ไข กรุณาแก้ไขแล้วส่งใหม่${summary}${comment}`,
      };
    case "REQUEST_WITHDRAWN":
      return {
        title: `${spaced}ถูกถอนการอนุมัติ${no}`,
        body: `${label}${no} ของคุณถูกถอนการอนุมัติโดยผู้ดูแลระดับสูง${summary}${comment}`,
      };
    case "APPROVAL_REMINDER":
      return {
        title: `เตือน: ${spaced}ค้างอนุมัติ${no}`,
        body: `${label}${no}${who} ค้างรอคุณพิจารณามาแล้ว ${Math.max(1, Math.floor(input.hoursPending ?? 24))} ชั่วโมง${summary}`,
      };
    case "DELEGATION_RECEIVED":
      return {
        title: "คุณได้รับมอบหมายให้อนุมัติแทน",
        body: `${input.delegatorName ?? "ผู้อนุมัติ"} มอบหมายให้คุณอนุมัติแทน${input.delegationPeriod ? ` ${input.delegationPeriod}` : ""}`,
      };
    case "ACCOUNT_APPROVED":
      return { title: "บัญชีได้รับการอนุมัติแล้ว", body: "✅ บัญชีของคุณได้รับการอนุมัติแล้ว เข้าสู่ระบบได้เลย" };
    case "NONE":
      return { title: "", body: "" };
  }
}

/** Working-hours window for reminders: Monday to Friday, 09:00 to 17:30 Bangkok (inputs already in Bangkok time). */
export function isReminderWindow(input: {
  readonly isoWeekday: number;
  readonly minutesOfDay: number;
  readonly isWorkday: boolean;
}): boolean {
  return input.isWorkday && input.minutesOfDay >= 9 * 60 && input.minutesOfDay < 17 * 60 + 30;
}

/** A step is due for a reminder after 24 hours pending, then every further 24 hours. */
export function isReminderDue(input: {
  readonly assignedAt: Date;
  readonly lastReminderAt: Date | null;
  readonly now: Date;
  readonly afterHours?: number;
  readonly repeatHours?: number;
}): boolean {
  const afterMs = (input.afterHours ?? 24) * 3_600_000;
  const repeatMs = (input.repeatHours ?? 24) * 3_600_000;
  const pendingMs = input.now.getTime() - input.assignedAt.getTime();

  if (pendingMs < afterMs) {
    return false;
  }

  return !input.lastReminderAt || input.now.getTime() - input.lastReminderAt.getTime() >= repeatMs;
}
