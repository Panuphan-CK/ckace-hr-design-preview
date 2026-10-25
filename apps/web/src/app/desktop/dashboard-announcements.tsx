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
import "./ck-v2-pages.css";
import { thaiDateTime } from "./ui/format";
import { Icon } from "./ui/icons";
import { DataGrid, DetailDialog, EmptyState, Message, SectionHead, StatusDot, Toggle } from "./ui/kit";
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

function dateLabel(value: string | null): string {
  if (!value) return "ฉบับร่าง";
  return thaiDateTime(value);
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
  const [viewing, setViewing] = useState<{ title: string; content: string; scope: string; date: string; hasAttachment: boolean } | null>(null);
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
      <section className="ck-panel ck-c-accent" aria-busy="true">
        <SectionHead title="ข่าวสารภายใน" />
        <div className="ck-state" role="status" aria-live="polite">
          <div className="ck-spinner" aria-hidden="true" />
          <p>กำลังโหลดประกาศ</p>
        </div>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="ck-panel ck-c-accent">
        <SectionHead title="ข่าวสารภายใน">
          <button
            className="ck-btn sky sm"
            type="button"
            onClick={() => {
              setState({ status: "loading" });
              void load();
            }}
          >
            ลองใหม่
          </button>
        </SectionHead>
        <Message value={{ kind: "error", text: state.message }} />
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
  const editing = editorOpen && state.navigation.announcementAdmin && adminData ? adminData : null;
  const editingItem = editingId ? (adminRows.find((item) => item.id === editingId) ?? null) : null;

  return (
    <section className="ck-panel ck-c-accent" aria-labelledby="dash-ann">
      <SectionHead title="ข่าวสารภายใน" id="dash-ann" count={displayed.length}>
        {state.navigation.announcementAdmin ? (
          <button className="ck-btn sky sm" type="button" onClick={addAnnouncement}>
            <Icon name="plus" size={14} />
            เพิ่มประกาศ
          </button>
        ) : null}
        {state.navigation.announcements ? (
          <Link className="ck-btn quiet sm" href="/desktop/announcements">
            ดูทั้งหมด
          </Link>
        ) : null}
      </SectionHead>

      {editing ? null : <Message value={message} />}

      <DataGrid
        rows={displayed}
        rowKey={(announcement) => announcement.id}
        pageSize={6}
        onRowClick={(announcement) => {
          const adminItem = adminRows.find((item) => item.id === announcement.id);
          if (adminItem) editAnnouncement(adminItem);
          else
            setViewing({
              title: titleLabel(announcement),
              content: announcement.content,
              scope: scopeLabel(announcement),
              date: dateLabel(announcement.publishedAt),
              hasAttachment: announcement.hasAttachment,
            });
        }}
        empty={<EmptyState icon="megaphone" title="ยังไม่มีประชาสัมพันธ์">เมื่อมีประกาศใหม่ รายการล่าสุดจะแสดงตรงนี้</EmptyState>}
        columns={[
          {
            key: "st",
            header: "",
            width: "48px",
            align: "center",
            render: (announcement) => (
              <StatusDot
                tone={announcement.publishedAt ? "ok" : "muted"}
                label={announcement.publishedAt ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
              />
            ),
          },
          {
            key: "title",
            header: "หัวข้อ",
            render: (announcement) => (
              <span className="ck-gcell">
                <span className="ck-chip sm ck-c-accent">
                  <Icon name="megaphone" size={16} />
                </span>
                <b>{titleLabel(announcement)}</b>
                {announcement.hasAttachment ? <Icon name="clip" size={14} /> : null}
              </span>
            ),
          },
          {
            key: "scope",
            header: "ขอบเขต",
            render: (announcement) => (
              <span className="ck-minichip">{scopeLabel(adminRows.find((item) => item.id === announcement.id) ?? announcement)}</span>
            ),
          },
          { key: "at", header: "เผยแพร่เมื่อ", render: (announcement) => dateLabel(announcement.publishedAt) },
        ]}
      />

      {viewing ? (
        <DetailDialog tone="accent" icon="megaphone" kicker={viewing.scope} title={viewing.title} onClose={() => setViewing(null)}>
          <p className="ck-dlg-note">{viewing.date}</p>
          <p className="ck-prewrap">{viewing.content}</p>
          {viewing.hasAttachment ? <p className="ck-dlg-note">มีเอกสารแนบ · เปิดดูจากหน้าประชาสัมพันธ์ทั้งหมด</p> : null}
        </DetailDialog>
      ) : null}

      {editing ? (
        <DetailDialog
          tone="accent"
          icon="megaphone"
          kicker={editingId ? "แก้ไขประชาสัมพันธ์" : "เพิ่มประชาสัมพันธ์"}
          title={editingId ? titleLabel(editingItem ?? { title: draft.title }) : "ประกาศใหม่"}
          onClose={() => {
            if (!busy) resetEditor();
          }}
          footer={
            <div className="ck-row ck-wrapbtn">
              <button className="ck-btn ok" type="submit" form="dash-ann-form" disabled={busy}>
                {busy ? "กำลังบันทึก..." : "บันทึก"}
              </button>
              {editingItem && state.navigation.announcementDeleteAdmin ? (
                <button
                  className="ck-btn no"
                  type="button"
                  title={editingItem.hasAttachment ? "ประกาศที่มีเอกสารแนบให้ปิดการเผยแพร่แทน" : "ลบ"}
                  disabled={busy || editingItem.hasAttachment}
                  onClick={() => void deleteAnnouncement(editingItem)}
                >
                  ลบประกาศ
                </button>
              ) : null}
            </div>
          }
        >
          <Message value={message} />
          <form id="dash-ann-form" className="ck-eform" onSubmit={(event) => void saveAnnouncement(event)}>
            <label className="ck-field full">
              <span>หัวข้อ</span>
              <input
                className="ck-in"
                maxLength={250}
                value={draft.title}
                disabled={busy}
                placeholder="หัวข้อประกาศ"
                onChange={(event) => setDraft((current) => ({ ...current, title: event.currentTarget.value }))}
              />
            </label>

            <label className="ck-field">
              <span>ขอบเขตการแสดง</span>
              <select
                className="ck-sselect"
                value={draft.scope}
                disabled={busy}
                onChange={(event) => {
                  const scope = event.currentTarget.value as AnnouncementScope;
                  setDraft((current) => ({
                    ...current,
                    scope,
                    agencyId: scope === "AGENCY" ? current.agencyId : "",
                    departmentId: scope === "DEPARTMENT" ? current.departmentId : "",
                  }));
                }}
              >
                <option value="GLOBAL">ทุกคนในองค์กร</option>
                <option value="AGENCY">เฉพาะหน่วยงาน</option>
                <option value="DEPARTMENT">เฉพาะฝ่าย</option>
              </select>
            </label>

            {draft.scope === "AGENCY" ? (
              <label className="ck-field">
                <span>หน่วยงาน</span>
                <select
                  className="ck-sselect"
                  required
                  disabled={busy}
                  value={draft.agencyId}
                  onChange={(event) => setDraft((current) => ({ ...current, agencyId: event.currentTarget.value }))}
                >
                  <option value="">เลือกหน่วยงาน</option>
                  {editing.agencies.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {draft.scope === "DEPARTMENT" ? (
              <label className="ck-field">
                <span>ฝ่าย</span>
                <select
                  className="ck-sselect"
                  required
                  disabled={busy}
                  value={draft.departmentId}
                  onChange={(event) => setDraft((current) => ({ ...current, departmentId: event.currentTarget.value }))}
                >
                  <option value="">เลือกฝ่าย</option>
                  {editing.departments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="ck-field full">
              <span>เนื้อหา</span>
              <textarea
                className="ck-in"
                rows={5}
                required
                maxLength={5000}
                disabled={busy}
                value={draft.content}
                placeholder="รายละเอียดประชาสัมพันธ์"
                onChange={(event) => setDraft((current) => ({ ...current, content: event.currentTarget.value }))}
              />
            </label>

            <div className="full ck-srow">
              <div>
                <b>เผยแพร่</b>
                <small>ปิดไว้เพื่อเก็บเป็นฉบับร่าง</small>
              </div>
              <div className="ck-srow-c">
                <Toggle
                  checked={draft.publishNow}
                  disabled={busy}
                  label="เผยแพร่"
                  onChange={(next) => setDraft((current) => ({ ...current, publishNow: next }))}
                />
              </div>
            </div>
          </form>
        </DetailDialog>
      ) : null}
    </section>
  );
}
