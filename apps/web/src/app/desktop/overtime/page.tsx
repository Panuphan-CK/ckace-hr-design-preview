"use client";

import type {
  OvertimeCreateResult,
  OvertimeRequestView,
  OvertimeSelfOverview,
} from "@ckace/contracts";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  attendanceLinkLabel,
  overtimeMetrics,
  overtimeRequestMinutes,
  overtimeStatusClass,
  overtimeStatusLabel,
} from "./overtime-view";

import {
  resolveSubmissionIntent,
  shouldDiscardSubmissionIntent,
  type SubmissionIntent,
} from "../submission-intent";
import {
  RequestListToolbar,
  RequestWorkspaceTabs,
  type RequestWorkspaceView,
} from "../request-workspace-tabs";

type State =
  | { status: "loading" }
  | { status: "ready"; overview: OvertimeSelfOverview }
  | { status: "error"; message: string };

type Message =
  | { kind: "success"; text: string }
  | { kind: "error"; text: string };

const dateFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const dateTimeFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function todayBangkok(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00+07:00`);
  return Number.isNaN(date.getTime()) ? value : dateFmt.format(date);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFmt.format(date);
}

function minutes(value: number): string {
  const h = Math.floor(value / 60);
  const m = value % 60;
  if (!h) return `${m} นาที`;
  return m ? `${h} ชม. ${m} นาที` : `${h} ชม.`;
}

function errorMessage(status: number): string {
  if (status === 401) return "หมดเวลาการเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่";
  if (status === 403) return "บัญชีนี้ไม่มีสิทธิ์ใช้งานโอที";
  if (status === 409) {
    return "รายการโอทีซ้ำหรือสถานะเปลี่ยนแล้ว กรุณารีเฟรช";
  }
  if (status === 503) {
    return "โมดูลโอทียังไม่เปิดใช้งานใน environment นี้";
  }
  return "ไม่สามารถดำเนินการโอทีได้ กรุณาลองใหม่อีกครั้ง";
}

export default function DesktopOvertimePage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const createIntent = useRef<SubmissionIntent | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [workspaceView, setWorkspaceView] =
    useState<RequestWorkspaceView>("new");
  const [requestSearch, setRequestSearch] = useState("");
  const [requestMonth, setRequestMonth] = useState("");
  const today = useMemo(() => todayBangkok(), []);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/overtime/me", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) throw new Error(errorMessage(response.status));
      setState({
        status: "ready",
        overview: (await response.json()) as OvertimeSelfOverview,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลดข้อมูลโอทีได้",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(
    () => (state.status === "ready" ? overtimeMetrics(state.overview) : null),
    [state],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status !== "ready" || busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = {
      startDate: String(data.get("startDate") ?? ""),
      endDate: String(data.get("endDate") ?? ""),
      startTime: String(data.get("startTime") ?? ""),
      endTime: String(data.get("endTime") ?? ""),
      reason: String(data.get("reason") ?? "").trim(),
    };
    if (
      !body.startDate ||
      !body.endDate ||
      !body.startTime ||
      !body.endTime ||
      !body.reason
    ) {
      setMessage({ kind: "error", text: "กรุณากรอกวันที่ เวลา และเหตุผลให้ครบ" });
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
        if (shouldDiscardSubmissionIntent(response.status)) {
          createIntent.current = null;
        }
        throw new Error(errorMessage(response.status));
      }
      const result = (await response.json()) as OvertimeCreateResult;
      setMessage({
        kind: "success",
        text:
          `ส่งคำขอโอที ${result.requests.length} วันเรียบร้อยแล้ว` +
          (result.warnings.length ? ` มีคำเตือน ${result.warnings.length} รายการ` : ""),
      });
      createIntent.current = null;
      form.reset();
      await load();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "ส่งคำขอโอทีไม่สำเร็จ",
      });
    } finally {
      setBusy(null);
    }
  }

  async function cancel(request: OvertimeRequestView) {
    if (
      busy ||
      request.status !== "PENDING" ||
      !window.confirm("ยืนยันยกเลิกคำขอโอทีนี้?")
    ) {
      return;
    }
    setBusy(request.id);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/overtime/requests/${encodeURIComponent(request.id)}/cancel`,
        { method: "POST", credentials: "same-origin" },
      );
      if (!response.ok) throw new Error(errorMessage(response.status));
      setMessage({ kind: "success", text: "ยกเลิกคำขอโอทีเรียบร้อยแล้ว" });
      await load();
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "ยกเลิกคำขอโอทีไม่สำเร็จ",
      });
    } finally {
      setBusy(null);
    }
  }

  if (state.status === "loading") {
    return (
      <section
        className="module-state"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="spinner" aria-hidden="true" />
        <h1>กำลังโหลดข้อมูลโอที</h1>
        <p>กำลังตรวจสอบคำขอและ Attendance linkage จาก Server</p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="module-state" role="alert">
        <div className="status-badge error">OT ERROR</div>
        <h1>เปิดเมนูโอทีไม่สำเร็จ</h1>
        <p>{state.message}</p>
        <button className="primary-button" onClick={() => void load()}>
          ลองใหม่
        </button>
      </section>
    );
  }

  const pendingRequests = state.overview.requests.filter(
    (request) => request.status === "PENDING",
  );
  const historyRequests = state.overview.requests.filter(
    (request) => request.status !== "PENDING",
  );
  const visibleRequests =
    workspaceView === "pending" ? pendingRequests : historyRequests;
  const requestSearchKey = requestSearch.trim().toLocaleLowerCase("th");
  const filteredVisibleRequests = visibleRequests.filter((request) => {
    const firstWorkDate = request.segments[0]?.workDate ?? "";
    const matchesSearch =
      requestSearchKey.length === 0 ||
      [
        request.reason,
        overtimeStatusLabel(request.status),
        ...request.segments.map(
          (segment) =>
            segment.workDate + " " + segment.startTime + " " + segment.endTime,
        ),
      ]
        .join(" ")
        .toLocaleLowerCase("th")
        .includes(requestSearchKey);
    const matchesMonth =
      requestMonth.length === 0 || firstWorkDate.slice(5, 7) === requestMonth;
    return matchesSearch && matchesMonth;
  });

  return (
    <div className="module-stack task398-request-page">
      <section className="module-heading">
        <div>
          <p className="eyebrow">OVERTIME DESKTOP</p>
          <h1>โอที</h1>
          <p>
            ยื่นคำขอโอที ดูประวัติ และตรวจการเชื่อม OT segment กับ Attendance
            record ที่ Server เป็นผู้กำหนด
          </p>
        </div>
      </section>

      <RequestWorkspaceTabs
        value={workspaceView}
        onChange={setWorkspaceView}
        newLabel="ขอ OT"
        pendingCount={pendingRequests.length}
        historyCount={historyRequests.length}
      />

      {message ? (
        <div
          className={
            message.kind === "success"
              ? "action-message success"
              : "action-message error"
          }
          role={message.kind === "error" ? "alert" : "status"}
        >
          {message.text}
        </div>
      ) : null}

      <section className="metric-grid">
        <article className="metric-card">
          <span>คำขอทั้งหมด</span>
          <strong>{metrics?.totalRequests ?? 0}</strong>
        </article>
        <article className="metric-card">
          <span>รออนุมัติ</span>
          <strong>{metrics?.pendingRequests ?? 0}</strong>
        </article>
        <article className="metric-card">
          <span>อนุมัติแล้ว</span>
          <strong>{metrics?.approvedRequests ?? 0}</strong>
        </article>
        <article className="metric-card">
          <span>เวลาที่ขอรวม</span>
          <strong>{minutes(metrics?.totalRequestedMinutes ?? 0)}</strong>
        </article>
      </section>

      {workspaceView === "new" ? (
      <section className="module-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">NEW REQUEST</p>
            <h2>ยื่นคำขอโอที</h2>
          </div>
          <span className="panel-note">วันที่ต้องไม่เกิน {formatDate(today)}</span>
        </div>
        <form className="leave-form" onSubmit={submit}>
          <label>
            วันที่เริ่ม
            <input type="date" name="startDate" max={today} required disabled={busy === "create"} />
          </label>
          <label>
            วันที่สิ้นสุด
            <input type="date" name="endDate" max={today} required disabled={busy === "create"} />
          </label>
          <label>
            เวลาเริ่ม
            <input type="time" name="startTime" required disabled={busy === "create"} />
          </label>
          <label>
            เวลาสิ้นสุด
            <input type="time" name="endTime" required disabled={busy === "create"} />
          </label>
          <label className="form-span-2">
            เหตุผล
            <textarea
              name="reason"
              rows={3}
              maxLength={1000}
              required
              disabled={busy === "create"}
              placeholder="ระบุงานหรือเหตุผลในการทำโอที"
            />
          </label>
          <div className="form-span-2 form-actions">
            <button className="primary-button" type="submit" disabled={busy === "create"}>
              {busy === "create" ? "กำลังส่งคำขอ..." : "ส่งคำขอโอที"}
            </button>
          </div>
        </form>
      </section>
      ) : null}

      <section className="module-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">ATTENDANCE LINKAGE</p>
            <h2>การเชื่อมกับเวลาเข้างาน</h2>
          </div>
          <div className="ot-link-summary">
            <span>เชื่อมแล้ว {metrics?.linkedSegments ?? 0}</span>
            <span>ยังไม่เชื่อม {metrics?.unlinkedSegments ?? 0}</span>
          </div>
        </div>
        <p className="panel-description">
          Desktop แสดง linkage จาก Project B Server เท่านั้น ไม่สร้างหรือแก้
          Attendance linkage ฝั่ง client
        </p>
      </section>

      {workspaceView !== "new" ? (
      <section className="module-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              {workspaceView === "pending" ? "IN PROGRESS" : "HISTORY"}
            </p>
            <h2>
              {workspaceView === "pending"
                ? "คำขอ OT ที่กำลังดำเนินการ"
                : "ประวัติ OT"}
            </h2>
          </div>
          <span className="panel-note">{filteredVisibleRequests.length} รายการ</span>
        </div>

        <RequestListToolbar
          search={requestSearch}
          onSearchChange={setRequestSearch}
          month={requestMonth}
          onMonthChange={setRequestMonth}
          onClear={() => {
            setRequestSearch("");
            setRequestMonth("");
          }}
          onCreate={() => setWorkspaceView("new")}
          createLabel="ขอ OT"
          searchPlaceholder="ค้นหาเหตุผลหรือวันที่..."
        />

        {filteredVisibleRequests.length === 0 ? (
          <div className="empty-state">
            <h3>
              {workspaceView === "pending"
                ? "ไม่มีคำขอ OT ที่กำลังดำเนินการ"
                : "ยังไม่มีประวัติ OT"}
            </h3>
            <p>
              {workspaceView === "pending"
                ? "คำขอที่รอการพิจารณาจะแสดงที่นี่"
                : "คำขอที่สิ้นสุดแล้วจะแสดงที่นี่"}
            </p>
          </div>
        ) : (
          <div className="ot-history-list">
            {filteredVisibleRequests.map((request) => (
              <article className="ot-request-card" key={request.id}>
                <div className="ot-request-head">
                  <div>
                    <strong>{request.reason}</strong>
                    <small>ส่งเมื่อ {formatDateTime(request.submittedAt)}</small>
                  </div>
                  <span className={overtimeStatusClass(request.status)}>
                    {overtimeStatusLabel(request.status)}
                  </span>
                </div>

                <div className="ot-request-meta">
                  <span>{request.segments.length} ช่วง</span>
                  <span>{minutes(overtimeRequestMinutes(request))}</span>
                </div>

                <div className="ot-segment-grid">
                  {request.segments.map((segment) => (
                    <div className="ot-segment-card" key={segment.id}>
                      <strong>{formatDate(segment.workDate)}</strong>
                      <span>{segment.startTime}–{segment.endTime}</span>
                      <small>{minutes(segment.requestedMinutes)}</small>
                      <span
                        className={
                          segment.attendanceRecordId
                            ? "ot-link-state linked"
                            : "ot-link-state pending"
                        }
                      >
                        {attendanceLinkLabel(segment.attendanceRecordId)}
                      </span>
                    </div>
                  ))}
                </div>

                {request.decisionReason ? (
                  <div className="decision-note">
                    <strong>เหตุผลผลพิจารณา</strong>
                    <span>{request.decisionReason}</span>
                  </div>
                ) : null}

                {request.status === "PENDING" ? (
                  <div className="approval-actions">
                    <button
                      className="danger-button"
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => void cancel(request)}
                    >
                      {busy === request.id ? "กำลังยกเลิก..." : "ยกเลิกคำขอ"}
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
      ) : null}
    </div>
  );
}
