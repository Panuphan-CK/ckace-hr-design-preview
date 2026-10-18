"use client";

import type {
  InboxOverview,
  RequestStatusOverview,
  SelfProfileResponse,
} from "@ckace/contracts";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { requestDesktopLogout } from "./logout-request";
import { installHashChangeEvents } from "./ui/hash-events";
import { Icon, type IconName } from "./ui/icons";
import { PageHead, type Tone as PageTone } from "./ui/kit";
import "./ui/ck.css";

interface NavigationCapabilities {
  leave: boolean;
  requestStatus: boolean;
  approvals: boolean;
  leaveApprovals: boolean;
  leaveWithdraw: boolean;
  overtimeWithdraw: boolean;
  medicalWithdraw: boolean;
  timeCorrectionWithdraw: boolean;
  delegation: boolean;
  timeCorrectionApprovals: boolean;
  overtimeApprovals: boolean;
  medicalApprovals: boolean;
  attendance: boolean;
  overtime: boolean;
  medical: boolean;
  benefits: boolean;
  announcements: boolean;
  calendar: boolean;
  reports: boolean;
  notifications: boolean;
  profile: boolean;
  onboarding: boolean;
  announcementAdmin: boolean;
  announcementDeleteAdmin: boolean;
  managementAdmin: boolean;
  usersAdmin: boolean;
  organizationAdmin: boolean;
  entitlementAdmin: boolean;
  workCalendarAdmin: boolean;
  usersAdminWrite: boolean;
  organizationAdminWrite: boolean;
  entitlementAdminWrite: boolean;
  workCalendarAdminWrite: boolean;
  rbacAdmin: boolean;
  rbacAdminWrite: boolean;
  passwordRecoveryAdmin: boolean;
  adminSettings: boolean;
  admin: boolean;
}

type Capability = keyof NavigationCapabilities;

interface SessionPayload {
  authenticated: true;
  employeeId: string;
  roleCount: number;
  permissionCount: number;
  navigation: NavigationCapabilities;
}

type SessionState =
  | { status: "loading" }
  | { status: "ready"; session: SessionPayload }
  | { status: "error"; message: string };

type Tone = "leave" | "sick" | "biz" | "ot" | "time" | "med" | "gray" | "accent";
type SectionId = "requests" | "approvals" | "reports" | "settings";

interface FlyLink {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly icon: IconName;
  readonly tone: Tone;
  readonly capability: Capability;
  readonly group?: string;
  readonly countKey?: "LEAVE" | "OVERTIME" | "TIME_CORRECTION" | "MEDICAL";
}

interface FlySection {
  readonly id: SectionId;
  readonly title: string;
  readonly icon: IconName;
  readonly tone: Tone;
  readonly links: readonly FlyLink[];
}

