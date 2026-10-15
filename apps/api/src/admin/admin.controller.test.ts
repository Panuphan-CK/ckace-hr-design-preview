import type { NotificationAdminRepository } from "@ckace/database";
import { ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { REQUIRE_PERMISSION_KEY } from "../security/require-permission.decorator";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

describe("Admin API", () => {
  it("requires explicit admin permissions", () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, AdminController.prototype.notifications))
      .toEqual({ permission: "notifications.admin.read", scope: "GLOBAL" });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, AdminController.prototype.retry))
      .toEqual({ permission: "notifications.admin.retry", scope: "GLOBAL" });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, AdminController.prototype.settings))
      .toEqual({ permission: "admin.settings.read", scope: "GLOBAL" });
  });

  it("derives retry capability from server permissions", async () => {
    const repository = {
      list: vi.fn(async () => ({ notifications: [] })),
      retry: vi.fn(),
    } satisfies NotificationAdminRepository;
    const service = new AdminService(repository);

    await expect(
      service.notifications([
        "notifications.admin.read",
        "notifications.admin.retry",
      ]),
    ).resolves.toEqual({
      canRetry: true,
      notifications: [],
    });

    await expect(
      service.notifications(["notifications.admin.read"]),
    ).resolves.toEqual({
      canRetry: false,
      notifications: [],
    });
  });

  it("retries only through repository authority", async () => {
    const repository = {
      list: vi.fn(async () => ({ notifications: [] })),
      retry: vi.fn(async (id: string) => ({ id, status: "PENDING" as const })),
    } satisfies NotificationAdminRepository;
    const result = await new AdminService(repository).retryNotification(
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
    );
    expect(result.status).toBe("PENDING");
    expect(repository.retry).toHaveBeenCalledOnce();
  });

  it("maps retry state races to 409 Conflict", async () => {
    const repository = {
      list: vi.fn(async () => ({ notifications: [] })),
      retry: vi.fn(async () => {
        throw new Error(
          "Only FAILED notification can be retried",
        );
      }),
    } satisfies NotificationAdminRepository;

    await expect(
      new AdminService(repository).retryNotification(
        "00000000-0000-4000-8000-000000000001",
        "00000000-0000-4000-8000-000000000002",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
