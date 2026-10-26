import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { InMemoryMigrationTargetStore } from "./in-memory-target-store";
import { createXlsxLegacySourcesFromBuffers } from "./xlsx-source";
import { runXlsxImport } from "./xlsx-import";

const layouts = {
  "CKRR_Requests_sanitized.xlsx": {
    Users: ["UID", "Username", "Fullname", "Agency", "Department", "Role", "Date", "status", "startDate", "ResignationDate", "Nickname"],
    Agency: ["agencyId", "agencyname"],
    Departments: ["deptId", "deptname"], UserPolicies: ["PolicyID", "UserID", "LeaveType", "LeaveQuota"],
    Holidays: ["HolidaysID"], DayOfWeek: ["DayOfWeek", "IsWorkingDay"],
  },
  "Data_CKRR_Requests_sanitized.xlsx": {
    LeaveRequests: ["leave_id", "description", "startDate", "endDate", "userId", "PolicyID", "leaveType", "status", "currentStep", "rejectedReason", "submitDate", "updatedDate", "leaveDuration", "startTime", "endTime"], LeaveRequests_2025: ["leave_id", "description", "startDate", "endDate", "userId", "PolicyID", "leaveType", "status", "currentStep", "rejectedReason", "submitDate", "updatedDate", "leaveDuration", "startTime", "endTime"],
    ApprovalSteps: ["stepId", "requestId", "stepOrder", "approverId", "assignedAt", "approvedAt", "status", "comment"], OvertimeRequests: ["RequestID"],
    OT_ApprovalSteps: ["StepID"], TimeLog: ["LogID"],
    TimeLog_2025: ["LogID"], TimeCorrections: ["RequestID"],
    MedicalClaims: ["ClaimID"], MedicalClaims_2025: ["ClaimID"],
    Medical_ApprovalSteps: ["StepID"], MedicalAttachments: ["FileID"],
    Attachments: ["fileId"], LineServiceAttachments: ["FileID"],
  },
} as const;

