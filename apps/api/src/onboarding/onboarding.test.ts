import type { OnboardingRepository } from "@ckace/database";
import { describe, expect, it, vi } from "vitest";

import {
  hashProjectPassword,
  verifyProjectPassword,
} from "./onboarding-auth";
import { OnboardingService } from "./onboarding.service";

describe("Pending LINE onboarding", () => {
  it("uses a modern password hash for new CKACE HR registrations", () => {
    const hash = hashProjectPassword("correct-horse");
    expect(hash).toMatch(/^scrypt-v1\$/);
    expect(verifyProjectPassword("correct-horse", hash)).toBe(true);
    expect(verifyProjectPassword("wrong-password", hash)).toBe(false);
  });

  it("binds verified LINE subject while account remains PENDING", async () => {
    const hash = hashProjectPassword("correct-horse");
    const repository = {
      register: vi.fn(),
      findCredentials: vi.fn(async () => ({
        employeeId: "00000000-0000-4000-8000-000000000001",
        accountState: "PENDING" as const,
        passwordHash: hash,
        legacyPasswordHash: null,
      })),
      bindLine: vi.fn(async (employeeId: string, lineUserId: string) => ({
        employeeId,
        accountState: "PENDING" as const,
        linked: true as const,
        unchanged: false,
        pendingApproval: true,
        lineUserId,
      })),
      activateImportedDesktopCredential: vi.fn(),
      listPending: vi.fn(async () => []),
      getApprovalOptions: vi.fn(async () => ({
        agencies: [],
        departments: [],
      })),
      approve: vi.fn(),
    } satisfies OnboardingRepository;
    const verifier = { verify: vi.fn(async () => "U_verified_subject") };
    const result = await new OnboardingService(repository, verifier).bindLine({
      username: "employee",
      password: "correct-horse",
      lineIdToken: "verified-id-token",
    });
    expect(verifier.verify).toHaveBeenCalledWith("verified-id-token");
    expect(repository.bindLine).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
      "U_verified_subject",
    );
    expect(result.pendingApproval).toBe(true);
    expect(result.accountState).toBe("PENDING");
  });

  it("activates an imported ACTIVE account only through verified existing LINE identity", async () => {
    const repository = {
      register: vi.fn(),
      findCredentials: vi.fn(),
      bindLine: vi.fn(),
      activateImportedDesktopCredential: vi.fn(
        async (
          lineUserId: string,
          passwordHash: string,
        ) => {
          void lineUserId;
          void passwordHash;
          return {
            employeeId: "00000000-0000-4000-8000-000000000010",
            accountState: "ACTIVE" as const,
            activated: true as const,
          };
        },
      ),
      listPending: vi.fn(async () => []),
      getApprovalOptions: vi.fn(async () => ({
        agencies: [],
        departments: [],
      })),
      approve: vi.fn(),
    } satisfies OnboardingRepository;
    const verifier = {
      verify: vi.fn(async () => "U_existing_binding"),
    };

    const result = await new OnboardingService(
      repository,
      verifier,
    ).activateImportedDesktop({
      password: "new-desktop-password",
      lineIdToken: "verified-line-token",
    });

    expect(verifier.verify).toHaveBeenCalledWith(
      "verified-line-token",
    );
    expect(
      repository.activateImportedDesktopCredential,
    ).toHaveBeenCalledTimes(1);
    expect(
      repository.activateImportedDesktopCredential.mock
        .calls[0]?.[0],
    ).toBe("U_existing_binding");
    const encoded =
      repository.activateImportedDesktopCredential.mock
        .calls[0]?.[1] ?? "";
    expect(encoded).toMatch(/^scrypt-v1\$/);
    expect(
      verifyProjectPassword(
        "new-desktop-password",
        encoded,
      ),
    ).toBe(true);
    expect(result).toEqual({
      employeeId:
        "00000000-0000-4000-8000-000000000010",
      accountState: "ACTIVE",
      activated: true,
    });
  });

  it("rejects imported Desktop activation when LINE verification fails", async () => {
    const repository = {
      register: vi.fn(),
      findCredentials: vi.fn(),
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
      verify: vi.fn(async () => {
        throw new Error("invalid LINE token");
      }),
    };

    await expect(
      new OnboardingService(
        repository,
        verifier,
      ).activateImportedDesktop({
        password: "new-desktop-password",
        lineIdToken: "invalid-token",
      }),
    ).rejects.toThrow(
      "Verified LINE identity is required",
    );
    expect(
      repository.activateImportedDesktopCredential,
    ).not.toHaveBeenCalled();
  });
});
