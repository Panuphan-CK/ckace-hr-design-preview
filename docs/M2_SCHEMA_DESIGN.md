# M2 — Local PostgreSQL / Prisma Schema Design

**Status:** PASS — LOCAL DESIGN COMPLETE / NEON DEV OWNER GATE
**Date:** 2026-10-04 Asia/Bangkok

## Goal

Translate verified M0 legacy evidence into a canonical PostgreSQL/Prisma model without creating Neon or changing Production.

## Canonical domains

Identity / organization:
- Agency
- Department
- Employee
- UserAccount
- LineAccount
- Role / Permission / UserRole / RolePermission

Approval:
- ApprovalPolicy
- ApprovalPolicyStep
- ApprovalInstance
- ApprovalStep

Leave:
- LeaveType / LeaveTypeAlias
- LeaveEntitlement
- LeaveRequest

Attendance:
- AttendanceRecord
- AttendanceCalculation
- AttendancePolicy
- TimeCorrectionRequest
- Holiday
- WeeklyWorkRule

Overtime:
- OvertimeRequest
- OvertimeSegment

Medical / benefits:
- BenefitPolicy
- MedicalClaim

Files / shared:
- Attachment
- LeaveRequestAttachment
- OvertimeRequestAttachment
- MedicalClaimAttachment
- EmployeeMedia
- Announcement / AnnouncementAttachment
- NotificationOutbox / NotificationDelivery
- AuditLog
- IdempotencyKey

Migration:
- MigrationRun
- LegacyRecord
- MigrationReconciliationResult

## M0 risks encoded into schema

1. Canonical IDs are UUIDs.
2. Legacy provenance is source-qualified by system/workbook/tab/period/legacy ID.
3. Legacy ID alone is never globally unique.
4. AttendanceRecord intentionally has an index, not a unique constraint, on employee + work date because M0 found a real duplicate business day.
5. Leave entitlements do not force one row per employee/type so historical periods and migration exceptions can be represented.
6. Approval policies use ordered rows instead of legacy Role1/Scope1 columns.
7. Historical approval steps may retain Pending rows after a Rejected step; import is allowed to preserve source history.
8. Attachments are private metadata records with module-specific link tables; runtime bytes are designed for R2 later.
9. Account state distinguishes ACTIVE, PENDING, INACTIVE and RESIGNED.
10. LINE account is optional and unique when present.

## Legacy compatibility mappings

Leave duration mapping is explicit and fail-closed:
- F -> FULL_DAY
- H -> HALF_DAY
- AM -> MORNING
- PM -> AFTERNOON
- unknown values throw and become migration exceptions instead of silent normalization.

## Baseline migration SQL

Generated offline from empty PostgreSQL schema:
packages/database/prisma/migrations/20261004_m2_baseline/migration.sql

Custom SQL integrity checks added because Prisma schema does not represent them directly:
- ISO weekday 1..7
- nonnegative leave quota
- leave start date <= end date
- positive approval step order
- positive attendance radius
- positive overtime minutes
- nonnegative benefit annual limit
- nonnegative medical amount
- nonnegative attachment size
- nonnegative notification attempts
- nonnegative migration counters
- announcement scope target consistency

Attachment storage provider + storage key is unique when storageKey is non-null.

## Verification

PASS:
- Prisma format exit 0.
- Prisma validate exit 0.
- Prisma Client 6.12.0 generate exit 0.
- offline migrate diff from empty generated SQL exit 0.
- npm run check exit 0.
- lint PASS.
- typecheck PASS across all workspaces.
- Vitest: 6 files / 29 tests PASS.
- production build PASS.
- Next.js routes / and /liff build PASS.
- npm audit: 0 vulnerabilities.
- secret-signature scan: 0 hits.

## Known limitation

The baseline SQL has been generated and contract-tested offline but has not yet been applied to a real PostgreSQL/Neon database. Actual migration apply/rollback verification belongs to the Neon DEV gate and must use synthetic data only.

## Production boundary

M2 did not:
- create Neon.
- create R2.
- create GCP/Firebase runtime.
- change Production DNS or LINE configuration.
- import Production data.
- change any source of truth.
- modify Project A Production.

## Result

M2_LOCAL_SCHEMA_DESIGN = PASS

Next action requires Owner approval: create Neon DEV, apply the M2 baseline migration in DEV only, seed synthetic fixtures, run migration/rollback/reconnect verification, then proceed to M3 Identity/Auth/RBAC/Audit.
