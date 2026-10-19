"use client";

import type {
  LeaveApprovalStepOptions,
  LeaveDurationCode,
  LeaveEntitlementView,
  LeaveRequestStatus,
  LeaveRequestView,
  LeaveSelfOverview,
} from "@ckace/contracts";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  resolveSubmissionIntent,
  shouldDiscardSubmissionIntent,
  type SubmissionIntent,
} from "../submission-intent";
import { DateField, DatePicker } from "../ui/date-picker";
import { addHours, isoToDmy, thaiDateRange, thaiDateTime } from "../ui/format";
import { Icon, type IconName } from "../ui/icons";

type PageState =
  | { status: "loading" }
  | {
      status: "ready";
      overview: LeaveSelfOverview;
      approvalOptions: readonly LeaveApprovalStepOptions[];
    }
  | { status: "error"; message: string };

type Tone = "leave" | "sick" | "biz" | "gray";
type HistoryFilter = "ALL" | "PENDING" | "REVISION_REQUESTED" | "APPROVED" | "REJECTED";

const STATUS: Readonly<Record<LeaveRequestStatus, { label: string; tone: string }>> = {
  PENDING: { label: "รออนุมัติ", tone: "wait" },
  REVISION_REQUESTED: { label: "รอแก้ไข", tone: "back" },
  APPROVED: { label: "อนุมัติ", tone: "ok" },
  REJECTED: { label: "ไม่อนุมัติ", tone: "bad" },
  CANCELLED: { label: "ยกเลิก", tone: "muted" },
};

const FILTERS: readonly { id: HistoryFilter; label: string }[] = [
  { id: "ALL", label: "ทั้งหมด" },
  { id: "PENDING", label: "รออนุมัติ" },
  { id: "REVISION_REQUESTED", label: "รอแก้ไข" },
  { id: "APPROVED", label: "อนุมัติ" },
  { id: "REJECTED", label: "ไม่อนุมัติ" },
];

const DURATION_LABEL: Readonly<Record<LeaveDurationCode, string>> = {
  FULL_DAY: "เต็มวัน",
  MORNING: "ครึ่งเช้า",
  AFTERNOON: "ครึ่งบ่าย",
  HOURLY: "รายชั่วโมง",
};

const DURATIONS: readonly LeaveDurationCode[] = ["FULL_DAY", "MORNING", "AFTERNOON", "HOURLY"];

function toneOf(leaveTypeKey: string): Tone {
  const key = leaveTypeKey.toUpperCase();
  if (key.includes("SICK")) return "sick";
  if (key.includes("VACATION") || key.includes("ANNUAL")) return "leave";
  if (key.includes("PERSONAL") || key.includes("BUSINESS") || key.includes("ERRAND")) return "biz";
  return "gray";
}

const TONE_ICON: Readonly<Record<Tone, IconName>> = {
  leave: "leave",
  sick: "sick",
  biz: "biz",
  gray: "calendar",
};

function errorMessage(status: number): string {
  if (status === 401) return "หมดเวลาการเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่";
  if (status === 403) return "บัญชีนี้ไม่มีสิทธิ์ใช้งานเมนูการลา";
  if (status === 409) return "รายการคำขอลาซ้ำหรือสถานะเปลี่ยนแล้ว กรุณารีเฟรช";
  if (status === 503) return "ระบบการลายังไม่เปิดใช้งานในตอนนี้";
  return "ไม่สามารถโหลดข้อมูลการลาได้ กรุณาลองใหม่อีกครั้ง";
}

