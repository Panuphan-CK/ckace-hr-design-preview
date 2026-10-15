"use client";

import type {
  AnnouncementAdminItem,
  AnnouncementAdminListResult,
  AnnouncementCreateResult,
  AnnouncementDeleteResult,
  AnnouncementListResult,
  AnnouncementScope,
  AnnouncementUpdateResult,
} from "@ckace/contracts";
import Link from "next/link";
import type { FormEvent } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

interface DashboardAnnouncementNavigation {
  readonly announcements: boolean;
  readonly announcementAdmin: boolean;
  readonly announcementDeleteAdmin: boolean;
}

interface SessionPayload {
  readonly navigation: DashboardAnnouncementNavigation;
}

interface AnnouncementDraft {
  readonly title: string;
  readonly content: string;
  readonly scope: AnnouncementScope;
  readonly agencyId: string;
  readonly departmentId: string;
  readonly publishNow: boolean;
}

type DashboardAnnouncementState =
  | { status: "loading" }
  | {
      status: "ready";
      navigation: DashboardAnnouncementNavigation;
      feed: AnnouncementListResult | null;
      admin: AnnouncementAdminListResult | null;
    }
  | { status: "error"; message: string };

type ActionMessage =
  | { kind: "success"; text: string }
  | { kind: "error"; text: string };

