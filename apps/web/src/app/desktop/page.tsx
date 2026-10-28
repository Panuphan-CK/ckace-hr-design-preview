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
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";

import {
  baht,
  bangkokDateKey,
  dayLabel,
  inProgressRequests,
  leaveTone,
  teamLeaveThisWeek,
  weekRange,
} from "./dashboard-view";
import { thaiDate, thaiDateRange } from "./ui/format";
import { Icon, type IconName } from "./ui/icons";
import { DashboardCalendar } from "./dashboard-calendar";
import { DashboardLocalCompany, DashboardLocalFilter, DashboardLocalPreview } from "./dashboard-local-preview";
import { EmptyState, ErrorState, LoadingState, StatusDot, toneClass, type Tone } from "./ui/kit";

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

const KIND: Readonly<Record<UnifiedRequestKind, { label: string; icon: IconName; tone: Tone }>> = {
  LEAVE: { label: "การลา", icon: "leave", tone: "leave" },
  OVERTIME: { label: "ทำงานล่วงเวลา", icon: "ot", tone: "ot" },
  TIME_CORRECTION: { label: "แก้ไขเวลา", icon: "time", tone: "time" },
  MEDICAL: { label: "ค่ารักษาพยาบาล", icon: "med", tone: "med" },
};

const ANNOUNCEMENT_TONES: readonly Tone[] = ["leave", "med", "ot"];

interface KpiCardProps {
  readonly icon: IconName;
  readonly tone: Tone;
  readonly title: string;
  readonly badge: string;
  readonly description: string;
  readonly usedPercent: number;
  readonly usedLabel: string;
  readonly remainingLabel: string;
  readonly value: string;
  readonly valueUnit: string;
  readonly sample: boolean;
}