/** Turns the server's 400 reason into Thai; falls back to the status-based message. */
async function submitErrorMessage(response: Response): Promise<string> {
  if (response.status === 400) {
    const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
    const reason = typeof body?.message === "string" ? body.message : "";
    if (reason === "Leave entitlement exceeded") return "วันลาเกินสิทธิคงเหลือ (นับรวมใบลาที่รออนุมัติอยู่แล้ว)";
    if (reason.startsWith("Leave entitlement is unavailable")) return "ประเภทการลานี้ใช้ไม่ได้ในช่วงวันที่เลือก";
    if (reason === "Leave request must consume positive leave quota") return "ช่วงวันที่เลือกไม่มีวันทำงาน กรุณาเลือกใหม่";
    if (reason.startsWith("Selected approver")) return "ผู้อนุมัติที่เลือกไม่ถูกต้อง กรุณาเลือกใหม่";
    if (/overlaps another/i.test(reason)) return "มีใบลาอื่นในช่วงวันเดียวกันอยู่แล้ว";
    if (/end date must not precede/i.test(reason)) return "วันสิ้นสุดต้องไม่ก่อนวันเริ่ม";
    if (/No leave entitlement is available for year/i.test(reason)) return "ยังไม่มีสิทธิ์ลาของปีที่เลือก";
    if (/across New Year/i.test(reason)) return "ลาข้ามปีต้องเป็นแบบเต็มวัน และไม่เกิน 2 ปีปฏิทิน";
    if (/No eligible .*approver/i.test(reason)) return "ยังไม่พบผู้อนุมัติ กรุณาติดต่อฝ่ายบุคคล";
    return "ข้อมูลใบลาไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
  }
  return errorMessage(response.status);
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error(errorMessage(response.status));
  return response.json() as Promise<T>;
}

const STEP_LABEL: Readonly<Record<LeaveRequestView["steps"][number]["status"], string>> = {
  PENDING: "รอพิจารณา",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
  REVISION_REQUESTED: "ส่งกลับให้แก้ไข",
  SKIPPED: "ข้ามขั้น",
  CANCELLED: "ยกเลิก",
};

function amountLabel(request: LeaveRequestView): string {
  if (request.durationCode === "HOURLY" && request.startTime && request.endTime) {
    return `${request.startTime} ถึง ${request.endTime}`;
  }
  return `${request.usageDays} วัน`;
}

