"use client";

import "../desktop/ui/ck.css";
import { DateField } from "../desktop/ui/date-picker";
import type { FormEvent } from "react";
import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  clearRememberedUsername,
  loadRememberedUsername,
  saveRememberedUsername,
  validateRegistrationForm,
  type RegistrationFormValues,
} from "./login-view";

type LoginState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string };

type RegistrationState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

type LoginMode = "login" | "register";

const EMPTY_REGISTRATION: RegistrationFormValues = {
  username: "",
  password: "",
  confirmPassword: "",
  fullName: "",
  nickname: "",
  dateOfBirth: "",
  employmentStart: "",
};

function registrationErrorMessage(status: number): string {
  if (status === 409) {
    return "ชื่อผู้ใช้นี้มีอยู่แล้ว กรุณาใช้ชื่อผู้ใช้อื่น";
  }
  if (status === 503) {
    return "ระบบสมัครพนักงานยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ";
  }
  return "ข้อมูลสมัครไม่ถูกต้อง กรุณาตรวจสอบข้อมูลแล้วลองใหม่";
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("login");
  const [state, setState] = useState<LoginState>({
    status: "idle",
  });
  const [registrationState, setRegistrationState] =
    useState<RegistrationState>({ status: "idle" });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberUsername, setRememberUsername] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegistrationPassword, setShowRegistrationPassword] =
    useState(false);
  const [registration, setRegistration] =
    useState<RegistrationFormValues>(EMPTY_REGISTRATION);
  const [darkMode, setDarkMode] = useState(false);
  const [forgotHelp, setForgotHelp] = useState(false);

  useEffect(() => {
    const rememberedUsername = loadRememberedUsername();
    setUsername(rememberedUsername);
    setRememberUsername(Boolean(rememberedUsername));

    const storedTheme = window.localStorage.getItem("ckace-desktop-theme");
    const initialDark = storedTheme === "dark";
    document.body.classList.toggle("dark", initialDark);
    setDarkMode(initialDark);

    let cancelled = false;
    void fetch("/api/security/session", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((response) => {
        if (!cancelled && response.ok) {
          router.replace("/desktop");
        }
      })
      .catch(() => {
        // The login form remains available when the session check is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === "submitting") return;

    const normalizedUsername = username.trim();
    setState({ status: "submitting" });
    try {
      const response = await fetch("/api/desktop-auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          username: normalizedUsername,
          password,
        }),
      });
      if (!response.ok) {
        setState({
          status: "error",
          message:
            response.status === 503
              ? "ระบบเข้าสู่ระบบยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ"
              : "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
        });
        return;
      }

      if (rememberUsername) {
        saveRememberedUsername(normalizedUsername);
      } else {
        clearRememberedUsername();
      }
      router.replace("/desktop");
      router.refresh();
    } catch {
      setState({
        status: "error",
        message: "ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง",
      });
    }
  }

  function updateRegistration(
    field: keyof RegistrationFormValues,
    value: string,
  ) {
    setRegistration((current) => ({
      ...current,
      [field]: value,
    }));
    if (registrationState.status !== "idle") {
      setRegistrationState({ status: "idle" });
    }
  }

  async function submitRegistration(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (registrationState.status === "submitting") return;

    const validationMessage = validateRegistrationForm(registration);
    if (validationMessage) {
      setRegistrationState({
        status: "error",
        message: validationMessage,
      });
      return;
    }

    setRegistrationState({ status: "submitting" });
    try {
      const response = await fetch("/api/onboarding/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          username: registration.username.trim(),
          password: registration.password,
          fullName: registration.fullName.trim(),
          nickname: registration.nickname.trim() || null,
          dateOfBirth: registration.dateOfBirth,
          employmentStart: registration.employmentStart,
        }),
      });
      if (!response.ok) {
        setRegistrationState({
          status: "error",
          message: registrationErrorMessage(response.status),
        });
        return;
      }

      const result = (await response.json()) as {
        readonly accountState?: unknown;
        readonly pendingApproval?: unknown;
      };
      if (
        result.accountState !== "PENDING" ||
        result.pendingApproval !== true
      ) {
        setRegistrationState({
          status: "error",
          message: "ระบบยังยืนยันคำขอสมัครไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
        });
        return;
      }

      setRegistration(EMPTY_REGISTRATION);
      setShowRegistrationPassword(false);
      setRegistrationState({ status: "success" });
    } catch {
      setRegistrationState({
        status: "error",
        message: "ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง",
      });
    }
  }

  function showLogin() {
    setMode("login");
    setState({ status: "idle" });
    setRegistrationState({ status: "idle" });
    setForgotHelp(false);
  }

  function showRegistration() {
    setMode("register");
    setState({ status: "idle" });
    setRegistrationState({ status: "idle" });
    setForgotHelp(false);
  }

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

  return (
    <main className="auth-page production-login-page">
      <section
        className="auth-container production-auth-card fade-in"
        aria-labelledby="login-title"
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

        <h1 id="login-title" className="production-auth-title">
          {mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
        </h1>

        {mode === "login" ? (
          <>
            <form method="post" onSubmit={submit} className="production-login-form">
              <label>
                <span>อีเมล / ชื่อผู้ใช้</span>
                <input
                  className="form-input"
                  name="username"
                  autoComplete="username"
                  minLength={3}
                  maxLength={120}
                  placeholder="ป้อนอีเมลหรือชื่อผู้ใช้"
                  required
                  value={username}
                  onChange={(event) => setUsername(event.currentTarget.value)}
                />
              </label>

              <label>
                <span>รหัสผ่าน</span>
                <div className="production-password-field">
                  <input
                    className="form-input"
                    name="password"
                    type={showLoginPassword ? "text" : "password"}
                    autoComplete="current-password"
                    maxLength={200}
                    placeholder="ป้อนรหัสผ่านของคุณ"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.currentTarget.value)}
                  />
                  <button
                    className="production-password-toggle"
                    type="button"
                    onClick={() =>
                      setShowLoginPassword((current) => !current)
                    }
                    aria-pressed={showLoginPassword}
                    aria-label={showLoginPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    <i
                      className={
                        showLoginPassword ? "bx bx-hide" : "bx bx-show"
                      }
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </label>

              <div className="production-login-options">
                <div className="production-remember">
                  <label className="toggle-switch" aria-label="จดจำชื่อผู้ใช้">
                    <input
                      type="checkbox"
                      checked={rememberUsername}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setRememberUsername(checked);
                        if (!checked) clearRememberedUsername();
                      }}
                    />
                    <span className="toggle-slider" />
                  </label>
                  <span>จดจำชื่อผู้ใช้</span>
                </div>
                <button
                  className="production-link-button"
                  type="button"
                  onClick={() => setForgotHelp((current) => !current)}
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>

              {forgotHelp ? (
                <p className="production-password-help" role="status">
                  กรุณาติดต่อผู้ดูแลระบบเพื่อรับลิงก์ตั้งรหัสผ่านใหม่
                  ลิงก์มีอายุจำกัดและใช้ได้ตามนโยบายความปลอดภัยของระบบ
                </p>
              ) : null}

              {state.status === "error" ? (
                <p className="form-error" role="alert">
                  {state.message}
                </p>
              ) : null}

              <button
                className="production-login-submit"
                type="submit"
                disabled={state.status === "submitting"}
              >
                {state.status === "submitting"
                  ? "กำลังเข้าสู่ระบบ…"
                  : "เข้าสู่ระบบ"}
              </button>
            </form>

            <p className="production-auth-footer">
              ยังไม่มีบัญชีใช่ไหม?{" "}
              <button
                className="production-link-button"
                type="button"
                onClick={showRegistration}
              >
                สมัครสมาชิก
              </button>
            </p>
          </>
        ) : registrationState.status === "success" ? (
          <div className="login-success" role="status" aria-live="polite">
            <div className="action-message success">
              ส่งคำขอสมัครเรียบร้อยแล้ว บัญชีของคุณอยู่ระหว่างรอผู้ดูแลอนุมัติ
              เมื่อได้รับการอนุมัติจึงจะเข้าสู่ระบบได้
            </div>
            <button
              className="production-login-submit"
              type="button"
              onClick={showLogin}
            >
              กลับเข้าสู่ระบบ
            </button>
          </div>
        ) : (
          <>
            <form
              method="post"
              onSubmit={submitRegistration}
              className="production-login-form production-registration-form"
            >
              <label>
                <span>ชื่อผู้ใช้งาน / อีเมล</span>
                <input
                  className="form-input"
                  name="username"
                  autoComplete="username"
                  minLength={3}
                  maxLength={120}
                  placeholder="example@gmail.com"
                  required
                  value={registration.username}
                  onChange={(event) =>
                    updateRegistration("username", event.currentTarget.value)
                  }
                />
              </label>

              <label>
                <span>รหัสผ่าน</span>
                <div className="production-password-field">
                  <input
                    className="form-input"
                    name="password"
                    type={showRegistrationPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={200}
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                    required
                    value={registration.password}
                    onChange={(event) =>
                      updateRegistration("password", event.currentTarget.value)
                    }
                  />
                  <button
                    className="production-password-toggle"
                    type="button"
                    onClick={() =>
                      setShowRegistrationPassword((current) => !current)
                    }
                    aria-pressed={showRegistrationPassword}
                    aria-label={
                      showRegistrationPassword
                        ? "ซ่อนรหัสผ่าน"
                        : "แสดงรหัสผ่าน"
                    }
                  >
                    <i
                      className={
                        showRegistrationPassword ? "bx bx-hide" : "bx bx-show"
                      }
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </label>

              <label>
                <span>ยืนยันรหัสผ่าน</span>
                <input
                  className="form-input"
                  name="confirmPassword"
                  type={showRegistrationPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={200}
                  required
                  value={registration.confirmPassword}
                  onChange={(event) =>
                    updateRegistration(
                      "confirmPassword",
                      event.currentTarget.value,
                    )
                  }
                />
              </label>

              <label>
                <span>ชื่อ-นามสกุล</span>
                <input
                  className="form-input"
                  name="fullName"
                  autoComplete="name"
                  maxLength={250}
                  required
                  value={registration.fullName}
                  onChange={(event) =>
                    updateRegistration("fullName", event.currentTarget.value)
                  }
                />
              </label>

              <label>
                <span>ชื่อเล่น</span>
                <input
                  className="form-input"
                  name="nickname"
                  maxLength={120}
                  value={registration.nickname}
                  onChange={(event) =>
                    updateRegistration("nickname", event.currentTarget.value)
                  }
                />
              </label>

              <div className="production-registration-grid">
                <label>
                  <span>วันเดือนปีเกิด</span>
                  <DateField label="วันเดือนปีเกิด" name="dateOfBirth" value={registration.dateOfBirth} onChange={(next) => updateRegistration("dateOfBirth", next)} />
                </label>
                <label>
                  <span>วันที่เริ่มงาน</span>
                  <DateField label="วันที่เริ่มงาน" name="employmentStart" value={registration.employmentStart} onChange={(next) => updateRegistration("employmentStart", next)} />
                </label>
              </div>

              {registrationState.status === "error" ? (
                <p className="form-error" role="alert">
                  {registrationState.message}
                </p>
              ) : null}

              <button
                className="production-login-submit"
                type="submit"
                disabled={registrationState.status === "submitting"}
              >
                {registrationState.status === "submitting"
                  ? "กำลังส่งคำขอสมัคร…"
                  : "ส่งคำขอสมัคร"}
              </button>
            </form>

            <p className="production-auth-footer">
              มีบัญชีอยู่แล้ว?{" "}
              <button
                className="production-link-button"
                type="button"
                onClick={showLogin}
              >
                เข้าสู่ระบบ
              </button>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
