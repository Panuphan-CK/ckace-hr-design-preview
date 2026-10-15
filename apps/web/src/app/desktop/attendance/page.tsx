"use client";

import type {
  AttendanceLocationInput,
  AttendanceRecordView,
  AttendanceSelfOverview,
  TimeCorrectionRequestView,
  TimeCorrectionType,
} from "@ckace/contracts";
import type {
  FormEvent,
} from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

import {
  attendanceActionLabel,
  attendanceWriteFailureMessage,
  attendanceWritePath,
  attendanceWriteRetryMessage,
  buildAttendanceWritePayload,
  geolocationErrorMessage,
  type AttendanceWriteAction,
} from "./attendance-action";

import {
  ATTENDANCE_SESSION_EXPIRED_MESSAGE,
  attendanceMetrics,
  correctionTargets,
  radiusLabel,
  sourceLabel,
} from "./attendance-view";

type AttendanceState =
  | { status: "loading" }
  | { status: "ready"; value: AttendanceSelfOverview }
  | { status: "error"; message: string };

type CorrectionState =
  | { status: "loading" }
  | { status: "ready"; rows: readonly TimeCorrectionRequestView[] }
  | { status: "forbidden" }
  | { status: "error"; message: string };

type ActionMessage =
  | { kind: "success"; text: string }
  | { kind: "error"; text: string };

type LocationState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "ready"; value: AttendanceLocationInput }
  | { status: "error"; message: string };

const CORRECTION_STATUS: Readonly<Record<string, string>> = {
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
  CANCELLED: "ยกเลิก",
};

const CORRECTION_TYPE: Readonly<Record<TimeCorrectionType, string>> = {
  CHECK_IN: "เวลาเข้างาน",
  CHECK_OUT: "เวลาออกงาน",
};

