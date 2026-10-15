"use client";

import type {
  BenefitsSelfOverview,
} from "@ckace/contracts";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  benefitKindLabel,
  benefitSourceHref,
  benefitStatusLabel,
  benefitValueLabel,
  benefitsMetrics,
  filterBenefitsRequests,
  type BenefitKindFilter,
  type BenefitStatusFilter,
} from "./benefits-view";

type State =
  | { status: "loading" }
  | {
      status: "ready";
      overview: BenefitsSelfOverview;
    }
  | { status: "error"; message: string };

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat(
  "th-TH",
  {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  },
);

const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00+07:00`);
  return Number.isNaN(date.getTime())
    ? value
    : dateFormatter.format(date);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : dateTimeFormatter.format(date);
}

function errorMessage(status: number): string {
  if (status === 401) {
    return "หมดเวลาการเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่";
  }
  if (status === 403) {
    return "บัญชีนี้ไม่มีสิทธิ์ดูข้อมูลสวัสดิการ";
  }
  if (status === 503) {
    return "โมดูลสวัสดิการยังไม่เปิดใช้งานใน environment นี้";
  }
  return "ไม่สามารถโหลดข้อมูลสวัสดิการได้ กรุณาลองใหม่อีกครั้ง";
}

function percent(
  value: number,
  maximum: number,
): number {
  if (maximum <= 0) return 0;
  return Math.min(
    100,
    Math.max(0, (value / maximum) * 100),
  );
}

export default function DesktopBenefitsPage() {
  const [state, setState] = useState<State>({
    status: "loading",
  });
  const [kindFilter, setKindFilter] =
    useState<BenefitKindFilter>("ALL");
  const [statusFilter, setStatusFilter] =
    useState<BenefitStatusFilter>("ALL");

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/benefits/me", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(
          errorMessage(response.status),
        );
      }
      setState({
        status: "ready",
        overview:
          (await response.json()) as BenefitsSelfOverview,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลดข้อมูลสวัสดิการได้",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(
    () =>
      state.status === "ready"
        ? benefitsMetrics(state.overview)
        : null,
    [state],
  );

  const visibleRequests = useMemo(
    () =>
      state.status === "ready"
        ? filterBenefitsRequests(
            state.overview.requests,
            kindFilter,
            statusFilter,
          )
        : [],
    [kindFilter, state, statusFilter],
  );

  if (state.status === "loading") {
    return (
      <section
        className="module-state"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="spinner" aria-hidden="true" />
        <h1>กำลังโหลดข้อมูลสวัสดิการ</h1>
        <p>
          กำลังรวมข้อมูลโอทีและค่ารักษาพยาบาลจาก Project B
        </p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="module-state" role="alert">
        <div className="status-badge error">
          BENEFITS ERROR
        </div>
        <h1>เปิดข้อมูลสวัสดิการไม่สำเร็จ</h1>
        <p>{state.message}</p>
        <button
          className="primary-button"
          type="button"
          onClick={() => void load()}
        >
          ลองใหม่
        </button>
      </section>
    );
  }

  const { overview } = state;
  const entitlement = overview.medicalEntitlement;
  const committedPercent = percent(
    entitlement.committed,
    entitlement.annualLimit,
  );
  const approvedPercent = percent(
    entitlement.approved,
    entitlement.annualLimit,
  );

  return (
    <div className="module-stack">
      <section className="module-heading">
        <div>
          <p className="eyebrow">BENEFITS DESKTOP</p>
          <h1>สวัสดิการพนักงาน</h1>
          <p>
            ภาพรวมสิทธิค่ารักษาพยาบาลและประวัติคำขอ OT /
            Medical ที่ Project B รองรับในปัจจุบัน
          </p>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => void load()}
        >
          รีเฟรช
        </button>
      </section>

      <section className="benefits-source-note">
        <strong>ข้อมูลที่รองรับใน M9D.8</strong>
        <span>
          หน้านี้เป็น read-only projection จาก OT และ Medical
          เท่านั้น ไม่ได้สร้างนโยบายสวัสดิการประเภทอื่นเพิ่มเอง
        </span>
      </section>

      <section className="medical-metric-grid">
        <article className="metric-card">
          <span>วงเงินค่ารักษารายปี</span>
          <strong>
            {moneyFormatter.format(
              entitlement.annualLimit,
            )}
          </strong>
        </article>
        <article className="metric-card">
          <span>อนุมัติแล้ว</span>
          <strong>
            {moneyFormatter.format(
              entitlement.approved,
            )}
          </strong>
        </article>
        <article className="metric-card">
          <span>ยอดผูกพัน</span>
          <strong>
            {moneyFormatter.format(
              entitlement.committed,
            )}
          </strong>
        </article>
        <article className="metric-card">
          <span>คงเหลือ</span>
          <strong>
            {moneyFormatter.format(
              entitlement.remaining,
            )}
          </strong>
        </article>
      </section>

      <section className="module-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              MEDICAL ENTITLEMENT
            </p>
            <h2>การใช้วงเงินค่ารักษา</h2>
          </div>
          <Link
            className="secondary-button"
            href="/desktop/medical"
          >
            ไปหน้าค่ารักษา
          </Link>
        </div>

        <div className="benefits-progress-list">
          <div>
            <div className="benefits-progress-label">
              <span>อนุมัติแล้ว</span>
              <strong>
                {approvedPercent.toFixed(0)}%
              </strong>
            </div>
            <div className="benefits-progress-track">
              <span
                style={{
                  width: `${approvedPercent}%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="benefits-progress-label">
              <span>
                ยอดผูกพันรวม Pending + Approved
              </span>
              <strong>
                {committedPercent.toFixed(0)}%
              </strong>
            </div>
            <div className="benefits-progress-track committed">
              <span
                style={{
                  width: `${committedPercent}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span>คำขอทั้งหมด</span>
          <strong>
            {metrics?.totalRequests ?? 0}
          </strong>
        </article>
        <article className="metric-card">
          <span>โอที</span>
          <strong>
            {metrics?.overtimeRequests ?? 0}
          </strong>
        </article>
        <article className="metric-card">
          <span>ค่ารักษา</span>
          <strong>
            {metrics?.medicalRequests ?? 0}
          </strong>
        </article>
        <article className="metric-card">
          <span>รออนุมัติ</span>
          <strong>
            {metrics?.pendingRequests ?? 0}
          </strong>
        </article>
      </section>

      <section
        className="module-panel request-filter-panel"
        aria-label="ตัวกรองสวัสดิการ"
      >
        <label>
          <span>ประเภท</span>
          <select
            value={kindFilter}
            onChange={(event) =>
              setKindFilter(
                event.currentTarget
                  .value as BenefitKindFilter,
              )
            }
          >
            <option value="ALL">ทุกประเภท</option>
            <option value="OVERTIME">โอที</option>
            <option value="MEDICAL">
              ค่ารักษาพยาบาล
            </option>
          </select>
        </label>
        <label>
          <span>สถานะ</span>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.currentTarget
                  .value as BenefitStatusFilter,
              )
            }
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="PENDING">
              รออนุมัติ
            </option>
            <option value="APPROVED">
              อนุมัติแล้ว
            </option>
            <option value="REJECTED">
              ไม่อนุมัติ
            </option>
            <option value="CANCELLED">
              ยกเลิก
            </option>
          </select>
        </label>
      </section>

      <section className="module-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              BENEFIT ACTIVITY
            </p>
            <h2>ประวัติรายการ</h2>
          </div>
          <span className="panel-note">
            {visibleRequests.length} รายการ
          </span>
        </div>

        {visibleRequests.length === 0 ? (
          <div className="empty-state">
            <h3>ไม่พบรายการตามตัวกรอง</h3>
            <p>
              {overview.requests.length === 0
                ? "เมื่อมีคำขอ OT หรือ Medical รายการจะปรากฏที่นี่"
                : "ลองเปลี่ยนประเภทหรือสถานะที่เลือก"}
            </p>
          </div>
        ) : (
          <div className="benefits-history-list">
            {visibleRequests.map((request) => (
              <article
                className="benefits-request-card"
                key={request.id}
              >
                <div className="benefits-request-head">
                  <div>
                    <span
                      className={
                        "request-kind kind-" +
                        request.kind.toLowerCase()
                      }
                    >
                      {benefitKindLabel(request.kind)}
                    </span>
                    <strong>{request.reason}</strong>
                  </div>
                  <span
                    className={
                      "request-status status-" +
                      request.status.toLowerCase()
                    }
                  >
                    {benefitStatusLabel(
                      request.status,
                    )}
                  </span>
                </div>

                <div className="benefits-request-grid">
                  <div>
                    <span>วันที่</span>
                    <strong>
                      {formatDate(request.date)}
                    </strong>
                  </div>
                  <div>
                    <span>มูลค่า</span>
                    <strong>
                      {benefitValueLabel(request)}
                    </strong>
                  </div>
                  <div>
                    <span>ส่งเมื่อ</span>
                    <strong>
                      {formatDateTime(
                        request.submittedAt,
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>เอกสารแนบ</span>
                    <strong>
                      {request.attachments.length}
                    </strong>
                  </div>
                </div>

                {request.startTime &&
                request.endTime ? (
                  <p className="panel-description">
                    เวลา {request.startTime}–
                    {request.endTime}
                  </p>
                ) : null}

                {request.comment ? (
                  <div className="decision-note">
                    <strong>หมายเหตุผลพิจารณา</strong>
                    <span>{request.comment}</span>
                  </div>
                ) : null}

                <div className="benefits-request-actions">
                  <Link
                    className="secondary-button"
                    href={benefitSourceHref(
                      request.kind,
                    )}
                  >
                    เปิดโมดูลต้นทาง
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
