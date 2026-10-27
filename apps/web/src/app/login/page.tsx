"use client";

import "../desktop/ui/ck.css";
import "./ck-login-smarthr.css";
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
  | { status: "success"; note?: string | undefined }
  | { status: "error"; message: string };

type LoginMode = "login" | "register";

const APP_VERSION = "1.0 (TEST)";
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function sha256Hex(file: File): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function imageProblem(file: File | null): string | null {
  if (!file) return null;
  if (!IMAGE_TYPES.includes(file.type)) return "ใช้ได้เฉพาะไฟล์รูป JPG, PNG หรือ WebP";
  if (file.size > MAX_IMAGE_BYTES) return "ไฟล์ใหญ่เกิน 2 MB กรุณาลดขนาดรูป";
  return null;
}

/** Uploads one registration image with the short-lived token; returns false on any failure. */
async function uploadRegistrationImage(
  token: string,
  kind: "PROFILE" | "SIGNATURE",
  file: File,
): Promise<boolean> {
  try {
    const intentResponse = await fetch("/api/onboarding/media/upload-intent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        token,
        kind,
        originalFilename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        checksumSha256: await sha256Hex(file),
      }),
    });
    if (!intentResponse.ok) return false;
    const intent = (await intentResponse.json()) as {
      attachmentId: string;
      upload: { url: string; method: string; requiredHeaders: Record<string, string> };
    };
    const put = await fetch(intent.upload.url, {
      method: intent.upload.method,
      headers: intent.upload.requiredHeaders,
      body: file,
    });
    if (!put.ok) return false;
    const done = await fetch("/api/onboarding/media/finalize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ token, attachmentId: intent.attachmentId, kind }),
    });
    return done.ok;
  } catch {
    return false;
  }
}

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
  const [showRegistrationConfirm, setShowRegistrationConfirm] = useState(false);
  const [showRegistrationPassword, setShowRegistrationPassword] =
    useState(false);
  const [registration, setRegistration] =
    useState<RegistrationFormValues>(EMPTY_REGISTRATION);
  const [darkMode, setDarkMode] = useState(false);
  const [forgotHelp, setForgotHelp] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [capsLock, setCapsLock] = useState(false);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recovery, setRecovery] = useState<
    { status: "idle" | "sending" | "sent" | "error"; message?: string }
  >({ status: "idle" });

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("expired") === "1") {
      setState({ status: "error", message: "หมดเวลาใช้งาน กรุณาเข้าสู่ระบบใหม่" });
    }
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
        let detail: { message?: unknown; retryAfterSeconds?: unknown } = {};
        try {
          detail = (await response.json()) as typeof detail;
        } catch {
          // Body is optional; the status code alone selects the message.
        }
        let message = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
        if (response.status === 503) {
          message = "ระบบเข้าสู่ระบบยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ";
        } else if (response.status === 429) {
          const seconds = typeof detail.retryAfterSeconds === "number" ? detail.retryAfterSeconds : 300;
          message = "ใส่รหัสผ่านผิดหลายครั้งเกินไป กรุณารออีกประมาณ " + Math.max(1, Math.ceil(seconds / 60)) + " นาที แล้วลองใหม่";
        } else if (response.status === 403) {
          message = typeof detail.message === "string" && /pending/i.test(detail.message)
            ? "บัญชีของคุณรอผู้ดูแลอนุมัติ ยังเข้าสู่ระบบไม่ได้ สอบถาม HR โทร 093-193-9225"
            : "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อ HR โทร 093-193-9225";
        }
        setState({ status: "error", message });
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

  useEffect(() => {
    if (!profileFile || imageProblem(profileFile)) { setProfilePreview(null); return; }
    const url = URL.createObjectURL(profileFile);
    setProfilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [profileFile]);

  useEffect(() => {
    if (!signatureFile || imageProblem(signatureFile)) { setSignaturePreview(null); return; }
    const url = URL.createObjectURL(signatureFile);
    setSignaturePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [signatureFile]);

  useEffect(() => {
    if (!forgotHelp) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setForgotHelp(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [forgotHelp]);

  function fieldHints() {
    const hints: Record<string, string | null> = {};
    const login = registration.username.trim();
    hints.username =
      login.length > 0 && login.length < 3
        ? "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร"
        : login.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login)
          ? "รูปแบบอีเมลไม่ถูกต้อง เช่น name@example.com"
          : null;
    const today = new Date().toISOString().slice(0, 10);
    hints.dateOfBirth =
      registration.dateOfBirth && registration.dateOfBirth >= today ? "วันเกิดต้องเป็นวันที่ผ่านมาแล้ว" : null;
    hints.employmentStart =
      registration.employmentStart && registration.employmentStart > today
        ? "วันเริ่มงานต้องไม่เป็นวันในอนาคต"
        : registration.employmentStart && registration.dateOfBirth && registration.employmentStart <= registration.dateOfBirth
          ? "วันเริ่มงานต้องหลังวันเกิด"
          : null;
    return hints;
  }

  function updateName(first: string, last: string) {
    setFirstName(first);
    setLastName(last);
    updateRegistration("fullName", (first.trim() + " " + last.trim()).trim());
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

    const validationMessage =
      !firstName.trim() || !lastName.trim()
        ? "กรุณากรอกทั้งชื่อและนามสกุล"
        : (Object.values(fieldHints()).find(Boolean) ?? imageProblem(signatureFile) ?? imageProblem(profileFile) ?? validateRegistrationForm(registration));
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
        readonly mediaToken?: unknown;
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

      let note: string | undefined;
      const token = typeof result.mediaToken === "string" ? result.mediaToken : null;
      const uploads: Array<Promise<boolean>> = [];
      if (token && signatureFile) uploads.push(uploadRegistrationImage(token, "SIGNATURE", signatureFile));
      if (token && profileFile) uploads.push(uploadRegistrationImage(token, "PROFILE", profileFile));
      if (uploads.length > 0 && (!token || (await Promise.all(uploads)).some((ok) => !ok))) {
        note = "ระบบรับคำขอสมัครแล้ว แต่แนบรูปไม่สำเร็จ กรุณาแจ้งผู้ดูแลให้ช่วยเพิ่มรูปภายหลัง";
      }

      setRegistration(EMPTY_REGISTRATION);
      setFirstName("");
      setLastName("");
      setProfileFile(null);
      setSignatureFile(null);
      setShowRegistrationPassword(false);
      setRegistrationState({ status: "success", note });
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

  function openForgot() {
    setRecoveryEmail(username.trim());
    setRecovery({ status: "idle" });
    setForgotHelp(true);
  }

  async function requestRecovery() {
    if (recoveryEmail.trim().length < 3) {
      setRecovery({ status: "error", message: "กรุณากรอกอีเมลหรือชื่อผู้ใช้ของคุณ" });
      return;
    }
    setRecovery({ status: "sending" });
    try {
      const response = await fetch("/api/password-recovery/request", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ login: recoveryEmail.trim() }),
      });
      if (!response.ok) throw new Error();
      setRecovery({ status: "sent" });
    } catch {
      setRecovery({ status: "error", message: "ส่งลิงก์ไม่สำเร็จ กรุณาลองใหม่ หรือติดต่อผู้ดูแลระบบ" });
    }
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
                  autoFocus
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
                    onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))}
                    onBlur={() => setCapsLock(false)}
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
              {capsLock ? (
                <p className="form-warning" role="status">Caps Lock เปิดอยู่ ตรวจสอบตัวพิมพ์ใหญ่-เล็กของรหัสผ่าน</p>
              ) : null}

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
                  onClick={openForgot}
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>


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
            <p className="production-version">เวอร์ชัน {APP_VERSION}</p>
          </>
        ) : registrationState.status === "success" ? (
          <div className="login-success" role="status" aria-live="polite">
            <div className="action-message success">
              ส่งคำขอสมัครเรียบร้อยแล้ว บัญชีของคุณอยู่ระหว่างรอผู้ดูแลอนุมัติ
              เมื่อได้รับการอนุมัติจึงจะเข้าสู่ระบบได้
              {registrationState.note ? <><br />{registrationState.note}</> : null}
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
              noValidate
              onSubmit={submitRegistration}
              className="production-login-form production-registration-form"
            >
              <div className="production-avatar">
                <label className="production-avatar-circle">
                  {profilePreview ? (
                    <img src={profilePreview} alt="ตัวอย่างรูปโปรไฟล์" />
                  ) : (
                    <span className="production-avatar-empty">
                      <i className="bx bx-camera" aria-hidden="true" />
                      <small>แตะเพื่ออัปโหลดรูป</small>
                    </span>
                  )}
                  {profilePreview ? (
                    <span className="production-avatar-edit" aria-hidden="true">
                      <i className="bx bx-pencil" />
                    </span>
                  ) : null}
                  <input
                    type="file"
                    name="profile"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={(event) => setProfileFile(event.currentTarget.files?.[0] ?? null)}
                  />
                </label>
                <span>รูปโปรไฟล์ (ไม่บังคับ) · JPG/PNG ไม่เกิน 2 MB</span>
                {profileFile ? (
                  <button className="production-link-button" type="button" onClick={() => setProfileFile(null)}>
                    ลบรูป
                  </button>
                ) : null}
                {imageProblem(profileFile) ? (
                  <p className="form-error" role="alert">{imageProblem(profileFile)}</p>
                ) : null}
              </div>

              <div className="production-registration-grid">
                <label>
                  <span>ชื่อ <b className="req">*</b></span>
                  <input
                    className="form-input"
                    name="firstName"
                    autoComplete="given-name"
                    maxLength={120}
                    required
                    placeholder="ชื่อ"
                    value={firstName}
                    onChange={(event) => updateName(event.currentTarget.value, lastName)}
                  />
                </label>
                <label>
                  <span>นามสกุล <b className="req">*</b></span>
                  <input
                    className="form-input"
                    name="lastName"
                    autoComplete="family-name"
                    maxLength={120}
                    required
                    placeholder="นามสกุล"
                    value={lastName}
                    onChange={(event) => updateName(firstName, event.currentTarget.value)}
                  />
                </label>
              </div>

              <label>
                <span>ชื่อเล่น (ถ้ามี)</span>
                <input
                  className="form-input"
                  name="nickname"
                  placeholder="ชื่อเล่น"
                  maxLength={120}
                  value={registration.nickname}
                  onChange={(event) =>
                    updateRegistration("nickname", event.currentTarget.value)
                  }
                />
              </label>

              <div className="production-registration-grid">
                <label>
                  <span>วันเดือนปีเกิด <b className="req">*</b></span>
                  <DateField label="วันเดือนปีเกิด" name="dateOfBirth" value={registration.dateOfBirth} onChange={(next) => updateRegistration("dateOfBirth", next)} />
                </label>
                <label>
                  <span>วันที่เริ่มงาน <b className="req">*</b></span>
                  <DateField label="วันที่เริ่มงาน" name="employmentStart" value={registration.employmentStart} onChange={(next) => updateRegistration("employmentStart", next)} />
                </label>
              </div>
              {fieldHints().dateOfBirth ? (
                <p className="form-error" role="alert">{fieldHints().dateOfBirth}</p>
              ) : null}
              {fieldHints().employmentStart ? (
                <p className="form-error" role="alert">{fieldHints().employmentStart}</p>
              ) : null}

              <label>
                <span>ชื่อผู้ใช้งาน / อีเมล <b className="req">*</b></span>
                <input
                  className="form-input"
                  name="username"
                  autoComplete="username"
                  minLength={3}
                  maxLength={120}
                  placeholder="name@example.com"
                  required
                  value={registration.username}
                  onChange={(event) =>
                    updateRegistration("username", event.currentTarget.value)
                  }
                />
              </label>
              {fieldHints().username ? (
                <p className="form-error" role="alert">{fieldHints().username}</p>
              ) : null}

              <label>
                <span>รหัสผ่าน <b className="req">*</b></span>
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
              {registration.password.length > 0 && registration.password.length < 8 ? (
                <p className="form-error" role="alert">
                  รหัสผ่านสั้นเกินไป ต้องมีอย่างน้อย 8 ตัวอักษร (ตอนนี้ {registration.password.length} ตัว)
                </p>
              ) : null}

              <label>
                <span>ยืนยันรหัสผ่าน <b className="req">*</b></span>
                <div className="production-password-field">
                <input
                  className="form-input"
                  name="confirmPassword"
                  type={showRegistrationConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={200}
                  required
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  aria-invalid={registration.confirmPassword.length > 0 && registration.confirmPassword !== registration.password}
                  value={registration.confirmPassword}
                  onChange={(event) =>
                    updateRegistration(
                      "confirmPassword",
                      event.currentTarget.value,
                    )
                  }
                />
                <button
                  className="production-password-toggle"
                  type="button"
                  onClick={() => setShowRegistrationConfirm((current) => !current)}
                  aria-pressed={showRegistrationConfirm}
                  aria-label={showRegistrationConfirm ? "ซ่อนรหัสผ่านยืนยัน" : "แสดงรหัสผ่านยืนยัน"}
                >
                  <i className={showRegistrationConfirm ? "bx bx-hide" : "bx bx-show"} aria-hidden="true" />
                </button>
                </div>
              </label>
              {registration.confirmPassword && registration.confirmPassword !== registration.password ? (
                <p className="form-error" role="alert">รหัสผ่านสองช่องยังไม่ตรงกัน</p>
              ) : null}

              <div className="production-signature">
                <span className="production-signature-label">ลายเซ็น (ไม่บังคับ)</span>
                <label className="production-signature-box">
                  {signaturePreview ? (
                    <img src={signaturePreview} alt="ตัวอย่างลายเซ็น" />
                  ) : (
                    <span>
                      <i className="bx bx-pen" aria-hidden="true" />
                      แตะเพื่ออัปโหลดลายเซ็น
                      <small>ใช้ประกอบเอกสารใบลา (เพิ่มภายหลังได้) · JPG/PNG ไม่เกิน 2 MB</small>
                    </span>
                  )}
                  <input
                    type="file"
                    name="signature"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={(event) => setSignatureFile(event.currentTarget.files?.[0] ?? null)}
                  />
                </label>
                {signatureFile ? (
                  <button className="production-link-button" type="button" onClick={() => setSignatureFile(null)}>
                    ลบรูป
                  </button>
                ) : null}
                {imageProblem(signatureFile) ? (
                  <p className="form-error" role="alert">{imageProblem(signatureFile)}</p>
                ) : null}
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
      {forgotHelp ? (
        <div
          className="production-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) setForgotHelp(false);
          }}
        >
          <div className="production-modal">
            <button
              className="production-modal-close"
              type="button"
              aria-label="ปิด"
              onClick={() => setForgotHelp(false)}
            >
              <i className="bx bx-x" aria-hidden="true" />
            </button>
            <h2 id="forgot-title">รีเซ็ตรหัสผ่านด้วยอีเมลที่ใช้งาน</h2>
            <input
              className="form-input"
              type="text"
              autoComplete="username"
              placeholder="อีเมล / ชื่อผู้ใช้"
              value={recoveryEmail}
              onChange={(event) => setRecoveryEmail(event.currentTarget.value)}
              aria-invalid={recovery.status === "error"}
            />
            {recovery.status === "sent" ? (
              <p className="action-message success" role="status">
                ถ้ามีบัญชีนี้ในระบบ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ให้แล้ว กรุณาตรวจอีเมล (รวมถึงโฟลเดอร์สแปม)
              </p>
            ) : null}
            {recovery.status === "error" ? (
              <p className="form-error" role="alert">{recovery.message}</p>
            ) : null}
            {recovery.status === "sent" ? null : (
            <button
              className="production-login-submit"
              type="button"
              disabled={recovery.status === "sending"}
              onClick={() => void requestRecovery()}
            >
              {recovery.status === "sending" ? "กำลังส่ง…" : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
            </button>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
