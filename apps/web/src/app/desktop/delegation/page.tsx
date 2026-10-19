"use client";

import type { ApprovalDelegationItem, ApprovalDelegationOverview } from "@ckace/contracts";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import "../ck-v2-pages.css";
import { DatePicker } from "../ui/date-picker";
import { thaiDateRange } from "../ui/format";
import { DataGrid, EmptyState, ErrorState, LoadingState, Message, PageHead, SectionHead, StatusDot } from "../ui/kit";

type Notice = { kind: "success" | "error"; text: string } | null;

function addDays(iso: string, days: number): string {
  const date = new Date(iso + "T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function todayBangkok(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function errorText(status: number): string {
  if (status === 400) return "ข้อมูลไม่ถูกต้อง (ช่วงวันที่ต้องไม่เกิน 92 วัน และผู้รับมอบต้องเป็นผู้ที่อนุมัติได้)";
  if (status === 403) return "บัญชีนี้ไม่มีสิทธิ์มอบหมายผู้อนุมัติแทน";
  if (status === 409) return "มีการมอบหมายที่ทับซ้อนกับช่วงวันที่นี้อยู่แล้ว";
  return "บันทึกไม่สำเร็จ";
}

export default function DelegationPage() {
  const [data, setData] = useState<ApprovalDelegationOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [start, setStart] = useState(todayBangkok());
  const [end, setEnd] = useState(addDays(todayBangkok(), 6));

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/delegations/me", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 403 ? "บัญชีนี้ไม่มีสิทธิ์ใช้งานเมนูนี้" : "โหลดข้อมูลไม่สำเร็จ");
      setData((await response.json()) as ApprovalDelegationOverview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const delegateEmployeeId = String(form.get("delegate") ?? "");
    if (!delegateEmployeeId) {
      setNotice({ kind: "error", text: "กรุณาเลือกผู้อนุมัติแทน" });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/delegations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ delegateEmployeeId, startDate: start, endDate: end }),
      });
      if (!response.ok) throw new Error(errorText(response.status));
      setNotice({ kind: "success", text: "มอบหมายผู้อนุมัติแทนเรียบร้อยแล้ว ผู้รับมอบจะเห็นคำขอของคุณในช่วงวันที่กำหนด" });
      await load();
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ" });
    } finally {
      setBusy(false);
    }
  }

  async function cancel(item: ApprovalDelegationItem) {
    if (busy || !window.confirm("ยกเลิกการมอบหมายให้ " + item.delegateName + "?")) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/delegations/" + encodeURIComponent(item.id) + "/cancel", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("ยกเลิกไม่สำเร็จ");
      setNotice({ kind: "success", text: "ยกเลิกการมอบหมายแล้ว" });
      await load();
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "ยกเลิกไม่สำเร็จ" });
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorState title="ผู้อนุมัติแทน" message={error} onRetry={() => window.location.reload()} />;
  if (!data) return <LoadingState title="กำลังโหลดข้อมูล" />;

  const given = data.given.filter((item) => item.active);

  return (
    <>
      <PageHead tone="biz" icon="users" title="ผู้อนุมัติแทน" subtitle="มอบหมายคนอนุมัติแทนในช่วงที่คุณไม่อยู่" />
      <div className="ck-wrap ck-stack">
        <Message value={notice} />

        <section className="ck-panel ck-c-biz" aria-labelledby="dg-new">
          <SectionHead title="มอบหมายใหม่" id="dg-new" />
          <form onSubmit={(event) => void create(event)} style={{ display: "grid", gap: 12, maxWidth: 520 }}>
            <label className="ck-field">
              <span>ผู้อนุมัติแทน</span>
              <select className="ck-in" name="delegate" defaultValue="" disabled={busy} required>
                <option value="" disabled>
                  เลือกผู้อนุมัติแทน
                </option>
                {data.candidates.map((candidate) => (
                  <option key={candidate.employeeId} value={candidate.employeeId}>
                    {candidate.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="ck-field">
              <span>ช่วงวันที่มอบหมาย</span>
              <DatePicker
                mode="range"
                label="ช่วงวันที่มอบหมาย"
                start={start}
                end={end}
                min={todayBangkok()}
                onChange={(from, to) => {
                  setStart(from);
                  setEnd(to);
                }}
              />
            </div>
            <p className="ck-hint" style={{ margin: 0 }}>
              ในช่วงนี้ผู้รับมอบจะเห็นและอนุมัติคำขอที่ส่งถึงคุณได้ (ไม่เกิน 92 วัน) ระบบบันทึกว่าใครอนุมัติแทน คุณยกเลิกได้ทุกเมื่อ
            </p>
            <div>
              <button type="submit" className="ck-btn ok" disabled={busy}>
                มอบหมาย
              </button>
            </div>
          </form>
        </section>

        <section className="ck-panel ck-c-biz" aria-labelledby="dg-given">
          <SectionHead title="ที่ฉันมอบหมายไว้" id="dg-given" count={given.length} />
          <DataGrid
            rows={given}
            rowKey={(item) => item.id}
            empty={<EmptyState icon="users" title="ยังไม่มีการมอบหมาย">เมื่อมอบหมายแล้วจะแสดงที่นี่</EmptyState>}
            columns={[
              { key: "st", header: "", width: "48px", align: "center", render: () => <StatusDot tone="ok" label="กำลังมอบหมายอยู่" /> },
              { key: "who", header: "ผู้อนุมัติแทน", render: (item) => <b>{item.delegateName}</b> },
              { key: "range", header: "ช่วงวันที่", render: (item) => thaiDateRange(item.startDate, item.endDate) },
              {
                key: "act",
                header: "",
                align: "right",
                render: (item) => (
                  <button type="button" className="ck-btn no sm" disabled={busy} onClick={() => void cancel(item)}>
                    ยกเลิก
                  </button>
                ),
              },
            ]}
          />
        </section>

        <section className="ck-panel ck-c-biz" aria-labelledby="dg-received">
          <SectionHead title="ที่ได้รับมอบหมายให้ฉัน" id="dg-received" count={data.received.length} />
          <DataGrid
            rows={data.received}
            rowKey={(item) => item.id}
            empty={<EmptyState icon="users" title="ไม่มีผู้มอบหมายให้คุณ">เมื่อมีผู้มอบหมายให้คุณอนุมัติแทน จะแสดงที่นี่</EmptyState>}
            columns={[
              { key: "st", header: "", width: "48px", align: "center", render: () => <StatusDot tone="ok" label="ได้รับมอบหมาย" /> },
              { key: "who", header: "ผู้มอบหมาย", render: (item) => <b>{item.delegatorName}</b> },
              { key: "range", header: "ช่วงวันที่", render: (item) => thaiDateRange(item.startDate, item.endDate) },
              {
                key: "act",
                header: "",
                align: "right",
                render: () => (
                  <a className="ck-btn sky sm" href="/desktop/approvals">
                    ไปที่งานอนุมัติ
                  </a>
                ),
              },
            ]}
          />
        </section>
      </div>
    </>
  );
}