const SECTIONS: readonly FlySection[] = [
  {
    id: "requests",
    title: "ยื่นคำขอ",
    icon: "document",
    tone: "leave",
    links: [
      { id: "leave", label: "การลา", href: "/desktop/leave", icon: "leave", tone: "leave", capability: "leave" },
      { id: "overtime", label: "ทำงานล่วงเวลา", href: "/desktop/overtime", icon: "ot", tone: "ot", capability: "overtime" },
      { id: "time-correction", label: "แก้ไขเวลา", href: "/desktop/time-correction", icon: "time", tone: "time", capability: "attendance" },
      { id: "medical", label: "เบิกค่ารักษา", href: "/desktop/medical", icon: "med", tone: "med", capability: "medical" },
      { id: "attendance", label: "ลงเวลาเข้าออก", href: "/desktop/attendance", icon: "clock", tone: "time", capability: "attendance", group: "บันทึกเวลาและสิทธิ" },
    ],
  },
  {
    id: "approvals",
    title: "งานอนุมัติ",
    icon: "check",
    tone: "med",
    links: [
      { id: "approval-leave", label: "การลา", href: "/desktop/approvals#leave", icon: "leave", tone: "leave", capability: "leaveApprovals", countKey: "LEAVE" },
      { id: "approval-overtime", label: "ทำงานล่วงเวลา", href: "/desktop/approvals#overtime", icon: "ot", tone: "ot", capability: "overtimeApprovals", countKey: "OVERTIME" },
      { id: "approval-time", label: "แก้ไขเวลา", href: "/desktop/approvals#time-correction", icon: "time", tone: "time", capability: "timeCorrectionApprovals", countKey: "TIME_CORRECTION" },
      { id: "approval-medical", label: "เบิกค่ารักษา", href: "/desktop/approvals#medical", icon: "med", tone: "med", capability: "medicalApprovals", countKey: "MEDICAL" },
      { id: "delegation", label: "ผู้อนุมัติแทน", href: "/desktop/delegation", icon: "users", tone: "biz", capability: "delegation" },
      { id: "onboarding", label: "สมาชิกใหม่รออนุมัติ", href: "/desktop/onboarding", icon: "users", tone: "biz", capability: "onboarding", group: "บัญชีผู้ใช้" },
    ],
  },
  {
    id: "reports",
    title: "รายงาน",
    icon: "chart",
    tone: "biz",
    links: [
      { id: "report-overview", label: "ภาพรวม", href: "/desktop/reports#overview", icon: "dashboard", tone: "accent", capability: "reports" },
      { id: "report-leave", label: "การลา", href: "/desktop/reports#leave", icon: "leave", tone: "leave", capability: "reports" },
      { id: "report-attendance", label: "การเข้างาน", href: "/desktop/reports#attendance", icon: "clock", tone: "time", capability: "reports" },
      { id: "report-overtime", label: "OT", href: "/desktop/reports#overtime", icon: "ot", tone: "ot", capability: "reports" },
      { id: "report-medical", label: "ค่ารักษาพยาบาล", href: "/desktop/reports#medical", icon: "med", tone: "med", capability: "reports" },
    ],
  },
  {
    id: "settings",
    title: "ตั้งค่า HR",
    icon: "gear",
    tone: "gray",
    links: [
      { id: "leave-entitlements", label: "สิทธิวันลา", href: "/desktop/admin/management#entitlements", icon: "leave", tone: "leave", capability: "entitlementAdmin", group: "การลา" },
      { id: "work-calendar", label: "วันหยุดและวันทำงาน", href: "/desktop/admin/management#work-calendar", icon: "calendar", tone: "sick", capability: "workCalendarAdmin", group: "การลา" },
      { id: "ot-allowance", label: "ค่าข้าว/ค่ารถ OT", href: "/desktop/admin/overtime-allowance", icon: "ot", tone: "ot", capability: "organizationAdmin", group: "การลา" },
      { id: "medical-policy", label: "วงเงินค่ารักษา", href: "/desktop/admin/medical-policy", icon: "med", tone: "med", capability: "organizationAdmin", group: "การลา" },
      { id: "attendance-policy", label: "นโยบายลงเวลา", href: "/desktop/admin/attendance-policy", icon: "clock", tone: "time", capability: "organizationAdmin", group: "การลา" },
      { id: "employee-master", label: "ฐานข้อมูลพนักงาน", href: "/desktop/admin/management#users", icon: "users", tone: "biz", capability: "usersAdmin", group: "พนักงานและสิทธิ์" },
      { id: "organization", label: "โครงสร้างและสังกัด", href: "/desktop/admin/management#organization", icon: "building", tone: "time", capability: "organizationAdmin", group: "พนักงานและสิทธิ์" },
      { id: "professional-roles", label: "บทบาทวิชาชีพ", href: "/desktop/admin/professional-roles", icon: "users", tone: "biz", capability: "usersAdmin", group: "พนักงานและสิทธิ์" },
      { id: "approval-policies", label: "สายอนุมัติ", href: "/desktop/admin/approval-policies", icon: "lock", tone: "ot", capability: "rbacAdmin", group: "พนักงานและสิทธิ์" },
      { id: "access-control", label: "สิทธิ์และการเข้าถึง", href: "/desktop/admin/management#roles", icon: "lock", tone: "ot", capability: "rbacAdmin", group: "พนักงานและสิทธิ์" },
      { id: "announcements", label: "ประกาศ", href: "/desktop/announcements", icon: "megaphone", tone: "med", capability: "announcementAdmin", group: "อื่น ๆ" },
      { id: "platform-settings", label: "ตั้งค่าระบบ", href: "/desktop/admin", icon: "gear", tone: "gray", capability: "adminSettings", group: "อื่น ๆ" },
    ],
  },
];

