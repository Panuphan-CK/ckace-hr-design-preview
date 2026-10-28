"use client";

import type {
  AnnouncementListResult,
  LeaveCalendarView,
  LeaveSelfOverview,
  MedicalSelfOverview,
  RequestStatusOverview,
  SelfProfileResponse,
  UnifiedRequestKind,
} from "@ckace/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  baht,
  bangkokDateKey,
  dayLabel,
  greeting,
  longThaiDate,
} from "./dashboard-view";
import { thaiDate } from "./ui/format";
import { Icon, type IconName } from "./ui/icons";
import { ErrorState, LoadingState } from "./ui/kit";

interface Session {
  readonly employeeId: string;
  readonly navigation: Readonly<Record<string, boolean>>;
}

interface DashboardData {
  readonly session: Session;
  readonly profile: SelfProfileResponse | null;
  readonly leave: LeaveSelfOverview | null;
  readonly medical: MedicalSelfOverview | null;
  readonly requests: RequestStatusOverview | null;
  readonly team: LeaveCalendarView | null;
  readonly announcements: AnnouncementListResult | null;
}

type State =
  | { status: "loading" }
  | { status: "ready"; data: DashboardData }
  | { status: "error"; message: string };

const KIND_META: Readonly<
  Record<
    UnifiedRequestKind,
    { label: string; icon: IconName; toneClass: string }
  >
> = {
  LEAVE: { label: "การลา", icon: "leave", toneClass: "leave" },
  OVERTIME: { label: "ทำงานล่วงเวลา", icon: "ot", toneClass: "ot" },
  TIME_CORRECTION: { label: "แก้ไขเวลา", icon: "time", toneClass: "time" },
  MEDICAL: { label: "เบิกค่ารักษา", icon: "med", toneClass: "med" },
};

async function optional<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

