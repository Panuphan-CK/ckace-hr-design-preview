import type {
  ApprovalChainPreview,
  AnnouncementListResult,
  AttendanceSelfOverview,
  LeaveApprovalStepOptions,
  LeaveDurationCode,
  LeaveRequestView,
  LeaveSelfOverview,
  MedicalSelfOverview,
  OvertimeSelfOverview,
  RequestStatusItem,
  RequestTimeline,
  RequestStatusOverview,
  ApprovalHistoryOverview,
  SelfProfileResponse,
  TimeCorrectionRequestView,
} from "@ckace/contracts";

import { completeMedicalReceiptUploads, type MedicalReceiptProgress } from "../desktop/medical/medical-receipt-upload";
import type { LiffSession } from "./api";

/**
 * Host side of Project A's approved LIFF screens (the React app in /react-read, shown in an iframe).
 *
 * The screens only talk to their host through postMessage (CKACE_* messages). This file answers them with the
 * Project B API, so the look is Project A's and the rules are Project B's (the same API the Desktop uses).
 */

type Json = Record<string, unknown>;

const LEAVE_KEY: Readonly<Record<string, string>> = { ANNUAL: "Vacation", VACATION: "Vacation", SICK: "Sick", PERSONAL: "Personal" };
const DURATION_CODE: Readonly<Record<string, LeaveDurationCode>> = { F: "FULL_DAY", AM: "MORNING", PM: "AFTERNOON", H: "HOURLY" };
const DURATION_LETTER: Readonly<Record<string, string>> = { FULL_DAY: "F", MORNING: "AM", AFTERNOON: "PM", HOURLY: "H" };

type Status = "Pending" | "Approved" | "Rejected" | "Revise" | "Cancelled";
const STATUS: Readonly<Record<string, Status>> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REVISION_REQUESTED: "Revise",
  CANCELLED: "Cancelled",
};
const status = (value: string): Status => STATUS[value] ?? "Pending";

const bkk = (iso: string, withSeconds = true): string => {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  return withSeconds ? parts : parts.slice(0, 16);
};

class ApiError extends Error {
  constructor(message: string, readonly kind: "AUTH_EXPIRED" | "NETWORK_ERROR" | "BUSINESS_ERROR") {
    super(message);
  }
}

async function call<T>(method: "GET" | "POST", url: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError("ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่", "NETWORK_ERROR");
  }
  if (response.ok) return (await response.json().catch(() => ({}))) as T;
  if (response.status === 401) throw new ApiError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่", "AUTH_EXPIRED");
  if (response.status >= 500) throw new ApiError("ระบบขัดข้อง ยังไม่ทราบผล กรุณาตรวจสอบประวัติก่อนส่งซ้ำ", "NETWORK_ERROR");
  let message = response.status === 403 ? "บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้" : response.status === 409 ? "รายการนี้ถูกส่งหรือเปลี่ยนแปลงไปแล้ว กรุณาตรวจสอบประวัติ" : "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
  try {
    const parsed = (await response.json()) as { message?: unknown };
    if (typeof parsed.message === "string" && parsed.message.trim()) message = parsed.message;
  } catch {
    /* keep the generic text */
  }
  throw new ApiError(message, "BUSINESS_ERROR");
}

const get = <T>(url: string) => call<T>("GET", url);
const optional = async <T>(url: string): Promise<T | null> => {
  try {
    return await get<T>(url);
  } catch {
    return null;
  }
};

function failure(error: unknown, extra: Json = {}): Json {
  if (error instanceof ApiError) return { success: false, status: error.kind, errorCode: error.kind, message: error.message, refresh: "NOT_ATTEMPTED", ...extra };
  return { success: false, status: "BUSINESS_ERROR", errorCode: "BUSINESS_ERROR", message: error instanceof Error ? error.message : "ทำรายการไม่สำเร็จ", refresh: "NOT_ATTEMPTED", ...extra };
}

function sourceList<T>(items: readonly T[] | null, limit: number): { status: string; count: number; items: readonly T[] } | { status: string; count: number; items: readonly never[] } {
  if (items === null) return { status: "UNAVAILABLE_READ_ERROR", count: 0, items: [] };
  const cut = items.slice(0, limit);
  return { status: cut.length ? "LIVE_VERIFIED" : "EMPTY_VERIFIED", count: cut.length, items: cut };
}

interface Loaded {
  readonly profile: SelfProfileResponse | null;
  readonly leave: LeaveSelfOverview | null;
  readonly leaveOptions: readonly LeaveApprovalStepOptions[];
  readonly medical: MedicalSelfOverview | null;
  readonly overtime: OvertimeSelfOverview | null;
  readonly attendance: AttendanceSelfOverview | null;
  readonly corrections: readonly TimeCorrectionRequestView[] | null;
  readonly announcements: AnnouncementListResult | null;
  readonly chains: Readonly<Record<"leave" | "ot" | "medical" | "correction", readonly Json[]>>;
}

