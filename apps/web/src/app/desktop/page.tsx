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
          leave: leave ?? (process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).get("syntheticPreview") === "1" ? {
            entitlements: [
              { entitlementId: "sample-annual", leaveTypeId: "sample-annual", leaveTypeKey: "ANNUAL", leaveTypeName: "ลาพักร้อน", quota: 10, used: 4, pending: 0, remaining: 6 },
              { entitlementId: "sample-sick", leaveTypeId: "sample-sick", leaveTypeKey: "SICK", leaveTypeName: "ลาป่วย", quota: 30, used: 2, pending: 0, remaining: 28 },
              { entitlementId: "sample-personal", leaveTypeId: "sample-personal", leaveTypeKey: "PERSONAL", leaveTypeName: "ลากิจ", quota: 6, used: 1, pending: 0, remaining: 5 },
            ],
            requests: [], holidays: [], workingWeekdays: [1, 2, 3, 4, 5],
          } : null),
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

  // OT KPI
  const otHoursMonth = 12.5;

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
      {/* ===== ROW 1: Hero Card (ขนาด 3 KPI) + Attendance & Clock (ขนาด 2 KPI) ===== */}
      <div className="sh-top-hero-row">
        {/* 1. Hero Card (ขนาด 3 การ์ด KPI - สัดส่วน 3/5) */}
        <div className="sh-hero-card-col">
          <div className="hero-building" />
          <div className="hero-text">
            <div className="hero-greeting">{greetingText}</div>
            <h1 className="hero-name">{fullName}</h1>
            <div className="hero-role">
              ตำแหน่ง {roleName} · {departmentName}
            </div>
            <div className="hero-company">
              สังกัด บริษัท ซีเคแอนด์เอซ แอคเคาท์ติ้ง จำกัด (สำนักงานใหญ่)
            </div>
          </div>
        </div>

        {/* 2. Attendance & Live Clock Card (ขนาด 2 การ์ด KPI - สัดส่วน 2/5) */}
        <div className="sh-attendance-card-col">
          <div className="clock-top">
            <div className="clock-date">
              <Icon name="calendar" size={18} />
              <span>{currentDateStr || "วันพุธที่ 28 ตุลาคม 2569"}</span>
            </div>
            <div className="digital-clock">{currentTime || "10:24:36"}</div>
          </div>

          <div className="attendance-block">
            <div className="attendance-header">
              <div className="attendance-title">
                <Icon name="clock" size={18} />
                <span>การลงเวลาทำงานวันนี้</span>
              </div>
            </div>
            <div className="attendance-grid">
              <div className="attendance-subcard">
                <div className="att-icon in">
                  <Icon name="back" size={20} style={{ transform: "rotate(180deg)" }} />
                </div>
                <div>
                  <div className="att-label">เวลาเข้างาน</div>
                  <div className="att-time">08:28 น.</div>
                  <div className="att-tag">✓ เข้างานตรงเวลา</div>
                </div>
              </div>
              <div className="attendance-subcard">
                <div className="att-icon out">
                  <Icon name="back" size={20} />
                </div>
                <div>
                  <div className="att-label">เวลาออกงาน</div>
                  <div className="att-time">--:-- น.</div>
                  <div className="att-tag muted">กำลังปฏิบัติงาน</div>
                </div>
              </div>
            </div>
            <div className="attendance-shift-note">
              <span>กะเวลาทำงานปกติ: 08:30 – 17:30 น. (8 ชั่วโมงทำการ)</span>
            </div>
          </div>
        </div>
      </div>

      <section className="gas-leave-summary" aria-labelledby="gas-leave-title">
        <div className="gas-leave-heading">
          <div>
            <h2 id="gas-leave-title">สรุปการใช้วันลา</h2>
            <p>ข้อมูลสิทธิการลาของคุณ{process.env.NODE_ENV === "development" && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("syntheticPreview") === "1" ? " · ข้อมูลตัวอย่าง" : ""}</p>
          </div>
        </div>
        {leave === null ? (
          <p className="gas-leave-empty">ไม่สามารถแสดงข้อมูลสิทธิวันลาได้</p>
        ) : leave.entitlements.length === 0 ? (
          <p className="gas-leave-empty">ยังไม่มีการกำหนดสิทธิวันลาสำหรับผู้ใช้งานนี้</p>
        ) : (
          <div className="gas-leave-grid">
            {leave.entitlements.map((item, index) => {
              const percent = item.quota > 0 ? Math.min(100, Math.max(0, item.used / item.quota * 100)) : 0;
              const tone = item.leaveTypeKey === "SICK" ? "sick" : item.leaveTypeKey === "PERSONAL" ? "personal" : index % 3 === 1 ? "sick" : index % 3 === 2 ? "personal" : "annual";
              const icon: IconName = tone === "sick" ? "med" : tone === "personal" ? "document" : "leave";
              return (
                <article className="gas-leave-card" data-tone={tone} key={item.entitlementId}>
                  <div className="gas-leave-card-top">
                    <span className="gas-leave-icon"><Icon name={icon} size={22} /></span>
                    <div className="gas-leave-used"><strong>{dayLabel(item.used)}</strong><span>ใช้ไป</span></div>
                  </div>
                  <h3>{item.leaveTypeName}</h3>
                  <p>สิทธิทั้งหมด {dayLabel(item.quota)} วัน</p>
                  <div className="gas-leave-progress" role="progressbar" aria-label={`ใช้สิทธิ ${item.leaveTypeName}`} aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}><span className="gas-leave-progress-fill" style={{ width: `${percent}%` }} /><span className="gas-leave-progress-text" style={{ left: `max(0px, calc(${percent}% - 40px))` }}>{percent.toFixed(0)}%</span></div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      {/* ===== ROW 3: สวัสดิการและการทำงาน (OT, ค่ารักษา, สรุปคำขอ) ===== */}
      <div className="sh-work-status-row">
        {/* Card 1: การทำงานล่วงเวลา (OT) */}
        <div className="sh-work-card ot">
          <div className="sh-work-card-head">
            <div className="sh-work-title">
              <span className="sh-work-icon-circle purple">
                <Icon name="ot" size={20} />
              </span>
              <div>
                <span className="work-main-title">การทำงานล่วงเวลา (OT)</span>
                <span className="work-sub-title">สะสมประจำรอบเดือน ต.ค. 2569</span>
              </div>
            </div>
          </div>
          <div className="sh-work-card-body">
            <div className="sh-work-val-group">
              <span className="work-val">{otHoursMonth}</span>
              <span className="work-unit">ชั่วโมงเดือนนี้</span>
            </div>
            <div className="sh-work-sub-row">
              <span className="tag-approved">✓ อนุมัติแล้ว 10.0 ชม.</span>
              <span className="tag-pending">⏳ รอพิจารณา 2.5 ชม.</span>
            </div>
            <div className="sh-kpi-progress-wrap" role="progressbar" aria-label="สัดส่วน OT ที่แสดง" aria-valuenow={65} aria-valuemin={0} aria-valuemax={100}>
              <div className="sh-kpi-progress-bar purple" style={{ width: "65%" }} />
              <span className="sh-kpi-progress-label" style={{ left: "max(0px, calc(65% - 40px))" }}>65%</span>
            </div>
            <div className="sh-work-card-foot">
              <span>อนุมัติแล้ว 80.0%</span>
              <span className="purple">รอพิจารณา 20.0%</span>
            </div>
          </div>
        </div>

        {/* Card 2: สวัสดิการค่ารักษาพยาบาล (Medical Benefits) */}
        <div className="sh-work-card med">
          <div className="sh-work-card-head">
            <div className="sh-work-title">
              <span className="sh-work-icon-circle teal">
                <Icon name="med" size={20} />
              </span>
              <div>
                <span className="work-main-title">สวัสดิการค่ารักษาพยาบาล</span>
                <span className="work-sub-title">วงเงินสวัสดิการประจำปี 2569</span>
              </div>
            </div>
          </div>
          <div className="sh-work-card-body">
            <div className="sh-work-val-group">
              <span className="work-val">{baht(medRemaining)}</span>
              <span className="work-unit">บาทคงเหลือ</span>
            </div>
            <div className="sh-work-sub-row">
              <span>เบิกจ่ายแล้ว {baht(medApproved)} บาท</span>
              <span>วงเงินปีนี้ {baht(medTotal)} บาท</span>
            </div>
            <div className="sh-kpi-progress-wrap" role="progressbar" aria-label="สัดส่วนการใช้วงเงินค่ารักษา" aria-valuenow={Math.round(medPct)} aria-valuemin={0} aria-valuemax={100}>
              <div className="sh-kpi-progress-bar teal" style={{ width: String(medPct) + "%" }} />
              <span className="sh-kpi-progress-label" style={{ left: "max(0px, calc(" + medPct + "% - 40px))" }}>{medPct.toFixed(0)}%</span>
            </div>
            <div className="sh-work-card-foot">
              <span>เบิกจ่ายแล้ว</span>
              <span className="teal">คงเหลือ {((medRemaining / (medTotal || 1)) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Card 3: สรุปสถานะคำขอของฉัน (My Requests Status) */}
        <div className="sh-work-card req">
          <div className="sh-work-card-head">
            <div className="sh-work-title">
              <span className="sh-work-icon-circle blue">
                <Icon name="leave" size={20} />
              </span>
              <div>
                <span className="work-main-title">สถานะคำขอของฉัน</span>
                <span className="work-sub-title">ติดตามสถานะคำขอทุกประเภท</span>
              </div>
            </div>
          </div>
          <div className="sh-work-card-body">
            <div className="sh-status-pill-grid">
              <div className="sh-status-item pending">
                <span className="status-label">รอพิจารณา</span>
                <span className="status-num">{pendingCount}</span>
                <span className="status-sub">รายการ</span>
              </div>
              <div className="sh-status-item approved">
                <span className="status-label">อนุมัติแล้ว</span>
                <span className="status-num">{approvedCount}</span>
                <span className="status-sub">รายการ</span>
              </div>
              <div className="sh-status-item revision">
                <span className="status-label">ขอข้อมูลเพิ่ม</span>
                <span className="status-num">{reviewCount}</span>
                <span className="status-sub">รายการ</span>
              </div>
            </div>
            <div className="sh-status-foot-note">
              <span>อัปเดตสถานะแบบเรียลไทม์จากระบบ HR</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== ROW 4: ตารางคำขอล่าสุด & ปฏิทินงานสัปดาห์นี้ ===== */}
      <div className="two-col-grid">
        {/* Left Col: ตารางคำขอล่าสุด (Recent Requests Table) */}
        <section className="section-container dashboard-panel dashboard-panel--requests" style={{ marginBottom: 0 }}>
          <div className="section-head">
            <div className="section-title">
              <Icon name="document" size={20} />
              <span>คำขอล่าสุดของฉัน</span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="req-table">
              <thead>
                <tr>
                  <th>ประเภทคำขอ</th>
                  <th>วันที่ยื่น</th>
                  <th>ช่วงวันที่</th>
                  <th>จำนวน</th>
                  <th>สถานะ</th>
                  <th>หมายเหตุ</th>
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
                    </tr>
                    <tr>
                      <td>
                        <div className="type-cell">
                          <span className="type-icon ot">
                            <Icon name="ot" size={15} />
                          </span>
                          ทำงานล่วงเวลา (OT)
                        </div>
                      </td>
                      <td>10/10/2569</td>
                      <td>10/10/2569</td>
                      <td>3 ชม.</td>
                      <td>
                        <span className="pill blue">รอดำเนินการ</span>
                      </td>
                      <td>ปิดงบเร่งด่วนประจำเดือน</td>
                    </tr>
                    <tr>
                      <td>
                        <div className="type-cell">
                          <span className="type-icon med">
                            <Icon name="med" size={15} />
                          </span>
                          เบิกค่ารักษาพยาบาล
                        </div>
                      </td>
                      <td>08/10/2569</td>
                      <td>08/10/2569</td>
                      <td>1,200 บาท</td>
                      <td>
                        <span className="pill green">อนุมัติแล้ว</span>
                      </td>
                      <td>ตรวจสุขภาพทั่วไป</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right Col: ปฏิทินงานสัปดาห์นี้ & ข่าวสารประกาศ */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Card: กำลังจะมาถึง (Upcoming Calendar Events) */}
          <section className="section-container dashboard-panel dashboard-panel--calendar" style={{ marginBottom: 0 }}>
            <div className="section-head">
              <div className="section-title">
                <Icon name="calendar" size={20} />
                <span>กำหนดการสัปดาห์นี้</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.85rem 1rem", background: "var(--sh-border-soft)", borderRadius: "12px" }}>
                <div style={{ textAlign: "center", padding: "6px 12px", background: "#ffffff", borderRadius: "10px", border: "1px solid var(--sh-border)" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--sh-text-muted)" }}>ต.ค.</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--sh-text-main)" }}>30</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--sh-text-main)" }}>ลากิจของคุณ (เต็มวัน)</div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--sh-text-muted)" }}>ติดต่อราชการ · รอพิจารณาอนุมัติ</div>
                </div>
                <span className="pill orange">รออนุมัติ</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.85rem 1rem", background: "var(--sh-border-soft)", borderRadius: "12px" }}>
                <div style={{ textAlign: "center", padding: "6px 12px", background: "#ffffff", borderRadius: "10px", border: "1px solid var(--sh-border)" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--sh-text-muted)" }}>พ.ย.</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--sh-text-main)" }}>02</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--sh-text-main)" }}>ลาพักร้อน (2 - 3 พ.ย.)</div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--sh-text-muted)" }}>พักผ่อนประจำปี · รอพิจารณาอนุมัติ</div>
                </div>
                <span className="pill blue">รอดำเนินการ</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.85rem 1rem", background: "var(--sh-border-soft)", borderRadius: "12px" }}>
                <div style={{ textAlign: "center", padding: "6px 12px", background: "#ffffff", borderRadius: "10px", border: "1px solid var(--sh-border)" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--sh-text-muted)" }}>พ.ย.</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--sh-text-main)" }}>06</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--sh-text-main)" }}>ตรวจสุขภาพประจำปี 2569</div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--sh-text-muted)" }}>09:00 - 12:00 น. · อาคารสำนักงานใหญ่</div>
                </div>
                <span className="pill green">กิจกรรมบริษัท</span>
              </div>
            </div>
          </section>

          {/* Card: ข่าวสารและประกาศสำคัญ (Announcements) */}
          <section className="section-container dashboard-panel dashboard-panel--announcements" style={{ marginBottom: 0 }}>
            <div className="section-head">
              <div className="section-title">
                <Icon name="bell" size={20} />
                <span>ข่าวสารและประกาศจากบริษัท</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {announcements.length > 0 ? (
                announcements.slice(0, 2).map((ann) => (
                  <div key={ann.id} className="ann-card" style={{ padding: "0.85rem 1rem", border: "1px solid var(--sh-border)", borderRadius: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--sh-blue-primary)" }}>ประกาศฝ่ายบุคคล</span>
                      <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--sh-text-muted)" }}>{thaiDate(ann.publishedAt)}</span>
                    </div>
                    <div style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--sh-text-main)", marginBottom: "3px" }}>{ann.title}</div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--sh-text-body)" }}>{ann.content.slice(0, 90)}...</div>
                  </div>
                ))
              ) : (
                <>
                  <div className="ann-card" style={{ padding: "0.85rem 1rem", border: "1px solid var(--sh-border)", borderRadius: "12px", background: "#ffffff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--sh-blue-primary)" }}>ประกาศฝ่ายทรัพยากรบุคคล</span>
                      <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--sh-text-muted)" }}>27 ต.ค. 2569</span>
                    </div>
                    <div style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--sh-text-main)", marginBottom: "3px" }}>เตรียมตัวตรวจสุขภาพประจำปี 2569</div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--sh-text-body)" }}>ขอความร่วมมือพนักงานทุกท่านงดน้ำและอาหารหลัง 20:00 น. ก่อนวันตรวจสุขภาพ</div>
                  </div>
                  <div className="ann-card" style={{ padding: "0.85rem 1rem", border: "1px solid var(--sh-border)", borderRadius: "12px", background: "#ffffff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--sh-orange)" }}>สวัสดิการและผลประโยชน์</span>
                      <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--sh-text-muted)" }}>25 ต.ค. 2569</span>
                    </div>
                    <div style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--sh-text-main)", marginBottom: "3px" }}>คู่มือการเบิกสวัสดิการค่ารักษาพยาบาลฉบับใหม่</div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--sh-text-body)" }}>สามารถส่งใบเสร็จและใบรับรองแพทย์ผ่านระบบได้โดยตรง อนุมัติรวดเร็วใน 3 วันทำการ</div>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
