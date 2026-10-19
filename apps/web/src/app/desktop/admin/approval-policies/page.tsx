"use client";

import type {
  ApprovalPolicyItem,
  ApprovalPolicyKind,
  ApprovalPolicyScope,
  OrganizationUnitItem,
  RbacAdminView,
} from "@ckace/contracts";
import { useCallback, useEffect, useState } from "react";

import { DataGrid, DetailDialog, EmptyState, ErrorState, LoadingState, Message, PageHead, SectionHead, SettingRow, StatusDot, Toggle } from "../../ui/kit";
import "../ck-v2-settings.css";

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

  if (state.status === "loading") return <LoadingState title="กำลังโหลด…" />;
  if (state.status === "error") return <ErrorState title="เปิดหน้าไม่สำเร็จ" message={state.message} onRetry={() => void load()} />;

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
    <>
      <PageHead tone="ot" icon="flow" title="สายอนุมัติ" subtitle="ลำดับผู้อนุมัติของแต่ละประเภทคำขอ ถ้าทีมมีสายของตัวเอง ระบบใช้ของทีมก่อน" />
      <div className="ck-wrap ck-stack">
        <Message value={draft ? null : message} />

        <section className="ck-sgroup ck-c-ot">
          <h2>สร้างสายอนุมัติใหม่</h2>
          <div className="ck-row" style={{ padding: "10px 0 14px" }}>
            {KINDS.map((kind) => (
              <button key={kind} type="button" className="ck-btn quiet sm" onClick={() => startNew(kind)}>
                + {KIND_LABEL[kind]}
              </button>
            ))}
          </div>
        </section>

        <section className="ck-c-ot">
          <SectionHead title="สายอนุมัติทั้งหมด" count={policies.length} />
          <DataGrid
            rows={policies}
            rowKey={(policy) => policy.id}
            onRowClick={edit}
            empty={<EmptyState title="ยังไม่มีสายอนุมัติ" icon="flow">เลือกประเภทด้านบนเพื่อสร้าง</EmptyState>}
            columns={[
              { key: "kind", header: "ประเภท", render: (policy) => <b>{KIND_LABEL[policy.requestKind]}</b> },
              { key: "agency", header: "ใช้กับ", render: (policy) => policy.agencyName ?? "ทุกทีม (ค่าเริ่มต้น)" },
              {
                key: "steps",
                header: "ลำดับผู้อนุมัติ",
                render: (policy) =>
                  policy.steps.map((step) => step.stepOrder + ". " + step.roleName + " (" + SCOPE_LABEL[step.scope] + ")").join(" → "),
              },
              {
                key: "active",
                header: "สถานะ",
                align: "center",
                width: "90px",
                render: (policy) => <StatusDot tone={policy.active ? "ok" : "muted"} label={policy.active ? "ใช้งาน" : "ปิดใช้งาน"} />,
              },
            ]}
          />
        </section>
      </div>

      {draft ? (
        <DetailDialog
          tone="ot"
          icon="flow"
          kicker="สายอนุมัติ"
          title={KIND_LABEL[draft.requestKind]}
          onClose={() => setDraft(null)}
          footer={
            <button type="button" className="ck-btn sky" disabled={busy} onClick={() => void save()}>
              {busy ? "กำลังบันทึก…" : "บันทึก"}
            </button>
          }
        >
          <Message value={message} />
          <div className="ck-sform">
            <label className="ck-field">
              <span>ใช้กับทีม</span>
              <select className="ck-sselect" value={draft.agencyId} onChange={(event) => setDraft({ ...draft, agencyId: event.currentTarget.value })}>
                <option value="">ทุกทีม (ค่าเริ่มต้น)</option>
                {agencies.map((agency) => (
                  <option key={agency.id} value={agency.id}>
                    {agency.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="ck-field">
              <span>ชื่อสายอนุมัติ</span>
              <input className="ck-in" value={draft.name} maxLength={200} onChange={(event) => setDraft({ ...draft, name: event.currentTarget.value })} />
            </label>
            <SettingRow label="ใช้งาน">
              <Toggle label="ใช้งานสายอนุมัติ" checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} />
            </SettingRow>
            {draft.steps.map((step, index) => (
              <div key={index} className="ck-sstep">
                <b>ขั้นที่ {index + 1}</b>
                <select
                  className="ck-sselect"
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
                  className="ck-sselect"
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
                  <button type="button" className="ck-btn no sm" onClick={() => setDraft({ ...draft, steps: draft.steps.filter((_, i) => i !== index) })}>
                    ลบ
                  </button>
                ) : null}
              </div>
            ))}
            {draft.steps.length < 5 ? (
              <div>
                <button
                  type="button"
                  className="ck-btn quiet sm"
                  onClick={() => setDraft({ ...draft, steps: [...draft.steps, { roleKey: firstRole, scope: "GLOBAL" }] })}
                >
                  + เพิ่มขั้น
                </button>
              </div>
            ) : null}
          </div>
        </DetailDialog>
      ) : null}
    </>
  );
}
