"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import type { ReactNode } from "react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { requestDesktopLogout } from "./logout-request";

interface NavigationCapabilities {
  leave: boolean;
  requestStatus: boolean;
  approvals: boolean;
  leaveApprovals: boolean;
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

interface NavigationLink {
  readonly type: "link";
  readonly id: string;
  readonly capability?: keyof NavigationCapabilities;
  readonly anyCapabilities?: readonly (keyof NavigationCapabilities)[];
  readonly label: string;
  readonly href: string;
  readonly icon: string;
}

interface NavigationGroup {
  readonly type: "group";
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly items: readonly NavigationLink[];
}

type NavigationEntry = NavigationLink | NavigationGroup;

const NAVIGATION: readonly NavigationEntry[] = [
  {
    type: "link",
    id: "home",
    label: "หน้าหลัก",
    href: "/desktop",
    icon: "bxs-home-smile",
  },
  {
    type: "link",
    id: "calendar",
    capability: "calendar",
    label: "ปฏิทินการลา",
    href: "/desktop/calendar",
    icon: "bxs-calendar",
  },
  {
    type: "group",
    id: "requests",
    label: "คำขอของฉัน",
    icon: "bxs-file-plus",
    items: [
      {
        type: "link",
        id: "request-leave",
        capability: "leave",
        label: "การลา",
        href: "/desktop/leave",
        icon: "bxs-plane-alt",
      },
      {
        type: "link",
        id: "request-overtime",
        capability: "overtime",
        label: "OT",
        href: "/desktop/overtime",
        icon: "bxs-time-five",
      },
      {
        type: "link",
        id: "request-time-correction",
        capability: "attendance",
        label: "แก้ไขเวลา",
        href: "/desktop/attendance#correction-request",
        icon: "bxs-edit-alt",
      },
      {
        type: "link",
        id: "request-medical",
        capability: "medical",
        label: "ค่ารักษาพยาบาล",
        href: "/desktop/medical",
        icon: "bxs-first-aid",
      },
    ],
  },
  {
    type: "group",
    id: "approvals",
    label: "งานอนุมัติ",
    icon: "bxs-check-shield",
    items: [
      {
        type: "link",
        id: "approval-leave",
        capability: "leaveApprovals",
        label: "การลา",
        href: "/desktop/approvals#leave",
        icon: "bxs-plane-alt",
      },
      {
        type: "link",
        id: "approval-overtime",
        capability: "overtimeApprovals",
        label: "OT",
        href: "/desktop/approvals#overtime",
        icon: "bxs-time-five",
      },
      {
        type: "link",
        id: "approval-time-correction",
        capability: "timeCorrectionApprovals",
        label: "แก้ไขเวลา",
        href: "/desktop/approvals#time-correction",
        icon: "bxs-edit-alt",
      },
      {
        type: "link",
        id: "approval-medical",
        capability: "medicalApprovals",
        label: "ค่ารักษาพยาบาล",
        href: "/desktop/approvals#medical",
        icon: "bxs-first-aid",
      },
    ],
  },
  {
    type: "group",
    id: "reports",
    label: "รายงาน",
    icon: "bxs-bar-chart-alt-2",
    items: [
      {
        type: "link",
        id: "report-overview",
        capability: "reports",
        label: "ภาพรวม",
        href: "/desktop/reports#overview",
        icon: "bxs-dashboard",
      },
      {
        type: "link",
        id: "report-leave",
        capability: "reports",
        label: "การลา",
        href: "/desktop/reports#leave",
        icon: "bxs-plane-alt",
      },
      {
        type: "link",
        id: "report-attendance",
        capability: "reports",
        label: "การเข้างาน",
        href: "/desktop/reports#attendance",
        icon: "bxs-user-check",
      },
      {
        type: "link",
        id: "report-overtime",
        capability: "reports",
        label: "OT",
        href: "/desktop/reports#overtime",
        icon: "bxs-time-five",
      },
      {
        type: "link",
        id: "report-medical",
        capability: "reports",
        label: "ค่ารักษาพยาบาล",
        href: "/desktop/reports#medical",
        icon: "bxs-first-aid",
      },
    ],
  },
  {
    type: "group",
    id: "employees",
    label: "พนักงาน",
    icon: "bxs-group",
    items: [
      {
        type: "link",
        id: "employee-master",
        capability: "usersAdmin",
        label: "ฐานข้อมูลพนักงาน",
        href: "/desktop/admin/management#users",
        icon: "bxs-user-detail",
      },
      {
        type: "link",
        id: "organization",
        capability: "organizationAdmin",
        label: "โครงสร้างและสังกัด",
        href: "/desktop/admin/management#organization",
        icon: "bxs-buildings",
      },
      {
        type: "link",
        id: "access-control",
        capability: "rbacAdmin",
        label: "สิทธิ์และการเข้าถึง",
        href: "/desktop/admin/management#roles",
        icon: "bxs-shield-plus",
      },
    ],
  },
  {
    type: "group",
    id: "leave-settings",
    label: "ตั้งค่าระบบลา",
    icon: "bxs-calendar-cog",
    items: [
      {
        type: "link",
        id: "leave-entitlements",
        capability: "entitlementAdmin",
        label: "สิทธิวันลา",
        href: "/desktop/admin/management#entitlements",
        icon: "bxs-calendar-star",
      },
      {
        type: "link",
        id: "work-calendar",
        capability: "workCalendarAdmin",
        label: "วันหยุด / วันทำงาน",
        href: "/desktop/admin/management#work-calendar",
        icon: "bxs-calendar-check",
      },
    ],
  },
  {
    type: "link",
    id: "platform-settings",
    capability: "adminSettings",
    label: "ตั้งค่าระบบ",
    href: "/desktop/admin",
    icon: "bxs-cog",
  },
] as const;

function canSeeLink(
  item: NavigationLink,
  navigation: NavigationCapabilities,
): boolean {
  if (
    item.anyCapabilities &&
    item.anyCapabilities.some((capability) => navigation[capability])
  ) {
    return true;
  }
  return item.capability === undefined || navigation[item.capability];
}

function isLinkActive(
  item: NavigationLink,
  pathname: string,
  currentHash: string,
): boolean {
  const [itemPath = item.href, itemHashPart] = item.href.split("#", 2);
  const itemHash = itemHashPart ? "#" + itemHashPart : "";

  if (itemHash) {
    return pathname === itemPath && currentHash === itemHash;
  }
  if (itemPath === "/desktop") {
    return pathname === itemPath && currentHash === "";
  }
  if (item.id === "platform-settings") {
    return pathname === itemPath;
  }
  return (
    (pathname === itemPath || pathname.startsWith(itemPath + "/")) &&
    currentHash === ""
  );
}

export function DesktopShell({
  children,
}: {
  readonly children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<SessionState>({
    status: "loading",
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [currentHash, setCurrentHash] = useState("");

  useEffect(() => {
    const syncHash = () => setCurrentHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("ckace-desktop-theme");
    const initialDark = storedTheme === "dark";
    document.body.classList.toggle("dark", initialDark);
    setDarkMode(initialDark);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/security/session", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        if (response.status === 401) {
          if (!cancelled) router.replace("/login");
          return null;
        }
        if (!response.ok) {
          throw new Error("session unavailable");
        }
        return response.json() as Promise<SessionPayload>;
      })
      .then((session) => {
        if (!cancelled && session) {
          setState({ status: "ready", session });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              "ไม่สามารถตรวจสอบสิทธิ์การเข้าใช้งานได้ กรุณาลองใหม่อีกครั้ง",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const visibleNavigation = useMemo(() => {
    if (state.status !== "ready") return [];
    return NAVIGATION.flatMap((entry): NavigationEntry[] => {
      if (entry.type === "link") {
        return canSeeLink(entry, state.session.navigation) ? [entry] : [];
      }
      const items = entry.items.filter((item) =>
        canSeeLink(item, state.session.navigation),
      );
      return items.length > 0 ? [{ ...entry, items }] : [];
    });
  }, [state]);

  useEffect(() => {
    for (const entry of visibleNavigation) {
      if (
        entry.type === "group" &&
        entry.items.some((item) => isLinkActive(item, pathname, currentHash))
      ) {
        setOpenGroupId(entry.id);
        return;
      }
    }
  }, [currentHash, pathname, visibleNavigation]);

  const activeTitle = useMemo(() => {
    for (const entry of visibleNavigation) {
      if (entry.type === "link") {
        if (isLinkActive(entry, pathname, currentHash)) {
          return entry.label;
        }
        continue;
      }
      const activeItem = entry.items.find((item) =>
        isLinkActive(item, pathname, currentHash),
      );
      if (activeItem) {
        return entry.label + " · " + activeItem.label;
      }
    }
    if (pathname === "/desktop/attendance") return "เวลาเข้างาน";
    if (pathname === "/desktop/profile") return "โปรไฟล์ของฉัน";
    if (pathname === "/desktop/notifications") return "การแจ้งเตือน";
    if (pathname === "/desktop/benefits") return "สิทธิและสวัสดิการ";
    if (pathname === "/desktop/announcements") return "ประชาสัมพันธ์";
    return "CKACE Employee Services";
  }, [currentHash, pathname, visibleNavigation]);

  function toggleTheme() {
    setDarkMode((current) => {
      const next = !current;
      document.body.classList.toggle("dark", next);
      window.localStorage.setItem(
        "ckace-desktop-theme",
        next ? "dark" : "light",
      );
      return next;
    });
  }

  function toggleGroup(groupId: string) {
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
    }
    setOpenGroupId((current) => (current === groupId ? null : groupId));
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
    setLogoutError(
      "ยังไม่ยืนยันการออกจากระบบ กรุณาลองใหม่อีกครั้ง หรือปิดหน้าต่างเบราว์เซอร์",
    );
    setLoggingOut(false);
  }

  if (state.status === "loading") {
    return (
      <main className="state-page">
        <div
          className="state-card"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="spinner" aria-hidden="true" />
          <h1>กำลังตรวจสอบสิทธิ์</h1>
          <p>กำลังเตรียมพื้นที่บริการพนักงานของคุณ</p>
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="state-page">
        <div className="state-card" role="alert">
          <div className="status-badge error">เกิดข้อผิดพลาด</div>
          <h1>เปิดพื้นที่บริการพนักงานไม่สำเร็จ</h1>
          <p>{state.message}</p>
          <button
            className="primary-button"
            onClick={() => window.location.reload()}
          >
            ลองใหม่
          </button>
        </div>
      </main>
    );
  }

  return (
    <div
      className={
        sidebarCollapsed
          ? "desktop-frame admin-dashboard task396-shell sidebar-collapsed"
          : "desktop-frame admin-dashboard task396-shell"
      }
    >
      <aside
        className={
          menuOpen
            ? "desktop-sidebar sidebar task396-sidebar open"
            : "desktop-sidebar sidebar task396-sidebar"
        }
      >
        <div className="sidebar-brand sidebar-logo task396-brand">
          <span
            className="company-logo sidebar-logo-image"
            role="img"
            aria-label="โลโก้บริษัท C.K.ACE"
          />
          <span className="task396-brand-copy sidebar-menu-item-text">
            <strong>Employee Services</strong>
            <small>Leave-first workspace</small>
          </span>
        </div>

        <nav
          className="desktop-nav sidebar-menu-list task396-nav"
          aria-label="เมนูหลัก"
        >
          <div className="task396-nav-caption sidebar-menu-item-text">
            WORKSPACE
          </div>

          {visibleNavigation.map((entry, index) => {
            const systemDivider = entry.id === "platform-settings";
            if (entry.type === "link") {
              const active = isLinkActive(entry, pathname, currentHash);
              return (
                <div
                  className={
                    systemDivider
                      ? "task396-nav-entry task396-platform-entry"
                      : "task396-nav-entry"
                  }
                  key={entry.id}
                >
                  {systemDivider ? (
                    <div className="task396-nav-divider" aria-hidden="true" />
                  ) : null}
                  <Link
                    href={entry.href}
                    className={
                      active
                        ? "nav-item sidebar-menu-item-link task396-nav-link active"
                        : "nav-item sidebar-menu-item-link task396-nav-link"
                    }
                    onClick={() => setMenuOpen(false)}
                  >
                    <i
                      className={"bx " + entry.icon + " sidebar-menu-item-icon"}
                      aria-hidden="true"
                    />
                    <span className="sidebar-menu-item-text">{entry.label}</span>
                  </Link>
                </div>
              );
            }

            const groupActive = entry.items.some((item) =>
              isLinkActive(item, pathname, currentHash),
            );
            const open = openGroupId === entry.id;

            return (
              <div
                className={
                  groupActive
                    ? "task396-nav-entry task396-nav-group active"
                    : "task396-nav-entry task396-nav-group"
                }
                key={entry.id}
              >
                {index === 2 ? (
                  <div className="task396-section-label sidebar-menu-item-text">
                    งานของฉัน
                  </div>
                ) : entry.id === "employees" ? (
                  <div className="task396-section-label sidebar-menu-item-text">
                    การบริหาร
                  </div>
                ) : null}

                <button
                  className={
                    groupActive
                      ? "task396-nav-group-button active"
                      : "task396-nav-group-button"
                  }
                  type="button"
                  aria-expanded={open}
                  aria-controls={"task396-group-" + entry.id}
                  onClick={() => toggleGroup(entry.id)}
                >
                  <i
                    className={"bx " + entry.icon + " sidebar-menu-item-icon"}
                    aria-hidden="true"
                  />
                  <span className="sidebar-menu-item-text">{entry.label}</span>
                  <i
                    className={
                      open
                        ? "bx bx-chevron-up task396-nav-chevron sidebar-menu-item-text"
                        : "bx bx-chevron-down task396-nav-chevron sidebar-menu-item-text"
                    }
                    aria-hidden="true"
                  />
                </button>

                <div
                  id={"task396-group-" + entry.id}
                  className={
                    open
                      ? "task396-nav-children open"
                      : "task396-nav-children"
                  }
                >
                  {entry.items.map((item) => {
                    const active = isLinkActive(
                      item,
                      pathname,
                      currentHash,
                    );
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={
                          active
                            ? "task396-nav-child active"
                            : "task396-nav-child"
                        }
                        onClick={() => setMenuOpen(false)}
                      >
                        <span
                          className="task396-nav-child-dot"
                          aria-hidden="true"
                        />
                        <span className="sidebar-menu-item-text">
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer task396-sidebar-footer">
          <div className="sidebar-security-line">
            <span className="security-dot" aria-hidden="true" />
            <span className="sidebar-menu-item-text">
              เชื่อมต่ออย่างปลอดภัย
            </span>
          </div>
          <button
            className="logout-btn"
            type="button"
            aria-busy={loggingOut}
            onClick={() => void logout()}
            disabled={loggingOut}
          >
            <i className="bx bx-log-out logout-btn-icon" aria-hidden="true" />
            <span className="logout-btn-text">
              {loggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
            </span>
          </button>
          {logoutError ? (
            <span role="alert" className="sidebar-logout-error">
              {logoutError}
            </span>
          ) : null}
        </div>
      </aside>

      {menuOpen ? (
        <button
          className="sidebar-backdrop sidebar-overlay"
          aria-label="ปิดเมนู"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <div className="desktop-workspace">
        <header className="desktop-topbar navbar task396-topbar">
          <button
            id="desktop-toggle"
            className="shell-menu-toggle"
            type="button"
            aria-label={sidebarCollapsed ? "ขยายเมนู" : "ย่อเมนู"}
            onClick={() => setSidebarCollapsed((current) => !current)}
          >
            <i className="bx bx-menu" aria-hidden="true" />
          </button>
          <button
            id="mobile-toggle"
            className="shell-menu-toggle mobile-toggle"
            type="button"
            aria-label="เปิดเมนู"
            onClick={() => setMenuOpen(true)}
          >
            <i className="bx bx-menu" aria-hidden="true" />
          </button>

          <div className="navbar-title task396-page-title">
            <small>CKACE</small>
            <strong>{activeTitle}</strong>
          </div>

          <div className="topbar-actions">
            {state.session.navigation.attendance ? (
              <Link
                className="navbar-checkin-button task396-checkin"
                href="/desktop/attendance"
              >
                <i className="bx bxs-watch" aria-hidden="true" />
                <span className="hidden-mobile-text">ลงเวลา</span>
              </Link>
            ) : null}

            {state.session.navigation.notifications ? (
              <Link
                className="notification-btn navbar-icon-button"
                href="/desktop/notifications"
                aria-label="เปิดการแจ้งเตือน"
              >
                <i className="bx bxs-bell" aria-hidden="true" />
              </Link>
            ) : null}

            <button
              className="dark-mode-toggle"
              type="button"
              aria-label={darkMode ? "ใช้โหมดสว่าง" : "ใช้โหมดมืด"}
              aria-pressed={darkMode}
              onClick={toggleTheme}
            >
              <span className="slider">
                <i
                  className={darkMode ? "bx bxs-moon" : "bx bxs-sun"}
                  aria-hidden="true"
                />
              </span>
            </button>

            {state.session.navigation.profile ? (
              <Link className="topbar-profile" href="/desktop/profile">
                <span className="topbar-avatar" aria-hidden="true">
                  <i className="bx bxs-user" />
                </span>
                <span className="topbar-profile-copy">
                  <strong>บัญชีพนักงาน</strong>
                  <small>{state.session.employeeId}</small>
                </span>
              </Link>
            ) : null}
          </div>
        </header>
        <main className="desktop-content main-content task396-content">
          {children}
        </main>
      </div>
    </div>
  );
}
