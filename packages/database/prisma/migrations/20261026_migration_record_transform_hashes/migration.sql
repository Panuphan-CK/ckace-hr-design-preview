ALTER TABLE "legacy_records"
  ADD COLUMN IF NOT EXISTS "transformedPayloadHash" TEXT,
  ADD COLUMN IF NOT EXISTS "transformerVersion" TEXT;
