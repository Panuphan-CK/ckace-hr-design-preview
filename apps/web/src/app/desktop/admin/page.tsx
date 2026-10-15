"use client";

import type {
  AdminSettingsView,
  AnnouncementAdminItem,
  AnnouncementAdminListResult,
  AnnouncementCreateResult,
  AnnouncementDeleteResult,
  AnnouncementScope,
  AnnouncementUpdateResult,
} from "@ckace/contracts";
import Link from "next/link";
import type { FormEvent } from "react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

interface SessionPayload {
  readonly navigation: {
    readonly announcementAdmin: boolean;
    readonly announcementDeleteAdmin: boolean;
    readonly managementAdmin: boolean;
    readonly usersAdmin: boolean;
    readonly organizationAdmin: boolean;
    readonly rbacAdmin: boolean;
    readonly passwordRecoveryAdmin: boolean;
    readonly adminSettings: boolean;
  };
}

interface AdminCapabilities {
  readonly announcementAdmin: boolean;
  readonly announcementDeleteAdmin: boolean;
  readonly managementAdmin: boolean;
  readonly usersAdmin: boolean;
  readonly organizationAdmin: boolean;
  readonly rbacAdmin: boolean;
  readonly passwordRecoveryAdmin: boolean;
  readonly adminSettings: boolean;
}

type State =
  | { status: "loading" }
  | {
      status: "ready";
      capabilities: AdminCapabilities;
      settings: AdminSettingsView | null;
      announcements: AnnouncementAdminListResult | null;
    }
  | { status: "error"; message: string };

type Message =
  | { kind: "success"; text: string }
  | { kind: "error"; text: string };

type AdminView = "settings" | "announcement-admin";

interface AnnouncementDraft {
  readonly title: string;
  readonly content: string;
  readonly scope: AnnouncementScope;
  readonly agencyId: string;
  readonly departmentId: string;
  readonly publishNow: boolean;
}

const EMPTY_ANNOUNCEMENT_DRAFT: AnnouncementDraft = {
  title: "",
  content: "",
  scope: "GLOBAL",
  agencyId: "",
  departmentId: "",
  publishNow: true,
};

function announcementScopeLabel(item: AnnouncementAdminItem): string {
  if (item.scope === "AGENCY") {
    return item.agencyName ? "หน่วยงาน: " + item.agencyName : "หน่วยงาน";
  }
  if (item.scope === "DEPARTMENT") {
    return item.departmentName ? "ฝ่าย: " + item.departmentName : "ฝ่าย";
  }
  return "ทุกคนในองค์กร";
}

