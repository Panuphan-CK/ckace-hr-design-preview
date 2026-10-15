"use client";

import type {
  AttachmentDownloadResult,
  SelfProfileResponse,
} from "@ckace/contracts";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  enabledProfileCapabilities,
  profileAccountStateClass,
  profileAccountStateLabel,
  profileInitials,
  type ProfileNavigationCapabilities,
} from "./profile-view";

interface SessionSnapshot {
  readonly authenticated: true;
  readonly employeeId: string;
  readonly authenticatedBy: string;
  readonly roleCount: number;
  readonly permissionCount: number;
  readonly navigation: ProfileNavigationCapabilities;
  readonly clientRoleAuthority: false;
}

type State =
  | { status: "loading" }
  | {
      status: "ready";
      profile: SelfProfileResponse;
      session: SessionSnapshot;
    }
  | { status: "error"; message: string };

type Message =
  | { kind: "success"; text: string }
  | { kind: "error"; text: string };

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00+07:00`);
  return Number.isNaN(date.getTime())
    ? value
    : dateFormatter.format(date);
}

function errorMessage(status: number): string {
  if (status === 401) {
    return "หมดเวลาการเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่";
  }
  if (status === 403) {
    return "บัญชีนี้ไม่มีสิทธิ์ดูข้อมูลโปรไฟล์";
  }
  if (status === 404) {
    return "ไม่พบข้อมูลโปรไฟล์ของบัญชีนี้";
  }
  if (status === 503) {
    return "โมดูล Identity / Profile ยังไม่เปิดใช้งานใน environment นี้";
  }
  return "ไม่สามารถโหลดข้อมูลโปรไฟล์ได้ กรุณาลองใหม่อีกครั้ง";
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(errorMessage(response.status));
  }
  return response.json() as Promise<T>;
}

async function openAttachment(
  attachmentId: string,
): Promise<void> {
  const response = await fetch(
    `/api/attachments/${encodeURIComponent(attachmentId)}/download`,
    {
      method: "POST",
      credentials: "same-origin",
    },
  );
  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? "บัญชีนี้ไม่มีสิทธิ์เปิดไฟล์ส่วนตัวนี้"
        : response.status === 404
          ? "ไม่พบไฟล์หรือไฟล์ยังไม่พร้อมใช้งาน"
          : response.status === 503
            ? "ระบบไฟล์ส่วนตัวยังไม่พร้อมใช้งาน"
            : "ไม่สามารถเปิดไฟล์ได้",
    );
  }

  const result =
    (await response.json()) as AttachmentDownloadResult;
  const headers = result.download.requiredHeaders;
  if (Object.keys(headers).length === 0) {
    const anchor = document.createElement("a");
    anchor.href = result.download.url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.click();
    return;
  }

  const fileResponse = await fetch(result.download.url, {
    method: "GET",
    headers,
  });
  if (!fileResponse.ok) {
    throw new Error("ดาวน์โหลดไฟล์จาก Private Storage ไม่สำเร็จ");
  }
  const blobUrl = URL.createObjectURL(
    await fileResponse.blob(),
  );
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export default function DesktopProfilePage() {
  const [state, setState] = useState<State>({
    status: "loading",
  });
  const [busyAttachment, setBusyAttachment] =
    useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    setMessage(null);
    try {
      const [profile, session] = await Promise.all([
        getJson<SelfProfileResponse>("/api/profile/me"),
        getJson<SessionSnapshot>("/api/security/session"),
      ]);
      setState({
        status: "ready",
        profile,
        session,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลดข้อมูลโปรไฟล์ได้",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const capabilities = useMemo(
    () =>
      state.status === "ready"
        ? enabledProfileCapabilities(
            state.session.navigation,
          )
        : [],
    [state],
  );

  async function handleAttachment(
    attachmentId: string,
    label: string,
  ) {
    if (busyAttachment) return;
    setBusyAttachment(attachmentId);
    setMessage(null);
    try {
      await openAttachment(attachmentId);
      setMessage({
        kind: "success",
        text: `เปิด${label}ด้วย signed private download แล้ว`,
      });
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : `เปิด${label}ไม่สำเร็จ`,
      });
    } finally {
      setBusyAttachment(null);
    }
  }

  if (state.status === "loading") {
    return (
      <section
        className="module-state"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="spinner" aria-hidden="true" />
        <h1>กำลังโหลดข้อมูลโปรไฟล์</h1>
        <p>
          กำลังอ่าน Identity และสิทธิ์ใช้งานจาก Project B Server
        </p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="module-state" role="alert">
        <div className="status-badge error">
          PROFILE ERROR
        </div>
        <h1>เปิดข้อมูลโปรไฟล์ไม่สำเร็จ</h1>
        <p>{state.message}</p>
        <button
          className="primary-button"
          type="button"
          onClick={() => void load()}
        >
          ลองใหม่
        </button>
      </section>
    );
  }

  const { profile, session } = state;

  return (
    <div className="module-stack">
      <section className="module-heading">
        <div>
          <p className="eyebrow">IDENTITY / PROFILE</p>
          <h1>โปรไฟล์ของฉัน</h1>
          <p>
            ข้อมูลตัวตน บัญชี องค์กร และสิทธิ์ใช้งานที่มาจาก
            Project B Server โดยไม่เปิดเผย credential หรือ provider metadata
          </p>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => void load()}
        >
          รีเฟรช
        </button>
      </section>

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

      <section className="profile-hero">
        <div className="profile-avatar" aria-hidden="true">
          {profileInitials(profile)}
        </div>
        <div className="profile-hero-copy">
          <div className="profile-title-line">
            <h2>{profile.fullName}</h2>
            <span
              className={profileAccountStateClass(
                profile.accountState,
              )}
            >
              {profileAccountStateLabel(profile.accountState)}
            </span>
          </div>
          <p>
            {profile.nickname
              ? `ชื่อเล่น: ${profile.nickname}`
              : "ยังไม่มีชื่อเล่นในระบบ"}
          </p>
          <div className="profile-identity-tags">
            <span>{profile.loginName}</span>
            <span>
              {profile.agency?.name ?? "ไม่ระบุหน่วยงาน"}
            </span>
            <span>
              {profile.department?.name ?? "ไม่ระบุแผนก"}
            </span>
          </div>
        </div>
      </section>

      <section className="profile-grid">
        <article className="module-panel profile-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">IDENTITY</p>
              <h2>ข้อมูลตัวตน</h2>
            </div>
          </div>
          <dl className="profile-definition-list">
            <div>
              <dt>Employee ID</dt>
              <dd>{profile.employeeId}</dd>
            </div>
            <div>
              <dt>วันเกิด</dt>
              <dd>{formatDate(profile.dateOfBirth)}</dd>
            </div>
            <div>
              <dt>วันเริ่มงาน</dt>
              <dd>{formatDate(profile.employmentStart)}</dd>
            </div>
            <div>
              <dt>วันพ้นสภาพ</dt>
              <dd>{formatDate(profile.resignationDate)}</dd>
            </div>
          </dl>
        </article>

        <article className="module-panel profile-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">ACCOUNT</p>
              <h2>บัญชีและการเชื่อมต่อ</h2>
            </div>
          </div>
          <dl className="profile-definition-list">
            <div>
              <dt>Login name</dt>
              <dd>{profile.loginName}</dd>
            </div>
            <div>
              <dt>สถานะบัญชี</dt>
              <dd>
                {profileAccountStateLabel(
                  profile.accountState,
                )}
              </dd>
            </div>
            <div>
              <dt>LINE linkage</dt>
              <dd>
                {profile.lineLinked
                  ? "เชื่อมบัญชีแล้ว"
                  : "ยังไม่เชื่อมบัญชี"}
              </dd>
            </div>
            <div>
              <dt>Authenticated by</dt>
              <dd>{session.authenticatedBy}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="module-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">ROLES & ACCESS</p>
            <h2>บทบาทและสิทธิ์ใช้งาน</h2>
          </div>
          <span className="panel-note">
            {session.permissionCount} permissions
          </span>
        </div>

        <div className="profile-access-grid">
          <div>
            <strong>บทบาท</strong>
            <div className="profile-chip-list">
              {profile.roles.length > 0 ? (
                profile.roles.map((role) => (
                  <span className="profile-chip" key={role}>
                    {role}
                  </span>
                ))
              ) : (
                <span className="panel-note">
                  ไม่มี role ที่แสดงได้
                </span>
              )}
            </div>
          </div>
          <div>
            <strong>เมนูที่ Server อนุญาต</strong>
            <div className="profile-chip-list">
              {capabilities.length > 0 ? (
                capabilities.map((capability) => (
                  <span
                    className="profile-chip access"
                    key={capability}
                  >
                    {capability}
                  </span>
                ))
              ) : (
                <span className="panel-note">
                  ไม่มีเมนูเพิ่มเติม
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="profile-security-note">
          Browser ใช้ข้อมูลนี้เพื่อแสดง UI เท่านั้น การอนุญาตจริงยังตรวจซ้ำที่
          Server ทุก endpoint และ client role ไม่มี authority
        </p>
      </section>

      <section className="module-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">PRIVATE MEDIA</p>
            <h2>รูปโปรไฟล์และลายเซ็น</h2>
          </div>
        </div>
        <div className="profile-media-grid">
          <article className="profile-media-card">
            <strong>รูปโปรไฟล์</strong>
            <span>
              {profile.media.profile
                ? "มีไฟล์ในระบบ"
                : "ยังไม่มีไฟล์"}
            </span>
            {profile.media.profile ? (
              <button
                className="secondary-button"
                type="button"
                disabled={Boolean(busyAttachment)}
                onClick={() =>
                  void handleAttachment(
                    profile.media.profile!.attachmentId,
                    "รูปโปรไฟล์",
                  )
                }
              >
                {busyAttachment ===
                profile.media.profile.attachmentId
                  ? "กำลังเปิด..."
                  : "เปิดรูปโปรไฟล์"}
              </button>
            ) : null}
          </article>

          <article className="profile-media-card">
            <strong>ลายเซ็น</strong>
            <span>
              {profile.media.signature
                ? "มีไฟล์ในระบบ"
                : "ยังไม่มีไฟล์"}
            </span>
            {profile.media.signature ? (
              <button
                className="secondary-button"
                type="button"
                disabled={Boolean(busyAttachment)}
                onClick={() =>
                  void handleAttachment(
                    profile.media.signature!.attachmentId,
                    "ลายเซ็น",
                  )
                }
              >
                {busyAttachment ===
                profile.media.signature.attachmentId
                  ? "กำลังเปิด..."
                  : "เปิดลายเซ็น"}
              </button>
            ) : null}
          </article>
        </div>
        <p className="profile-security-note">
          ไฟล์ส่วนตัวเปิดผ่าน signed URL อายุสั้นและ storage policy
          ตรวจ owner/permission ที่ Server ไม่มี storage key หรือ provider URL
          ถูกเก็บใน Profile response
        </p>
      </section>

      <section className="profile-readonly-note">
        <strong>ขอบเขต M9D.11</strong>
        <span>
          หน้า Profile เป็น read-only ตาม contract ปัจจุบัน
          ยังไม่มีการแก้ชื่อ บัญชี รหัสผ่าน รูปโปรไฟล์ หรือลายเซ็นจากหน้านี้
        </span>
      </section>
    </div>
  );
}
