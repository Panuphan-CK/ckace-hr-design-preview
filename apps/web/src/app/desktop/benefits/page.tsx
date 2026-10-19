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

import "../ck-v2-pages.css";
import { thaiDate, thaiDateTime } from "../ui/format";
import { DataGrid, DetailDialog, EmptyState, ErrorState, Filters, LoadingState, SectionHead, StatusDot, type DotTone } from "../ui/kit";
import { Icon } from "../ui/icons";
import {
  benefitKindLabel,
  benefitSourceHref,
  benefitStatusLabel,
  benefitValueLabel,
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

const money = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 2 });

const STATUS_TONE: Readonly<Record<string, DotTone>> = {
  PENDING: "wait",
  APPROVED: "ok",
  REJECTED: "bad",
  CANCELLED: "muted",
  REVISION_REQUESTED: "back",
};

const KIND_FILTERS: readonly { id: BenefitKindFilter; label: string }[] = [
  { id: "ALL", label: "ทั้งหมด" },
  { id: "OVERTIME", label: "โอที" },
  { id: "MEDICAL", label: "ค่ารักษา" },
];

const STATUS_FILTERS: readonly { id: BenefitStatusFilter; label: string }[] = [
  { id: "ALL", label: "ทุกสถานะ" },
  { id: "PENDING", label: "รออนุมัติ" },
  { id: "APPROVED", label: "อนุมัติ" },
  { id: "REJECTED", label: "ไม่อนุมัติ" },
];

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
  const [detail, setDetail] = useState<BenefitsSelfOverview["requests"][number] | null>(null);

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

  if (state.status === "loading") return <LoadingState title="กำลังโหลดข้อมูลสวัสดิการ" />;
  if (state.status === "error") return <ErrorState title="เปิดข้อมูลสวัสดิการไม่สำเร็จ" message={state.message} onRetry={() => void load()} />;

  const { overview } = state;
  const entitlement = overview.medicalEntitlement;
  const committedPercent = percent(entitlement.committed, entitlement.annualLimit);
  const approvedPercent = percent(entitlement.approved, entitlement.annualLimit);

  return (
    <div className="ck-stack">
      <section className="ck-panel ck-c-med" aria-labelledby="ben-quota">
        <SectionHead title="วงเงินค่ารักษาปีนี้" id="ben-quota">
          <Link className="ck-btn sm tone" href="/desktop/medical">
            ไปหน้าเบิกค่ารักษา
          </Link>
        </SectionHead>
        <div className="ck-quota">
          <div>
            <small>วงเงินทั้งปี</small>
            <b>{money.format(entitlement.annualLimit)}</b>
          </div>
          <div>
            <small>อนุมัติแล้ว</small>
            <b>{money.format(entitlement.approved)}</b>
          </div>
          <div>
            <small>รออนุมัติ</small>
            <b>{money.format(Math.max(entitlement.committed - entitlement.approved, 0))}</b>
          </div>
          <div>
            <small>คงเหลือ</small>
            <b className="hl">{money.format(entitlement.remaining)}</b>
          </div>
        </div>
        <div className="ck-track" style={{ marginTop: 14 }} title={"อนุมัติแล้ว " + approvedPercent.toFixed(0) + "%"}>
          <i style={{ width: committedPercent + "%" }} />
        </div>
        <p className="ck-hint" style={{ margin: "8px 0 0" }}>
          ใช้ไปแล้วรวมรออนุมัติ {committedPercent.toFixed(0)}% (อนุมัติแล้ว {approvedPercent.toFixed(0)}%)
        </p>
      </section>

      <section className="ck-panel ck-c-ot" aria-labelledby="ben-history">
        <SectionHead title="ประวัติ OT และค่ารักษา" id="ben-history" count={visibleRequests.length}>
          <Filters value={kindFilter} options={KIND_FILTERS} onChange={setKindFilter} />
          <Filters value={statusFilter} options={STATUS_FILTERS} onChange={setStatusFilter} />
        </SectionHead>
        <DataGrid
          rows={visibleRequests}
          rowKey={(request) => request.id}
          onRowClick={(request) => setDetail(request)}
          empty={
            <EmptyState icon="document" title="ไม่พบรายการ">
              {overview.requests.length === 0 ? "เมื่อมีคำขอ OT หรือเบิกค่ารักษา รายการจะแสดงที่นี่" : "ลองเปลี่ยนประเภทหรือสถานะที่เลือก"}
            </EmptyState>
          }
          columns={[
            {
              key: "st",
              header: "",
              width: "48px",
              align: "center",
              render: (request) => <StatusDot tone={STATUS_TONE[request.status] ?? "muted"} label={benefitStatusLabel(request.status)} />,
            },
            {
              key: "kind",
              header: "ประเภท",
              render: (request) => (
                <span className={"ck-gcell " + (request.kind === "OVERTIME" ? "ck-c-ot" : "ck-c-med")}>
                  <span className="ck-chip sm">
                    <Icon name={request.kind === "OVERTIME" ? "ot" : "med"} size={16} />
                  </span>
                  {benefitKindLabel(request.kind)}
                </span>
              ),
            },
            { key: "val", header: "ยอด", render: (request) => <b>{benefitValueLabel(request)}</b> },
            { key: "date", header: "วันที่", render: (request) => thaiDate(request.date) },
            { key: "reason", header: "รายละเอียด", render: (request) => request.reason || "—" },
            { key: "at", header: "ส่งเมื่อ", render: (request) => thaiDateTime(request.submittedAt) },
            { key: "go", header: "", width: "40px", align: "center", render: () => <Icon name="chevron" size={16} /> },
          ]}
        />
      </section>
      {detail ? (
        <DetailDialog
          tone={detail.kind === "OVERTIME" ? "ot" : "med"}
          icon={detail.kind === "OVERTIME" ? "ot" : "med"}
          kicker={benefitKindLabel(detail.kind)}
          title={benefitValueLabel(detail)}
          status={{ label: benefitStatusLabel(detail.status), tone: STATUS_TONE[detail.status] ?? "muted" }}
          onClose={() => setDetail(null)}
          footer={
            <Link className="ck-btn sky" href={benefitSourceHref(detail.kind)}>
              เปิดหน้ารายการ
            </Link>
          }
        >
          <dl className="ck-dlg-grid">
            <div>
              <dt>วันที่</dt>
              <dd>{thaiDate(detail.date)}</dd>
            </div>
            {detail.startTime && detail.endTime ? (
              <div>
                <dt>เวลา</dt>
                <dd>
                  {detail.startTime}–{detail.endTime}
                </dd>
              </div>
            ) : null}
            <div>
              <dt>ส่งเมื่อ</dt>
              <dd>{thaiDateTime(detail.submittedAt)}</dd>
            </div>
            <div>
              <dt>เอกสารแนบ</dt>
              <dd>{detail.attachments.length} ไฟล์</dd>
            </div>
          </dl>
          <div className="ck-dlg-sec">
            <h3>รายละเอียด</h3>
            <p>{detail.reason || "—"}</p>
          </div>
          {detail.comment ? (
            <div className="ck-dlg-sec">
              <h3>หมายเหตุผู้อนุมัติ</h3>
              <p>{detail.comment}</p>
            </div>
          ) : null}
        </DetailDialog>
      ) : null}
    </div>
  );
}