async function makeBuffer(
  specs: Readonly<Record<string, { headers: readonly string[]; rows?: readonly (readonly unknown[])[] }>>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  for (const [name, spec] of Object.entries(specs)) {
    const sheet = workbook.addWorksheet(name);
    sheet.addRow([...spec.headers]);
    for (const row of spec.rows ?? []) sheet.addRow([...row]);
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function sourceBuffers(extra: {
  readonly users?: readonly (readonly unknown[])[];
  readonly userPolicies?: readonly (readonly unknown[])[];
} = {}): Promise<Readonly<Record<string, Buffer>>> {
  const master = Object.fromEntries(Object.entries(layouts["CKRR_Requests_sanitized.xlsx"]).map(([name, headers]) => [
    name,
    {
      headers,
      rows: name === "Agency" ? [["AGC-002", "ทีมตัวอย่าง", "legacyApproverMustNotImport"]] :
        name === "Departments" ? [["DEP-900", "แผนกตัวอย่าง"]] :
          name === "Users" ? extra.users ?? [] :
            name === "UserPolicies" ? extra.userPolicies ?? [] : [],
    },
  ]));
  const data = Object.fromEntries(Object.entries(layouts["Data_CKRR_Requests_sanitized.xlsx"]).map(([name, headers]) => [
    name,
    { headers, rows: [] },
  ]));
  return {
    "CKRR_Requests_sanitized.xlsx": await makeBuffer(master),
    "Data_CKRR_Requests_sanitized.xlsx": await makeBuffer(data),
  };
}

async function conflictingTimeLogBuffers(): Promise<Readonly<Record<string, Buffer>>> {
  const buffers = await sourceBuffers();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffers["Data_CKRR_Requests_sanitized.xlsx"] as never);
  const sheet = workbook.getWorksheet("TimeLog");
  sheet?.addRow(["LOG-900"]);
  sheet?.addRow(["LOG-900"]);
  return {
    ...buffers,
    "Data_CKRR_Requests_sanitized.xlsx": Buffer.from(await workbook.xlsx.writeBuffer()),
  };
}

async function pendingLeaveBuffers(): Promise<Readonly<Record<string, Buffer>>> {
  const master = Object.fromEntries(Object.entries(layouts["CKRR_Requests_sanitized.xlsx"]).map(([name, headers]) => [
    name,
    {
      headers,
      rows: name === "Users"
        ? [["USER-900", "employee900@example.test", "พนักงาน 900", "AGC-002", "DEP-900", "User", null, true, "2020-04-17", null, null]]
        : name === "Agency" ? [["AGC-002", "ทีม A"]]
          : name === "Departments" ? [["DEP-900", "ทีมตัวอย่าง"]] : [],
    },
  ]));
  const data = Object.fromEntries(Object.entries(layouts["Data_CKRR_Requests_sanitized.xlsx"]).map(([name, headers]) => [
    name,
    {
      headers,
      rows: name === "LeaveRequests"
        ? [["LEV-900", "[ข้อความ]", "01/10/2026", "01/10/2026", "USER-900", "POL-900", "ANNUAL", "PENDING", 1, null, "18/09/2026", "18/09/2026", "F", null, null]]
        : name === "LeaveRequests_2025"
          ? [["LEV-900", "[ข้อความ]", "01/10/2025", "01/10/2025", "USER-900", "POL-900", "ANNUAL", "APPROVED", 1, null, "18/09/2025", "18/09/2025", "F", null, null]]
        : name === "ApprovalSteps"
          ? [["STEP-900", "LEV-900", 1, "USER-901", "18/09/2026", null, "PENDING", null]]
          : [],
    },
  ]));
  return {
    "CKRR_Requests_sanitized.xlsx": await makeBuffer(master),
    "Data_CKRR_Requests_sanitized.xlsx": await makeBuffer(data),
  };
}

describe("sanitized XLSX import orchestration", () => {
  it("imports organization rows through the shared migration engine and replays idempotently", async () => {
    const sources = await createXlsxLegacySourcesFromBuffers(await sourceBuffers());
    const targetStore = new InMemoryMigrationTargetStore();
    const first = await runXlsxImport({
      sources,
      migrationRunId: "xlsx-test-run",
      extractedAt: "2026-10-26T00:00:00.000Z",
      targetStore,
    });
    const replay = await runXlsxImport({
      sources,
      migrationRunId: "xlsx-test-run",
      extractedAt: "2026-10-26T00:00:00.000Z",
      targetStore,
    });

    expect(first.countsByTab.Agency).toBe(1);
    expect(first.countsByTab.Departments).toBe(1);
    expect(first.countsByTab.LineServiceAttachments).toBe(0);
    expect(first.report.importedCount).toBe(2);
    expect(first.report.mismatchCount).toBe(0);
    expect(targetStore.size).toBe(2);
    expect(replay.report.importedCount).toBe(0);
    expect(replay.report.skippedCount).toBe(2);
    expect(replay.report.mismatchCount).toBe(0);
  });

  it("records Pending GAS approvers for HR review and skips their assignment to the target route", async () => {
    const sources = await createXlsxLegacySourcesFromBuffers(await pendingLeaveBuffers());
    const targetStore = new InMemoryMigrationTargetStore();
    const result = await runXlsxImport({
      sources,
      migrationRunId: "xlsx-pending-handoff-run",
      extractedAt: "2026-10-26T00:00:00.000Z",
      targetStore,
    });

    expect(targetStore.pendingRequests).toEqual([
      expect.objectContaining({
        provenanceKey: expect.stringContaining("::LeaveRequests::CURRENT::LEV-900"),
        targetEntityType: "leave_request",
        requestKind: "LEAVE",
        requesterLegacyId: "USER-900",
        legacyPendingSteps: [{ stepOrder: 1, approverLegacyId: "USER-901" }],
      }),
    ]);
    expect(result.outcomesByTab.ApprovalSteps).toEqual({ SKIPPED_TRANSFORM: 1 });
  });

  it("records every colliding TimeLog row as an explicit rejected outcome", async () => {
    const sources = await createXlsxLegacySourcesFromBuffers(await conflictingTimeLogBuffers());
    const targetStore = new InMemoryMigrationTargetStore();
    const result = await runXlsxImport({
      sources,
      migrationRunId: "xlsx-duplicate-attendance-run",
      extractedAt: "2026-10-26T00:00:00.000Z",
      targetStore,
    });

    expect(result.countsByTab.TimeLog).toBe(2);
    expect(result.outcomesByTab.TimeLog).toEqual({ REJECTED_TRANSFORM: 2 });
    expect(result.report.outcomes.filter((outcome) => outcome.code === "ATTENDANCE_DUPLICATE_SOURCE_LOG_ID")).toHaveLength(2);
    expect(targetStore.size).toBe(2);
  });

  it("uses target-policy quota semantics including current-year hires and USER-008's corrected date", async () => {
    const sources = await createXlsxLegacySourcesFromBuffers(await sourceBuffers({
      users: [
        ["USER-900", "employee900@example.test", "พนักงาน 900", "AGC-002", "DEP-900", "User", null, true, "2026-04-17", null, null],
        ["USER-008", "employee008@example.test", "พนักงาน 008", "AGC-002", "DEP-900", "User", null, true, "2567-04-17", null, null],
      ],
      userPolicies: [
        ["POL-900", "USER-900", "VACATION", 1],
        ["POL-901", "USER-008", "VACATION", 10],
        ["POL-902", "USER-900", "PERSONAL", 1],
        ["POL-903", "USER-900", "SICK", 20],
      ],
    }));
    const targetStore = new InMemoryMigrationTargetStore();
    const result = await runXlsxImport({
      sources,
      migrationRunId: "xlsx-tenure-quota-run",
      extractedAt: "2026-10-26T00:00:00.000Z",
      targetStore,
    });
    const entitlements = targetStore.createdInputs
      .filter((input) => input.targetEntityType === "leave_entitlement")
      .map((input) => input.payload as Readonly<Record<string, unknown>>);

    expect(result.outcomesByTab.UserPolicies).toEqual({ IMPORTED: 4 });
    expect(entitlements.map((payload) => [payload.employeeLegacyId, payload.quota])).toEqual([
      ["USER-900", 5],
      ["USER-008", 6],
      ["USER-900", 6],
      ["USER-900", 30],
    ]);
  });
});
