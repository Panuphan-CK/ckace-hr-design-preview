import type { IdentityRecord, IdentityRepository, InternalActorContext } from "@ckace/auth";
import type { OnboardingCredentialRecord, OnboardingRepository } from "@ckace/database";
import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { hashProjectPassword } from "../onboarding/onboarding-auth";
import { AuthorizationGuard } from "./authorization.guard";
import { DesktopAuthService } from "./desktop-auth.service";
import { desktopNavigationForPermissions } from "./desktop-navigation";
import { REQUIRE_PERMISSION_KEY, SELF_AUTHORIZATION_TARGET_KEY } from "./require-permission.decorator";
import type { SecurityRequest } from "./security-request";

/** WD-13 in-memory authorization rehearsal only: NOT hosted TEST user/session UAT. */
type TestRole = "employee" | "superuser" | "admin" | "superadmin";
const base = [
  "profile.self.read", "leave.self.read", "requests.self.read",
  "attendance.self.read", "overtime.self.read", "medical.self.read",
  "benefits.self.read", "announcements.read",
];
const rolePermissions: Record<TestRole, string[]> = {
  employee: base,
  superuser: [...base, "requests.approval.read", "leave.approve", "time_correction.approve"],
  admin: [...base, "requests.approval.read", "leave.approve", "notifications.admin.read", "onboarding.admin.approve"],
  superadmin: [...base, "requests.approval.read", "leave.approve", "notifications.admin.read", "onboarding.admin.approve", "admin.settings.read"],
};
const secret = "wd13-unit-test-secret-".padEnd(48, "x");

function credentialRepository(lookup: Map<string, OnboardingCredentialRecord>): OnboardingRepository {
  return {
    findCredentials: async (username) => lookup.get(username) ?? null,
    findActiveEmployeeIdByLineUserId: async () => null,
    register: async () => { throw new Error("not used"); },
    bindLine: async () => { throw new Error("not used"); },
    activateImportedDesktopCredential: async () => { throw new Error("not used"); },
    listPending: async () => [],
    getApprovalOptions: async () => ({ agencies: [], departments: [] }),
    approve: async () => { throw new Error("not used"); },
  };
}
function identityRepository(identities: Map<string, IdentityRecord>): IdentityRepository {
  return {
    findByEmployeeId: async (employeeId) => identities.get(employeeId) ?? null,
    findByLineUserId: async () => null,
  };
}

