import type {
  IdentityRecord,
  IdentityRepository,
} from "@ckace/auth";
import type {
  OnboardingCredentialRecord,
  OnboardingRepository,
} from "@ckace/database";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  hashProjectPassword,
} from "../onboarding/onboarding-auth";
import { DesktopAuthService } from "./desktop-auth.service";

const activeIdentity: IdentityRecord = {
  employeeId: "employee-1",
  legacyUid: null,
  accountState: "ACTIVE",
  agencyId: "agency-1",
  departmentId: "department-1",
  roles: ["EMPLOYEE"],
  permissions: ["profile.self.read", "leave.self.read"],
};

function repository(
  credential: OnboardingCredentialRecord | null,
  lineEmployeeId: string | null = null,
): OnboardingRepository {
  return {
    findCredentials: async () => credential,
    findActiveEmployeeIdByLineUserId: async () => lineEmployeeId,
    register: async () => {
      throw new Error("not used");
    },
    bindLine: async () => {
      throw new Error("not used");
    },
    activateImportedDesktopCredential: async () => {
      throw new Error("not used");
    },
    listPending: async () => [],
    getApprovalOptions: async () => ({
      agencies: [],
      departments: [],
    }),
    approve: async () => {
      throw new Error("not used");
    },
  };
}

const identityRepository: IdentityRepository = {
  findByEmployeeId: async (employeeId) =>
    employeeId === "employee-1" ? activeIdentity : null,
  findByLineUserId: async () => null,
};

describe("DesktopAuthService", () => {
  beforeEach(() => {
    process.env.CKACE_DESKTOP_SESSION_SECRET = "s".repeat(48);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.LINE_LOGIN_CHANNEL_ID;
    delete process.env.CKACE_DESKTOP_SESSION_SECRET;
    delete process.env.CKACE_LEGACY_PASSWORD_SALT;
  });

  it("authenticates an ACTIVE Project B password and resolves a fresh actor", async () => {
    const service = new DesktopAuthService(
      repository({
        employeeId: "employee-1",
        accountState: "ACTIVE",
        passwordHash: hashProjectPassword("correct-password"),
        legacyPasswordHash: null,
      }),
      identityRepository,
    );

    const result = await service.login({
      username: " USER ",
      password: "correct-password",
      correlationId: "correlation-1",
    });

    expect(result.actor).toMatchObject({
      employeeId: "employee-1",
      authenticatedBy: "PROJECT_B_WEB",
      correlationId: "correlation-1",
    });

    await expect(
      service.resolveSession({
        token: result.token,
      }),
    ).resolves.toMatchObject({
      employeeId: "employee-1",
      authenticatedBy: "PROJECT_B_WEB",
    });
  });

  it("fails closed for invalid credentials and inactive accounts", async () => {
    const invalid = new DesktopAuthService(
      repository({
        employeeId: "employee-1",
        accountState: "ACTIVE",
        passwordHash: hashProjectPassword("correct-password"),
        legacyPasswordHash: null,
      }),
      identityRepository,
    );
    await expect(
      invalid.login({
        username: "user",
        password: "wrong-password",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const inactive = new DesktopAuthService(
      repository({
        employeeId: "employee-1",
        accountState: "INACTIVE",
        passwordHash: hashProjectPassword("correct-password"),
        legacyPasswordHash: null,
      }),
      identityRepository,
    );
    await expect(
      inactive.login({
        username: "user",
        password: "correct-password",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const pending = new DesktopAuthService(
      repository({
        employeeId: "employee-1",
        accountState: "PENDING",
        passwordHash: hashProjectPassword("correct-password"),
        legacyPasswordHash: null,
      }),
      identityRepository,
    );
    await expect(
      pending.login({ username: "user", password: "wrong-password" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      pending.login({ username: "user", password: "correct-password" }),
    ).rejects.toThrow("pending approval");
  });

  it("locks a login name for 5 minutes after 5 wrong passwords", async () => {
    const service = new DesktopAuthService(
      repository({
        employeeId: "employee-1",
        accountState: "ACTIVE",
        passwordHash: hashProjectPassword("correct-password"),
        legacyPasswordHash: null,
      }),
      identityRepository,
    );
    for (let i = 0; i < 5; i += 1) {
      await expect(
        service.login({ username: "user", password: "wrong-password" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }
    await expect(
      service.login({ username: "user", password: "correct-password" }),
    ).rejects.toMatchObject({ status: 429 });
  });

  describe("loginWithLine", () => {
    const idToken = "line-id-token-".repeat(3);
    const stubLine = (ok: boolean, sub = "U-line-1") =>
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({ ok, json: async () => ({ sub }) })),
      );

    beforeEach(() => {
      process.env.LINE_LOGIN_CHANNEL_ID = "1234567890";
    });

    it("signs in the employee linked to the verified LINE account", async () => {
      stubLine(true);
      const service = new DesktopAuthService(
        repository(null, "employee-1"),
        identityRepository,
      );

      const result = await service.loginWithLine({ idToken });

      expect(result.actor).toMatchObject({
        employeeId: "employee-1",
        authenticatedBy: "PROJECT_B_WEB",
      });
      await expect(
        service.resolveSession({ token: result.token }),
      ).resolves.toMatchObject({ employeeId: "employee-1" });
    });

    it("rejects a LINE account that is not linked to an active employee", async () => {
      stubLine(true);
      const service = new DesktopAuthService(
        repository(null, null),
        identityRepository,
      );

      await expect(
        service.loginWithLine({ idToken }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("rejects a token LINE refuses to verify and a malformed token", async () => {
      stubLine(false);
      const service = new DesktopAuthService(
        repository(null, "employee-1"),
        identityRepository,
      );

      await expect(
        service.loginWithLine({ idToken }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(
        service.loginWithLine({ idToken: "short" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
