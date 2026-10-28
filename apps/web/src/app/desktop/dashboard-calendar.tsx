"use client";

import type { LeaveCalendarView } from "@ckace/contracts";
import { useEffect, useMemo, useState } from "react";

import { Icon } from "./ui/icons";
import { thaiDate, thaiDateRange } from "./ui/format";

const DAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."] as const;
const MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"] as const;
const STATUS: Readonly<Record<string, string>> = { PENDING: "รออนุมัติ", APPROVED: "อนุมัติแล้ว", REJECTED: "ไม่อนุมัติ", CANCELLED: "ยกเลิก", REVISION_REQUESTED: "ส่งกลับแก้ไข" };

function key(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function DashboardCalendar({ todayKey, holidays, preview }: { readonly todayKey: string; readonly holidays: readonly string[]; readonly preview: boolean }) {
  const [year, month] = todayKey.split("-").map(Number) as [number, number];
  const [offset, setOffset] = useState(0);
  const visible = useMemo(() => new Date(Date.UTC(year, month - 1 + offset, 1)), [year, month, offset]);
  const y = visible.getUTCFullYear();
  const m = visible.getUTCMonth();
  const from = key(y, m, 1);
  const to = key(y, m, new Date(Date.UTC(y, m + 1, 0)).getUTCDate());
  const [view, setView] = useState<LeaveCalendarView | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    void fetch(`/api/management/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { credentials: "same-origin", cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error("calendar unavailable"); return response.json() as Promise<LeaveCalendarView>; })
      .then((data) => { if (!cancelled) setView(data); })
      .catch(() => { if (!cancelled) { setView(null); setError(true); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to, retry]);

  const firstDay = (visible.getUTCDay() + 6) % 7;
  const dayCount = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((firstDay + dayCount) / 7) * 7 }, (_, i) => {
    const day = i - firstDay + 1;
    return day > 0 && day <= dayCount ? { day, date: key(y, m, day) } : null;
  });
  const items = view?.items ?? [];
  return (
    <section className="sh-calendar-board" aria-labelledby="dashboard-calendar-title">
      <header className="sh-framed-heading sh-calendar-heading">
        <span className="sh-section-icon sh-section-icon-blue" aria-hidden="true"><Icon name="calendar" size={18} /></span>
        <div><h2 id="dashboard-calendar-title">TEAM CALENDAR</h2><p>วันลาและกิจกรรมของทีม</p></div>
        {preview ? <span className="sh-calendar-sample">* ข้อมูลตัวอย่าง</span> : null}
        <div className="sh-calendar-month">
          <button type="button" aria-label="เดือนก่อน" onClick={() => setOffset((v) => v - 1)}>‹</button>
          <strong>{MONTHS[m]} {y + 543}</strong>
          <button type="button" aria-label="เดือนถัดไป" onClick={() => setOffset((v) => v + 1)}>›</button>
        </div>
      </header>
      {loading ? <p className="sh-calendar-message">กำลังโหลดปฏิทิน</p> : error ? <p className="sh-calendar-message" role="alert">ไม่สามารถโหลดปฏิทินได้ <button type="button" onClick={() => setRetry((v) => v + 1)}>ลองอีกครั้ง</button></p> : (
        <div className="sh-calendar-body">
          <div className="sh-calendar-grid" aria-label="ปฏิทินรายเดือน">
            {DAYS.map((day) => <b key={day} className="sh-calendar-weekday">{day}</b>)}
            {cells.map((cell, index) => {
              if (!cell) return <span key={`empty-${index}`} className="sh-calendar-cell is-empty" />;
              const events = items.filter((item) => item.startDate <= cell.date && item.endDate >= cell.date);
              const holiday = holidays.includes(cell.date);
              return <div key={cell.date} className={"sh-calendar-cell" + (cell.date === todayKey ? " is-today" : "") + (holiday ? " is-holiday" : "")}><div className="sh-calendar-cell-head"><b>{cell.day}</b><span className="sh-calendar-avatar-stack">{events.slice(0, 2).map((event) => <span key={event.id} title={event.employeeName}>{event.employeeName.slice(0, 1)}</span>)}</span></div>{holiday ? <small>วันหยุดบริษัท</small> : null}{events.length > 2 ? <span className="sh-calendar-event-count">+{events.length - 2}</span> : null}</div>;
            })}
          </div>
          <aside className="sh-calendar-agenda" aria-label="รายการลาในเดือนนี้">
            <h3>รายการลาในเดือนนี้ <span>{items.length} รายการ</span></h3>
            {items.length === 0 ? <p>ไม่มีรายการในเดือนนี้</p> : [...items].sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 6).map((item) => <div className="sh-calendar-agenda-group" key={item.id}><span className="sh-calendar-agenda-date">{item.startDate === todayKey ? "TODAY" : "DATE"} · {thaiDate(item.startDate)}</span><div className="sh-calendar-agenda-row"><span className="sh-calendar-avatar">{item.employeeName.slice(0, 1)}</span><span><b>{item.employeeName}</b><small>{item.leaveType} · {thaiDateRange(item.startDate, item.endDate)}</small></span><em data-status={item.status}>{STATUS[item.status] ?? item.status}</em></div></div>)}
          </aside>
        </div>
      )}
    </section>
  );
}