const bangkokDate = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const bangkokClock = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatDate(value: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00+07:00`)
    : new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : bangkokDate.format(date);
}

function formatClock(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : bangkokClock.format(date);
}

function minuteLabel(value: number | null): string {
  if (value === null) return "—";
  if (value < 60) return `${value} นาที`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes
    ? `${hours} ชม. ${minutes} นาที`
    : `${hours} ชม.`;
}

function radiusClass(value: string): string {
  return value === "OUTSIDE"
    ? "attendance-state danger"
    : value === "INSIDE"
      ? "attendance-state success"
      : "attendance-state neutral";
}

function sourceClass(value: string | null): string {
  return value === "CORRECTION"
    ? "attendance-source corrected"
    : value === "LEGACY"
      ? "attendance-source legacy"
      : "attendance-source";
}

export default function DesktopAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceState>({
    status: "loading",
  });
  const [corrections, setCorrections] = useState<CorrectionState>({
    status: "loading",
  });
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [correctionType, setCorrectionType] =
    useState<TimeCorrectionType>("CHECK_IN");
  const [correctedTime, setCorrectedTime] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const correctionIntent = useRef<SubmissionIntent | null>(null);
  const attendanceIntent = useRef<SubmissionIntent | null>(null);
  const [location, setLocation] = useState<LocationState>({
    status: "idle",
  });
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const [correctionWorkspaceView, setCorrectionWorkspaceView] =
    useState<RequestWorkspaceView>("new");
  const [correctionSearch, setCorrectionSearch] = useState("");
  const [correctionMonth, setCorrectionMonth] = useState("");

  const loadAttendance = useCallback(async () => {
    setAttendance({ status: "loading" });
    try {
      const response = await fetch("/api/attendance/me", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? ATTENDANCE_SESSION_EXPIRED_MESSAGE
            : response.status === 403
              ? "บัญชีนี้ไม่มีสิทธิ์ดูข้อมูลเวลาเข้างาน"
              : response.status === 503
                ? "ระบบเวลาเข้างานยังไม่พร้อมให้บริการในขณะนี้"
                : "ไม่สามารถโหลดข้อมูลเวลาเข้างานได้",
        );
      }
      const value = (await response.json()) as AttendanceSelfOverview;
      setAttendance({ status: "ready", value });
    } catch (error) {
      setAttendance({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลดข้อมูลเวลาเข้างานได้",
      });
    }
  }, []);

  const requestLocation = useCallback(
    () =>
      new Promise<AttendanceLocationInput | null>((resolve) => {
        if (!navigator.geolocation) {
          const message = "เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง";
          setLocation({ status: "error", message });
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
              const message = "ข้อมูลตำแหน่งไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง";
              setLocation({ status: "error", message });
              resolve(null);
              return;
            }
            setLocation({ status: "ready", value });
            resolve(value);
          },
          (error) => {
            const message = geolocationErrorMessage(error.code);
            setLocation({ status: "error", message });
            resolve(null);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 15_000,
          },
        );
      }),
    [],
  );

  const loadCorrections = useCallback(async () => {
    setCorrections({ status: "loading" });
    try {
      const response = await fetch(
        "/api/attendance/time-corrections/me",
        {
          credentials: "same-origin",
          cache: "no-store",
        },
      );
      if (response.status === 401) {
        throw new Error(ATTENDANCE_SESSION_EXPIRED_MESSAGE);
      }
      if (response.status === 403) {
        setCorrections({ status: "forbidden" });
        return;
      }
      if (!response.ok) {
        throw new Error(
          response.status === 503
            ? "ระบบขอแก้ไขเวลายังไม่พร้อมให้บริการในขณะนี้"
            : "ไม่สามารถโหลดประวัติขอแก้ไขเวลาได้",
        );
      }
      const rows =
        (await response.json()) as readonly TimeCorrectionRequestView[];
      setCorrections({ status: "ready", rows });
    } catch (error) {
      setCorrections({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลดประวัติขอแก้ไขเวลาได้",
      });
    }
  }, []);

  useEffect(() => {
    void loadAttendance();
    void loadCorrections();
  }, [loadAttendance, loadCorrections]);

  useEffect(() => {
    if (
      attendance.status === "ready" &&
      !selectedRecordId &&
      attendance.value.records[0]
    ) {
      setSelectedRecordId(
        attendance.value.records[0].attendanceRecordId,
      );
    }
  }, [attendance, selectedRecordId]);

  const metrics = useMemo(
    () =>
      attendance.status === "ready"
        ? attendanceMetrics(attendance.value)
        : null,
    [attendance],
  );

  const selectedRecord = useMemo<AttendanceRecordView | null>(() => {
    if (attendance.status !== "ready") return null;
    return (
      attendance.value.records.find(
        (record) =>
          record.attendanceRecordId === selectedRecordId,
      ) ?? null
    );
  }, [attendance, selectedRecordId]);

  const availableTargets = useMemo(
    () =>
      selectedRecord
        ? correctionTargets(selectedRecord)
        : ([] as readonly TimeCorrectionType[]),
    [selectedRecord],
  );

  useEffect(() => {
    if (
      availableTargets.length > 0 &&
      !availableTargets.includes(correctionType)
    ) {
      setCorrectionType(availableTargets[0]!);
    }
  }, [availableTargets, correctionType]);

  async function submitAttendance(action: AttendanceWriteAction) {
    if (attendance.status !== "ready" || busy) return;

    const overview = attendance.value;
    const attendanceRecordId =
      action === "check-out"
        ? overview.currentAttendanceRecordId
        : null;
    if (action === "check-in" && !overview.canCheckIn) {
      setMessage({
        kind: "error",
        text: "ขณะนี้ยังไม่สามารถลงเวลาเข้าได้",
      });
      return;
    }
    if (
      action === "check-out" &&
      (!overview.canCheckOut || !attendanceRecordId)
    ) {
      setMessage({
        kind: "error",
        text: "ยังไม่พบรายการเวลาปัจจุบันสำหรับลงเวลาออก กรุณารีเฟรชข้อมูล",
      });
      return;
    }

    const currentLocation = await requestLocation();
    if (!currentLocation) return;

    const intentPayload = {
      action,
      ...currentLocation,
      ...(attendanceRecordId ? { attendanceRecordId } : {}),
    };
    const intent = resolveSubmissionIntent(
      attendanceIntent.current,
      intentPayload,
    );
    attendanceIntent.current = intent;
    const requestBody = buildAttendanceWritePayload(
      action,
      currentLocation,
      intent.clientKey,
      attendanceRecordId,
    );

    setBusy(action);
    setMessage(null);
    try {
      const response = await fetch(attendanceWritePath(action), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        if (shouldDiscardSubmissionIntent(response.status)) {
          attendanceIntent.current = null;
        }
        throw new Error(
          attendanceWriteFailureMessage(action, response.status),
        );
      }

      attendanceIntent.current = null;
      setMessage({
        kind: "success",
        text: `${attendanceActionLabel(action)}เรียบร้อยแล้ว`,
      });
      await loadAttendance();
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : attendanceWriteRetryMessage(action),
      });
    } finally {
      setBusy(null);
    }
  }

  async function submitCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !selectedRecord ||
      corrections.status === "forbidden" ||
      busy
    ) {
      return;
    }
    const normalizedReason = reason.trim();
    if (
      !/^\d{2}:\d{2}$/.test(correctedTime) ||
      !normalizedReason
    ) {
      setMessage({
        kind: "error",
        text: "กรุณาระบุเวลาใหม่และเหตุผลให้ครบ",
      });
      return;
    }

    const payload = {
      attendanceRecordId: selectedRecord.attendanceRecordId,
      correctionType,
      correctedTime,
      reason: normalizedReason,
    };
    correctionIntent.current = resolveSubmissionIntent(correctionIntent.current, payload);
    setBusy("create");
    setMessage(null);
    try {
      const response = await fetch(
        "/api/attendance/time-corrections",
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...payload, clientKey: correctionIntent.current.clientKey }),
        },
      );
      if (!response.ok) {
        if (shouldDiscardSubmissionIntent(response.status)) {
          correctionIntent.current = null;
        }
        throw new Error(
          response.status === 401
            ? ATTENDANCE_SESSION_EXPIRED_MESSAGE
            : response.status === 403
              ? "บัญชีนี้ไม่มีสิทธิ์ส่งคำขอแก้ไขเวลา"
              : response.status === 409
                ? "มีคำขอแก้ไขเวลาที่ชนกับรายการนี้ กรุณาตรวจสอบประวัติ"
                : response.status === 503
                  ? "ระบบขอแก้ไขเวลายังไม่พร้อมให้บริการในขณะนี้"
                  : "ส่งคำขอแก้ไขเวลาไม่สำเร็จ",
        );
      }

      correctionIntent.current = null;
      setCorrectedTime("");
      setReason("");
      setMessage({
        kind: "success",
        text: "ส่งคำขอแก้ไขเวลาเรียบร้อยแล้ว",
      });
      await loadCorrections();
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "ส่งคำขอแก้ไขเวลาไม่สำเร็จ",
      });
    } finally {
      setBusy(null);
    }
  }

  async function cancelCorrection(requestId: string) {
    if (busy) return;
    setBusy(requestId);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/attendance/time-corrections/${encodeURIComponent(requestId)}/cancel`,
        {
          method: "POST",
          credentials: "same-origin",
        },
      );
      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? ATTENDANCE_SESSION_EXPIRED_MESSAGE
            : response.status === 403
              ? "บัญชีนี้ไม่มีสิทธิ์ยกเลิกคำขอนี้"
              : response.status === 409
                ? "สถานะคำขอแก้ไขเวลาเปลี่ยนแล้ว กรุณารีเฟรช"
                : response.status === 503
                  ? "ระบบขอแก้ไขเวลายังไม่พร้อมให้บริการในขณะนี้"
                  : "ยกเลิกคำขอแก้ไขเวลาไม่สำเร็จ",
        );
      }
      setMessage({
        kind: "success",
        text: "ยกเลิกคำขอแก้ไขเวลาแล้ว",
      });
      await loadCorrections();
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "ยกเลิกคำขอแก้ไขเวลาไม่สำเร็จ",
      });
    } finally {
      setBusy(null);
    }
  }

  if (attendance.status === "loading") {
    return (
      <section
        className="module-state"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="spinner" aria-hidden="true" />
        <h1>กำลังโหลดข้อมูลเวลาเข้างาน</h1>
        <p>กำลังสรุปประวัติการบันทึกเวลาและสถิติการทำงาน</p>
      </section>
    );
  }

  if (attendance.status === "error") {
    return (
      <section className="module-state" role="alert">
        <div className="status-badge error">เกิดข้อผิดพลาด</div>
        <h1>โหลดข้อมูลเวลาเข้างานไม่สำเร็จ</h1>
        <p>{attendance.message}</p>
        <button
          className="primary-button"
          type="button"
          onClick={() => void loadAttendance()}
        >
          ลองใหม่
        </button>
      </section>
    );
  }

  const overview = attendance.value;
  const todayRecord =
    overview.records.find(
      (record) =>
        record.attendanceRecordId ===
        overview.currentAttendanceRecordId,
    ) ?? null;
  const pendingCorrections =
    corrections.status === "ready"
      ? corrections.rows.filter((row) => row.status === "PENDING")
      : [];
  const historyCorrections =
    corrections.status === "ready"
      ? corrections.rows.filter((row) => row.status !== "PENDING")
      : [];
  const visibleCorrections =
    correctionWorkspaceView === "pending"
      ? pendingCorrections
      : historyCorrections;
  const correctionSearchKey = correctionSearch.trim().toLocaleLowerCase("th");
  const filteredVisibleCorrections = visibleCorrections.filter((row) => {
    const matchesSearch =
      correctionSearchKey.length === 0 ||
      [
        CORRECTION_TYPE[row.correctionType],
        CORRECTION_STATUS[row.status] ?? row.status,
        row.attendanceDate,
        row.reason,
        row.decisionComment ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("th")
        .includes(correctionSearchKey);
    const matchesMonth =
      correctionMonth.length === 0 ||
      row.attendanceDate.slice(5, 7) === correctionMonth;
    return matchesSearch && matchesMonth;
  });

  return (
    <div className="module-stack task398-request-page">
      <section className="module-heading">
        <div>
          <p className="eyebrow">บริการเวลาเข้างาน</p>
          <h1>เวลาเข้างาน</h1>
          <p>
            ดูประวัติการเข้า-ออกงาน บันทึกเวลา และส่งคำขอแก้ไขเวลา
            จากข้อมูลที่ระบบจัดเก็บไว้
          </p>
        </div>
      </section>

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

      <section className="attendance-today-grid">
        <article className="module-panel attendance-today-card">
          <span className="summary-kicker">วันนี้</span>
          <h2>
            {overview.dayKind === "WORKDAY"
              ? "วันทำงาน"
              : "วันหยุด"}
          </h2>
          <div className="attendance-today-times">
            <div>
              <span>เข้างาน</span>
              <strong>{formatClock(todayRecord?.checkInAt ?? null)}</strong>
            </div>
            <div>
              <span>ออกงาน</span>
              <strong>{formatClock(todayRecord?.checkOutAt ?? null)}</strong>
            </div>
          </div>
          <p className="muted">
            ตรวจสอบเวลาได้จากข้อมูลปัจจุบันของคุณ
          </p>
        </article>

        <article className="module-panel attendance-today-card">
          <span className="summary-kicker">สถานะปัจจุบัน</span>
          <h2>
            {overview.canCheckOut
              ? "มีรายการที่รอลงเวลาออก"
              : overview.canCheckIn
                ? "ยังไม่มีรายการวันนี้"
                : "บันทึกเวลาวันนี้แล้ว"}
          </h2>
          <p className="muted">
            สถานะนี้คำนวณจากข้อมูลเวลาของคุณโดยระบบ
          </p>
          <div className="attendance-action-panel">
            <div className="attendance-action-buttons">
              <button
                className="primary-button"
                type="button"
                disabled={
                  busy !== null ||
                  location.status === "requesting" ||
                  !overview.canCheckIn
                }
                onClick={() => void submitAttendance("check-in")}
              >
                {busy === "check-in" ? "กำลังลงเวลาเข้า…" : "ลงเวลาเข้า"}
              </button>
              <button
                className="success-button"
                type="button"
                disabled={
                  busy !== null ||
                  location.status === "requesting" ||
                  !overview.canCheckOut ||
                  !overview.currentAttendanceRecordId
                }
                onClick={() => void submitAttendance("check-out")}
              >
                {busy === "check-out" ? "กำลังลงเวลาออก…" : "ลงเวลาออก"}
              </button>
            </div>
            <button
              className="secondary-button compact"
              type="button"
              disabled={busy !== null || location.status === "requesting"}
              onClick={() => void requestLocation()}
            >
              ใช้ตำแหน่งปัจจุบันอีกครั้ง
            </button>
            {location.status === "requesting" ? (
              <p className="field-help" role="status" aria-live="polite">
                กำลังขอตำแหน่งจากเบราว์เซอร์…
              </p>
            ) : location.status === "ready" ? (
              <p className="field-help" role="status" aria-live="polite">
                ได้รับตำแหน่งแล้ว ความแม่นยำประมาณ {Math.round(location.value.accuracyMeters)} เมตร
              </p>
            ) : location.status === "error" ? (
              <p className="form-error" role="alert">
                {location.message}
              </p>
            ) : (
              <p className="field-help">
                ก่อนบันทึกเวลาแต่ละครั้ง ระบบจะขอตำแหน่งปัจจุบันใหม่จากเบราว์เซอร์
              </p>
            )}
            {overview.canCheckOut && !overview.currentAttendanceRecordId ? (
              <p className="form-error" role="alert">
                ยังไม่พบรายการเวลาปัจจุบัน จึงยังลงเวลาออกไม่ได้
              </p>
            ) : null}
          </div>
        </article>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span>รายการทั้งหมด</span>
          <strong>{metrics?.totalRecords ?? 0}</strong>
        </article>
        <article className="metric-card">
          <span>มาสาย</span>
          <strong>{metrics?.lateRecords ?? 0}</strong>
        </article>
        <article className="metric-card">
          <span>ออกก่อน</span>
          <strong>{metrics?.earlyRecords ?? 0}</strong>
        </article>
        <article className="metric-card">
          <span>นอกพื้นที่</span>
          <strong>{metrics?.outsideRadiusEvents ?? 0}</strong>
        </article>
        <article className="metric-card">
          <span>โอทีรวม</span>
          <strong>{minuteLabel(metrics?.overtimeMinutes ?? 0)}</strong>
        </article>
      </section>

      <section className="module-panel">
        <div className="panel-heading">
          <div>
            <span className="summary-kicker">ประวัติการบันทึกเวลา</span>
            <h2>ประวัติเข้า-ออกงาน</h2>
          </div>
        </div>

        {overview.records.length === 0 ? (
          <div className="empty-state">
            <h3>ยังไม่มีข้อมูลเวลาเข้างาน</h3>
            <p>เมื่อมีการบันทึกเวลา ประวัติจะปรากฏในตารางนี้</p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table attendance-table">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>เข้า / ออก</th>
                  <th>เวลาทำงาน</th>
                  <th>มาสาย / ออกก่อน</th>
                  <th>OT</th>
                  <th>ระยะห่าง</th>
                  <th>แหล่งข้อมูล</th>
                </tr>
              </thead>
              <tbody>
                {overview.records.map((record) => (
                  <tr key={record.attendanceRecordId}>
                    <td>
                      <strong>{formatDate(record.workDate)}</strong>
                      <small>
                        กฎการทำงาน {record.policyVersion ?? "—"}
                      </small>
                    </td>
                    <td>
                      <strong>
                        {formatClock(record.checkInAt)} →{" "}
                        {formatClock(record.checkOutAt)}
                      </strong>
                    </td>
                    <td>{minuteLabel(record.workMinutes)}</td>
                    <td>
                      <span
                        className={
                          (record.lateMinutes ?? 0) > 0
                            ? "attendance-state danger"
                            : "attendance-state success"
                        }
                      >
                        สาย {minuteLabel(record.lateMinutes ?? 0)}
                      </span>
                      <span
                        className={
                          (record.earlyMinutes ?? 0) > 0
                            ? "attendance-state danger"
                            : "attendance-state success"
                        }
                      >
                        ก่อน {minuteLabel(record.earlyMinutes ?? 0)}
                      </span>
                    </td>
                    <td>{minuteLabel(record.overtimeMinutes)}</td>
                    <td>
                      <span className={radiusClass(record.checkInRadius)}>
                        เข้า: {radiusLabel(record.checkInRadius)}
                      </span>
                      <span className={radiusClass(record.checkOutRadius)}>
                        ออก: {radiusLabel(record.checkOutRadius)}
                      </span>
                    </td>
                    <td>
                      <span className={sourceClass(record.checkInSource)}>
                        เข้า: {sourceLabel(record.checkInSource)}
                      </span>
                      <span className={sourceClass(record.checkOutSource)}>
                        ออก: {sourceLabel(record.checkOutSource)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="correction-request" className="module-stack task396-correction-workspace">
        <RequestWorkspaceTabs
          value={correctionWorkspaceView}
          onChange={setCorrectionWorkspaceView}
          newLabel="ขอแก้ไขเวลา"
          pendingCount={pendingCorrections.length}
          historyCount={historyCorrections.length}
        />

        <div className="attendance-correction-grid">
        {correctionWorkspaceView === "new" ? (
        <article className="module-panel">
          <div className="panel-heading">
            <div>
              <span className="summary-kicker">คำขอแก้ไขเวลา</span>
              <h2>ขอแก้ไขเวลา</h2>
            </div>
          </div>

          {corrections.status === "forbidden" ? (
            <div className="empty-state compact">
              <h3>บัญชีนี้ไม่มีสิทธิ์ขอแก้ไขเวลา</h3>
              <p>ระบบจะตรวจสอบสิทธิ์ของคุณก่อนส่งคำขอทุกครั้ง</p>
            </div>
          ) : overview.records.length === 0 ? (
            <div className="empty-state compact">
              <h3>ยังไม่มีรายการสำหรับแก้ไข</h3>
              <p>ต้องมีรายการบันทึกเวลาก่อนจึงจะส่งคำขอแก้ไขเวลาได้</p>
            </div>
          ) : (
            <form
              className="attendance-correction-form"
              onSubmit={submitCorrection}
            >
              <label>
                <span>รายการวันที่</span>
                <select
                  value={selectedRecordId}
                  onChange={(event) => {
                    setSelectedRecordId(event.currentTarget.value);
                    setCorrectedTime("");
                  }}
                  disabled={busy !== null}
                >
                  {overview.records.map((record) => (
                    <option
                      value={record.attendanceRecordId}
                      key={record.attendanceRecordId}
                    >
                      {formatDate(record.workDate)} ·{" "}
                      {formatClock(record.checkInAt)} -{" "}
                      {formatClock(record.checkOutAt)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>ต้องการแก้ไข</span>
                <select
                  value={correctionType}
                  onChange={(event) =>
                    setCorrectionType(
                      event.currentTarget.value as TimeCorrectionType,
                    )
                  }
                  disabled={busy !== null}
                >
                  {availableTargets.map((target) => (
                    <option value={target} key={target}>
                      {CORRECTION_TYPE[target]}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>เวลาเดิม</span>
                <input
                  readOnly
                  value={
                    !selectedRecord
                      ? ""
                      : correctionType === "CHECK_IN"
                        ? formatClock(selectedRecord.checkInAt)
                        : formatClock(selectedRecord.checkOutAt)
                  }
                />
              </label>

              <label>
                <span>เวลาใหม่</span>
                <input
                  type="time"
                  required
                  value={correctedTime}
                  onChange={(event) =>
                    setCorrectedTime(event.currentTarget.value)
                  }
                  disabled={busy !== null}
                />
              </label>

              <label className="form-span-2">
                <span>เหตุผล</span>
                <textarea
                  rows={4}
                  required
                  maxLength={1000}
                  value={reason}
                  onChange={(event) =>
                    setReason(event.currentTarget.value)
                  }
                  disabled={busy !== null}
                />
              </label>

              <div className="form-span-2">
                <button
                  className="primary-button"
                  type="submit"
                  disabled={
                    busy !== null ||
                    corrections.status === "loading" ||
                    corrections.status === "error" ||
                    !selectedRecord
                  }
                >
                  {busy === "create"
                    ? "กำลังส่งคำขอ..."
                    : "ส่งคำขอแก้ไขเวลา"}
                </button>
              </div>
            </form>
          )}
        </article>
        ) : null}

        {correctionWorkspaceView !== "new" ? (
        <article className="module-panel">
          <div className="panel-heading">
            <div>
              <span className="summary-kicker">
                {correctionWorkspaceView === "pending"
                  ? "กำลังดำเนินการ"
                  : "ประวัติคำขอแก้ไขเวลา"}
              </span>
              <h2>
                {correctionWorkspaceView === "pending"
                  ? "คำขอแก้ไขเวลาที่กำลังดำเนินการ"
                  : "ประวัติคำขอแก้ไขเวลา"}
              </h2>
            </div>
          </div>

          <RequestListToolbar
            search={correctionSearch}
            onSearchChange={setCorrectionSearch}
            month={correctionMonth}
            onMonthChange={setCorrectionMonth}
            onClear={() => {
              setCorrectionSearch("");
              setCorrectionMonth("");
            }}
            onCreate={() => setCorrectionWorkspaceView("new")}
            createLabel="ขอแก้ไขเวลา"
            searchPlaceholder="ค้นหาเหตุผลหรือวันที่..."
          />

          {corrections.status === "loading" ? (
            <div
              className="empty-state compact"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="spinner" aria-hidden="true" />
              <p>กำลังโหลดประวัติคำขอ</p>
            </div>
          ) : corrections.status === "error" ? (
            <div className="empty-state compact" role="alert">
              <h3>โหลดประวัติไม่สำเร็จ</h3>
              <p>{corrections.message}</p>
              <button
                className="secondary-button"
                type="button"
                onClick={() => void loadCorrections()}
              >
                ลองใหม่
              </button>
            </div>
          ) : corrections.status === "forbidden" ? (
            <div className="empty-state compact">
              <h3>ไม่มีสิทธิ์ดูประวัติคำขอแก้ไขเวลา</h3>
            </div>
          ) : filteredVisibleCorrections.length === 0 ? (
            <div className="empty-state compact">
              <h3>
                {correctionWorkspaceView === "pending"
                  ? "ไม่มีคำขอแก้ไขเวลาที่กำลังดำเนินการ"
                  : "ยังไม่มีประวัติคำขอแก้ไขเวลา"}
              </h3>
              <p>
                {correctionWorkspaceView === "pending"
                  ? "คำขอที่รอการพิจารณาจะแสดงที่นี่"
                  : "คำขอที่สิ้นสุดแล้วจะแสดงที่นี่"}
              </p>
            </div>
          ) : (
            <div className="correction-list">
              {filteredVisibleCorrections.map((row) => (
                <article
                  className="correction-row"
                  key={row.requestId}
                >
                  <div>
                    <div className="request-kind-line">
                      <span className="request-kind kind-time_correction">
                        {CORRECTION_TYPE[row.correctionType]}
                      </span>
                      <span
                        className={`request-status status-${row.status.toLowerCase()}`}
                      >
                        {CORRECTION_STATUS[row.status] ?? row.status}
                      </span>
                    </div>
                    <strong>
                      {formatDate(row.attendanceDate)} ·{" "}
                      {row.originalTime} → {row.correctedTime}
                    </strong>
                    <small>{row.reason}</small>
                    {row.decisionComment ? (
                      <small>ความเห็น: {row.decisionComment}</small>
                    ) : null}
                  </div>
                  {row.status === "PENDING" ? (
                    <button
                      className="danger-button"
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        void cancelCorrection(row.requestId)
                      }
                    >
                      {busy === row.requestId
                        ? "กำลังยกเลิก..."
                        : "ยกเลิกคำขอ"}
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </article>
        ) : null}
        </div>
      </section>
    </div>
  );
}
