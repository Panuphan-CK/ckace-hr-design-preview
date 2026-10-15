-- Company platform foundation (Owner, 2026-10-15): companies, teams belong to a company,
-- direct manager, and role scopes. Additive only; existing role rows keep the PLATFORM
-- scope so approval behaviour does not change until a company/scope is configured.
-- No Production data is touched by this migration file.

-- CreateEnum
CREATE TYPE "RoleScopeType" AS ENUM ('PLATFORM', 'COMPANY', 'TEAM_SET', 'SELF');

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "agencies" ADD COLUMN "companyId" UUID;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN "companyId" UUID,
ADD COLUMN "managerEmployeeId" UUID;

-- AlterTable
ALTER TABLE "user_roles" ADD COLUMN "scopeType" "RoleScopeType" NOT NULL DEFAULT 'PLATFORM',
ADD COLUMN "scopeCompanyId" UUID,
ADD COLUMN "scopeAgencyIds" UUID[] DEFAULT ARRAY[]::UUID[];

-- CreateIndex
CREATE INDEX "companies_name_idx" ON "companies"("name");

-- CreateIndex
CREATE INDEX "agencies_companyId_idx" ON "agencies"("companyId");

-- CreateIndex
CREATE INDEX "employees_companyId_idx" ON "employees"("companyId");

-- CreateIndex
CREATE INDEX "employees_managerEmployeeId_idx" ON "employees"("managerEmployeeId");

-- AddForeignKey
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_managerEmployeeId_fkey" FOREIGN KEY ("managerEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_scopeCompanyId_fkey" FOREIGN KEY ("scopeCompanyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