const chainFromPreview = (preview: ApprovalChainPreview | null): readonly Json[] =>
  preview && !preview.autoApproved ? preview.steps.map((step) => ({ order: step.stepOrder, name: step.approverName ?? "ผู้อนุมัติ", role: "ผู้อนุมัติ" })) : [];

async function load(nav: Readonly<Record<string, boolean>>): Promise<Loaded> {
  const [profile, leave, leaveOptions, medical, overtime, attendance, corrections, announcements, otChain, medChain, tcChain] = await Promise.all([
    optional<SelfProfileResponse>("/api/profile/me"),
    nav.leave ? optional<LeaveSelfOverview>("/api/leave/me") : Promise.resolve(null),
    nav.leave ? optional<readonly LeaveApprovalStepOptions[]>("/api/leave/approval-options") : Promise.resolve(null),
    nav.medical ? optional<MedicalSelfOverview>("/api/medical/me") : Promise.resolve(null),
    nav.overtime ? optional<OvertimeSelfOverview>("/api/overtime/me") : Promise.resolve(null),
    nav.attendance ? optional<AttendanceSelfOverview>("/api/attendance/me") : Promise.resolve(null),
    nav.attendance ? optional<readonly TimeCorrectionRequestView[]>("/api/attendance/time-corrections/me") : Promise.resolve(null),
    nav.announcements ? optional<AnnouncementListResult>("/api/announcements") : Promise.resolve(null),
    nav.overtime ? optional<ApprovalChainPreview>("/api/overtime/approval-chain") : Promise.resolve(null),
    nav.medical ? optional<ApprovalChainPreview>("/api/medical/approval-chain") : Promise.resolve(null),
    nav.attendance ? optional<ApprovalChainPreview>("/api/attendance/time-corrections/approval-chain") : Promise.resolve(null),
  ]);
  const options = leaveOptions ?? [];
  return {
    profile,
    leave,
    leaveOptions: options,
    medical,
    overtime,
    attendance,
    corrections,
    announcements,
    chains: {
      leave: options.map((step) => ({ order: step.stepOrder, name: step.candidates[0]?.displayName ?? "ผู้อนุมัติ", role: "ผู้อนุมัติ" })),
      ot: chainFromPreview(otChain),
      medical: chainFromPreview(medChain),
      correction: chainFromPreview(tcChain),
    },
  };
}

function capability(base: Json, enabled: boolean): Json {
  return { version: 1, source: "trusted-liff-host", transport: "postMessage", ...base, status: enabled ? "AVAILABLE" : "UNAVAILABLE", ...(enabled ? {} : { reason: "not_permitted" }) };
}

function leaveRow(request: LeaveRequestView): Json {
  return {
    id: shown(request.requestId, request.requestNo),
    leaveType: LEAVE_KEY[request.leaveTypeKey] ?? request.leaveTypeName,
    start: request.startDate,
    end: request.endDate,
    status: status(request.status),
    days: request.usageDays,
    reason: request.description,
    comment: request.decisionReason ?? "",
    hasAttachment: false,
  };
}

