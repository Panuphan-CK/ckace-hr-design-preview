import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import {
  createXlsxLegacySourcesFromBuffers,
  XlsxReadOnlyLegacySource,
} from "./xlsx-source";

const layouts = {
  "CKRR_Requests_sanitized.xlsx": {
    Users: ["UID", "Fullname", "startDate"],
    Agency: ["agencyId"],
    Departments: ["deptId"],
    UserPolicies: ["PolicyID"],
    Holidays: ["HolidaysID"],
    DayOfWeek: ["DayOfWeek"],
  },
  "Data_CKRR_Requests_sanitized.xlsx": {
    LeaveRequests: ["leave_id"],
    LeaveRequests_2025: ["leave_id"],
    ApprovalSteps: ["stepId"],
    OvertimeRequests: ["RequestID"],
    OT_ApprovalSteps: ["StepID"],
    TimeLog: ["LogID", "Date", "CheckInTime"],
    TimeLog_2025: ["LogID"],
    TimeCorrections: ["RequestID", "CorrectedCheckIn"],
    MedicalClaims: ["ClaimID"],
    MedicalClaims_2025: ["ClaimID"],
    Medical_ApprovalSteps: ["StepID"],
    MedicalAttachments: ["FileID"],
    Attachments: ["fileId"],
    LineServiceAttachments: ["FileID"],
  },
} as const;

async function workbookBuffer(
  tabs: Readonly<Record<string, { readonly headers: readonly string[]; readonly rows?: readonly (readonly unknown[])[] }>>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  for (const [name, spec] of Object.entries(tabs)) {
    const sheet = workbook.addWorksheet(name);
    sheet.addRow([...spec.headers]);
    for (const row of spec.rows ?? []) sheet.addRow([...row]);
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function completeWorkbooks(
  extra: {
    readonly users?: readonly (readonly unknown[])[];
    readonly currentTimeLog?: readonly (readonly unknown[])[];
    readonly currentTimeCorrections?: readonly (readonly unknown[])[];
  } = {},
): Promise<Readonly<Record<string, Buffer>>> {
  const master = Object.fromEntries(
    Object.entries(layouts["CKRR_Requests_sanitized.xlsx"]).map(([name, headers]) => [
      name,
      { headers, rows: name === "Users" ? extra.users : [] },
    ]),
  );
  const data = Object.fromEntries(
    Object.entries(layouts["Data_CKRR_Requests_sanitized.xlsx"]).map(([name, headers]) => [
      name,
      { headers, rows: name === "TimeLog" ? extra.currentTimeLog : name === "TimeCorrections" ? extra.currentTimeCorrections : [] },
    ]),
  );
  return {
    "CKRR_Requests_sanitized.xlsx": await workbookBuffer(master),
    "Data_CKRR_Requests_sanitized.xlsx": await workbookBuffer(data),
  };
}

describe("XlsxReadOnlyLegacySource", () => {
  it("reads required workbook tabs, normalizes dates/times and keeps source read-only", async () => {
    const buffers = await completeWorkbooks({
      users: [["USER-900", "พนักงานทดสอบ", "2025-01-02"]],
      currentTimeLog: [["LOG-900", new Date(Date.UTC(2025, 0, 2)), 0.375]],
    });
    const sources = await createXlsxLegacySourcesFromBuffers(buffers);
    const userSource = sources.find((source) => source.descriptor.sourceTab === "Users");
    const timeSource = sources.find((source) => source.descriptor.sourceTab === "TimeLog");

    expect(userSource).toBeDefined();
    expect(userSource?.descriptor).toMatchObject({
      sourceSystem: "APP_LEAVE_GAS",
      sourceWorkbook: "CKRR_Requests_sanitized.xlsx",
      sourcePeriod: "CURRENT",
    });
    expect(await userSource?.readRows()).toMatchObject([
      {
        rowNumber: 2,
        legacyId: "USER-900",
        values: { startDate: "02/01/2025" },
      },
    ]);
    expect(await timeSource?.readRows()).toMatchObject([
      {
        values: { Date: "02/01/2025", CheckInTime: "09:00" },
      },
    ]);
  });

  it("normalizes Excel time fractions in camel-case correction columns", async () => {
    const buffers = await completeWorkbooks({
      currentTimeCorrections: [["COR-900", 0.375]],
    });
    const sources = await createXlsxLegacySourcesFromBuffers(buffers);
    const correctionSource = sources.find((source) => source.descriptor.sourceTab === "TimeCorrections");

    expect(await correctionSource?.readRows()).toMatchObject([
      { values: { CorrectedCheckIn: "09:00" } },
    ]);
  });

  it("requires both sanitized workbooks and every manifest tab", async () => {
    await expect(
      createXlsxLegacySourcesFromBuffers({}),
    ).rejects.toThrow("Missing required XLSX workbook");

    const workbook = await workbookBuffer({ Users: { headers: ["UID"] } });
    await expect(
      createXlsxLegacySourcesFromBuffers({
        "CKRR_Requests_sanitized.xlsx": workbook,
        "Data_CKRR_Requests_sanitized.xlsx": Buffer.from([]),
      }),
    ).rejects.toThrow();
  });

  it("rejects formula values instead of silently importing cached results", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Users");
    sheet.addRow(["UID", "Fullname", "startDate"]);
    sheet.addRow([{ formula: "1+1", result: "USER-900" }, "Test", null]);
    const buffers = await completeWorkbooks();
    await expect(
      createXlsxLegacySourcesFromBuffers({
        ...buffers,
        "CKRR_Requests_sanitized.xlsx": Buffer.from(await workbook.xlsx.writeBuffer()),
      }),
    ).rejects.toThrow(/formula is not accepted/);
  });

  it("row-qualifies duplicate attachment ids but rejects duplicate business ids", async () => {
    const attachments = new XlsxReadOnlyLegacySource({
      workbookName: "Data_CKRR_Requests_sanitized.xlsx",
      worksheetName: "Attachments",
      idColumn: "fileId",
      rows: [
        { fileId: "FILE-1" },
        { fileId: "FILE-1" },
      ],
    });
    expect((await attachments.readRows()).map((row) => row.legacyId)).toEqual([
      "FILE-1::ROW:2",
      "FILE-1::ROW:3",
    ]);

    const users = new XlsxReadOnlyLegacySource({
      workbookName: "CKRR_Requests_sanitized.xlsx",
      worksheetName: "Users",
      idColumn: "UID",
      rows: [{ UID: "USER-1" }, { UID: "USER-1" }],
    });
    await expect(users.readRows()).rejects.toThrow(/Duplicate legacy identifier/);
  });

  it("row-qualifies colliding attendance IDs so the importer can record an explicit exception", async () => {
    const timeLogs = new XlsxReadOnlyLegacySource({
      workbookName: "Data_CKRR_Requests_sanitized.xlsx",
      worksheetName: "TimeLog",
      idColumn: "LogID",
      rows: [
        { LogID: "LOG-1", CheckInTime: "09:00" },
        { LogID: "LOG-1", CheckInTime: "09:10" },
      ],
    });

    expect((await timeLogs.readRows()).map((row) => row.legacyId)).toEqual([
      "LOG-1::ROW:2",
      "LOG-1::ROW:3",
    ]);
  });
});
