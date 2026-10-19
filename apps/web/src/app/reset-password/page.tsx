"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { Suspense, useEffect, useState } from "react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null);
  const [darkMode, setDarkMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [accountHint, setAccountHint] = useState<string | null>(null);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [confirmValue, setConfirmValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("ckace-desktop-theme");
    const initialDark = storedTheme === "dark";
    document.body.classList.toggle("dark", initialDark);
    setDarkMode(initialDark);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void fetch("/api/password-recovery/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        if (cancelled) return;
        if (response.ok) {
          const body = (await response.json()) as { account?: string };
          setAccountHint(body.account ?? null);
        } else if (response.status === 403) {
          setLinkInvalid(true);
          setMessage({
            kind: "error",
            text: "ลิงก์หมดอายุ ถูกใช้แล้ว หรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่",
          });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (message?.kind !== "success") return;
    const timer = window.setTimeout(() => {
      window.location.href = "/login";
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  function toggleTheme() {
    setDarkMode((current) => {
      const next = !current;
      document.body.classList.toggle("dark", next);
      window.localStorage.setItem(
        "ckace-desktop-theme",
        next ? "dark" : "light",
      );
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    // currentTarget is null after an await, so keep the form for the reset below.
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");
    if (!token) {
      setMessage({
        kind: "error",
        text: "ลิงก์กู้คืนรหัสผ่านไม่ถูกต้อง",
      });
      return;
    }
    if (password.length < 8 || password.length > 200) {
      setMessage({
        kind: "error",
        text: "รหัสผ่านต้องมีความยาว 8–200 ตัวอักษร",
      });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({
        kind: "error",
        text: "ยืนยันรหัสผ่านไม่ตรงกัน",
      });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/password-recovery/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? "ลิงก์หมดอายุ ถูกใช้แล้ว หรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่"
            : "เปลี่ยนรหัสผ่านไม่สำเร็จ",
        );
      }
      setMessage({
        kind: "success",
        text: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กำลังพาไปหน้าเข้าสู่ระบบ…",
      });
      form.reset();
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error && /[\u0E00-\u0E7F]/.test(error.message)
            ? error.message
            : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page production-login-page">
      <section
        className="auth-container production-auth-card fade-in"
        aria-labelledby="reset-password-title"
      >
        <button
          className="dark-mode-toggle"
          type="button"
          aria-label={darkMode ? "ใช้โหมดสว่าง" : "ใช้โหมดมืด"}
          aria-pressed={darkMode}
          title={darkMode ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
          onClick={toggleTheme}
        >
          <i className="bx bxs-sun theme-track-icon left" aria-hidden="true" />
          <i className="bx bxs-moon theme-track-icon right" aria-hidden="true" />
          <span className="slider">
            <i
              className={darkMode ? "bx bxs-moon" : "bx bxs-sun"}
              aria-hidden="true"
            />
          </span>
        </button>

        <div className="production-login-logo-wrap">
          <span
            className="company-logo production-login-logo"
            role="img"
            aria-label="โลโก้บริษัท C.K.ACE"
          />
        </div>

        <h1 id="reset-password-title" className="production-auth-title">
          ตั้งรหัสผ่านใหม่
        </h1>
        {accountHint ? (
          <p className="production-reset-intro">
            ตั้งรหัสผ่านใหม่ให้บัญชี <b>{accountHint}</b>
          </p>
        ) : null}
        <p className="production-reset-intro">
          ลิงก์นี้ใช้ได้ 15 นาที และจะใช้งานซ้ำไม่ได้หลังเปลี่ยนรหัสผ่านสำเร็จ
        </p>

        {!token ? (
          <div className="action-message error" role="alert">
            ลิงก์กู้คืนรหัสผ่านไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบเพื่อขอลิงก์ใหม่
          </div>
        ) : null}

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
            {message.kind === "error" && message.text.includes("ขอลิงก์ใหม่") ? (
              <>
                {" "}
                <Link href="/login">กลับไปหน้าเข้าสู่ระบบเพื่อขอลิงก์ใหม่</Link>
              </>
            ) : null}
          </div>
        ) : null}

        {message?.kind !== "success" && !linkInvalid ? (
          <form
            method="post"
            noValidate
            className="production-login-form"
            onSubmit={(event) => void submit(event)}
          >
            <label>
              <span>รหัสผ่านใหม่</span>
              <div className="production-password-field">
                <input
                  className="form-input"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={200}
                  required
                  placeholder="กรอกรหัสผ่านใหม่ อย่างน้อย 8 ตัวอักษร"
                  value={newPassword}
                  aria-invalid={newPassword.length > 0 && newPassword.length < 8}
                  onChange={(event) => setNewPassword(event.currentTarget.value)}
                  disabled={!token || busy}
                />
                <button
                  className="production-password-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  <i
                    className={showPassword ? "bx bx-hide" : "bx bx-show"}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </label>

            {newPassword.length > 0 && newPassword.length < 8 ? (
              <p className="form-error" role="alert">
                รหัสผ่านสั้นเกินไป ต้องมีอย่างน้อย 8 ตัวอักษร (ตอนนี้ {newPassword.length} ตัว)
              </p>
            ) : null}

            <label>
              <span>ยืนยันรหัสผ่านใหม่</span>
              <div className="production-password-field">
                <input
                  className="form-input"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={200}
                  required
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  value={confirmValue}
                  aria-invalid={confirmValue.length > 0 && confirmValue !== newPassword}
                  onChange={(event) => setConfirmValue(event.currentTarget.value)}
                  disabled={!token || busy}
                />
                <button
                  className="production-password-toggle"
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((current) => !current)
                  }
                  aria-pressed={showConfirmPassword}
                  aria-label={
                    showConfirmPassword
                      ? "ซ่อนรหัสผ่านยืนยัน"
                      : "แสดงรหัสผ่านยืนยัน"
                  }
                >
                  <i
                    className={
                      showConfirmPassword ? "bx bx-hide" : "bx bx-show"
                    }
                    aria-hidden="true"
                  />
                </button>
              </div>
            </label>

            {confirmValue && confirmValue !== newPassword ? (
              <p className="form-error" role="alert">
                รหัสผ่านสองช่องยังไม่ตรงกัน
              </p>
            ) : null}

            <button
              className="production-login-submit"
              type="submit"
              disabled={!token || busy}
            >
              {busy ? "กำลังเปลี่ยนรหัสผ่าน..." : "บันทึกรหัสผ่านใหม่"}
            </button>
          </form>
        ) : null}

        <p className="production-auth-footer">
          <Link className="production-link-button" href="/login">
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </p>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="state-page"><div className="spinner" /></main>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
