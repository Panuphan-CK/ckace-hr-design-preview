"use client";

import type { ManagedEmployeeItem, ProfessionalRoleItem } from "@ckace/contracts";
import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";

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

  async function run(action: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ kind: "success", text: success });
      await load();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "ดำเนินการไม่สำเร็จ" });
    } finally {
      setBusy(false);
    }
  }

  function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void run(async () => {
      await request("/api/management/professional-roles", "POST", {
        key: String(data.get("key") ?? ""),
        name: String(data.get("name") ?? ""),
        attendanceExempt: data.get("attendanceExempt") === "on",
      });
      form.reset();
    }, "เพิ่มบทบาทวิชาชีพแล้ว");
  }

  function toggleAssignment(user: ManagedEmployeeItem, roleId: string, on: boolean) {
    const current = user.professionalRoles.map((role) => role.id);
    const next = on ? [...new Set([...current, roleId])] : current.filter((id) => id !== roleId);
    void run(
      () => request("/api/management/users/" + encodeURIComponent(user.id) + "/professional-roles", "PUT", { professionalRoleIds: next }),
      "บันทึกบทบาทวิชาชีพของ " + user.fullName + " แล้ว",
    );
  }

  if (state.status === "loading") return <p role="status">กำลังโหลด…</p>;
  if (state.status === "error") return <p role="alert">{state.message}</p>;

  const { roles, users } = state;
  const activeRoles = roles.filter((role) => role.active);
  const visibleUsers = users.filter(
    (user) => user.state === "ACTIVE" && (!search.trim() || user.fullName.toLocaleLowerCase("th").includes(search.trim().toLocaleLowerCase("th"))),
  );

  return (
    <div className="module-panel fade-in ck-admin">
      <h1>บทบาทวิชาชีพ</h1>
      <p>
        กำหนดบทบาท เช่น ผู้ทำบัญชี ผู้รับผิดชอบงาน ผู้สอบบัญชี และเลือกได้ว่าบทบาทใดไม่ต้องลงเวลา
        พนักงานที่ไม่ต้องลงเวลาจะไม่ถูกนับในสถิติการเข้างาน
      </p>
      {message ? (
        <p role={message.kind === "error" ? "alert" : "status"} className={"ck-msg " + message.kind}>
          {message.text}
        </p>
      ) : null}

      <h2>รายการบทบาท</h2>
      <table className="production-table">
        <thead>
          <tr>
            <th>รหัส</th>
            <th>ชื่อบทบาท</th>
            <th>ไม่ต้องลงเวลา</th>
            <th>ใช้งาน</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.id}>
              <td>{role.key}</td>
              <td>
                <input
                  defaultValue={role.name}
                  disabled={busy}
                  aria-label={"ชื่อบทบาท " + role.key}
                  maxLength={100}
                  onBlur={(event) => {
                    const name = event.currentTarget.value.trim();
                    if (name && name !== role.name) {
                      void run(() => request("/api/management/professional-roles/" + role.id, "PATCH", { name }), "บันทึกชื่อบทบาทแล้ว");
                    }
                  }}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={role.attendanceExempt}
                  disabled={busy}
                  aria-label={"ไม่ต้องลงเวลา " + role.name}
                  onChange={(event) =>
                    void run(
                      () => request("/api/management/professional-roles/" + role.id, "PATCH", { attendanceExempt: event.currentTarget.checked }),
                      "บันทึกการตั้งค่าลงเวลาแล้ว",
                    )
                  }
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={role.active}
                  disabled={busy}
                  aria-label={"ใช้งาน " + role.name}
                  onChange={(event) =>
                    void run(
                      () => request("/api/management/professional-roles/" + role.id, "PATCH", { active: event.currentTarget.checked }),
                      "บันทึกสถานะบทบาทแล้ว",
                    )
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={createRole} style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
        <input name="key" placeholder="รหัส เช่น TAX_AGENT" required maxLength={40} disabled={busy} />
        <input name="name" placeholder="ชื่อบทบาท" required maxLength={100} disabled={busy} />
        <label>
          <input type="checkbox" name="attendanceExempt" disabled={busy} /> ไม่ต้องลงเวลา
        </label>
        <button type="submit" className="primary-button" disabled={busy}>
          เพิ่มบทบาท
        </button>
      </form>

      <h2>กำหนดบทบาทให้พนักงาน</h2>
      <input
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        placeholder="ค้นหาชื่อพนักงาน"
        aria-label="ค้นหาพนักงาน"
      />
      <table className="production-table">
        <thead>
          <tr>
            <th>พนักงาน</th>
            {activeRoles.map((role) => (
              <th key={role.id}>{role.name}</th>
            ))}
            <th>สถานะการลงเวลา</th>
          </tr>
        </thead>
        <tbody>
          {visibleUsers.map((user) => (
            <tr key={user.id}>
              <td>{user.fullName}</td>
              {activeRoles.map((role) => (
                <td key={role.id}>
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={user.professionalRoles.some((item) => item.id === role.id)}
                    aria-label={user.fullName + " " + role.name}
                    onChange={(event) => toggleAssignment(user, role.id, event.currentTarget.checked)}
                  />
                </td>
              ))}
              <td>{user.attendanceExemptEffective ? "ไม่ต้องลงเวลา" : "ต้องลงเวลา"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
