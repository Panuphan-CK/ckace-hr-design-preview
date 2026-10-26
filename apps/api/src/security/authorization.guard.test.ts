import type {
  InternalActorContext,
} from "@ckace/auth";
import type {
  PermissionRequirement,
} from "@ckace/contracts";
import type {
  ExecutionContext,
} from "@nestjs/common";
import {
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  describe,
  expect,
  it,
} from "vitest";

import { AuthorizationGuard } from "./authorization.guard";
import {
  REQUIRE_PERMISSION_KEY,
  SELF_AUTHORIZATION_TARGET_KEY,
} from "./require-permission.decorator";
import type { SecurityRequest } from "./security-request";

const actor: InternalActorContext = {
  employeeId: "employee-1",
  legacyUid: null,
  roles: ["Employee"],
  permissions: ["profile.self.read"],
  agencyId: "agency-1",
  departmentId: "department-1",
  authenticatedBy: "PROJECT_B_WEB",
  correlationId: "corr-1",
};

function contextFor(
  requirement: PermissionRequirement,
  request: SecurityRequest,
  selfTarget = false,
): ExecutionContext {
  const handler = (): void => undefined;
  const controller = class TestController {};

  Reflect.defineMetadata(
    REQUIRE_PERMISSION_KEY,
    requirement,
    handler,
  );

  if (selfTarget) {
    Reflect.defineMetadata(
      SELF_AUTHORIZATION_TARGET_KEY,
      true,
      handler,
    );
  }

  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({
      getData: () => undefined,
      getContext: () => undefined,
    }),
    switchToWs: () => ({
      getData: () => undefined,
      getClient: () => undefined,
      getPattern: () => undefined,
    }),
    getType: () => "http",
  } as unknown as ExecutionContext;
}

describe("AuthorizationGuard", () => {
  it("rejects requests without a server-populated actor", () => {
    const guard = new AuthorizationGuard(
      new Reflector(),
    );

    expect(() =>
      guard.canActivate(
        contextFor(
          {
            permission: "profile.self.read",
            scope: "SELF",
          },
          {
            authorizationTarget: {
              employeeId: "employee-1",
            },
          },
        ),
      ),
    ).toThrow(UnauthorizedException);
  });

  it("allows a matching self-scope actor", () => {
    const guard = new AuthorizationGuard(
      new Reflector(),
    );

    expect(
      guard.canActivate(
        contextFor(
          {
            permission: "profile.self.read",
            scope: "SELF",
          },
          {
            actor,
            authorizationTarget: {
              employeeId: "employee-1",
            },
          },
        ),
      ),
    ).toBe(true);
  });

  it("fails closed when the target belongs to another employee", () => {
    const guard = new AuthorizationGuard(
      new Reflector(),
    );

    expect(() =>
      guard.canActivate(
        contextFor(
          {
            permission: "profile.self.read",
            scope: "SELF",
          },
          {
            actor,
            authorizationTarget: {
              employeeId: "employee-2",
            },
          },
        ),
      ),
    ).toThrow(ForbiddenException);
  });

  it("derives the self target only when the route opts in explicitly", () => {
    const guard = new AuthorizationGuard(
      new Reflector(),
    );

    expect(
      guard.canActivate(
        contextFor(
          {
            permission: "profile.self.read",
            scope: "SELF",
          },
          { actor },
          true,
        ),
      ),
    ).toBe(true);
  });

  it("does not disclose frozen-route state before authentication", () => {
    const guard = new AuthorizationGuard(
      new Reflector(),
    );

    expect(() =>
      guard.canActivate(
        contextFor(
          {
            permission: "medical.self.write",
            scope: "SELF",
          },
          {
            moduleRouting: {
              routeKey: "MEDICAL_WRITE",
              module: "MEDICAL",
              access: "WRITE",
              authority: "LEGACY",
              writeFrozen: true,
            },
          },
          true,
        ),
      ),
    ).toThrow(UnauthorizedException);
  });

  it("does not disclose frozen-route state to authenticated unauthorized actors", () => {
    const guard = new AuthorizationGuard(
      new Reflector(),
    );

    expect(() =>
      guard.canActivate(
        contextFor(
          {
            permission: "medical.self.write",
            scope: "SELF",
          },
          {
            actor,
            moduleRouting: {
              routeKey: "MEDICAL_WRITE",
              module: "MEDICAL",
              access: "WRITE",
              authority: "LEGACY",
              writeFrozen: true,
            },
          },
          true,
        ),
      ),
    ).toThrow(ForbiddenException);
  });

  it("blocks an authorized protected write after permission checks when frozen", () => {
    const guard = new AuthorizationGuard(
      new Reflector(),
    );
    const writer: InternalActorContext = {
      ...actor,
      permissions: ["medical.self.write"],
    };

    expect(() =>
      guard.canActivate(
        contextFor(
          {
            permission: "medical.self.write",
            scope: "SELF",
          },
          {
            actor: writer,
            moduleRouting: {
              routeKey: "MEDICAL_WRITE",
              module: "MEDICAL",
              access: "WRITE",
              authority: "LEGACY",
              writeFrozen: true,
            },
          },
          true,
        ),
      ),
    ).toThrow(ServiceUnavailableException);
  });

  it("blocks authorized protected writes with the system read-only switch", () => {
    const guard = new AuthorizationGuard(new Reflector());
    const writer: InternalActorContext = {
      ...actor,
      permissions: ["medical.self.write"],
    };

    try {
      guard.canActivate(
        contextFor(
          { permission: "medical.self.write", scope: "SELF" },
          {
            actor: writer,
            systemReadOnly: true,
            moduleRouting: {
              routeKey: "MEDICAL_WRITE",
              module: "MEDICAL",
              access: "WRITE",
              authority: "LEGACY",
              writeFrozen: true,
            },
          },
          true,
        ),
      );
      throw new Error("Expected write to be blocked");
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as ServiceUnavailableException).getResponse()).toMatchObject({
        code: "SYSTEM_READ_ONLY",
        retryable: false,
      });
    }
  });
});
