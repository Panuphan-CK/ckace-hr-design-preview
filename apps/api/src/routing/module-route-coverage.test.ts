import "reflect-metadata";

import type {
  ModuleRouteKey,
  PermissionRequirement,
} from "@ckace/contracts";
import {
  GUARDS_METADATA,
  METHOD_METADATA,
} from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { AdminController } from "../admin/admin.controller";
import { AnnouncementController } from "../announcements/announcement.controller";
import { AttachmentController } from "../attachments/attachment.controller";
import { AttendanceController } from "../attendance/attendance.controller";
import { BenefitsController } from "../benefits/benefits.controller";
import { LeaveController } from "../leave/leave.controller";
import { MedicalController } from "../medical/medical.controller";
import { ManagementController } from "../management/management.controller";
import { OnboardingController } from "../onboarding/onboarding.controller";
import { OvertimeController } from "../overtime/overtime.controller";
import { DelegationController } from "../delegation/delegation.controller";
import { ProfileController } from "../profile/profile.controller";
import { RequestStatusController } from "../request-status/request-status.controller";
import { AuthorizationGuard } from "../security/authorization.guard";
import {
  REQUIRE_PERMISSION_KEY,
} from "../security/require-permission.decorator";
import { SecurityController } from "../security/security.controller";
import { PasswordRecoveryController } from "../security/password-recovery.controller";
import { MODULE_ROUTE_KEY_METADATA } from "./module-route.decorator";

function routeKey(
  controller: object,
  method: string,
): ModuleRouteKey | undefined {
  const handler = (controller as Record<string, unknown>)[method] as object;

  return Reflect.getMetadata(
    MODULE_ROUTE_KEY_METADATA,
    handler,
  ) as ModuleRouteKey | undefined;
}

const BUSINESS_CONTROLLERS = [
  AdminController,
  AnnouncementController,
  AttachmentController,
  AttendanceController,
  BenefitsController,
  LeaveController,
  MedicalController,
  ManagementController,
  OnboardingController,
  OvertimeController,
  ProfileController,
  RequestStatusController,
  SecurityController,
  PasswordRecoveryController,
] as const;

