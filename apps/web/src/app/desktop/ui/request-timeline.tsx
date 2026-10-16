"use client";

import type { RequestTimeline, RequestTimelineStep } from "@ckace/contracts";
import { useEffect, useState } from "react";

import { thaiDateTime } from "./format";

const STEP_LABEL: Readonly<Record<RequestTimelineStep["status"], string>> = {
  PENDING: "รอพิจารณา",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
  REVISION_REQUESTED: "ส่งกลับให้แก้ไข",
  SKIPPED: "ข้ามขั้น",
  CANCELLED: "ยกเลิก",
};

/** Approval chain of a request (approver names and decisions), loaded when the dialog opens. */
export function RequestTimelineSection({ requestId }: { readonly requestId: string }) {
  const [timeline, setTimeline] = useState<RequestTimeline | null>(null);

  useEffect(() => {
    let active = true;
    setTimeline(null);
    void fetch("/api/requests/timeline/" + encodeURIComponent(requestId), {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((response) => (response.ok ? (response.json() as Promise<RequestTimeline>) : null))
      .then((value) => {
        if (active) setTimeline(value);
      })
      .catch(() => {
        if (active) setTimeline(null);
      });
    return () => {
      active = false;
    };
  }, [requestId]);

  if (!timeline || timeline.steps.length === 0) return null;

  return (
    <div className="ck-dlg-sec">
      <h3>ลำดับผู้อนุมัติ · {timeline.requestNo}</h3>
      <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
        {timeline.steps.map((step) => (
          <li key={step.stepOrder}>
            <b>{step.approverName ?? "รอระบบกำหนดผู้อนุมัติ"}</b>{" "}
            <span>
              {STEP_LABEL[step.status]}
              {step.decidedAt ? " · " + thaiDateTime(step.decidedAt) : ""}
            </span>
            {step.comment ? <div style={{ opacity: 0.75 }}>ความเห็น: {step.comment}</div> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
