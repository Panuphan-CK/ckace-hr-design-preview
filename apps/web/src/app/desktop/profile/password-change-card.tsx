"use client";

import { useState, type FormEvent } from "react";

import { SectionHead } from "../ui/kit";

function failureText(status: number): string {
  if (status === 403) return "รหัสผ่านปัจจุบันไม่ถูกต้อง";
  if (status === 400) return "รหัสผ่านใหม่ไม่ถูกต้อง ต้องยาว 8 ตัวอักษรขึ้นไป และต้องต่างจากรหัสเดิม";
  if (status === 401) return "หมดเวลาการเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่";
  return "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

/** Employee changes their own password; the current password must be confirmed. */
export function PasswordChangeCard() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");

    if (newPassword.length < 8) {
      setMessage({ kind: "error", text: "รหัสผ่านใหม่ต้องยาว 8 ตัวอักษรขึ้นไป" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ kind: "error", text: "รหัสผ่านใหม่และการยืนยันไม่ตรงกัน" });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/profile/password", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!response.ok) throw new Error(failureText(response.status));
      form.reset();
      setMessage({ kind: "success", text: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว ใช้รหัสใหม่ในการเข้าสู่ระบบครั้งถัดไป" });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : failureText(500) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ck-fbox ck-c-accent" aria-labelledby="password-change-title">
      <SectionHead id="password-change-title" title="เปลี่ยนรหัสผ่าน" hint="ใส่รหัสผ่านปัจจุบันเพื่อยืนยันตัวตน แล้วตั้งรหัสใหม่ (อย่างน้อย 8 ตัวอักษร)" />
      {message ? (
        <p role={message.kind === "error" ? "alert" : "status"} className={"ck-msg " + message.kind}>
          {message.text}
        </p>
      ) : null}
      <form method="post" onSubmit={(event) => void submit(event)} className="ck-fgrid">
        <label className="ck-field">
          <span>รหัสผ่านปัจจุบัน</span>
          <input className="ck-in" name="currentPassword" type="password" autoComplete="current-password" required disabled={busy} />
        </label>
        <label className="ck-field">
          <span>รหัสผ่านใหม่</span>
          <input className="ck-in" name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={200} required disabled={busy} />
        </label>
        <label className="ck-field">
          <span>ยืนยันรหัสผ่านใหม่</span>
          <input className="ck-in" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={200} required disabled={busy} />
        </label>
        <div className="ck-field full" style={{ alignItems: "flex-start" }}>
          <button type="submit" className="ck-btn tone" style={{ alignSelf: "start" }} disabled={busy}>
            {busy ? "กำลังบันทึก…" : "เปลี่ยนรหัสผ่าน"}
          </button>
        </div>
      </form>
    </section>
  );
}