export default function DesktopDashboardPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [currentTime, setCurrentTime] = useState("");
  const [currentDateStr, setCurrentDateStr] = useState("");

  // Live Digital Clock & Thai Buddhist Date
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Bangkok",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(now);
      setCurrentTime(timeStr);
      setCurrentDateStr(longThaiDate(bangkokDateKey(now)));
    };
    updateTime();
    const timer = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const sessionResponse = await fetch("/api/security/session", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!sessionResponse.ok) {
        setState({ status: "error", message: "ไม่สามารถเข้าถึงเซสชันได้ กรุณาเข้าสู่ระบบใหม่" });
        return;
      }
      const session = (await sessionResponse.json()) as {
        employeeId: string;
        navigation: Record<string, boolean>;
      };
      const nav = session.navigation;

      const [profile, leave, medical, requests, team, announcements] = await Promise.all([
        optional<SelfProfileResponse>("/api/profile/me"),
        nav.leave ? optional<LeaveSelfOverview>("/api/leave/me/overview") : Promise.resolve(null),
        nav.medical ? optional<MedicalSelfOverview>("/api/medical/me/overview") : Promise.resolve(null),
        nav.requestStatus ? optional<RequestStatusOverview>("/api/requests/me") : Promise.resolve(null),
        nav.calendar ? optional<LeaveCalendarView>("/api/leave/calendar") : Promise.resolve(null),
        nav.announcements ? optional<AnnouncementListResult>("/api/announcements") : Promise.resolve(null),
      ]);

      setState({
        status: "ready",
        data: {
          session,
          profile,
          leave,
          medical,
          requests,
          team,
          announcements,
        },
      });
    } catch {
      setState({ status: "error", message: "โหลดข้อมูลแดชบอร์ดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (state.status === "loading") {
    return <LoadingState title="กำลังโหลดข้อมูลแดชบอร์ด..." />;
  }

  if (state.status === "error") {
    return <ErrorState title="เกิดข้อผิดพลาด" message={state.message} onRetry={() => void loadData()} />;
  }

  const { data } = state;
  const profile = data.profile;
  const leave = data.leave;
  const medical = data.medical;
  const requests = data.requests?.requests ?? [];
  const announcements = data.announcements?.announcements ?? [];

  const now = new Date();
  const greetingText = greeting(now);
  const fullName = profile?.fullName ?? "คุณพนักงาน";
  const roleName = profile?.roles[0] ?? "พนักงาน";
  const departmentName = profile?.department?.name ?? "ฝ่ายทรัพยากรบุคคล (HR)";

  // Entitlements from leave
  const vacationEnt = leave?.entitlements.find((e) => e.leaveTypeKey === "VACATION");
  const vacationUsed = vacationEnt ? vacationEnt.used : 8;
  const vacationTotal = vacationEnt ? vacationEnt.quota : 10;
  const vacationRemaining = vacationEnt ? vacationEnt.remaining : Math.max(0, vacationTotal - vacationUsed);
  const vacationPct = vacationTotal > 0 ? Math.min(100, Math.round((vacationUsed / vacationTotal) * 1000) / 10) : 0;

  // Sick KPI
  const sickEnt = leave?.entitlements.find((e) => e.leaveTypeKey === "SICK");
  const sickUsed = sickEnt ? sickEnt.used : 5;
  const sickTotal = sickEnt ? sickEnt.quota : 30;
  const sickRemaining = sickEnt ? sickEnt.remaining : Math.max(0, sickTotal - sickUsed);
  const sickPct = sickTotal > 0 ? Math.min(100, Math.round((sickUsed / sickTotal) * 1000) / 10) : 0;

  // Business / Personal KPI
  const bizEnt = leave?.entitlements.find((e) => e.leaveTypeKey === "PERSONAL");
  const bizUsed = bizEnt ? bizEnt.used : 3;
  const bizTotal = bizEnt ? bizEnt.quota : 5;
  const bizRemaining = bizEnt ? bizEnt.remaining : Math.max(0, bizTotal - bizUsed);
  const bizPct = bizTotal > 0 ? Math.min(100, Math.round((bizUsed / bizTotal) * 1000) / 10) : 0;

  // OT KPI
  const otHoursMonth = 12.5;
  const otHoursTotal = 152;
  const otPct = 60.0;

  // Medical KPI
  const medApproved = medical?.entitlement ? medical.entitlement.approved : 2500;
  const medTotal = medical?.entitlement ? medical.entitlement.annualLimit : 10000;
  const medRemaining = medical?.entitlement ? medical.entitlement.remaining : Math.max(0, medTotal - medApproved);
  const medPct = medTotal > 0 ? Math.min(100, Math.round((medApproved / medTotal) * 1000) / 10) : 0;

  // Request Status Summary Counts
  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const approvedRequests = requests.filter((r) => r.status === "APPROVED");
  const reviewRequests = requests.filter(
    (r) => r.status === "REVISION_REQUESTED" || r.status === "REJECTED",
  );

  const pendingCount = pendingRequests.length || 2;
  const approvedCount = approvedRequests.length || 5;
  const reviewCount = reviewRequests.length || 1;

  return (
    <div className="sh-dashboard-v3">
      {/* ===== Section 1: Top Hero Greeting & Clock / Attendance ===== */}
      <div className="top-grid">
        {/* Hero Card */}
        <div className="hero-card">
          <div className="hero-building" />
          <div className="hero-text">
            <div className="hero-greeting">{greetingText}</div>
            <div className="hero-name">{fullName}</div>
            <div className="hero-role">
              ตำแหน่ง {roleName} · {departmentName}
            </div>
          </div>
        </div>

        {/* Live Clock & Attendance Card */}
        <div className="clock-card">
          <div className="clock-top">
            <div className="clock-date">
              <Icon name="calendar" size={17} />
              <span>{currentDateStr || "วันพุธที่ 28 ตุลาคม 2569"}</span>
            </div>
            <div className="digital-clock">{currentTime || "10:24:36"}</div>
          </div>

          <div className="attendance-block">
            <div className="attendance-header">
              <div className="attendance-title">
                <Icon name="clock" size={17} />
                <span>ลงเวลาเข้า - ออกงาน</span>
              </div>
              <Link href="/desktop/attendance" className="link-detail">
                ดูรายละเอียด &rarr;
              </Link>
            </div>
            <div className="attendance-grid">
              <div className="attendance-subcard">
                <div className="att-icon in">
                  <Icon name="back" size={18} style={{ transform: "rotate(180deg)" }} />
                </div>
                <div>
                  <div className="att-label">เวลาเข้า</div>
                  <div className="att-time">08:28</div>
                  <div className="att-tag">✓ ตรงเวลา</div>
                </div>
              </div>
              <div className="attendance-subcard">
                <div className="att-icon out">
                  <Icon name="back" size={18} />
                </div>
                <div>
                  <div className="att-label">เวลาออก</div>
                  <div className="att-time">--:--</div>
                  <div className="att-tag muted">ยังไม่ลงเวลา</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Section 2: สิทธิและสถิติประจำปี (5 Colored KPI Cards) ===== */}
      <section className="section-container">
        <div className="section-head">
          <div className="section-title">
            <Icon name="clock" size={20} />
            <span>สิทธิและสถิติประจำปี</span>
          </div>
          <Link href="/desktop/leave" className="link-detail">
            ดูรายละเอียด &rarr;
          </Link>
        </div>

        <div className="kpi-5-grid">
          {/* 1. ลาพักร้อน */}
          <div className="kpi-box kpi-blue">
            <div className="kpi-top">
              <div className="kpi-icon-circle">
                <Icon name="leave" size={20} />
              </div>
              <div>
                <div className="kpi-name">ลาพักร้อน</div>
                <div className="kpi-val">
                  {dayLabel(vacationUsed)} / {dayLabel(vacationTotal)} วัน
                </div>
                <div className="kpi-sub">เหลือ {dayLabel(vacationRemaining)} วัน</div>
              </div>
            </div>
            <div className="kpi-progress">
              <div className="kpi-bar" style={{ width: `${vacationPct}%` }} />
            </div>
            <div className="kpi-pct-badge">{vacationPct.toFixed(1)}%</div>
          </div>

          {/* 2. ลาป่วย */}
          <div className="kpi-box kpi-green">
            <div className="kpi-top">
              <div className="kpi-icon-circle">
                <Icon name="sick" size={20} />
              </div>
              <div>
                <div className="kpi-name">ลาป่วย</div>
                <div className="kpi-val">
                  {dayLabel(sickUsed)} / {dayLabel(sickTotal)} วัน
                </div>
                <div className="kpi-sub">เหลือ {dayLabel(sickRemaining)} วัน</div>
              </div>
            </div>
            <div className="kpi-progress">
              <div className="kpi-bar" style={{ width: `${sickPct}%` }} />
            </div>
            <div className="kpi-pct-badge">{sickPct.toFixed(1)}%</div>
          </div>

          {/* 3. ลากิจ */}
          <div className="kpi-box kpi-orange">
            <div className="kpi-top">
              <div className="kpi-icon-circle">
                <Icon name="biz" size={20} />
              </div>
              <div>
                <div className="kpi-name">ลากิจ</div>
                <div className="kpi-val">
                  {dayLabel(bizUsed)} / {dayLabel(bizTotal)} วัน
                </div>
                <div className="kpi-sub">เหลือ {dayLabel(bizRemaining)} วัน</div>
              </div>
            </div>
            <div className="kpi-progress">
              <div className="kpi-bar" style={{ width: `${bizPct}%` }} />
            </div>
            <div className="kpi-pct-badge">{bizPct.toFixed(1)}%</div>
          </div>

          {/* 4. OT (เดือนนี้) */}
          <div className="kpi-box kpi-purple">
            <div className="kpi-top">
              <div className="kpi-icon-circle">
                <Icon name="ot" size={20} />
              </div>
              <div>
                <div className="kpi-name">OT (เดือนนี้)</div>
                <div className="kpi-val">{otHoursMonth} ชม.</div>
                <div className="kpi-sub">สะสม {otHoursTotal} ชม.</div>
              </div>
            </div>
            <div className="kpi-progress">
              <div className="kpi-bar" style={{ width: `${otPct}%` }} />
            </div>
            <div className="kpi-pct-badge">{otPct.toFixed(1)}%</div>
          </div>

          {/* 5. เบิกค่ารักษา */}
          <div className="kpi-box kpi-red">
            <div className="kpi-top">
              <div className="kpi-icon-circle">
                <Icon name="med" size={20} />
              </div>
              <div>
                <div className="kpi-name">เบิกค่ารักษา</div>
                <div className="kpi-val">{baht(medApproved)} บาท</div>
                <div className="kpi-sub">จากวงเงิน {baht(medTotal)} บาท</div>
              </div>
            </div>
            <div className="kpi-progress">
              <div className="kpi-bar" style={{ width: `${medPct}%` }} />
            </div>
            <div className="kpi-pct-badge">{medPct.toFixed(1)}%</div>
          </div>
        </div>
      </section>

      {/* ===== Section 3: 2 Columns: สถานะคำขอของฉัน + ปฏิทินการทำงาน ===== */}
      <div className="two-col-grid">
        {/* Col 1: สถานะคำขอของฉัน */}
        <section className="section-container" style={{ marginBottom: 0 }}>
          <div className="section-head">
            <div className="section-title">
              <Icon name="document" size={20} />
              <span>สถานะคำขอของฉัน</span>
            </div>
            <Link href="/desktop/requests" className="link-detail">
              ดูทั้งหมด &rarr;
            </Link>
          </div>

          <div className="status-boxes">
            {/* รอดำเนินการ */}
            <div className="status-box">
              <div className="status-box-head">
                <div className="status-circle blue">
                  <Icon name="clock" size={17} />
                </div>
                <div className="status-box-title">รอดำเนินการ</div>
              </div>
              <div className="status-box-count">
                {pendingCount} <small>รายการ</small>
              </div>
              <ul className="status-list">
                <li>
                  <span>ลาพักร้อน</span>
                  <b>1</b>
                </li>
                <li>
                  <span>ขอ OT</span>
                  <b>1</b>
                </li>
              </ul>
            </div>

            {/* อนุมัติแล้ว */}
            <div className="status-box">
              <div className="status-box-head">
                <div className="status-circle green">
                  <Icon name="check" size={17} />
                </div>
                <div className="status-box-title">อนุมัติแล้ว</div>
              </div>
              <div className="status-box-count">
                {approvedCount} <small>รายการ</small>
              </div>
              <ul className="status-list">
                <li>
                  <span>ลาพักร้อน</span>
                  <b>3</b>
                </li>
                <li>
                  <span>ขอ OT</span>
                  <b>1</b>
                </li>
                <li>
                  <span>เบิกค่ารักษา</span>
                  <b>1</b>
                </li>
              </ul>
            </div>

            {/* รออนุมัติ / ขอแก้ไข */}
            <div className="status-box">
              <div className="status-box-head">
                <div className="status-circle orange">
                  <Icon name="time" size={17} />
                </div>
                <div className="status-box-title">รออนุมัติ</div>
              </div>
              <div className="status-box-count">
                {reviewCount} <small>รายการ</small>
              </div>
              <ul className="status-list">
                <li>
                  <span>ขอแก้ไขเวลา</span>
                  <b>1</b>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Col 2: ปฏิทินการทำงาน */}
        <section className="section-container" style={{ marginBottom: 0 }}>
          <div className="section-head">
            <div className="section-title">
              <Icon name="calendar" size={20} />
              <span>ปฏิทินการทำงาน</span>
            </div>
            <Link href="/desktop/calendar" className="link-detail">
              ดูปฏิทินเต็ม &rarr;
            </Link>
          </div>

          <div className="cal-nav">
            <button type="button" className="cal-nav-btn" aria-label="เดือนก่อนหน้า">
              &lt;
            </button>
            <span>ตุลาคม 2569</span>
            <button type="button" className="cal-nav-btn" aria-label="เดือนถัดไป">
              &gt;
            </button>
          </div>

          <table className="cal-table">
            <thead>
              <tr>
                <th style={{ color: "var(--red)" }}>อา</th>
                <th>จ</th>
                <th>อ</th>
                <th>พ</th>
                <th>พฤ</th>
                <th>ศ</th>
                <th>ส</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td />
                <td />
                <td />
                <td>
                  1<div className="cal-dot green" />
                </td>
                <td>
                  2<div className="cal-dot green" />
                </td>
                <td>
                  3<div className="cal-dot green" />
                </td>
                <td>4</td>
              </tr>
              <tr>
                <td style={{ color: "var(--red)" }}>5</td>
                <td>
                  6<div className="cal-dot green" />
                </td>
                <td>
                  7<div className="cal-dot green" />
                </td>
                <td>
                  8<div className="cal-dot green" />
                </td>
                <td>
                  9<div className="cal-dot green" />
                </td>
                <td>
                  10<div className="cal-dot green" />
                </td>
                <td>11</td>
              </tr>
              <tr>
                <td style={{ color: "var(--red)" }}>12</td>
                <td>
                  13<div className="cal-dot red" />
                </td>
                <td>
                  14<div className="cal-dot green" />
                </td>
                <td>
                  15<div className="cal-dot blue" />
                </td>
                <td>
                  16<div className="cal-dot blue" />
                </td>
                <td>
                  17<div className="cal-dot green" />
                </td>
                <td>18</td>
              </tr>
              <tr>
                <td style={{ color: "var(--red)" }}>19</td>
                <td>
                  20<div className="cal-dot green" />
                </td>
                <td>
                  21<div className="cal-dot green" />
                </td>
                <td>
                  <div className="cal-day-num today">22</div>
                  <div className="cal-dot green" />
                </td>
                <td>
                  23<div className="cal-dot red" />
                </td>
                <td>
                  24<div className="cal-dot orange" />
                </td>
                <td>25</td>
              </tr>
              <tr>
                <td style={{ color: "var(--red)" }}>26</td>
                <td>
                  27<div className="cal-dot green" />
                </td>
                <td>
                  28<div className="cal-dot green" />
                </td>
                <td>
                  29<div className="cal-dot green" />
                </td>
                <td>
                  30<div className="cal-dot green" />
                </td>
                <td>
                  31<div className="cal-dot green" />
                </td>
                <td />
              </tr>
            </tbody>
          </table>

          <div className="cal-legend">
            <div className="cal-legend-item">
              <span className="cal-legend-dot" style={{ background: "var(--green)" }} />
              <span>วันทำงาน</span>
            </div>
            <div className="cal-legend-item">
              <span className="cal-legend-dot" style={{ background: "var(--blue-primary)" }} />
              <span>อนุมัติแล้ว</span>
            </div>
            <div className="cal-legend-item">
              <span className="cal-legend-dot" style={{ background: "var(--orange)" }} />
              <span>รอพิจารณา</span>
            </div>
            <div className="cal-legend-item">
              <span className="cal-legend-dot" style={{ background: "var(--red)" }} />
              <span>วันหยุด</span>
            </div>
          </div>
        </section>
      </div>

      {/* ===== Section 4: 2 Columns: คำขอล่าสุด + ประกาศ / ข่าวสาร ===== */}
      <div className="two-col-grid" style={{ marginBottom: 0 }}>
        {/* Col 1: คำขอล่าสุด Table */}
        <section className="section-container" style={{ marginBottom: 0 }}>
          <div className="section-head">
            <div className="section-title">
              <Icon name="document" size={20} />
              <span>คำขอล่าสุด</span>
            </div>
            <Link href="/desktop/requests" className="link-detail">
              ดูทั้งหมด &rarr;
            </Link>
          </div>

          <div className="table-responsive">
            <table className="req-table">
              <thead>
                <tr>
                  <th>ประเภท</th>
                  <th>วันที่ยื่น</th>
                  <th>ช่วงวันที่</th>
                  <th>จำนวน</th>
                  <th>สถานะ</th>
                  <th>หมายเหตุ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {requests.length > 0 ? (
                  requests.slice(0, 5).map((req) => {
                    const meta = KIND_META[req.kind] ?? {
                      label: "คำขอ",
                      icon: "document",
                      toneClass: "leave",
                    };
                    return (
                      <tr key={req.id}>
                        <td>
                          <div className="type-cell">
                            <span className={"type-icon " + meta.toneClass}>
                              <Icon name={meta.icon} size={15} />
                            </span>
                            {meta.label}
                          </div>
                        </td>
                        <td>{thaiDate(req.submittedAt)}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>
                          <span
                            className={
                              "pill " +
                              (req.status === "APPROVED"
                                ? "green"
                                : req.status === "PENDING"
                                  ? "blue"
                                  : "orange")
                            }
                          >
                            {req.status === "APPROVED"
                              ? "อนุมัติแล้ว"
                              : req.status === "PENDING"
                                ? "รอดำเนินการ"
                                : "รอตรวจสอบ"}
                          </span>
                        </td>
                        <td>{req.summary || "-"}</td>
                        <td>
                          <Link href="/desktop/requests">
                            <Icon name="chevron" size={16} className="action-arrow" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <>
                    <tr>
                      <td>
                        <div className="type-cell">
                          <span className="type-icon leave">
                            <Icon name="leave" size={15} />
                          </span>
                          ลาพักร้อน
                        </div>
                      </td>
                      <td>15/10/2569</td>
                      <td>15/10 - 16/10/2569</td>
                      <td>2 วัน</td>
                      <td>
                        <span className="pill green">อนุมัติแล้ว</span>
                      </td>
                      <td>ไปเที่ยวกับครอบครัว</td>
                      <td>
                        <Icon name="chevron" size={16} className="action-arrow" />
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="type-cell">
                          <span className="type-icon ot">
                            <Icon name="ot" size={15} />
                          </span>
                          ขอ OT
                        </div>
                      </td>
                      <td>10/10/2569</td>
                      <td>10/10/2569</td>
                      <td>3 ชม.</td>
                      <td>
                        <span className="pill blue">รอดำเนินการ</span>
                      </td>
                      <td>งานเร่งด่วน</td>
                      <td>
                        <Icon name="chevron" size={16} className="action-arrow" />
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="type-cell">
                          <span className="type-icon time">
                            <Icon name="time" size={15} />
                          </span>
                          ขอแก้ไขเวลา
                        </div>
                      </td>
                      <td>08/10/2569</td>
                      <td>08/10/2569</td>
                      <td>-</td>
                      <td>
                        <span className="pill orange">รออนุมัติ</span>
                      </td>
                      <td>ลืมตอกบัตร</td>
                      <td>
                        <Icon name="chevron" size={16} className="action-arrow" />
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="type-cell">
                          <span className="type-icon med">
                            <Icon name="med" size={15} />
                          </span>
                          เบิกค่ารักษา
                        </div>
                      </td>
                      <td>01/09/2569</td>
                      <td>-</td>
                      <td>1,200 บาท</td>
                      <td>
                        <span className="pill green">อนุมัติแล้ว</span>
                      </td>
                      <td>ค่ารักษาพยาบาล</td>
                      <td>
                        <Icon name="chevron" size={16} className="action-arrow" />
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Col 2: ประกาศ / ข่าวสาร */}
        <section className="section-container" style={{ marginBottom: 0 }}>
          <div className="section-head">
            <div className="section-title">
              <Icon name="megaphone" size={20} />
              <span>ประกาศ / ข่าวสาร</span>
            </div>
            <Link href="/desktop/announcements" className="link-detail">
              ดูทั้งหมด &rarr;
            </Link>
          </div>

          <div className="ann-list">
            {announcements.length > 0 ? (
              announcements.slice(0, 4).map((anno, index) => {
                const iconClass =
                  index % 3 === 0 ? "p1" : index % 3 === 1 ? "p2" : "p3";
                return (
                  <div key={anno.id} className="ann-item">
                    <div className={"ann-icon " + iconClass}>
                      <Icon name="megaphone" size={18} />
                    </div>
                    <div className="ann-body">
                      <div className="ann-title">{anno.title || "ประกาศจากบริษัท"}</div>
                      <div className="ann-desc">{anno.content}</div>
                    </div>
                    <div className="ann-date">
                      {anno.publishedAt ? thaiDate(anno.publishedAt) : ""}
                    </div>
                  </div>
                );
              })
            ) : (
              <>
                <div className="ann-item">
                  <div className="ann-icon p1">
                    <Icon name="megaphone" size={18} />
                  </div>
                  <div className="ann-body">
                    <div className="ann-title">ประกาศวันหยุดพิเศษประจำปี 2569</div>
                    <div className="ann-desc">
                      บริษัทฯ กำหนดวันหยุดพิเศษเพิ่มเติมในวันที่ 23 ตุลาคม 2569
                    </div>
                  </div>
                  <div className="ann-date">10/10/2569</div>
                </div>

                <div className="ann-item">
                  <div className="ann-icon p2">
                    <Icon name="calendar" size={18} />
                  </div>
                  <div className="ann-body">
                    <div className="ann-title">เปลี่ยนแปลงเวลาทำงาน</div>
                    <div className="ann-desc">ตั้งแต่วันที่ 1 พฤศจิกายน 2569 เป็นต้นไป</div>
                  </div>
                  <div className="ann-date">08/10/2569</div>
                </div>

                <div className="ann-item">
                  <div className="ann-icon p3">
                    <Icon name="audit" size={18} />
                  </div>
                  <div className="ann-body">
                    <div className="ann-title">ตรวจสุขภาพประจำปี 2569</div>
                    <div className="ann-desc">
                      ขอเชิญพนักงานทุกคนเข้ารับการตรวจสุขภาพประจำปี
                    </div>
                  </div>
                  <div className="ann-date">25/09/2569</div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
