"use client";

import type { OvertimeAllowancePolicyItem } from "@ckace/contracts";
import { useCallback, useEffect, useState } from "react";

import { ErrorState, LoadingState, Message, PageHead, SettingRow, TimeInput, Toggle } from "../../ui/kit";
import "../ck-v2-settings.css";

type Kind = OvertimeAllowancePolicyItem["kind"];

const LABEL: Readonly<Record<Kind, string>> = {
  MEAL: "ค่าข้าว OT",
  TRANSPORT: "ค่ารถ OT",
};

interface Draft {
  time: string;
  baht: string;
  active: boolean;
}

async function call<T>(method: "GET" | "PUT", body?: unknown): Promise<T> {
  const response = await fetch("/api/management/overtime-allowance-policies", {
    method,
    credentials: "same-origin",
    ...(body === undefined
      ? {}
      : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    throw new Error(response.status === 403 ? "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ" : "ดำเนินการไม่สำเร็จ");
  }
  return (await response.json()) as T;
}

export default function OvertimeAllowancePage() {
  const [rows, setRows] = useState<readonly OvertimeAllowancePolicyItem[] | null>(null);
  const [drafts, setDrafts] = useState<Readonly<Record<string, Draft>>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await call<readonly OvertimeAllowancePolicyItem[]>("GET");
      setRows(next);
      setDrafts(
        Object.fromEntries(
          next.map((row) => [row.kind, { time: row.paidWhenEndsAtOrAfter, baht: String(row.amountSatang / 100), active: row.active }]),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function patch(kind: Kind, change: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [kind]: { ...current[kind]!, ...change } }));
  }

  async function save() {
    if (busy || !rows) return;
    if (rows.some((row) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(drafts[row.kind]?.time ?? ""))) {
      setMessage({ kind: "error", text: "กรอกเวลาให้ครบ เช่น 18:00" });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      for (const row of rows) {
        const draft = drafts[row.kind]!;
        await call("PUT", {
          kind: row.kind,
          amountSatang: row.kind === "MEAL" ? Math.round(Math.max(0, Number(draft.baht) || 0) * 100) : 0,
          paidWhenEndsAtOrAfter: draft.time,
          active: draft.active,
        });
      }
      setMessage({ kind: "success", text: "บันทึกค่าข้าวและค่ารถ OT แล้ว" });
      await load();
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ" });
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorState title="เปิดหน้าไม่สำเร็จ" message={error} onRetry={() => window.location.reload()} />;
  if (!rows) return <LoadingState title="กำลังโหลด…" />;

  return (
    <>
      <PageHead tone="ot" icon="ot" title="ค่าข้าวและค่ารถ OT" subtitle="จ่ายเมื่อเวลาออกงานจริงถึงเวลาที่กำหนด" />
      <div className="ck-wrap ck-stack">
        <Message value={message} />
        <form
          className="ck-sstack ck-c-ot"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          {rows.map((row) => {
            const draft = drafts[row.kind];
            if (!draft) return null;
            return (
              <section key={row.kind} className="ck-sgroup">
                <h2>{LABEL[row.kind]}</h2>
                <SettingRow label="เปิดใช้งาน">
                  <Toggle label={"เปิดใช้งาน " + LABEL[row.kind]} checked={draft.active} disabled={busy} onChange={(active) => patch(row.kind, { active })} />
                </SettingRow>
                <SettingRow label="จ่ายเมื่อออกงานตั้งแต่" hint="คิดเฉพาะ OT ที่อนุมัติแล้วและมีเวลาออกงานจริง">
                  <TimeInput label={"เวลาออกงาน " + LABEL[row.kind]} value={draft.time} onChange={(time) => patch(row.kind, { time })} />
                </SettingRow>
                {row.kind === "MEAL" ? (
                  <SettingRow label="จำนวนต่อวัน" hint="อัตราเดียวทั้งบริษัท">
                    <input className="ck-in ck-snum" aria-label="จำนวน (บาท/วัน)" type="number" min="0" step="1" value={draft.baht} disabled={busy} onChange={(e) => patch(row.kind, { baht: e.currentTarget.value })} />
                    <span className="ck-sunit">บาท</span>
                  </SettingRow>
                ) : (
                  <SettingRow label="จำนวนเงิน" hint="ตั้งรายคนที่หน้าฐานข้อมูลพนักงาน">
                    <span className="ck-subtle">รายคน</span>
                  </SettingRow>
                )}
              </section>
            );
          })}
          <div className="ck-sbar">
            <button type="submit" className="ck-btn sky" disabled={busy}>
              {busy ? "กำลังบันทึก…" : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
