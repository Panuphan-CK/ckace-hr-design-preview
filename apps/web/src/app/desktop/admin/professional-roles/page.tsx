"use client";

import type { ManagedEmployeeItem, ProfessionalRoleItem } from "@ckace/contracts";
import { useCallback, useEffect, useState } from "react";

import { DataGrid, DetailDialog, EmptyState, ErrorState, LoadingState, Message, PageHead, SectionHead, SettingRow, StatusDot, Toggle } from "../../ui/kit";
import "../ck-v2-settings.css";

type State =
  | { status: "loading" }
  | { status: "ready"; roles: readonly ProfessionalRoleItem[]; users: readonly ManagedEmployeeItem[] }
  | { status: "error"; message: string };

async function request<T>(path: string, method: "GET" | "POST" | "PATCH" | "PUT", body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    ...(body === undefined
      ? {}
      : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ"
        : response.status === 409
          ? "มีรหัสบทบาทนี้อยู่แล้วหรือข้อมูลเปลี่ยนไป"
          : "ดำเนินการไม่สำเร็จ",
    );
  }
  return (await response.json()) as T;
}

export default function ProfessionalRolesPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [editRole, setEditRole] = useState<ProfessionalRoleItem | "new" | null>(null);
  const [roleDraft, setRoleDraft] = useState({ key: "", name: "", attendanceExempt: false, active: true });
  const [editUser, setEditUser] = useState<ManagedEmployeeItem | null>(null);
  const [userRoleIds, setUserRoleIds] = useState<readonly string[]>([]);

  const load = useCallback(async () => {
    try {
      const [roles, users] = await Promise.all([
        request<readonly ProfessionalRoleItem[]>("/api/management/professional-roles", "GET"),
        request<readonly ManagedEmployeeItem[]>("/api/management/users", "GET"),
      ]);
      setState({ status: "ready", roles, users });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>, success: string): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ kind: "success", text: success });
      await load();
      return true;
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "ดำเนินการไม่สำเร็จ" });
      return false;
    } finally {
      setBusy(false);
    }
  }

  function openRole(role: ProfessionalRoleItem | "new") {
    setMessage(null);
    setRoleDraft(
      role === "new"
        ? { key: "", name: "", attendanceExempt: false, active: true }
        : { key: role.key, name: role.name, attendanceExempt: role.attendanceExempt, active: role.active },
    );
    setEditRole(role);
  }

  async function saveRole() {
    if (!editRole) return;
    const name = roleDraft.name.trim();
    if (!name || (editRole === "new" && !roleDraft.key.trim())) {
      setMessage({ kind: "error", text: "กรอกชื่อบทบาทให้ครบ" });
      return;
    }
    const target = editRole;
    const ok = await run(async () => {
      if (target === "new") {
        await request("/api/management/professional-roles", "POST", {
          key: roleDraft.key.trim(),
          name,
          attendanceExempt: roleDraft.attendanceExempt,
        });
        return;
      }
      const path = "/api/management/professional-roles/" + target.id;
      if (name !== target.name) await request(path, "PATCH", { name });
      if (roleDraft.attendanceExempt !== target.attendanceExempt) await request(path, "PATCH", { attendanceExempt: roleDraft.attendanceExempt });
      if (roleDraft.active !== target.active) await request(path, "PATCH", { active: roleDraft.active });
    }, target === "new" ? "เพิ่มบทบาทวิชาชีพแล้ว" : "บันทึกบทบาทวิชาชีพแล้ว");
    if (ok) setEditRole(null);
  }

  function openUser(user: ManagedEmployeeItem) {
    setMessage(null);
    setUserRoleIds(user.professionalRoles.map((role) => role.id));
    setEditUser(user);
  }

  async function saveUser() {
    if (!editUser) return;
    const target = editUser;
    const ok = await run(
      () => request("/api/management/users/" + encodeURIComponent(target.id) + "/professional-roles", "PUT", { professionalRoleIds: userRoleIds }),
      "บันทึกบทบาทวิชาชีพของ " + target.fullName + " แล้ว",
    );
    if (ok) setEditUser(null);
  }

  if (state.status === "loading") return <LoadingState title="กำลังโหลด…" />;
  if (state.status === "error") return <ErrorState title="เปิดหน้าไม่สำเร็จ" message={state.message} onRetry={() => void load()} />;

  const { roles, users } = state;
  const activeRoles = roles.filter((role) => role.active);
  const visibleUsers = users.filter(
    (user) => user.state === "ACTIVE" && (!search.trim() || user.fullName.toLocaleLowerCase("th").includes(search.trim().toLocaleLowerCase("th"))),
  );

  return (
    <>
      <PageHead tone="biz" icon="users" title="บทบาทวิชาชีพ" subtitle="กำหนดบทบาท และเลือกบทบาทที่ไม่ต้องลงเวลา (ไม่นับในสถิติการเข้างาน)">
        <button type="button" className="ck-btn sky" onClick={() => openRole("new")}>
          + เพิ่มบทบาท
        </button>
      </PageHead>
      <div className="ck-wrap ck-stack">
        <Message value={editRole || editUser ? null : message} />

        <section className="ck-c-biz">
          <SectionHead title="รายการบทบาท" count={roles.length} />
          <DataGrid
            rows={roles}
            rowKey={(role) => role.id}
            onRowClick={openRole}
            empty={<EmptyState title="ยังไม่มีบทบาท" icon="users" />}
            columns={[
              { key: "name", header: "ชื่อบทบาท", render: (role) => <b>{role.name}</b> },
              {
                key: "exempt",
                header: "ลงเวลา",
                align: "center",
                width: "120px",
                render: (role) => (
                  <StatusDot tone={role.attendanceExempt ? "muted" : "ok"} label={role.attendanceExempt ? "ไม่ต้องลงเวลา" : "ต้องลงเวลา"} />
                ),
              },
              {
                key: "active",
                header: "สถานะ",
                align: "center",
                width: "100px",
                render: (role) => <StatusDot tone={role.active ? "ok" : "bad"} label={role.active ? "ใช้งาน" : "ปิดใช้งาน"} />,
              },
            ]}
          />
        </section>

        <section className="ck-c-biz">
          <SectionHead title="กำหนดบทบาทให้พนักงาน" count={visibleUsers.length}>
            <div className="ck-gridtools">
              <input
                className="ck-in"
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="ค้นหาชื่อพนักงาน"
                aria-label="ค้นหาพนักงาน"
              />
            </div>
          </SectionHead>
          <DataGrid
            rows={visibleUsers}
            rowKey={(user) => user.id}
            onRowClick={openUser}
            empty={<EmptyState title="ไม่พบพนักงาน" icon="user" />}
            columns={[
              { key: "name", header: "พนักงาน", render: (user) => <b>{user.fullName}</b> },
              {
                key: "roles",
                header: "บทบาท",
                render: (user) => (user.professionalRoles.length ? user.professionalRoles.map((role) => role.name).join(", ") : <span className="ck-subtle">-</span>),
              },
              {
                key: "att",
                header: "ลงเวลา",
                align: "center",
                width: "100px",
                render: (user) => (
                  <StatusDot tone={user.attendanceExemptEffective ? "muted" : "ok"} label={user.attendanceExemptEffective ? "ไม่ต้องลงเวลา" : "ต้องลงเวลา"} />
                ),
              },
            ]}
          />
        </section>
      </div>

      {editRole ? (
        <DetailDialog
          tone="biz"
          icon="users"
          kicker="บทบาทวิชาชีพ"
          title={editRole === "new" ? "เพิ่มบทบาท" : editRole.name}
          onClose={() => setEditRole(null)}
          footer={
            <button type="submit" form="role-form" className="ck-btn sky" disabled={busy}>
              {busy ? "กำลังบันทึก…" : "บันทึก"}
            </button>
          }
        >
          <Message value={message} />
          <form
            id="role-form"
            className="ck-sform"
            onSubmit={(event) => {
              event.preventDefault();
              void saveRole();
            }}
          >
            {editRole === "new" ? (
              <label className="ck-field">
                <span>รหัส (ภาษาอังกฤษ เช่น TAX_AGENT)</span>
                <input className="ck-in" required maxLength={40} disabled={busy} value={roleDraft.key} onChange={(e) => setRoleDraft({ ...roleDraft, key: e.currentTarget.value })} />
              </label>
            ) : null}
            <label className="ck-field">
              <span>ชื่อบทบาท</span>
              <input className="ck-in" required maxLength={100} disabled={busy} value={roleDraft.name} onChange={(e) => setRoleDraft({ ...roleDraft, name: e.currentTarget.value })} />
            </label>
            <SettingRow label="ไม่ต้องลงเวลา">
              <Toggle label="ไม่ต้องลงเวลา" checked={roleDraft.attendanceExempt} disabled={busy} onChange={(attendanceExempt) => setRoleDraft({ ...roleDraft, attendanceExempt })} />
            </SettingRow>
            {editRole !== "new" ? (
              <SettingRow label="ใช้งาน">
                <Toggle label="ใช้งาน" checked={roleDraft.active} disabled={busy} onChange={(active) => setRoleDraft({ ...roleDraft, active })} />
              </SettingRow>
            ) : null}
          </form>
        </DetailDialog>
      ) : null}

      {editUser ? (
        <DetailDialog
          tone="biz"
          icon="user"
          kicker="บทบาทวิชาชีพของพนักงาน"
          title={editUser.fullName}
          onClose={() => setEditUser(null)}
          footer={
            <button type="button" className="ck-btn sky" disabled={busy} onClick={() => void saveUser()}>
              {busy ? "กำลังบันทึก…" : "บันทึก"}
            </button>
          }
        >
          <Message value={message} />
          {activeRoles.length === 0 ? (
            <EmptyState title="ยังไม่มีบทบาทที่ใช้งาน" icon="users" />
          ) : (
            <div>
              {activeRoles.map((role) => (
                <SettingRow key={role.id} label={role.name}>
                  <Toggle
                    label={editUser.fullName + " " + role.name}
                    checked={userRoleIds.includes(role.id)}
                    disabled={busy}
                    onChange={(on) => setUserRoleIds((current) => (on ? [...new Set([...current, role.id])] : current.filter((id) => id !== role.id)))}
                  />
                </SettingRow>
              ))}
            </div>
          )}
        </DetailDialog>
      ) : null}
    </>
  );
}
