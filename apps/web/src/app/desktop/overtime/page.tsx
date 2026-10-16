"use client";

import type { OvertimeBreakCode, OvertimeCreateResult, OvertimeRequestStatus, OvertimeRequestView, OvertimeSelfOverview } from "@ckace/contracts";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { resolveSubmissionIntent, shouldDiscardSubmissionIntent, type SubmissionIntent } from "../submission-intent";
import { DatePicker } from "../ui/date-picker";
import { thaiDateRange, thaiDateTime, weekdaysBetween } from "../ui/format";
import { Icon } from "../ui/icons";
import { DetailDialog, EmptyState, ErrorState, Filters, LoadingState, Message, PageHead, SectionHead, TimeInput } from "../ui/kit";
import { RequestTimelineSection } from "../ui/request-timeline";
import { attendanceLinkLabel, OVERTIME_BREAK_OPTIONS, overtimeBreakDeduction, overtimeMetrics, overtimeRequestMinutes } from "./overtime-view";

type State = { status: "loading" } | { status: "ready"; overview: OvertimeSelfOverview } | { status: "error"; message: string };
type Filter = "ALL" | OvertimeRequestStatus;

const STATUS: Readonly<Record<OvertimeRequestStatus, { label: string; tone: string }>> = {
  PENDING: { label: "รออนุมัติ", tone: "wait" },
  APPROVED: { label: "อนุมัติ", tone: "ok" },
  REJECTED: { label: "ไม่อนุมัติ", tone: "bad" },
  CANCELLED: { label: "ยกเลิก", tone: "muted" },
  REVISION_REQUESTED: { label: "ส่งกลับให้แก้ไข", tone: "wait" },
};

const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: "ALL", label: "ทั้งหมด" },
  { id: "PENDING", label: "รออนุมัติ" },
  { id: "APPROVED", label: "อนุมัติ" },
  { id: "REJECTED", label: "ไม่อนุมัติ" },
];

function minutesLabel(value: number): string {
  const h = Math.floor(value / 60);
  const m = value % 60;
  if (!h) return `${m} นาที`;
  return m ? `${h} ชั่วโมง ${m} นาที` : `${h} ชั่วโมง`;
}

function spanMinutes(start: string, end: string): number {
  const a = /^(\d{2}):(\d{2})$/.exec(start);
  const b = /^(\d{2}):(\d{2})$/.exec(end);
  if (!a || !b) return 0;
  let diff = Number(b[1]) * 60 + Number(b[2]) - (Number(a[1]) * 60 + Number(a[2]));
  if (diff <= 0) diff += 24 * 60; // crosses midnight
  return diff;
}

function errorMessage(status: number): string {
  if (status === 401) return "หมดเวลาการเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่";
  if (status === 403) return "บัญชีนี้ไม่มีสิทธิ์ใช้งาน OT";
  if (status === 409) return "รายการ OT ซ้ำหรือสถานะเปลี่ยนแล้ว กรุณารีเฟรช";
  if (status === 503) return "ระบบ OT ยังไม่เปิดใช้งานในตอนนี้";
  if (status === 400) return "ข้อมูล OT ไม่ถูกต้อง กรุณาตรวจสอบวันที่และเวลา";
  return "ไม่สามารถดำเนินการ OT ได้ กรุณาลองใหม่อีกครั้ง";
}

function requestDates(request: OvertimeRequestView): { start: string; end: string } {
  const dates = request.segments.map((segment) => segment.workDate).sort();
  return { start: dates[0] ?? "", end: dates[dates.length - 1] ?? "" };
}

