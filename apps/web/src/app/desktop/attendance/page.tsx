"use client";

import type { AttendanceLocationInput, AttendanceRecordView, AttendanceSelfOverview } from "@ckace/contracts";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { resolveSubmissionIntent, shouldDiscardSubmissionIntent, type SubmissionIntent } from "../submission-intent";
import { thaiDate } from "../ui/format";
import { Icon } from "../ui/icons";
import { DetailDialog, EmptyState, ErrorState, LoadingState, Message, PageHead, SectionHead } from "../ui/kit";
import { bangkokTime, sortRecords } from "../time-correction/time-correction-view";
import {
  attendanceActionLabel,
  attendanceWriteFailureMessage,
  attendanceWritePath,
  attendanceWriteRetryMessage,
  buildAttendanceWritePayload,
  geolocationErrorMessage,
  type AttendanceWriteAction,
} from "./attendance-action";
import { ATTENDANCE_SESSION_EXPIRED_MESSAGE, attendanceMetrics, radiusLabel, sourceLabel } from "./attendance-view";

type State =
  | { status: "loading" }
  | { status: "ready"; value: AttendanceSelfOverview }
  | { status: "error"; message: string };

type LocationState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "ready"; value: AttendanceLocationInput }
  | { status: "error"; message: string };

function minuteLabel(value: number | null): string {
  if (value === null) return "—";
  if (value < 60) return `${value} นาที`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes ? `${hours} ชม. ${minutes} นาที` : `${hours} ชม.`;
}

function radiusTone(value: string): string {
  return value === "OUTSIDE" ? "bad" : value === "INSIDE" ? "ok" : "muted";
}

function loadErrorMessage(status: number): string {
  if (status === 401) return ATTENDANCE_SESSION_EXPIRED_MESSAGE;
  if (status === 403) return "บัญชีนี้ไม่มีสิทธิ์ดูข้อมูลเวลาเข้างาน";
  if (status === 503) return "ระบบเวลาเข้างานยังไม่พร้อมให้บริการในขณะนี้";
  return "ไม่สามารถโหลดข้อมูลเวลาเข้างานได้";
}

