"use client";

import {
  REQUEST_STATUS_LABELS,
  type RequestStatusItem,
  type RequestStatusOverview,
  type UnifiedRequestKind,
  type UnifiedRequestStatus,
} from "@ckace/contracts";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "../requests-common/ck-v2-requests.css";
import { thaiDateTime } from "../ui/format";
import { Icon, type IconName } from "../ui/icons";
import {
  DataGrid,
  DetailDialog,
  EmptyState,
  ErrorState,
  Filters,
  LoadingState,
  PageHead,
  StatOrb,
  StatusDot,
  type DotTone,
  type Tone,
} from "../ui/kit";
import { RequestTimelineSection } from "../ui/request-timeline";

const KIND_LABEL: Readonly<Record<UnifiedRequestKind, string>> = {
  LEAVE: "การลา",
  TIME_CORRECTION: "แก้ไขเวลา",
  OVERTIME: "โอที",
  MEDICAL: "ค่ารักษาพยาบาล",
};

const KIND_META: Readonly<Record<UnifiedRequestKind, { tone: Tone; icon: IconName; href: string }>> = {
  LEAVE: { tone: "leave", icon: "leave", href: "/desktop/leave" },
  TIME_CORRECTION: { tone: "time", icon: "time", href: "/desktop/time-correction" },
  OVERTIME: { tone: "ot", icon: "ot", href: "/desktop/overtime" },
  MEDICAL: { tone: "med", icon: "med", href: "/desktop/medical" },
};

const STATUS_DOT: Readonly<Record<UnifiedRequestStatus, DotTone>> = {
  PENDING: "wait",
  APPROVED: "ok",
  REJECTED: "bad",
  CANCELLED: "muted",
  REVISION_REQUESTED: "back",
};

const KIND_TABS: readonly { id: "ALL" | UnifiedRequestKind; label: string }[] = [
  { id: "ALL", label: "ทั้งหมด" },
  { id: "LEAVE", label: "ลา" },
  { id: "OVERTIME", label: "OT" },
  { id: "TIME_CORRECTION", label: "แก้ไขเวลา" },
  { id: "MEDICAL", label: "ค่ารักษา" },
];

const STATUS_TABS: readonly { id: "ALL" | UnifiedRequestStatus; label: string }[] = [
  { id: "ALL", label: "ทุกสถานะ" },
  { id: "PENDING", label: "รออนุมัติ" },
  { id: "APPROVED", label: "อนุมัติแล้ว" },
  { id: "REJECTED", label: "ไม่อนุมัติ" },
  { id: "REVISION_REQUESTED", label: "ส่งกลับแก้ไข" },
  { id: "CANCELLED", label: "ยกเลิก" },
];

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
  const [detail, setDetail] = useState<RequestStatusItem | null>(null);

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

  if (state.status === "loading") return <LoadingState title="กำลังโหลดสถานะคำขอ" />;
  if (state.status === "error") return <ErrorState title="โหลดสถานะคำขอไม่สำเร็จ" message={state.message} onRetry={() => void load()} />;

  return (
    <>
      <PageHead tone="accent" icon="document" title="สถานะคำขอ" subtitle="คำขอทุกประเภทของคุณในที่เดียว">
        <button className="ck-btn quiet" type="button" onClick={() => void load()}>
          รีเฟรช
        </button>
      </PageHead>

      <div className="ck-wrap ck-stack">
        <div className="ck-live">
          <StatOrb tone="accent" value={String(counts.all)} label="ทั้งหมด" />
          <StatOrb tone="ot" value={String(counts.pending)} label="รออนุมัติ" />
          <StatOrb tone="med" value={String(counts.approved)} label="อนุมัติแล้ว" />
          <StatOrb tone="leave" value={String(counts.attention)} label="ต้องตรวจสอบ" />
        </div>

        <section className="ck-panel ck-c-accent" aria-label="รายการคำขอ">
          <div className="ck-filter-row">
            <Filters value={kindFilter} options={KIND_TABS} onChange={setKindFilter} />
            <Filters value={statusFilter} options={STATUS_TABS} onChange={setStatusFilter} />
          </div>
          <div className="ck-hist">
            <DataGrid
              rows={visibleRows}
              rowKey={(request) => request.id}
              onRowClick={setDetail}
              empty={
                <EmptyState icon="document" title={state.rows.length === 0 ? "ยังไม่มีคำขอ" : "ไม่พบคำขอตามตัวกรอง"}>
                  {state.rows.length === 0 ? "คำขอที่ส่งแล้วจะแสดงที่นี่" : "ลองเปลี่ยนประเภทหรือสถานะ"}
                </EmptyState>
              }
              columns={[
                {
                  key: "kind",
                  header: "ประเภท",
                  render: (request) => (
                    <span className={"ck-gkind ck-c-" + KIND_META[request.kind].tone}>
                      <span className="ck-chip">
                        <Icon name={KIND_META[request.kind].icon} size={16} />
                      </span>
                      <b>{KIND_LABEL[request.kind]}</b>
                    </span>
                  ),
                },
                { key: "summary", header: "รายละเอียด", render: (request) => request.summary },
                { key: "date", header: "ยื่นเมื่อ", render: (request) => thaiDateTime(request.submittedAt) },
                {
                  key: "status",
                  header: "สถานะ",
                  align: "center",
                  width: "80px",
                  render: (request) => <StatusDot tone={STATUS_DOT[request.status]} label={REQUEST_STATUS_LABELS[request.status]} />,
                },
              ]}
            />
          </div>
        </section>
      </div>

      {detail ? (
        <DetailDialog
          tone={KIND_META[detail.kind].tone}
          icon={KIND_META[detail.kind].icon}
          kicker={KIND_LABEL[detail.kind]}
          title={detail.summary}
          status={{ label: REQUEST_STATUS_LABELS[detail.status], tone: STATUS_DOT[detail.status] }}
          onClose={() => setDetail(null)}
          footer={
            <Link className="ck-btn sky" href={KIND_META[detail.kind].href}>
              ไปหน้า{KIND_LABEL[detail.kind]}
            </Link>
          }
        >
          <dl className="ck-dlg-grid">
            <div>
              <dt>ยื่นเมื่อ</dt>
              <dd>{thaiDateTime(detail.submittedAt)}</dd>
            </div>
            <div>
              <dt>ผลการพิจารณา</dt>
              <dd>{detail.decisionReason || (detail.status === "PENDING" ? "รอผู้อนุมัติพิจารณา" : "—")}</dd>
            </div>
          </dl>
          <RequestTimelineSection requestId={detail.id} />
        </DetailDialog>
      ) : null}
    </>
  );
}
