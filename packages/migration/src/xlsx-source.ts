import { basename } from "node:path";
import { readFile } from "node:fs/promises";

import ExcelJS from "exceljs";

import type {
  JsonPrimitive,
  JsonValue,
  LegacyRawRow,
  LegacySourceDescriptor,
  ReadOnlyLegacySource,
} from "./migration-contracts";

const SOURCE_TABS = Object.freeze({
  "CKRR_Requests_sanitized.xlsx": {
    Users: "UID",
    Agency: "agencyId",
    Departments: "deptId",
    UserPolicies: "PolicyID",
    Holidays: "HolidaysID",
    DayOfWeek: "DayOfWeek",
  },
  "Data_CKRR_Requests_sanitized.xlsx": {
    LeaveRequests: "leave_id",
    LeaveRequests_2025: "leave_id",
    ApprovalSteps: "stepId",
    OvertimeRequests: "RequestID",
    OT_ApprovalSteps: "StepID",
    TimeLog: "LogID",
    TimeLog_2025: "LogID",
    TimeCorrections: "RequestID",
    MedicalClaims: "ClaimID",
    MedicalClaims_2025: "ClaimID",
    Medical_ApprovalSteps: "StepID",
    MedicalAttachments: "FileID",
    Attachments: "fileId",
    LineServiceAttachments: "FileID",
  },
} satisfies Readonly<Record<string, Readonly<Record<string, string>>>>);

const DATE_HEADER = /date|day|holiday|resignation|assigned|approved|submission|sickness|claim/i;
const TIME_HEADER = /check.?in|check.?out|start.?time|end.?time/i;

interface XlsxSourceOptions {
  readonly workbookName: string;
  readonly worksheetName: string;
  readonly idColumn: string;
  readonly rows: readonly Readonly<Record<string, JsonValue>>[];
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function legacyDate(date: Date): string {
  return `${date.getUTCDate().toString().padStart(2, "0")}/${(date.getUTCMonth() + 1).toString().padStart(2, "0")}/${date.getUTCFullYear().toString().padStart(4, "0")}`;
}

function legacyTime(date: Date): string {
  return `${date.getUTCHours().toString().padStart(2, "0")}:${date.getUTCMinutes().toString().padStart(2, "0")}:${date.getUTCSeconds().toString().padStart(2, "0")}`;
}

function excelTime(value: number): string {
  const minutes = Math.round(value * 24 * 60) % (24 * 60);
  return `${Math.floor(minutes / 60).toString().padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`;
}

function scalarValue(value: ExcelJS.CellValue, header: string): JsonPrimitive {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return TIME_HEADER.test(header) ? legacyTime(value) : legacyDate(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (DATE_HEADER.test(header) && isoDate) {
      if (header.toLowerCase() === "startdate" && Number(isoDate[1]) >= 2500) {
        return trimmed;
      }
      return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;
    }
    return trimmed || null;
  }
  if (typeof value === "number") {
    if (TIME_HEADER.test(header) && value >= 0 && value < 1) {
      return excelTime(value);
    }
    if (!Number.isFinite(value)) throw new Error("XLSX contains a non-finite numeric value");
    return value;
  }
  if (typeof value === "boolean") return value;
  if (typeof value === "object") {
    if ("formula" in value || "sharedFormula" in value) {
      throw new Error(`XLSX formula is not accepted in ${header}`);
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("").trim();
    }
    if ("text" in value && typeof value.text === "string") {
      return value.text.trim();
    }
  }
  throw new Error(`Unsupported XLSX cell value in ${header}`);
}

function periodForTab(tab: string): string {
  return tab.endsWith("_2025") ? "2025" : "CURRENT";
}

export class XlsxReadOnlyLegacySource implements ReadOnlyLegacySource {
  readonly descriptor: LegacySourceDescriptor;

  constructor(private readonly options: XlsxSourceOptions) {
    this.descriptor = Object.freeze({
      sourceSystem: "APP_LEAVE_GAS",
      sourceWorkbook: options.workbookName,
      sourceTab: options.worksheetName,
      sourcePeriod: periodForTab(options.worksheetName),
    });
  }

  async readRows(): Promise<readonly LegacyRawRow[]> {
    const duplicates = new Map<string, number>();
    for (const row of this.options.rows) {
      const rawId = row[this.options.idColumn];
      if ((typeof rawId !== "string" && typeof rawId !== "number") || !String(rawId).trim()) {
        if (Object.values(row).every(isBlank)) continue;
        throw new Error(`Missing ${this.options.idColumn} in ${this.options.worksheetName}`);
      }
      const id = String(rawId).trim();
      duplicates.set(id, (duplicates.get(id) ?? 0) + 1);
    }

    const rows: LegacyRawRow[] = [];
    this.options.rows.forEach((values, index) => {
      if (Object.values(values).every(isBlank)) return;
      const idValue = values[this.options.idColumn];
      if ((typeof idValue !== "string" && typeof idValue !== "number") || !String(idValue).trim()) {
        throw new Error(`Missing ${this.options.idColumn} in ${this.options.worksheetName}`);
      }
      const id = String(idValue).trim();
      const rowQualifiedDuplicates = [
        "Attachments",
        "MedicalAttachments",
        "TimeLog",
        "TimeLog_2025",
      ].includes(this.options.worksheetName);
      if ((duplicates.get(id) ?? 0) > 1 && !rowQualifiedDuplicates) {
        throw new Error(`Duplicate legacy identifier in ${this.options.worksheetName}`);
      }
      rows.push({
        rowNumber: index + 2,
        legacyId: rowQualifiedDuplicates && (duplicates.get(id) ?? 0) > 1
          ? `${id}::ROW:${index + 2}`
          : id,
        values,
      });
    });
    return rows;
  }
}

export async function createXlsxLegacySourcesFromBuffers(
  workbooks: Readonly<Record<string, Buffer>>,
): Promise<readonly ReadOnlyLegacySource[]> {
  const sources: ReadOnlyLegacySource[] = [];
  for (const [workbookName, tabs] of Object.entries(SOURCE_TABS)) {
    const buffer = workbooks[workbookName];
    if (!buffer) throw new Error(`Missing required XLSX workbook ${workbookName}`);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);
    for (const [worksheetName, idColumn] of Object.entries(tabs)) {
      const worksheet = workbook.getWorksheet(worksheetName);
      if (!worksheet) throw new Error(`Missing required XLSX tab ${worksheetName}`);
      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell({ includeEmpty: true }, (cell, columnIndex) => {
        headers[columnIndex - 1] = String(cell.value ?? "").trim();
      });
      if (!headers.includes(idColumn)) throw new Error(`Missing ${idColumn} header in ${worksheetName}`);
      const rows: Readonly<Record<string, JsonValue>>[] = [];
      for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 1) {
        const row = worksheet.getRow(rowIndex);
        const values: Record<string, JsonValue> = {};
        headers.forEach((header, columnIndex) => {
          if (!header) return;
          const value = scalarValue(row.getCell(columnIndex + 1).value, header);
          values[header] = value;
        });
        if (Object.values(values).every(isBlank)) continue;
        rows.push(Object.freeze(values));
      }
      sources.push(new XlsxReadOnlyLegacySource({
        workbookName,
        worksheetName,
        idColumn,
        rows: Object.freeze(rows),
      }));
    }
  }
  return Object.freeze(sources);
}

export async function createXlsxLegacySourcesFromFiles(
  files: Readonly<Record<string, string>>,
): Promise<readonly ReadOnlyLegacySource[]> {
  const buffers: Record<string, Buffer> = {};
  for (const expectedName of Object.keys(SOURCE_TABS)) {
    const path = files[expectedName];
    if (!path || basename(path).toLowerCase() !== expectedName.toLowerCase()) {
      throw new Error(`XLSX path must identify ${expectedName}`);
    }
    buffers[expectedName] = await readFile(path);
  }
  return createXlsxLegacySourcesFromBuffers(buffers);
}