export default function DesktopOvertimePage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const createIntent = useRef<SubmissionIntent | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [breaks, setBreaks] = useState<readonly OvertimeBreakCode[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [detail, setDetail] = useState<OvertimeRequestView | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/overtime/me", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(errorMessage(response.status));
      setState({ status: "ready", overview: (await response.json()) as OvertimeSelfOverview });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูล OT ได้" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(() => (state.status === "ready" ? overtimeMetrics(state.overview) : null), [state]);
  const requests = useMemo(
    () => (state.status === "ready" ? [...state.overview.requests].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)) : []),
    [state],
  );

  function resetForm() {
    setStartDate("");
    setEndDate("");
    setStartTime("18:00");
    setEndTime("");
    setReason("");
    setBreaks([]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status !== "ready" || busy) return;
    const body = { startDate, endDate: endDate || startDate, startTime, endTime, reason: reason.trim(), breaks };
    if (!body.startDate || !body.startTime || !body.endTime || !body.reason) {
      setMessage({ kind: "error", text: "กรุณากรอกวันที่ เวลา และงานที่ทำให้ครบ" });
      return;
    }
    createIntent.current = resolveSubmissionIntent(createIntent.current, body);
    setBusy("create");
    setMessage(null);
    try {
      const response = await fetch("/api/overtime/requests", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, clientKey: createIntent.current.clientKey }),
      });
      if (!response.ok) {
        if (shouldDiscardSubmissionIntent(response.status)) createIntent.current = null;
        throw new Error(errorMessage(response.status));
      }
      const result = (await response.json()) as OvertimeCreateResult;
      setMessage({
        kind: "success",
        text: `ส่งคำขอ OT ${result.requests.length} วันเรียบร้อยแล้ว` + (result.warnings.length ? ` มีคำเตือน ${result.warnings.length} รายการ` : ""),
      });
      createIntent.current = null;
      resetForm();
      await load();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "ส่งคำขอ OT ไม่สำเร็จ" });
    } finally {
      setBusy(null);
    }
  }

  async function cancel(request: OvertimeRequestView) {
    if (busy || request.status !== "PENDING" || !window.confirm("ยืนยันยกเลิกคำขอ OT นี้?")) return;
    setBusy(request.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/overtime/requests/${encodeURIComponent(request.id)}/cancel`, { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error(errorMessage(response.status));
      setDetail(null);
      setMessage({ kind: "success", text: "ยกเลิกคำขอ OT เรียบร้อยแล้ว" });
      await load();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "ยกเลิกคำขอ OT ไม่สำเร็จ" });
    } finally {
      setBusy(null);
    }
  }

  if (state.status === "loading") return <LoadingState title="กำลังโหลดข้อมูล OT" />;
  if (state.status === "error") return <ErrorState title="เปิดหน้า OT ไม่สำเร็จ" message={state.message} onRetry={() => void load()} />;

  const perDay = Math.max(0, spanMinutes(startTime, endTime) - overtimeBreakDeduction(startTime, endTime, breaks));
  const days = startDate ? Math.max(1, weekdaysBetween(startDate, endDate || startDate) || 1) : 0;
  const filtered = filter === "ALL" ? requests : requests.filter((request) => request.status === filter);

  return (
    <>
      <PageHead tone="ot" icon="ot" title="ทำงานล่วงเวลา" subtitle="ขอ OT และดูประวัติชั่วโมง OT ของคุณ">
        <div className="ck-minibal">
          <span className="ck-c-ot">
            <i />
            ขอไปแล้ว <b>{minutesLabel(metrics?.totalRequestedMinutes ?? 0)}</b>
          </span>
          <span className="ck-c-med">
            <i />
            อนุมัติ <b>{metrics?.approvedRequests ?? 0}</b> คำขอ
          </span>
        </div>
      </PageHead>

      <div className="ck-wrap ck-stack">
        <Message value={message} />

        <form className="ck-fbox ck-c-ot" onSubmit={submit} noValidate>
          <SectionHead title="ขอทำงานล่วงเวลา" hint="ส่งได้ทั้งก่อนและหลังวันที่ทำ ถ้าเลือกหลายวันระบบแยกเป็นคำขอรายวัน" />
          <div className="ck-fgrid">
            <div className="ck-field span2">
              <span>วันที่ทำ (เลือกเป็นช่วงได้)</span>
              <DatePicker
                mode="range"
                label="วันที่ทำ OT"
                start={startDate}
                end={endDate}
                onChange={(from, to) => {
                  setStartDate(from);
                  setEndDate(to);
                }}
              />
            </div>
            <div className="ck-field">
              <span>เริ่ม</span>
              <TimeInput label="เวลาเริ่ม OT" value={startTime} onChange={setStartTime} />
            </div>
            <div className="ck-field">
              <span>สิ้นสุด</span>
              <TimeInput label="เวลาสิ้นสุด OT" value={endTime} onChange={setEndTime} />
            </div>
            <div className="ck-field full">
              <span>เวลาพักที่ใช้ในช่วง OT (เลือกได้ ไม่บังคับ — ไม่เลือก = ไม่หักเวลา)</span>
              <div className="ck-seg" role="group" aria-label="เวลาพักในช่วง OT">
                {OVERTIME_BREAK_OPTIONS.map((option) => {
                  const on = breaks.includes(option.code);
                  return (
                    <button
                      key={option.code}
                      type="button"
                      aria-pressed={on}
                      className={on ? "on" : ""}
                      onClick={() =>
                        setBreaks((current) => {
                          const next = on ? current.filter((code) => code !== option.code) : [...current, option.code];
                          // a full evening break replaces the 30-minute one
                          if (!on && option.code === "DINNER") return next.filter((code) => code !== "DINNER_SHORT");
                          if (!on && option.code === "DINNER_SHORT") return next.filter((code) => code !== "DINNER");
                          return next;
                        })
                      }
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="ck-field full">
              <span>งานที่ทำ</span>
              <input className="ck-in" value={reason} maxLength={2000} placeholder="เช่น ปิดงบลูกค้าให้ทันส่ง DBD" onChange={(event) => setReason(event.currentTarget.value)} />
            </label>
          </div>

          <div className="ck-aprbox">
            <div className="ck-aprh">
              <Icon name="flow" size={18} style={{ color: "var(--tc)" }} />
              ผู้อนุมัติคำขอนี้
              <span className="ck-hint">ระบบส่งให้หัวหน้าตามสายอนุมัติ OT ของบริษัทโดยอัตโนมัติ</span>
            </div>
            <div className="ck-aprrow">
              <div className="ck-apr">
                <span className="ck-apr-n">1</span>
                <small>ผู้อนุมัติขั้นที่ 1</small>
                <b>หัวหน้าตามสายงาน</b>
              </div>
            </div>
          </div>

          <div className="ck-fbar">
            <span className="ck-sumline">
              <Icon name="clock" size={18} />
              {startDate && perDay > 0 ? (
                <>
                  รวม <b>{minutesLabel(perDay)}</b> ต่อวัน {days > 1 ? <>จำนวน <b>{days} วัน</b></> : null} วันที่ <b>{thaiDateRange(startDate, endDate || startDate)}</b>
                </>
              ) : (
                "เลือกวันที่และเวลา ระบบจะสรุปชั่วโมงให้ตรงนี้"
              )}
            </span>
            <button className="ck-btn quiet ck-ml" type="button" onClick={resetForm}>
              ล้างฟอร์ม
            </button>
            <button className="ck-btn tone" type="submit" disabled={busy !== null}>
              {busy === "create" ? "กำลังส่ง…" : "ส่งคำขอ OT"}
            </button>
          </div>
        </form>

        <section className="ck-panel ck-c-ot" aria-labelledby="ot-history">
          <SectionHead title="ประวัติ OT" id="ot-history" count={requests.length}>
            <Filters value={filter} options={FILTERS} onChange={setFilter} />
          </SectionHead>
          {filtered.length === 0 ? (
            <EmptyState title={requests.length === 0 ? "ยังไม่มีประวัติ OT" : "ไม่มีคำขอในสถานะนี้"}>คำขอ OT ที่ส่งแล้วจะแสดงที่นี่</EmptyState>
          ) : (
            <div className="ck-hgrid">
              {filtered.map((request) => {
                const { start, end } = requestDates(request);
                const first = request.segments[0];
                const status = STATUS[request.status];
                return (
                  <button key={request.id} type="button" className="ck-hcard ck-c-ot" onClick={() => setDetail(request)}>
                    <span className="ck-hc-top">
                      <span className="ck-chip">
                        <Icon name="ot" />
                      </span>
                      <span>
                        <b>OT {minutesLabel(overtimeRequestMinutes(request))}</b>
                        <small>ยื่นเมื่อ {thaiDateTime(request.submittedAt)}</small>
                      </span>
                      <span className={"ck-pill " + status.tone}>{status.label}</span>
                    </span>
                    <dl className="ck-dl">
                      <div>
                        <dt>วันที่</dt>
                        <dd>{start ? thaiDateRange(start, end) : "—"}</dd>
                      </div>
                      <div>
                        <dt>เวลา</dt>
                        <dd>{first ? `${first.startTime} ถึง ${first.endTime}` : "—"}</dd>
                      </div>
                      <div>
                        <dt>งานที่ทำ</dt>
                        <dd>{request.reason || "—"}</dd>
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
        <DetailDialog
          tone="ot"
          icon="ot"
          kicker="รายละเอียดคำขอ OT"
          title={`OT ${minutesLabel(overtimeRequestMinutes(detail))}`}
          status={STATUS[detail.status]}
          onClose={() => setDetail(null)}
          footer={
            detail.status === "PENDING" ? (
              <button type="button" className="ck-btn no" disabled={busy !== null} onClick={() => void cancel(detail)}>
                ยกเลิกคำขอ
              </button>
            ) : null
          }
        >
          <dl className="ck-dlg-grid">
            <div>
              <dt>ยื่นเมื่อ</dt>
              <dd>{thaiDateTime(detail.submittedAt)}</dd>
            </div>
            <div>
              <dt>รวมเวลา</dt>
              <dd>{minutesLabel(overtimeRequestMinutes(detail))}</dd>
            </div>
          </dl>
          <div className="ck-dlg-sec">
            <h3>งานที่ทำ</h3>
            <p>{detail.reason || "—"}</p>
          </div>
          <div className="ck-dlg-sec">
            <h3>ช่วงเวลาที่ขอ</h3>
            <dl className="ck-dl">
              {detail.segments.map((segment) => (
                <div key={segment.id}>
                  <dt>{thaiDateRange(segment.workDate, segment.workDate)}</dt>
                  <dd>
                    {segment.startTime} ถึง {segment.endTime} ({minutesLabel(segment.requestedMinutes)}) {attendanceLinkLabel(segment.attendanceRecordId)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="ck-dlg-sec">
            <h3>ผลการพิจารณา</h3>
            <p>{detail.decisionReason || (detail.status === "PENDING" ? "รอผู้อนุมัติพิจารณา" : "—")}</p>
          </div>
          <RequestTimelineSection requestId={detail.id} />
        </DetailDialog>
      ) : null}
    </>
  );
}
