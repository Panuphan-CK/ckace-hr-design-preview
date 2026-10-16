-- Employees change their own password (profile.self.write). Granted to every role by default.
-- Additive and idempotent; grants are no-ops where a role does not exist yet.
INSERT INTO "permissions" ("id", "key", "description", "createdAt")
SELECT gen_random_uuid(), 'profile.self.write', 'Change own password and profile media', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "key" = 'profile.self.write');

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."key" = 'profile.self.write'
WHERE r."key" IN ('EMPLOYEE', 'SUPERUSER', 'ADMIN', 'SUPERADMIN')
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  );
