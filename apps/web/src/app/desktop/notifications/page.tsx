"use client";

import type {
  NotificationAdminOverview,
} from "@ckace/contracts";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "../ck-v2-pages.css";
import { thaiDateTime } from "../ui/format";
import { Icon } from "../ui/icons";
import { DataGrid, DetailDialog, EmptyState, ErrorState, Filters, LoadingState, Message, PageHead, SectionHead, StatOrb, StatusDot, type DotTone } from "../ui/kit";
import {
  filterNotifications,
  notificationMetrics,
  notificationStatusLabel,
  type NotificationStatusFilter,
} from "./notifications-view";

type State =
  | { status: "loading" }
  | {
      status: "ready";
      overview: NotificationAdminOverview;
    }
  | { status: "error"; message: string };

type Message =
  | { kind: "success"; text: string }
  | { kind: "error"; text: string };

const STATUS_DOT: Readonly<Record<string, DotTone>> = {
  PENDING: "wait",
  PROCESSING: "wait",
  SENT: "ok",
  FAILED: "bad",
  CANCELLED: "muted",
};

const STATUS_FILTERS: readonly { id: NotificationStatusFilter; label: string }[] = [
  { id: "ALL", label: "ทุกสถานะ" },
  { id: "PENDING", label: "รอส่ง" },
  { id: "PROCESSING", label: "กำลังส่ง" },
  { id: "SENT", label: "ส่งแล้ว" },
  { id: "FAILED", label: "ล้มเหลว" },
  { id: "CANCELLED", label: "ยกเลิก" },
];

function errorMessage(status: number): string {
  if (status === 401) {
    return "หมดเวลาการเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่";
  }
  if (status === 403) {
    return "บัญชีนี้ไม่มีสิทธิ์ดู Notification Operations";
  }
  if (status === 409) {
    return "รายการนี้ไม่อยู่ในสถานะ FAILED แล้ว กรุณารีเฟรช";
  }
  if (status === 503) {
    return "โมดูล Notifications ยังไม่เปิดใช้งานใน environment นี้";
  }
  return "ไม่สามารถดำเนินการกับ Notifications ได้ กรุณาลองใหม่อีกครั้ง";
}

