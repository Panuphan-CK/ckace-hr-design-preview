-- Professional roles (bookkeeper / responsible person / auditor) with a configurable
-- "does not need to clock in" flag (Owner, 2026-10-16). Additive only.

CREATE TABLE "professional_roles" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "attendanceExempt" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "professional_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "professional_roles_key_key" ON "professional_roles"("key");

CREATE TABLE "employee_professional_roles" (
    "employeeId" UUID NOT NULL,
    "professionalRoleId" UUID NOT NULL,
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_professional_roles_pkey" PRIMARY KEY ("employeeId","professionalRoleId")
);

CREATE INDEX "employee_professional_roles_professionalRoleId_idx" ON "employee_professional_roles"("professionalRoleId");

ALTER TABLE "employee_professional_roles" ADD CONSTRAINT "employee_professional_roles_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_professional_roles" ADD CONSTRAINT "employee_professional_roles_professionalRoleId_fkey"
  FOREIGN KEY ("professionalRoleId") REFERENCES "professional_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Starting set; the Owner can rename, add, deactivate and change the clock-in flag in the admin UI.
INSERT INTO "professional_roles" ("id", "key", "name", "attendanceExempt") VALUES
  (gen_random_uuid(), 'BOOKKEEPER', 'ผู้ทำบัญชี', false),
  (gen_random_uuid(), 'RESPONSIBLE', 'ผู้รับผิดชอบงาน', false),
  (gen_random_uuid(), 'AUDITOR', 'ผู้สอบบัญชี', true)
ON CONFLICT ("key") DO NOTHING;
