-- Medical auto-approval becomes policy data instead of a hard-coded role check.
-- The default keeps the previous behaviour (ADMIN and SUPERADMIN). Additive.
ALTER TABLE "benefit_policies" ADD COLUMN "autoApproveRoleKeys" TEXT[] NOT NULL DEFAULT ARRAY['ADMIN', 'SUPERADMIN']::TEXT[];
