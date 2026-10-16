-- Per-employee approval route mode (Owner, 2026-10-16): an employee such as an administrative clerk can
-- send requests to the direct manager first. Additive; every existing employee stays STANDARD.
-- No Production data is touched by this migration file.

-- CreateEnum
CREATE TYPE "ApprovalRouteMode" AS ENUM ('STANDARD', 'MANAGER_FIRST');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN "approvalRouteMode" "ApprovalRouteMode" NOT NULL DEFAULT 'STANDARD';