function buildPayload(loaded: Loaded, session: LiffSession): Json {
  const nav = session.navigation;
  const { profile, leave, medical, overtime, attendance, corrections, announcements } = loaded;

  const policies = (leave?.entitlements ?? [])
    .filter((item) => LEAVE_KEY[item.leaveTypeKey])
    .map((item) => ({ policyId: item.entitlementId, leaveType: LEAVE_KEY[item.leaveTypeKey]!, label: item.leaveTypeName, quota: item.quota, used: item.used, remaining: Math.max(0, item.remaining) }))
    .filter((item, index, all) => all.findIndex((other) => other.leaveType === item.leaveType) === index);

  const sourceStatus = { policies: "AVAILABLE", usage: "AVAILABLE" };
  const leaveRequests = leave
    ? sourceList(
        [...leave.requests].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).map(leaveRow),
        100,
      )
    : { status: "UNAVAILABLE_CONTRACT_MISSING", count: 0, items: [] };

  const attendanceRows = attendance
    ? sourceList(
        [...attendance.records]
          .sort((a, b) => b.workDate.localeCompare(a.workDate))
          .map((record) => ({ id: record.attendanceRecordId, checkIn: bkk(record.checkInAt), checkOut: record.checkOutAt ? bkk(record.checkOutAt) : "" })),
        30,
      )
    : { status: "UNAVAILABLE_CONTRACT_MISSING", count: 0, items: [] };

  const announcementRows = announcements
    ? sourceList(
        announcements.announcements.map((item) => ({
          id: item.id,
          text: (item.title ? `${item.title} · ` : "") + item.content,
          date: item.publishedAt ? bkk(item.publishedAt).slice(0, 10) : "",
          hasAttachment: item.hasAttachment,
        })),
        20,
      )
    : { status: "UNAVAILABLE_CONTRACT_MISSING", count: 0, items: [] };

  let benefits: Json = { status: "UNAVAILABLE_CONTRACT_MISSING", count: 0, items: [], medicalEntitlement: null };
  if (medical) {
    const entitlement = medical.entitlement;
    const committed = entitlement.approved + entitlement.committed;
    const otItems = (overtime?.requests ?? [])
      .filter((request) => request.status !== "CANCELLED" && request.segments.length > 0)
      .map((request) => {
        const first = [...request.segments].sort((a, b) => a.workDate.localeCompare(b.workDate))[0]!;
        const minutes = request.segments.reduce((sum, segment) => sum + segment.requestedMinutes, 0);
        return { id: shown(request.id, request.requestNo), kind: "ot", date: first.workDate, start: first.startTime, end: first.endTime, value: Math.max(0.01, Math.round((minutes / 60) * 100) / 100), status: status(request.status), reason: request.reason, comment: request.decisionReason ?? "", hasAttachment: false, at: request.submittedAt };
      });
    const medicalItems = medical.claims
      .filter((claim) => claim.status !== "CANCELLED" && claim.amount > 0)
      .map((claim) => ({ id: shown(claim.id, claim.requestNo), kind: "medical", date: claim.sicknessDate, value: claim.amount, status: status(claim.status), reason: claim.description, comment: claim.decisionReason ?? "", hasAttachment: claim.attachments.length > 0, at: claim.submittedAt }));
    const rows = [...otItems, ...medicalItems].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100).map((row) => { const { at: _unused, ...rest } = row; void _unused; return rest; });
    benefits = {
      status: rows.length ? "LIVE_VERIFIED" : "EMPTY_VERIFIED",
      count: rows.length,
      items: rows,
      medicalEntitlement: { annualLimit: entitlement.annualLimit, approved: entitlement.approved, committed, remaining: Math.max(0, Math.round((entitlement.annualLimit - committed) * 100) / 100) },
    };
  }

  const correctionRows = corrections
    ? sourceList(
        corrections
          .filter((item) => item.status !== "CANCELLED")
          .map((item) => ({
            id: item.requestId,
            date: item.attendanceDate,
            type: item.correctionType === "CHECK_OUT" ? "checkout" : "checkin",
            originalTime: item.originalTime,
            correctedTime: item.correctedTime,
            status: status(item.status),
            reason: item.reason,
            comment: item.decisionComment ?? "",
            hasAttachment: false,
          })),
        100,
      )
    : { status: "UNAVAILABLE_CONTRACT_MISSING", count: 0, items: [] };

  const role = profile?.roles.includes("SUPERADMIN") ? "SuperAdmin" : profile?.roles.includes("ADMIN") ? "Admin" : "Employee";
  return {
    accountState: "active",
    canApprove: Boolean(nav.approvals),
    leaveWrite: capability({ action: "leave" }, Boolean(nav.leave)),
    attendanceWrite: { ...capability({ actions: ["checkin", "checkout"] }, Boolean(nav.attendance)) },
    timeCorrectionWrite: capability({ action: "correction-submit" }, Boolean(nav.attendance)),
    otWrite: capability({ action: "benefit-submit", kind: "ot" }, Boolean(nav.overtime)),
    medicalWrite: capability({ action: "benefit-submit", kind: "medical" }, Boolean(nav.medical)),
    user: {
      uid: session.employeeId,
      fullname: profile?.fullName ?? "พนักงาน",
      nickname: profile?.nickname ?? "",
      role,
      agency: profile?.agency?.name ?? "",
      department: profile?.department?.name ?? "",
      startDate: profile?.employmentStart ?? "",
      birthDate: profile?.dateOfBirth ?? "",
    },
    policies,
    leaveDataStatus: sourceStatus,
    safeReadModel: {
      profile: { status: "LIVE_VERIFIED" },
      leaveEntitlements: { status: policies.length ? "LIVE_VERIFIED" : "EMPTY_VERIFIED", count: policies.length, sourcePolicyCount: policies.length, sourceStatus },
      avatar: { status: "UNAVAILABLE_CONTRACT_MISSING", reason: "avatar_contract_missing" },
    },
    lightweightBootstrap: false,
    approvalChains: loaded.chains,
    selfRead: { leaveRequests },
    secondaryRead: { attendance: attendanceRows, announcements: announcementRows, benefits, correctionHistory: correctionRows },
  };
}