export default function LeaveDesktopPage() {
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const createIntent = useRef<SubmissionIntent | null>(null);
  const [actionMessage, setActionMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [entitlementId, setEntitlementId] = useState("");
  const [duration, setDuration] = useState<LeaveDurationCode>("FULL_DAY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("13:00");
  const [hours, setHours] = useState(1);
  const [filter, setFilter] = useState<HistoryFilter>("ALL");
  const [detail, setDetail] = useState<LeaveRequestView | null>(null);
  const [revision, setRevision] = useState<{ description: string; startDate: string; endDate: string } | null>(null);
  const resubmitIntent = useRef<SubmissionIntent | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const [overview, approvalOptions] = await Promise.all([
        getJson<LeaveSelfOverview>("/api/leave/me"),
        getJson<readonly LeaveApprovalStepOptions[]>("/api/leave/approval-options").catch(() => [] as readonly LeaveApprovalStepOptions[]),
      ]);
      setState({ status: "ready", overview, approvalOptions });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลการลาได้",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setRevision(null);
    resubmitIntent.current = null;
    if (!detail) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetail(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [detail]);

  const entitlements = state.status === "ready" ? state.overview.entitlements : [];
  const selected: LeaveEntitlementView | undefined = entitlements.find((item) => item.entitlementId === entitlementId);
  const holidaySet = useMemo(() => new Set(state.status === "ready" ? state.overview.holidays : []), [state]);
  const workingWeekdays = useMemo(
    () => new Set(state.status === "ready" ? state.overview.workingWeekdays : [1, 2, 3, 4, 5]),
    [state],
  );
  const isNonWorkingDay = useCallback(
    (iso: string) => {
      const weekday = new Date(iso + "T00:00:00.000Z").getUTCDay() || 7;
      return !workingWeekdays.has(weekday) || holidaySet.has(iso);
    },
    [holidaySet, workingWeekdays],
  );
  function workingDaysBetween(from: string, to: string): number {
    if (!from) return 0;
    let count = 0;
    for (let cursor = new Date(from + "T00:00:00.000Z"); cursor <= new Date((to || from) + "T00:00:00.000Z"); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      if (!isNonWorkingDay(cursor.toISOString().slice(0, 10))) count += 1;
    }
    return count;
  }
  const endTime = duration === "HOURLY" ? addHours(startTime, hours) : "";
  // Client-side estimate matching the server rule (8 hours = 1 day; half day = 0.5 per working day).
  // The server still re-checks with company holidays and rejects anything over quota.
  const estimateDays =
    duration === "HOURLY"
      ? endTime
        ? Math.round((hours / 8) * 1000) / 1000
        : 0
      : duration === "FULL_DAY"
        ? workingDaysBetween(startDate, endDate || startDate)
        : workingDaysBetween(startDate, startDate) * 0.5;
  const overQuota = Boolean(selected && startDate && estimateDays > selected.remaining + 1e-9);

  const requests = useMemo(() => {
    if (state.status !== "ready") return [];
    return [...state.overview.requests].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }, [state]);

  const filtered = filter === "ALL" ? requests : requests.filter((request) => request.status === filter);

  function resetForm(form: HTMLFormElement) {
    form.reset();
    setEntitlementId("");
    setDuration("FULL_DAY");
    setStartDate("");
    setEndDate("");
    setStartTime("13:00");
    setHours(1);
  }

  async function submitLeave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status !== "ready" || submitting) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    if (!entitlementId) {
      setActionMessage({ kind: "error", text: "กรุณาเลือกประเภทการลา" });
      return;
    }
    if (!startDate) {
      setActionMessage({ kind: "error", text: "กรุณาเลือกวันที่ลา" });
      return;
    }
    if (overQuota && selected) {
      setActionMessage({ kind: "error", text: `วันลาเกินสิทธิคงเหลือ ${selected.leaveTypeName} เหลือ ${selected.remaining} วัน` });
      return;
    }
    if (duration === "HOURLY" && !endTime) {
      setActionMessage({ kind: "error", text: "เวลาลารายชั่วโมงต้องจบภายในวันเดียวกัน" });
      return;
    }
    const approverEmployeeIds = state.approvalOptions.map((step) => String(data.get(`approver-${step.stepOrder}`) ?? ""));
    const payload = {
      entitlementId,
      description: String(data.get("description") ?? ""),
      startDate,
      endDate: duration === "FULL_DAY" ? endDate || startDate : startDate,
      durationCode: duration,
      startTime: duration === "HOURLY" ? startTime : null,
      endTime: duration === "HOURLY" ? endTime : null,
      approverEmployeeIds,
    };
    createIntent.current = resolveSubmissionIntent(createIntent.current, payload);
    setSubmitting(true);
    setActionMessage(null);
    try {
      const response = await fetch("/api/leave/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ...payload, clientKey: createIntent.current.clientKey }),
      });
      if (!response.ok) {
        if (shouldDiscardSubmissionIntent(response.status)) createIntent.current = null;
        throw new Error(await submitErrorMessage(response));
      }
      createIntent.current = null;
      resetForm(form);
      setActionMessage({ kind: "success", text: "ส่งใบลาเรียบร้อยแล้ว หัวหน้าจะได้รับแจ้งเตือน" });
      await load();
    } catch (error) {
      setActionMessage({ kind: "error", text: error instanceof Error ? error.message : "ส่งใบลาไม่สำเร็จ" });
    } finally {
      setSubmitting(false);
    }
  }

  async function resubmitRequest(request: LeaveRequestView) {
    if (!revision || submitting) return;
    if (!revision.description.trim()) {
      setActionMessage({ kind: "error", text: "กรุณาระบุเหตุผลการลา" });
      return;
    }
    const payload = {
      description: revision.description.trim(),
      startDate: revision.startDate,
      endDate: request.durationCode === "FULL_DAY" ? revision.endDate || revision.startDate : revision.startDate,
      durationCode: request.durationCode,
      startTime: request.startTime,
      endTime: request.endTime,
    };
    resubmitIntent.current = resolveSubmissionIntent(resubmitIntent.current, { requestId: request.requestId, ...payload });
    setSubmitting(true);
    setActionMessage(null);
    try {
      const response = await fetch(`/api/leave/requests/${encodeURIComponent(request.requestId)}/resubmit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ...payload, clientKey: resubmitIntent.current.clientKey }),
      });
      if (!response.ok) {
        if (shouldDiscardSubmissionIntent(response.status)) resubmitIntent.current = null;
        throw new Error(await submitErrorMessage(response));
      }
      resubmitIntent.current = null;
      setDetail(null);
      setRevision(null);
      setActionMessage({ kind: "success", text: "ส่งใบลาที่แก้ไขแล้วกลับไปให้ผู้อนุมัติเรียบร้อยแล้ว" });
      await load();
    } catch (error) {
      setActionMessage({ kind: "error", text: error instanceof Error ? error.message : "ส่งใบลาที่แก้ไขไม่สำเร็จ" });
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRequest(requestId: string) {
    if (submitting || !window.confirm("ยืนยันยกเลิกคำขอลานี้?")) return;
    setSubmitting(true);
    setActionMessage(null);
    try {
      const response = await fetch(`/api/leave/requests/${encodeURIComponent(requestId)}/cancel`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(errorMessage(response.status));
      setDetail(null);
      setActionMessage({ kind: "success", text: "ยกเลิกคำขอลาเรียบร้อยแล้ว" });
      await load();
    } catch (error) {
      setActionMessage({ kind: "error", text: error instanceof Error ? error.message : "ยกเลิกคำขอลาไม่สำเร็จ" });
    } finally {
      setSubmitting(false);
    }
  }

  if (state.status === "loading") {
    return (
      <div className="ck-state" role="status" aria-live="polite" aria-busy="true">
        <div className="ck-spinner" aria-hidden="true" />
        <h1>กำลังโหลดข้อมูลการลา</h1>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="ck-state" role="alert">
        <h1>เปิดหน้าการลาไม่สำเร็จ</h1>
        <p>{state.message}</p>
        <button className="ck-btn sky" type="button" onClick={() => void load()}>
          ลองใหม่
        </button>
      </div>
    );
  }

  const { overview, approvalOptions } = state;
  const hasAvailable = overview.entitlements.some((item) => item.remaining > 0);
  const remainingAfter = selected ? Math.max(selected.remaining - estimateDays, 0) : null;
  const detailEntitlement = detail ? overview.entitlements.find((item) => item.leaveTypeKey === detail.leaveTypeKey) : undefined;

  return (
    <>
      <header className="ck-phead ck-c-leave">
        <div className="ck-wrap">
          <span className="ck-chip lg">
            <Icon name="leave" size={26} />
          </span>
          <div>
            <h1>การลา</h1>
            <p>ยื่นใบลาและดูประวัติการลาของคุณ</p>
          </div>
          <div className="ck-minibal ck-ml">
            {overview.entitlements.map((item) => (
              <span key={item.entitlementId} className={"ck-c-" + toneOf(item.leaveTypeKey)}>
                <i />
                {item.leaveTypeName} <b>{item.remaining}</b>/{item.quota}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="ck-wrap ck-stack">
        {actionMessage ? (
          <div className={"ck-msg " + actionMessage.kind} role={actionMessage.kind === "error" ? "alert" : "status"}>
            {actionMessage.text}
          </div>
        ) : null}

        <form className="ck-fbox ck-c-leave" onSubmit={submitLeave} noValidate>
          <div className="ck-sh">
            <h2>ยื่นใบลา</h2>
            <span className="ck-hint">หัวหน้าจะได้รับแจ้งเตือนทันทีที่ส่ง</span>
          </div>

          {!hasAvailable ? (
            <p className="ck-msg error" role="alert" style={{ marginBottom: 16 }}>
              ไม่มีสิทธิ์การลาคงเหลือ จึงยังยื่นใบลาใหม่ไม่ได้
            </p>
          ) : null}

          <div className="ck-fgrid">
            <div className="ck-field full" role="radiogroup" aria-label="ประเภทการลา">
              <span>ประเภทการลา</span>
              {overview.entitlements.length === 0 ? (
                <div className="ck-empty">
                  <b>ยังไม่มีสิทธิ์การลา</b>
                  กรุณาติดต่อฝ่ายบุคคลเพื่อตรวจสอบสิทธิ์
                </div>
              ) : (
                <div className="ck-tsel">
                  {overview.entitlements.map((item) => {
                    const tone = toneOf(item.leaveTypeKey);
                    const on = item.entitlementId === entitlementId;
                    return (
                      <button
                        key={item.entitlementId}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        className={(on ? "ck-ts on " : "ck-ts ") + "ck-c-" + tone}
                        disabled={item.remaining <= 0}
                        onClick={() => setEntitlementId(item.entitlementId)}
                      >
                        <span className="ck-chip">
                          <Icon name={TONE_ICON[tone]} />
                        </span>
                        <span>
                          <b>{item.leaveTypeName}</b>
                          <small>
                            เหลือ {item.remaining} วัน{item.pending > 0 ? ` (รออนุมัติ ${item.pending})` : ""}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="ck-field span2">
              <span>{duration === "FULL_DAY" ? "วันที่ลา (เลือกเป็นช่วงได้)" : "วันที่ลา (วันเดียว)"}</span>
              <DatePicker
                mode={duration === "FULL_DAY" ? "range" : "single"}
                label="วันที่ลา"
                blocked={isNonWorkingDay}
                start={startDate}
                end={endDate}
                onChange={(from, to) => {
                  setStartDate(from);
                  setEndDate(to);
                }}
              />
            </div>
            <div className="ck-field span2">
              <span>ช่วงเวลา</span>
              <div className="ck-seg" role="radiogroup" aria-label="ช่วงเวลา">
                {DURATIONS.map((code) => (
                  <button
                    key={code}
                    type="button"
                    role="radio"
                    aria-checked={duration === code}
                    className={duration === code ? "on" : ""}
                    onClick={() => {
                      setDuration(code);
                      if (code !== "FULL_DAY") setEndDate(startDate);
                    }}
                  >
                    {DURATION_LABEL[code]}
                  </button>
                ))}
              </div>
            </div>

            {duration === "HOURLY" ? (
              <div className="ck-field full">
                <span>ลารายชั่วโมง</span>
                <div className="ck-hrs">
                  เริ่ม
                  <input className="ck-in" type="time" aria-label="เวลาเริ่ม" value={startTime} onChange={(event) => setStartTime(event.currentTarget.value)} />
                  จำนวน
                  <input
                    className="ck-in num"
                    type="number"
                    min={1}
                    max={8}
                    step={0.5}
                    aria-label="จำนวนชั่วโมง"
                    value={hours}
                    onChange={(event) => setHours(Number(event.currentTarget.value))}
                  />
                  ชั่วโมง
                  <span>
                    ถึง <b>{endTime || "—"}</b>
                  </span>
                </div>
              </div>
            ) : null}

            <label className="ck-field full">
              <span>เหตุผล</span>
              <textarea className="ck-in" name="description" rows={2} maxLength={2000} required placeholder="เช่น พาครอบครัวไปต่างจังหวัด" />
            </label>
          </div>

          <div className="ck-aprbox">
            <div className="ck-aprh">
              <Icon name="flow" size={18} style={{ color: "var(--tc)" }} />
              ผู้อนุมัติคำขอนี้
              <span className="ck-hint">เรียงตามลำดับ ระบบส่งต่อให้อัตโนมัติ</span>
            </div>
            {approvalOptions.length === 0 ? (
              <p className="ck-msg error">ยังไม่มีสายอนุมัติสำหรับบัญชีนี้ กรุณาติดต่อฝ่ายบุคคล</p>
            ) : (
              <div className="ck-aprrow">
                {approvalOptions.map((step, index) => (
                  <div key={step.stepOrder} style={{ display: "contents" }}>
                    {index > 0 ? (
                      <span className="ck-apr-arrow">
                        <Icon name="chevron" size={18} />
                      </span>
                    ) : null}
                    <label className="ck-apr">
                      <span className="ck-apr-n">{step.stepOrder}</span>
                      <small>ผู้อนุมัติขั้นที่ {step.stepOrder}</small>
                      {step.candidates.length === 1 ? (
                        <>
                          <b>{step.candidates[0]?.displayName}</b>
                          <input type="hidden" name={`approver-${step.stepOrder}`} value={step.candidates[0]?.employeeId ?? ""} />
                        </>
                      ) : (
                        <select className="ck-in" name={`approver-${step.stepOrder}`} required defaultValue="">
                          <option value="" disabled>
                            เลือกผู้อนุมัติ
                          </option>
                          {step.candidates.map((candidate) => (
                            <option key={candidate.employeeId} value={candidate.employeeId}>
                              {candidate.displayName}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {overQuota && selected ? (
            <p className="ck-msg error" role="alert" style={{ marginTop: 16 }}>
              เลือกวันลาเกินสิทธิคงเหลือ: {selected.leaveTypeName} เหลือ {selected.remaining} วัน แต่เลือกไว้ประมาณ {estimateDays} วัน
            </p>
          ) : null}

          <div className="ck-fbar">
            <span className="ck-sumline">
              <Icon name="calendar" size={18} />
              {selected && startDate ? (
                duration === "HOURLY" ? (
                  <>
                    ลา <b>{selected.leaveTypeName}</b> วันที่ <b>{isoToDmy(startDate)}</b> เวลา <b>{startTime}</b> ถึง <b>{endTime || "—"}</b>
                  </>
                ) : (
                  <>
                    ลา <b>{selected.leaveTypeName}</b> ประมาณ <b>{estimateDays} วันทำการ</b> หลังลาเหลือประมาณ <b>{remainingAfter} วัน</b>
                  </>
                )
              ) : (
                "เลือกประเภทและวันที่ลา ระบบจะสรุปให้ตรงนี้"
              )}
            </span>
            <button className="ck-btn quiet ck-ml" type="reset" onClick={(event) => resetForm(event.currentTarget.form as HTMLFormElement)}>
              ล้างฟอร์ม
            </button>
            <button className="ck-btn tone" type="submit" disabled={submitting || !hasAvailable || approvalOptions.length === 0 || overQuota}>
              {submitting ? "กำลังส่ง…" : "ส่งใบลา"}
            </button>
          </div>
        </form>

        <section className="ck-panel ck-c-leave" aria-labelledby="leave-history">
          <div className="ck-sh">
            <h2 id="leave-history">ประวัติการลา</h2>
            <span className="ck-count">{requests.length}</span>
            <div className="ck-filters ck-ml" role="tablist">
              {FILTERS.map((item) => (
                <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} className={filter === item.id ? "on" : ""} onClick={() => setFilter(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="ck-empty">
              <b>{requests.length === 0 ? "ยังไม่มีประวัติการลา" : "ไม่มีคำขอในสถานะนี้"}</b>
              ใบลาที่ยื่นแล้วจะแสดงที่นี่
            </div>
          ) : (
            <div className="ck-hgrid">
              {filtered.map((request) => {
                const tone = toneOf(request.leaveTypeKey);
                const status = STATUS[request.status];
                return (
                  <button key={request.requestId} type="button" className={"ck-hcard ck-c-" + tone} onClick={() => setDetail(request)}>
                    <span className="ck-hc-top">
                      <span className="ck-chip">
                        <Icon name={TONE_ICON[tone]} />
                      </span>
                      <span>
                        <b>{request.leaveTypeName}</b>
                        <small>
                          {request.requestNo} · ยื่นเมื่อ {thaiDateTime(request.submittedAt)}
                        </small>
                      </span>
                      <span className={"ck-pill " + status.tone}>{status.label}</span>
                    </span>
                    <dl className="ck-dl">
                      <div>
                        <dt>วันที่</dt>
                        <dd>{thaiDateRange(request.startDate, request.endDate)}</dd>
                      </div>
                      <div>
                        <dt>จำนวน</dt>
                        <dd>{amountLabel(request)}</dd>
                      </div>
                      <div>
                        <dt>ช่วงเวลา</dt>
                        <dd>{DURATION_LABEL[request.durationCode]}</dd>
                      </div>
                      <div>
                        <dt>เหตุผล</dt>
                        <dd>{request.description || "—"}</dd>
                      </div>
                    </dl>
                    <span className="ck-hc-foot">
                      <span className="ck-more">
                        ดูรายละเอียด
                        <Icon name="chevron" size={14} />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {detail ? (
        <>
          <button type="button" className="ck-scrim" aria-label="ปิดรายละเอียด" onClick={() => setDetail(null)} />
          <div className={"ck-dialog ck-c-" + toneOf(detail.leaveTypeKey)} role="dialog" aria-modal="true" aria-labelledby="leave-detail-title">
            <div className="ck-dlg-h">
              <span className="ck-chip">
                <Icon name={TONE_ICON[toneOf(detail.leaveTypeKey)]} />
              </span>
              <div>
                <small>รายละเอียดคำขอลา {detail.requestNo}</small>
                <h2 id="leave-detail-title">
                  {detail.leaveTypeName} {amountLabel(detail)}
                </h2>
              </div>
              <span className={"ck-pill " + STATUS[detail.status].tone}>{STATUS[detail.status].label}</span>
              <button type="button" className="ck-x" aria-label="ปิด" onClick={() => setDetail(null)}>
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="ck-dlg-b">
              <dl className="ck-dlg-grid">
                <div>
                  <dt>วันที่ลา</dt>
                  <dd>{thaiDateRange(detail.startDate, detail.endDate)}</dd>
                </div>
                <div>
                  <dt>ช่วงเวลา</dt>
                  <dd>
                    {DURATION_LABEL[detail.durationCode]}
                    {detail.startTime && detail.endTime ? ` ${detail.startTime} ถึง ${detail.endTime}` : ""}
                  </dd>
                </div>
                <div>
                  <dt>จำนวน</dt>
                  <dd>{detail.usageDays} วัน</dd>
                </div>
                <div>
                  <dt>ยื่นเมื่อ</dt>
                  <dd>{thaiDateTime(detail.submittedAt)}</dd>
                </div>
              </dl>
              <div className="ck-dlg-sec">
                <h3>เหตุผล</h3>
                <p>{detail.description || "—"}</p>
              </div>
              {detailEntitlement ? (
                <div className="ck-dlg-sec">
                  <h3>สิทธิคงเหลือ</h3>
                  <p style={{ marginBottom: 8 }}>
                    {detailEntitlement.leaveTypeName} ใช้ไป <b>{detailEntitlement.used}</b> คงเหลือ <b>{detailEntitlement.remaining}</b> จาก {detailEntitlement.quota} วัน
                  </p>
                  <div className="ck-track">
                    <i style={{ width: `${detailEntitlement.quota > 0 ? Math.min((detailEntitlement.used / detailEntitlement.quota) * 100, 100) : 0}%` }} />
                  </div>
                </div>
              ) : null}
              {detail.steps.length > 0 ? (
                <div className="ck-dlg-sec">
                  <h3>ลำดับผู้อนุมัติ</h3>
                  <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
                    {detail.steps.map((step) => (
                      <li key={step.stepOrder}>
                        <b>{step.approverName ?? "รอระบบกำหนดผู้อนุมัติ"}</b>{" "}
                        {step.decidedByName ? <i>(อนุมัติแทนโดย {step.decidedByName}) </i> : null}
                        <span>
                          {STEP_LABEL[step.status]}
                          {step.decidedAt ? " · " + thaiDateTime(step.decidedAt) : ""}
                        </span>
                        {step.comment ? <div style={{ opacity: 0.75 }}>ความเห็น: {step.comment}</div> : null}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
              <div className="ck-dlg-sec">
                <h3>ผลการพิจารณา</h3>
                <p>{detail.decisionReason || (detail.status === "PENDING" ? "รอผู้อนุมัติพิจารณา" : "—")}</p>
              </div>
            </div>
            {detail.status === "REVISION_REQUESTED" ? (
              <div className="ck-dlg-sec">
                <h3>แก้ไขและส่งใหม่</h3>
                {revision ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <textarea
                      className="ck-in"
                      rows={3}
                      maxLength={2000}
                      aria-label="เหตุผลการลา"
                      value={revision.description}
                      onChange={(event) => setRevision({ ...revision, description: event.currentTarget.value })}
                    />
                    <label>
                      วันที่เริ่มลา
                      <DateField label="วันที่เริ่มลา" value={revision.startDate} onChange={(next) => setRevision({ ...revision, startDate: next })} />
                    </label>
                    {detail.durationCode === "FULL_DAY" ? (
                      <label>
                        วันที่สิ้นสุด
                        <DateField label="วันที่สิ้นสุด" min={revision.startDate} value={revision.endDate} onChange={(next) => setRevision({ ...revision, endDate: next })} />
                      </label>
                    ) : null}
                    <div>
                      <button type="button" className="ck-btn ok" disabled={submitting} onClick={() => void resubmitRequest(detail)}>
                        ส่งใบลาที่แก้ไขแล้ว
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="ck-btn ok"
                    onClick={() =>
                      setRevision({
                        description: detail.description ?? "",
                        startDate: detail.startDate.slice(0, 10),
                        endDate: detail.endDate.slice(0, 10),
                      })
                    }
                  >
                    แก้ไขและส่งใหม่
                  </button>
                )}
              </div>
            ) : null}
            <div className="ck-dlg-f">
              {detail.status === "PENDING" || detail.status === "REVISION_REQUESTED" ? (
                <button type="button" className="ck-btn no" disabled={submitting} onClick={() => void cancelRequest(detail.requestId)}>
                  ยกเลิกคำขอ
                </button>
              ) : null}
              <button type="button" className="ck-btn quiet ck-ml" onClick={() => setDetail(null)}>
                ปิด
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
