import type { InternalActorContext } from "@ckace/auth";
import type {
  DatabaseSelfProfile,
  SelfProfileRepository,
} from "@ckace/database";
import {
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";

class FakeProfileRepository implements SelfProfileRepository {
  constructor(
    private readonly profile: DatabaseSelfProfile | null,
  ) {}

  async findSelfProfile(
    employeeId: string,
  ): Promise<DatabaseSelfProfile | null> {
    void employeeId;
    return this.profile;
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
