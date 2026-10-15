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
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  baht,
  bangkokDateKey,
  dayLabel,
  greeting,
  inProgressRequests,
  leaveTone,
  longThaiDate,
  teamLeaveThisWeek,
  weekRange,
} from "./dashboard-view";
import { thaiDate, thaiDateRange } from "./ui/format";
import { Icon, type IconName } from "./ui/icons";
import { EmptyState, ErrorState, LoadingState, PageHead, SectionHead, toneClass, type Tone } from "./ui/kit";

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

async function optional<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

function Ring({ remaining, quota }: { readonly remaining: number; readonly quota: number }) {
  const radius = 32;
  const length = 2 * Math.PI * radius;
  const ratio = quota > 0 ? Math.max(0, Math.min(1, remaining / quota)) : 0;
  return (
    <span className="ck-ring-svg" aria-hidden="true">
      <svg viewBox="0 0 76 76" width="76" height="76">
        <circle cx="38" cy="38" r={radius} fill="none" stroke="#eef0f3" strokeWidth="8" />
        <circle
          cx="38"
          cy="38"
          r={radius}
          fill="none"
          stroke="var(--tc)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${length * ratio} ${length}`}
        />
      </svg>
      <b>{dayLabel(remaining)}</b>
    </span>
  );
}

export default function DesktopDashboardPage() {
  const [state, setState] = useState<State>({ status: "loading" });

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
          ? optional<LeaveCalendarView>(`/api/management/calendar?from=${week.from}&to=${week.to}`)
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
  const firstName = data.profile?.nickname || data.profile?.fullName.split(/\s+/)[0] || "";
  const entitlements = data.leave?.entitlements ?? [];
  const totalRemaining = entitlements.reduce((sum, entitlement) => sum + entitlement.remaining, 0);
  const progress = inProgressRequests(data.requests?.requests ?? []);
  const team = teamLeaveThisWeek(data.team?.items ?? [], data.session.employeeId, todayKey);
  const announcements = data.announcements?.announcements ?? [];
  const quick: { href: string; label: string; hint: string; icon: IconName; tone: Tone; show: boolean }[] = [
    { href: "/desktop/leave", label: "ขอลางาน", hint: "พักร้อน ป่วย กิจ", icon: "leave", tone: "leave", show: Boolean(nav.leave) },
    { href: "/desktop/overtime", label: "ขอทำ OT", hint: "บันทึกล่วงเวลา", icon: "ot", tone: "ot", show: Boolean(nav.overtime) },
    { href: "/desktop/time-correction", label: "แก้ไขเวลา", hint: "ลืมสแกนเข้าออก", icon: "time", tone: "time", show: Boolean(nav.attendance) },
    {
      href: "/desktop/medical",
      label: "เบิกค่ารักษา",
      hint: data.medical ? `เหลือ ${baht(data.medical.entitlement.remaining)} บาท` : "ค่ารักษาพยาบาล",
      icon: "med",
      tone: "med",
      show: Boolean(nav.medical),
    },
  ];

  return (
    <>
      <PageHead
        tone="accent"
        icon="sun"
        title={`${greeting(now)} ${firstName}`.trim()}
        subtitle={
          longThaiDate(todayKey) +
          (data.leave ? ` ปีนี้คุณยังมีวันลาเหลือ ${dayLabel(totalRemaining)} วัน` : "")
        }
      >
        {nav.attendance ? (
          <Link className="ck-btn ok" href="/desktop/attendance">
            <Icon name="pin" size={16} />
            ลงเวลาเข้างาน
          </Link>
        ) : null}
      </PageHead>

      <div className="ck-wrap ck-stack">
        {quick.some((entry) => entry.show) ? (
          <div className="ck-qgrid">
            {quick
              .filter((entry) => entry.show)
              .map((entry) => (
                <Link key={entry.href} href={entry.href} className={"ck-qa " + toneClass(entry.tone)}>
                  <span className="ck-chip">
                    <Icon name={entry.icon} />
                  </span>
                  <span>
                    <b>{entry.label}</b>
                    <small>{entry.hint}</small>
                  </span>
                  <Icon name="chevron" size={16} />
                </Link>
              ))}
          </div>
        ) : null}

        {entitlements.length > 0 ? (
          <div className="ck-rgrid">
            {entitlements.map((entitlement) => {
              const tone = leaveTone(entitlement.leaveTypeKey);
              return (
                <div key={entitlement.entitlementId} className={"ck-ring " + toneClass(tone)}>
                  <Ring remaining={entitlement.remaining} quota={entitlement.quota} />
                  <span>
                    <b className="t">{entitlement.leaveTypeName}</b>
                    <small>
                      เหลือ {dayLabel(entitlement.remaining)} จาก {dayLabel(entitlement.quota)} วัน
                    </small>
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="ck-two">
          {nav.requestStatus ? (
            <section className="ck-panel ck-c-leave" aria-labelledby="dash-progress">
              <SectionHead title="คำขอที่กำลังดำเนินการ" id="dash-progress" count={progress.length} />
              {progress.length === 0 ? (
                <EmptyState title="ไม่มีคำขอที่กำลังดำเนินการ">คำขอที่ส่งแล้วและรอผลจะแสดงที่นี่</EmptyState>
              ) : (
                <div className="ck-flist">
                  {progress.slice(0, 6).map((request) => {
                    const kind = KIND[request.kind];
                    const back = request.status === "REVISION_REQUESTED";
                    return (
                      <Link key={request.id} href={"/desktop/requests"} className={"ck-fitem " + toneClass(kind.tone)}>
                        <span className="ck-chip">
                          <Icon name={kind.icon} />
                        </span>
                        <span>
                          <b>{request.summary}</b>
                          <small>
                            {kind.label}
                            {back && request.decisionReason ? ` ${request.decisionReason}` : ""}
                            {!back && request.stepOrder ? ` ขั้นที่ ${request.stepOrder}` : ""}
                          </small>
                        </span>
                        <span className={"ck-pill " + (back ? "back" : "wait")}>{back ? "รอแก้ไข" : "รออนุมัติ"}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          {nav.calendar ? (
            <section className="ck-panel ck-c-biz" aria-labelledby="dash-team">
              <SectionHead title="ทีมของฉันสัปดาห์นี้" id="dash-team">
                <Link className="ck-more ck-ml" href="/desktop/calendar">
                  ดูปฏิทิน
                  <Icon name="chevron" size={14} />
                </Link>
              </SectionHead>
              {team.length === 0 ? (
                <EmptyState title="สัปดาห์นี้ไม่มีใครลา">การลาของเพื่อนร่วมงานที่อนุมัติแล้วจะแสดงที่นี่</EmptyState>
              ) : (
                <div className="ck-flist">
                  {team.slice(0, 6).map((entry) => (
                    <div key={entry.id} className="ck-fitem ck-c-biz">
                      <span className="ck-av">{entry.employeeName.slice(0, 1)}</span>
                      <span>
                        <b>{entry.employeeName}</b>
                        <small>
                          {entry.leaveType} {entry.today ? "วันนี้" : thaiDateRange(entry.startDate, entry.endDate)}
                        </small>
                      </span>
                      <span className="dot" />
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </div>

        {nav.announcements ? (
          <section className="ck-panel ck-c-med" aria-labelledby="dash-news">
            <SectionHead title="ประกาศจากบริษัท" id="dash-news">
              {nav.announcementAdmin ? (
                <Link className="ck-btn quiet ck-ml" href="/desktop/announcements/manage">
                  จัดการประกาศ
                </Link>
              ) : null}
            </SectionHead>
            {announcements.length === 0 ? (
              <EmptyState title="ยังไม่มีประกาศ">ประกาศจากบริษัทจะแสดงที่นี่</EmptyState>
            ) : (
              <div className="ck-agrid3">
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
    </>
  );
}
