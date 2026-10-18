-- Owner decision 2026-10-18:
-- 1) SUPERADMIN is the company owner and only approves: self-service request/clock-in
--    permissions are removed from the role. Someone who is both owner and employee also gets
--    the EMPLOYEE role.
-- (A separate SYSTEM_ADMIN role was tried and dropped the same day: SUPERADMIN stays the highest level.)
-- Idempotent.
DELETE FROM "role_permissions" rp
USING "roles" r, "permissions" p
WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id"
  AND r."key" = 'SUPERADMIN'
  AND p."key" IN (
    'leave.self.read', 'leave.self.write',
    'overtime.self.read', 'overtime.self.write',
    'medical.self.read', 'medical.self.write',
    'medical.attachment.self.write', 'medical.attachment.self.delete',
    'time_correction.self.read', 'time_correction.self.write',
    'attendance.self.read', 'attendance.self.write',
    'benefits.self.read', 'requests.self.read'
  );
