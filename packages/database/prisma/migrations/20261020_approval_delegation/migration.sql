-- Approver delegation (mockup v18 "ผู้อนุมัติแทน"): an approver hands approvals to a delegate for a date
-- range; steps record who actually decided. Additive. Permission delegation.self.manage is granted to the
-- approver roles by default.
ALTER TABLE "approval_steps" ADD COLUMN "decidedByEmployeeId" UUID;
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_decidedByEmployeeId_fkey"
  FOREIGN KEY ("decidedByEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "approval_delegations" (
    "id" UUID NOT NULL,
    "delegatorEmployeeId" UUID NOT NULL,
    "delegateEmployeeId" UUID NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMPTZ(3),
    CONSTRAINT "approval_delegations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "approval_delegations_delegateEmployeeId_active_startDate_endDate_idx"
  ON "approval_delegations"("delegateEmployeeId", "active", "startDate", "endDate");
CREATE INDEX "approval_delegations_delegatorEmployeeId_active_idx"
  ON "approval_delegations"("delegatorEmployeeId", "active");

ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_delegatorEmployeeId_fkey"
  FOREIGN KEY ("delegatorEmployeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_delegateEmployeeId_fkey"
  FOREIGN KEY ("delegateEmployeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "key", "description", "createdAt")
SELECT gen_random_uuid(), 'delegation.self.manage', 'Delegate own approvals to another employee for a date range', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "key" = 'delegation.self.manage');

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."key" = 'delegation.self.manage'
WHERE r."key" IN ('SUPERUSER', 'ADMIN', 'SUPERADMIN')
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );
