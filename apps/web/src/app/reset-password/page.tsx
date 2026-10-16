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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("ckace-desktop-theme");
    const initialDark = storedTheme === "dark";
    document.body.classList.toggle("dark", initialDark);
    setDarkMode(initialDark);
  }, []);

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
    const data = new FormData(event.currentTarget);
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
        text: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว สามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่",
      });
      event.currentTarget.reset();
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "เปลี่ยนรหัสผ่านไม่สำเร็จ",
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
          onClick={toggleTheme}
        >
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
          </div>
        ) : null}

        {message?.kind !== "success" ? (
          <form
            method="post"
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
