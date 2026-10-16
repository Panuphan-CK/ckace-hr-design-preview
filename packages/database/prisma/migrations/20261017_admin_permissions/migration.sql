-- Permission keys used by the Desktop admin/management/report APIs that were never part of the
-- permission catalog (found while preparing the TEST database on 2026-10-16: a SUPERADMIN could not
-- open any admin page). Additive and idempotent. Roles are created by the RBAC baseline, so grants are
-- no-ops where a role does not exist yet. Defaults below are the proposed starting point; the Owner can
-- change grants in the RBAC admin page.
--   SUPERADMIN : all of them
--   ADMIN      : read access to organisation/users/entitlements/work calendar, calendar and reports
--   SUPERUSER, EMPLOYEE : calendar.leave.read; SUPERUSER also reports.management.read

INSERT INTO "permissions" ("id", "key", "description", "createdAt")
SELECT gen_random_uuid(), v.key, v.key, CURRENT_TIMESTAMP
FROM (VALUES
  ('announcements.admin.delete'),
  ('calendar.leave.read'),
  ('credentials.reset.issue'),
  ('leave.entitlements.admin.read'),
  ('leave.entitlements.admin.write'),
  ('organization.admin.read'),
  ('organization.admin.write'),
  ('rbac.admin.read'),
  ('rbac.admin.write'),
  ('reports.management.read'),
  ('users.admin.read'),
  ('users.admin.write'),
  ('work_calendar.admin.read'),
  ('work_calendar.admin.write')
) AS v(key)
WHERE NOT EXISTS (SELECT 1 FROM "permissions" p WHERE p."key" = v.key);

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM (VALUES
  ('SUPERADMIN', 'announcements.admin.delete'),
  ('SUPERADMIN', 'calendar.leave.read'),
  ('SUPERADMIN', 'credentials.reset.issue'),
  ('SUPERADMIN', 'leave.entitlements.admin.read'),
  ('SUPERADMIN', 'leave.entitlements.admin.write'),
  ('SUPERADMIN', 'organization.admin.read'),
  ('SUPERADMIN', 'organization.admin.write'),
  ('SUPERADMIN', 'rbac.admin.read'),
  ('SUPERADMIN', 'rbac.admin.write'),
  ('SUPERADMIN', 'reports.management.read'),
  ('SUPERADMIN', 'users.admin.read'),
  ('SUPERADMIN', 'users.admin.write'),
  ('SUPERADMIN', 'work_calendar.admin.read'),
  ('SUPERADMIN', 'work_calendar.admin.write'),
  ('ADMIN', 'calendar.leave.read'),
  ('ADMIN', 'reports.management.read'),
  ('ADMIN', 'organization.admin.read'),
  ('ADMIN', 'users.admin.read'),
  ('ADMIN', 'leave.entitlements.admin.read'),
  ('ADMIN', 'work_calendar.admin.read'),
  ('SUPERUSER', 'calendar.leave.read'),
  ('SUPERUSER', 'reports.management.read'),
  ('EMPLOYEE', 'calendar.leave.read')
) AS g(role_key, perm_key)
JOIN "roles" r ON r."key" = g.role_key
JOIN "permissions" p ON p."key" = g.perm_key
WHERE NOT EXISTS (
  SELECT 1 FROM "role_permissions" rp
  WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
);
