"use client";

import type {
  AnnouncementListResult,
  AnnouncementView,
  InboxOverview,
  InAppNotificationItem,
  RequestStatusOverview,
  SelfProfileResponse,
} from "@ckace/contracts";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { requestDesktopLogout } from "./logout-request";
import { canAccessDesktopRoute } from "./desktop-route-access";
import {
  DESKTOP_NAV_ACCESSIBLE_NAMES,
  desktopSectionAccessibleName,
} from "./desktop-nav-accessibility";
import { installHashChangeEvents } from "./ui/hash-events";
import { Icon, type IconName } from "./ui/icons";
import { PageHead, type Tone as PageTone } from "./ui/kit";
import "./ui/ck.css";
import "./ui/ck-v2.css";
import "./ui/smarthr.css";

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

interface FlatNavItem {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly icon: IconName;
  readonly tone: Tone;
  readonly capability?: Capability;
  readonly isDivider?: boolean;
  readonly isApprovals?: boolean;
}

const FLAT_NAV_ITEMS: readonly FlatNavItem[] = [
  { id: "dashboard", label: "แดชบอร์ด", href: "/desktop", icon: "dashboard", tone: "accent" },
  { id: "leave", label: "คำขอลางาน", href: "/desktop/leave", icon: "leave", tone: "leave", capability: "leave" },
  { id: "overtime", label: "คำขอ OT", href: "/desktop/overtime", icon: "ot", tone: "ot", capability: "overtime" },
  { id: "attendance", label: "ลงเวลา / แก้ไขเวลา", href: "/desktop/attendance", icon: "clock", tone: "time", capability: "attendance" },
  { id: "medical", label: "เบิกค่ารักษา", href: "/desktop/medical", icon: "med", tone: "med", capability: "medical" },
  { id: "divider-1", label: "", href: "", icon: "leave", tone: "gray", isDivider: true },
  { id: "approvals", label: "งานอนุมัติ", href: "/desktop/approvals", icon: "check", tone: "leave", capability: "approvals", isApprovals: true },
  { id: "reports", label: "รายงาน", href: "/desktop/reports", icon: "chart", tone: "biz", capability: "reports" },
  { id: "settings", label: "ตั้งค่าระบบ", href: "/desktop/admin/management", icon: "gear", tone: "gray", capability: "managementAdmin" },
];

const LEGACY_HEADS: readonly {
  readonly path: string;
  readonly tone: PageTone;
  readonly icon: IconName;
  readonly title: string;
  readonly subtitle: string;
}[] = [
  {
    path: "/desktop/attendance",
    tone: "time",
    icon: "clock",
    title: "ลงเวลาเข้า - ออกงาน",
    subtitle: "บันทึกเวลาทำงานประจำวัน และประวัติการเข้างานย้อนหลัง",
  },
  {
    path: "/desktop/leave",
    tone: "leave",
    icon: "leave",
    title: "การลาของฉัน",
    subtitle: "ยื่นใบลา ตรวจสอบสิทธิคงเหลือ และติดตามสถานะ",
  },
  {
    path: "/desktop/overtime",
    tone: "ot",
    icon: "ot",
    title: "ทำงานล่วงเวลา (OT)",
    subtitle: "ขออนุมัติทำงานล่วงเวลาและติดตามผลการพิจารณา",
  },
  {
    path: "/desktop/time-correction",
    tone: "time",
    icon: "time",
    title: "ขอแก้ไขเวลาทำงาน",
    subtitle: "กรณีลืมลงเวลา เข้า-ออกงานผิดพลาด หรือมีเหตุจำเป็น",
  },
  {
    path: "/desktop/medical",
    tone: "med",
    icon: "med",
    title: "เบิกค่ารักษาพยาบาล",
    subtitle: "แนบใบเสร็จ ยื่นขอเบิก และตรวจสอบวงเงินคงเหลือประจำปี",
  },
  {
    path: "/desktop/calendar",
    tone: "leave",
    icon: "calendar",
    title: "ปฏิทินวันลา",
    subtitle: "ภาพรวมวันลาของทีมและวันหยุดประจำปีของบริษัท",
  },
  {
    path: "/desktop/profile",
    tone: "accent",
    icon: "user",
    title: "โปรไฟล์ของฉัน",
    subtitle: "ข้อมูลส่วนบุคคล สิทธิ์การใช้งาน และความปลอดภัย",
  },
  {
    path: "/desktop/admin/management",
    tone: "gray",
    icon: "gear",
    title: "จัดการข้อมูลองค์กร",
    subtitle: "โครงสร้างองค์กร บทบาทหน้าที่ และนโยบายสิทธิประโยชน์",
  },
  {
    path: "/desktop/approvals",
    tone: "leave",
    icon: "check",
    title: "งานรออนุมัติ",
    subtitle: "พิจารณาคำขอลา ทำงานล่วงเวลา และเบิกสวัสดิการของทีม",
  },
  {
    path: "/desktop/reports",
    tone: "biz",
    icon: "chart",
    title: "รายงานและการวิเคราะห์",
    subtitle: "สถิติการมาทำงาน การลา และการใช้งบประมาณสวัสดิการ",
  },
];

