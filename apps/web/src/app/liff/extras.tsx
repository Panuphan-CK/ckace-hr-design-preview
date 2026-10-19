"use client";

import "./extras.css";

import type {
  ApprovalChainPreview,
  AttachmentDownloadResult,
  AttendanceSelfOverview,
  LeaveApprovalStepOptions,
  LeaveDurationCode,
  LeaveSelfOverview,
  RequestStatusOverview,
  TimeCorrectionRequestView,
} from "@ckace/contracts";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { resolveSubmissionIntent, shouldDiscardSubmissionIntent, type SubmissionIntent } from "../desktop/submission-intent";
import { bangkokToday, checkAddRecord } from "../desktop/time-correction/time-correction-view";
import { formatThaiDate, getJson, optionalJson, submitError, type LiffSession } from "./api";

type Message = { readonly kind: "ok" | "err"; readonly text: string } | null;

const DURATIONS: readonly { code: LeaveDurationCode; label: string }[] = [
  { code: "FULL_DAY", label: "เต็มวัน" },
  { code: "MORNING", label: "ครึ่งวันเช้า" },
  { code: "AFTERNOON", label: "ครึ่งวันบ่าย" },
  { code: "HOURLY", label: "รายชั่วโมง" },
];

function Shell({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <main className="xt">
      <header className="xt-head">
        <a className="xt-back" href="#/home">‹ กลับหน้าหลัก</a>
        <h1>{title}</h1>
      </header>
      {children}
    </main>
  );
}

function Note({ message }: { readonly message: Message }) {
  return message ? <p className={`xt-note ${message.kind}`} role="status">{message.text}</p> : null;
}

function Chain({ chain }: { readonly chain: ApprovalChainPreview | null }) {
  if (!chain || chain.autoApproved || chain.steps.length === 0) return null;
  return (
    <>
      <label>สายการอนุมัติ</label>
      {chain.steps.map((step) => (
        <div className="xt-step" key={step.stepOrder}><i>{step.stepOrder}</i><span>{step.approverName ?? "ผู้อนุมัติ"}</span></div>
      ))}
    </>
  );
}

