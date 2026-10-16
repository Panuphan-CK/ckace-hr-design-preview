"use client";

import type { ApprovalChainPreview } from "@ckace/contracts";
import { useEffect, useState } from "react";

import { Icon } from "./icons";

/** Same box as the leave form: who will approve the request if it is submitted now (server-resolved). */
export function ApproverChainNotice({ url }: { readonly url: string }) {
  const [chain, setChain] = useState<ApprovalChainPreview | null>(null);
  const [problem, setProblem] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(url, { credentials: "same-origin", cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<ApprovalChainPreview>) : null))
      .then((value) => {
        if (!active) return;
        setChain(value);
        setProblem(value === null);
      })
      .catch(() => {
        if (active) setProblem(true);
      });
    return () => {
      active = false;
    };
  }, [url]);

  if (!chain && !problem) return null;

  return (
    <div className="ck-aprbox">
      <div className="ck-aprh">
        <Icon name="flow" size={18} style={{ color: "var(--tc)" }} />
        ผู้อนุมัติคำขอนี้
        <span className="ck-hint">เรียงตามลำดับ ระบบส่งต่อให้อัตโนมัติ</span>
      </div>
      {problem || !chain ? (
        <p className="ck-msg error">ยังไม่มีสายอนุมัติสำหรับบัญชีนี้ กรุณาติดต่อฝ่ายบุคคล</p>
      ) : chain.autoApproved ? (
        <p className="ck-muted">อนุมัติอัตโนมัติ (ผู้ยื่นเป็นผู้ดูแล)</p>
      ) : (
        <div className="ck-aprrow">
          {chain.steps.map((step, index) => (
            <div key={step.stepOrder} style={{ display: "contents" }}>
              {index > 0 ? (
                <span className="ck-apr-arrow">
                  <Icon name="chevron" size={18} />
                </span>
              ) : null}
              <div className="ck-apr">
                <span className="ck-apr-n">{step.stepOrder}</span>
                <small>ผู้อนุมัติขั้นที่ {step.stepOrder}</small>
                <b>{step.approverName ?? "ไม่ระบุชื่อ"}</b>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
