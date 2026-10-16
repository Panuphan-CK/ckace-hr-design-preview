"use client";

import type { MedicalPolicyItem } from "@ckace/contracts";
import { useCallback, useEffect, useState } from "react";

export default function MedicalPolicyPage() {
  const [policy, setPolicy] = useState<MedicalPolicyItem | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/management/medical-policy", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 403 ? "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ" : "โหลดข้อมูลไม่สำเร็จ");
      setPolicy((await response.json()) as MedicalPolicyItem | null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(form: HTMLFormElement) {
    if (busy) return;
    const data = new FormData(form);
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/management/medical-policy", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          annualLimit: Number(data.get("annualLimit")),
          perClaimLimit: Number(data.get("perClaimLimit")),
        }),
      });
      if (!response.ok) throw new Error(response.status === 400 ? "วงเงินต่อใบต้องไม่เกินวงเงินต่อปี และต้องมากกว่า 0" : "บันทึกไม่สำเร็จ");
      setMessage({ kind: "success", text: "บันทึกวงเงินค่ารักษาแล้ว" });
      await load();
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ" });
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p role="alert">{error}</p>;
  if (policy === undefined) return <p role="status">กำลังโหลด…</p>;

  return (
    <div className="module-panel fade-in">
      <h1>วงเงินเบิกค่ารักษาพยาบาล</h1>
      <p>
        วงเงินต่อใบที่เบิกได้ และวงเงินรวมต่อปีปฏิทิน ถ้ายื่นเกินวงเงินต่อใบ ระบบจะตัดเหลือเท่าวงเงินต่อใบ
        ใบที่รออนุมัติหรือถูกส่งกลับยังนับรวมในวงเงินต่อปี
      </p>
      {message ? (
        <p role={message.kind === "error" ? "alert" : "status"} className={"ck-msg " + message.kind}>
          {message.text}
        </p>
      ) : null}
      {policy === null ? <p>ยังไม่มีการตั้งค่า กรอกค่าด้านล่างเพื่อเริ่มใช้งาน (ค่าแนะนำ 1,000 ต่อใบ และ 10,000 ต่อปี)</p> : null}
      <form
        key={policy ? policy.annualLimit + "-" + policy.perClaimLimit : "new"}
        onSubmit={(event) => {
          event.preventDefault();
          void save(event.currentTarget);
        }}
        style={{ display: "grid", gap: 12, maxWidth: 360 }}
      >
        <label>
          วงเงินต่อใบ (บาท)
          <input name="perClaimLimit" type="number" min="1" step="1" required defaultValue={policy?.perClaimLimit ?? 1000} disabled={busy} />
        </label>
        <label>
          วงเงินต่อปี (บาท)
          <input name="annualLimit" type="number" min="1" step="1" required defaultValue={policy?.annualLimit ?? 10000} disabled={busy} />
        </label>
        <button type="submit" className="primary-button" disabled={busy}>
          บันทึก
        </button>
      </form>
    </div>
  );
}
