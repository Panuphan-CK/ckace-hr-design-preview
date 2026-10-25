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
  profileAccountStateLabel,
  profileInitials,
  type ProfileNavigationCapabilities,
} from "./profile-view";
import { PasswordChangeCard } from "./password-change-card";
import "../ck-v2-pages.css";
import { ErrorState, LoadingState, Message, PageHead, SectionHead, StatusDot } from "../ui/kit";

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
  const [busyUpload, setBusyUpload] = useState<"PROFILE" | "SIGNATURE" | null>(null);

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

  async function uploadOwnImage(kind: "PROFILE" | "SIGNATURE", file: File) {
    const label = kind === "SIGNATURE" ? "ลายเซ็น" : "รูปโปรไฟล์";
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage({ kind: "error", text: "ใช้ได้เฉพาะไฟล์รูป JPG, PNG หรือ WebP" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ kind: "error", text: "ไฟล์ใหญ่เกิน 2 MB กรุณาลดขนาดรูป" });
      return;
    }
    setBusyUpload(kind);
    setMessage(null);
    try {
      const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const checksumSha256 = Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      const intentResponse = await fetch("/api/attachments/upload-intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          privacyClass: "EMPLOYEE_PRIVATE",
          originalFilename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          checksumSha256,
        }),
      });
      if (!intentResponse.ok) throw new Error("upload-intent");
      const intent = (await intentResponse.json()) as {
        attachmentId: string;
        upload: { url: string; method: string; requiredHeaders: Record<string, string> };
      };
      const put = await fetch(intent.upload.url, {
        method: intent.upload.method,
        headers: intent.upload.requiredHeaders,
        body: file,
      });
      if (!put.ok) throw new Error("upload");
      const finalize = await fetch(
        "/api/attachments/" + encodeURIComponent(intent.attachmentId) + "/finalize",
        { method: "POST", credentials: "same-origin" },
      );
      if (!finalize.ok) throw new Error("finalize");
      const link = await fetch("/api/profile/media", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ kind, attachmentId: intent.attachmentId }),
      });
      if (!link.ok) throw new Error("link");
      setMessage({ kind: "success", text: "บันทึก" + label + "เรียบร้อยแล้ว" });
      await load();
    } catch {
      setMessage({ kind: "error", text: "อัปโหลด" + label + "ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setBusyUpload(null);
    }
  }

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
    return <LoadingState title="กำลังโหลดข้อมูลโปรไฟล์" />;
  }

  if (state.status === "error") {
    return (
      <ErrorState
        title="เปิดข้อมูลโปรไฟล์ไม่สำเร็จ"
        message={state.message}
        onRetry={() => void load()}
      />
    );
  }

  const { profile, session } = state;

  function mediaCard(
    label: string,
    media: { attachmentId: string } | null | undefined,
    openLabel: string,
    kind: "PROFILE" | "SIGNATURE",
  ) {
    return (
      <div className="ck-field">
        <span>{label}</span>
        <div className="ck-row">
          <StatusDot tone={media ? "ok" : "muted"} label={media ? "มีไฟล์ในระบบ" : "ยังไม่มีไฟล์"} />
          {media ? (
            <button
              className="ck-btn sm quiet"
              type="button"
              disabled={Boolean(busyAttachment)}
              onClick={() => void handleAttachment(media.attachmentId, label)}
            >
              {busyAttachment === media.attachmentId ? "กำลังเปิด..." : openLabel}
            </button>
          ) : null}
          <label className="ck-btn sm quiet" style={{ cursor: "pointer" }}>
            {busyUpload === kind ? "กำลังอัปโหลด..." : media ? "เปลี่ยนไฟล์" : "อัปโหลด" + label}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              disabled={Boolean(busyUpload)}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) void uploadOwnImage(kind, file);
              }}
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHead
        tone="accent"
        icon="user"
        title="โปรไฟล์ของฉัน"
        subtitle="ข้อมูลตัวตน บัญชี และสิทธิ์ใช้งานของคุณ"
      >
        <button className="ck-btn quiet" type="button" onClick={() => void load()}>
          รีเฟรช
        </button>
      </PageHead>

      <div className="ck-wrap ck-stack">
        <Message value={message} />

        <section className="ck-fbox ck-c-accent">
          <div className="ck-row" style={{ gap: 16 }}>
            <span className="ck-chip lg" aria-hidden="true">
              {profileInitials(profile)}
            </span>
            <div>
              <h2 style={{ margin: 0 }}>{profile.fullName}</h2>
              <p className="ck-muted" style={{ margin: "4px 0 0" }}>
                {profile.nickname ? `ชื่อเล่น: ${profile.nickname}` : "ยังไม่มีชื่อเล่นในระบบ"}
                {" · "}
                {profile.agency?.name ?? "ไม่ระบุหน่วยงาน"}
                {" · "}
                {profile.department?.name ?? "ไม่ระบุแผนก"}
              </p>
            </div>
            <span className="ck-ml">
              <StatusDot
                tone={profile.accountState === "ACTIVE" ? "ok" : "muted"}
                label={profileAccountStateLabel(profile.accountState)}
              />
            </span>
          </div>
        </section>

        <section className="ck-fbox ck-c-accent">
          <SectionHead title="ข้อมูลทั่วไป" />
          <div className="ck-fgrid">
            <div className="ck-field">
              <span>วันเกิด</span>
              <b>{formatDate(profile.dateOfBirth)}</b>
            </div>
            <div className="ck-field">
              <span>วันเริ่มงาน</span>
              <b>{formatDate(profile.employmentStart)}</b>
            </div>
            <div className="ck-field">
              <span>วันพ้นสภาพ</span>
              <b>{formatDate(profile.resignationDate)}</b>
            </div>
            <div className="ck-field">
              <span>ชื่อผู้ใช้</span>
              <b>{profile.loginName}</b>
            </div>
            <div className="ck-field">
              <span>การเชื่อมต่อ LINE</span>
              <b>{profile.lineLinked ? "เชื่อมบัญชีแล้ว" : "ยังไม่เชื่อมบัญชี"}</b>
            </div>
          </div>
        </section>

        <section className="ck-fbox ck-c-accent">
          <SectionHead title="บทบาทและสิทธิ์ใช้งาน" hint={`${session.permissionCount} สิทธิ์`} />
          <div className="ck-fgrid">
            <div className="ck-field">
              <span>บทบาท</span>
              <div className="ck-row" style={{ flexWrap: "wrap" }}>
                {profile.roles.length > 0 ? (
                  profile.roles.map((role) => (
                    <span className="ck-minichip" key={role}>{role}</span>
                  ))
                ) : (
                  <span className="ck-muted">ไม่มีบทบาทที่แสดงได้</span>
                )}
              </div>
            </div>
            <div className="ck-field">
              <span>เมนูที่ได้รับอนุญาต</span>
              <div className="ck-row" style={{ flexWrap: "wrap" }}>
                {capabilities.length > 0 ? (
                  capabilities.map((capability) => (
                    <span className="ck-minichip ok" key={capability}>{capability}</span>
                  ))
                ) : (
                  <span className="ck-muted">ไม่มีเมนูเพิ่มเติม</span>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="ck-fbox ck-c-accent">
          <SectionHead title="รูปโปรไฟล์และลายเซ็น" />
          <div className="ck-fgrid">
            {mediaCard("รูปโปรไฟล์", profile.media.profile, "เปิดรูปโปรไฟล์", "PROFILE")}
            {mediaCard("ลายเซ็น", profile.media.signature, "เปิดลายเซ็น", "SIGNATURE")}
          </div>
        </section>

        <PasswordChangeCard />
      </div>
    </>
  );
}