/** Pages already rebuilt on the ck- design system render edge to edge; the rest keep their legacy padding. */
const REDESIGNED_PATHS: ReadonlySet<string> = new Set(["/desktop", "/desktop/delegation", "/desktop/leave", "/desktop/overtime", "/desktop/medical", "/desktop/time-correction", "/desktop/attendance", "/desktop/approvals", "/desktop/profile", "/desktop/reports"]);

/** Page header for pages that are not yet rebuilt: one consistent band across the whole system. */
const LEGACY_HEADS: readonly { readonly path: string; readonly tone: PageTone; readonly icon: IconName; readonly title: string; readonly subtitle: string }[] = [
  { path: "/desktop/admin/management", tone: "gray", icon: "building", title: "จัดการข้อมูลองค์กร", subtitle: "พนักงาน บริษัท ทีม แผนก วันหยุด และสิทธิ์" },
  { path: "/desktop/admin/professional-roles", tone: "gray", icon: "audit", title: "บทบาทวิชาชีพ", subtitle: "ผู้ทำบัญชี ผู้รับผิดชอบงาน ผู้สอบบัญชี และการยกเว้นลงเวลา" },
  { path: "/desktop/admin/approval-policies", tone: "gray", icon: "flow", title: "สายอนุมัติ", subtitle: "กำหนดลำดับผู้อนุมัติของคำขอแต่ละประเภท" },
  { path: "/desktop/admin/overtime-allowance", tone: "ot", icon: "ot", title: "ค่าข้าวและค่ารถ OT", subtitle: "เงื่อนไขและจำนวนเงินที่จ่ายเมื่อเลิกงานดึก" },
  { path: "/desktop/admin/medical-policy", tone: "med", icon: "med", title: "วงเงินค่ารักษา", subtitle: "วงเงินต่อปีและต่อครั้งของการเบิกค่ารักษา" },
  { path: "/desktop/admin/attendance-policy", tone: "time", icon: "clock", title: "นโยบายลงเวลา", subtitle: "ที่ตั้งสำนักงาน เวลาเข้า-เลิกงาน และเวลาพัก" },
  { path: "/desktop/admin", tone: "gray", icon: "gear", title: "ตั้งค่าระบบ", subtitle: "การตั้งค่าและประชาสัมพันธ์ของระบบ" },
  { path: "/desktop/announcements", tone: "ot", icon: "megaphone", title: "ข่าวประกาศ", subtitle: "ข่าวสารและประกาศของบริษัท" },
  { path: "/desktop/calendar", tone: "leave", icon: "calendar", title: "ปฏิทินการลา", subtitle: "ดูวันลาของพนักงานทั้งเดือน" },
  { path: "/desktop/benefits", tone: "med", icon: "med", title: "สิทธิและสวัสดิการ", subtitle: "วงเงินค่ารักษาและประวัติการใช้สิทธิ" },
  { path: "/desktop/requests", tone: "gray", icon: "document", title: "สถานะคำขอ", subtitle: "คำขอทุกประเภทของคุณในที่เดียว" },
  { path: "/desktop/notifications", tone: "gray", icon: "bell", title: "การส่งแจ้งเตือน", subtitle: "สถานะการส่งข้อความผ่าน LINE และอีเมล" },
  { path: "/desktop/inbox", tone: "gray", icon: "bell", title: "กล่องแจ้งเตือน", subtitle: "ข้อความแจ้งเตือนถึงคุณ" },
  { path: "/desktop/onboarding", tone: "biz", icon: "users", title: "สมาชิกใหม่รออนุมัติ", subtitle: "อนุมัติบัญชีพนักงานที่สมัครเข้ามา" },
];

