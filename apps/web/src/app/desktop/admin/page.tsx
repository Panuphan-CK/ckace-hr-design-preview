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

import {
  DataGrid,
  DetailDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  Message as Notice,
  PageHead,
  SectionHead,
  SettingRow,
  StatusDot,
  Toggle,
} from "../ui/kit";
import { thaiDateTime } from "../ui/format";
import "./ck-v2-settings.css";

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
  return value ? thaiDateTime(value) : "ยังไม่เผยแพร่";
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
  const [announcementDialog, setAnnouncementDialog] = useState(false);

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
    setAnnouncementDialog(false);
  }

  function newAnnouncement() {
    setEditingAnnouncementId(null);
    setAnnouncementDraft(EMPTY_ANNOUNCEMENT_DRAFT);
    setMessage(null);
    setAnnouncementDialog(true);
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
    setAnnouncementDialog(true);
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
      void result;
      resetAnnouncementEditor();
      await load();
      setMessage({
        kind: "success",
        text: editing
          ? "แก้ไขประชาสัมพันธ์เรียบร้อย"
          : "บันทึกประชาสัมพันธ์เรียบร้อย",
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
      resetAnnouncementEditor();
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
    return <LoadingState title="กำลังโหลดการตั้งค่าระบบ" />;
  }

  if (state.status === "error") {
    return (
      <ErrorState
        title="เปิดหน้าตั้งค่าระบบไม่สำเร็จ"
        message={state.message}
        onRetry={() => void load()}
      />
    );
  }

  if (view === "announcement-admin") {
    const adminData = state.announcements;
    const normalizedQuery = announcementQuery.trim().toLocaleLowerCase("th");
    const visibleAnnouncements =
      adminData?.announcements.filter((item) => {
        if (!normalizedQuery) return true;
        return [
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
    const editingItem = editingAnnouncementId
      ? adminData?.announcements.find((item) => item.id === editingAnnouncementId)
      : undefined;

    return (
      <>
        <PageHead
          tone="leave"
          icon="megaphone"
          title="ประชาสัมพันธ์"
          subtitle="เพิ่มและแก้ไขข่าวสำหรับพนักงาน"
        >
          <Link className="ck-btn quiet" href="/desktop/announcements">
            ดูข่าวที่เผยแพร่
          </Link>
          {state.capabilities.announcementAdmin && adminData ? (
            <button
              className="ck-btn sky"
              type="button"
              disabled={busy}
              onClick={newAnnouncement}
            >
              + เพิ่มประชาสัมพันธ์
            </button>
          ) : null}
        </PageHead>

        <div className="ck-wrap ck-stack" id="announcement-admin">
          <Notice value={announcementDialog ? null : message} />

          {adminData ? (
            <section className="ck-c-leave">
              <SectionHead title="ข่าวทั้งหมด" count={adminData.announcements.length}>
                <div className="ck-gridtools">
                  <input
                    className="ck-in"
                    type="search"
                    placeholder="ค้นหา"
                    aria-label="ค้นหาประชาสัมพันธ์"
                    value={announcementQuery}
                    onChange={(event) =>
                      setAnnouncementQuery(event.currentTarget.value)
                    }
                  />
                </div>
              </SectionHead>
              <DataGrid
                rows={visibleAnnouncements}
                rowKey={(item) => item.id}
                onRowClick={editAnnouncement}
                empty={<EmptyState title="ยังไม่มีประชาสัมพันธ์" icon="megaphone" />}
                columns={[
                  {
                    key: "title",
                    header: "หัวข้อ",
                    render: (item) => <b>{item.title || "ไม่มีหัวข้อ"}</b>,
                  },
                  {
                    key: "scope",
                    header: "ขอบเขต",
                    render: (item) => announcementScopeLabel(item),
                  },
                  {
                    key: "date",
                    header: "วันที่เผยแพร่",
                    render: (item) => formatAnnouncementDate(item.publishedAt),
                  },
                  {
                    key: "status",
                    header: "แสดง",
                    align: "center",
                    width: "80px",
                    render: (item) => (
                      <StatusDot
                        tone={item.publishedAt ? "ok" : "muted"}
                        label={item.publishedAt ? "แสดงให้พนักงานเห็น" : "ยังไม่เผยแพร่"}
                      />
                    ),
                  },
                ]}
              />
            </section>
          ) : (
            <EmptyState title="ไม่มีสิทธิ์จัดการประชาสัมพันธ์" icon="lock">
              กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์ใช้งาน
            </EmptyState>
          )}
        </div>

        {announcementDialog && adminData ? (
          <DetailDialog
            tone="leave"
            icon="megaphone"
            kicker="ประชาสัมพันธ์"
            title={editingAnnouncementId ? "แก้ไขประชาสัมพันธ์" : "เพิ่มประชาสัมพันธ์"}
            onClose={resetAnnouncementEditor}
            footer={
              <>
                <button
                  className="ck-btn sky"
                  type="submit"
                  form="announcement-form"
                  disabled={busy}
                >
                  {busy ? "กำลังบันทึก…" : "บันทึก"}
                </button>
                {editingItem && state.capabilities.announcementDeleteAdmin ? (
                  <button
                    className="ck-btn no"
                    type="button"
                    title={
                      editingItem.hasAttachment
                        ? "มีเอกสารแนบ: ปิดการเผยแพร่แทนการลบ"
                        : "ลบ"
                    }
                    disabled={busy || editingItem.hasAttachment}
                    onClick={() => void deleteAnnouncement(editingItem)}
                  >
                    ลบ
                  </button>
                ) : null}
              </>
            }
          >
            <Notice value={message} />
            <form
              id="announcement-form"
              className="ck-sform"
              onSubmit={(event) => void saveAnnouncement(event)}
            >
              <label className="ck-field">
                <span>หัวข้อ</span>
                <input
                  className="ck-in"
                  maxLength={250}
                  disabled={busy}
                  value={announcementDraft.title}
                  onChange={(event) =>
                    setAnnouncementDraft((current) => ({
                      ...current,
                      title: event.currentTarget.value,
                    }))
                  }
                />
              </label>

              <label className="ck-field">
                <span>แสดงให้</span>
                <select
                  className="ck-sselect"
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
                        scope === "DEPARTMENT" ? current.departmentId : "",
                    }));
                  }}
                >
                  <option value="GLOBAL">ทุกคนในองค์กร</option>
                  <option value="AGENCY">เฉพาะหน่วยงาน</option>
                  <option value="DEPARTMENT">เฉพาะฝ่าย</option>
                </select>
              </label>

              {announcementDraft.scope === "AGENCY" ? (
                <label className="ck-field">
                  <span>หน่วยงาน</span>
                  <select
                    className="ck-sselect"
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
                <label className="ck-field">
                  <span>ฝ่าย</span>
                  <select
                    className="ck-sselect"
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

              <label className="ck-field">
                <span>รายละเอียด</span>
                <textarea
                  className="ck-in"
                  rows={6}
                  maxLength={5000}
                  required
                  disabled={busy}
                  value={announcementDraft.content}
                  onChange={(event) =>
                    setAnnouncementDraft((current) => ({
                      ...current,
                      content: event.currentTarget.value,
                    }))
                  }
                />
              </label>

              <SettingRow
                label="เผยแพร่ให้พนักงานเห็น"
                hint="แก้ไขประกาศเดิมจะคงวันเผยแพร่เดิมไว้"
              >
                <Toggle
                  label="เผยแพร่ให้พนักงานเห็น"
                  checked={announcementDraft.publishNow}
                  disabled={busy}
                  onChange={(publishNow) =>
                    setAnnouncementDraft((current) => ({
                      ...current,
                      publishNow,
                    }))
                  }
                />
              </SettingRow>
            </form>
          </DetailDialog>
        ) : null}
      </>
    );
  }

  const canManage =
    state.capabilities.usersAdmin ||
    state.capabilities.organizationAdmin ||
    state.capabilities.rbacAdmin ||
    state.capabilities.passwordRecoveryAdmin;
  const settings = state.settings;

  return (
    <>
      <PageHead
        tone="gray"
        icon="gear"
        title="ตั้งค่าระบบ"
        subtitle="ค่าระบบปัจจุบัน (อ่านอย่างเดียว) และทางลัดไปจัดการข้อมูลหลัก"
      />
      <div className="ck-wrap ck-stack">
        <Notice value={message} />
        <div className="ck-sstack ck-c-gray">
          {settings ? (
            <section className="ck-sgroup">
              <h2>สถานะระบบ</h2>
              <p className="ck-sgroup-note">
                การเปลี่ยนค่าระบบสำคัญต้องทำผ่านขั้นตอนที่ได้รับอนุมัติ
              </p>
              <SettingRow label="สภาพแวดล้อม">
                <span className="ck-ro">{settings.runtimeStage}</span>
              </SettingRow>
              <SettingRow label="การเชื่อมโมดูล">
                <span className="ck-ro">{settings.moduleRouting}</span>
              </SettingRow>
              <SettingRow label="ที่เก็บไฟล์">
                <span className="ck-ro">{settings.storageProvider}</span>
              </SettingRow>
              <SettingRow label="ลิงก์ไฟล์สาธารณะถาวร">
                <StatusDot
                  tone={settings.permanentPublicStorageUrls ? "wait" : "ok"}
                  label={settings.permanentPublicStorageUrls ? "เปิดอยู่" : "ปิดอยู่ (ปลอดภัย)"}
                />
              </SettingRow>
              <SettingRow label="ตรวจบัญชีที่ใช้งานอยู่">
                <StatusDot
                  tone={settings.protectedActorRequiresActiveAccount ? "ok" : "bad"}
                  label={settings.protectedActorRequiresActiveAccount ? "พร้อมใช้งาน" : "ปิดใช้งาน"}
                />
              </SettingRow>
              <SettingRow label="รอผูกบัญชี LINE">
                <StatusDot
                  tone={settings.pendingLineBindingSupported ? "ok" : "muted"}
                  label={settings.pendingLineBindingSupported ? "รองรับ" : "ไม่รองรับ"}
                />
              </SettingRow>
            </section>
          ) : (
            <EmptyState title="ไม่มีสิทธิ์อ่านการตั้งค่าระบบ" icon="lock">
              ข้อมูลการตั้งค่าจะไม่แสดงสำหรับบัญชีนี้
            </EmptyState>
          )}

          <section className="ck-sgroup">
            <h2>ข้อมูลหลักขององค์กร</h2>
            <p className="ck-sgroup-note">
              พนักงาน โครงสร้างองค์กร และสิทธิ์ ใช้ร่วมกันทุกระบบ
            </p>
            {canManage ? (
              <div className="ck-row" style={{ padding: "10px 0 14px" }}>
                {state.capabilities.usersAdmin ? (
                  <Link className="ck-btn quiet" href="/desktop/admin/management#users">
                    ฐานข้อมูลพนักงาน
                  </Link>
                ) : null}
                {state.capabilities.organizationAdmin ? (
                  <Link className="ck-btn quiet" href="/desktop/admin/management#organization">
                    โครงสร้างและสังกัด
                  </Link>
                ) : null}
                {state.capabilities.rbacAdmin ? (
                  <Link className="ck-btn sky" href="/desktop/admin/management#roles">
                    สิทธิ์และการเข้าถึง
                  </Link>
                ) : null}
              </div>
            ) : (
              <p className="ck-sgroup-note">ไม่มีสิทธิ์จัดการข้อมูลหลัก</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