function guardContext(
  request: SecurityRequest,
  permission: string,
  scope: "GLOBAL" | "SELF" = "GLOBAL",
  deriveSelf = false,
): ExecutionContext {
  const handler = () => undefined;
  Reflect.defineMetadata(REQUIRE_PERMISSION_KEY, { permission, scope }, handler);
  if (deriveSelf) Reflect.defineMetadata(SELF_AUTHORIZATION_TARGET_KEY, true, handler);
  return {
    getHandler: () => handler,
    getClass: () => class Wd13OnlyController {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe("WD-13 real DesktopAuthService + AuthorizationGuard in-memory matrix", () => {
  const credentials = new Map<string, OnboardingCredentialRecord>();
  const identities = new Map<string, IdentityRecord>();
  let service: DesktopAuthService;
  const guard = new AuthorizationGuard(new Reflector());

  beforeEach(() => {
    process.env.CKACE_DESKTOP_SESSION_SECRET = secret;
    credentials.clear();
    identities.clear();
    for (const [role, permissions] of Object.entries(rolePermissions) as Array<[TestRole, string[]]>) {
      const employeeId = `wd13-local-${role}`;
      identities.set(employeeId, {
        employeeId, legacyUid: null, accountState: "ACTIVE",
        agencyId: "wd13-agency", departmentId: "wd13-department",
        roles: [role], permissions,
      });
      credentials.set(role, {
        employeeId, accountState: "ACTIVE",
        passwordHash: hashProjectPassword(`wd13-pass-${role}`),
        legacyPasswordHash: null,
      });
    }
    service = new DesktopAuthService(credentialRepository(credentials), identityRepository(identities));
  });

  afterEach(() => { delete process.env.CKACE_DESKTOP_SESSION_SECRET; });

  it.each(["employee", "superuser", "admin", "superadmin"] as const)(
    "%s login returns only server-derived identity and specific session capabilities",
    async (role) => {
      const { token, actor } = await service.login({
        username: role.toUpperCase(),
        password: `wd13-pass-${role}`,
      });
      const session = await service.resolveSession({ token });
      expect(session.employeeId).toBe(`wd13-local-${role}`);
      expect(session.authenticatedBy).toBe("PROJECT_B_WEB");
      expect(session.roles).toEqual([role]);
      expect(session.permissions).toEqual(rolePermissions[role]);
      const nav = desktopNavigationForPermissions(session.permissions);
      expect(nav.adminSettings).toBe(role === "superadmin");
      expect(nav.approvals).toBe(role !== "employee");
      expect(nav.notifications).toBe(role === "admin" || role === "superadmin");
      expect(actor.employeeId).toBe(session.employeeId);
    },
  );

  it("a forged elevated role header cannot grant admin.settings.read without a server-populated actor", async () => {
    const { actor } = await service.login({ username: "employee", password: "wd13-pass-employee" });
    const request = { actor, headers: { "x-ckace-role": "superadmin" } } as unknown as SecurityRequest;
    expect(() => guard.canActivate(guardContext(request, "admin.settings.read")))
      .toThrow(ForbiddenException);
    expect(() => guard.canActivate(guardContext({
      headers: { "x-ckace-role": "superadmin" },
    } as unknown as SecurityRequest, "admin.settings.read"))).toThrow(UnauthorizedException);
  });

  it("server guard denies higher permissions even when client navigation is forged", async () => {
    for (const role of ["employee", "superuser", "admin"] as const) {
      const { actor } = await service.login({ username: role, password: `wd13-pass-${role}` });
      const req = { actor, navigation: { adminSettings: true } } as unknown as SecurityRequest;
      expect(() => guard.canActivate(guardContext(req, "admin.settings.read")))
        .toThrow(ForbiddenException);
    }
    const { actor } = await service.login({ username: "superadmin", password: "wd13-pass-superadmin" });
    expect(guard.canActivate(guardContext({ actor }, "admin.settings.read"))).toBe(true);
  });

  it("self-only permission denies cross-employee access for all four roles", async () => {
    for (const role of Object.keys(rolePermissions) as TestRole[]) {
      const { actor } = await service.login({ username: role, password: `wd13-pass-${role}` });
      expect(guard.canActivate(guardContext({
        actor, authorizationTarget: { employeeId: actor.employeeId },
      }, "profile.self.read", "SELF"))).toBe(true);
      expect(() => guard.canActivate(guardContext({
        actor, authorizationTarget: { employeeId: "another-employee" },
      }, "profile.self.read", "SELF"))).toThrow(ForbiddenException);
    }
  });

  it("sessions resolve current server permissions, not stale permissions held at login", async () => {
    const { token } = await service.login({ username: "superadmin", password: "wd13-pass-superadmin" });
    identities.set("wd13-local-superadmin", {
      ...identities.get("wd13-local-superadmin")!, permissions: ["profile.self.read"],
    });
    const actor: InternalActorContext = await service.resolveSession({ token });
    expect(actor.permissions).toEqual(["profile.self.read"]);
    expect(() => guard.canActivate(guardContext({ actor }, "admin.settings.read")))
      .toThrow(ForbiddenException);
  });

  it("an invalid password or a deactivated identity fails closed", async () => {
    await expect(service.login({ username: "employee", password: "wrong" }))
      .rejects.toBeInstanceOf(UnauthorizedException);
    const { token } = await service.login({ username: "employee", password: "wd13-pass-employee" });
    identities.set("wd13-local-employee", {
      ...identities.get("wd13-local-employee")!, accountState: "INACTIVE",
    });
    await expect(service.resolveSession({ token })).rejects.toThrow();
  });
});
