import "reflect-metadata";

import type { InternalActorContext } from "@ckace/auth";
import {
  MODULE_ROUTE_DEFINITIONS,
  type ModuleRouteKey,
  type PermissionRequirement,
} from "@ckace/contracts";
import {
  RequestMethod,
  ServiceUnavailableException,
  type ExecutionContext,
} from "@nestjs/common";
import {
  METHOD_METADATA,
} from "@nestjs/common/constants";
import { Reflector } from "@nestjs/core";
import { describe, expect, it } from "vitest";

import { AdminController } from "../admin/admin.controller";
import { AnnouncementController } from "../announcements/announcement.controller";
import { AttachmentController } from "../attachments/attachment.controller";
import { AttendanceController } from "../attendance/attendance.controller";
import { BenefitsController } from "../benefits/benefits.controller";
import { DelegationController } from "../delegation/delegation.controller";
import { HealthController } from "../health.controller";
import { InboxController } from "../inbox/inbox.controller";
import { LeaveController } from "../leave/leave.controller";
import { LegacyLeaveLiffController } from "../leave/legacy-leave-liff.controller";
import { MedicalController } from "../medical/medical.controller";
import { ManagementController } from "../management/management.controller";
import { OnboardingController } from "../onboarding/onboarding.controller";
import { OvertimeController } from "../overtime/overtime.controller";
import { ProfileController } from "../profile/profile.controller";
import { RequestStatusController } from "../request-status/request-status.controller";
import { AuthorizationGuard } from "../security/authorization.guard";
import { DesktopAuthController } from "../security/desktop-auth.controller";
import { PasswordRecoveryController } from "../security/password-recovery.controller";
import { REQUIRE_PERMISSION_KEY } from "../security/require-permission.decorator";
import { SecurityController } from "../security/security.controller";
import type { SecurityRequest } from "../security/security-request";
import { ModuleRoutingGuard } from "./module-routing.guard";

const CONTROLLERS = [
  AdminController,
  AnnouncementController,
  AttachmentController,
  AttendanceController,
  BenefitsController,
  DelegationController,
  DesktopAuthController,
  HealthController,
  InboxController,
  LeaveController,
  LegacyLeaveLiffController,
  ManagementController,
  MedicalController,
  OnboardingController,
  OvertimeController,
  PasswordRecoveryController,
  ProfileController,
  RequestStatusController,
  SecurityController,
] as const;

const MUTATION_METHODS = new Map<number, string>([
  [RequestMethod.POST, "POST"],
  [RequestMethod.PUT, "PUT"],
  [RequestMethod.PATCH, "PATCH"],
  [RequestMethod.DELETE, "DELETE"],
]);

const SESSION_EXEMPTIONS = new Set([
  "DesktopAuthController.login",
  "DesktopAuthController.lineLogin",
  "DesktopAuthController.logout",
]);

interface MutationEndpoint {
  readonly controller: (typeof CONTROLLERS)[number];
  readonly handler: (...args: never[]) => unknown;
  readonly name: string;
  readonly method: string;
  readonly requirement?: PermissionRequirement;
}

function mutationEndpoints(): MutationEndpoint[] {
  const endpoints: MutationEndpoint[] = [];
  for (const Controller of CONTROLLERS) {
    const prototype = Controller.prototype as unknown as Record<string, unknown>;
    for (const methodName of Object.getOwnPropertyNames(prototype)) {
      if (methodName === "constructor") continue;
      const candidate = prototype[methodName];
      if (typeof candidate !== "function") continue;
      const method = MUTATION_METHODS.get(
        Reflect.getMetadata(METHOD_METADATA, candidate) as number,
      );
      if (!method) continue;
      const requirement =
        (Reflect.getMetadata(REQUIRE_PERMISSION_KEY, candidate) as PermissionRequirement | undefined) ??
        (Reflect.getMetadata(REQUIRE_PERMISSION_KEY, Controller) as PermissionRequirement | undefined);
      endpoints.push({
        controller: Controller,
        handler: candidate as (...args: never[]) => unknown,
        name: `${Controller.name}.${methodName}`,
        method,
        ...(requirement ? { requirement } : {}),
      });
    }
  }
  return endpoints;
}

function contextFor(endpoint: MutationEndpoint, request: SecurityRequest): ExecutionContext {
  return {
    getHandler: () => endpoint.handler,
    getClass: () => endpoint.controller,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({ getData: () => undefined, getContext: () => undefined }),
    switchToWs: () => ({ getData: () => undefined, getClient: () => undefined, getPattern: () => undefined }),
    getType: () => "http",
  } as unknown as ExecutionContext;
}

describe("system read-only endpoint matrix", () => {
  it("blocks every controller POST/PUT/PATCH/DELETE and keeps only login/logout operations available", () => {
    const endpoints = mutationEndpoints();
    expect(endpoints.length).toBeGreaterThan(0);

    const permissions = [...new Set(endpoints.flatMap((endpoint) => endpoint.requirement?.permission ?? []))];
    const actor: InternalActorContext = {
      employeeId: "readonly-matrix-employee",
      legacyUid: null,
      roles: ["SUPERADMIN"],
      permissions,
      agencyId: "readonly-matrix-agency",
      departmentId: "readonly-matrix-department",
      authenticatedBy: "PROJECT_B_WEB",
      correlationId: "readonly-matrix",
    };
    const reflector = new Reflector();
    const routing = {
      systemReadOnly: true,
      resolve(routeKey: ModuleRouteKey) {
        const definition = MODULE_ROUTE_DEFINITIONS[routeKey];
        return {
          routeKey,
          ...definition,
          authority: "LEGACY" as const,
          writeFrozen: definition.access === "WRITE",
        };
      },
    };
    const moduleGuard = new ModuleRoutingGuard(reflector, routing as never);
    const authorizationGuard = new AuthorizationGuard(reflector);
    const observedSessionExemptions: string[] = [];

    for (const endpoint of endpoints) {
      const request: SecurityRequest = {
        method: endpoint.method,
        actor,
        authorizationTarget: {
          employeeId: actor.employeeId,
          agencyId: actor.agencyId,
          departmentId: actor.departmentId,
        },
      };
      const context = contextFor(endpoint, request);

      if (SESSION_EXEMPTIONS.has(endpoint.name)) {
        observedSessionExemptions.push(endpoint.name);
        expect(moduleGuard.canActivate(context), endpoint.name).toBe(true);
        continue;
      }

      let rejected = false;
      let failure: unknown;
      try {
        moduleGuard.canActivate(context);
        authorizationGuard.canActivate(context);
      } catch (error) {
        failure = error;
        rejected = error instanceof ServiceUnavailableException;
      }
      expect(rejected, `${endpoint.name} (${endpoint.method}) must fail closed`).toBe(true);
      expect((failure as ServiceUnavailableException).getResponse(), endpoint.name).toMatchObject({
        code: "SYSTEM_READ_ONLY",
        retryable: false,
      });
    }

    expect(observedSessionExemptions.sort()).toEqual([...SESSION_EXEMPTIONS].sort());
  });
});