function isActive(href: string, pathname: string, hash: string): boolean {
  const [path = href, hashPart] = href.split("#", 2);
  if (hashPart) return pathname === path && hash === "#" + hashPart;
  if (path === "/desktop") return pathname === path;
  if (path === "/desktop/admin") return pathname === path;
  return (pathname === path || pathname.startsWith(path + "/")) && hash === "";
}

function initials(fullName: string | null | undefined): string {
  if (!fullName) return "ฉัน";
  const parts = fullName.trim().split(/\s+/);
  const first = Array.from(parts[0] ?? "")[0] ?? "";
  const second = Array.from(parts[1] ?? "")[0] ?? "";
  return (first + second) || "ฉัน";
}

const TONE_CLASS: Record<Tone, string> = {
  leave: "ck-c-leave",
  sick: "ck-c-sick",
  biz: "ck-c-biz",
  ot: "ck-c-ot",
  time: "ck-c-time",
  med: "ck-c-med",
  gray: "ck-c-gray",
  accent: "ck-c-accent",
};

/** "5 นาทีที่แล้ว" style age for the bell list. */
function thaiAgo(iso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));

  if (minutes < 1) return "เมื่อสักครู่";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} ชั่วโมงที่แล้ว`;

  return `${Math.floor(minutes / (24 * 60))} วันที่แล้ว`;
}

export function DesktopShell({ children }: { readonly children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const [profile, setProfile] = useState<SelfProfileResponse | null>(null);
  const [inbox, setInbox] = useState<InboxOverview | null>(null);
  const [pendingByKind, setPendingByKind] = useState<Readonly<Record<string, number>>>({});
  const [hash, setHash] = useState("");
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const [popover, setPopover] = useState<"me" | "apps" | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    installHashChangeEvents();
  }, []);

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/security/session", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          if (!cancelled) router.replace("/login");
          return null;
        }
        if (!response.ok) throw new Error("session unavailable");
        return response.json() as Promise<SessionPayload>;
      })
      .then((session) => {
        if (!cancelled && session) setState({ status: "ready", session });
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            status: "error",
            message: "ไม่สามารถตรวจสอบสิทธิ์การเข้าใช้งานได้ กรุณาลองใหม่อีกครั้ง",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const navigation = state.status === "ready" ? state.session.navigation : null;

  useEffect(() => {
    if (!navigation?.profile) return;
    let cancelled = false;
    void fetch("/api/profile/me", { credentials: "same-origin", cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<SelfProfileResponse>) : null))
      .then((value) => {
        if (!cancelled && value) setProfile(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [navigation?.profile]);

  // In-app inbox (bell): refreshed on navigation and every minute while the tab is open.
  useEffect(() => {
    if (!navigation?.profile) return;
    let cancelled = false;
    const load = () =>
      void fetch("/api/inbox/me", { credentials: "same-origin", cache: "no-store" })
        .then((response) => (response.ok ? (response.json() as Promise<InboxOverview>) : null))
        .then((value) => {
          if (!cancelled && value) setInbox(value);
        })
        .catch(() => undefined);
    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [navigation?.profile, pathname]);

  async function markInboxRead() {
    try {
      const response = await fetch("/api/inbox/read", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (response.ok) {
        setInbox((current) =>
          current ? { unread: 0, items: current.items.map((item) => ({ ...item, read: true })) } : current,
        );
      }
    } catch {
      /* the next refresh shows the real state */
    }
  }

  useEffect(() => {
    if (!navigation?.approvals) return;
    let cancelled = false;
    void fetch("/api/requests/assigned", { credentials: "same-origin", cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<RequestStatusOverview>) : null))
      .then((value) => {
        if (cancelled || !value) return;
        const counts: Record<string, number> = {};
        for (const item of value.requests) {
          if (item.canDecide) counts[item.kind] = (counts[item.kind] ?? 0) + 1;
        }
        setPendingByKind(counts);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [navigation?.approvals, pathname]);

  const sections = useMemo(() => {
    if (!navigation) return [];
    return SECTIONS.map((section) => ({
      ...section,
      links: section.links.filter((link) => navigation[link.capability]),
    })).filter((section) => section.links.length > 0);
  }, [navigation]);

  const activeSection = useMemo<SectionId | null>(() => {
    for (const section of sections) {
      if (section.links.some((link) => isActive(link.href, pathname, hash))) return section.id;
    }
    return null;
  }, [sections, pathname, hash]);

  useEffect(() => {
    setOpenSection(activeSection);
    setPopover(null);
  }, [activeSection, pathname]);

  useEffect(() => {
    if (!popover) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPopover(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [popover]);

  const totalPending = Object.values(pendingByKind).reduce((sum, value) => sum + value, 0);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError(null);
    const confirmed = await requestDesktopLogout();
    if (confirmed) {
      router.replace("/login");
      router.refresh();
      return;
    }
    setLogoutError("ยังไม่ยืนยันการออกจากระบบ กรุณาลองใหม่อีกครั้ง หรือปิดหน้าต่างเบราว์เซอร์");
    setLoggingOut(false);
  }

  if (state.status === "loading") {
    return (
      <div className="ck-app">
        <main className="ck-main ck-state" role="status" aria-live="polite" aria-busy="true">
          <div className="ck-spinner" aria-hidden="true" />
          <h1>กำลังตรวจสอบสิทธิ์</h1>
          <p>กำลังเตรียมพื้นที่บริการพนักงานของคุณ</p>
        </main>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="ck-app">
        <main className="ck-main ck-state" role="alert">
          <h1>เปิดพื้นที่บริการพนักงานไม่สำเร็จ</h1>
          <p>{state.message}</p>
          <button className="ck-btn sky" type="button" onClick={() => window.location.reload()}>
            ลองใหม่
          </button>
        </main>
      </div>
    );
  }

  const nav = state.session.navigation;
  const flySection = sections.find((section) => section.id === openSection) ?? null;
  const displayName = profile?.fullName ?? "บัญชีพนักงาน";
  const subtitle = [profile?.roles[0], profile?.department?.name].filter(Boolean).join(" ") || "พนักงาน";

  function railSectionButton(id: SectionId, label: string, icon: IconName, badge?: number) {
    const section = sections.find((item) => item.id === id);
    if (!section) return null;
    const on = openSection === id || (openSection === null && activeSection === id);
    return (
      <button
        type="button"
        className={on ? "ck-ri on" : "ck-ri"}
        aria-expanded={openSection === id}
        aria-controls="ck-fly"
        onClick={() => setOpenSection((current) => (current === id ? null : id))}
      >
        <Icon name={icon} />
        {badge ? <span className="ck-badge">{badge}</span> : null}
        <span className="ck-tip">{label}</span>
      </button>
    );
  }

  let lastGroup: string | undefined;

  return (
    <div className="ck-app">
      <nav className="ck-rail" aria-label="เมนูหลัก">
        <button
          type="button"
          className="ck-ri me"
          aria-haspopup="dialog"
          aria-expanded={popover === "me"}
          onClick={() => setPopover((current) => (current === "me" ? null : "me"))}
        >
          <span className="ck-av">{initials(profile?.fullName)}</span>
          {(inbox?.unread ?? 0) > 0 ? <span className="ck-badge">{inbox?.unread}</span> : null}
          <span className="ck-tip">{displayName}</span>
        </button>
        <div className="ck-rail-gap" />
        <Link href="/desktop" className={pathname === "/desktop" ? "ck-ri on" : "ck-ri"}>
          <Icon name="dashboard" />
          <span className="ck-tip">แดชบอร์ด</span>
        </Link>
        {railSectionButton("requests", "ยื่นคำขอ", "document")}
        {railSectionButton("approvals", "งานอนุมัติ", "check", totalPending || undefined)}
        {nav.calendar ? (
          <Link href="/desktop/calendar" className={pathname === "/desktop/calendar" ? "ck-ri on" : "ck-ri"}>
            <Icon name="calendar" />
            <span className="ck-tip">ปฏิทิน</span>
          </Link>
        ) : null}
        {railSectionButton("reports", "รายงาน", "chart")}
        <div className="ck-rail-fill" />
        <button
          type="button"
          className="ck-ri"
          aria-haspopup="dialog"
          aria-expanded={popover === "apps"}
          onClick={() => setPopover((current) => (current === "apps" ? null : "apps"))}
        >
          <Icon name="apps" />
          <span className="ck-tip">แอปพลิเคชัน</span>
        </button>
        {railSectionButton("settings", "ตั้งค่า HR", "gear")}
      </nav>

      <aside id="ck-fly" className={flySection ? "ck-fly open" : "ck-fly"} aria-hidden={!flySection}>
        {flySection ? (
          <div className="ck-fly-in">
            <div className={"ck-fh " + TONE_CLASS[flySection.tone]}>
              <h2>{flySection.title}</h2>
              <button type="button" aria-label="ปิดเมนู" onClick={() => setOpenSection(null)}>
                <Icon name="back" size={18} />
              </button>
            </div>
            {flySection.links.map((link) => {
              const showGroup = link.group !== lastGroup && link.group !== undefined;
              lastGroup = link.group;
              const count = link.countKey ? pendingByKind[link.countKey] : undefined;
              return (
                <div key={link.id}>
                  {showGroup ? <div className="ck-fly-label">{link.group}</div> : null}
                  <Link
                    href={link.href}
                    className={(isActive(link.href, pathname, hash) ? "on " : "") + TONE_CLASS[link.tone]}
                    onClick={() => setHash(link.href.includes("#") ? "#" + link.href.split("#")[1] : "")}
                  >
                    <span className="ck-chip sm">
                      <Icon name={link.icon} size={15} />
                    </span>
                    {link.label}
                    {count ? <span className="ck-n">{count}</span> : null}
                  </Link>
                </div>
              );
            })}
          </div>
        ) : null}
      </aside>

      {popover ? (
        <button type="button" className="ck-scrim" style={{ background: "transparent", zIndex: 40 }} aria-label="ปิด" onClick={() => setPopover(null)} />
      ) : null}

      {popover === "me" ? (
        <div className="ck-pop" style={{ top: 14 }} role="dialog" aria-label="โปรไฟล์และการแจ้งเตือน">
          <div className="ck-me">
            <span className="ck-av md">{initials(profile?.fullName)}</span>
            <span>
              <b>{displayName}</b>
              <small>{subtitle}</small>
            </span>
          </div>
          <div className="ck-pop-hr" />
          <div className="ck-pop-t" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>การแจ้งเตือน{(inbox?.unread ?? 0) > 0 ? ` (${inbox?.unread} ใหม่)` : ""}</span>
            {(inbox?.unread ?? 0) > 0 ? (
              <button type="button" className="ck-btn quiet" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => void markInboxRead()}>
                อ่านทั้งหมด
              </button>
            ) : null}
          </div>
          {(inbox?.items ?? []).slice(0, 5).map((item) => (
            <Link
              key={item.id}
              className="ck-pop-link"
              href="/desktop/inbox"
              onClick={() => setPopover(null)}
              style={{ alignItems: "flex-start", fontWeight: item.read ? 400 : 600 }}
            >
              <Icon name="bell" size={17} />
              <span style={{ display: "grid" }}>
                <span>{item.title}</span>
                <small style={{ opacity: 0.7, fontWeight: 400 }}>{thaiAgo(item.createdAt)}</small>
              </span>
            </Link>
          ))}
          {inbox && inbox.items.length === 0 ? (
            <div className="ck-pop-t" style={{ paddingTop: 0 }}>ยังไม่มีการแจ้งเตือน</div>
          ) : null}
          <Link className="ck-pop-link" href="/desktop/inbox" onClick={() => setPopover(null)}>
            <Icon name="bell" size={17} />
            กล่องแจ้งเตือนทั้งหมด
          </Link>
          {totalPending > 0 ? (
            <Link className="ck-pop-link" href="/desktop/approvals" onClick={() => setPopover(null)}>
              <Icon name="check" size={17} />
              มี {totalPending} คำขอรอคุณอนุมัติ
            </Link>
          ) : null}
          {nav.notifications ? (
            <Link className="ck-pop-link" href="/desktop/notifications" onClick={() => setPopover(null)}>
              <Icon name="bell" size={17} />
              ดูการแจ้งเตือนทั้งหมด
            </Link>
          ) : null}
          {nav.announcements ? (
            <Link className="ck-pop-link" href="/desktop/announcements" onClick={() => setPopover(null)}>
              <Icon name="megaphone" size={17} />
              ประกาศจากบริษัท
            </Link>
          ) : null}
          <div className="ck-pop-hr" />
          <div className="ck-pop-t">แอปพลิเคชัน</div>
          <AppGrid />
          <div className="ck-pop-hr" />
          {nav.profile ? (
            <Link className="ck-pop-link" href="/desktop/profile" onClick={() => setPopover(null)}>
              <Icon name="user" size={17} />
              โปรไฟล์ของฉัน
            </Link>
          ) : null}
          <button type="button" className="ck-pop-link danger" disabled={loggingOut} aria-busy={loggingOut} onClick={() => void logout()}>
            <Icon name="logout" size={17} />
            {loggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
          </button>
          {logoutError ? (
            <p role="alert" className="ck-msg error" style={{ margin: "6px 4px 2px", fontSize: 13 }}>
              {logoutError}
            </p>
          ) : null}
        </div>
      ) : null}

      {popover === "apps" ? (
        <div className="ck-pop" style={{ bottom: 64 }} role="dialog" aria-label="แอปพลิเคชัน">
          <div className="ck-pop-t">แอปพลิเคชัน</div>
          <AppGrid />
        </div>
      ) : null}

      <main className="ck-main">
        {REDESIGNED_PATHS.has(pathname) ? (
          children
        ) : (
          <>
            {(() => {
              const head = LEGACY_HEADS.find((item) => pathname === item.path || pathname.startsWith(item.path + "/"));
              return head ? <PageHead tone={head.tone} icon={head.icon} title={head.title} subtitle={head.subtitle} /> : null;
            })()}
            <div className="ck-legacy ck-wrap desktop-content main-content task396-content">{children}</div>
          </>
        )}
      </main>
    </div>
  );
}

function AppGrid() {
  const apps: readonly { label: string; icon: IconName; color: string; current?: boolean }[] = [
    { label: "HR", icon: "calendar", color: "var(--ck-t-leave)", current: true },
    { label: "สำนักงานบัญชี", icon: "building", color: "var(--ck-t-med)" },
    { label: "Audit", icon: "audit", color: "var(--ck-gold)" },
    { label: "บุคลากร", icon: "users", color: "var(--ck-t-biz)" },
    { label: "ตั้งค่าระบบ", icon: "gear", color: "var(--ck-t-gray)" },
  ];
  return (
    <div className="ck-apps">
      {apps.map((app) =>
        app.current ? (
          <span key={app.label} className="ck-app-i cur" aria-current="true">
            <span className="ic" style={{ background: app.color }}>
              <Icon name={app.icon} size={19} />
            </span>
            {app.label}
          </span>
        ) : (
          <span key={app.label} className="ck-app-i" aria-disabled="true" title="ยังไม่เปิดใช้งาน">
            <span className="ic" style={{ background: app.color, opacity: 0.45 }}>
              <Icon name={app.icon} size={19} />
            </span>
            {app.label}
            <small>เร็ว ๆ นี้</small>
          </span>
        ),
      )}
    </div>
  );
}
