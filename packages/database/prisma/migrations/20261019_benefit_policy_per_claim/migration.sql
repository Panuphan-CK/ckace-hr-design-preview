-- Per-claim medical limit becomes policy data (Owner: defaults stay but must be configurable).
-- Null keeps the previous behaviour (1,000 baht per claim). Additive.
ALTER TABLE "benefit_policies" ADD COLUMN "perClaimLimit" DECIMAL(12,2);
