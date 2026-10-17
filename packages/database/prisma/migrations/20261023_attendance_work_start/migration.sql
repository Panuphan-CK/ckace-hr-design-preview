-- Normal working-day start becomes policy data so the time-correction work-hour cap
-- follows the configured hours instead of a hard-coded 7.5h. Default 09:00 keeps the
-- previous cap (09:00-17:30 minus 1h lunch = 450 min). Additive.
ALTER TABLE "attendance_policies" ADD COLUMN "workStart" TIME(0) NOT NULL DEFAULT '09:00:00';