/** Leave form with every entitlement (including per-person special leave) and a choice of approver per step. */
function LeaveForm() {
  const [overview, setOverview] = useState<LeaveSelfOverview | null>(null);
  const [options, setOptions] = useState<readonly LeaveApprovalStepOptions[]>([]);
  const [entitlementId, setEntitlementId] = useState("");
  const [duration, setDuration] = useState<LeaveDurationCode>("FULL_DAY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [description, setDescription] = useState("");
  const [approvers, setApprovers] = useState<Readonly<Record<number, string>>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const intent = useRef<SubmissionIntent | null>(null);

  async function load() {
    try {
      const [data, steps] = await Promise.all([getJson<LeaveSelfOverview>("/api/leave/me"), getJson<readonly LeaveApprovalStepOptions[]>("/api/leave/approval-options")]);
      setOverview(data);
      setOptions(steps);
      setEntitlementId((current) => current || data.entitlements[0]?.entitlementId || "");
      setApprovers((current) => Object.fromEntries(steps.map((step) => [step.stepOrder, current[step.stepOrder] ?? step.candidates[0]?.employeeId ?? ""])));
    } catch (error) {
      setMessage({ kind: "err", text: error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ" });
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const selected = overview?.entitlements.find((item) => item.entitlementId === entitlementId);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !selected) return;
    if (!startDate || !description.trim()) return setMessage({ kind: "err", text: "กรุณาเลือกวันที่ลาและกรอกเหตุผล" });
    if (duration === "HOURLY" && endTime <= startTime) return setMessage({ kind: "err", text: "เวลาลารายชั่วโมงต้องจบหลังเวลาเริ่ม และอยู่ในวันเดียวกัน" });
    const approverEmployeeIds = options.map((step) => approvers[step.stepOrder] ?? "");
    if (approverEmployeeIds.some((id) => !id)) return setMessage({ kind: "err", text: "ยังไม่พบผู้อนุมัติ กรุณาติดต่อฝ่ายบุคคล" });
    const payload = {
      entitlementId,
      description: description.trim(),
      startDate,
      endDate: duration === "FULL_DAY" ? endDate || startDate : startDate,
      durationCode: duration,
      startTime: duration === "HOURLY" ? startTime : null,
      endTime: duration === "HOURLY" ? endTime : null,
      approverEmployeeIds,
    };
    intent.current = resolveSubmissionIntent(intent.current, payload);
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/leave/requests", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, clientKey: intent.current.clientKey }),
      });
      if (!response.ok) {
        if (shouldDiscardSubmissionIntent(response.status)) intent.current = null;
        throw new Error(await submitError(response));
      }
      intent.current = null;
      setStartDate("");
      setEndDate("");
      setDescription("");
      setMessage({ kind: "ok", text: "ส่งคำขอลาเรียบร้อยแล้ว ผู้อนุมัติจะได้รับแจ้งเตือน" });
      await load();
    } catch (error) {
      setMessage({ kind: "err", text: error instanceof Error ? error.message : "ส่งคำขอลาไม่สำเร็จ" });
    } finally {
      setBusy(false);
    }
  }

  if (!overview) return <div className="xt-card">{message ? <Note message={message} /> : "กำลังโหลดข้อมูล…"}</div>;
  return (
    <form className="xt-card" onSubmit={submit} noValidate>
      <h2>ขอลา</h2>
      <p className="xt-hint">เลือกได้ทุกประเภทที่คุณมีสิทธิ์ รวมถึงลาพิเศษ และเลือกผู้อนุมัติเองได้</p>
      <Note message={message} />
      <label>ประเภทการลา</label>
      <div className="xt-types">
        {overview.entitlements.map((item) => (
          <button key={item.entitlementId} type="button" className="xt-type" aria-pressed={item.entitlementId === entitlementId} onClick={() => setEntitlementId(item.entitlementId)}>
            <b>{item.leaveTypeName}</b>
            <span>คงเหลือ {item.remaining} วัน</span>
          </button>
        ))}
      </div>
      <label>ช่วงเวลาที่ลา</label>
      <div className="xt-chips">
        {DURATIONS.map((item) => (
          <button key={item.code} type="button" className="xt-chip" aria-pressed={duration === item.code} onClick={() => setDuration(item.code)}>{item.label}</button>
        ))}
      </div>
      <div className="xt-row">
        <div><label htmlFor="xl-start">{duration === "FULL_DAY" ? "เริ่มวันที่" : "วันที่ลา"}</label><input id="xl-start" type="date" value={startDate} onChange={(event) => setStartDate(event.currentTarget.value)} />{startDate ? <small className="xt-date">{formatThaiDate(startDate)} (พ.ศ.)</small> : null}</div>
        {duration === "FULL_DAY" ? <div><label htmlFor="xl-end">ถึงวันที่</label><input id="xl-end" type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.currentTarget.value)} />{endDate ? <small className="xt-date">{formatThaiDate(endDate)} (พ.ศ.)</small> : null}</div> : null}
      </div>
      {duration === "HOURLY" ? (
        <div className="xt-row">
          <div><label htmlFor="xl-from">เวลาเริ่ม</label><input id="xl-from" type="time" value={startTime} onChange={(event) => setStartTime(event.currentTarget.value)} /></div>
          <div><label htmlFor="xl-to">เวลาสิ้นสุด</label><input id="xl-to" type="time" value={endTime} onChange={(event) => setEndTime(event.currentTarget.value)} /></div>
        </div>
      ) : null}
      <label htmlFor="xl-desc">เหตุผล</label>
      <textarea id="xl-desc" maxLength={1000} placeholder="พิมพ์รายละเอียด" value={description} onChange={(event) => setDescription(event.currentTarget.value)} />
      {options.length > 0 ? <label>ผู้อนุมัติ</label> : null}
      {options.map((step) => (
        <div className="xt-step" key={step.stepOrder}>
          <i>{step.stepOrder}</i>
          <select aria-label={`ผู้อนุมัติขั้นที่ ${step.stepOrder}`} value={approvers[step.stepOrder] ?? ""} onChange={(event) => { const value = event.currentTarget.value; setApprovers((current) => ({ ...current, [step.stepOrder]: value })); }}>
            {step.candidates.map((candidate) => <option key={candidate.employeeId} value={candidate.employeeId}>{candidate.displayName}</option>)}
          </select>
        </div>
      ))}
      <button className="xt-send" type="submit" disabled={busy}>{busy ? "กำลังส่ง…" : `ส่งคำขอ${selected ? selected.leaveTypeName : ""}`}</button>
    </form>
  );
}