// ---------- approvals ----------

const APPROVAL_TYPE: Readonly<Record<string, string>> = { LEAVE: "leave", OVERTIME: "ot", MEDICAL: "medical", TIME_CORRECTION: "time-edit" };
const APPROVAL_TITLE: Readonly<Record<string, string>> = { LEAVE: "คำขอลา", OVERTIME: "ขออนุมัติ OT", MEDICAL: "เบิกค่ารักษาพยาบาล", TIME_CORRECTION: "ขอแก้ไขเวลาเข้า–ออก" };
/** Screens show the running number (LEV-0001); writes need the real id behind it. */
const ids = new Map<string, string>();
const shown = (id: string, requestNo: string | undefined): string => {
  if (!requestNo) return id;
  ids.set(requestNo, id);
  return requestNo;
};
const real = (id: string): string => ids.get(id) ?? id;
const thaiDay = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${Number(iso.slice(0, 4)) + 543}`;
const hours = (minutes: number): string => `${Math.round((minutes / 60) * 100) / 100} ชม.`;
const trim = (value: string, max: number) => value.trim().slice(0, max);

function approvalRow(item: RequestStatusItem, decided?: { decision: "APPROVED" | "REJECTED"; comment: string | null; decidedAt: string }): Json {
  const canDecide = !decided && item.canDecide && Boolean(item.approvalStepId);
  const summary = trim(item.summary || item.requestNo, 300) || item.requestNo;
  const details: { label: string; value: string }[] = [{ label: "เลขที่คำขอ", value: item.requestNo }, { label: "รายละเอียด", value: summary }];
  if (item.leave) {
    const { startDate, endDate, durationCode } = item.leave;
    details.push({ label: "วันที่", value: startDate === endDate ? thaiDay(startDate) : `${thaiDay(startDate)} - ${thaiDay(endDate)}` });
    details.push({ label: "จำนวน", value: durationCode === "FULL_DAY" ? (startDate === endDate ? "1 วัน" : "หลายวัน") : durationCode === "HOURLY" ? "รายชั่วโมง" : "ครึ่งวัน" });
  }
  if (item.overtime && item.overtime.segments.length > 0) {
    const first = item.overtime.segments[0];
    const last = item.overtime.segments[item.overtime.segments.length - 1];
    if (first && last) {
      details.push({ label: "วันที่", value: first.workDate === last.workDate ? thaiDay(first.workDate) : `${thaiDay(first.workDate)} - ${thaiDay(last.workDate)}` });
      details.push({ label: "ช่วงเวลา", value: `${first.startTime}-${first.endTime}` });
      details.push({ label: "จำนวนชั่วโมง", value: hours(item.overtime.segments.reduce((sum, segment) => sum + segment.requestedMinutes, 0)) });
    }
  }
  if (item.medical) {
    details.push({ label: "ยอดเบิก", value: `${item.medical.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท` }, { label: "วันที่รักษา", value: item.medical.sicknessDate });
  }
  const attachmentCount = Math.min(10, item.medical?.attachmentIds.length ?? 0);
  const st = decided ? (decided.decision === "APPROVED" ? "Approved" : "Rejected") : "Pending";
  return {
    id: shown(item.id, item.requestNo),
    type: APPROVAL_TYPE[item.kind] ?? "leave",
    title: APPROVAL_TITLE[item.kind] ?? item.requestNo,
    employee: trim(item.employeeDisplayName ?? "พนักงาน", 180) || "พนักงาน",
    employeeRole: "พนักงาน",
    submitted: bkk(item.submittedAt, false),
    summary,
    status: st,
    step: canDecide ? "รอคุณพิจารณา" : st,
    stepId: canDecide ? item.approvalStepId ?? "" : "",
    details: details.slice(0, 12),
    chain: canDecide ? [{ label: "ขั้นตอนปัจจุบัน", status: "current" }] : [],
    ...(attachmentCount > 0 ? { attachment: "ใบเสร็จ", attachmentAvailable: true, attachmentCount } : { attachmentAvailable: false, attachmentCount: 0 }),
    decisionNote: trim(decided?.comment ?? "", 300),
    canDecide,
    ...(item.kind === "TIME_CORRECTION" ? { editKind: "Check-in" } : {}),
  };
}

async function loadApprovals(): Promise<Json> {
  const [assigned, decided] = await Promise.all([
    get<RequestStatusOverview>("/api/requests/assigned"),
    optional<ApprovalHistoryOverview>("/api/requests/assigned/history"),
  ]);
  const pending = assigned.requests.filter((item) => item.canDecide && item.approvalStepId).map((item) => approvalRow(item));
  const history = (decided?.decisions ?? [])
    .slice(0, 100)
    .map((row) =>
      approvalRow(
        { id: row.requestId, requestNo: row.requestNo, kind: row.kind, status: row.decision, submittedAt: row.submittedAt, summary: row.summary, decisionReason: row.comment, employeeId: row.employeeId, ...(row.employeeDisplayName ? { employeeDisplayName: row.employeeDisplayName } : {}), canDecide: false, approvalStepId: null, stepOrder: row.stepOrder },
        { decision: row.decision, comment: row.comment, decidedAt: row.decidedAt },
      ),
    );
  const rows = [...pending, ...history].slice(0, 200);
  return { success: true, status: rows.length ? "LIVE_VERIFIED" : "EMPTY_VERIFIED", requests: rows };
}

// ---------- the bridge ----------

export interface Bridge {
  readonly stop: () => void;
  /** Fetch fresh data and push the bootstrap payload into the frame. */
  readonly deliver: () => Promise<void>;
}

interface Hooks {
  /** Load a different screen in the frame. */
  readonly navigate: (page: string) => void;
}

const dataUrlToFile = async (name: string, type: string, dataUrl: string): Promise<File> => new File([await (await fetch(dataUrl)).blob()], name, { type, lastModified: Date.now() });

export function startBridge(frame: HTMLIFrameElement, session: LiffSession, hooks: Hooks): Bridge {
  const nav = session.navigation;
  const seen = new Set<string>();
  const busy = new Set<string>();
  const medicalProgress = new Map<string, MedicalReceiptProgress>();
  let cache: Loaded | null = null;

  const reply = (type: string, requestId: string, result: unknown) => frame.contentWindow?.postMessage({ type, requestId, result }, window.location.origin);

  async function deliver(): Promise<void> {
    cache = await load(nav);
    frame.contentWindow?.postMessage({ type: "CKACE_PRODUCTION_BOOTSTRAP", payload: buildPayload(cache, session) }, window.location.origin);
  }
  const refresh = () => deliver().catch(() => undefined);

  /** Run one write with transport-level dedupe + single-flight, then answer the frame. */
  async function write(lane: string, responseType: string, requestId: string, run: () => Promise<Json>) {
    if (seen.has(requestId)) return reply(responseType, requestId, { success: false, status: "BUSINESS_ERROR", message: "คำสั่งนี้ถูกส่งไปแล้ว" });
    seen.add(requestId);
    if (seen.size > 300) seen.delete(seen.values().next().value as string);
    if (busy.has(lane)) return reply(responseType, requestId, { success: false, status: "NETWORK_ERROR", message: "กำลังบันทึก กรุณารอสักครู่" });
    busy.add(lane);
    try {
      const result = await run();
      reply(responseType, requestId, result);
      if (result.success === true) void refresh();
    } catch (error) {
      reply(responseType, requestId, failure(error));
    } finally {
      busy.delete(lane);
    }
  }

  const leaveApprovers = (): string[] => (cache?.leaveOptions ?? []).map((step) => step.candidates[0]?.employeeId ?? "");

  async function onLeave(data: Json) {
    const input = data.input as Json;
    await write("leave", "CKACE_LEAVE_WRITE_RESPONSE", String(data.requestId), async () => {
      const approverEmployeeIds = leaveApprovers();
      if (approverEmployeeIds.length === 0 || approverEmployeeIds.some((id) => !id)) throw new ApiError("ยังไม่พบสายการอนุมัติของคุณ กรุณาติดต่อฝ่ายบุคคล", "BUSINESS_ERROR");
      const duration = DURATION_CODE[String(input.duration)] ?? "FULL_DAY";
      const result = await call<{ requestId?: string }>("POST", "/api/leave/requests", {
        clientKey: input.clientKey,
        entitlementId: input.policyId,
        description: input.description,
        startDate: input.startDate,
        endDate: duration === "FULL_DAY" ? input.endDate : input.startDate,
        durationCode: duration,
        startTime: duration === "HOURLY" ? input.startTime : null,
        endTime: duration === "HOURLY" ? input.endTime : null,
        approverEmployeeIds,
      });
      return { success: true, status: "SUCCESS", message: "ส่งคำขอลาสำเร็จ", requestId: result.requestId ?? "", refresh: "STALE" };
    });
  }

  async function onResubmit(data: Json) {
    const input = data.input as Json;
    await write("leave", "CKACE_LEAVE_RESUBMIT_RESPONSE", String(data.requestId), async () => {
      const duration = DURATION_CODE[String(input.leaveDuration)] ?? "FULL_DAY";
      await call("POST", `/api/leave/requests/${encodeURIComponent(real(String(input.requestId)))}/resubmit`, {
        description: input.description,
        startDate: input.dateStart,
        endDate: input.dateEnd,
        durationCode: duration,
        startTime: duration === "HOURLY" ? input.startTime : null,
        endTime: duration === "HOURLY" ? input.endTime : null,
        clientKey: input.clientKey,
      });
      return { success: true, status: "Pending", message: "ยื่นใบลาที่แก้ไขแล้ว" };
    });
  }

  async function onWithdraw(kind: "leave" | "ot" | "medical", data: Json) {
    const id = encodeURIComponent(real(String((data.input as Json).requestId)));
    const path = kind === "leave" ? `/api/leave/requests/${id}/cancel` : kind === "ot" ? `/api/overtime/requests/${id}/cancel` : `/api/medical/claims/${id}/cancel`;
    await write(`${kind}-cancel`, `CKACE_${kind.toUpperCase()}_WITHDRAW_RESPONSE`, String(data.requestId), async () => {
      await call("POST", path);
      return { success: true, status: kind === "medical" ? "Deleted" : "Cancelled", message: "ยกเลิกคำขอแล้ว" };
    });
  }

  async function onOt(data: Json) {
    const input = data.input as Json;
    await write("ot", "CKACE_OT_WRITE_RESPONSE", String(data.requestId), async () => {
      const result = await call<{ requests: { id: string }[] }>("POST", "/api/overtime/requests", {
        startDate: input.date,
        endDate: input.date,
        startTime: input.start,
        endTime: input.end,
        reason: input.reason,
        breaks: [],
        clientKey: input.clientKey,
      });
      return { success: true, status: "SUCCESS", message: "ส่งคำขอ OT สำเร็จ", requestId: result.requests[0]?.id ?? "", refresh: "STALE" };
    });
  }

  async function onMedical(data: Json) {
    const input = data.input as Json;
    await write("medical", "CKACE_MEDICAL_WRITE_RESPONSE", String(data.requestId), async () => {
      const clientKey = String(input.clientKey);
      const files = await Promise.all((input.uploadedFiles as Json[]).map((file) => dataUrlToFile(String(file.filename), String(file.filetype), String(file.imageDataUrl))));
      const progress = medicalProgress.get(clientKey) ?? { signature: clientKey, receipts: [] };
      medicalProgress.set(clientKey, progress);
      const attachmentIds = await completeMedicalReceiptUploads(files, progress);
      const result = await call<{ claim: { id: string; amount: number } }>("POST", "/api/medical/claims", {
        sicknessDate: input.date,
        amount: input.amount,
        description: input.reason,
        attachmentIds,
        leaveRequestId: null,
        clientKey,
      });
      medicalProgress.delete(clientKey);
      return { success: true, status: "SUCCESS", message: "ส่งคำขอเบิกค่ารักษาสำเร็จ", requestId: result.claim.id, value: result.claim.amount, refresh: "STALE" };
    });
  }

  async function onAttendance(data: Json) {
    const input = data.input as Json;
    const action = data.action === "checkout" ? "check-out" : "check-in";
    await write("attendance", "CKACE_ATTENDANCE_WRITE_RESPONSE", String(data.requestId), async () => {
      const today = await get<AttendanceSelfOverview>("/api/attendance/me");
      const body: Json = { latitude: input.latitude, longitude: input.longitude, accuracyMeters: 15, clientKey: input.clientKey };
      if (action === "check-out") {
        if (!today.currentAttendanceRecordId) throw new ApiError("ไม่พบข้อมูลการเข้างาน", "BUSINESS_ERROR");
        body.attendanceRecordId = today.currentAttendanceRecordId;
      }
      await call("POST", action === "check-in" ? "/api/attendance/check-in" : "/api/attendance/check-out", body);
      return { success: true, status: "SUCCESS", message: action === "check-in" ? "บันทึกเวลาเข้างานสำเร็จ" : "บันทึกเวลาออกงานสำเร็จ", action: data.action, refresh: "STALE" };
    });
  }

  async function onCorrection(data: Json) {
    const input = data.input as Json;
    await write("correction", "CKACE_TIME_CORRECTION_WRITE_RESPONSE", String(data.requestId), async () => {
      const mine = await get<AttendanceSelfOverview>("/api/attendance/me");
      const record = mine.records.find((item) => item.workDate === input.date);
      if (!record) throw new ApiError("ไม่พบบันทึกลงเวลาของวันที่เลือก (ถ้าลืมลงเวลาทั้งวัน ให้แจ้งผ่านเว็บ Desktop)", "BUSINESS_ERROR");
      const result = await call<{ requestId: string }>("POST", "/api/attendance/time-corrections", {
        attendanceRecordId: record.attendanceRecordId,
        correctionType: input.type === "checkout" ? "CHECK_OUT" : "CHECK_IN",
        correctedTime: input.correctedTime,
        reason: input.reason,
        clientKey: input.clientKey,
      });
      return { success: true, status: "SUCCESS", message: "ส่งคำขอแก้ไขเวลาสำเร็จ", requestId: result.requestId, refresh: "STALE" };
    });
  }

  async function onApproval(data: Json) {
    const requestId = String(data.requestId);
    const respond = (result: unknown) => reply("CKACE_APPROVAL_RESPONSE", requestId, result);
    if (!nav.approvals) return respond({ success: false, status: "UNAVAILABLE", message: "ไม่มีสิทธิ์เข้าถึงงานอนุมัติ" });
    if (data.action === "load") {
      try {
        return respond(await loadApprovals());
      } catch (error) {
        return respond(failure(error));
      }
    }
    if (data.action !== "decision") return;
    const input = (data.input ?? {}) as Json;
    const decision = input.decision === "Approved" ? "APPROVED" : input.decision === "Rejected" ? "REJECTED" : input.decision === "Revise" ? "REVISION_REQUESTED" : "";
    const comment = trim(String(input.comment ?? ""), 1000);
    if (!decision || (decision !== "APPROVED" && !comment)) return respond({ success: false, status: "BUSINESS_ERROR", message: "ข้อมูลการอนุมัติไม่ถูกต้อง" });
    if (seen.has(requestId) || busy.has("approval")) return respond({ success: false, status: "BUSINESS_ERROR", message: "กำลังบันทึกหรือส่งคำสั่งนี้ไปแล้ว" });
    seen.add(requestId);
    busy.add("approval");
    try {
      const fresh = (await get<RequestStatusOverview>("/api/requests/assigned")).requests.find((item) => item.id === real(String(input.id)) && item.canDecide && item.approvalStepId);
      if (!fresh) throw new ApiError("สถานะคำขอเปลี่ยนแล้ว หรือยังไม่ถึงขั้นตอนของคุณ กรุณารีเฟรช", "BUSINESS_ERROR");
      const id = encodeURIComponent(fresh.id);
      const url = fresh.kind === "LEAVE" ? `/api/leave/requests/${id}/decision` : fresh.kind === "TIME_CORRECTION" ? `/api/attendance/time-corrections/${id}/decision` : fresh.kind === "OVERTIME" ? `/api/overtime/requests/${id}/decision` : `/api/medical/claims/${id}/decision`;
      await call("POST", url, fresh.kind === "LEAVE" ? { approvalStepId: fresh.approvalStepId, decision, comment: comment || null } : { decision, comment });
      respond({ success: true, status: "SUCCESS", message: decision === "APPROVED" ? "อนุมัติคำขอแล้ว" : decision === "REJECTED" ? "บันทึกการไม่อนุมัติแล้ว" : "ส่งกลับให้แก้ไขแล้ว", requestId: String(input.id) });
      void refresh();
    } catch (error) {
      respond(failure(error));
    } finally {
      busy.delete("approval");
    }
  }

  async function onHistory(data: Json) {
    const requestId = String(data.requestId);
    const respond = (result: unknown) => reply("CKACE_HISTORY_RESPONSE", requestId, result);
    if (data.kind !== "leave" && typeof data.id === "string" && (data.kind === "ot" || data.kind === "medical")) {
      if (data.fileIndex !== undefined) return respond({ success: false, message: "ไม่พบเอกสารแนบ" });
      try {
        const id = real(data.id);
        const timeline = await get<RequestTimeline>(`/api/requests/timeline/${encodeURIComponent(id)}`);
        const own = data.kind === "ot" ? cache?.overtime?.requests.find((item) => item.id === id) : cache?.medical?.claims.find((item) => item.id === id);
        if (!own) throw new Error("ไม่พบคำขอที่คุณมีสิทธิ์อ่าน");
        const firstPending = timeline.steps.findIndex((step) => step.status === "PENDING");
        const view = own as { status: string; decisionReason: string | null; reason?: string; description?: string };
        return respond({
          success: true,
          detail: {
            status: status(view.status),
            reason: trim(view.reason ?? view.description ?? "", 1000),
            comment: trim(view.decisionReason ?? "", 1000),
            currentStep: firstPending >= 0 ? `ขั้นที่ ${timeline.steps[firstPending]!.stepOrder}` : "",
            chain: timeline.steps.slice(0, 10).map((step, index) => ({
              order: step.stepOrder,
              name: trim(step.approverName ?? "ผู้อนุมัติ", 120),
              role: step.status === "SKIPPED" ? "ข้ามขั้น" : "ผู้อนุมัติ",
              status: step.status === "SKIPPED" ? "Approved" : status(step.status),
              current: view.status === "PENDING" && index === firstPending,
              comment: step.comment ?? "",
            })),
            files: [],
          },
        });
      } catch (error) {
        return respond({ success: false, message: error instanceof Error ? error.message : "ไม่สามารถอ่านรายละเอียดได้" });
      }
    }
    if (data.kind !== "leave" || typeof data.id !== "string") return respond({ success: false, message: "รายละเอียดคำขอประเภทนี้ยังไม่พร้อมใช้งาน" });
    if (data.fileIndex !== undefined) return respond({ success: false, message: "ไม่พบเอกสารแนบ" });
    try {
      const overview = await get<LeaveSelfOverview>("/api/leave/me");
      const request = overview.requests.find((item) => item.requestId === real(data.id as string));
      if (!request) throw new Error("ไม่พบคำขอที่คุณมีสิทธิ์อ่าน");
      const stepStatus = (value: string): Status => (value === "SKIPPED" ? "Approved" : status(value));
      const firstPending = request.steps.findIndex((step) => step.status === "PENDING");
      const chain = request.steps.slice(0, 10).map((step, index) => ({
        order: step.stepOrder,
        name: trim(step.approverName ?? "ผู้อนุมัติ", 120),
        role: step.status === "SKIPPED" ? "ข้ามขั้น" : "ผู้อนุมัติ",
        status: stepStatus(step.status),
        current: request.status === "PENDING" && index === firstPending,
        comment: step.comment ?? "",
      }));
      const letter = DURATION_LETTER[request.durationCode] ?? "F";
      const detail: Json = {
        status: status(request.status),
        reason: trim(request.description, 1000),
        comment: trim(request.decisionReason ?? "", 1000),
        currentStep: firstPending >= 0 ? `ขั้นที่ ${request.steps[firstPending]!.stepOrder}` : "",
        chain,
        files: [],
      };
      if (request.status === "REVISION_REQUESTED") {
        const entitlement = overview.entitlements.find((item) => item.leaveTypeKey === request.leaveTypeKey);
        detail.leaveEdit = {
          description: trim(request.description, 1000),
          startDate: request.startDate,
          endDate: request.endDate,
          policyId: entitlement?.entitlementId ?? "",
          leaveType: LEAVE_KEY[request.leaveTypeKey] ?? request.leaveTypeName,
          leaveDuration: letter,
          startTime: request.startTime ?? "",
          endTime: request.endTime ?? "",
          policies: overview.entitlements.filter((item) => LEAVE_KEY[item.leaveTypeKey]).map((item) => ({ policyId: item.entitlementId, leaveType: LEAVE_KEY[item.leaveTypeKey]!, remaining: item.remaining, quota: item.quota })),
        };
      }
      respond({ success: true, detail });
    } catch (error) {
      respond({ success: false, message: error instanceof Error ? error.message : "ไม่สามารถอ่านรายละเอียดได้" });
    }
  }

  const handlers: Readonly<Record<string, (data: Json) => Promise<void> | void>> = {
    CKACE_LEAVE_WRITE_REQUEST: onLeave,
    CKACE_LEAVE_RESUBMIT_REQUEST: onResubmit,
    CKACE_LEAVE_WITHDRAW_REQUEST: (data) => onWithdraw("leave", data),
    CKACE_OT_WRITE_REQUEST: onOt,
    CKACE_OT_WITHDRAW_REQUEST: (data) => onWithdraw("ot", data),
    CKACE_MEDICAL_WRITE_REQUEST: onMedical,
    CKACE_MEDICAL_WITHDRAW_REQUEST: (data) => onWithdraw("medical", data),
    CKACE_ATTENDANCE_WRITE_REQUEST: onAttendance,
    CKACE_TIME_CORRECTION_WRITE_REQUEST: onCorrection,
    CKACE_APPROVAL_REQUEST: onApproval,
    CKACE_HISTORY_REQUEST: onHistory,
    CKACE_HOST_NAVIGATE: (data) => {
      if (data.action === "approval" && nav.approvals) hooks.navigate("approvals");
    },
  };

  const listener = (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
    const data = event.data as Json | null;
    if (!data || typeof data !== "object" || typeof data.type !== "string") return;
    const handler = handlers[data.type];
    if (!handler) return;
    if (data.type !== "CKACE_HOST_NAVIGATE" && (typeof data.requestId !== "string" || !data.requestId || data.requestId.length > 160)) return;
    void handler(data);
  };

  window.addEventListener("message", listener);
  return { stop: () => window.removeEventListener("message", listener), deliver };
}
