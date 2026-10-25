-- Admin can confirm an overtime segment whose clock-in/out was forgotten.
ALTER TABLE "overtime_segments"
  ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "confirmedById" UUID;
