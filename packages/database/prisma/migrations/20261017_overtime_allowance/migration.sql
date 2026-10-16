-- Overtime breaks, fixed allowances and attendance-exempt flag (Owner, 2026-10-15/16).
-- Additive only; defaults keep existing behaviour (no allowance, everybody clocks in).

ALTER TABLE "employees" ADD COLUMN "overtimeTransportSatang" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "employees" ADD COLUMN "attendanceExempt" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "overtime_segments" ADD COLUMN "breakCodes" JSONB;

CREATE TABLE "overtime_allowance_policies" (
    "kind" TEXT NOT NULL,
    "amountSatang" INTEGER NOT NULL DEFAULT 0,
    "paidWhenEndsAtOrAfter" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "overtime_allowance_policies_pkey" PRIMARY KEY ("kind")
);

-- Owner defaults: meal 50 baht when overtime ends 20:00 or later; transport threshold 21:30 (amount per person).
INSERT INTO "overtime_allowance_policies" ("kind", "amountSatang", "paidWhenEndsAtOrAfter")
VALUES ('MEAL', 5000, '20:00'), ('TRANSPORT', 0, '21:30')
ON CONFLICT ("kind") DO NOTHING;
