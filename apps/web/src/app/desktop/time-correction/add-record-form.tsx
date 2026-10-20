"use client";

import type { TimeCorrectionRequestView, AttendanceRecordView } from "@ckace/contracts";
import type { FormEvent } from "react";
import { useRef, useState } from "react";

import { resolveSubmissionIntent, shouldDiscardSubmissionIntent, type SubmissionIntent } from "../submission-intent";
import { ApproverChainNotice } from "../ui/approver-chain";
import { DateField } from "../ui/date-picker";
import { useHolidayMarks } from "../ui/holidays";
import { thaiDate } from "../ui/format";
import { Icon } from "../ui/icons";
import { SectionHead, TimeInput } from "../ui/kit";
import { bangkokToday, checkAddRecord, correctionErrorMessage } from "./time-correction-view";

/** For a day with no clock-in at all: the employee gives both times and the approvers decide. */
export function AddRecordForm({
  records,
  requests,
  onResult,
}: {
  readonly records: readonly AttendanceRecordView[];
  readonly requests: readonly TimeCorrectionRequestView[];
  readonly onResult: (result: { kind: "success" | "error"; text: string }) => Promise<void> | void;
}) {
  const holidayMark = useHolidayMarks();
  const [date, setDate] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const intent = useRef<SubmissionIntent | null>(null);
  const today = bangkokToday(new Date());
  const takenDates = new Set([
    ...records.map((record) => record.workDate),
    ...requests
      .filter((request) => request.status === "PENDING" || request.status === "APPROVED" || request.status === "REVISION_REQUESTED")
      .map((request) => request.attendanceDate),
  ]);
  const dateMark = (iso: string) => (takenDates.has(iso) ? ("booked" as const) : holidayMark(iso));

  function pickDate(next: string) {
    if (takenDates.has(next)) {
      setDate("");
      void onResult({ kind: "error", text: "วันที่นี้มีบันทึกลงเวลา หรือมีคำขอแก้เวลาอยู่แล้ว กรุณาเลือกวันอื่น" });
      return;
    }
    setDate(next);
  }

  function reset() {
    setDate("");
    setCheckIn("");
    setCheckOut("");
    setReason("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const check = checkAddRecord({
      date,
      checkIn,
      checkOut,
      reason,
      today,
      recordDates: records.map((record) => record.workDate),
      activeRequestDates: requests
        .filter((request) => request.status === "PENDING" || request.status === "APPROVED" || request.status === "REVISION_REQUESTED")
        .map((request) => request.attendanceDate),
    });
    if (!check.ok) {
      await onResult({ kind: "error", text: check.message });
      return;
    }
    const payload = { attendanceDate: date, checkInTime: checkIn, checkOutTime: checkOut, reason: reason.trim() };
    intent.current = resolveSubmissionIntent(intent.current, payload);
    setBusy(true);
    try {
      const response = await fetch("/api/attendance/time-corrections/add-record", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, clientKey: intent.current.clientKey }),
      });
      if (!response.ok) {
        if (shouldDiscardSubmissionIntent(response.status)) intent.current = null;
        throw new Error(correctionErrorMessage(response.status, "create"));
      }
      intent.current = null;
      reset();
      await onResult({ kind: "success", text: "ส่งคำขอเพิ่มบันทึกลงเวลาเรียบร้อยแล้ว" });
    } catch (error) {
      await onResult({ kind: "error", text: error instanceof Error ? error.message : "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="ck-fbox ck-c-time" onSubmit={submit} noValidate>
      <SectionHead title="ขอเพิ่มบันทึกลงเวลา" hint="ใช้เมื่อลืมสแกนทั้งวัน ไม่มีบันทึกเข้า-ออกงานของวันนั้นเลย" />
      <div className="ck-fgrid">
        <div className="ck-field span2">
          <span>วันที่ไม่มีบันทึก</span>
          <DateField label="วันที่ไม่มีบันทึก" value={date} max={today} marks={dateMark} onChange={pickDate} />
        </div>
        <div className="ck-field">
          <span>เวลาเข้างาน</span>
          <TimeInput label="เวลาเข้างาน" value={checkIn} onChange={setCheckIn} />
        </div>
        <div className="ck-field">
          <span>เวลาออกงาน</span>
          <TimeInput label="เวลาออกงาน" value={checkOut} onChange={setCheckOut} />
        </div>
        <label className="ck-field span2">
          <span>เหตุผล</span>
          <input
            className="ck-in"
            value={reason}
            maxLength={1000}
            placeholder="เช่น ลืมสแกนทั้งวัน ไปพบลูกค้านอกสถานที่"
            onChange={(event) => setReason(event.currentTarget.value)}
          />
        </label>
      </div>

      <ApproverChainNotice url="/api/attendance/time-corrections/approval-chain" />

      <div className="ck-fbar">
        <span className="ck-sumline">
          <Icon name="time" size={18} />
          {date && checkIn && checkOut ? (
            <>
              เพิ่มบันทึกวันที่ <b>{thaiDate(date)}</b> เข้า <b>{checkIn}</b> ออก <b>{checkOut}</b>
            </>
          ) : (
            "ระบุวันที่ เวลาเข้า และเวลาออก ระบบจะสรุปให้ตรงนี้"
          )}
        </span>
        <button className="ck-btn quiet ck-ml" type="button" onClick={reset}>
          ล้างฟอร์ม
        </button>
        <button className="ck-btn tone" type="submit" disabled={busy}>
          {busy ? "กำลังส่ง…" : "ส่งคำขอ"}
        </button>
      </div>
    </form>
  );
}