/** A day with no clock-in at all: the employee gives both times and the approvers decide. */
function AddRecordForm() {
  const [records, setRecords] = useState<readonly string[]>([]);
  const [active, setActive] = useState<readonly string[]>([]);
  const [chain, setChain] = useState<ApprovalChainPreview | null>(null);
  const [date, setDate] = useState("");
  const [checkIn, setCheckIn] = useState("09:00");
  const [checkOut, setCheckOut] = useState("17:30");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const intent = useRef<SubmissionIntent | null>(null);
  const today = bangkokToday(new Date());

  async function load() {
    const [attendance, requests, preview] = await Promise.all([
      optionalJson<AttendanceSelfOverview>("/api/attendance/me"),
      optionalJson<readonly TimeCorrectionRequestView[]>("/api/attendance/time-corrections/me"),
      optionalJson<ApprovalChainPreview>("/api/attendance/time-corrections/approval-chain"),
    ]);
    setRecords((attendance?.records ?? []).map((record) => record.workDate));
    setActive((requests ?? []).filter((item) => item.status === "PENDING" || item.status === "APPROVED" || item.status === "REVISION_REQUESTED").map((item) => item.attendanceDate));
    setChain(preview);
  }
  useEffect(() => {
    void load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const check = checkAddRecord({ date, checkIn, checkOut, reason, today, recordDates: records, activeRequestDates: active });
    if (!check.ok) return setMessage({ kind: "err", text: check.message });
    const payload = { attendanceDate: date, checkInTime: checkIn, checkOutTime: checkOut, reason: reason.trim() };
    intent.current = resolveSubmissionIntent(intent.current, payload);
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/attendance/time-corrections/add-record", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, clientKey: intent.current.clientKey }),
      });
      if (!response.ok) {
        if (shouldDiscardSubmissionIntent(response.status)) intent.current = null;
        throw new Error(await submitError(response));
      }
      intent.current = null;
      setDate("");
      setReason("");
      setMessage({ kind: "ok", text: "ส่งคำขอเพิ่มบันทึกลงเวลาเรียบร้อยแล้ว" });
      await load();
    } catch (error) {
      setMessage({ kind: "err", text: error instanceof Error ? error.message : "ส่งคำขอไม่สำเร็จ" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="xt-card" onSubmit={submit} noValidate>
      <h2>ขอเพิ่มบันทึกลงเวลา</h2>
      <p className="xt-hint">ใช้เมื่อลืมสแกนทั้งวัน ไม่มีบันทึกเข้า-ออกงานของวันนั้นเลย</p>
      <Note message={message} />
      <label htmlFor="xa-date">วันที่ไม่มีบันทึก</label>
      <input id="xa-date" type="date" max={today} value={date} onChange={(event) => setDate(event.currentTarget.value)} />{date ? <small className="xt-date">{formatThaiDate(date)} (พ.ศ.)</small> : null}
      <div className="xt-row">
        <div><label htmlFor="xa-in">เวลาเข้างาน</label><input id="xa-in" type="time" value={checkIn} onChange={(event) => setCheckIn(event.currentTarget.value)} /></div>
        <div><label htmlFor="xa-out">เวลาออกงาน</label><input id="xa-out" type="time" value={checkOut} onChange={(event) => setCheckOut(event.currentTarget.value)} /></div>
      </div>
      <label htmlFor="xa-reason">เหตุผล</label>
      <textarea id="xa-reason" maxLength={1000} placeholder="เช่น ลืมสแกนทั้งวัน ไปพบลูกค้านอกสถานที่" value={reason} onChange={(event) => setReason(event.currentTarget.value)} />
      <Chain chain={chain} />
      <button className="xt-send" type="submit" disabled={busy}>{busy ? "กำลังส่ง…" : "ส่งคำขอ"}</button>
    </form>
  );
}

/** Approver view of medical claims waiting on them, with the receipt files. */
function Receipts() {
  const [data, setData] = useState<RequestStatusOverview | { error: string } | null>(null);
  const [view, setView] = useState<{ url: string; failed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    getJson<RequestStatusOverview>("/api/requests/assigned")
      .then(setData)
      .catch((error: unknown) => setData({ error: error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ" }));
  }, []);

  async function open(attachmentId: string) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/attachments/${encodeURIComponent(attachmentId)}/download`, { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error(await submitError(response));
      const result = (await response.json()) as AttachmentDownloadResult;
      setView({ url: result.download.url, failed: false });
    } catch (error) {
      setMessage({ kind: "err", text: error instanceof Error ? error.message : "เปิดใบเสร็จไม่สำเร็จ" });
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <div className="xt-card">กำลังโหลดข้อมูล…</div>;
  if ("error" in data) return <div className="xt-card"><Note message={{ kind: "err", text: data.error }} /></div>;
  const claims = data.requests.filter((item) => item.kind === "MEDICAL" && item.medical);
  return (
    <>
      <Note message={message} />
      {claims.length === 0 ? <div className="xt-card"><p className="xt-hint">ไม่มีคำขอเบิกค่ารักษาที่รอคุณพิจารณา</p></div> : null}
      {claims.map((item) => (
        <section className="xt-card" key={item.id}>
          <h2>{item.employeeDisplayName ?? "พนักงาน"} · {item.requestNo}</h2>
          <div className="xt-meta"><span>วันที่รักษา {formatThaiDate(item.medical?.sicknessDate)}</span><b>{(item.medical?.amount ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</b></div>
          <p className="xt-hint">{item.summary}</p>
          {(item.medical?.attachmentIds ?? []).map((attachmentId, index) => (
            <button key={attachmentId} type="button" className="xt-btn" disabled={busy} onClick={() => void open(attachmentId)}>ดูใบเสร็จ {index + 1}</button>
          ))}
          {item.medical?.attachmentIds.length === 0 ? <span className="xt-hint">ไม่มีใบเสร็จแนบ</span> : null}
          <a className="xt-btn" href="#/approvals" style={{ display: "inline-block", textDecoration: "none" }}>ไปอนุมัติ</a>
        </section>
      ))}
      {view ? (
        <div className="xt-modal" role="dialog" aria-label="ใบเสร็จ" onClick={() => setView(null)}>
          <div onClick={(event) => event.stopPropagation()}>
            {view.failed ? (
              <p><a href={view.url} target="_blank" rel="noreferrer">เปิดไฟล์ใบเสร็จ</a></p>
            ) : (
              <img src={view.url} alt="ใบเสร็จค่ารักษา" onError={() => setView({ url: view.url, failed: true })} />
            )}
            <button className="xt-send" type="button" onClick={() => setView(null)}>ปิด</button>
          </div>
        </div>
      ) : null}
    </>
  );
}

const ITEMS = [
  { route: "leave", nav: "leave", title: "ขอลา (ทุกประเภท)", text: "เลือกลาพิเศษและเลือกผู้อนุมัติเองได้" },
  { route: "correction", nav: "attendance", title: "ขอเพิ่มบันทึกลงเวลา", text: "วันที่ลืมสแกนทั้งวัน" },
  { route: "receipts", nav: "approvals", title: "ใบเสร็จค่ารักษารออนุมัติ", text: "ดูใบเสร็จก่อนอนุมัติ" },
] as const;

export function Extras({ route, session }: { readonly route: string; readonly session: LiffSession }) {
  const allowed = ITEMS.filter((item) => session.navigation[item.nav]);
  const current = allowed.find((item) => item.route === route);
  if (current?.route === "leave") return <Shell title="ขอลา"><LeaveForm /></Shell>;
  if (current?.route === "correction") return <Shell title="เพิ่มบันทึกลงเวลา"><AddRecordForm /></Shell>;
  if (current?.route === "receipts") return <Shell title="ใบเสร็จค่ารักษา"><Receipts /></Shell>;
  return (
    <Shell title="เมนูเพิ่มเติม">
      {allowed.map((item) => (
        <a key={item.route} className="xt-card xt-menu" href={`#/x/${item.route}`}>
          <b>{item.title}</b>
          <span>{item.text}</span>
        </a>
      ))}
    </Shell>
  );
}

export function ExtrasButton() {
  return <a className="xt-fab" href="#/x">เพิ่มเติม ＋</a>;
}
