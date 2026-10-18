import type { OnboardingRepository } from "@ckace/database";
import { describe, expect, it, vi } from "vitest";

import {
  REQUIRE_PERMISSION_KEY,
} from "../security/require-permission.decorator";
import { OnboardingController } from "./onboarding.controller";
import { OnboardingService } from "./onboarding.service";

const repository = {
  register: vi.fn(),
  findCredentials: vi.fn(),
  findActiveEmployeeIdByLineUserId: vi.fn(),
  bindLine: vi.fn(),
  activateImportedDesktopCredential: vi.fn(),
  listPending: vi.fn(async () => []),
  getApprovalOptions: vi.fn(async () => ({
    agencies: [],
    departments: [],
  })),
  approve: vi.fn(),
} satisfies OnboardingRepository;

const verifier = {
  verify: vi.fn(async () => "unused"),
};

describe("Onboarding admin Desktop API", () => {
  it("protects pending reads and approval with explicit GLOBAL permission", () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSION_KEY,
        OnboardingController.prototype.listPending,
      ),
    ).toEqual({
      permission: "onboarding.admin.approve",
      scope: "GLOBAL",
    });
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSION_KEY,
        OnboardingController.prototype.approvalOptions,
      ),
    ).toEqual({
      permission: "onboarding.admin.approve",
      scope: "GLOBAL",
    });
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSION_KEY,
        OnboardingController.prototype.approve,
      ),
    ).toEqual({
      permission: "onboarding.admin.approve",
      scope: "GLOBAL",
    });
  });

  it("uses repository read projections without exposing credentials", async () => {
    const controller = new OnboardingController(
      new OnboardingService(repository, verifier),
    );
    await expect(
      controller.listPending({
        actor: {
          employeeId: "admin-1",
          legacyUid: null,
          roles: ["ADMIN"],
          permissions: ["onboarding.admin.approve"],
          agencyId: null,
          departmentId: null,
          authenticatedBy: "PROJECT_B_WEB",
          correlationId: "test",
        },
      }),
    ).resolves.toEqual([]);
    expect(repository.findCredentials).not.toHaveBeenCalled();
  });
});
