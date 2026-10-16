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

import { thaiDate, thaiDateTime } from "../ui/format";
import { EmptyState, ErrorState, Filters, LoadingState, SectionHead } from "../ui/kit";
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

const STATUS_TONE: Readonly<Record<string, string>> = {
  PENDING: "wait",
  APPROVED: "ok",
  REJECTED: "bad",
  CANCELLED: "muted",
  REVISION_REQUESTED: "wait",
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
        {visibleRequests.length === 0 ? (
          <EmptyState title="ไม่พบรายการ">
            {overview.requests.length === 0 ? "เมื่อมีคำขอ OT หรือเบิกค่ารักษา รายการจะแสดงที่นี่" : "ลองเปลี่ยนประเภทหรือสถานะที่เลือก"}
          </EmptyState>
        ) : (
          <div className="ck-hgrid">
            {visibleRequests.map((request) => {
              const isOt = request.kind === "OVERTIME";
              return (
                <Link key={request.id} href={benefitSourceHref(request.kind)} className={"ck-hcard " + (isOt ? "ck-c-ot" : "ck-c-med")}>
                  <span className="ck-hc-top">
                    <span className="ck-chip">
                      <Icon name={isOt ? "ot" : "med"} />
                    </span>
                    <span>
                      <b>{benefitValueLabel(request)}</b>
                      <small>
                        {benefitKindLabel(request.kind)} · ส่งเมื่อ {thaiDateTime(request.submittedAt)}
                      </small>
                    </span>
                    <span className={"ck-pill " + (STATUS_TONE[request.status] ?? "muted")}>{benefitStatusLabel(request.status)}</span>
                  </span>
                  <dl className="ck-dl">
                    <div>
                      <dt>วันที่</dt>
                      <dd>{thaiDate(request.date)}</dd>
                    </div>
                    {request.startTime && request.endTime ? (
                      <div>
                        <dt>เวลา</dt>
                        <dd>
                          {request.startTime}–{request.endTime}
                        </dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>รายละเอียด</dt>
                      <dd>{request.reason || "—"}</dd>
                    </div>
                    {request.comment ? (
                      <div>
                        <dt>หมายเหตุผู้อนุมัติ</dt>
                        <dd>{request.comment}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>เอกสารแนบ</dt>
                      <dd>{request.attachments.length} ไฟล์</dd>
                    </div>
                  </dl>
                  <span className="ck-hc-foot">
                    <span className="ck-more">
                      เปิดหน้ารายการ
                      <Icon name="chevron" size={14} />
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
