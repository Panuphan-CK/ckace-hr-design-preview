import type { InternalActorContext } from "@ckace/auth";
import type {
  DatabaseSelfProfile,
  SelfProfileRepository,
} from "@ckace/database";
import { createHash } from "node:crypto";

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { hashProjectPassword, verifyProjectPassword } from "../onboarding/onboarding-auth";
import { REQUIRE_PERMISSION_KEY } from "../security/require-permission.decorator";

import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";

class FakeProfileRepository implements SelfProfileRepository {
  async linkOwnMedia(): Promise<void> {}

  constructor(
    private readonly profile: DatabaseSelfProfile | null,
  ) {}

  async findSelfProfile(
    employeeId: string,
  ): Promise<DatabaseSelfProfile | null> {
    void employeeId;
    return this.profile;
  }

  async readCredentials() {
    return null;
  }

  async setPassword() {
    return;
  }
}

const record: DatabaseSelfProfile = {
  employeeId: "00000000-0000-4000-8000-000000000001",
  fullName: "Example Employee",
  nickname: "Example",
  dateOfBirth: "1990-01-02",
  employmentStart: "2020-03-04",
  resignationDate: null,
  accountState: "ACTIVE",
  loginName: "employee@example.test",
  agency: {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Agency",
  },
  department: {
    id: "00000000-0000-4000-8000-000000000003",
    name: "Department",
  },
  roles: ["EMPLOYEE"],
  lineLinked: true,
  profileAttachmentId:
    "00000000-0000-4000-8000-000000000004",
  signatureAttachmentId: null,
};

const actor: InternalActorContext = {
  employeeId: record.employeeId,
  legacyUid: "USER-001",
  roles: ["EMPLOYEE"],
  permissions: ["profile.self.read"],
  agencyId: record.agency?.id ?? null,
  departmentId: record.department?.id ?? null,
  authenticatedBy: "PROJECT_B_WEB",
  correlationId: "corr-profile",
};

describe("ProfileService", () => {
  it("returns a privacy-minimized self profile", async () => {
    const service = new ProfileService(
      new FakeProfileRepository(record),
    );

    await expect(
      service.getSelfProfile(record.employeeId),
    ).resolves.toEqual({
      employeeId: record.employeeId,
      fullName: "Example Employee",
      nickname: "Example",
      dateOfBirth: "1990-01-02",
      employmentStart: "2020-03-04",
      resignationDate: null,
      accountState: "ACTIVE",
      loginName: "employee@example.test",
      agency: record.agency,
      department: record.department,
      roles: ["EMPLOYEE"],
      lineLinked: true,
      media: {
        profile: {
          attachmentId:
            "00000000-0000-4000-8000-000000000004",
        },
        signature: null,
      },
    });
  });

  it("does not expose provider URLs, secrets, or LINE user IDs", async () => {
    const service = new ProfileService(
      new FakeProfileRepository(record),
    );

    const response = await service.getSelfProfile(
      record.employeeId,
    );
    const serialized = JSON.stringify(response);

    expect(serialized).not.toContain("legacyDrive");
    expect(serialized).not.toContain("storageKey");
    expect(serialized).not.toContain("lineUserId");
    expect(serialized).not.toContain("password");
  });

  it("fails closed when the canonical profile is unavailable", async () => {
    const service = new ProfileService(
      new FakeProfileRepository(null),
    );

    await expect(
      service.getSelfProfile(record.employeeId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("ProfileController", () => {
  it("uses only the server-populated actor employee id", async () => {
    const controller = new ProfileController(
      new ProfileService(
        new FakeProfileRepository(record),
      ),
    );

    await expect(
      controller.getSelf({ actor }),
    ).resolves.toMatchObject({
      employeeId: record.employeeId,
    });
  });

  it("rejects a request without a server-populated actor", async () => {
    const controller = new ProfileController(
      new ProfileService(
        new FakeProfileRepository(record),
      ),
    );

    await expect(
      controller.getSelf({}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe("Profile password change", () => {
  class CredentialRepository implements SelfProfileRepository {
    async linkOwnMedia(): Promise<void> {}

    saved: { employeeId: string; passwordHash: string } | undefined;

    constructor(private readonly passwordHash: string | null, private readonly legacy: string | null = null) {}

    async findSelfProfile(): Promise<DatabaseSelfProfile | null> {
      return null;
    }

    async readCredentials() {
      return { passwordHash: this.passwordHash, legacyPasswordHash: this.legacy };
    }

    async setPassword(input: { employeeId: string; passwordHash: string }) {
      this.saved = input;
    }
  }

  const employeeId = "00000000-0000-4000-8000-000000000001";

  it("requires the current password and stores a new scrypt hash", async () => {
    const repository = new CredentialRepository(hashProjectPassword("OldPassword#1"));
    const service = new ProfileService(repository);

    await expect(
      service.changePassword({ employeeId, correlationId: "c", body: { currentPassword: "wrong-password", newPassword: "NewPassword#2" } }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.saved).toBeUndefined();

    await expect(
      service.changePassword({ employeeId, correlationId: "c", body: { currentPassword: "OldPassword#1", newPassword: "NewPassword#2" } }),
    ).resolves.toEqual({ changed: true });
    expect(repository.saved?.passwordHash.startsWith("scrypt-v1$")).toBe(true);
    expect(verifyProjectPassword("NewPassword#2", repository.saved?.passwordHash ?? "")).toBe(true);
  });

  it("rejects short, unchanged or malformed passwords before touching the database", async () => {
    const repository = new CredentialRepository(hashProjectPassword("OldPassword#1"));
    const service = new ProfileService(repository);
    const run = (body: unknown) => service.changePassword({ employeeId, correlationId: "c", body });

    await expect(run({ currentPassword: "OldPassword#1", newPassword: "short" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(run({ currentPassword: "OldPassword#1", newPassword: "OldPassword#1" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(run({ currentPassword: 1, newPassword: "NewPassword#2" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(run(null)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.saved).toBeUndefined();
  });

  it("accepts the legacy hash as the current password and the route needs profile.self.write", async () => {
    process.env.CKACE_LEGACY_PASSWORD_SALT = "unit-test-salt";
    const legacy = createHash("sha256").update("LegacyPass#1" + "unit-test-salt", "utf8").digest("base64");
    const repository = new CredentialRepository(null, legacy);
    const service = new ProfileService(repository);

    await expect(
      service.changePassword({ employeeId, correlationId: "c", body: { currentPassword: "LegacyPass#1", newPassword: "NewPassword#2" } }),
    ).resolves.toEqual({ changed: true });

    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, ProfileController.prototype.changePassword)).toEqual({
      permission: "profile.self.write",
      scope: "SELF",
    });
    delete process.env.CKACE_LEGACY_PASSWORD_SALT;
  });
});