const REDESIGNED_PATHS = new Set<string>([
  "/desktop",
  "/desktop/approvals",
  "/desktop/inbox",
  "/desktop/notifications",
  "/desktop/requests",
  "/desktop/reports",
  "/desktop/admin/management",
]);

function thaiAgo(iso: string): string {
  try {
    const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (diffSeconds < 60) return "เมื่อสักครู่";
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return diffMinutes + " นาทีที่แล้ว";
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return diffHours + " ชั่วโมงที่แล้ว";
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return diffDays + " วันที่แล้ว";
    const d = new Date(iso);
    return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
  } catch {
    return "";
  }
}

function initials(name: string | undefined): string {
  if (!name) return "พ";
  const cleaned = name.replace(/^(นาย|นางสาว|นาง|คุณ|ด\.ช\.|ด\.ญ\.)\s*/, "").trim();
  return (cleaned[0] || name[0] || "พ").toUpperCase();
}

function isActive(href: string, pathname: string, hash: string): boolean {
  if (!href) return false;
  if (href === "/desktop") return pathname === "/desktop";
  if (href.includes("#")) {
    const [path, targetHash] = href.split("#");
    return pathname === path && hash === "#" + targetHash;
  }
  return pathname === href || pathname.startsWith(href + "/");
}

type ActiveSidebarPopover = "notifications" | "apps" | "profile" | null;

