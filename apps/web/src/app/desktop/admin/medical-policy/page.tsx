"use client";

import type { MedicalPolicyItem } from "@ckace/contracts";
import { useCallback, useEffect, useState } from "react";

import { ErrorState, LoadingState, Message, PageHead, SettingRow, Toggle } from "../../ui/kit";
import "../ck-v2-settings.css";

const AUTO_APPROVE_ROLES: readonly (readonly [string, string])[] = [
  ["SUPERUSER", "หัวหน้าทีม (SuperUser)"],
  ["ADMIN", "แอดมิน"],
  ["SUPERADMIN", "ซูเปอร์แอดมิน"],
];

export default function MedicalPolicyPage() {
  const [policy, setPolicy] = useState<MedicalPolicyItem | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [perClaim, setPerClaim] = useState("1000");
  const [annual, setAnnual] = useState("10000");
  const [roles, setRoles] = useState<readonly string[]>([]);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/management/medical-policy", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 403 ? "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ" : "โหลดข้อมูลไม่สำเร็จ");
      const next = (await response.json()) as MedicalPolicyItem | null;
      setPolicy(next);
      setPerClaim(String(next?.perClaimLimit ?? 1000));
      setAnnual(String(next?.annualLimit ?? 10000));
      setRoles(next?.autoApproveRoleKeys ?? ["ADMIN", "SUPERADMIN"]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/management/medical-policy", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          annualLimit: Number(annual),
          perClaimLimit: Number(perClaim),
          autoApproveRoleKeys: roles,
        }),
      });
      if (!response.ok) throw new Error(response.status === 400 ? "วงเงินต่อใบต้องไม่เกินวงเงินต่อปี และต้องมากกว่า 0" : "บันทึกไม่สำเร็จ");
      setMessage({ kind: "success", text: "บันทึกวงเงินค่ารักษาแล้ว" });
      await load();
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ" });
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorState title="เปิดหน้าไม่สำเร็จ" message={error} onRetry={() => window.location.reload()} />;
  if (policy === undefined) return <LoadingState title="กำลังโหลด…" />;

  return (
    <>
      <PageHead tone="med" icon="med" title="วงเงินเบิกค่ารักษาพยาบาล" subtitle="วงเงินต่อใบและต่อปีปฏิทิน" />
      <div className="ck-wrap ck-stack">
        <Message value={message} />
        <form
          className="ck-sstack ck-c-med"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <section className="ck-sgroup">
            <h2>วงเงิน</h2>
            <p className="ck-sgroup-note">ยื่นเกินวงเงินต่อใบ ระบบตัดเหลือเท่าวงเงินต่อใบ ใบที่รออนุมัติยังนับรวมในวงเงินต่อปี</p>
            {policy === null ? <p className="ck-sgroup-note">ยังไม่มีการตั้งค่า ค่าแนะนำ 1,000 ต่อใบ และ 10,000 ต่อปี</p> : null}
            <SettingRow label="วงเงินต่อใบ">
              <input className="ck-in ck-snum" aria-label="วงเงินต่อใบ (บาท)" type="number" min="1" step="1" required value={perClaim} disabled={busy} onChange={(e) => setPerClaim(e.currentTarget.value)} />
              <span className="ck-sunit">บาท</span>
            </SettingRow>
            <SettingRow label="วงเงินต่อปี">
              <input className="ck-in ck-snum" aria-label="วงเงินต่อปี (บาท)" type="number" min="1" step="1" required value={annual} disabled={busy} onChange={(e) => setAnnual(e.currentTarget.value)} />
              <span className="ck-sunit">บาท</span>
            </SettingRow>
          </section>
          <section className="ck-sgroup">
            <h2>อนุมัติอัตโนมัติ</h2>
            <p className="ck-sgroup-note">ใบเบิกของระดับที่เปิดไว้จะอนุมัติทันทีและบันทึกในประวัติตรวจสอบ</p>
            {AUTO_APPROVE_ROLES.map(([key, label]) => (
              <SettingRow key={key} label={label}>
                <Toggle
                  label={"อนุมัติอัตโนมัติ " + label}
                  checked={roles.includes(key)}
                  disabled={busy}
                  onChange={(on) => setRoles((current) => (on ? [...new Set([...current, key])] : current.filter((item) => item !== key)))}
                />
              </SettingRow>
            ))}
          </section>
          <div className="ck-sbar">
            <button type="submit" className="ck-btn sky" disabled={busy}>
              {busy ? "กำลังบันทึก…" : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
