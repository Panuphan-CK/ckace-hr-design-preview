import "reflect-metadata";

import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { MODULE_ROUTE_KEY_METADATA } from "../routing/module-route.decorator";
import {
  PasswordRecoveryController,
} from "./password-recovery.controller";
import type { PasswordRecoveryService } from "./password-recovery.service";
import { REQUIRE_PERMISSION_KEY } from "./require-permission.decorator";

const EMPLOYEE_ID = "11111111-1111-4111-8111-111111111111";

describe("PasswordRecoveryController", () => {
  it("keeps issue admin-authorized and reset public but module-routed", () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSION_KEY,
        PasswordRecoveryController.prototype.issue,
      ),
    ).toEqual({
      permission: "credentials.reset.issue",
      scope: "GLOBAL",
    });
    expect(
      Reflect.getMetadata(
        MODULE_ROUTE_KEY_METADATA,
        PasswordRecoveryController.prototype.issue,
      ),
    ).toBe("ADMIN_WRITE");
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSION_KEY,
        PasswordRecoveryController.prototype.reset,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        MODULE_ROUTE_KEY_METADATA,
        PasswordRecoveryController.prototype.reset,
      ),
    ).toBe("IDENTITY_WRITE");
  });

  it("validates employee ID, token, and password length", () => {
    const service = {
      issue: vi.fn(),
      reset: vi.fn(),
    } as unknown as PasswordRecoveryService;
    const controller = new PasswordRecoveryController(service);

    expect(() => controller.issue("bad-id")).toThrow(
      BadRequestException,
    );
    expect(() => controller.reset({ password: "12345678" })).toThrow(
      BadRequestException,
    );
    expect(() =>
      controller.reset({ token: "token", password: "short" }),
    ).toThrow(BadRequestException);
  });

  it("delegates validated issue and reset inputs", async () => {
    const service = {
      issue: vi.fn().mockResolvedValue({
        employeeId: EMPLOYEE_ID,
        resetPath: "/reset-password?token=x",
        expiresAt: "2026-10-14T12:15:00.000Z",
      }),
      reset: vi.fn().mockResolvedValue({
        employeeId: EMPLOYEE_ID,
        reset: true,
      }),
    } as unknown as PasswordRecoveryService;
    const controller = new PasswordRecoveryController(service);

    await controller.issue(EMPLOYEE_ID);
    await controller.reset({
      token: "signed-token",
      password: "password-123",
    });

    expect(service.issue).toHaveBeenCalledWith(EMPLOYEE_ID);
    expect(service.reset).toHaveBeenCalledWith(
      "signed-token",
      "password-123",
    );
  });
});
