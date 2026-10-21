import type {
  IdentityRecord,
  IdentityRepository,
} from "@ckace/auth";
import type {
  OnboardingCredentialRecord,
  OnboardingRepository,
} from "@ckace/database";
import { UnauthorizedException } from "@nestjs/common";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
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
): OnboardingRepository {
  return {
    findCredentials: async () => credential,
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
    delete process.env.CKACE_DESKTOP_SESSION_SECRET;
    delete process.env.CKACE_LEGACY_PASSWORD_SALT;
  });

  it("authenticates an ACTIVE CKACE HR password and resolves a fresh actor", async () => {
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
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