export function DesktopShell({ children }: { readonly children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const [profile, setProfile] = useState<SelfProfileResponse | null>(null);
  const [inbox, setInbox] = useState<InboxOverview | null>(null);
  const [announcements, setAnnouncements] = useState<readonly AnnouncementView[]>([]);
  const [pendingByKind, setPendingByKind] = useState<Record<string, number>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  // Unified Sidebar Popover: aligned to the right of Sidebar
  const [activePopover, setActivePopover] = useState<ActiveSidebarPopover>(null);
  const [drawerTab, setDrawerTab] = useState<"all" | "system" | "announcement">("all");
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    installHashChangeEvents();
    const sync = () => setHash(window.location.hash || "");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetch("/api/security/session", { credentials: "same-origin", cache: "no-store" })
        .then((response) => {
          if (response.status === 401) router.replace("/login?expired=1");
        })
        .catch(() => undefined);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/security/session", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          if (!cancelled) router.replace("/login");
          return null;
        }
        if (!response.ok) {
          throw new Error("เซสชันไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่");
        }
        return (await response.json()) as SessionPayload;
      })
      .then((session) => {
        if (!cancelled && session) {
          setState({ status: "ready", session });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "ไม่สามารถยืนยันตัวตนได้",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const navigation = state.status === "ready" ? state.session.navigation : null;

  // Fetch Profile
  useEffect(() => {
    if (!navigation) return;
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
  }, [navigation, pathname]);

  // Fetch Inbox & Announcements
  useEffect(() => {
    if (!navigation) return;
    let cancelled = false;
    const loadInbox = () => {
      void fetch("/api/inbox/me", { credentials: "same-origin", cache: "no-store" })
        .then((response) => (response.ok ? (response.json() as Promise<InboxOverview>) : null))
        .then((value) => {
          if (!cancelled && value) setInbox(value);
        })
        .catch(() => undefined);
    };
    const loadAnnouncements = () => {
      void fetch("/api/announcements", { credentials: "same-origin", cache: "no-store" })
        .then((response) => (response.ok ? (response.json() as Promise<AnnouncementListResult>) : null))
        .then((value) => {
          if (!cancelled && value?.announcements) setAnnouncements(value.announcements);
        })
        .catch(() => undefined);
    };
    loadInbox();
    loadAnnouncements();
    const timer = window.setInterval(loadInbox, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [navigation, pathname]);

  // Fetch Approvals pending counts
  useEffect(() => {
    if (!navigation?.approvals && !navigation?.leaveApprovals) return;
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
  }, [navigation?.approvals, navigation?.leaveApprovals, pathname]);

  // Close popovers on route change
  useEffect(() => {
    setMobileNavOpen(false);
    setActivePopover(null);
  }, [pathname, hash]);

  // Close on Escape key
  useEffect(() => {
    if (!activePopover) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActivePopover(null);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [activePopover]);

  const totalPending = Object.values(pendingByKind).reduce((sum, value) => sum + value, 0);
  const unreadCount = inbox?.unread ?? 0;

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
  const routeAllowed = canAccessDesktopRoute(nav, pathname, hash);
  const displayName = profile?.fullName ?? "คุณพนักงาน";
  const subtitle = [profile?.roles[0], profile?.department?.name].filter(Boolean).join(" · ") || "พนักงาน";
  const legacyHead = LEGACY_HEADS.find((item) => pathname === item.path || pathname.startsWith(item.path + "/"));
  const pageTitle =
    pathname === "/desktop"
      ? (nav.managementAdmin ? "แดชบอร์ดผู้ดูแล" : "แดชบอร์ดพนักงาน")
      : pathname === "/desktop/leave"
        ? "คำขอลางาน"
        : pathname === "/desktop/overtime"
          ? "คำขอทำงานล่วงเวลา (OT)"
          : pathname === "/desktop/attendance"
            ? "ลงเวลาเข้า-ออกงาน"
            : pathname === "/desktop/medical"
              ? "เบิกค่ารักษาพยาบาล"
              : pathname === "/desktop/approvals"
                ? "งานอนุมัติ"
                : pathname === "/desktop/reports"
                  ? "รายงานและการวิเคราะห์"
                  : pathname === "/desktop/admin/management"
                    ? "จัดการข้อมูลองค์กร"
                    : pathname === "/desktop/profile"
                      ? "โปรไฟล์ของฉัน"
                      : (legacyHead?.title ?? "พื้นที่บริการพนักงาน");

  // Filtered navigation items for single-level flat sidebar
  const visibleNavItems = FLAT_NAV_ITEMS.filter((item) => {
    if (item.isDivider) return true;
    if (!item.capability) return true;
    if (item.isApprovals) {
      return nav.approvals || nav.leaveApprovals || nav.overtimeApprovals || nav.medicalApprovals;
    }
    if (item.id === "settings") {
      return (
        nav.managementAdmin ||
        nav.admin ||
        nav.usersAdmin ||
        nav.organizationAdmin ||
        nav.rbacAdmin ||
        nav.profile
      );
    }
    return Boolean(nav[item.capability]);
  });

  return (
    <div className={"ck-app sh-app" + (sidebarCollapsed ? " sh-collapsed" : "")}>
      {/* ===== 1. Single-level Flat Sidebar (Slide bar with NO sub-menus) ===== */}
      <aside className={"sh-sidebar" + (mobileNavOpen ? " is-open" : "")} aria-label="เมนูหลัก">
        <div className="sh-sidebar-head">
          <Link
            href="/desktop"
            className="sh-brand"
            aria-label="CKACE HR หน้าแรก"
            onClick={() => setMobileNavOpen(false)}
          >
            <span className="sh-brand-mark">CK</span>
            <span>
              <b>CKACE <em>HR</em></b>
              <small>HR WORKSPACE</small>
            </span>
          </Link>
          <button
            type="button"
            className="sh-collapse-toggle"
            aria-label={sidebarCollapsed ? "ขยายเมนูหลัก" : "ย่อเมนูหลัก"}
            aria-expanded={!sidebarCollapsed}
            onClick={() => {
              setSidebarCollapsed((value) => !value);
              setActivePopover(null);
            }}
          >
            <Icon name="menu" size={20} />
          </button>
        </div>

        <button
          type="button"
          className="sh-sidebar-close"
          aria-label="ปิดเมนูหลัก"
          onClick={() => setMobileNavOpen(false)}
        >
          <Icon name="close" size={18} />
        </button>

        {/* Flat single-level nav items */}
        <nav className="sh-flat-nav" aria-label="เมนูหลัก">
          {visibleNavItems.map((item) => {
            if (item.isDivider) {
              return <div key={item.id} className="sh-flat-divider" />;
            }

            const active = isActive(item.href, pathname, hash);
            const pendingCount = item.isApprovals ? totalPending : 0;
            const accessibleName = item.isApprovals
              ? desktopSectionAccessibleName(item.label, pendingCount)
              : item.id === "dashboard"
                ? DESKTOP_NAV_ACCESSIBLE_NAMES.dashboard
                : item.label;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={"sh-flat-item" + (active ? " active" : "")}
                aria-label={accessibleName}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (item.href.includes("#")) {
                    setHash("#" + item.href.split("#")[1]);
                  }
                  setMobileNavOpen(false);
                }}
              >
                <span className="sh-flat-icon" data-tone={item.tone}>
                  <Icon name={item.icon} size={20} />
                </span>
                <span className="sh-flat-label">{item.label}</span>
                {pendingCount > 0 ? (
                  <span className="sh-flat-badge">{pendingCount}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer with Notification bell, Apps, and Profile Avatar */}
        <div className="sh-flat-footer" aria-label="เครื่องมือบัญชี">
          <button
            type="button"
            className={"sh-flat-footer-btn" + (activePopover === "notifications" ? " active" : "")}
            id="shBellBtn"
            aria-label="การแจ้งเตือน"
            title="การแจ้งเตือน"
            aria-haspopup="dialog"
            aria-expanded={activePopover === "notifications"}
            onClick={() => {
              setActivePopover((curr) => (curr === "notifications" ? null : "notifications"));
            }}
          >
            <Icon name="bell" size={20} />
            {unreadCount > 0 ? <span className="badge-dot">{unreadCount}</span> : null}
          </button>

          <button
            type="button"
            className={"sh-flat-footer-btn" + (activePopover === "apps" ? " active" : "")}
            id="shAppsBtn"
            aria-label="แอปพลิเคชัน"
            title="แอปพลิเคชัน"
            aria-haspopup="dialog"
            aria-expanded={activePopover === "apps"}
            onClick={() => {
              setActivePopover((curr) => (curr === "apps" ? null : "apps"));
            }}
          >
            <Icon name="apps" size={20} />
          </button>

          <button
            type="button"
            className={"sh-flat-footer-btn avatar-btn" + (activePopover === "profile" ? " active" : "")}
            id="shProfileBtn"
            aria-label={DESKTOP_NAV_ACCESSIBLE_NAMES.profile}
            title="โปรไฟล์"
            aria-haspopup="dialog"
            aria-expanded={activePopover === "profile"}
            onClick={() => {
              setActivePopover((curr) => (curr === "profile" ? null : "profile"));
            }}
          >
            {initials(profile?.fullName)}
            <span className="status-dot" />
          </button>
        </div>
      </aside>

      {/* Mobile nav backdrop */}
      {mobileNavOpen ? (
        <button
          type="button"
          className="sh-nav-backdrop"
          aria-label="ปิดเมนู"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      {/* ===== Scrim / Backdrop to dismiss popovers on click outside ===== */}
      {activePopover ? (
        <button
          type="button"
          className="ck-scrim"
          style={{ background: "transparent", zIndex: 990 }}
          aria-label="ปิดกล่องข้อความ"
          onClick={() => setActivePopover(null)}
        />
      ) : null}

      {/* ===== POPOVER 1: การแจ้งเตือน (แสดงด้านขวาของ Sidebar ตามบรรทัดไอคอน รูปแบบเหมือนแอปพลิเคชัน) ===== */}
      {activePopover === "notifications" ? (
        <div
          className="sh-side-popover sh-notif-popover"
          role="dialog"
          aria-label="การแจ้งเตือน"
        >
          <div className="sh-popover-header">
            <div className="sh-popover-title-row">
              <span className="sh-popover-icon-box blue">
                <Icon name="bell" size={20} />
              </span>
              <b className="sh-popover-title">การแจ้งเตือน</b>
              {unreadCount > 0 ? (
                <span className="sh-popover-badge">{unreadCount} รายการใหม่</span>
              ) : null}
            </div>
            <button
              type="button"
              className="sh-popover-close-btn"
              aria-label="ปิดการแจ้งเตือน"
              onClick={() => setActivePopover(null)}
            >
              <Icon name="close" size={17} />
            </button>
          </div>

          {/* 3 Tabs: ทั้งหมด, ระบบ, ประกาศ */}
          <div className="sh-popover-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={drawerTab === "all"}
              className={"sh-popover-tab" + (drawerTab === "all" ? " active" : "")}
              onClick={() => setDrawerTab("all")}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={drawerTab === "system"}
              className={"sh-popover-tab" + (drawerTab === "system" ? " active" : "")}
              onClick={() => setDrawerTab("system")}
            >
              ระบบ
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={drawerTab === "announcement"}
              className={"sh-popover-tab" + (drawerTab === "announcement" ? " active" : "")}
              onClick={() => setDrawerTab("announcement")}
            >
              ประกาศ
            </button>
          </div>

          <div className="sh-popover-subbar">
            <span>รายการล่าสุด</span>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="sh-popover-action-btn"
                onClick={() => void markInboxRead()}
              >
                ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
              </button>
            ) : null}
          </div>

          <div className="sh-popover-scroll-body">
            {(() => {
              const systemItems: readonly InAppNotificationItem[] = inbox?.items ?? [];
              const annoItems: readonly AnnouncementView[] = announcements;

              if (drawerTab === "system") {
                if (systemItems.length === 0) {
                  return (
                    <div className="sh-popover-empty">
                      <Icon name="bell" size={32} />
                      <p>ไม่มีการแจ้งเตือนระบบในขณะนี้</p>
                    </div>
                  );
                }
                return systemItems.map((item) => (
                  <div
                    key={item.id}
                    className={"sh-notif-item" + (!item.read ? " unread" : "")}
                    onClick={() => {
                      setActivePopover(null);
                      router.push("/desktop/inbox");
                    }}
                  >
                    <div className="sh-notif-circle blue">
                      <Icon name="check" size={18} />
                    </div>
                    <div className="sh-notif-info">
                      <div className="sh-notif-head">{item.title}</div>
                      <div className="sh-notif-text">{item.body}</div>
                      <div className="sh-notif-time">{thaiAgo(item.createdAt)}</div>
                    </div>
                    {!item.read ? <span className="sh-notif-unread-dot" /> : null}
                  </div>
                ));
              }

              if (drawerTab === "announcement") {
                if (annoItems.length === 0) {
                  return (
                    <div className="sh-popover-empty">
                      <Icon name="megaphone" size={32} />
                      <p>ยังไม่มีประกาศในขณะนี้</p>
                    </div>
                  );
                }
                return annoItems.map((anno) => (
                  <div
                    key={anno.id}
                    className="sh-notif-item"
                    onClick={() => {
                      setActivePopover(null);
                      router.push("/desktop/announcements");
                    }}
                  >
                    <div className="sh-notif-circle purple">
                      <Icon name="megaphone" size={18} />
                    </div>
                    <div className="sh-notif-info">
                      <div className="sh-notif-head">{anno.title || "ประกาศจากบริษัท"}</div>
                      <div className="sh-notif-text">{anno.content}</div>
                      <div className="sh-notif-time">
                        {anno.publishedAt ? thaiAgo(anno.publishedAt) : "ล่าสุด"}
                      </div>
                    </div>
                  </div>
                ));
              }

              // Tab: 'all'
              const hasAny = systemItems.length > 0 || annoItems.length > 0;
              if (!hasAny) {
                return (
                  <div className="sh-popover-empty">
                    <Icon name="bell" size={32} />
                    <p>ไม่มีการแจ้งเตือนในหมวดนี้</p>
                  </div>
                );
              }

              return (
                <>
                  {systemItems.map((item) => (
                    <div
                      key={item.id}
                      className={"sh-notif-item" + (!item.read ? " unread" : "")}
                      onClick={() => {
                        setActivePopover(null);
                        router.push("/desktop/inbox");
                      }}
                    >
                      <div className="sh-notif-circle blue">
                        <Icon name="check" size={18} />
                      </div>
                      <div className="sh-notif-info">
                        <div className="sh-notif-head">{item.title}</div>
                        <div className="sh-notif-text">{item.body}</div>
                        <div className="sh-notif-time">{thaiAgo(item.createdAt)}</div>
                      </div>
                      {!item.read ? <span className="sh-notif-unread-dot" /> : null}
                    </div>
                  ))}
                  {annoItems.slice(0, 5).map((anno) => (
                    <div
                      key={anno.id}
                      className="sh-notif-item"
                      onClick={() => {
                        setActivePopover(null);
                        router.push("/desktop/announcements");
                      }}
                    >
                      <div className="sh-notif-circle purple">
                        <Icon name="megaphone" size={18} />
                      </div>
                      <div className="sh-notif-info">
                        <div className="sh-notif-head">{anno.title || "ประกาศจากบริษัท"}</div>
                        <div className="sh-notif-text">{anno.content}</div>
                        <div className="sh-notif-time">
                          {anno.publishedAt ? thaiAgo(anno.publishedAt) : "ล่าสุด"}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              );
            })()}
          </div>

          <div className="sh-popover-footer">
            <Link
              href="/desktop/inbox"
              className="sh-popover-link-btn"
              onClick={() => setActivePopover(null)}
            >
              <span>ไปยังกล่องแจ้งเตือนทั้งหมด &rarr;</span>
            </Link>
          </div>
        </div>
      ) : null}

      {/* ===== POPOVER 2: แอปพลิเคชัน (แสดงด้านขวาของ Sidebar ตามบรรทัดไอคอน) ===== */}
      {activePopover === "apps" ? (
        <div
          className="sh-side-popover sh-apps-popover"
          role="dialog"
          aria-label="แอปพลิเคชัน"
        >
          <div className="sh-popover-header">
            <div className="sh-popover-title-row">
              <span className="sh-popover-icon-box gray">
                <Icon name="apps" size={20} />
              </span>
              <b className="sh-popover-title">แอปพลิเคชันและระบบงาน</b>
            </div>
            <button
              type="button"
              className="sh-popover-close-btn"
              aria-label="ปิดแอปพลิเคชัน"
              onClick={() => setActivePopover(null)}
            >
              <Icon name="close" size={17} />
            </button>
          </div>
          <div className="sh-popover-scroll-body" style={{ padding: "0.75rem 1rem" }}>
            <AppGrid />
          </div>
        </div>
      ) : null}

      {/* ===== POPOVER 3: โปรไฟล์ (แสดงด้านขวาของ Sidebar ตามบรรทัดไอคอน รูปแบบเหมือนแอปพลิเคชัน) ===== */}
      {activePopover === "profile" ? (
        <div
          className="sh-side-popover sh-profile-popover"
          role="dialog"
          aria-label={DESKTOP_NAV_ACCESSIBLE_NAMES.profile}
        >
          <div className="sh-popover-header">
            <div className="sh-popover-title-row">
              <span className="sh-popover-icon-box blue">
                <Icon name="user" size={20} />
              </span>
              <b className="sh-popover-title">ข้อมูลโปรไฟล์</b>
            </div>
            <button
              type="button"
              className="sh-popover-close-btn"
              aria-label="ปิดโปรไฟล์"
              onClick={() => setActivePopover(null)}
            >
              <Icon name="close" size={17} />
            </button>
          </div>

          <div className="sh-profile-pop-body">
            <div className="sh-profile-main-head">
              <div className="sh-profile-avatar-large">{initials(profile?.fullName)}</div>
              <div className="sh-profile-main-info">
                <div className="sh-profile-name-text">{displayName}</div>
                <div className="sh-profile-badge-pill">{subtitle}</div>
              </div>
            </div>

            <div className="sh-profile-rows-list">
              <div className="sh-profile-data-row">
                <span className="sh-row-label">รหัสพนักงาน:</span>
                <span className="sh-row-value">{profile?.employeeId || "EMP-001"}</span>
              </div>
              <div className="sh-profile-data-row">
                <span className="sh-row-label">แผนก:</span>
                <span className="sh-row-value">{profile?.department?.name || "ทรัพยากรบุคคล (HR)"}</span>
              </div>
              <div className="sh-profile-data-row">
                <span className="sh-row-label">หน่วยงาน:</span>
                <span className="sh-row-value">{profile?.agency?.name || "CKACE ACCOUNT"}</span>
              </div>
              <div className="sh-profile-data-row">
                <span className="sh-row-label">ชื่อผู้ใช้:</span>
                <span className="sh-row-value">{profile?.loginName || "user@ckace.com"}</span>
              </div>
              <div className="sh-profile-data-row">
                <span className="sh-row-label">สถานะบัญชี:</span>
                <span className="sh-row-value green">✓ ปกติ (Active)</span>
              </div>
            </div>

            <div className="sh-profile-btns-row">
              <Link
                href="/desktop/profile"
                className="sh-pop-btn primary"
                onClick={() => setActivePopover(null)}
              >
                <Icon name="user" size={17} />
                <span>ดูโปรไฟล์เต็ม</span>
              </Link>
              <button
                type="button"
                className="sh-pop-btn danger"
                disabled={loggingOut}
                aria-busy={loggingOut}
                onClick={() => void logout()}
              >
                <Icon name="logout" size={17} />
                <span>{loggingOut ? "กำลังออก..." : "ออกจากระบบ"}</span>
              </button>
            </div>
            {logoutError ? (
              <p role="alert" className="ck-msg error" style={{ margin: "8px 4px 0", fontSize: 13 }}>
                {logoutError}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ===== Main Workspace Container ===== */}
      <div className="sh-workspace">
                {/* Mobile toggle button */}
        <button
          type="button"
          className="sh-mobile-toggle"
          aria-label={mobileNavOpen ? "ปิดเมนูหลัก" : "เปิดเมนูหลัก"}
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen((open) => !open)}
        >
          <Icon name="menu" size={20} />
        </button>

        <main className="ck-main">
          {!routeAllowed ? (
            <div className="ck-state" role="alert" aria-live="assertive">
              <h1>ไม่มีสิทธิ์ใช้งานหน้านี้</h1>
              <p>บัญชีนี้ไม่มีสิทธิ์เข้าถึงเมนูดังกล่าว</p>
              <Link className="ck-btn sky" href="/desktop">
                กลับหน้าหลัก
              </Link>
            </div>
          ) : REDESIGNED_PATHS.has(pathname) ? (
            children
          ) : (
            <>
              {(() => {
                const head = LEGACY_HEADS.find(
                  (item) => pathname === item.path || pathname.startsWith(item.path + "/"),
                );
                return head ? (
                  <PageHead
                    tone={head.tone}
                    icon={head.icon}
                    title={head.title}
                    subtitle={head.subtitle}
                  />
                ) : null;
              })()}
              <div className="ck-legacy ck-wrap desktop-content main-content task396-content">
                {children}
              </div>
            </>
          )}
        </main>
      </div>
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
              <Icon name={app.icon} size={20} />
            </span>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", marginTop: "4px" }}>
              {app.label}
            </span>
          </span>
        ) : (
          <span key={app.label} className="ck-app-i" aria-disabled="true" title="ยังไม่เปิดใช้งาน">
            <span className="ic" style={{ background: app.color, opacity: 0.7 }}>
              <Icon name={app.icon} size={20} />
            </span>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b", marginTop: "4px" }}>
              {app.label}
            </span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b", background: "#edf4fc", padding: "1px 6px", borderRadius: "4px" }}>
              เร็ว ๆ นี้
            </span>
          </span>
        ),
      )}
    </div>
  );
}
