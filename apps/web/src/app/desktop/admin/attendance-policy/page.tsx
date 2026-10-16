"use client";

import type { AttendancePolicyItem } from "@ckace/contracts";
import { useCallback, useEffect, useState } from "react";

export default function AttendancePolicyPage() {
  const [policy, setPolicy] = useState<AttendancePolicyItem | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/management/attendance-policy", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 403 ? "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ" : "โหลดข้อมูลไม่สำเร็จ");
      setPolicy((await response.json()) as AttendancePolicyItem | null);
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
    const text = (name: string) => String(data.get(name) ?? "");
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/management/attendance-policy", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: text("name"),
          officeLatitude: Number(text("officeLatitude")),
          officeLongitude: Number(text("officeLongitude")),
          radiusKm: Number(text("radiusKm")),
          lateAfter: text("lateAfter"),
          workEnd: text("workEnd"),
          breakStart: text("breakStart") || null,
          breakEnd: text("breakEnd") || null,
        }),
      });
      if (!response.ok) throw new Error(response.status === 400 ? "ค่าที่กรอกไม่ถูกต้อง (เวลาเลิกงานต้องหลังเวลาเข้างาน และเวลาพักต้องกรอกครบทั้งคู่)" : "บันทึกไม่สำเร็จ");
      setMessage({ kind: "success", text: "บันทึกนโยบายลงเวลาแล้ว" });
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
    <div className="module-panel fade-in ck-admin">
      <h1>นโยบายลงเวลาเข้า-ออกงาน</h1>
      <p>
        พิกัดและรัศมีของสำนักงาน เวลาเข้างานที่นับว่าสาย เวลาเลิกงานที่นับว่าออกก่อน และเวลาพักที่หักจากเวลาทำงาน
        ค่าตามบริษัท: เข้า 09:00 เลิก 17:30
      </p>
      {message ? (
        <p role={message.kind === "error" ? "alert" : "status"} className={"ck-msg " + message.kind}>
          {message.text}
        </p>
      ) : null}
      {policy === null ? <p>ยังไม่มีการตั้งค่า กรอกค่าด้านล่างเพื่อเริ่มใช้งาน</p> : null}
      <form
        key={policy ? JSON.stringify(policy) : "new"}
        onSubmit={(event) => {
          event.preventDefault();
          void save(event.currentTarget);
        }}
        style={{ display: "grid", gap: 12, maxWidth: 420 }}
      >
        <label>
          ชื่อนโยบาย
          <input name="name" required maxLength={120} defaultValue={policy?.name ?? "สำนักงานใหญ่"} disabled={busy} />
        </label>
        <label>
          ละติจูดสำนักงาน
          <input name="officeLatitude" type="number" step="any" required defaultValue={policy?.officeLatitude ?? ""} disabled={busy} />
        </label>
        <label>
          ลองจิจูดสำนักงาน
          <input name="officeLongitude" type="number" step="any" required defaultValue={policy?.officeLongitude ?? ""} disabled={busy} />
        </label>
        <label>
          รัศมีที่ลงเวลาได้ (กม.)
          <input name="radiusKm" type="number" step="0.1" min="0.1" max="100" required defaultValue={policy?.radiusKm ?? 0.5} disabled={busy} />
        </label>
        <label>
          เข้างานหลังเวลานี้ถือว่าสาย
          <input name="lateAfter" type="time" required defaultValue={policy?.lateAfter ?? "09:00"} disabled={busy} />
        </label>
        <label>
          เลิกงานก่อนเวลานี้ถือว่าออกก่อน
          <input name="workEnd" type="time" required defaultValue={policy?.workEnd ?? "17:30"} disabled={busy} />
        </label>
        <label>
          เริ่มพัก (เว้นว่างถ้าไม่หักเวลาพัก)
          <input name="breakStart" type="time" defaultValue={policy?.breakStart ?? "12:00"} disabled={busy} />
        </label>
        <label>
          สิ้นสุดพัก
          <input name="breakEnd" type="time" defaultValue={policy?.breakEnd ?? "13:00"} disabled={busy} />
        </label>
        <button type="submit" className="primary-button" disabled={busy}>
          บันทึก
        </button>
      </form>
    </div>
  );
}
