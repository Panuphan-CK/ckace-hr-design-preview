-- Annual, personal and sick leave follow the calendar year with no carry-over.
-- Entitlements created without validity dates counted requests of every year;
-- give them the 2026 window so 2027 starts with fresh balances (created by the
-- notification job on 1 January). Special per-person leave types are untouched.
UPDATE "leave_entitlements" e
SET "validFrom" = DATE '2026-01-01',
    "validTo" = DATE '2026-12-31'
FROM "leave_types" t
WHERE e."leaveTypeId" = t."id"
  AND t."key" IN ('ANNUAL', 'PERSONAL', 'SICK')
  AND e."validFrom" IS NULL
  AND e."validTo" IS NULL;
