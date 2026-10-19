"use client";

import type {
  LeaveCalendarItem,
  LeaveCalendarView,
} from "@ckace/contracts";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "../ck-v2-pages.css";
import { DataGrid, EmptyState, ErrorState, LoadingState, StatusDot, type DotTone } from "../ui/kit";

type State =
  | { status: "loading" }
  | { status: "ready"; data: LeaveCalendarView }
  | { status: "error"; message: string };

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
] as const;

const THAI_DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"] as const;

const STATUS_LABEL: Readonly<Record<string, string>> = {
  PENDING: "รอดำเนินการ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
  CANCELLED: "ยกเลิก",
  REVISION_REQUESTED: "ส่งกลับแก้ไข",
};

function isoDate(year: number, month: number, day: number): string {
  return [
    year,
    String(month + 1).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function rangeForMonth(date: Date): { from: string; to: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  return {
    from: isoDate(year, month, 1),
    to: isoDate(year, month, new Date(year, month + 1, 0).getDate()),
  };
}

function eventClass(status: string): string {
  if (status === "APPROVED") return "status-approved";
  if (status === "REJECTED" || status === "CANCELLED") {
    return "status-rejected";
  }
  if (status === "REVISION_REQUESTED") {
    return "status-revision_requested";
  }
  return "status-pending";
}

function statusDot(status: string): DotTone {
  if (status === "APPROVED") return "ok";
  if (status === "REJECTED") return "bad";
  if (status === "CANCELLED") return "muted";
  if (status === "REVISION_REQUESTED") return "back";
  return "wait";
}

function eventOccursOn(item: LeaveCalendarItem, day: string): boolean {
  return item.startDate <= day && item.endDate >= day;
}

function displayDate(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return day + "/" + month + "/" + String(Number(year) + 543);
}

export default function DesktopCalendarPage() {
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [state, setState] = useState<State>({ status: "loading" });

  const [holidays, setHolidays] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    void fetch("/api/leave/me", { credentials: "same-origin", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { holidays?: readonly string[] } | null) => setHolidays(new Set(body?.holidays ?? [])))
      .catch(() => setHolidays(new Set()));
  }, []);

  const range = useMemo(
    () => rangeForMonth(visibleMonth),
    [visibleMonth],
  );

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch(
        "/api/management/calendar?from=" +
          encodeURIComponent(range.from) +
          "&to=" +
          encodeURIComponent(range.to),
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? "บัญชีนี้ไม่มีสิทธิ์ดูปฏิทินการลาขององค์กร"
            : response.status === 401
              ? "หมดเวลาการเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่"
              : "ไม่สามารถโหลดปฏิทินการลาได้",
        );
      }
      setState({
        status: "ready",
        data: (await response.json()) as LeaveCalendarView,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลดปฏิทินการลาได้",
      });
    }
  }, [range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const calendarCells = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const dayCount = new Date(year, month + 1, 0).getDate();
    const cells: Array<
      | { kind: "empty"; key: string }
      | { kind: "day"; day: number; key: string; date: string }
    > = [];

    for (let index = 0; index < firstWeekday; index += 1) {
      cells.push({ kind: "empty", key: "empty-" + index });
    }

    for (let day = 1; day <= dayCount; day += 1) {
      const date = isoDate(year, month, day);
      cells.push({ kind: "day", day, key: date, date });
    }
    return cells;
  }, [visibleMonth]);

  const today = useMemo(() => {
    const now = new Date();
    return isoDate(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  function moveMonth(offset: number) {
    setVisibleMonth((current) => {
      return new Date(
        current.getFullYear(),
        current.getMonth() + offset,
        1,
      );
    });
  }

  function goToday() {
    const now = new Date();
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  const items = state.status === "ready" ? state.data.items : [];
  const approvedCount = items.filter((item) => item.status === "APPROVED").length;
  const pendingCount = items.filter((item) => item.status === "PENDING").length;
  const rejectedCount = items.filter((item) => item.status === "REJECTED" || item.status === "CANCELLED").length;
  const revisionCount = items.filter((item) => item.status === "REVISION_REQUESTED").length;

  return (
    <section className="production-calendar-panel task397-calendar fade-in ck-cal-v2">
      <div className="production-calendar-toolbar task397-calendar-heading">
        <div>
          <span className="summary-kicker">ปฏิทินการลา</span>
          <h2>ภาพรวมการลาประจำเดือน</h2>
          <p>ดูวันลาและรายการของพนักงานในพื้นที่เดียวกัน</p>
        </div>
        <div className="task397-calendar-stats">
          <span><strong>{items.length}</strong> รายการ</span>
          <span className="approved"><strong>{approvedCount}</strong> อนุมัติแล้ว</span>
          <span className="pending"><strong>{pendingCount}</strong> รอดำเนินการ</span>
          {revisionCount > 0 ? <span><strong>{revisionCount}</strong> ส่งกลับแก้ไข</span> : null}
          {rejectedCount > 0 ? <span><strong>{rejectedCount}</strong> ไม่อนุมัติ / ยกเลิก</span> : null}
        </div>
      </div>

      <div className="production-calendar-main">
        <div className="production-calendar-month-nav">
          <button
            className="production-calendar-nav-button"
            type="button"
            onClick={() => moveMonth(-1)}
          >
            <i className="bx bx-chevron-left" aria-hidden="true" />
            เดือนก่อนหน้า
          </button>

          <div className="production-calendar-month-title">
            <h3>
              {THAI_MONTHS[visibleMonth.getMonth()]}{" "}
              {visibleMonth.getFullYear() + 543}
            </h3>
            <button
              className="production-calendar-nav-button production-calendar-today"
              type="button"
              onClick={goToday}
            >
              วันนี้
            </button>
          </div>

          <button
            className="production-calendar-nav-button"
            type="button"
            onClick={() => moveMonth(1)}
          >
            เดือนถัดไป
            <i className="bx bx-chevron-right" aria-hidden="true" />
          </button>
        </div>

        <div className="task397-calendar-legend" aria-label="คำอธิบายสถานะ">
          <span><i className="status-approved" /> อนุมัติแล้ว</span>
          <span><i className="status-pending" /> รอดำเนินการ</span>
          <span><i className="status-revision_requested" /> ส่งกลับแก้ไข</span>
          <span><i className="status-rejected" /> ไม่อนุมัติ / ยกเลิก</span>
        </div>

        {state.status === "loading" ? (
          <LoadingState title="กำลังโหลดปฏิทินการลา" />
        ) : state.status === "error" ? (
          <ErrorState title="โหลดข้อมูลไม่สำเร็จ" message={state.message} onRetry={() => void load()} />
        ) : (
          <div className="calendar-grid">
            {calendarCells.map((cell) => {
              if (cell.kind === "empty") {
                return (
                  <div
                    className="calendar-day-cell empty"
                    key={cell.key}
                    aria-hidden="true"
                  />
                );
              }

              const weekday = new Date(
                visibleMonth.getFullYear(),
                visibleMonth.getMonth(),
                cell.day,
              ).getDay();
              // leave only counts working days, so weekends and company holidays stay unpainted
              const events =
                weekday === 0 || weekday === 6 || holidays.has(cell.date)
                  ? []
                  : items.filter((item) => eventOccursOn(item, cell.date));

              return (
                <article
                  className={
                    cell.date === today
                      ? "calendar-day-cell today"
                      : "calendar-day-cell"
                  }
                  key={cell.key}
                >
                  <div className="calendar-day-header">
                    <span className="calendar-day-date">{cell.day}</span>
                    <span className="calendar-day-name">
                      {THAI_DAYS[weekday]}
                    </span>
                  </div>
                  <div className="calendar-day-events">
                    {events.slice(0, 3).map((item) => (
                      <div
                        className={
                          "calendar-day-event " + eventClass(item.status)
                        }
                        key={item.id}
                        title={
                          item.employeeName +
                          " · " +
                          item.leaveType +
                          " · " +
                          (STATUS_LABEL[item.status] ?? item.status)
                        }
                      >
                        <strong>{item.employeeName}</strong>
                        <span>
                          {item.leaveType} ·{" "}
                          {STATUS_LABEL[item.status] ?? item.status}
                        </span>
                      </div>
                    ))}
                    {events.length > 3 ? (
                      <span className="task397-calendar-more">
                        +{events.length - 3} รายการ
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="task397-calendar-list-section">
        <div className="task397-calendar-list-head">
          <div>
            <span className="summary-kicker">รายการเดือนนี้</span>
            <h3>รายการการลาทั้งหมด</h3>
            <p>เรียงตามวันเริ่มลา เพื่อค้นหารายการได้ง่ายขึ้น</p>
          </div>
          <span className="task397-calendar-count">{items.length} รายการ</span>
        </div>

        {state.status !== "ready" || items.length === 0 ? (
          <EmptyState icon="calendar" title="ไม่มีรายการในเดือนนี้">
            รายการการลาจะแสดงด้านล่างปฏิทินเมื่อมีข้อมูล
          </EmptyState>
        ) : (
          <DataGrid
            rows={[...items].sort((left, right) => left.startDate.localeCompare(right.startDate))}
            rowKey={(item) => item.id}
            columns={[
              {
                key: "st",
                header: "",
                width: "48px",
                align: "center",
                render: (item) => <StatusDot tone={statusDot(item.status)} label={STATUS_LABEL[item.status] ?? item.status} />,
              },
              { key: "emp", header: "พนักงาน", render: (item) => <b>{item.employeeName}</b> },
              { key: "type", header: "ประเภทการลา", render: (item) => item.leaveType },
              {
                key: "range",
                header: "วันที่ลา",
                render: (item) =>
                  item.startDate === item.endDate
                    ? displayDate(item.startDate)
                    : displayDate(item.startDate) + " – " + displayDate(item.endDate),
              },
            ]}
          />
        )}
      </div>
    </section>
  );
}
