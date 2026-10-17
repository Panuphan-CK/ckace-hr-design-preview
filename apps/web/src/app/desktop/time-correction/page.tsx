"use client";

import type { AttendanceSelfOverview, TimeCorrectionRequestView, TimeCorrectionStatus, TimeCorrectionType } from "@ckace/contracts";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { resolveSubmissionIntent, shouldDiscardSubmissionIntent, type SubmissionIntent } from "../submission-intent";
import { thaiDate, thaiDateTime } from "../ui/format";
import { Icon } from "../ui/icons";
import { DetailDialog, EmptyState, ErrorState, Filters, LoadingState, Message, PageHead, SectionHead, TimeInput } from "../ui/kit";
import { ApproverChainNotice } from "../ui/approver-chain";
import { AddRecordForm } from "./add-record-form";
import { RequestTimelineSection } from "../ui/request-timeline";
import { ResubmitPanel, type ResubmitOutcome } from "../ui/resubmit-panel";
import {
  bangkokMonthKey,
  CORRECTION_STATUS,
  CORRECTION_TYPE_LABEL,
  correctionErrorMessage,
  correctionMetrics,
  correctionTargets,
  correctionTimeSummary,
  correctionTitle,
  hasPendingRequest,
  recordTime,
  sortRecords,
  sortRequests,
} from "./time-correction-view";

type State =
  | { status: "loading" }
  | { status: "ready"; attendance: AttendanceSelfOverview; requests: readonly TimeCorrectionRequestView[] }
  | { status: "error"; message: string };
type Filter = "ALL" | TimeCorrectionStatus;

const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: "ALL", label: "ทั้งหมด" },
  { id: "PENDING", label: "รออนุมัติ" },
  { id: "APPROVED", label: "อนุมัติ" },
  { id: "REJECTED", label: "ไม่อนุมัติ" },
];

export default function DesktopTimeCorrectionPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [recordId, setRecordId] = useState("");
  const [type, setType] = useState<TimeCorrectionType>("CHECK_IN");
  const [correctedTime, setCorrectedTime] = useState("");
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [detail, setDetail] = useState<TimeCorrectionRequestView | null>(null);
  const intent = useRef<SubmissionIntent | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const [attendanceResponse, requestsResponse] = await Promise.all([
        fetch("/api/attendance/me", { credentials: "same-origin", cache: "no-store" }),
        fetch("/api/attendance/time-corrections/me", { credentials: "same-origin", cache: "no-store" }),
      ]);
      if (!attendanceResponse.ok) throw new Error(correctionErrorMessage(attendanceResponse.status, "load"));
      if (!requestsResponse.ok) throw new Error(correctionErrorMessage(requestsResponse.status, "load"));
      setState({
        status: "ready",
        attendance: (await attendanceResponse.json()) as AttendanceSelfOverview,
        requests: (await requestsResponse.json()) as readonly TimeCorrectionRequestView[],
      });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลการแก้ไขเวลาได้" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const records = useMemo(() => (state.status === "ready" ? sortRecords(state.attendance.records) : []), [state]);
  const requests = useMemo(() => (state.status === "ready" ? sortRequests(state.requests) : []), [state]);
  const metrics = useMemo(() => correctionMetrics(requests, bangkokMonthKey(new Date())), [requests]);
  const selected = records.find((record) => record.attendanceRecordId === recordId) ?? records[0] ?? null;
  const targets = selected ? correctionTargets() : [];
  const activeType: TimeCorrectionType = targets.includes(type) ? type : (targets[0] ?? "CHECK_IN");
  const systemTime = selected ? recordTime(selected, activeType) : null;
  const duplicate = selected ? hasPendingRequest(requests, selected.attendanceRecordId, activeType) : false;

  function resetForm() {
    setCorrectedTime("");
    setReason("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || busy) return;
    const trimmed = reason.trim();
    if (!correctedTime || !trimmed) {
      setMessage({ kind: "error", text: "กรุณาระบุเวลาที่ถูกต้องและเหตุผลให้ครบ" });
      return;
    }
    if (duplicate) {
      setMessage({ kind: "error", text: "มีคำขอที่รออนุมัติสำหรับรายการนี้อยู่แล้ว" });
      return;
    }
    const payload = { attendanceRecordId: selected.attendanceRecordId, correctionType: activeType, correctedTime, reason: trimmed };
    intent.current = resolveSubmissionIntent(intent.current, payload);
    setBusy("create");
    setMessage(null);
    try {
      const response = await fetch("/api/attendance/time-corrections", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, clientKey: intent.current.clientKey }),
      });
      if (!response.ok) {
        if (shouldDiscardSubmissionIntent(response.status)) intent.current = null;
        throw new Error(correctionErrorMessage(response.status, "create"));
      }
      intent.current = null;
      resetForm();
      setMessage({ kind: "success", text: "ส่งคำขอแก้ไขเวลาเรียบร้อยแล้ว" });
      await load();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "ส่งคำขอแก้ไขเวลาไม่สำเร็จ" });
    } finally {
      setBusy(null);
    }
  }

  async function resubmit(request: TimeCorrectionRequestView, values: Record<string, string>, clientKey: string): Promise<ResubmitOutcome> {
    try {
      const response = await fetch(`/api/attendance/time-corrections/${encodeURIComponent(request.requestId)}/resubmit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          clientKey,
          correctedTime: values.correctedTime,
          ...(values.correctedCheckOutTime ? { correctedCheckOutTime: values.correctedCheckOutTime } : {}),
          reason: values.reason,
        }),
      });
      if (!response.ok) return { ok: false, status: response.status, message: correctionErrorMessage(response.status, "create") };
      setDetail(null);
      setMessage({ kind: "success", text: "ส่งคำขอแก้ไขเวลาที่แก้ไขแล้วกลับไปให้ผู้อนุมัติเรียบร้อยแล้ว" });
      await load();
      return { ok: true };
    } catch {
      return { ok: false, status: 503, message: "ส่งไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
    }
  }

  async function cancel(request: TimeCorrectionRequestView) {
    if (busy || (request.status !== "PENDING" && request.status !== "REVISION_REQUESTED") || !window.confirm("ยืนยันยกเลิกคำขอแก้ไขเวลานี้?")) return;
    setBusy(request.requestId);
    setMessage(null);
    try {
      const response = await fetch(`/api/attendance/time-corrections/${encodeURIComponent(request.requestId)}/cancel`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(correctionErrorMessage(response.status, "cancel"));
      setDetail(null);
      setMessage({ kind: "success", text: "ยกเลิกคำขอแก้ไขเวลาแล้ว" });
      await load();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "ยกเลิกคำขอแก้ไขเวลาไม่สำเร็จ" });
    } finally {
      setBusy(null);
    }
  }

  if (state.status === "loading") return <LoadingState title="กำลังโหลดข้อมูลการแก้ไขเวลา" />;
  if (state.status === "error") return <ErrorState title="เปิดหน้าแก้ไขเวลาไม่สำเร็จ" message={state.message} onRetry={() => void load()} />;

  const filtered = filter === "ALL" ? requests : requests.filter((request) => request.status === filter);

  return (
    <>
      <PageHead tone="time" icon="time" title="แก้ไขเวลา" subtitle="ขอแก้ไขเวลาเข้าออกงานและดูประวัติ">
        <div className="ck-minibal">
          <span className="ck-c-time">
            <i />
            เดือนนี้ <b>{metrics.thisMonth}</b> ครั้ง
          </span>
          <span className="ck-c-ot">
            <i />
            รออนุมัติ <b>{metrics.pending}</b>
          </span>
        </div>
      </PageHead>

      <div className="ck-wrap ck-stack">
        <Message value={message} />

        <form className="ck-fbox ck-c-time" onSubmit={submit} noValidate>
          <SectionHead title="ขอแก้ไขเวลา" hint="ใช้เมื่อลืมสแกนหรือเวลาที่บันทึกไม่ถูกต้อง" />
          {records.length === 0 ? (
            <EmptyState title="ยังไม่มีรายการลงเวลา">เมื่อมีบันทึกเวลาเข้างาน จะเลือกวันที่เพื่อขอแก้ไขได้ที่นี่</EmptyState>
          ) : (
            <>
              <div className="ck-fgrid">
                <label className="ck-field span2">
                  <span>วันที่</span>
                  <select
                    className="ck-in"
                    value={selected?.attendanceRecordId ?? ""}
                    onChange={(event) => setRecordId(event.currentTarget.value)}
                  >
                    {records.map((record) => (
                      <option key={record.attendanceRecordId} value={record.attendanceRecordId}>
                        {thaiDate(record.workDate)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="ck-field span2">
                  <span>แก้ไขเวลา</span>
                  <div className="ck-seg" role="radiogroup" aria-label="ประเภทเวลาที่แก้ไข">
                    {(["CHECK_IN", "CHECK_OUT"] as const).map((code) => {
                      const enabled = targets.includes(code);
                      return (
                        <button
                          key={code}
                          type="button"
                          role="radio"
                          aria-checked={activeType === code}
                          disabled={!enabled}
                          className={activeType === code ? "on" : ""}
                          onClick={() => setType(code)}
                        >
                          {CORRECTION_TYPE_LABEL[code]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="ck-field">
                  <span>เวลาในระบบ</span>
                  <input className="ck-in" readOnly value={systemTime ?? "ไม่มีบันทึก"} />
                </label>
                <div className="ck-field">
                  <span>เวลาที่ถูกต้อง</span>
                  <TimeInput label="เวลาที่ถูกต้อง" value={correctedTime} onChange={setCorrectedTime} />
                </div>
                <label className="ck-field span2">
                  <span>เหตุผล</span>
                  <input
                    className="ck-in"
                    value={reason}
                    maxLength={2000}
                    placeholder="เช่น ลืมสแกนตอนเช้า เข้าประชุมลูกค้าทันที"
                    onChange={(event) => setReason(event.currentTarget.value)}
                  />
                </label>
              </div>

              <ApproverChainNotice url="/api/attendance/time-corrections/approval-chain" />

              <div className="ck-fbar">
                <span className="ck-sumline">
                  <Icon name="time" size={18} />
                  {selected && correctedTime ? (
                    <>
                      แก้เวลา{CORRECTION_TYPE_LABEL[activeType]}วันที่ <b>{thaiDate(selected.workDate)}</b> เป็น <b>{correctedTime}</b>
                    </>
                  ) : (
                    "เลือกวันที่และระบุเวลาที่ถูกต้อง ระบบจะสรุปให้ตรงนี้"
                  )}
                  {duplicate ? " (มีคำขอรออนุมัติอยู่แล้ว)" : ""}
                </span>
                <button className="ck-btn quiet ck-ml" type="button" onClick={resetForm}>
                  ล้างฟอร์ม
                </button>
                <button className="ck-btn tone" type="submit" disabled={busy !== null || duplicate}>
                  {busy === "create" ? "กำลังส่ง…" : "ส่งคำขอ"}
                </button>
              </div>
            </>
          )}
        </form>

        <AddRecordForm
          records={records}
          requests={requests}
          onResult={async (result) => {
            setMessage(result);
            if (result.kind === "success") await load();
          }}
        />

        <section className="ck-panel ck-c-time" aria-labelledby="tc-history">
          <SectionHead title="ประวัติการแก้ไขเวลา" id="tc-history" count={requests.length}>
            <Filters value={filter} options={FILTERS} onChange={setFilter} />
          </SectionHead>
          {filtered.length === 0 ? (
            <EmptyState title={requests.length === 0 ? "ยังไม่มีประวัติการแก้ไขเวลา" : "ไม่มีคำขอในสถานะนี้"}>คำขอที่ส่งแล้วจะแสดงที่นี่</EmptyState>
          ) : (
            <div className="ck-hgrid">
              {filtered.map((request) => {
                const status = CORRECTION_STATUS[request.status];
                const title = correctionTitle(request);
                return (
                  <button key={request.requestId} type="button" className="ck-hcard ck-c-time" onClick={() => setDetail(request)}>
                    <span className="ck-hc-top">
                      <span className="ck-chip">
                        <Icon name="time" />
                      </span>
                      <span>
                        <b>{title}</b>
                        <small>ยื่นเมื่อ {thaiDateTime(request.requestedAt)}</small>
                      </span>
                      <span className={"ck-pill " + status.tone}>{status.label}</span>
                    </span>
                    <dl className="ck-dl">
                      <div>
                        <dt>วันที่</dt>
                        <dd>{thaiDate(request.attendanceDate)}</dd>
                      </div>
                      <div>
                        <dt>เวลา</dt>
                        <dd>
                          {correctionTimeSummary(request)}
                        </dd>
                      </div>
                      <div>
                        <dt>เหตุผล</dt>
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
          tone="time"
          icon="time"
          kicker="รายละเอียดคำขอแก้ไขเวลา"
          title={correctionTitle(detail)}
          status={CORRECTION_STATUS[detail.status]}
          onClose={() => setDetail(null)}
          footer={
            detail.status === "PENDING" || detail.status === "REVISION_REQUESTED" ? (
              <button type="button" className="ck-btn no" disabled={busy !== null} onClick={() => void cancel(detail)}>
                ยกเลิกคำขอ
              </button>
            ) : null
          }
        >
          <dl className="ck-dlg-grid">
            <div>
              <dt>วันที่</dt>
              <dd>{thaiDate(detail.attendanceDate)}</dd>
            </div>
            <div>
              <dt>ยื่นเมื่อ</dt>
              <dd>{thaiDateTime(detail.requestedAt)}</dd>
            </div>
            <div>
              <dt>เวลาเดิม</dt>
              <dd>{detail.originalTime || "ไม่มีบันทึก"}</dd>
            </div>
            <div>
              <dt>{detail.correctionType === "ADD_RECORD" ? "เวลาที่ขอเพิ่ม" : "เวลาที่ขอแก้"}</dt>
              <dd>{correctionTimeSummary(detail).replace(/^.* เป็น /, "")}</dd>
            </div>
          </dl>
          <div className="ck-dlg-sec">
            <h3>เหตุผล</h3>
            <p>{detail.reason || "—"}</p>
          </div>
          <div className="ck-dlg-sec">
            <h3>ผลการพิจารณา</h3>
            <p>
              {detail.decisionComment || (detail.status === "PENDING" ? "รอผู้อนุมัติพิจารณา" : "—")}
              {detail.decidedAt ? ` (${thaiDateTime(detail.decidedAt)})` : ""}
            </p>
          </div>
          {detail.status === "REVISION_REQUESTED" ? (
            <ResubmitPanel
              key={detail.requestId}
              fields={[
                { name: "correctedTime", label: detail.correctionType === "ADD_RECORD" ? "เวลาเข้างาน" : "เวลาที่ขอแก้", type: "time", value: detail.correctedTime },
                ...(detail.correctionType === "ADD_RECORD"
                  ? [{ name: "correctedCheckOutTime", label: "เวลาออกงาน", type: "time" as const, value: detail.correctedCheckOutTime ?? "" }]
                  : []),
                { name: "reason", label: "เหตุผล", type: "textarea", value: detail.reason },
              ]}
              onSubmit={(values, clientKey) => resubmit(detail, values, clientKey)}
            />
          ) : null}
          <RequestTimelineSection requestId={detail.requestId} />
        </DetailDialog>
      ) : null}
    </>
  );
}
