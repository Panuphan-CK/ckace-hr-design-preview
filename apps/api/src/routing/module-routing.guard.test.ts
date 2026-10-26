import type {
  PermissionRequirement,
  ServerModuleRouteContext,
} from "@ckace/contracts";
import {
  ServiceUnavailableException,
  type ExecutionContext,
} from "@nestjs/common";
import { describe, expect, it } from "vitest";

import {
  REQUIRE_PERMISSION_KEY,
} from "../security/require-permission.decorator";
import { MODULE_ROUTE_KEY_METADATA } from "./module-route.decorator";
import { ModuleRoutingGuard } from "./module-routing.guard";

function contextFor(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

function sessionContextFor(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => function login() {},
    getClass: () => class DesktopAuthController {},
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

function reflectorFor(
  routeKey: string | undefined,
  requirement?: PermissionRequirement,
) {
  return {
    getAllAndOverride: (key: string) => {
      if (key === MODULE_ROUTE_KEY_METADATA) return routeKey;
      if (key === REQUIRE_PERMISSION_KEY) return requirement;
      return undefined;
    },
  };
}

function frozenMedical(): ServerModuleRouteContext {
  return {
    routeKey: "MEDICAL_WRITE",
    module: "MEDICAL",
    access: "WRITE",
    authority: "LEGACY",
    writeFrozen: true,
  };
}

describe("ModuleRoutingGuard", () => {
  it("derives routing context from server metadata and overwrites forged client state", () => {
    const request: Record<string, unknown> = {
      moduleRouting: {
        routeKey: "ADMIN_WRITE",
        authority: "NEW",
      },
    };
    const resolved: ServerModuleRouteContext = {
      routeKey: "LEAVE_READ",
      module: "LEAVE",
      access: "READ",
      authority: "LEGACY",
      writeFrozen: false,
    };
    const guard = new ModuleRoutingGuard(
      reflectorFor("LEAVE_READ") as never,
      { resolve: () => resolved } as never,
    );

    expect(guard.canActivate(contextFor(request))).toBe(true);
    expect(request.moduleRouting).toEqual(resolved);
  });

  it("blocks a frozen public business write before controller execution", () => {
    const guard = new ModuleRoutingGuard(
      reflectorFor("MEDICAL_WRITE") as never,
      { resolve: frozenMedical } as never,
    );

    expect(() => guard.canActivate(contextFor({}))).toThrow(
      ServiceUnavailableException,
    );
  });

  it("defers frozen protected routes until authorization has completed", () => {
    const guard = new ModuleRoutingGuard(
      reflectorFor("MEDICAL_WRITE", {
        permission: "medical.self.write",
        scope: "SELF",
      }) as never,
      { resolve: frozenMedical } as never,
    );
    const request: Record<string, unknown> = {};

    expect(guard.canActivate(contextFor(request))).toBe(true);
    expect(request.moduleRouting).toEqual(frozenMedical());
  });

  it("fails every concurrent public write attempt while a module is frozen", async () => {
    const guard = new ModuleRoutingGuard(
      reflectorFor("MEDICAL_WRITE") as never,
      { resolve: frozenMedical } as never,
    );

    const attempts = await Promise.allSettled(
      Array.from({ length: 32 }, async () =>
        guard.canActivate(contextFor({})),
      ),
    );

    expect(attempts).toHaveLength(32);
    expect(
      attempts.every(
        (result) =>
          result.status === "rejected" &&
          result.reason instanceof ServiceUnavailableException,
      ),
    ).toBe(true);
  });

  it("does not interfere with infrastructure endpoints without route metadata", () => {
    const guard = new ModuleRoutingGuard(
      reflectorFor(undefined) as never,
      {
        resolve: () => {
          throw new Error("must not resolve");
        },
      } as never,
    );

    expect(guard.canActivate(contextFor({}))).toBe(true);
  });

  it("rejects unclassified user mutations while read-only, fail-closed", () => {
    const guard = new ModuleRoutingGuard(
      reflectorFor(undefined) as never,
      { systemReadOnly: true } as never,
    );

    expect(() =>
      guard.canActivate(contextFor({ method: "POST" })),
    ).toThrow(ServiceUnavailableException);
  });

  it("blocks POST even when its module route is labelled READ while read-only", () => {
    const guard = new ModuleRoutingGuard(
      reflectorFor("ATTACHMENTS_READ", {
        permission: "attachments.self.read",
        scope: "SELF",
      }) as never,
      { systemReadOnly: true, resolve: () => ({
        routeKey: "ATTACHMENTS_READ",
        module: "ATTACHMENTS",
        access: "READ",
        authority: "LEGACY",
        writeFrozen: false,
      }) } as never,
    );
    const request: Record<string, unknown> = { method: "POST" };

    expect(guard.canActivate(contextFor(request))).toBe(true);
    expect(request.moduleRouting).toMatchObject({ access: "READ" });
  });

  it("preserves session login while read-only because it is not a module write", () => {
    const guard = new ModuleRoutingGuard(
      reflectorFor(undefined) as never,
      { systemReadOnly: true } as never,
    );

    expect(
      guard.canActivate(sessionContextFor({ method: "POST" })),
    ).toBe(true);
  });
});
