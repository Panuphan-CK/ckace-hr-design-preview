-- M7.2: legacy code H is hourly leave with start/end time and variable fractional-day usage.
-- Rename the CKACE HR enum value before module data migration; no Production data is touched here.
ALTER TYPE "LeaveDurationCode" RENAME VALUE 'HALF_DAY' TO 'HOURLY';