function formatAnnouncementDate(value: string | null): string {
  if (!value) return "ยังไม่เผยแพร่";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function adminViewFromHash(): AdminView {
  if (
    typeof window !== "undefined" &&
    window.location.hash === "#announcement-admin"
  ) {
    return "announcement-admin";
  }
  return "settings";
}

function errorMessage(status: number): string {
  if (status === 401) return "หมดเวลาการเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่";
  if (status === 403) return "บัญชีนี้ไม่มีสิทธิ์ดำเนินการในส่วนผู้ดูแลระบบ";
  if (status === 503) return "ระบบผู้ดูแลยังไม่พร้อมใช้งานในขณะนี้";
  return "ไม่สามารถดำเนินการได้ กรุณาลองใหม่อีกครั้ง";
}

function SettingStatus({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="production-setting-status-row">
      <span>{label}</span>
      <div>
        <span className="status-indicator status-valid" aria-hidden="true" />
        <small>{value}</small>
      </div>
    </div>
  );
}

export default function DesktopAdminPage() {
  const [state, setState] = useState<State>({
    status: "loading",
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [view, setView] = useState<AdminView>("settings");
  const [announcementDraft, setAnnouncementDraft] =
    useState<AnnouncementDraft>(EMPTY_ANNOUNCEMENT_DRAFT);
  const [editingAnnouncementId, setEditingAnnouncementId] =
    useState<string | null>(null);
  const [announcementQuery, setAnnouncementQuery] = useState("");

  useEffect(() => {
    const syncView = () => setView(adminViewFromHash());
    syncView();
    window.addEventListener("hashchange", syncView);
    return () => window.removeEventListener("hashchange", syncView);
  }, []);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    setMessage(null);
    try {
      const sessionResponse = await fetch("/api/security/session", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!sessionResponse.ok) {
        throw new Error(errorMessage(sessionResponse.status));
      }
      const session = (await sessionResponse.json()) as SessionPayload;
      const capabilities: AdminCapabilities = {
        announcementAdmin: session.navigation.announcementAdmin,
        announcementDeleteAdmin:
          session.navigation.announcementDeleteAdmin,
        managementAdmin: session.navigation.managementAdmin,
        usersAdmin: session.navigation.usersAdmin,
        organizationAdmin: session.navigation.organizationAdmin,
        rbacAdmin: session.navigation.rbacAdmin,
        passwordRecoveryAdmin: session.navigation.passwordRecoveryAdmin,
        adminSettings: session.navigation.adminSettings,
      };

      let settings: AdminSettingsView | null = null;
      let announcements: AnnouncementAdminListResult | null = null;
      if (capabilities.adminSettings) {
        const settingsResponse = await fetch("/api/admin/settings", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!settingsResponse.ok) {
          throw new Error(errorMessage(settingsResponse.status));
        }
        settings = (await settingsResponse.json()) as AdminSettingsView;
      }
      if (capabilities.announcementAdmin) {
        const announcementResponse = await fetch("/api/announcements/admin", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!announcementResponse.ok) {
          throw new Error(errorMessage(announcementResponse.status));
        }
        announcements =
          (await announcementResponse.json()) as AnnouncementAdminListResult;
      }

      setState({
        status: "ready",
        capabilities,
        settings,
        announcements,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลดหน้าตั้งค่าระบบได้",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetAnnouncementEditor() {
    setEditingAnnouncementId(null);
    setAnnouncementDraft(EMPTY_ANNOUNCEMENT_DRAFT);
  }

  function editAnnouncement(item: AnnouncementAdminItem) {
    setEditingAnnouncementId(item.id);
    setAnnouncementDraft({
      title: item.title ?? "",
      content: item.content,
      scope: item.scope,
      agencyId: item.agencyId ?? "",
      departmentId: item.departmentId ?? "",
      publishNow: item.publishedAt !== null,
    });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveAnnouncement(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (
      state.status !== "ready" ||
      !state.capabilities.announcementAdmin ||
      busy
    ) {
      return;
    }

    const title = announcementDraft.title.trim();
    const content = announcementDraft.content.trim();
    if (!content) {
      setMessage({
        kind: "error",
        text: "กรุณากรอกเนื้อหาประกาศ",
      });
      return;
    }
    if (
      announcementDraft.scope === "AGENCY" &&
      !announcementDraft.agencyId
    ) {
      setMessage({
        kind: "error",
        text: "กรุณาเลือกหน่วยงานสำหรับประกาศนี้",
      });
      return;
    }
    if (
      announcementDraft.scope === "DEPARTMENT" &&
      !announcementDraft.departmentId
    ) {
      setMessage({
        kind: "error",
        text: "กรุณาเลือกฝ่ายสำหรับประกาศนี้",
      });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const editing = editingAnnouncementId !== null;
      const response = await fetch(
        editing
          ? "/api/announcements/" +
              encodeURIComponent(editingAnnouncementId)
          : "/api/announcements",
        {
          method: editing ? "PATCH" : "POST",
          credentials: "same-origin",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            title: title || null,
            content,
            scope: announcementDraft.scope,
            agencyId:
              announcementDraft.scope === "AGENCY"
                ? announcementDraft.agencyId
                : null,
            departmentId:
              announcementDraft.scope === "DEPARTMENT"
                ? announcementDraft.departmentId
                : null,
            ...(editing ? {} : { attachmentIds: [] }),
            publishNow: announcementDraft.publishNow,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(errorMessage(response.status));
      }
      const result = editing
        ? ((await response.json()) as AnnouncementUpdateResult)
        : ((await response.json()) as AnnouncementCreateResult);
      const completedId = result.announcement.id;
      resetAnnouncementEditor();
      await load();
      setMessage({
        kind: "success",
        text: editing
          ? `แก้ไขประชาสัมพันธ์เรียบร้อย (${completedId})`
          : `บันทึกประชาสัมพันธ์เรียบร้อย (${completedId})`,
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
      !state.capabilities.announcementDeleteAdmin ||
      busy
    ) {
      return;
    }
    if (
      !window.confirm(
        `ยืนยันการลบประชาสัมพันธ์ “${item.title || item.content.slice(0, 40)}” ?`,
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
      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(
            "ประกาศที่มีเอกสารแนบไม่สามารถลบได้ กรุณาปิดการเผยแพร่แทน",
          );
        }
        throw new Error(errorMessage(response.status));
      }
      const result =
        (await response.json()) as AnnouncementDeleteResult;
      if (!result.deleted) {
        throw new Error("ระบบยังยืนยันการลบไม่สำเร็จ");
      }
      if (editingAnnouncementId === item.id) {
        resetAnnouncementEditor();
      }
      await load();
      setMessage({
        kind: "success",
        text: "ลบประชาสัมพันธ์เรียบร้อย",
      });
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
        className="module-state"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="spinner" aria-hidden="true" />
        <h1>กำลังโหลดการตั้งค่าระบบ</h1>
        <p>กำลังตรวจสอบสิทธิ์และสถานะระบบ</p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="module-state" role="alert">
        <div className="status-badge error">เกิดข้อผิดพลาด</div>
        <h1>เปิดหน้าตั้งค่าระบบไม่สำเร็จ</h1>
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

  if (view === "announcement-admin") {
    const adminData = state.announcements;
    const normalizedQuery = announcementQuery.trim().toLocaleLowerCase("th");
    const visibleAnnouncements =
      adminData?.announcements.filter((item) => {
        if (!normalizedQuery) return true;
        return [
          item.id,
          item.title,
          item.content,
          item.agencyName,
          item.departmentName,
          announcementScopeLabel(item),
        ].some((value) =>
          String(value ?? "")
            .toLocaleLowerCase("th")
            .includes(normalizedQuery),
        );
      }) ?? [];

    return (
      <div className="module-stack">
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

        <section
          id="announcement-admin"
          className="module-panel production-anchor-section production-announcement-editor fade-in"
        >
          <div className="production-management-panel-head">
            <div>
              <h1>
                {editingAnnouncementId
                  ? "แก้ไขประชาสัมพันธ์"
                  : "เพิ่มประชาสัมพันธ์"}
              </h1>
              <p className="panel-description">
                กำหนดเนื้อหา ขอบเขตผู้รับ และสถานะการเผยแพร่
              </p>
            </div>
            <div className="production-management-head-actions">
              {editingAnnouncementId ? (
                <button
                  className="secondary-button"
                  type="button"
                  disabled={busy}
                  onClick={resetAnnouncementEditor}
                >
                  ยกเลิกการแก้ไข
                </button>
              ) : null}
              <Link
                className="secondary-button"
                href="/desktop/announcements"
              >
                ดูข่าวที่เผยแพร่
              </Link>
            </div>
          </div>

          {state.capabilities.announcementAdmin && adminData ? (
            <form
              className="production-announcement-admin-form"
              onSubmit={(event) => void saveAnnouncement(event)}
            >
              <label>
                <span>หัวข้อ</span>
                <input
                  className="form-input"
                  maxLength={250}
                  disabled={busy}
                  placeholder="หัวข้อประกาศ"
                  value={announcementDraft.title}
                  onChange={(event) =>
                    setAnnouncementDraft((current) => ({
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
                  disabled={busy}
                  value={announcementDraft.scope}
                  onChange={(event) => {
                    const scope =
                      event.currentTarget.value as AnnouncementScope;
                    setAnnouncementDraft((current) => ({
                      ...current,
                      scope,
                      agencyId: scope === "AGENCY" ? current.agencyId : "",
                      departmentId:
                        scope === "DEPARTMENT"
                          ? current.departmentId
                          : "",
                    }));
                  }}
                >
                  <option value="GLOBAL">ทุกคนในองค์กร</option>
                  <option value="AGENCY">เฉพาะหน่วยงาน</option>
                  <option value="DEPARTMENT">เฉพาะฝ่าย</option>
                </select>
              </label>

              {announcementDraft.scope === "AGENCY" ? (
                <label>
                  <span>หน่วยงาน</span>
                  <select
                    className="form-input"
                    required
                    disabled={busy}
                    value={announcementDraft.agencyId}
                    onChange={(event) =>
                      setAnnouncementDraft((current) => ({
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

              {announcementDraft.scope === "DEPARTMENT" ? (
                <label>
                  <span>ฝ่าย</span>
                  <select
                    className="form-input"
                    required
                    disabled={busy}
                    value={announcementDraft.departmentId}
                    onChange={(event) =>
                      setAnnouncementDraft((current) => ({
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

              <label className="production-announcement-content-field">
                <span>รายละเอียด</span>
                <textarea
                  className="form-input"
                  rows={6}
                  maxLength={5000}
                  required
                  disabled={busy}
                  placeholder="รายละเอียดประกาศ"
                  value={announcementDraft.content}
                  onChange={(event) =>
                    setAnnouncementDraft((current) => ({
                      ...current,
                      content: event.currentTarget.value,
                    }))
                  }
                />
              </label>

              <div className="production-announcement-publish-row">
                <label className="production-remember">
                  <span className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={announcementDraft.publishNow}
                      disabled={busy}
                      onChange={(event) =>
                        setAnnouncementDraft((current) => ({
                          ...current,
                          publishNow: event.currentTarget.checked,
                        }))
                      }
                    />
                    <span className="toggle-slider" />
                  </span>
                  <span>เผยแพร่ให้พนักงานเห็น</span>
                </label>
                <span className="panel-note">
                  การแก้ไขประกาศเดิมจะคงวันเผยแพร่เดิมไว้
                </span>
              </div>

              <div className="form-actions production-announcement-actions">
                <button
                  className="success-button"
                  type="submit"
                  disabled={busy}
                >
                  {busy
                    ? "กำลังบันทึก..."
                    : editingAnnouncementId
                      ? "บันทึกการแก้ไข"
                      : "เพิ่มข้อมูล"}
                </button>
              </div>
            </form>
          ) : (
            <div className="empty-state">
              <h3>ไม่มีสิทธิ์จัดการประชาสัมพันธ์</h3>
              <p>กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์ใช้งาน</p>
            </div>
          )}
        </section>

        {adminData ? (
          <section className="module-panel production-management-panel fade-in">
            <div className="production-management-panel-head">
              <h1>ประชาสัมพันธ์</h1>
              <div className="production-search-box">
                <input
                  className="form-input"
                  type="search"
                  placeholder="ค้นหาข้อมูล..."
                  value={announcementQuery}
                  onChange={(event) =>
                    setAnnouncementQuery(event.currentTarget.value)
                  }
                />
                <i className="fa-solid fa-search" aria-hidden="true" />
              </div>
            </div>

            <div className="table-scroll">
              <table className="data-table production-management-table production-announcement-table">
                <thead>
                  <tr>
                    <th>รหัส</th>
                    <th>รายละเอียด</th>
                    <th>ขอบเขต</th>
                    <th>วันที่</th>
                    <th>แสดงประกาศ</th>
                    <th>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAnnouncements.map((item) => (
                    <tr key={item.id}>
                      <td title={item.id}>
                        {item.id.length > 12
                          ? item.id.slice(0, 8) + "…"
                          : item.id}
                      </td>
                      <td className="production-announcement-summary-cell">
                        <strong>{item.title || "ไม่มีหัวข้อ"}</strong>
                        <span>{item.content}</span>
                        {item.hasAttachment ? (
                          <small>
                            <i
                              className="fa-solid fa-paperclip"
                              aria-hidden="true"
                            />{" "}
                            {item.attachmentIds.length} เอกสารแนบ
                          </small>
                        ) : null}
                      </td>
                      <td>
                        <span className="status-badge status-info">
                          {announcementScopeLabel(item)}
                        </span>
                      </td>
                      <td>{formatAnnouncementDate(item.publishedAt)}</td>
                      <td>
                        <span
                          className={
                            item.publishedAt
                              ? "status-badge status-approved"
                              : "status-badge status-pending"
                          }
                        >
                          {item.publishedAt ? "แสดง" : "ไม่แสดง"}
                        </span>
                      </td>
                      <td>
                        <div className="production-table-actions">
                          <button
                            className="production-action-button production-action-edit"
                            type="button"
                            title="แก้ไข"
                            disabled={busy}
                            onClick={() => editAnnouncement(item)}
                          >
                            <i
                              className="fa-solid fa-pen-to-square"
                              aria-hidden="true"
                            />
                          </button>
                          {state.capabilities.announcementDeleteAdmin ? (
                            <button
                              className="production-action-button production-action-delete"
                              type="button"
                              title={
                                item.hasAttachment
                                  ? "มีเอกสารแนบ: ปิดการเผยแพร่แทนการลบ"
                                  : "ลบ"
                              }
                              disabled={busy || item.hasAttachment}
                              onClick={() => void deleteAnnouncement(item)}
                            >
                              <i
                                className="fa-solid fa-trash-can"
                                aria-hidden="true"
                              />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visibleAnnouncements.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="production-empty-row"
                      >
                        ไม่พบข้อมูล! 😓
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="production-table-footer">
              แสดง {visibleAnnouncements.length} จาก{" "}
              {adminData.announcements.length} แถว
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  const canManage =
    state.capabilities.usersAdmin ||
    state.capabilities.organizationAdmin ||
    state.capabilities.rbacAdmin ||
    state.capabilities.passwordRecoveryAdmin;

  return (
    <div className="production-settings-grid task398-settings-page fade-in">
      <section className="module-panel production-settings-form-card">
        <h1>
          <span aria-hidden="true">⚙️</span> ตั้งค่าระบบ CKACE Platform
        </h1>

        {state.settings ? (
          <div className="production-settings-readonly-form">
            <label>
              <span>Environment</span>
              <input
                className="form-input"
                readOnly
                value={state.settings.runtimeStage}
              />
            </label>
            <label>
              <span>Module Routing</span>
              <input
                className="form-input"
                readOnly
                value={state.settings.moduleRouting}
              />
            </label>
            <label>
              <span>Storage</span>
              <input
                className="form-input"
                readOnly
                value={state.settings.storageProvider}
              />
            </label>
            <label>
              <span>Public Storage URL</span>
              <input
                className="form-input"
                readOnly
                value={
                  state.settings.permanentPublicStorageUrls
                    ? "Enabled"
                    : "Disabled"
                }
              />
            </label>
            <label>
              <span>Active Account Gate</span>
              <input
                className="form-input"
                readOnly
                value={
                  state.settings.protectedActorRequiresActiveAccount
                    ? "Enabled"
                    : "Disabled"
                }
              />
            </label>
            <label>
              <span>Pending LINE Binding</span>
              <input
                className="form-input"
                readOnly
                value={
                  state.settings.pendingLineBindingSupported
                    ? "Supported"
                    : "Not supported"
                }
              />
            </label>
            <p className="production-settings-readonly-note">
              หน้านี้แสดงค่าระบบปัจจุบันแบบอ่านอย่างเดียว
              การเปลี่ยนค่าระบบสำคัญต้องทำผ่านขั้นตอนที่ได้รับอนุมัติ
            </p>
          </div>
        ) : (
          <div className="empty-state">
            <h3>ไม่มีสิทธิ์อ่านการตั้งค่าระบบ</h3>
            <p>ข้อมูลการตั้งค่าจะไม่แสดงสำหรับบัญชีนี้</p>
          </div>
        )}
      </section>

      <div className="production-settings-side">
        <section className="module-panel production-settings-status-card">
          <h2>การใช้งาน</h2>
          {state.settings ? (
            <>
              <div className="production-setting-status-list">
                <SettingStatus
                  label="Environment"
                  value={state.settings.runtimeStage}
                />
                <SettingStatus
                  label="Module Routing"
                  value={state.settings.moduleRouting}
                />
                <SettingStatus
                  label="Storage"
                  value={state.settings.storageProvider}
                />
                <SettingStatus
                  label="Active-account gate"
                  value={
                    state.settings.protectedActorRequiresActiveAccount
                      ? "พร้อมใช้งาน"
                      : "ปิดใช้งาน"
                  }
                />
              </div>

              <div className="production-overall-status ready">
                <i
                  className="fa-solid fa-circle-check"
                  aria-hidden="true"
                />
                <div>
                  <strong>ระบบพร้อมใช้งาน</strong>
                  <span>สถานะการตั้งค่าที่อ่านได้ครบถ้วน</span>
                </div>
              </div>
            </>
          ) : (
            <div className="production-overall-status neutral">
              <i
                className="fa-solid fa-triangle-exclamation"
                aria-hidden="true"
              />
              <div>
                <strong>ไม่สามารถแสดงสถานะการตั้งค่า</strong>
                <span>บัญชีนี้ไม่มีสิทธิ์อ่านข้อมูลส่วนนี้</span>
              </div>
            </div>
          )}
        </section>

        <section className="module-panel production-settings-management-card task396-platform-core">
          <h2>Shared Platform Core</h2>
          <p>
            ข้อมูลพนักงาน โครงสร้างองค์กร และสิทธิ์การเข้าถึงเป็นแกนกลาง
            ที่ระบบลาใช้งานในวันนี้ และเตรียมไว้ให้ระบบอื่นของ CKACE
            เชื่อมต่อในอนาคตโดยไม่สร้างข้อมูลบุคคลซ้ำ
          </p>
          {canManage ? (
            <div className="task396-platform-core-links">
              {state.capabilities.usersAdmin ? (
                <Link
                  className="secondary-button"
                  href="/desktop/admin/management#users"
                >
                  ฐานข้อมูลพนักงาน
                </Link>
              ) : null}
              {state.capabilities.organizationAdmin ? (
                <Link
                  className="secondary-button"
                  href="/desktop/admin/management#organization"
                >
                  โครงสร้างและสังกัด
                </Link>
              ) : null}
              {state.capabilities.rbacAdmin ? (
                <Link
                  className="primary-button"
                  href="/desktop/admin/management#roles"
                >
                  สิทธิ์และการเข้าถึง
                </Link>
              ) : null}
            </div>
          ) : (
            <span className="panel-note">ไม่มีสิทธิ์จัดการ Shared Platform Core</span>
          )}
        </section>
      </div>
    </div>
  );
}
