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

import {
  filterNotifications,
  notificationMetrics,
  notificationStatusClass,
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

const dateTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

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

  if (state.status === "loading") {
    return (
      <section
        className="module-state"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="spinner" aria-hidden="true" />
        <h1>กำลังโหลด Notification Operations</h1>
        <p>
          กำลังอ่านสถานะ Outbox และ Delivery จาก Project B
        </p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="module-state" role="alert">
        <div className="status-badge error">
          NOTIFICATIONS ERROR
        </div>
        <h1>เปิด Notification Operations ไม่สำเร็จ</h1>
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

  return (
    <div className="module-stack">
      <section className="module-heading">
        <div>
          <p className="eyebrow">
            NOTIFICATION OPERATIONS
          </p>
          <h1>Notifications</h1>
          <p>
            ตรวจ Outbox, จำนวนครั้งที่ส่ง, Delivery count
            และ Retry เฉพาะรายการ FAILED ตามสิทธิ์จาก Server
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

      <section className="notifications-contract-note">
        <strong>ขอบเขต M9D.10</strong>
        <span>
          ระบบปัจจุบันเป็น operational outbox สำหรับผู้ดูแล
          และยังไม่มี employee inbox / unread-read contract
          จึงไม่สร้างสถานะอ่านแล้ว/ยังไม่อ่านขึ้นเอง
        </span>
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

      <section className="metric-grid">
        <article className="metric-card">
          <span>ทั้งหมด</span>
          <strong>{metrics?.total ?? 0}</strong>
        </article>
        <article className="metric-card">
          <span>รอ/กำลังส่ง</span>
          <strong>
            {(metrics?.pending ?? 0) +
              (metrics?.processing ?? 0)}
          </strong>
        </article>
        <article className="metric-card">
          <span>ส่งแล้ว</span>
          <strong>{metrics?.sent ?? 0}</strong>
        </article>
        <article className="metric-card">
          <span>ล้มเหลว</span>
          <strong>{metrics?.failed ?? 0}</strong>
        </article>
      </section>

      <section
        className="module-panel notification-filter-panel"
        aria-label="ตัวกรอง Notifications"
      >
        <label>
          <span>สถานะ</span>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.currentTarget
                  .value as NotificationStatusFilter,
              )
            }
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="PENDING">รอส่ง</option>
            <option value="PROCESSING">กำลังส่ง</option>
            <option value="SENT">ส่งแล้ว</option>
            <option value="FAILED">ล้มเหลว</option>
            <option value="CANCELLED">ยกเลิก</option>
          </select>
        </label>
        <label>
          <span>ค้นหา</span>
          <input
            type="search"
            value={query}
            onChange={(event) =>
              setQuery(event.currentTarget.value)
            }
            placeholder="Event / Aggregate / Error / ID"
          />
        </label>
      </section>

      <section className="module-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">OUTBOX</p>
            <h2>รายการแจ้งเตือน</h2>
          </div>
          <span className="panel-note">
            {visibleRows.length} /{" "}
            {state.overview.notifications.length} รายการ
          </span>
        </div>

        {visibleRows.length === 0 ? (
          <div className="empty-state">
            <h3>ไม่พบ Notification</h3>
            <p>
              {state.overview.notifications.length === 0
                ? "ยังไม่มีรายการใน Notification Outbox"
                : "ลองเปลี่ยนตัวกรองหรือคำค้นหา"}
            </p>
          </div>
        ) : (
          <div className="notification-list">
            {visibleRows.map((item) => (
              <article
                className="notification-card"
                key={item.id}
              >
                <div className="notification-card-head">
                  <div>
                    <strong>{item.eventType}</strong>
                    <small>
                      {item.aggregateType} ·{" "}
                      {item.aggregateId}
                    </small>
                  </div>
                  <span
                    className={notificationStatusClass(
                      item.status,
                    )}
                  >
                    {notificationStatusLabel(
                      item.status,
                    )}
                  </span>
                </div>

                <div className="notification-meta-grid">
                  <div>
                    <span>สร้างเมื่อ</span>
                    <strong>
                      {formatDateTime(item.createdAt)}
                    </strong>
                  </div>
                  <div>
                    <span>พร้อมส่ง</span>
                    <strong>
                      {formatDateTime(item.availableAt)}
                    </strong>
                  </div>
                  <div>
                    <span>Attempts</span>
                    <strong>{item.attempts}</strong>
                  </div>
                  <div>
                    <span>Deliveries</span>
                    <strong>{item.deliveryCount}</strong>
                  </div>
                </div>

                {item.lastError ? (
                  <div className="notification-error">
                    <strong>Last error</strong>
                    <span>{item.lastError}</span>
                  </div>
                ) : null}

                <div className="notification-card-footer">
                  <small>ID: {item.id}</small>
                  {item.status === "FAILED" ? (
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={
                        !state.overview.canRetry ||
                        Boolean(busyId)
                      }
                      title={
                        state.overview.canRetry
                          ? "ส่งรายการกลับเข้าคิว"
                          : "บัญชีนี้ไม่มีสิทธิ์ Retry"
                      }
                      onClick={() =>
                        void retryNotification(item.id)
                      }
                    >
                      {busyId === item.id
                        ? "กำลัง Retry..."
                        : state.overview.canRetry
                          ? "Retry"
                          : "ไม่มีสิทธิ์ Retry"}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
