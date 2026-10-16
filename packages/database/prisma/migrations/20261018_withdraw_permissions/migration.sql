-- Withdrawing an already APPROVED overtime / medical / time-correction request is limited to the
-- highest-level user (Owner decision 2026-10-15), same as leave. Additive and idempotent.
INSERT INTO "permissions" ("id", "key", "description", "createdAt")
SELECT gen_random_uuid(), v.key, v.key, CURRENT_TIMESTAMP
FROM (VALUES
  ('overtime.approved.withdraw'),
  ('medical.approved.withdraw'),
  ('time_correction.approved.withdraw')
) AS v(key)
WHERE NOT EXISTS (SELECT 1 FROM "permissions" p WHERE p."key" = v.key);

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."key" IN ('overtime.approved.withdraw', 'medical.approved.withdraw', 'time_correction.approved.withdraw')
WHERE r."key" = 'SUPERADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );
