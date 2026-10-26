import type {
  JsonValue,
  LegacyExtractedRecord,
  MigrationTransformer,
} from "./migration-contracts";
import { parseLegacyDateDdMmYyyy } from "./legacy-mappings";

function text(record: LegacyExtractedRecord, key: string): string {
  const value = record.values[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing or invalid ${key}`);
  }
  return value.trim();
}

function booleanValue(value: unknown): boolean {
  if (value === true || value === "TRUE" || value === "true") return true;
  if (value === false || value === "FALSE" || value === "false") return false;
  throw new Error("Invalid legacy working-day flag");
}

function weekdayNumber(value: unknown): number {
  const weekdayNames: Readonly<Record<string, number>> = {
    SUNDAY: 7,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
    "วันอาทิตย์": 7,
    "วันจันทร์": 1,
    "วันอังคาร": 2,
    "วันพุธ": 3,
    "วันพฤหัสบดี": 4,
    "วันศุกร์": 5,
    "วันเสาร์": 6,
  };
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 7) return numeric;
  if (numeric === 0) return 7;
  const mapped = weekdayNames[String(value ?? "").trim().toUpperCase()]
    ?? weekdayNames[String(value ?? "").trim()];
  if (!mapped) throw new Error("Unknown legacy weekday");
  return mapped;
}

function decision(
  record: LegacyExtractedRecord,
  action: (record: LegacyExtractedRecord) => { targetEntityType: string; payload: JsonValue },
  code: string,
): ReturnType<MigrationTransformer["transform"]> {
  try {
    const result = action(record);
    return { action: "IMPORT", ...result };
  } catch (error) {
    return {
      action: "REJECT",
      code,
      reason: error instanceof Error ? error.message : "Invalid organization/calendar source",
    };
  }
}

export const agencyTransformer: MigrationTransformer = {
  version: "organization-agency-v1",
  transform(record) {
    return decision(record, (source) => {
      if (source.provenance.sourceTab !== "Agency") throw new Error("Agency transformer accepts only Agency rows");
      const legacyAgencyId = text(source, "agencyId");
      const companyName = legacyAgencyId === "AGC-002"
        ? "บริษัท ซี.เค.เอซ การบัญชี"
        : legacyAgencyId === "AGC-003"
          ? "บริษัท รีวิว แอนด์ รีไวส์ สอบบัญชี"
          : null;
      if (!companyName && legacyAgencyId !== "AGC-001") {
        throw new Error("Agency has no owner-confirmed company crosswalk");
      }
      return {
        targetEntityType: "organization_agency",
        payload: {
          legacyAgencyId,
          name: text(source, "agencyname"),
          companyName,
          legacyApprovalColumnsIgnored: true,
        },
      };
    }, "ORGANIZATION_AGENCY_INVALID_SOURCE");
  },
};

export const departmentTransformer: MigrationTransformer = {
  version: "organization-department-v1",
  transform(record) {
    return decision(record, (source) => {
      if (source.provenance.sourceTab !== "Departments") throw new Error("Department transformer accepts only Departments rows");
      return {
        targetEntityType: "organization_department",
        payload: {
          legacyDepartmentId: text(source, "deptId"),
          name: text(source, "deptname"),
        },
      };
    }, "ORGANIZATION_DEPARTMENT_INVALID_SOURCE");
  },
};

export const holidayTransformer: MigrationTransformer = {
  version: "holiday-v1",
  transform(record) {
    return decision(record, (source) => {
      if (source.provenance.sourceTab !== "Holidays") throw new Error("Holiday transformer accepts only Holidays rows");
      const rawDate = source.values.HolidaysDay;
      if (typeof rawDate !== "string") throw new Error("Invalid holiday date");
      return {
        targetEntityType: "holiday",
        payload: {
          legacyHolidayId: text(source, "HolidaysID"),
          holidayDate: parseLegacyDateDdMmYyyy(rawDate),
          description: text(source, "HolidaysName"),
        },
      };
    }, "HOLIDAY_INVALID_SOURCE");
  },
};

export const weeklyWorkRuleTransformer: MigrationTransformer = {
  version: "weekly-work-rule-v1",
  transform(record) {
    return decision(record, (source) => {
      if (source.provenance.sourceTab !== "DayOfWeek") throw new Error("Weekly rule transformer accepts only DayOfWeek rows");
      return {
        targetEntityType: "weekly_work_rule",
        payload: {
          legacyWeekday: String(source.values.DayOfWeek ?? "").trim(),
          isoWeekday: weekdayNumber(source.values.DayOfWeek),
          isWorking: booleanValue(source.values.IsWorkingDay),
        },
      };
    }, "WEEKLY_WORK_RULE_INVALID_SOURCE");
  },
};

export function normalizeLegacyWeekday(value: unknown): number {
  return weekdayNumber(value);
}
