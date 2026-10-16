"use client";

import type { OvertimeAllowancePolicyItem } from "@ckace/contracts";
import { useCallback, useEffect, useState } from "react";

const LABEL: Readonly<Record<OvertimeAllowancePolicyItem["kind"], string>> = {
  MEAL: "ค่าข้าว OT",
  TRANSPORT: "ค่ารถ OT",
};

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
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await call<readonly OvertimeAllowancePolicyItem[]>("GET"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(kind: OvertimeAllowancePolicyItem["kind"], form: HTMLFormElement) {
    if (busy) return;
    const data = new FormData(form);
    setBusy(true);
    setMessage(null);
    try {
      await call("PUT", {
        kind,
        amountSatang: kind === "MEAL" ? Math.round(Math.max(0, Number(data.get("baht") ?? 0) || 0) * 100) : 0,
        paidWhenEndsAtOrAfter: String(data.get("time") ?? ""),
        active: data.get("active") === "on",
      });
      setMessage({ kind: "success", text: "บันทึก" + LABEL[kind] + "แล้ว" });
      await load();
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ" });
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p role="alert">{error}</p>;
  if (!rows) return <p role="status">กำลังโหลด…</p>;

  return (
    <div className="module-panel fade-in ck-admin">
      <h1>ค่าข้าวและค่ารถ OT</h1>
      <p>
        จ่ายต่อวัน OT เมื่อเวลาออกงานจริงถึงเวลาที่กำหนด (คิดเฉพาะ OT ที่อนุมัติแล้วและมีเวลาออกงานจริง)
        ค่าข้าวเป็นอัตราเดียวทั้งบริษัท ส่วนค่ารถกำหนดจำนวนเงินรายคนที่หน้าฐานข้อมูลพนักงาน
      </p>
      {message ? (
        <p role={message.kind === "error" ? "alert" : "status"} className={"ck-msg " + message.kind}>
          {message.text}
        </p>
      ) : null}
      {rows.map((row) => (
        <form
          key={row.kind + row.paidWhenEndsAtOrAfter + row.amountSatang + row.active}
          onSubmit={(event) => {
            event.preventDefault();
            void save(row.kind, event.currentTarget);
          }}
          style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", margin: "12px 0" }}
        >
          <strong style={{ minWidth: 100 }}>{LABEL[row.kind]}</strong>
          <label>
            จ่ายเมื่อออกงานตั้งแต่{" "}
            <input name="time" type="time" defaultValue={row.paidWhenEndsAtOrAfter} required disabled={busy} />
          </label>
          {row.kind === "MEAL" ? (
            <label>
              จำนวน (บาท/วัน){" "}
              <input name="baht" type="number" min="0" step="1" defaultValue={row.amountSatang / 100} disabled={busy} />
            </label>
          ) : (
            <span>จำนวนเงินตั้งรายคน</span>
          )}
          <label>
            <input name="active" type="checkbox" defaultChecked={row.active} disabled={busy} /> ใช้งาน
          </label>
          <button type="submit" className="primary-button" disabled={busy}>
            บันทึก
          </button>
        </form>
      ))}
    </div>
  );
}