describe("M9.1 module route coverage", () => {
  it("requires server-side route metadata on every business HTTP handler", () => {
    const intentionallyUnrouted = new Set(["SecurityController.getContract"]);
    const missing: string[] = [];

    for (const Controller of BUSINESS_CONTROLLERS) {
      const prototype =
        Controller.prototype as unknown as Record<string, unknown>;
      for (const method of Object.getOwnPropertyNames(prototype)) {
        if (method === "constructor") continue;
        const handler = prototype[method];
        if (typeof handler !== "function") continue;

        const httpMethod = Reflect.getMetadata(METHOD_METADATA, handler) as
          | number
          | undefined;
        if (httpMethod === undefined) continue;

        const endpoint = `${Controller.name}.${method}`;
        if (
          !intentionallyUnrouted.has(endpoint) &&
          routeKey(prototype, method) === undefined
        ) {
          missing.push(endpoint);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it("requires AuthorizationGuard wherever permission metadata is declared", () => {
    const missingGuard: string[] = [];

    for (const Controller of BUSINESS_CONTROLLERS) {
      const prototype =
        Controller.prototype as unknown as Record<string, unknown>;
      const classGuards =
        (Reflect.getMetadata(
          GUARDS_METADATA,
          Controller,
        ) as readonly unknown[] | undefined) ?? [];

      for (const method of Object.getOwnPropertyNames(prototype)) {
        if (method === "constructor") continue;
        const handler = prototype[method];
        if (typeof handler !== "function") continue;

        const requirement =
          (Reflect.getMetadata(
            REQUIRE_PERMISSION_KEY,
            handler,
          ) as PermissionRequirement | undefined) ??
          (Reflect.getMetadata(
            REQUIRE_PERMISSION_KEY,
            Controller,
          ) as PermissionRequirement | undefined);

        if (!requirement) continue;

        const methodGuards =
          (Reflect.getMetadata(
            GUARDS_METADATA,
            handler,
          ) as readonly unknown[] | undefined) ?? [];
        const hasAuthorizationGuard = [
          ...classGuards,
          ...methodGuards,
        ].includes(AuthorizationGuard);

        if (!hasAuthorizationGuard) {
          missingGuard.push(`${Controller.name}.${method}`);
        }
      }
    }

    expect(missingGuard).toEqual([]);
  });

  it.each([
    [ProfileController.prototype, "getSelf", "IDENTITY_READ"],
    [ProfileController.prototype, "changePassword", "IDENTITY_WRITE"],
    [DelegationController.prototype, "overview", "IDENTITY_READ"],
    [DelegationController.prototype, "create", "IDENTITY_WRITE"],
    [DelegationController.prototype, "cancel", "IDENTITY_WRITE"],
    [SecurityController.prototype, "getSession", "IDENTITY_READ"],
    [LeaveController.prototype, "getSelf", "LEAVE_READ"],
    [LeaveController.prototype, "getApprovalOptions", "LEAVE_READ"],
    [LeaveController.prototype, "create", "LEAVE_WRITE"],
    [LeaveController.prototype, "cancel", "LEAVE_WRITE"],
    [LeaveController.prototype, "resubmit", "LEAVE_WRITE"],
    [LeaveController.prototype, "withdraw", "LEAVE_WRITE"],
    [AttendanceController.prototype, "getSelf", "ATTENDANCE_READ"],
    [AttendanceController.prototype, "checkIn", "ATTENDANCE_WRITE"],
    [AttendanceController.prototype, "checkOut", "ATTENDANCE_WRITE"],
    [AttendanceController.prototype, "getSelfTimeCorrections", "TIME_CORRECTION_READ"],
    [AttendanceController.prototype, "getAssignedTimeCorrections", "TIME_CORRECTION_READ"],
    [AttendanceController.prototype, "createTimeCorrection", "TIME_CORRECTION_WRITE"],
    [AttendanceController.prototype, "cancelTimeCorrection", "TIME_CORRECTION_WRITE"],
    [AttendanceController.prototype, "resubmitTimeCorrection", "TIME_CORRECTION_WRITE"],
    [AttendanceController.prototype, "timeCorrectionApprovalChain", "TIME_CORRECTION_READ"],
    [AttendanceController.prototype, "withdrawTimeCorrection", "TIME_CORRECTION_WRITE"],
    [AttendanceController.prototype, "decideTimeCorrection", "TIME_CORRECTION_WRITE"],
    [OvertimeController.prototype, "getSelf", "OT_READ"],
    [OvertimeController.prototype, "getAssigned", "OT_READ"],
    [OvertimeController.prototype, "create", "OT_WRITE"],
    [OvertimeController.prototype, "cancel", "OT_WRITE"],
    [OvertimeController.prototype, "decide", "OT_WRITE"],
    [OvertimeController.prototype, "resubmit", "OT_WRITE"],
    [OvertimeController.prototype, "approvalChain", "OT_READ"],
    [OvertimeController.prototype, "approveAll", "OT_WRITE"],
    [OvertimeController.prototype, "withdraw", "OT_WRITE"],
    [MedicalController.prototype, "getSelf", "MEDICAL_READ"],
    [MedicalController.prototype, "getAssigned", "MEDICAL_READ"],
    [MedicalController.prototype, "create", "MEDICAL_WRITE"],
    [MedicalController.prototype, "cancel", "MEDICAL_WRITE"],
    [MedicalController.prototype, "resubmit", "MEDICAL_WRITE"],
    [MedicalController.prototype, "approvalChain", "MEDICAL_READ"],
    [MedicalController.prototype, "withdraw", "MEDICAL_WRITE"],
    [MedicalController.prototype, "decide", "MEDICAL_WRITE"],
    [BenefitsController.prototype, "getSelf", "BENEFITS_READ"],
    [RequestStatusController.prototype, "getSelf", "REQUEST_STATUS_READ"],
    [RequestStatusController.prototype, "getAssigned", "REQUEST_STATUS_READ"],
    [RequestStatusController.prototype, "getApprovalHistory", "REQUEST_STATUS_READ"],
    [RequestStatusController.prototype, "getTimeline", "REQUEST_STATUS_READ"],
    [AttachmentController.prototype, "createUpload", "ATTACHMENTS_WRITE"],
    [AttachmentController.prototype, "finalize", "ATTACHMENTS_WRITE"],
    [AttachmentController.prototype, "download", "ATTACHMENTS_READ"],
    [AttachmentController.prototype, "delete", "ATTACHMENTS_WRITE"],
    [AnnouncementController.prototype, "list", "ANNOUNCEMENTS_READ"],
    [AnnouncementController.prototype, "adminList", "ANNOUNCEMENTS_READ"],
    [AnnouncementController.prototype, "create", "ANNOUNCEMENTS_WRITE"],
    [AnnouncementController.prototype, "update", "ANNOUNCEMENTS_WRITE"],
    [AnnouncementController.prototype, "delete", "ANNOUNCEMENTS_WRITE"],
    [AnnouncementController.prototype, "downloadAttachment", "ANNOUNCEMENTS_READ"],
    [ManagementController.prototype, "calendar", "ADMIN_READ"],
    [ManagementController.prototype, "reports", "ADMIN_READ"],
    [ManagementController.prototype, "users", "ADMIN_READ"],
    [ManagementController.prototype, "updateUser", "ADMIN_WRITE"],
    [ManagementController.prototype, "setUserRoles", "ADMIN_WRITE"],
    [ManagementController.prototype, "setUserRoleAssignments", "ADMIN_WRITE"],
    [ManagementController.prototype, "companies", "ADMIN_READ"],
    [ManagementController.prototype, "createCompany", "ADMIN_WRITE"],
    [ManagementController.prototype, "updateCompany", "ADMIN_WRITE"],
    [ManagementController.prototype, "agencies", "ADMIN_READ"],
    [ManagementController.prototype, "createAgency", "ADMIN_WRITE"],
    [ManagementController.prototype, "updateAgency", "ADMIN_WRITE"],
    [ManagementController.prototype, "departments", "ADMIN_READ"],
    [ManagementController.prototype, "createDepartment", "ADMIN_WRITE"],
    [ManagementController.prototype, "updateDepartment", "ADMIN_WRITE"],
    [ManagementController.prototype, "entitlements", "ADMIN_READ"],
    [ManagementController.prototype, "entitlementOptions", "ADMIN_READ"],
    [ManagementController.prototype, "upsertEntitlement", "ADMIN_WRITE"],
    [ManagementController.prototype, "generateVacationEntitlements", "ADMIN_WRITE"],
    [ManagementController.prototype, "overtimeReport", "ADMIN_READ"],
    [ManagementController.prototype, "professionalRoles", "ADMIN_READ"],
    [ManagementController.prototype, "approvalPolicies", "ADMIN_READ"],
    [ManagementController.prototype, "medicalPolicy", "ADMIN_READ"],
    [ManagementController.prototype, "missingCheckOuts", "ADMIN_READ"],
    [ManagementController.prototype, "saveMedicalPolicy", "ADMIN_WRITE"],
    [ManagementController.prototype, "attendancePolicy", "ADMIN_READ"],
    [ManagementController.prototype, "saveAttendancePolicy", "ADMIN_WRITE"],
    [ManagementController.prototype, "overtimeAllowancePolicies", "ADMIN_READ"],
    [ManagementController.prototype, "saveOvertimeAllowancePolicy", "ADMIN_WRITE"],
    [ManagementController.prototype, "saveApprovalPolicy", "ADMIN_WRITE"],
    [ManagementController.prototype, "createProfessionalRole", "ADMIN_WRITE"],
    [ManagementController.prototype, "updateProfessionalRole", "ADMIN_WRITE"],
    [ManagementController.prototype, "setUserProfessionalRoles", "ADMIN_WRITE"],
    [ManagementController.prototype, "workCalendar", "ADMIN_READ"],
    [ManagementController.prototype, "upsertHoliday", "ADMIN_WRITE"],
    [ManagementController.prototype, "setWeeklyWorkday", "ADMIN_WRITE"],
    [ManagementController.prototype, "rbac", "ADMIN_READ"],
    [ManagementController.prototype, "setRolePermissions", "ADMIN_WRITE"],
    [PasswordRecoveryController.prototype, "issue", "ADMIN_WRITE"],
    [PasswordRecoveryController.prototype, "reset", "IDENTITY_WRITE"],
    [AdminController.prototype, "notifications", "NOTIFICATIONS_READ"],
    [AdminController.prototype, "retry", "NOTIFICATIONS_WRITE"],
    [AdminController.prototype, "settings", "ADMIN_READ"],
    [OnboardingController.prototype, "register", "ONBOARDING_WRITE"],
    [OnboardingController.prototype, "bindLine", "ONBOARDING_WRITE"],
    [OnboardingController.prototype, "listPending", "ONBOARDING_READ"],
    [OnboardingController.prototype, "approvalOptions", "ONBOARDING_READ"],
    [OnboardingController.prototype, "approve", "ONBOARDING_WRITE"],
  ] as const)("%s.%s is mapped to %s", (controller, method, expected) => {
    expect(routeKey(controller, method)).toBe(expected);
  });
});
