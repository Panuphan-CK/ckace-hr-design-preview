"use client";

import type { OvertimeReportRow } from "@ckace/contracts";
import { useCallback, useEffect, useState } from "react";

import { thaiDate } from "../ui/format";
import { SectionHead } from "../ui/kit";

const FLAG_LABEL: Readonly<Record<string, string>> = {
  NO_CHECK_OUT: "ลืมลงเวลาออก",
  NO_RECORD: "ไม่มีเวลาเข้า-ออก",
};

const FAILED = "ดำเนินการไม่สำเร็จ กรุณาลองใหม่";

/** Admin check of OT days whose clock-in/out was forgotten: pay stays as approved; confirming records the review. */
export function OvertimeCheckPanel({ from, to }: { readonly from: string; readonly to: string }) {
  const [rows, setRows] = useState<readonly OvertimeReportRow[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/management/reports/overtime?from=" + encodeURIComponent(from) + "&to=" + encodeURIComponent(to),
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!response.ok) throw new Error(FAILED);
      const body = (await response.json()) as { rows: readonly OvertimeReportRow[] };
      setRows(body.rows.filter((row) => row.attendanceCheck === "NO_CHECK_OUT" || row.attendanceCheck === "NO_RECORD"));
    } catch {
      setRows(null);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirm(segmentIds: readonly string[]) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/management/reports/overtime/confirm", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ segmentIds }),
      });
      if (!response.ok) throw new Error(FAILED);
      setMessage("ยืนยันแล้ว");
      await load();
    } catch {
      setMessage(FAILED);
    } finally {
      setBusy(false);
    }
  }

  if (rows === null) return null;
  const pending = rows.filter((row) => !row.confirmed);

  return (
    <section className="ck-panel ck-c-ot" id="overtime-check">
      <SectionHead title="ตรวจ OT ที่ลืมลงเวลา" count={pending.length} />
      <p className="ck-muted">
        รายการเหล่านี้จ่ายตามเวลาที่อนุมัติ พนักงานยังยื่นแก้เวลาได้ กดยืนยันเมื่อตรวจแล้วว่าไม่มีปัญหา
      </p>
      {message ? <p role="status">{message}</p> : null}
      {rows.length === 0 ? (
        <div className="ck-empty">ไม่มีรายการที่ลืมลงเวลาในช่วงวันที่นี้</div>
      ) : (
        <>
          <button
            className="ck-btn tone"
            type="button"
            disabled={busy || pending.length === 0}
            onClick={() => void confirm(pending.map((row) => row.segmentId))}
          >
            ยืนยันทั้งหมด ({pending.length})
          </button>
          <div className="ck-tablewrap">
            <table className="ck-table">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>พนักงาน</th>
                  <th>เวลาที่อนุมัติ</th>
                  <th>ปัญหา</th>
                  <th>จ่าย (นาที)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.segmentId}>
                    <td>{thaiDate(row.workDate)}</td>
                    <td>{row.employeeName}</td>
                    <td>{row.approvedStart}-{row.approvedEnd}</td>
                    <td>{FLAG_LABEL[row.attendanceCheck]}</td>
                    <td>{row.paidMinutes}</td>
                    <td>
                      {row.confirmed ? (
                        "ยืนยันแล้ว"
                      ) : (
                        <button className="ck-btn quiet" type="button" disabled={busy} onClick={() => void confirm([row.segmentId])}>
                          ยืนยัน
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
