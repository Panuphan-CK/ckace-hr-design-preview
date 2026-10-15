"use client";

import type {
  RequestStatusItem,
  RequestStatusOverview,
  UnifiedRequestKind,
  UnifiedRequestStatus,
} from "@ckace/contracts";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const STATUS_LABEL: Readonly<Record<UnifiedRequestStatus, string>> = {
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
  CANCELLED: "ยกเลิก",
  REVISION_REQUESTED: "ส่งกลับแก้ไข",
};

const KIND_LABEL: Readonly<Record<UnifiedRequestKind, string>> = {
  LEAVE: "การลา",
  TIME_CORRECTION: "แก้ไขเวลา",
  OVERTIME: "โอที",
  MEDICAL: "ค่ารักษาพยาบาล",
};

type KindFilter = "ALL" | UnifiedRequestKind;
type StatusFilter = "ALL" | UnifiedRequestStatus;

type State =
  | { status: "loading" }
  | { status: "ready"; rows: readonly RequestStatusItem[] }
  | { status: "error"; message: string };

export default function DesktopRequestStatusPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [kindFilter, setKindFilter] = useState<KindFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/requests/me", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? "บัญชีนี้ไม่มีสิทธิ์ดูสถานะคำขอ"
            : response.status === 503
              ? "Request Status ยังไม่เปิดใช้งานใน environment นี้"
              : "ไม่สามารถโหลดสถานะคำขอได้",
        );
      }
      const body = (await response.json()) as RequestStatusOverview;
      setState({ status: "ready", rows: body.requests });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลดสถานะคำขอได้",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    if (state.status !== "ready") {
      return { all: 0, pending: 0, approved: 0, attention: 0 };
    }
    return {
      all: state.rows.length,
      pending: state.rows.filter((row) => row.status === "PENDING").length,
      approved: state.rows.filter((row) => row.status === "APPROVED").length,
      attention: state.rows.filter(
        (row) =>
          row.status === "REJECTED" ||
          row.status === "REVISION_REQUESTED",
      ).length,
    };
  }, [state]);

  const visibleRows = useMemo(() => {
    if (state.status !== "ready") return [];
    return state.rows.filter(
      (row) =>
        (kindFilter === "ALL" || row.kind === kindFilter) &&
        (statusFilter === "ALL" || row.status === statusFilter),
    );
  }, [kindFilter, state, statusFilter]);

  if (state.status === "loading") {
    return (
      <section
        className="module-state"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="spinner" aria-hidden="true" />
        <h1>กำลังโหลดสถานะคำขอ</h1>
        <p>กำลังรวมข้อมูลคำขอจากโมดูลที่รองรับ</p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="module-state" role="alert">
        <div className="status-badge error">REQUEST ERROR</div>
        <h1>โหลดสถานะคำขอไม่สำเร็จ</h1>
        <p>{state.message}</p>
        <button className="primary-button" onClick={() => void load()}>
          ลองใหม่
        </button>
      </section>
    );
  }

  return (
    <div className="module-stack">
      <section className="module-heading">
        <div>
          <p className="eyebrow">UNIFIED REQUEST STATUS</p>
          <h1>สถานะคำขอ</h1>
          <p>
            รวมคำขอการลา แก้ไขเวลา โอที และค่ารักษาพยาบาลจาก Project B
          </p>
        </div>
        <button className="secondary-button" onClick={() => void load()}>
          รีเฟรช
        </button>
      </section>

      <section className="metric-grid">
        <article className="metric-card"><span>ทั้งหมด</span><strong>{counts.all}</strong></article>
        <article className="metric-card"><span>รออนุมัติ</span><strong>{counts.pending}</strong></article>
        <article className="metric-card"><span>อนุมัติแล้ว</span><strong>{counts.approved}</strong></article>
        <article className="metric-card"><span>ต้องตรวจสอบ</span><strong>{counts.attention}</strong></article>
      </section>

      <section className="module-panel request-filter-panel" aria-label="ตัวกรองคำขอ">
        <label>
          <span>ประเภทคำขอ</span>
          <select value={kindFilter} onChange={(event) => setKindFilter(event.currentTarget.value as KindFilter)}>
            <option value="ALL">ทุกประเภท</option>
            <option value="LEAVE">การลา</option>
            <option value="TIME_CORRECTION">แก้ไขเวลา</option>
            <option value="OVERTIME">โอที</option>
            <option value="MEDICAL">ค่ารักษาพยาบาล</option>
          </select>
        </label>
        <label>
          <span>สถานะ</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.currentTarget.value as StatusFilter)}>
            <option value="ALL">ทุกสถานะ</option>
            <option value="PENDING">รออนุมัติ</option>
            <option value="APPROVED">อนุมัติแล้ว</option>
            <option value="REJECTED">ไม่อนุมัติ</option>
            <option value="REVISION_REQUESTED">ส่งกลับแก้ไข</option>
            <option value="CANCELLED">ยกเลิก</option>
          </select>
        </label>
      </section>

      <section className="module-panel">
        {visibleRows.length === 0 ? (
          <div className="empty-state">
            <h3>ไม่พบคำขอตามตัวกรอง</h3>
            <p>
              {state.rows.length === 0
                ? "เมื่อมีคำขอ รายการจะปรากฏที่หน้านี้"
                : "ลองเปลี่ยนประเภทหรือสถานะที่เลือก"}
            </p>
          </div>
        ) : (
          <div className="request-list">
            {visibleRows.map((request) => (
              <article className="request-row" key={request.id}>
                <div>
                  <div className="request-kind-line">
                    <span className={"request-kind kind-" + request.kind.toLowerCase()}>
                      {KIND_LABEL[request.kind]}
                    </span>
                    <strong>{request.summary}</strong>
                  </div>
                  <small>
                    ส่งเมื่อ {new Date(request.submittedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
                  </small>
                </div>
                <div className="request-row-status">
                  <span className={"request-status status-" + request.status.toLowerCase()}>
                    {STATUS_LABEL[request.status]}
                  </span>
                  {request.decisionReason ? <small>{request.decisionReason}</small> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