export default function DesktopAttendancePage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState<AttendanceWriteAction | null>(null);
  const [location, setLocation] = useState<LocationState>({ status: "idle" });
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [detail, setDetail] = useState<AttendanceRecordView | null>(null);
  const intent = useRef<SubmissionIntent | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/attendance/me", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(loadErrorMessage(response.status));
      setState({ status: "ready", value: (await response.json()) as AttendanceSelfOverview });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลเวลาเข้างานได้" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const requestLocation = useCallback(
    () =>
      new Promise<AttendanceLocationInput | null>((resolve) => {
        if (!navigator.geolocation) {
          setLocation({ status: "error", message: "เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง" });
          resolve(null);
          return;
        }
        setLocation({ status: "requesting" });
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const value: AttendanceLocationInput = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracyMeters: position.coords.accuracy,
            };
            if (
              !Number.isFinite(value.latitude) ||
              !Number.isFinite(value.longitude) ||
              !Number.isFinite(value.accuracyMeters) ||
              value.accuracyMeters < 0
            ) {
              setLocation({ status: "error", message: "ข้อมูลตำแหน่งไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง" });
              resolve(null);
              return;
            }
            setLocation({ status: "ready", value });
            resolve(value);
          },
          (error) => {
            setLocation({ status: "error", message: geolocationErrorMessage(error.code) });
            resolve(null);
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
        );
      }),
    [],
  );

  const records = useMemo(() => (state.status === "ready" ? sortRecords(state.value.records) : []), [state]);
  const metrics = useMemo(() => (state.status === "ready" ? attendanceMetrics(state.value) : null), [state]);

  async function submit(action: AttendanceWriteAction) {
    if (state.status !== "ready" || busy) return;
    const overview = state.value;
    const recordId = action === "check-out" ? overview.currentAttendanceRecordId : null;
    if (action === "check-in" && !overview.canCheckIn) {
      setMessage({ kind: "error", text: "ขณะนี้ยังไม่สามารถลงเวลาเข้าได้" });
      return;
    }
    if (action === "check-out" && (!overview.canCheckOut || !recordId)) {
      setMessage({ kind: "error", text: "ยังไม่พบรายการเวลาปัจจุบันสำหรับลงเวลาออก กรุณารีเฟรชข้อมูล" });
      return;
    }
    const currentLocation = await requestLocation();
    if (!currentLocation) return;

    intent.current = resolveSubmissionIntent(intent.current, {
      action,
      ...currentLocation,
      ...(recordId ? { attendanceRecordId: recordId } : {}),
    });
    const body = buildAttendanceWritePayload(action, currentLocation, intent.current.clientKey, recordId);

    setBusy(action);
    setMessage(null);
    try {
      const response = await fetch(attendanceWritePath(action), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        if (shouldDiscardSubmissionIntent(response.status)) intent.current = null;
        throw new Error(attendanceWriteFailureMessage(action, response.status));
      }
      intent.current = null;
      setMessage({ kind: "success", text: `${attendanceActionLabel(action)}เรียบร้อยแล้ว` });
      await load();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : attendanceWriteRetryMessage(action) });
    } finally {
      setBusy(null);
    }
  }

  if (state.status === "loading") return <LoadingState title="กำลังโหลดข้อมูลเวลาเข้างาน" />;
  if (state.status === "error") return <ErrorState title="เปิดหน้าลงเวลาไม่สำเร็จ" message={state.message} onRetry={() => void load()} />;

  const overview = state.value;
  const today = records.find((record) => record.attendanceRecordId === overview.currentAttendanceRecordId) ?? null;
  const locating = location.status === "requesting";
  const statusText = overview.canCheckOut ? "รอลงเวลาออก" : overview.canCheckIn ? "ยังไม่ได้ลงเวลาเข้า" : "บันทึกเวลาวันนี้แล้ว";

  return (
    <>
      <PageHead tone="time" icon="clock" title="ลงเวลาเข้า-ออกงาน" subtitle="บันทึกเวลาเข้าออกงานและดูประวัติของคุณ">
        <div className="ck-minibal">
          <span className="ck-c-ot">
            <i />
            มาสาย <b>{metrics?.lateRecords ?? 0}</b> ครั้ง
          </span>
          <span className="ck-c-med">
            <i />
            OT รวม <b>{minuteLabel(metrics?.overtimeMinutes ?? 0)}</b>
          </span>
        </div>
      </PageHead>

      <div className="ck-wrap ck-stack">
        <Message value={message} />

        <section className="ck-fbox ck-c-time" aria-labelledby="clock-today">
          <SectionHead title="วันนี้" id="clock-today" hint={overview.dayKind === "WORKDAY" ? "วันทำงาน" : "วันหยุด"} />
          <div className="ck-fgrid">
            <div className="ck-field">
              <span>เข้างาน</span>
              <input className="ck-in" readOnly value={bangkokTime(today?.checkInAt ?? null) ?? "—"} aria-label="เวลาเข้างานวันนี้" />
            </div>
            <div className="ck-field">
              <span>ออกงาน</span>
              <input className="ck-in" readOnly value={bangkokTime(today?.checkOutAt ?? null) ?? "—"} aria-label="เวลาออกงานวันนี้" />
            </div>
            <div className="ck-field span2">
              <span>สถานะ</span>
              <input className="ck-in" readOnly value={statusText} aria-label="สถานะการลงเวลา" />
            </div>
          </div>
          <div className="ck-fbar">
            <span className="ck-sumline">
              <Icon name="pin" size={18} />
              {location.status === "requesting"
                ? "กำลังขอตำแหน่งจากเบราว์เซอร์…"
                : location.status === "ready"
                  ? `ได้รับตำแหน่งแล้ว ความแม่นยำประมาณ ${Math.round(location.value.accuracyMeters)} เมตร`
                  : location.status === "error"
                    ? location.message
                    : "ก่อนบันทึกเวลาแต่ละครั้ง ระบบจะขอตำแหน่งปัจจุบันใหม่จากเบราว์เซอร์"}
            </span>
            <button className="ck-btn quiet ck-ml" type="button" disabled={busy !== null || locating} onClick={() => void requestLocation()}>
              ตรวจตำแหน่งอีกครั้ง
            </button>
            <button className="ck-btn tone" type="button" disabled={busy !== null || locating || !overview.canCheckIn} onClick={() => void submit("check-in")}>
              {busy === "check-in" ? "กำลังลงเวลาเข้า…" : "ลงเวลาเข้า"}
            </button>
            <button
              className="ck-btn tone"
              type="button"
              disabled={busy !== null || locating || !overview.canCheckOut || !overview.currentAttendanceRecordId}
              onClick={() => void submit("check-out")}
            >
              {busy === "check-out" ? "กำลังลงเวลาออก…" : "ลงเวลาออก"}
            </button>
          </div>
          {overview.canCheckOut && !overview.currentAttendanceRecordId ? (
            <p className="ck-hint" role="alert">
              ยังไม่พบรายการเวลาปัจจุบัน จึงยังลงเวลาออกไม่ได้ กรุณารีเฟรชข้อมูล
            </p>
          ) : null}
        </section>

        <section className="ck-panel ck-c-time" aria-labelledby="clock-history">
          <SectionHead title="ประวัติเข้า-ออกงาน" id="clock-history" count={records.length}>
            <Link className="ck-btn quiet ck-ml" href="/desktop/time-correction">
              ขอแก้ไขเวลา
            </Link>
          </SectionHead>
          {records.length === 0 ? (
            <EmptyState title="ยังไม่มีข้อมูลเวลาเข้างาน">เมื่อมีการบันทึกเวลา ประวัติจะแสดงที่นี่</EmptyState>
          ) : (
            <div className="ck-hgrid">
              {records.map((record) => {
                const late = (record.lateMinutes ?? 0) > 0;
                const early = (record.earlyMinutes ?? 0) > 0;
                return (
                  <button key={record.attendanceRecordId} type="button" className="ck-hcard ck-c-time" onClick={() => setDetail(record)}>
                    <span className="ck-hc-top">
                      <span className="ck-chip">
                        <Icon name="clock" />
                      </span>
                      <span>
                        <b>{thaiDate(record.workDate)}</b>
                        <small>
                          {bangkokTime(record.checkInAt) ?? "—"} ถึง {bangkokTime(record.checkOutAt) ?? "—"}
                        </small>
                      </span>
                      <span className={"ck-pill " + (late || early ? "wait" : "ok")}>{late ? "มาสาย" : early ? "ออกก่อน" : "ปกติ"}</span>
                    </span>
                    <dl className="ck-dl">
                      <div>
                        <dt>เวลาทำงาน</dt>
                        <dd>{minuteLabel(record.workMinutes)}</dd>
                      </div>
                      <div>
                        <dt>OT</dt>
                        <dd>{minuteLabel(record.overtimeMinutes)}</dd>
                      </div>
                      <div>
                        <dt>ตำแหน่ง</dt>
                        <dd>
                          เข้า {radiusLabel(record.checkInRadius)} / ออก {radiusLabel(record.checkOutRadius)}
                        </dd>
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
        <DetailDialog tone="time" icon="clock" kicker="รายละเอียดการลงเวลา" title={thaiDate(detail.workDate)} onClose={() => setDetail(null)}>
          <dl className="ck-dlg-grid">
            <div>
              <dt>เข้างาน</dt>
              <dd>{bangkokTime(detail.checkInAt) ?? "—"}</dd>
            </div>
            <div>
              <dt>ออกงาน</dt>
              <dd>{bangkokTime(detail.checkOutAt) ?? "—"}</dd>
            </div>
            <div>
              <dt>เวลาทำงาน</dt>
              <dd>{minuteLabel(detail.workMinutes)}</dd>
            </div>
            <div>
              <dt>OT</dt>
              <dd>{minuteLabel(detail.overtimeMinutes)}</dd>
            </div>
            <div>
              <dt>มาสาย</dt>
              <dd>{minuteLabel(detail.lateMinutes ?? 0)}</dd>
            </div>
            <div>
              <dt>ออกก่อน</dt>
              <dd>{minuteLabel(detail.earlyMinutes ?? 0)}</dd>
            </div>
          </dl>
          <div className="ck-dlg-sec">
            <h3>ตำแหน่งและแหล่งข้อมูล</h3>
            <dl className="ck-dl">
              <div>
                <dt>เข้างาน</dt>
                <dd>
                  <span className={"ck-pill " + radiusTone(detail.checkInRadius)}>{radiusLabel(detail.checkInRadius)}</span> ผ่าน{sourceLabel(detail.checkInSource)}
                </dd>
              </div>
              <div>
                <dt>ออกงาน</dt>
                <dd>
                  <span className={"ck-pill " + radiusTone(detail.checkOutRadius)}>{radiusLabel(detail.checkOutRadius)}</span> ผ่าน{sourceLabel(detail.checkOutSource)}
                </dd>
              </div>
              <div>
                <dt>กฎการทำงาน</dt>
                <dd>{detail.policyVersion ?? "—"}</dd>
              </div>
            </dl>
          </div>
        </DetailDialog>
      ) : null}
    </>
  );
}
