import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(
    process.cwd(),
    "packages/database/prisma/migrations/20261004_m2_baseline/migration.sql",
  ),
  "utf8",
);

const hourlyMigration = readFileSync(
  join(
    process.cwd(),
    "packages/database/prisma/migrations/20261005_m7_leave_duration_hourly/migration.sql",
  ),
  "utf8",
);

const legacyStepStatusMigration = readFileSync(
  join(
    process.cwd(),
    "packages/database/prisma/migrations/20261005_m7_leave_legacy_step_status/migration.sql",
  ),
  "utf8",
);

describe("M2 baseline SQL hardening", () => {
  it.each([
    "weekly_work_rules_isoWeekday_check",
    "leave_entitlements_quota_check",
    "leave_requests_date_order_check",
    "approval_policy_steps_stepOrder_check",
    "approval_steps_stepOrder_check",
    "attendance_policies_radiusKm_check",
    "overtime_segments_requestedMinutes_check",
    "benefit_policies_annualLimit_check",
    "medical_claims_amount_check",
    "attachments_sizeBytes_check",
    "notification_outbox_attempts_check",
    "migration_runs_counts_check",
    "announcements_scope_target_check",
  ])("contains custom integrity constraint %s", (constraintName) => {
    expect(sql).toContain('CONSTRAINT "' + constraintName + '"');
  });

  it("does not create a unique employee/date attendance constraint", () => {
    expect(sql).not.toContain(
      'UNIQUE INDEX "attendance_records_employeeId_workDate_key"',
    );
  });

  it("creates source-qualified legacy provenance uniqueness", () => {
    expect(sql).toContain(
      'ON "legacy_records"("sourceSystem", "sourceWorkbook", "sourceTab", "sourcePeriod", "legacyId")',
    );
  });

  it("renames the leave duration enum from the old half-day label to verified hourly semantics", () => {
    expect(hourlyMigration).toContain(
      'RENAME VALUE \'HALF_DAY\' TO \'HOURLY\'',
    );
  });

  it("adds raw legacy approval-step status without rewriting historical rows", () => {
    expect(legacyStepStatusMigration).toContain(
      'ADD COLUMN "legacyRawStatus" TEXT',
    );
  });
});
