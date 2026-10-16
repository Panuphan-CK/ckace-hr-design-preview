-- Leave send-back for revision and withdrawal of approved leave (Owner, 2026-10-16).
-- 1) an approval step can be marked REVISION_REQUESTED when the approver sends a leave request back;
-- 2) new permission leave.approved.withdraw, granted by default only to SUPERADMIN. Withdrawing a leave
--    request that is already APPROVED is limited to the highest-level user.
-- Additive. No Production data is touched by this migration file; it only takes effect where it is applied.

-- AlterEnum
ALTER TYPE "ApprovalStepStatus" ADD VALUE IF NOT EXISTS 'REVISION_REQUESTED';

-- Permission catalog entry (idempotent)
INSERT INTO "permissions" ("id", "key", "description", "createdAt")
SELECT gen_random_uuid(), 'leave.approved.withdraw', 'Withdraw an approved leave request (highest-level user only)', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "key" = 'leave.approved.withdraw');

-- Default grant: SUPERADMIN only (idempotent; no-op where the role does not exist yet)
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."key" = 'leave.approved.withdraw'
WHERE r."key" = 'SUPERADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp
    WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );
