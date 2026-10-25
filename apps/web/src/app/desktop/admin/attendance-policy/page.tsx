"use client";

import type { AttendancePolicyItem } from "@ckace/contracts";
import { useCallback, useEffect, useState } from "react";

import { ErrorState, LoadingState, Message, PageHead, SettingRow, TimeInput } from "../../ui/kit";
import "../ck-v2-settings.css";

interface Draft {
  name: string;
  officeLatitude: string;
  officeLongitude: string;
  radiusKm: string;
  workStart: string;
  lateAfter: string;
  workEnd: string;
  breakStart: string;
  breakEnd: string;
}

function toDraft(policy: AttendancePolicyItem | null): Draft {
  return {
    name: policy?.name ?? "สำนักงานใหญ่",
    officeLatitude: policy ? String(policy.officeLatitude) : "",
    officeLongitude: policy ? String(policy.officeLongitude) : "",
    radiusKm: String(policy?.radiusKm ?? 0.5),
    workStart: policy?.workStart ?? "09:00",
    lateAfter: policy?.lateAfter ?? "09:00",
    workEnd: policy?.workEnd ?? "17:30",
    breakStart: policy ? (policy.breakStart ?? "") : "12:00",
    breakEnd: policy ? (policy.breakEnd ?? "") : "13:00",
  };
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function AttendancePolicyPage() {
  const [policy, setPolicy] = useState<AttendancePolicyItem | null | undefined>(undefined);
  const [draft, setDraft] = useState<Draft>(toDraft(null));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/management/attendance-policy", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 403 ? "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ" : "โหลดข้อมูลไม่สำเร็จ");
      const next = (await response.json()) as AttendancePolicyItem | null;
      setPolicy(next);
      setDraft(toDraft(next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (busy) return;
    if (![draft.workStart, draft.lateAfter, draft.workEnd].every((value) => TIME.test(value))) {
      setMessage({ kind: "error", text: "กรอกเวลาเข้างาน สาย และเลิกงานให้ครบ เช่น 09:00" });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/management/attendance-policy", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          officeLatitude: Number(draft.officeLatitude),
          officeLongitude: Number(draft.officeLongitude),
          radiusKm: Number(draft.radiusKm),
          lateAfter: draft.lateAfter,
          workStart: draft.workStart,
          workEnd: draft.workEnd,
          breakStart: draft.breakStart || null,
          breakEnd: draft.breakEnd || null,
        }),
      });
      if (!response.ok) throw new Error(response.status === 400 ? "ค่าที่กรอกไม่ถูกต้อง (เวลาเลิกงานต้องหลังเวลาเข้างาน และเวลาพักต้องกรอกครบทั้งคู่)" : "บันทึกไม่สำเร็จ");
      setMessage({ kind: "success", text: "บันทึกนโยบายลงเวลาแล้ว" });
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
      <PageHead tone="time" icon="clock" title="นโยบายลงเวลาเข้า-ออกงาน" subtitle="สถานที่ เวลาทำงาน และเวลาพัก" />
      <div className="ck-wrap ck-stack">
        <Message value={message} />
        <form
          className="ck-sstack ck-c-time"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <section className="ck-sgroup">
            <h2>สำนักงาน</h2>
            {policy === null ? <p className="ck-sgroup-note">ยังไม่มีการตั้งค่า กรอกค่าด้านล่างเพื่อเริ่มใช้งาน</p> : null}
            <SettingRow label="ชื่อนโยบาย">
              <input className="ck-in ck-stext" aria-label="ชื่อนโยบาย" required maxLength={120} value={draft.name} disabled={busy} onChange={(e) => set("name", e.currentTarget.value)} />
            </SettingRow>
            <SettingRow label="ละติจูด">
              <input className="ck-in ck-snum" aria-label="ละติจูดสำนักงาน" type="number" step="any" required value={draft.officeLatitude} disabled={busy} onChange={(e) => set("officeLatitude", e.currentTarget.value)} />
            </SettingRow>
            <SettingRow label="ลองจิจูด">
              <input className="ck-in ck-snum" aria-label="ลองจิจูดสำนักงาน" type="number" step="any" required value={draft.officeLongitude} disabled={busy} onChange={(e) => set("officeLongitude", e.currentTarget.value)} />
            </SettingRow>
            <SettingRow label="ตำแหน่งสำนักงาน" hint="ยืนอยู่ที่สำนักงานแล้วกดปุ่ม ระบบจะกรอกละติจูด/ลองจิจูดให้">
              <button
                type="button"
                className="ck-btn quiet"
                disabled={busy}
                onClick={() => {
                  if (!navigator.geolocation) {
                    setMessage({ kind: "error", text: "เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง" });
                    return;
                  }
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      set("officeLatitude", position.coords.latitude.toFixed(6));
                      set("officeLongitude", position.coords.longitude.toFixed(6));
                      setMessage({ kind: "success", text: "ใส่ตำแหน่งปัจจุบันแล้ว กดบันทึกเพื่อใช้งาน" });
                    },
                    () => setMessage({ kind: "error", text: "ไม่สามารถระบุตำแหน่งได้ กรุณาอนุญาตตำแหน่งในเบราว์เซอร์" }),
                    { enableHighAccuracy: true, timeout: 15_000 },
                  );
                }}
              >
                ใช้ตำแหน่งปัจจุบันของฉัน
              </button>
            </SettingRow>
            <SettingRow label="รัศมีที่ลงเวลาได้">
              <input className="ck-in ck-snum" aria-label="รัศมีที่ลงเวลาได้ (กม.)" type="number" step="0.1" min="0.1" max="100" required title="กรอกรัศมีตั้งแต่ 0.1 ถึง 100 กม." onInvalid={(e) => e.currentTarget.setCustomValidity("กรอกรัศมีตั้งแต่ 0.1 ถึง 100 กม.")} onInput={(e) => e.currentTarget.setCustomValidity("")} value={draft.radiusKm} disabled={busy} onChange={(e) => set("radiusKm", e.currentTarget.value)} />
              <span className="ck-sunit">กม.</span>
            </SettingRow>
          </section>
          <section className="ck-sgroup">
            <h2>เวลาทำงาน</h2>
            <SettingRow label="เริ่มงานตามปกติ" hint="ใช้คำนวณเพดานชั่วโมงทำงานเมื่อแก้เวลา">
              <TimeInput label="เวลาเริ่มงานตามปกติ" value={draft.workStart} onChange={(v) => set("workStart", v)} />
            </SettingRow>
            <SettingRow label="เข้างานหลังเวลานี้ถือว่าสาย">
              <TimeInput label="เข้างานหลังเวลานี้ถือว่าสาย" value={draft.lateAfter} onChange={(v) => set("lateAfter", v)} />
            </SettingRow>
            <SettingRow label="เลิกงานก่อนเวลานี้ถือว่าออกก่อน">
              <TimeInput label="เลิกงานก่อนเวลานี้ถือว่าออกก่อน" value={draft.workEnd} onChange={(v) => set("workEnd", v)} />
            </SettingRow>
          </section>
          <section className="ck-sgroup">
            <h2>เวลาพัก</h2>
            <p className="ck-sgroup-note">เว้นว่างทั้งคู่ถ้าไม่หักเวลาพัก</p>
            <SettingRow label="เริ่มพัก">
              <TimeInput label="เริ่มพัก" value={draft.breakStart} onChange={(v) => set("breakStart", v)} />
            </SettingRow>
            <SettingRow label="สิ้นสุดพัก">
              <TimeInput label="สิ้นสุดพัก" value={draft.breakEnd} onChange={(v) => set("breakEnd", v)} />
            </SettingRow>
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