function percent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function KpiCard({
  icon,
  tone,
  title,
  badge,
  description,
  usedPercent,
  usedLabel,
  remainingLabel,
  value,
  valueUnit,
  sample,
}: KpiCardProps) {
  return (
    <article className={"sh-kpi-card " + toneClass(tone)} data-tone={tone}>
      {sample ? <span className="sh-kpi-sample">* ข้อมูลตัวอย่าง</span> : null}
      <header className="sh-new-kpi-header">
        <span className="sh-new-kpi-icon" aria-hidden="true"><Icon name={icon} size={21} /></span>
        <div className="sh-new-kpi-copy">
          <b className="sh-kpi-english">{({ leave: "VACATION", sick: "SICK LEAVE", biz: "PERSONAL LEAVE", med: "MEDICAL BENEFIT", accent: "REQUESTS" } as Partial<Record<Tone, string>>)[tone] ?? "LEAVE"}</b>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span className="sh-kpi-badge">{badge}</span>
      </header>
      <div className="sh-kpi-progress-block">
        <div
          className="sh-kpi-progress"
          role="progressbar"
          aria-label={title + " สัดส่วนการใช้"}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={usedPercent}
          aria-valuetext={usedLabel + ", " + remainingLabel}
          style={{ "--sh-kpi-used": usedPercent + "%" } as CSSProperties}
        >
          <span />
        </div>
        <div className="sh-kpi-progress-labels">
          <span>{usedLabel}</span>
          <span>{remainingLabel}</span>
        </div>
      </div>
      <div className="sh-kpi-value">
        <strong>{value}</strong>
        <span>{valueUnit}</span>
      </div>
    </article>
  );
}
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
  const [localPreview, setLocalPreview] = useState(false);

  useEffect(() => {
    setLocalPreview(process.env.NODE_ENV === "development" && ["localhost", "127.0.0.1"].includes(window.location.hostname) && new URLSearchParams(window.location.search).get("syntheticPreview") === "1");
  }, []);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const sessionResponse = await fetch("/api/security/session", { credentials: "same-origin", cache: "no-store" });
      if (!sessionResponse.ok) throw new Error("ไม่สามารถตรวจสอบสิทธิ์การใช้งานได้ กรุณาเข้าสู่ระบบใหม่");
      const session = (await sessionResponse.json()) as Session;
      const nav = session.navigation;
      const today = bangkokDateKey(new Date());
      const week = weekRange(today);
      const [profile, leave, medical, requests, team, announcements] = await Promise.all([
        nav.profile ? optional<SelfProfileResponse>("/api/profile/me") : Promise.resolve(null),
        nav.leave ? optional<LeaveSelfOverview>("/api/leave/me") : Promise.resolve(null),
        nav.medical ? optional<MedicalSelfOverview>("/api/medical/me") : Promise.resolve(null),
        nav.requestStatus ? optional<RequestStatusOverview>("/api/requests/me") : Promise.resolve(null),
        nav.calendar
          ? optional<LeaveCalendarView>("/api/management/calendar?from=" + week.from + "&to=" + week.to)
          : Promise.resolve(null),
        nav.announcements ? optional<AnnouncementListResult>("/api/announcements") : Promise.resolve(null),
      ]);
      setState({ status: "ready", data: { session, profile, leave, medical, requests, team, announcements } });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "ไม่สามารถโหลดหน้าหลักได้" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const now = useMemo(() => new Date(), []);
  const todayKey = bangkokDateKey(now);

  if (state.status === "loading") return <LoadingState title="กำลังโหลดหน้าหลัก" />;
  if (state.status === "error") return <ErrorState title="เปิดหน้าหลักไม่สำเร็จ" message={state.message} onRetry={() => void load()} />;

  const { data } = state;
  const nav = data.session.navigation;
  const entitlements = data.leave?.entitlements ?? [];
  const validEntitlements = entitlements.filter((item) => item.quota > 0);
  const openRequests = inProgressRequests(data.requests?.requests ?? []);
  const allRequests = data.requests?.requests ?? [];
  const closedRequestCount = Math.max(0, allRequests.length - openRequests.length);
  const closedRequestPercent = allRequests.length > 0 ? percent((closedRequestCount / allRequests.length) * 100) : 0;
  const teamLeave = teamLeaveThisWeek(data.team?.items ?? [], data.session.employeeId, todayKey);
  const announcements = data.announcements?.announcements ?? [];
  const isLead = Boolean(nav.approvals || nav.managementAdmin || nav.reports || nav.admin);
  const kpiCount = validEntitlements.length + (data.medical && data.medical.entitlement.annualLimit > 0 ? 1 : 0) + (allRequests.length > 0 ? 1 : 0);

  const kpiCards = kpiCount > 0 ? (
          <div className="sh-kpi-grid">
            {validEntitlements.map((entitlement) => {
              const tone = leaveTone(entitlement.leaveTypeKey);
              const usedPercent = entitlement.quota > 0 ? percent((entitlement.used / entitlement.quota) * 100) : 0;
              const remainingPercent = entitlement.quota > 0 ? percent((entitlement.remaining / entitlement.quota) * 100) : 0;
              return (
                <KpiCard
                  key={entitlement.entitlementId}
                  icon="leave"
                  sample={localPreview}
                  tone={tone}
                  title={entitlement.leaveTypeName}
                  badge="สิทธิปีนี้"
                  description={"ใช้แล้ว " + dayLabel(entitlement.used) + " วัน · รออนุมัติ " + dayLabel(entitlement.pending) + " วัน"}
                  usedPercent={usedPercent}
                  usedLabel={usedPercent + "% ใช้แล้ว"}
                  remainingLabel={remainingPercent + "% เหลือ"}
                  value={dayLabel(entitlement.remaining)}
                  valueUnit="วันคงเหลือ"
                />
              );
            })}
            {data.medical && data.medical.entitlement.annualLimit > 0 ? (() => {
              const { annualLimit, approved, committed, remaining } = data.medical.entitlement;
              const pendingAmount = Math.max(committed - approved, 0);
              const usedPercent = percent((approved / annualLimit) * 100);
              const remainingPercent = percent((remaining / annualLimit) * 100);
              return (
                <KpiCard
                  icon="med"
                  sample={localPreview}
                  tone="med"
                  title="วงเงินค่ารักษา"
                  badge="วงเงินต่อปี"
                  description={"อนุมัติแล้ว ฿" + baht(approved) + " · รอพิจารณา ฿" + baht(pendingAmount)}
                  usedPercent={usedPercent}
                  usedLabel={usedPercent + "% อนุมัติแล้ว"}
                  remainingLabel={remainingPercent + "% เหลือ"}
                  value={"฿" + baht(remaining)}
                  valueUnit="วงเงินคงเหลือ"
                />
              );
            })() : null}
            {allRequests.length > 0 ? (
              <KpiCard
                icon="document"
                sample={localPreview}
                tone="accent"
                title="คำขอของฉัน"
                badge={allRequests.length + " รายการ"}
                description={"ทั้งหมด " + allRequests.length + " คำขอ · ทุกประเภท"}
                usedPercent={closedRequestPercent}
                usedLabel={closedRequestPercent + "% ปิดแล้ว"}
                remainingLabel={100 - closedRequestPercent + "% กำลังดำเนินการ"}
                value={String(openRequests.length)}
                valueUnit="รายการคงค้าง"
              />
            ) : null}
          </div>
        ) : (
          <div className="sh-kpi-empty">
            <EmptyState title="ยังไม่มีข้อมูลตัวชี้วัด">ข้อมูลสิทธิและคำขอจะแสดงเมื่อระบบมีข้อมูลที่บัญชีนี้เข้าถึงได้</EmptyState>
          </div>
        );

  const overviewPanels = nav.requestStatus || nav.calendar ? (
    <div className="sh-overview-secondary">
          {nav.requestStatus ? (
            <section className="ck-panel sh-overview-panel sh-board-work" aria-labelledby="dash-progress">
              <header className="sh-framed-heading sh-panel-heading">
                <span className="sh-section-icon sh-section-icon-violet" aria-hidden="true"><Icon name="document" size={18} /></span>
                <div>
                  <h2 id="dash-progress">งานและคำขอของฉัน</h2>
                  <p>สถานะล่าสุดที่ต้องติดตาม</p>
                </div>
                <span className="sh-section-count">{localPreview ? "* ข้อมูลตัวอย่าง" : `${openRequests.length} ค้าง`}</span>
              </header>
              {openRequests.length === 0 ? (
                <EmptyState title="ไม่มีคำขอที่กำลังดำเนินการ">คำขอที่ส่งแล้วและรอผลจะแสดงที่นี่</EmptyState>
              ) : (
                <div className="ck-flist sh-overview-list">
                  {openRequests.slice(0, 6).map((request) => {
                    const kind = KIND[request.kind];
                    const needsEdit = request.status === "REVISION_REQUESTED";
                    return (
                      <Link key={request.id} href="/desktop/requests" className={"ck-fitem " + toneClass(kind.tone)}>
                        <span className="ck-chip"><Icon name={kind.icon} /></span>
                        <span>
                          <b>{request.summary}</b>
                          <small>
                            {kind.label}
                            {needsEdit && request.decisionReason ? " · " + request.decisionReason : ""}
                            {!needsEdit && request.stepOrder ? " · ขั้นที่ " + request.stepOrder : ""}
                          </small>
                        </span>
                        <StatusDot tone={needsEdit ? "back" : "wait"} label={needsEdit ? "ส่งกลับให้แก้ไข" : "รออนุมัติ"} />
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          {nav.calendar ? (
            <section className="ck-panel sh-overview-panel sh-board-team sh-team-requests" aria-labelledby="dash-team">
              <header className="sh-framed-heading sh-panel-heading">
                <span className="sh-section-icon sh-section-icon-green" aria-hidden="true"><Icon name="calendar" size={18} /></span>
                <div>
                  <h2 id="dash-team">TEAM LEAVE</h2>
                  <p>{isLead ? "วันลาของทีม" : "ทีมของฉันสัปดาห์นี้"}</p>
                </div>
                <span className="sh-section-count">{localPreview ? "* ข้อมูลตัวอย่าง" : `${teamLeave.length} คน`}</span>
              </header>
              {teamLeave.length === 0 ? (
                <EmptyState title="สัปดาห์นี้ไม่มีใครลา">รายการลาที่อนุมัติแล้วจะแสดงที่นี่</EmptyState>
              ) : (
                <div className="ck-flist sh-overview-list">
                  {teamLeave.slice(0, 6).map((entry) => (
                    <div key={entry.id} className="ck-fitem ck-c-biz">
                      <span className="ck-av">{entry.employeeName.slice(0, 1)}</span>
                      <span>
                        <b>{entry.employeeName}</b>
                        <small>{entry.leaveType} · {entry.today ? "วันนี้" : thaiDateRange(entry.startDate, entry.endDate)}</small>
                      </span>
                      <span className="sh-team-leave-mark" aria-label="อนุมัติแล้ว"><Icon name="check" size={14} /></span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}
    </div>
  ) : null;

  return (
    <div className="ck-wrap ck-stack ck-home sh-dashboard">
      <section className="sh-overview-section" aria-labelledby="dashboard-kpis">
        <header className="sh-framed-heading sh-dashboard-heading">
          <span className="sh-section-icon sh-section-icon-blue" aria-hidden="true"><Icon name="dashboard" size={18} /></span>
          <div>
            <h1 id="dashboard-kpis">{isLead ? "แดชบอร์ดผู้ดูแล" : "แดชบอร์ดพนักงาน"}</h1>
          </div>
          {localPreview ? <DashboardLocalFilter year={todayKey.slice(0, 4)} /> : null}
        </header>
        {localPreview ? <DashboardLocalPreview requests={data.requests} afterKpis={overviewPanels}>{kpiCards}</DashboardLocalPreview> : <>{kpiCards}{overviewPanels}</>}
      </section>

      {nav.calendar ? <DashboardCalendar todayKey={todayKey} holidays={data.leave?.holidays ?? []} preview={localPreview} /> : null}

      {localPreview && nav.announcements ? <DashboardLocalCompany announcements={data.announcements} /> : null}

      {nav.announcements && !localPreview ? (
        <section className="ck-panel sh-overview-panel sh-announcements sh-board-news" aria-labelledby="dash-news">
          <header className="sh-framed-heading sh-panel-heading">
            <span className="sh-section-icon sh-section-icon-coral" aria-hidden="true"><Icon name="megaphone" size={18} /></span>
            <div>
              <h2 id="dash-news">ข่าวสารจากบริษัท</h2>
              <p>ประกาศที่บัญชีนี้มีสิทธิ์เห็น</p>
            </div>
            <span className="sh-section-count">{announcements.length} ข่าว</span>
          </header>
          {announcements.length === 0 ? (
            <EmptyState title="ยังไม่มีประกาศ">ประกาศที่เผยแพร่จะแสดงที่นี่</EmptyState>
          ) : (
            <div className="sh-announcement-grid">
              {announcements.slice(0, 3).map((announcement, index) => (
                <article key={announcement.id} className={"ck-anno " + toneClass(ANNOUNCEMENT_TONES[index % ANNOUNCEMENT_TONES.length] ?? "leave")}>
                  <span className="tag">
                    {announcement.scope === "GLOBAL" ? "ทั่วไป" : announcement.scope === "AGENCY" ? "หน่วยงาน" : "ฝ่าย"}
                  </span>
                  <h3>{announcement.title || "ประกาศ"}</h3>
                  <p>{announcement.content}</p>
                  <small>{announcement.publishedAt ? thaiDate(announcement.publishedAt) : ""}</small>
                </article>
              ))}
            </div>
          )}
        </section>
          ) : null}

    </div>
  );
}
