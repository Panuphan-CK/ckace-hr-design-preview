"use client";

import type {
  ApprovalPolicyItem,
  ApprovalPolicyKind,
  ApprovalPolicyScope,
  OrganizationUnitItem,
  RbacAdminView,
} from "@ckace/contracts";
import { useCallback, useEffect, useState } from "react";

const KIND_LABEL: Readonly<Record<ApprovalPolicyKind, string>> = {
  LEAVE: "การลา",
  OVERTIME: "ทำงานล่วงเวลา",
  MEDICAL: "เบิกค่ารักษา",
  TIME_CORRECTION: "แก้ไขเวลา",
};
const SCOPE_LABEL: Readonly<Record<ApprovalPolicyScope, string>> = {
  SAME_AGENCY: "ทีมเดียวกับผู้ขอ",
  SAME_DEPARTMENT: "แผนกเดียวกับผู้ขอ",
  GLOBAL: "ทุกทีม",
};
const KINDS = Object.keys(KIND_LABEL) as ApprovalPolicyKind[];
const SCOPES = Object.keys(SCOPE_LABEL) as ApprovalPolicyScope[];

interface Draft {
  requestKind: ApprovalPolicyKind;
  agencyId: string;
  name: string;
  active: boolean;
  steps: { roleKey: string; scope: ApprovalPolicyScope }[];
}

type State =
  | { status: "loading" }
  | {
      status: "ready";
      policies: readonly ApprovalPolicyItem[];
      agencies: readonly OrganizationUnitItem[];
      roles: RbacAdminView["roles"];
    }
  | { status: "error"; message: string };

async function call<T>(path: string, method: "GET" | "PUT", body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    ...(body === undefined
      ? {}
      : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    throw new Error(response.status === 403 ? "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ" : "ดำเนินการไม่สำเร็จ");
  }
  return (await response.json()) as T;
}

