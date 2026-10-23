import { describe, expect, it } from "vitest";

import {
  canAccessDesktopRoute,
  desktopRouteCapabilities,
} from "./desktop-route-access";

const employee = {
  leave: true,
  requestStatus: true,
  attendance: true,
  overtime: true,
  medical: true,
  calendar: true,
  profile: true,
  reports: false,
  approvals: false,
  leaveApprovals: false,
  overtimeApprovals: false,
  timeCorrectionApprovals: false,
  medicalApprovals: false,
  admin: false,
  announcementAdmin: false,
  announcements: true,
  notifications: false,
  delegation: false,
  onboarding: false,
  benefits: true,
  organizationAdmin: false,
  entitlementAdmin: false,
  rbacAdmin: false,
};

describe("desktop route capability gate", () => {
  it("maps hash routes to their specific approval capability", () => {
    const routes = [
      ["#leave", "leaveApprovals"],
      ["#overtime", "overtimeApprovals"],
      ["#time-correction", "timeCorrectionApprovals"],
      ["#medical", "medicalApprovals"],
    ] as const;

    for (const [hash, capability] of routes) {
      expect(desktopRouteCapabilities("/desktop/approvals", hash)).toEqual([capability]);
      expect(canAccessDesktopRoute({ [capability]: true }, "/desktop/approvals", hash)).toBe(true);
      expect(canAccessDesktopRoute({}, "/desktop/approvals", hash)).toBe(false);
    }
  });

  it("keeps each organization hash tied to its own permission", () => {
    const routes = [
      ["#entitlements", "entitlementAdmin"],
      ["#work-calendar", "workCalendarAdmin"],
      ["#users", "usersAdmin"],
      ["#organization", "organizationAdmin"],
      ["#roles", "rbacAdmin"],
    ] as const;

    for (const [hash, capability] of routes) {
      expect(desktopRouteCapabilities("/desktop/admin/management", hash)).toEqual([capability]);
      expect(canAccessDesktopRoute({ [capability]: true }, "/desktop/admin/management", hash)).toBe(true);
      expect(canAccessDesktopRoute({}, "/desktop/admin/management", hash)).toBe(false);
    }
  });

  it("allows the management landing route for any management read capability", () => {
    const managementCapabilities = [
      "organizationAdmin",
      "rbacAdmin",
      "usersAdmin",
      "entitlementAdmin",
      "workCalendarAdmin",
    ] as const;

    for (const capability of managementCapabilities) {
      expect(canAccessDesktopRoute({ [capability]: true }, "/desktop/admin/management")).toBe(true);
    }
    expect(canAccessDesktopRoute({}, "/desktop/admin/management")).toBe(false);
  });

  it("fails closed for employee direct URLs to reports, approvals and admin", () => {
    expect(canAccessDesktopRoute(employee, "/desktop/reports", "#attendance")).toBe(false);
    expect(canAccessDesktopRoute(employee, "/desktop/approvals", "#leave")).toBe(false);
    expect(canAccessDesktopRoute(employee, "/desktop/admin/management", "#roles")).toBe(false);
  });

  it("allows permitted employee self-service routes", () => {
    expect(canAccessDesktopRoute(employee, "/desktop/leave")).toBe(true);
    expect(canAccessDesktopRoute(employee, "/desktop/attendance")).toBe(true);
    expect(canAccessDesktopRoute(employee, "/desktop/announcements")).toBe(true);
    expect(canAccessDesktopRoute(employee, "/desktop")).toBe(true);
  });

  it("allows announcement readers and administrators through the shared route", () => {
    expect(canAccessDesktopRoute({ announcements: true }, "/desktop/announcements")).toBe(true);
    expect(canAccessDesktopRoute({ announcementAdmin: true }, "/desktop/announcements")).toBe(true);
    expect(canAccessDesktopRoute({ announcements: true }, "/desktop/announcements/manage")).toBe(false);
  });

  it("normalizes trailing slashes without weakening the gate", () => {
    expect(canAccessDesktopRoute(employee, "/desktop/reports/", "#leave")).toBe(false);
    expect(canAccessDesktopRoute(employee, "/desktop/leave/")).toBe(true);
  });
});
