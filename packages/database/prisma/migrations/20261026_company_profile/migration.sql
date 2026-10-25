-- Owner decision 2026-10-18: company information settings, starting with basic fields.
ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "taxId" TEXT,
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "email" TEXT;