export default function ApprovalPoliciesPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [policies, agencies, rbac] = await Promise.all([
        call<readonly ApprovalPolicyItem[]>("/api/management/approval-policies", "GET"),
        call<readonly OrganizationUnitItem[]>("/api/management/agencies", "GET"),
        call<RbacAdminView>("/api/management/rbac", "GET"),
      ]);
      setState({ status: "ready", policies, agencies, roles: rbac.roles });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.status === "loading") return <p role="status">กำลังโหลด…</p>;
  if (state.status === "error") return <p role="alert">{state.message}</p>;

  const { policies, agencies, roles } = state;
  const firstRole = roles.find((role) => role.key === "ADMIN")?.key ?? roles[0]?.key ?? "";

  function startNew(kind: ApprovalPolicyKind) {
    setMessage(null);
    setDraft({
      requestKind: kind,
      agencyId: "",
      name: "สายอนุมัติ" + KIND_LABEL[kind],
      active: true,
      steps: [{ roleKey: firstRole, scope: "SAME_AGENCY" }],
    });
  }

  function edit(policy: ApprovalPolicyItem) {
    setMessage(null);
    setDraft({
      requestKind: policy.requestKind,
      agencyId: policy.agencyId ?? "",
      name: policy.name,
      active: policy.active,
      steps: policy.steps.map((step) => ({ roleKey: step.roleKey, scope: step.scope })),
    });
  }

  async function save() {
    if (!draft || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await call("/api/management/approval-policies", "PUT", {
        requestKind: draft.requestKind,
        agencyId: draft.agencyId || null,
        name: draft.name,
        active: draft.active,
        steps: draft.steps,
      });
      setMessage({ kind: "success", text: "บันทึกสายอนุมัติแล้ว" });
      setDraft(null);
      await load();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "บันทึกไม่สำเร็จ" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="module-panel fade-in">
      <h1>สายอนุมัติ</h1>
      <p>
        กำหนดลำดับผู้อนุมัติของแต่ละประเภทคำขอ เลือกได้ทั้งแบบใช้กับทุกทีม หรือเฉพาะบางทีม
        ถ้าทีมมีสายอนุมัติของตัวเอง ระบบจะใช้ของทีมก่อน
      </p>
      {message ? (
        <p role={message.kind === "error" ? "alert" : "status"} className={"ck-msg " + message.kind}>
          {message.text}
        </p>
      ) : null}

      <table className="production-table">
        <thead>
          <tr>
            <th>ประเภท</th>
            <th>ใช้กับ</th>
            <th>ลำดับผู้อนุมัติ</th>
            <th>สถานะ</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {policies.map((policy) => (
            <tr key={policy.id}>
              <td>{KIND_LABEL[policy.requestKind]}</td>
              <td>{policy.agencyName ?? "ทุกทีม (ค่าเริ่มต้น)"}</td>
              <td>
                {policy.steps
                  .map((step) => step.stepOrder + ". " + step.roleName + " (" + SCOPE_LABEL[step.scope] + ")")
                  .join(" → ")}
              </td>
              <td>{policy.active ? "ใช้งาน" : "ปิด"}</td>
              <td>
                <button type="button" className="secondary-button" onClick={() => edit(policy)}>
                  แก้ไข
                </button>
              </td>
            </tr>
          ))}
          {policies.length === 0 ? (
            <tr>
              <td colSpan={5}>ยังไม่มีสายอนุมัติ เลือกประเภทด้านล่างเพื่อสร้าง</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
        {KINDS.map((kind) => (
          <button key={kind} type="button" className="secondary-button" onClick={() => startNew(kind)}>
            + สายอนุมัติ{KIND_LABEL[kind]}
          </button>
        ))}
      </div>

      {draft ? (
        <section aria-label="แก้ไขสายอนุมัติ" style={{ display: "grid", gap: 8, maxWidth: 640 }}>
          <h2>{KIND_LABEL[draft.requestKind]}</h2>
          <label>
            ใช้กับทีม
            <select value={draft.agencyId} onChange={(event) => setDraft({ ...draft, agencyId: event.currentTarget.value })}>
              <option value="">ทุกทีม (ค่าเริ่มต้น)</option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            ชื่อสายอนุมัติ
            <input value={draft.name} maxLength={200} onChange={(event) => setDraft({ ...draft, name: event.currentTarget.value })} />
          </label>
          <label>
            <input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.currentTarget.checked })} /> ใช้งาน
          </label>
          {draft.steps.map((step, index) => (
            <div key={index} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span>ขั้นที่ {index + 1}</span>
              <select
                aria-label={"บทบาทผู้อนุมัติขั้นที่ " + (index + 1)}
                value={step.roleKey}
                onChange={(event) => {
                  const steps = draft.steps.map((item, i) => (i === index ? { ...item, roleKey: event.currentTarget.value } : item));
                  setDraft({ ...draft, steps });
                }}
              >
                {roles.map((role) => (
                  <option key={role.key} value={role.key}>
                    {role.name}
                  </option>
                ))}
              </select>
              <select
                aria-label={"ขอบเขตผู้อนุมัติขั้นที่ " + (index + 1)}
                value={step.scope}
                onChange={(event) => {
                  const scope = event.currentTarget.value as ApprovalPolicyScope;
                  const steps = draft.steps.map((item, i) => (i === index ? { ...item, scope } : item));
                  setDraft({ ...draft, steps });
                }}
              >
                {SCOPES.map((scope) => (
                  <option key={scope} value={scope}>
                    {SCOPE_LABEL[scope]}
                  </option>
                ))}
              </select>
              {draft.steps.length > 1 ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setDraft({ ...draft, steps: draft.steps.filter((_, i) => i !== index) })}
                >
                  ลบ
                </button>
              ) : null}
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            {draft.steps.length < 5 ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDraft({ ...draft, steps: [...draft.steps, { roleKey: firstRole, scope: "GLOBAL" }] })}
              >
                + เพิ่มขั้น
              </button>
            ) : null}
            <button type="button" className="primary-button" disabled={busy} onClick={() => void save()}>
              บันทึก
            </button>
            <button type="button" className="secondary-button" disabled={busy} onClick={() => setDraft(null)}>
              ยกเลิก
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
