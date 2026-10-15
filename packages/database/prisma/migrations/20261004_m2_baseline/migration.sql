-- CreateEnum
CREATE TYPE "AccountState" AS ENUM ('ACTIVE', 'PENDING', 'INACTIVE', 'RESIGNED');

-- CreateEnum
CREATE TYPE "ApprovalScope" AS ENUM ('SAME_AGENCY', 'SAME_DEPARTMENT', 'GLOBAL');

-- CreateEnum
CREATE TYPE "RequestKind" AS ENUM ('LEAVE', 'TIME_CORRECTION', 'OVERTIME', 'MEDICAL', 'BENEFIT');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REVISION_REQUESTED');

-- CreateEnum
CREATE TYPE "ApprovalStepStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeaveDurationCode" AS ENUM ('FULL_DAY', 'HALF_DAY', 'MORNING', 'AFTERNOON');

-- CreateEnum
CREATE TYPE "RadiusState" AS ENUM ('IN_RADIUS', 'OUTSIDE_RADIUS', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('LEGACY_DRIVE', 'R2');

-- CreateEnum
CREATE TYPE "PrivacyClass" AS ENUM ('INTERNAL', 'EMPLOYEE_PRIVATE', 'MEDICAL_PRIVATE', 'ADMIN_PRIVATE');

-- CreateEnum
CREATE TYPE "EmployeeMediaKind" AS ENUM ('PROFILE', 'SIGNATURE');

-- CreateEnum
CREATE TYPE "AnnouncementScope" AS ENUM ('GLOBAL', 'AGENCY', 'DEPARTMENT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('LINE', 'EMAIL', 'CALENDAR');

-- CreateEnum
CREATE TYPE "MigrationRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'COMPLETED_WITH_EXCEPTIONS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('PASS', 'EXCEPTION', 'FAIL');

-- CreateTable
CREATE TABLE "agencies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "nickname" TEXT,
    "dateOfBirth" DATE,
    "employmentStart" DATE,
    "resignationDate" DATE,
    "agencyId" UUID,
    "departmentId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_accounts" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "loginName" TEXT NOT NULL,
    "normalizedLogin" TEXT NOT NULL,
    "legacyPasswordHash" TEXT,
    "state" "AccountState" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "line_accounts" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "lineUserId" TEXT NOT NULL,
    "linkedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "line_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userAccountId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userAccountId","roleId")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "approval_policies" (
    "id" UUID NOT NULL,
    "agencyId" UUID,
    "requestKind" "RequestKind" NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "approval_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_policy_steps" (
    "id" UUID NOT NULL,
    "policyId" UUID NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "requiredRoleId" UUID NOT NULL,
    "scope" "ApprovalScope" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_policy_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_instances" (
    "id" UUID NOT NULL,
    "requestKind" "RequestKind" NOT NULL,
    "requesterEmployeeId" UUID NOT NULL,
    "policyId" UUID,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "currentStepOrder" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "decidedAt" TIMESTAMPTZ(3),

    CONSTRAINT "approval_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_steps" (
    "id" UUID NOT NULL,
    "approvalInstanceId" UUID NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "approverEmployeeId" UUID,
    "status" "ApprovalStepStatus" NOT NULL DEFAULT 'PENDING',
    "assignedAt" TIMESTAMPTZ(3),
    "decidedAt" TIMESTAMPTZ(3),
    "comment" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_types" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_type_aliases" (
    "id" UUID NOT NULL,
    "leaveTypeId" UUID NOT NULL,
    "alias" TEXT NOT NULL,

    CONSTRAINT "leave_type_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_entitlements" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "leaveTypeId" UUID NOT NULL,
    "quota" DECIMAL(10,2) NOT NULL,
    "validFrom" DATE,
    "validTo" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "leave_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" UUID NOT NULL,
    "requesterEmployeeId" UUID NOT NULL,
    "leaveTypeId" UUID NOT NULL,
    "entitlementId" UUID,
    "approvalInstanceId" UUID,
    "description" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "durationCode" "LeaveDurationCode" NOT NULL,
    "startTime" TIME(0),
    "endTime" TIME(0),
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "decisionReason" TEXT,
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "workDate" DATE NOT NULL,
    "checkInAt" TIMESTAMPTZ(3) NOT NULL,
    "checkOutAt" TIMESTAMPTZ(3),
    "checkInLocationText" TEXT,
    "checkOutLocationText" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_calculations" (
    "id" UUID NOT NULL,
    "attendanceRecordId" UUID NOT NULL,
    "workMinutes" INTEGER,
    "lateMinutes" INTEGER,
    "earlyMinutes" INTEGER,
    "overtimeMinutes" INTEGER,
    "checkInRadius" "RadiusState" NOT NULL DEFAULT 'UNKNOWN',
    "checkOutRadius" "RadiusState" NOT NULL DEFAULT 'UNKNOWN',
    "policyVersion" TEXT,
    "calculatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_policies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Bangkok',
    "officeLatitude" DECIMAL(9,6) NOT NULL,
    "officeLongitude" DECIMAL(9,6) NOT NULL,
    "radiusKm" DECIMAL(6,2) NOT NULL,
    "lateAfter" TIME(0) NOT NULL,
    "workEnd" TIME(0) NOT NULL,
    "breakStart" TIME(0),
    "breakEnd" TIME(0),
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "attendance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_correction_requests" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "attendanceRecordId" UUID,
    "approvalInstanceId" UUID,
    "attendanceDate" DATE NOT NULL,
    "originalCheckIn" TIME(0),
    "originalCheckOut" TIME(0),
    "correctedCheckIn" TIME(0),
    "correctedCheckOut" TIME(0),
    "reason" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "decisionComment" TEXT,
    "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "time_correction_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_requests" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "approvalInstanceId" UUID,
    "reason" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "decisionReason" TEXT,
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "overtime_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_segments" (
    "id" UUID NOT NULL,
    "overtimeRequestId" UUID NOT NULL,
    "attendanceRecordId" UUID,
    "workDate" DATE NOT NULL,
    "startTime" TIME(0) NOT NULL,
    "endTime" TIME(0) NOT NULL,
    "requestedMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overtime_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_policies" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "annualLimit" DECIMAL(12,2),
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "benefit_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_claims" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "leaveRequestId" UUID,
    "benefitPolicyId" UUID,
    "approvalInstanceId" UUID,
    "claimDate" DATE NOT NULL,
    "sicknessDate" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "decisionReason" TEXT,
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "medical_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" UUID NOT NULL,
    "holidayDate" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_work_rules" (
    "id" UUID NOT NULL,
    "isoWeekday" INTEGER NOT NULL,
    "isWorking" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "weekly_work_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "ownerEmployeeId" UUID,
    "privacyClass" "PrivacyClass" NOT NULL,
    "storageProvider" "StorageProvider" NOT NULL,
    "storageKey" TEXT,
    "originalFilename" TEXT,
    "mimeType" TEXT,
    "sizeBytes" BIGINT,
    "checksumSha256" TEXT,
    "legacyDriveFileId" TEXT,
    "legacyDriveUrl" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_request_attachments" (
    "attachmentId" UUID NOT NULL,
    "leaveRequestId" UUID NOT NULL,

    CONSTRAINT "leave_request_attachments_pkey" PRIMARY KEY ("attachmentId")
);

-- CreateTable
CREATE TABLE "overtime_request_attachments" (
    "attachmentId" UUID NOT NULL,
    "overtimeRequestId" UUID NOT NULL,

    CONSTRAINT "overtime_request_attachments_pkey" PRIMARY KEY ("attachmentId")
);

-- CreateTable
CREATE TABLE "medical_claim_attachments" (
    "attachmentId" UUID NOT NULL,
    "medicalClaimId" UUID NOT NULL,

    CONSTRAINT "medical_claim_attachments_pkey" PRIMARY KEY ("attachmentId")
);

-- CreateTable
CREATE TABLE "employee_media" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "attachmentId" UUID NOT NULL,
    "kind" "EmployeeMediaKind" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "scope" "AnnouncementScope" NOT NULL DEFAULT 'GLOBAL',
    "agencyId" UUID,
    "departmentId" UUID,
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_attachments" (
    "attachmentId" UUID NOT NULL,
    "announcementId" UUID NOT NULL,

    CONSTRAINT "announcement_attachments_pkey" PRIMARY KEY ("attachmentId")
);

-- CreateTable
CREATE TABLE "notification_outbox" (
    "id" UUID NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL,
    "outboxId" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "providerRef" TEXT,
    "error" TEXT,
    "attemptedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actorEmployeeId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "correlationId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL,
    "actorEmployeeId" UUID NOT NULL,
    "operationKind" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "resultReferenceId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3),

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migration_runs" (
    "id" UUID NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceSnapshot" TEXT NOT NULL,
    "transformerVersion" TEXT NOT NULL,
    "status" "MigrationRunStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "mismatchCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "migration_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legacy_records" (
    "id" UUID NOT NULL,
    "migrationRunId" UUID NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceWorkbook" TEXT NOT NULL,
    "sourceTab" TEXT NOT NULL,
    "sourcePeriod" TEXT NOT NULL,
    "legacyId" TEXT NOT NULL,
    "rowFingerprint" TEXT NOT NULL,
    "payloadHash" TEXT,
    "targetEntityType" TEXT,
    "targetEntityId" UUID,
    "importedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legacy_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migration_reconciliation_results" (
    "id" UUID NOT NULL,
    "migrationRunId" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "checkName" TEXT NOT NULL,
    "status" "ReconciliationStatus" NOT NULL,
    "sourceValue" TEXT NOT NULL,
    "targetValue" TEXT NOT NULL,
    "exceptionCode" TEXT,
    "disposition" TEXT,
    "evidenceRef" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "migration_reconciliation_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agencies_name_idx" ON "agencies"("name");

-- CreateIndex
CREATE INDEX "departments_name_idx" ON "departments"("name");

-- CreateIndex
CREATE INDEX "employees_agencyId_idx" ON "employees"("agencyId");

-- CreateIndex
CREATE INDEX "employees_departmentId_idx" ON "employees"("departmentId");

-- CreateIndex
CREATE INDEX "employees_resignationDate_idx" ON "employees"("resignationDate");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_employeeId_key" ON "user_accounts"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_normalizedLogin_key" ON "user_accounts"("normalizedLogin");

-- CreateIndex
CREATE INDEX "user_accounts_state_idx" ON "user_accounts"("state");

-- CreateIndex
CREATE UNIQUE INDEX "line_accounts_employeeId_key" ON "line_accounts"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "line_accounts_lineUserId_key" ON "line_accounts"("lineUserId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");

-- CreateIndex
CREATE INDEX "role_permissions_permissionId_idx" ON "role_permissions"("permissionId");

-- CreateIndex
CREATE INDEX "approval_policies_agencyId_requestKind_active_idx" ON "approval_policies"("agencyId", "requestKind", "active");

-- CreateIndex
CREATE INDEX "approval_policy_steps_requiredRoleId_idx" ON "approval_policy_steps"("requiredRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "approval_policy_steps_policyId_stepOrder_key" ON "approval_policy_steps"("policyId", "stepOrder");

-- CreateIndex
CREATE INDEX "approval_instances_requesterEmployeeId_requestKind_status_idx" ON "approval_instances"("requesterEmployeeId", "requestKind", "status");

-- CreateIndex
CREATE INDEX "approval_instances_policyId_idx" ON "approval_instances"("policyId");

-- CreateIndex
CREATE INDEX "approval_steps_approverEmployeeId_status_idx" ON "approval_steps"("approverEmployeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "approval_steps_approvalInstanceId_stepOrder_key" ON "approval_steps"("approvalInstanceId", "stepOrder");

-- CreateIndex
CREATE UNIQUE INDEX "leave_types_key_key" ON "leave_types"("key");

-- CreateIndex
CREATE UNIQUE INDEX "leave_type_aliases_alias_key" ON "leave_type_aliases"("alias");

-- CreateIndex
CREATE INDEX "leave_entitlements_employeeId_leaveTypeId_idx" ON "leave_entitlements"("employeeId", "leaveTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "leave_requests_approvalInstanceId_key" ON "leave_requests"("approvalInstanceId");

-- CreateIndex
CREATE INDEX "leave_requests_requesterEmployeeId_startDate_idx" ON "leave_requests"("requesterEmployeeId", "startDate");

-- CreateIndex
CREATE INDEX "leave_requests_status_submittedAt_idx" ON "leave_requests"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "leave_requests_leaveTypeId_idx" ON "leave_requests"("leaveTypeId");

-- CreateIndex
CREATE INDEX "attendance_records_employeeId_workDate_idx" ON "attendance_records"("employeeId", "workDate");

-- CreateIndex
CREATE INDEX "attendance_records_workDate_idx" ON "attendance_records"("workDate");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_calculations_attendanceRecordId_key" ON "attendance_calculations"("attendanceRecordId");

-- CreateIndex
CREATE INDEX "attendance_policies_active_effectiveFrom_idx" ON "attendance_policies"("active", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "time_correction_requests_approvalInstanceId_key" ON "time_correction_requests"("approvalInstanceId");

-- CreateIndex
CREATE INDEX "time_correction_requests_employeeId_attendanceDate_idx" ON "time_correction_requests"("employeeId", "attendanceDate");

-- CreateIndex
CREATE INDEX "time_correction_requests_status_requestedAt_idx" ON "time_correction_requests"("status", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "overtime_requests_approvalInstanceId_key" ON "overtime_requests"("approvalInstanceId");

-- CreateIndex
CREATE INDEX "overtime_requests_employeeId_status_submittedAt_idx" ON "overtime_requests"("employeeId", "status", "submittedAt");

-- CreateIndex
CREATE INDEX "overtime_segments_overtimeRequestId_workDate_idx" ON "overtime_segments"("overtimeRequestId", "workDate");

-- CreateIndex
CREATE INDEX "overtime_segments_attendanceRecordId_idx" ON "overtime_segments"("attendanceRecordId");

-- CreateIndex
CREATE INDEX "benefit_policies_active_effectiveFrom_idx" ON "benefit_policies"("active", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_policies_key_effectiveFrom_key" ON "benefit_policies"("key", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "medical_claims_approvalInstanceId_key" ON "medical_claims"("approvalInstanceId");

-- CreateIndex
CREATE INDEX "medical_claims_employeeId_sicknessDate_idx" ON "medical_claims"("employeeId", "sicknessDate");

-- CreateIndex
CREATE INDEX "medical_claims_status_submittedAt_idx" ON "medical_claims"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "medical_claims_leaveRequestId_idx" ON "medical_claims"("leaveRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_holidayDate_key" ON "holidays"("holidayDate");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_work_rules_isoWeekday_key" ON "weekly_work_rules"("isoWeekday");

-- CreateIndex
CREATE INDEX "attachments_ownerEmployeeId_privacyClass_idx" ON "attachments"("ownerEmployeeId", "privacyClass");

-- CreateIndex
CREATE INDEX "attachments_storageProvider_idx" ON "attachments"("storageProvider");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_storageProvider_storageKey_key" ON "attachments"("storageProvider", "storageKey");

-- CreateIndex
CREATE INDEX "leave_request_attachments_leaveRequestId_idx" ON "leave_request_attachments"("leaveRequestId");

-- CreateIndex
CREATE INDEX "overtime_request_attachments_overtimeRequestId_idx" ON "overtime_request_attachments"("overtimeRequestId");

-- CreateIndex
CREATE INDEX "medical_claim_attachments_medicalClaimId_idx" ON "medical_claim_attachments"("medicalClaimId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_media_attachmentId_key" ON "employee_media"("attachmentId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_media_employeeId_kind_key" ON "employee_media"("employeeId", "kind");

-- CreateIndex
CREATE INDEX "announcements_scope_publishedAt_idx" ON "announcements"("scope", "publishedAt");

-- CreateIndex
CREATE INDEX "announcements_agencyId_idx" ON "announcements"("agencyId");

-- CreateIndex
CREATE INDEX "announcements_departmentId_idx" ON "announcements"("departmentId");

-- CreateIndex
CREATE INDEX "announcement_attachments_announcementId_idx" ON "announcement_attachments"("announcementId");

-- CreateIndex
CREATE INDEX "notification_outbox_status_availableAt_idx" ON "notification_outbox"("status", "availableAt");

-- CreateIndex
CREATE INDEX "notification_outbox_aggregateType_aggregateId_idx" ON "notification_outbox"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "notification_deliveries_outboxId_channel_idx" ON "notification_deliveries"("outboxId", "channel");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_attemptedAt_idx" ON "notification_deliveries"("status", "attemptedAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorEmployeeId_occurredAt_idx" ON "audit_logs"("actorEmployeeId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_occurredAt_idx" ON "audit_logs"("entityType", "entityId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_logs_correlationId_idx" ON "audit_logs"("correlationId");

-- CreateIndex
CREATE INDEX "idempotency_keys_expiresAt_idx" ON "idempotency_keys"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_actorEmployeeId_operationKind_clientKey_key" ON "idempotency_keys"("actorEmployeeId", "operationKind", "clientKey");

-- CreateIndex
CREATE INDEX "migration_runs_status_createdAt_idx" ON "migration_runs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "legacy_records_migrationRunId_sourceTab_idx" ON "legacy_records"("migrationRunId", "sourceTab");

-- CreateIndex
CREATE INDEX "legacy_records_targetEntityType_targetEntityId_idx" ON "legacy_records"("targetEntityType", "targetEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "legacy_records_sourceSystem_sourceWorkbook_sourceTab_source_key" ON "legacy_records"("sourceSystem", "sourceWorkbook", "sourceTab", "sourcePeriod", "legacyId");

-- CreateIndex
CREATE INDEX "migration_reconciliation_results_migrationRunId_status_idx" ON "migration_reconciliation_results"("migrationRunId", "status");

-- CreateIndex
CREATE INDEX "migration_reconciliation_results_entityType_checkName_idx" ON "migration_reconciliation_results"("entityType", "checkName");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_accounts" ADD CONSTRAINT "line_accounts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "user_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_policies" ADD CONSTRAINT "approval_policies_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_policy_steps" ADD CONSTRAINT "approval_policy_steps_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "approval_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_policy_steps" ADD CONSTRAINT "approval_policy_steps_requiredRoleId_fkey" FOREIGN KEY ("requiredRoleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_instances" ADD CONSTRAINT "approval_instances_requesterEmployeeId_fkey" FOREIGN KEY ("requesterEmployeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_instances" ADD CONSTRAINT "approval_instances_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "approval_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_approvalInstanceId_fkey" FOREIGN KEY ("approvalInstanceId") REFERENCES "approval_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_approverEmployeeId_fkey" FOREIGN KEY ("approverEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_type_aliases" ADD CONSTRAINT "leave_type_aliases_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_entitlements" ADD CONSTRAINT "leave_entitlements_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_entitlements" ADD CONSTRAINT "leave_entitlements_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_requesterEmployeeId_fkey" FOREIGN KEY ("requesterEmployeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "leave_entitlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approvalInstanceId_fkey" FOREIGN KEY ("approvalInstanceId") REFERENCES "approval_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_calculations" ADD CONSTRAINT "attendance_calculations_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_correction_requests" ADD CONSTRAINT "time_correction_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_correction_requests" ADD CONSTRAINT "time_correction_requests_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "attendance_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_correction_requests" ADD CONSTRAINT "time_correction_requests_approvalInstanceId_fkey" FOREIGN KEY ("approvalInstanceId") REFERENCES "approval_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_requests" ADD CONSTRAINT "overtime_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_requests" ADD CONSTRAINT "overtime_requests_approvalInstanceId_fkey" FOREIGN KEY ("approvalInstanceId") REFERENCES "approval_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_segments" ADD CONSTRAINT "overtime_segments_overtimeRequestId_fkey" FOREIGN KEY ("overtimeRequestId") REFERENCES "overtime_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_segments" ADD CONSTRAINT "overtime_segments_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "attendance_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_claims" ADD CONSTRAINT "medical_claims_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_claims" ADD CONSTRAINT "medical_claims_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "leave_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_claims" ADD CONSTRAINT "medical_claims_benefitPolicyId_fkey" FOREIGN KEY ("benefitPolicyId") REFERENCES "benefit_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_claims" ADD CONSTRAINT "medical_claims_approvalInstanceId_fkey" FOREIGN KEY ("approvalInstanceId") REFERENCES "approval_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_ownerEmployeeId_fkey" FOREIGN KEY ("ownerEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_request_attachments" ADD CONSTRAINT "leave_request_attachments_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "attachments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_request_attachments" ADD CONSTRAINT "leave_request_attachments_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "leave_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_request_attachments" ADD CONSTRAINT "overtime_request_attachments_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "attachments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_request_attachments" ADD CONSTRAINT "overtime_request_attachments_overtimeRequestId_fkey" FOREIGN KEY ("overtimeRequestId") REFERENCES "overtime_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_claim_attachments" ADD CONSTRAINT "medical_claim_attachments_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "attachments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_claim_attachments" ADD CONSTRAINT "medical_claim_attachments_medicalClaimId_fkey" FOREIGN KEY ("medicalClaimId") REFERENCES "medical_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_media" ADD CONSTRAINT "employee_media_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_media" ADD CONSTRAINT "employee_media_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "attachments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_attachments" ADD CONSTRAINT "announcement_attachments_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "attachments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_attachments" ADD CONSTRAINT "announcement_attachments_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_outboxId_fkey" FOREIGN KEY ("outboxId") REFERENCES "notification_outbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorEmployeeId_fkey" FOREIGN KEY ("actorEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_actorEmployeeId_fkey" FOREIGN KEY ("actorEmployeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legacy_records" ADD CONSTRAINT "legacy_records_migrationRunId_fkey" FOREIGN KEY ("migrationRunId") REFERENCES "migration_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "migration_reconciliation_results" ADD CONSTRAINT "migration_reconciliation_results_migrationRunId_fkey" FOREIGN KEY ("migrationRunId") REFERENCES "migration_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- M2 custom integrity constraints not representable in Prisma schema.
ALTER TABLE "weekly_work_rules"
  ADD CONSTRAINT "weekly_work_rules_isoWeekday_check"
  CHECK ("isoWeekday" BETWEEN 1 AND 7);

ALTER TABLE "leave_entitlements"
  ADD CONSTRAINT "leave_entitlements_quota_check"
  CHECK ("quota" >= 0);

ALTER TABLE "leave_requests"
  ADD CONSTRAINT "leave_requests_date_order_check"
  CHECK ("startDate" <= "endDate");

ALTER TABLE "approval_policy_steps"
  ADD CONSTRAINT "approval_policy_steps_stepOrder_check"
  CHECK ("stepOrder" > 0);

ALTER TABLE "approval_steps"
  ADD CONSTRAINT "approval_steps_stepOrder_check"
  CHECK ("stepOrder" > 0);

ALTER TABLE "attendance_policies"
  ADD CONSTRAINT "attendance_policies_radiusKm_check"
  CHECK ("radiusKm" > 0);

ALTER TABLE "overtime_segments"
  ADD CONSTRAINT "overtime_segments_requestedMinutes_check"
  CHECK ("requestedMinutes" > 0);

ALTER TABLE "benefit_policies"
  ADD CONSTRAINT "benefit_policies_annualLimit_check"
  CHECK ("annualLimit" IS NULL OR "annualLimit" >= 0);

ALTER TABLE "medical_claims"
  ADD CONSTRAINT "medical_claims_amount_check"
  CHECK ("amount" >= 0);

ALTER TABLE "attachments"
  ADD CONSTRAINT "attachments_sizeBytes_check"
  CHECK ("sizeBytes" IS NULL OR "sizeBytes" >= 0);

ALTER TABLE "notification_outbox"
  ADD CONSTRAINT "notification_outbox_attempts_check"
  CHECK ("attempts" >= 0);

ALTER TABLE "migration_runs"
  ADD CONSTRAINT "migration_runs_counts_check"
  CHECK (
    "importedCount" >= 0
    AND "skippedCount" >= 0
    AND "rejectedCount" >= 0
    AND "mismatchCount" >= 0
  );

ALTER TABLE "announcements"
  ADD CONSTRAINT "announcements_scope_target_check"
  CHECK (
    ("scope" = 'GLOBAL' AND "agencyId" IS NULL AND "departmentId" IS NULL)
    OR ("scope" = 'AGENCY' AND "agencyId" IS NOT NULL AND "departmentId" IS NULL)
    OR ("scope" = 'DEPARTMENT' AND "departmentId" IS NOT NULL AND "agencyId" IS NULL)
  );

