import type {
  PasswordRecoveryAccount,
  PasswordRecoveryRepository,
} from "@ckace/database";
import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { verifyProjectPassword } from "../onboarding/onboarding-auth";
import { PasswordRecoveryService } from "./password-recovery.service";

const NOW = Date.parse("2026-10-14T12:00:00.000Z");
const EMPLOYEE_ID = "11111111-1111-4111-8111-111111111111";
const ACCOUNT_ID = "22222222-2222-4222-8222-222222222222";
const SECRET = "task39.5-password-recovery-secret-32bytes-minimum";

function account(
  overrides: Partial<PasswordRecoveryAccount> = {},
): PasswordRecoveryAccount {
  return {
    id: ACCOUNT_ID,
    employeeId: EMPLOYEE_ID,
    state: "ACTIVE",
    passwordHash: "legacy-project-b-hash",
    legacyPasswordHash: null,
    updatedAt: new Date("2026-10-14T10:00:00.000Z"),
    ...overrides,
  };
}

class FakeRepository implements PasswordRecoveryRepository {
  current: PasswordRecoveryAccount | null = account();
  readonly resetPassword = vi.fn(
    async (
      userAccountId: string,
      expectedUpdatedAt: Date,
      passwordHash: string,
    ) => {
      const current = this.current;
      if (
        !current ||
        current.id !== userAccountId ||
        current.updatedAt.getTime() !== expectedUpdatedAt.getTime()
      ) {
        throw new Error("stale recovery");
      }
      this.current = {
        ...current,
        passwordHash,
        legacyPasswordHash: null,
        updatedAt: new Date(current.updatedAt.getTime() + 1),
      };
      return { employeeId: current.employeeId };
    },
  );

  async findByEmployeeId(
    employeeId: string,
  ): Promise<PasswordRecoveryAccount | null> {
    return this.current?.employeeId === employeeId
      ? this.current
      : null;
  }

  async findByAccountId(
    userAccountId: string,
  ): Promise<PasswordRecoveryAccount | null> {
    return this.current?.id === userAccountId
      ? this.current
      : null;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PasswordRecoveryService", () => {
  it("fails closed when the signing secret is not configured safely", async () => {
    const service = new PasswordRecoveryService(
      new FakeRepository(),
      "too-short",
    );

    await expect(service.issue(EMPLOYEE_ID)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it("issues a signed 15-minute link only for an active account", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const repository = new FakeRepository();
    const service = new PasswordRecoveryService(repository, SECRET);

    const result = await service.issue(EMPLOYEE_ID);

    expect(result.employeeId).toBe(EMPLOYEE_ID);
    expect(result.expiresAt).toBe(
      new Date(NOW + 15 * 60 * 1000).toISOString(),
    );
    expect(result.resetPath).toMatch(/^\/reset-password\?token=/);
    expect(result.resetPath).not.toContain(SECRET);

    repository.current = account({ state: "PENDING" });
    await expect(service.issue(EMPLOYEE_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("resets once, hashes the new password, and invalidates token replay", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const repository = new FakeRepository();
    const service = new PasswordRecoveryService(repository, SECRET);
    const issued = await service.issue(EMPLOYEE_ID);
    const token = new URL(
      "http://local.test" + issued.resetPath,
    ).searchParams.get("token");

    expect(token).toBeTruthy();
    await expect(
      service.reset(token ?? "", "new-password-123"),
    ).resolves.toEqual({
      employeeId: EMPLOYEE_ID,
      reset: true,
    });

    const hashed = repository.current?.passwordHash ?? "";
    expect(hashed).toMatch(/^scrypt-v1\$/);
    expect(
      verifyProjectPassword("new-password-123", hashed),
    ).toBe(true);

    await expect(
      service.reset(token ?? "", "another-password-123"),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.resetPassword).toHaveBeenCalledTimes(1);
  });

  it("rejects a tampered, expired, or credential-version-stale link", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const repository = new FakeRepository();
    const service = new PasswordRecoveryService(repository, SECRET);
    const issued = await service.issue(EMPLOYEE_ID);
    const token =
      new URL("http://local.test" + issued.resetPath).searchParams.get(
        "token",
      ) ?? "";

    await expect(
      service.reset(token + "tamper", "new-password-123"),
    ).rejects.toBeInstanceOf(ForbiddenException);

    repository.current = account({
      updatedAt: new Date("2026-10-14T10:00:01.000Z"),
    });
    await expect(
      service.reset(token, "new-password-123"),
    ).rejects.toBeInstanceOf(ForbiddenException);

    repository.current = account();
    vi.spyOn(Date, "now").mockReturnValue(NOW + 16 * 60 * 1000);
    await expect(
      service.reset(token, "new-password-123"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects invalid replacement passwords before repository mutation", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const repository = new FakeRepository();
    const service = new PasswordRecoveryService(repository, SECRET);
    const issued = await service.issue(EMPLOYEE_ID);
    const token =
      new URL("http://local.test" + issued.resetPath).searchParams.get(
        "token",
      ) ?? "";

    await expect(service.reset(token, "short")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.resetPassword).not.toHaveBeenCalled();
  });
});
