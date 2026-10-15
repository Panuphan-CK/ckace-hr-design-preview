import { describe, expect, it } from "vitest";

import {
  IdentityInactiveError,
  IdentityService,
  IdentityUnavailableError,
  type IdentityRecord,
  type IdentityRepository,
} from "./index";

class FakeIdentityRepository implements IdentityRepository {
  constructor(
    private readonly byEmployee:
      Readonly<Record<string, IdentityRecord>> = {},
    private readonly byLine:
      Readonly<Record<string, IdentityRecord>> = {},
  ) {}

  async findByEmployeeId(
    employeeId: string,
  ): Promise<IdentityRecord | null> {
    return this.byEmployee[employeeId] ?? null;
  }

  async findByLineUserId(
    lineUserId: string,
  ): Promise<IdentityRecord | null> {
    return this.byLine[lineUserId] ?? null;
  }
}

const active: IdentityRecord = {
  employeeId: "employee-1",
  legacyUid: null,
  accountState: "ACTIVE",
  agencyId: "agency-1",
  departmentId: "department-1",
  roles: ["Employee", "Employee"],
  permissions: ["leave.self.read", "leave.self.read"],
};

describe("IdentityService", () => {
  it("builds a deduplicated active actor", async () => {
    const service = new IdentityService(
      new FakeIdentityRepository({
        "employee-1": active,
      }),
    );

    const actor = await service.resolveEmployeeActor({
      employeeId: "employee-1",
      authenticatedBy: "PROJECT_B_WEB",
      correlationId: "corr-1",
    });

    expect(actor.roles).toEqual(["Employee"]);
    expect(actor.permissions).toEqual(["leave.self.read"]);
    expect(actor.correlationId).toBe("corr-1");
  });

  it("fails closed for missing identities", async () => {
    const service = new IdentityService(
      new FakeIdentityRepository(),
    );

    await expect(
      service.resolveLineActor({
        lineUserId: "unknown",
      }),
    ).rejects.toBeInstanceOf(IdentityUnavailableError);
  });

  it("fails closed for inactive accounts", async () => {
    const service = new IdentityService(
      new FakeIdentityRepository(
        {},
        {
          "U-1": {
            ...active,
            accountState: "RESIGNED",
          },
        },
      ),
    );

    await expect(
      service.resolveLineActor({
        lineUserId: "U-1",
      }),
    ).rejects.toBeInstanceOf(IdentityInactiveError);
  });

  it("allows a verified legacy UID to be attached by the server bridge", async () => {
    const service = new IdentityService(
      new FakeIdentityRepository({
        "employee-1": active,
      }),
    );

    const actor = await service.resolveEmployeeActor({
      employeeId: "employee-1",
      authenticatedBy: "LEGACY_DESKTOP_BRIDGE",
      legacyUid: "LEGACY-UID-1",
    });

    expect(actor.legacyUid).toBe("LEGACY-UID-1");
  });
});
