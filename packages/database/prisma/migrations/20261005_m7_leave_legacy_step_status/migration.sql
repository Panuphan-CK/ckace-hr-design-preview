-- Preserve the imported approval-step state that has no exact CKACE HR enum equivalent.
-- In particular, legacy "Revise" steps are imported as canonical PENDING
-- while the immutable raw value remains available for audit/reconciliation.
ALTER TABLE "approval_steps"
ADD COLUMN "legacyRawStatus" TEXT;