export default function DesktopNotificationsPage() {
  const [state, setState] = useState<State>({
    status: "loading",
  });
  const [statusFilter, setStatusFilter] =
    useState<NotificationStatusFilter>("ALL");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch(
        "/api/admin/notifications",
        {
          credentials: "same-origin",
          cache: "no-store",
        },
      );
      if (!response.ok) {
        throw new Error(errorMessage(response.status));
      }
      setState({
        status: "ready",
        overview:
          (await response.json()) as NotificationAdminOverview,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลด Notifications ได้",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(
    () =>
      state.status === "ready"
        ? notificationMetrics(state.overview)
        : null,
    [state],
  );

  const visibleRows = useMemo(
    () =>
      state.status === "ready"
        ? filterNotifications(
            state.overview.notifications,
            statusFilter,
            query,
          )
        : [],
    [query, state, statusFilter],
  );

  async function retryNotification(id: string) {
    if (
      state.status !== "ready" ||
      !state.overview.canRetry ||
      busyId
    ) {
      return;
    }
    setBusyId(id);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/notifications/${encodeURIComponent(id)}/retry`,
        {
          method: "POST",
          credentials: "same-origin",
        },
      );
      if (!response.ok) {
        throw new Error(errorMessage(response.status));
      }
      setMessage({
        kind: "success",
        text: "ส่งคำขอ Retry เข้าคิวเรียบร้อยแล้ว",
      });
      await load();
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Retry notification ไม่สำเร็จ",
      });
    } finally {
      setBusyId(null);
    }
  }

  if (state.status === "loading") return <LoadingState title="กำลังโหลดรายการแจ้งเตือน" />;
  if (state.status === "error") {
    return <ErrorState title="เปิดการส่งแจ้งเตือนไม่สำเร็จ" message={state.message} onRetry={() => void load()} />;
  }

  const detail = detailId ? (state.overview.notifications.find((item) => item.id === detailId) ?? null) : null;

  return (
    <>
      <PageHead tone="accent" icon="bell" title="การส่งแจ้งเตือน" subtitle="ตรวจคิวส่งข้อความ และส่งใหม่เฉพาะรายการที่ล้มเหลว">
        <button className="ck-btn quiet" type="button" onClick={() => void load()}>
          <Icon name="refresh" size={16} /> รีเฟรช
        </button>
      </PageHead>

      <div className="ck-wrap ck-stack">
        {detail ? null : <Message value={message} />}

        <div className="ck-orbrow">
          <StatOrb value={String(metrics?.total ?? 0)} label="ทั้งหมด" tone="accent" />
          <StatOrb value={String((metrics?.pending ?? 0) + (metrics?.processing ?? 0))} label="รอ/กำลังส่ง" tone="ot" />
          <StatOrb value={String(metrics?.sent ?? 0)} label="ส่งแล้ว" tone="leave" />
          <StatOrb value={String(metrics?.failed ?? 0)} label="ล้มเหลว" tone="med" />
        </div>

        <section className="ck-panel ck-c-accent" aria-labelledby="nt-list">
          <SectionHead title="รายการแจ้งเตือน" id="nt-list" count={visibleRows.length}>
            <Filters value={statusFilter} options={STATUS_FILTERS} onChange={setStatusFilter} />
            <input
              className="ck-in ck-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="ค้นหา"
              aria-label="ค้นหา"
            />
          </SectionHead>
          <DataGrid
            rows={visibleRows}
            rowKey={(item) => item.id}
            onRowClick={(item) => setDetailId(item.id)}
            empty={
              <EmptyState icon="bell" title="ไม่พบรายการแจ้งเตือน">
                {state.overview.notifications.length === 0 ? "ยังไม่มีรายการในคิวส่งข้อความ" : "ลองเปลี่ยนตัวกรองหรือคำค้นหา"}
              </EmptyState>
            }
            columns={[
              {
                key: "st",
                header: "",
                width: "48px",
                align: "center",
                render: (item) => <StatusDot tone={STATUS_DOT[item.status] ?? "muted"} label={notificationStatusLabel(item.status)} />,
              },
              { key: "ev", header: "เหตุการณ์", render: (item) => <b>{item.eventType}</b> },
              { key: "created", header: "สร้างเมื่อ", render: (item) => thaiDateTime(item.createdAt) },
              { key: "att", header: "ลองส่ง (ครั้ง)", align: "right", render: (item) => item.attempts },
              { key: "del", header: "ส่งสำเร็จ (ช่องทาง)", align: "right", render: (item) => item.deliveryCount },
              { key: "go", header: "", width: "40px", align: "center", render: () => <Icon name="chevron" size={16} /> },
            ]}
          />
        </section>
      </div>

      {detail ? (
        <DetailDialog
          tone="accent"
          icon="bell"
          kicker="แจ้งเตือน"
          title={detail.eventType}
          status={{ label: notificationStatusLabel(detail.status), tone: STATUS_DOT[detail.status] ?? "muted" }}
          onClose={() => setDetailId(null)}
          footer={
            detail.status === "FAILED" ? (
              <button
                className="ck-btn back"
                type="button"
                disabled={!state.overview.canRetry || Boolean(busyId)}
                title={state.overview.canRetry ? "ส่งรายการกลับเข้าคิว" : "บัญชีนี้ไม่มีสิทธิ์ส่งใหม่"}
                onClick={() => void retryNotification(detail.id)}
              >
                <Icon name="refresh" size={16} />
                {busyId === detail.id ? "กำลังส่งใหม่..." : state.overview.canRetry ? "ส่งใหม่" : "ไม่มีสิทธิ์ส่งใหม่"}
              </button>
            ) : undefined
          }
        >
          <Message value={message} />
          <dl className="ck-dlg-grid">
            <div>
              <dt>สร้างเมื่อ</dt>
              <dd>{thaiDateTime(detail.createdAt)}</dd>
            </div>
            <div>
              <dt>พร้อมส่ง</dt>
              <dd>{thaiDateTime(detail.availableAt)}</dd>
            </div>
            <div>
              <dt>จำนวนครั้งที่ลองส่ง</dt>
              <dd>{detail.attempts}</dd>
            </div>
            <div>
              <dt>ส่งสำเร็จ (ช่องทาง)</dt>
              <dd>{detail.deliveryCount}</dd>
            </div>
          </dl>
          {detail.lastError ? (
            <div className="ck-dlg-sec">
              <h3>ข้อผิดพลาดล่าสุด</h3>
              <p>{detail.lastError}</p>
            </div>
          ) : null}
        </DetailDialog>
      ) : null}
    </>
  );
}
