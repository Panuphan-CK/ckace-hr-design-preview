"use client";

import type { InboxOverview } from "@ckace/contracts";
import { useCallback, useEffect, useState } from "react";

import "../ck-v2-pages.css";
import { thaiDateTime } from "../ui/format";
import { Icon } from "../ui/icons";
import { EmptyState, ErrorState, LoadingState, PageHead, SectionHead, StatusDot } from "../ui/kit";

const KIND_PAGE: Readonly<Record<string, string>> = {
  LEAVE_REQUEST: "/desktop/leave",
  OVERTIME_REQUEST: "/desktop/overtime",
  MEDICAL_CLAIM: "/desktop/medical",
  TIME_CORRECTION: "/desktop/time-correction",
};

export default function InboxPage() {
  const [data, setData] = useState<InboxOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/inbox/me", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("โหลดการแจ้งเตือนไม่สำเร็จ");
      setError(null);
      setData((await response.json()) as InboxOverview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดการแจ้งเตือนไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markAllRead() {
    await fetch("/api/inbox/read", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    await load();
  }

  if (error) return <ErrorState title="กล่องแจ้งเตือน" message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState title="กำลังโหลดการแจ้งเตือน" />;

  const approvalTarget = (type: string, kind: string) =>
    kind === "REQUEST_WAITING" || kind === "APPROVAL_REMINDER" ? "/desktop/approvals" : (KIND_PAGE[type] ?? "/desktop");

  return (
    <>
      <PageHead
        tone="accent"
        icon="bell"
        title="กล่องแจ้งเตือน"
        subtitle={data.unread > 0 ? `ยังไม่อ่าน ${data.unread} รายการ` : "อ่านครบแล้ว"}
      >
        {data.unread > 0 ? (
          <button type="button" className="ck-btn sky" onClick={() => void markAllRead()}>
            <Icon name="check" size={16} /> อ่านทั้งหมด
          </button>
        ) : null}
      </PageHead>
      <div className="ck-wrap ck-stack">
        <section className="ck-panel ck-c-accent" aria-labelledby="ib-list">
          <SectionHead title={`การแจ้งเตือนล่าสุด (ทั้งหมด ${data.items.length})`} id="ib-list" />
          {data.items.length === 0 ? (
            <EmptyState icon="bell" title="ยังไม่มีการแจ้งเตือน">เมื่อมีความเคลื่อนไหวใหม่ จะแสดงที่นี่</EmptyState>
          ) : (
            <ul className="ck-inbox">
              {data.items.map((item) => (
                <li key={item.id}>
                  <a className={item.read ? "ck-inbox-item" : "ck-inbox-item unread"} href={approvalTarget(item.aggregateType, item.kind)}>
                    <StatusDot tone={item.read ? "muted" : "wait"} label={item.read ? "อ่านแล้ว" : "ยังไม่อ่าน"} />
                    <span className="ck-inbox-txt">
                      <b>{item.title}</b>
                      <span>{item.body}</span>
                    </span>
                    <small>{thaiDateTime(item.createdAt)}</small>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