const EMPTY_DRAFT: AnnouncementDraft = {
  title: "",
  content: "",
  scope: "GLOBAL",
  agencyId: "",
  departmentId: "",
  publishNow: true,
};

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function dateLabel(value: string | null): string {
  if (!value) return "ฉบับร่าง";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function scopeLabel(item: {
  readonly scope: AnnouncementScope;
  readonly agencyName?: string | null;
  readonly departmentName?: string | null;
}): string {
  if (item.scope === "AGENCY") {
    return item.agencyName ? "หน่วยงาน · " + item.agencyName : "เฉพาะหน่วยงาน";
  }
  if (item.scope === "DEPARTMENT") {
    return item.departmentName ? "ฝ่าย · " + item.departmentName : "เฉพาะฝ่าย";
  }
  return "ทั้งองค์กร";
}

function titleLabel(item: { readonly title: string | null }): string {
  return item.title?.trim() || "ประกาศ";
}

function apiError(status: number): string {
  if (status === 401) return "หมดเวลาการเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่";
  if (status === 403) return "บัญชีนี้ไม่มีสิทธิ์จัดการประชาสัมพันธ์";
  if (status === 409) {
    return "ประกาศที่มีเอกสารแนบไม่สามารถลบได้ กรุณาปิดการเผยแพร่แทน";
  }
  if (status === 503) return "ระบบประชาสัมพันธ์ยังไม่พร้อมใช้งาน";
  return "ดำเนินการกับประชาสัมพันธ์ไม่สำเร็จ";
}

export function DashboardAnnouncements() {
  const [state, setState] = useState<DashboardAnnouncementState>({
    status: "loading",
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AnnouncementDraft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<ActionMessage | null>(null);

  const load = useCallback(async () => {
    try {
      const sessionResponse = await fetch("/api/security/session", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!sessionResponse.ok) {
        throw new Error(apiError(sessionResponse.status));
      }
      const session = (await sessionResponse.json()) as SessionPayload;
      const navigation = session.navigation;

      const [feedResponse, adminResponse] = await Promise.all([
        navigation.announcements
          ? fetch("/api/announcements", {
              credentials: "same-origin",
              cache: "no-store",
            })
          : Promise.resolve(null),
        navigation.announcementAdmin
          ? fetch("/api/announcements/admin", {
              credentials: "same-origin",
              cache: "no-store",
            })
          : Promise.resolve(null),
      ]);

      if (feedResponse && !feedResponse.ok) {
        throw new Error(apiError(feedResponse.status));
      }
      if (adminResponse && !adminResponse.ok) {
        throw new Error(apiError(adminResponse.status));
      }

      setState({
        status: "ready",
        navigation,
        feed: feedResponse
          ? ((await feedResponse.json()) as AnnouncementListResult)
          : null,
        admin: adminResponse
          ? ((await adminResponse.json()) as AnnouncementAdminListResult)
          : null,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลดประชาสัมพันธ์ได้",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const displayed = useMemo(() => {
    if (state.status !== "ready") return [];
    if (state.navigation.announcementAdmin && state.admin) {
      return state.admin.announcements.slice(0, 6);
    }
    return (state.feed?.announcements ?? []).slice(0, 6);
  }, [state]);

  function resetEditor() {
    setEditorOpen(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  function addAnnouncement() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setMessage(null);
    setEditorOpen(true);
  }

  function editAnnouncement(item: AnnouncementAdminItem) {
    setEditingId(item.id);
    setDraft({
      title: item.title ?? "",
      content: item.content,
      scope: item.scope,
      agencyId: item.agencyId ?? "",
      departmentId: item.departmentId ?? "",
      publishNow: item.publishedAt !== null,
    });
    setMessage(null);
    setEditorOpen(true);
  }

  async function saveAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      state.status !== "ready" ||
      !state.navigation.announcementAdmin ||
      busy
    ) {
      return;
    }

    const title = draft.title.trim();
    const content = draft.content.trim();
    if (!content) {
      setMessage({ kind: "error", text: "กรุณากรอกเนื้อหาประกาศ" });
      return;
    }
    if (draft.scope === "AGENCY" && !draft.agencyId) {
      setMessage({ kind: "error", text: "กรุณาเลือกหน่วยงาน" });
      return;
    }
    if (draft.scope === "DEPARTMENT" && !draft.departmentId) {
      setMessage({ kind: "error", text: "กรุณาเลือกฝ่าย" });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const editing = editingId !== null;
      const response = await fetch(
        editing
          ? "/api/announcements/" + encodeURIComponent(editingId)
          : "/api/announcements",
        {
          method: editing ? "PATCH" : "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: title || null,
            content,
            scope: draft.scope,
            agencyId: draft.scope === "AGENCY" ? draft.agencyId : null,
            departmentId:
              draft.scope === "DEPARTMENT" ? draft.departmentId : null,
            ...(editing ? {} : { attachmentIds: [] }),
            publishNow: draft.publishNow,
          }),
        },
      );
      if (!response.ok) throw new Error(apiError(response.status));

      const result = editing
        ? ((await response.json()) as AnnouncementUpdateResult)
        : ((await response.json()) as AnnouncementCreateResult);

      await load();
      resetEditor();
      setMessage({
        kind: "success",
        text: editing
          ? "แก้ไขประชาสัมพันธ์เรียบร้อย"
          : result.announcement.publishedAt
            ? "เพิ่มและเผยแพร่ประชาสัมพันธ์เรียบร้อย"
            : "บันทึกประชาสัมพันธ์เป็นฉบับร่างแล้ว",
      });
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "บันทึกประชาสัมพันธ์ไม่สำเร็จ",
      });
    } finally {
      setBusy(false);
    }
  }

  async function deleteAnnouncement(item: AnnouncementAdminItem) {
    if (
      state.status !== "ready" ||
      !state.navigation.announcementDeleteAdmin ||
      busy ||
      item.hasAttachment
    ) {
      return;
    }
    if (
      !window.confirm(
        `ยืนยันการลบประชาสัมพันธ์ “${titleLabel(item)}” ?`,
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        "/api/announcements/" + encodeURIComponent(item.id),
        {
          method: "DELETE",
          credentials: "same-origin",
        },
      );
      if (!response.ok) throw new Error(apiError(response.status));
      const result = (await response.json()) as AnnouncementDeleteResult;
      if (!result.deleted) throw new Error("ระบบยังยืนยันการลบไม่สำเร็จ");
      if (editingId === item.id) resetEditor();
      await load();
      setMessage({ kind: "success", text: "ลบประชาสัมพันธ์เรียบร้อย" });
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "ลบประชาสัมพันธ์ไม่สำเร็จ",
      });
    } finally {
      setBusy(false);
    }
  }

  if (state.status === "loading") {
    return (
      <section
        className="module-panel task396-dashboard-announcements"
        aria-busy="true"
      >
        <div className="task396-announcement-heading">
          <div>
            <span className="summary-kicker">ประชาสัมพันธ์</span>
            <h2>ข่าวสารภายใน</h2>
          </div>
        </div>
        <div className="task396-announcement-loading">
          <div className="spinner" aria-hidden="true" />
          <span>กำลังโหลดประกาศ</span>
        </div>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="module-panel task396-dashboard-announcements">
        <div className="task396-announcement-heading">
          <div>
            <span className="summary-kicker">ประชาสัมพันธ์</span>
            <h2>ข่าวสารภายใน</h2>
          </div>
          <button
            className="secondary-button compact"
            type="button"
            onClick={() => {
              setState({ status: "loading" });
              void load();
            }}
          >
            ลองใหม่
          </button>
        </div>
        <p className="panel-description">{state.message}</p>
      </section>
    );
  }

  if (
    !state.navigation.announcements &&
    !state.navigation.announcementAdmin
  ) {
    return null;
  }

  const adminData = state.admin;
  const adminRows =
    state.navigation.announcementAdmin && adminData
      ? adminData.announcements
      : [];

  return (
    <section className="module-panel task396-dashboard-announcements fade-in">
      <div className="task396-announcement-heading">
        <div>
          <span className="summary-kicker">ประชาสัมพันธ์</span>
          <h2>ข่าวสารภายใน</h2>
          <p>ประกาศสำคัญที่ควรรู้ในวันนี้</p>
        </div>
        <div className="task396-announcement-heading-actions">
          {state.navigation.announcementAdmin ? (
            <button
              className="primary-button compact"
              type="button"
              onClick={addAnnouncement}
            >
              <i className="bx bx-plus" aria-hidden="true" />
              เพิ่มประกาศ
            </button>
          ) : null}
          {state.navigation.announcements ? (
            <Link className="secondary-button compact" href="/desktop/announcements">
              ดูทั้งหมด
            </Link>
          ) : null}
        </div>
      </div>

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

      {editorOpen && state.navigation.announcementAdmin && adminData ? (
        <form
          className="task396-announcement-editor"
          onSubmit={(event) => void saveAnnouncement(event)}
        >
          <div className="task396-announcement-editor-head">
            <div>
              <strong>
                {editingId ? "แก้ไขประชาสัมพันธ์" : "เพิ่มประชาสัมพันธ์"}
              </strong>
              <span>กำหนดผู้รับและเลือกว่าจะเผยแพร่ทันทีหรือเก็บเป็นฉบับร่าง</span>
            </div>
            <button
              className="task396-icon-button"
              type="button"
              aria-label="ปิดตัวแก้ไขประชาสัมพันธ์"
              onClick={resetEditor}
              disabled={busy}
            >
              <i className="bx bx-x" aria-hidden="true" />
            </button>
          </div>

          <div className="task396-announcement-form-grid">
            <label>
              <span>หัวข้อ</span>
              <input
                className="form-input"
                maxLength={250}
                value={draft.title}
                disabled={busy}
                placeholder="หัวข้อประกาศ"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    title: event.currentTarget.value,
                  }))
                }
              />
            </label>

            <label>
              <span>ขอบเขตการแสดง</span>
              <select
                className="form-input"
                value={draft.scope}
                disabled={busy}
                onChange={(event) => {
                  const scope = event.currentTarget.value as AnnouncementScope;
                  setDraft((current) => ({
                    ...current,
                    scope,
                    agencyId: scope === "AGENCY" ? current.agencyId : "",
                    departmentId:
                      scope === "DEPARTMENT" ? current.departmentId : "",
                  }));
                }}
              >
                <option value="GLOBAL">ทุกคนในองค์กร</option>
                <option value="AGENCY">เฉพาะหน่วยงาน</option>
                <option value="DEPARTMENT">เฉพาะฝ่าย</option>
              </select>
            </label>

            {draft.scope === "AGENCY" ? (
              <label>
                <span>หน่วยงาน</span>
                <select
                  className="form-input"
                  required
                  disabled={busy}
                  value={draft.agencyId}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      agencyId: event.currentTarget.value,
                    }))
                  }
                >
                  <option value="">เลือกหน่วยงาน</option>
                  {adminData.agencies.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {draft.scope === "DEPARTMENT" ? (
              <label>
                <span>ฝ่าย</span>
                <select
                  className="form-input"
                  required
                  disabled={busy}
                  value={draft.departmentId}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      departmentId: event.currentTarget.value,
                    }))
                  }
                >
                  <option value="">เลือกฝ่าย</option>
                  {adminData.departments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="task396-announcement-content-field">
              <span>เนื้อหา</span>
              <textarea
                className="form-input"
                rows={4}
                required
                maxLength={5000}
                disabled={busy}
                value={draft.content}
                placeholder="รายละเอียดประชาสัมพันธ์"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    content: event.currentTarget.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="task396-announcement-editor-actions">
            <label className="task396-publish-toggle">
              <input
                type="checkbox"
                checked={draft.publishNow}
                disabled={busy}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    publishNow: event.currentTarget.checked,
                  }))
                }
              />
              <span>
                {draft.publishNow ? "เผยแพร่" : "เก็บเป็นฉบับร่าง"}
              </span>
            </label>
            <div>
              <button
                className="secondary-button"
                type="button"
                disabled={busy}
                onClick={resetEditor}
              >
                ยกเลิก
              </button>
              <button className="primary-button" type="submit" disabled={busy}>
                {busy ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {displayed.length === 0 ? (
        <div className="empty-state compact task396-announcement-empty">
          <i className="bx bx-message-square-dots" aria-hidden="true" />
          <h3>ยังไม่มีประชาสัมพันธ์</h3>
          <p>เมื่อมีประกาศใหม่ รายการล่าสุดจะแสดงตรงนี้</p>
        </div>
      ) : (
        <div className="task396-announcement-list">
          {displayed.map((announcement) => {
            const adminItem = adminRows.find(
              (item) => item.id === announcement.id,
            );
            return (
              <article
                className="task396-announcement-card"
                key={announcement.id}
              >
                <div className="task396-announcement-card-icon" aria-hidden="true">
                  <i className="bx bxs-megaphone" />
                </div>
                <div className="task396-announcement-card-copy">
                  <div className="task396-announcement-card-meta">
                    <span>{scopeLabel(adminItem ?? announcement)}</span>
                    <time>{dateLabel(announcement.publishedAt)}</time>
                  </div>
                  <strong>{titleLabel(announcement)}</strong>
                  <p>{announcement.content}</p>
                  {announcement.hasAttachment ? (
                    <small>
                      <i className="bx bx-paperclip" aria-hidden="true" />
                      มีเอกสารแนบ · เปิดดูจากหน้าประชาสัมพันธ์ทั้งหมด
                    </small>
                  ) : null}
                </div>

                {adminItem ? (
                  <div className="task396-announcement-card-actions">
                    <button
                      className="task396-icon-button"
                      type="button"
                      title="แก้ไข"
                      aria-label={"แก้ไข " + titleLabel(adminItem)}
                      onClick={() => editAnnouncement(adminItem)}
                      disabled={busy}
                    >
                      <i className="bx bx-edit-alt" aria-hidden="true" />
                    </button>
                    {state.navigation.announcementDeleteAdmin ? (
                      <button
                        className="task396-icon-button danger"
                        type="button"
                        title={
                          adminItem.hasAttachment
                            ? "ประกาศที่มีเอกสารแนบให้ปิดการเผยแพร่แทน"
                            : "ลบ"
                        }
                        aria-label={"ลบ " + titleLabel(adminItem)}
                        disabled={busy || adminItem.hasAttachment}
                        onClick={() => void deleteAnnouncement(adminItem)}
                      >
                        <i className="bx bx-trash" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
