"use client";

import type { InboxOverview } from "@ckace/contracts";
import { useCallback, useEffect, useState } from "react";

import { thaiDateTime } from "../ui/format";
import { Icon } from "../ui/icons";

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

  if (error) return <p role="alert" className="ck-msg error">{error}</p>;
  if (!data) return <p role="status" className="ck-muted">กำลังโหลด…</p>;

  const approvalTarget = (type: string, kind: string) =>
    kind === "REQUEST_WAITING" || kind === "APPROVAL_REMINDER" ? "/desktop/approvals" : (KIND_PAGE[type] ?? "/desktop");

  return (
    <div className="ck-panel ck-admin" style={{ maxWidth: 760, padding: "0 22px 22px" }}>
      <div className="ck-sh">
        <h2>กล่องแจ้งเตือน</h2>
        {data.unread > 0 ? <span className="ck-count">ยังไม่อ่าน {data.unread}</span> : null}
        {data.unread > 0 ? (
          <button type="button" className="ck-btn sm quiet" style={{ marginLeft: "auto" }} onClick={() => void markAllRead()}>
            อ่านทั้งหมด
          </button>
        ) : null}
      </div>
      {data.items.length === 0 ? <p className="ck-muted" style={{ textAlign: "center", padding: "24px 0" }}>ยังไม่มีการแจ้งเตือน</p> : null}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
        {data.items.map((item) => (
          <li key={item.id}>
            <a
              href={approvalTarget(item.aggregateType, item.kind)}
              style={{
                display: "grid",
                gridTemplateColumns: "28px 1fr",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid var(--ck-line, #e5e7eb)",
                background: item.read ? "transparent" : "var(--ck-hover, #f1f5f9)",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              <Icon name="bell" size={20} />
              <span style={{ display: "grid", gap: 2 }}>
                <b style={{ fontWeight: item.read ? 500 : 700 }}>{item.title}</b>
                <span style={{ whiteSpace: "pre-line", opacity: 0.85 }}>{item.body}</span>
                <small style={{ opacity: 0.6 }}>{thaiDateTime(item.createdAt)}</small>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
