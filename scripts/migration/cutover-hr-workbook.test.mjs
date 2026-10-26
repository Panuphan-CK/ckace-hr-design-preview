import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import path from "node:path";

import {
  buildPostCutoverHrWorkbookBuffer,
  collectPostCutoverHrWorkbookRows,
  hrWorkbookPathForJson,
} from "./cutover-hr-workbook.mjs";

const ids = {
  employee: "11111111-1111-4111-8111-111111111111",
  approver: "22222222-2222-4222-8222-222222222222",
  leaveType: "33333333-3333-4333-8333-333333333333",
  benefitPolicy: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  leave: "44444444-4444-4444-8444-444444444444",
  overtime: "55555555-5555-4555-8555-555555555555",
  attendance: "66666666-6666-4666-8666-666666666666",
  timeCorrection: "77777777-7777-4777-8777-777777777777",
  medical: "88888888-8888-4888-8888-888888888888",
  leaveApproval: "99999999-9999-4999-8999-999999999999",
  otApproval: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  timeApproval: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  medicalApproval: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
};

const cutoff = new Date("2026-01-02T00:00:00.000Z");
const afterCutoff = new Date("2026-01-03T00:00:00.000Z");
const approvalTime = new Date("2026-01-03T03:30:00.000Z");

function rowsDelegate(rows) {
  return { findMany: async () => rows };
}

function syntheticPrisma() {
  const legacyRecords = [
    { id: "a0000000-0000-4000-8000-000000000001", sourceSystem: "APP_LEAVE_GAS", sourceTab: "Users", targetEntityType: "identity_profile_bundle", targetEntityId: ids.employee, legacyId: "USER-007" },
    { id: "a0000000-0000-4000-8000-000000000002", sourceSystem: "APP_LEAVE_GAS", sourceTab: "Users", targetEntityType: "identity_profile_bundle", targetEntityId: ids.approver, legacyId: "USER-002" },
    { id: "a0000000-0000-4000-8000-000000000003", sourceSystem: "APP_LEAVE_GAS", sourceTab: "LeaveRequests", targetEntityType: "leave_request", targetEntityId: ids.leave, legacyId: "LEV-0101" },
    { id: "a0000000-0000-4000-8000-000000000004", sourceSystem: "APP_LEAVE_GAS", sourceTab: "OvertimeRequests", targetEntityType: "overtime_request_bundle", targetEntityId: ids.overtime, legacyId: "OT-0201" },
    { id: "a0000000-0000-4000-8000-000000000005", sourceSystem: "APP_LEAVE_GAS", sourceTab: "TimeLog", targetEntityType: "attendance_record_bundle", targetEntityId: ids.attendance, legacyId: "LOG-0101" },
    { id: "a0000000-0000-4000-8000-000000000006", sourceSystem: "APP_LEAVE_GAS", sourceTab: "TimeCorrections", targetEntityType: "time_correction_request", targetEntityId: ids.timeCorrection, legacyId: "TC-0101" },
    { id: "a0000000-0000-4000-8000-000000000007", sourceSystem: "APP_LEAVE_GAS", sourceTab: "MedicalClaims", targetEntityType: "medical_claim", targetEntityId: ids.medical, legacyId: "MED-0101" },
  ];
  const approvalSteps = [
    { id: "d0000000-0000-4000-8000-000000000001", approvalInstanceId: ids.leaveApproval, stepOrder: 1, approverEmployeeId: ids.approver, coApproverEmployeeIds: [], decidedByEmployeeId: ids.approver, status: "APPROVED", assignedAt: afterCutoff, decidedAt: approvalTime },
    { id: "d0000000-0000-4000-8000-000000000002", approvalInstanceId: ids.otApproval, stepOrder: 1, approverEmployeeId: ids.approver, coApproverEmployeeIds: [], decidedByEmployeeId: ids.approver, status: "APPROVED", assignedAt: afterCutoff, decidedAt: approvalTime },
    { id: "d0000000-0000-4000-8000-000000000003", approvalInstanceId: ids.timeApproval, stepOrder: 1, approverEmployeeId: ids.approver, coApproverEmployeeIds: [], decidedByEmployeeId: ids.approver, status: "APPROVED", assignedAt: afterCutoff, decidedAt: approvalTime },
    { id: "d0000000-0000-4000-8000-000000000004", approvalInstanceId: ids.medicalApproval, stepOrder: 1, approverEmployeeId: ids.approver, coApproverEmployeeIds: [], decidedByEmployeeId: ids.approver, status: "APPROVED", assignedAt: afterCutoff, decidedAt: approvalTime },
  ];
  return {
    employee: rowsDelegate([
      { id: ids.employee, fullName: "พนักงานทดสอบ" },
      { id: ids.approver, fullName: "ผู้อนุมัติทดสอบ" },
    ]),
    legacyRecord: rowsDelegate(legacyRecords),
    leaveType: rowsDelegate([{ id: ids.leaveType, key: "SICK", name: "ลาป่วย" }]),
    benefitPolicy: rowsDelegate([{ id: ids.benefitPolicy, key: "MEDICAL", name: "ค่ารักษาพยาบาล" }]),
    approvalStep: rowsDelegate(approvalSteps),
    overtimeSegment: rowsDelegate([{
      id: "e0000000-0000-4000-8000-000000000001",
      overtimeRequestId: ids.overtime,
      workDate: afterCutoff,
      startTime: new Date("1970-01-01T18:00:00.000Z"),
      endTime: new Date("1970-01-01T19:30:00.000Z"),
      requestedMinutes: 90,
    }]),
    attendanceCalculation: rowsDelegate([{ id: "f0000000-0000-4000-8000-000000000001", attendanceRecordId: ids.attendance, workMinutes: 450 }]),
  };
}

function syntheticExportData() {
  return {
    generatedAt: afterCutoff,
    cutoverAt: cutoff.toISOString(),
    modules: {
      leave: {
        leaveRequest: [{
          id: ids.leave, requesterEmployeeId: ids.employee, leaveTypeId: ids.leaveType,
          approvalInstanceId: ids.leaveApproval, startDate: afterCutoff,
          endDate: afterCutoff, durationCode: "FULL_DAY", status: "APPROVED", submittedAt: afterCutoff,
          description: `ลากิจทดสอบ ${ids.leave}`,
        }],
      },
      overtime: {
        overtimeRequest: [{
          id: ids.overtime, employeeId: ids.employee, approvalInstanceId: ids.otApproval,
          reason: "ทดสอบ OT", status: "APPROVED", submittedAt: new Date("2026-01-01T00:00:00.000Z"), updatedAt: afterCutoff,
        }],
      },
      attendance: {
        attendanceRecord: [{
          id: ids.attendance, employeeId: ids.employee, workDate: afterCutoff,
          checkInAt: new Date("2026-01-02T23:00:00.000Z"), checkOutAt: new Date("2026-01-03T08:00:00.000Z"),
          createdAt: afterCutoff,
        }],
        timeCorrectionRequest: [{
          id: ids.timeCorrection, employeeId: ids.employee, approvalInstanceId: ids.timeApproval,
          attendanceDate: afterCutoff, originalCheckIn: new Date("1970-01-01T09:00:00.000Z"),
          originalCheckOut: new Date("1970-01-01T18:00:00.000Z"), correctedCheckIn: new Date("1970-01-01T08:30:00.000Z"),
          correctedCheckOut: new Date("1970-01-01T18:00:00.000Z"), reason: "ลืมลงเวลา", status: "APPROVED",
          requestedAt: new Date("2026-01-01T00:00:00.000Z"), updatedAt: afterCutoff,
        }],
      },
      medical: {
        medicalClaim: [{
          id: ids.medical, employeeId: ids.employee, benefitPolicyId: ids.benefitPolicy, approvalInstanceId: ids.medicalApproval,
          claimDate: afterCutoff, sicknessDate: afterCutoff, amount: "1250.50", description: "ค่ารักษาทดสอบ",
          status: "APPROVED", submittedAt: afterCutoff,
        }],
      },
    },
  };
}

function worksheetText(worksheet) {
  const values = [];
  worksheet.eachRow((row) => {
    row.eachCell((cell) => values.push(String(cell.value ?? "")));
  });
  return values.join("\n");
}

describe("post-cutover HR workbook", () => {
  it("derives the HR workbook path beside a JSON export", () => {
    expect(hrWorkbookPathForJson("D:/secure/post-cutover.json")).toBe(path.join(path.resolve("D:/secure"), "post-cutover.hr.xlsx"));
    expect(() => hrWorkbookPathForJson("D:/secure/post-cutover.txt")).toThrow(/end in .json/);
  });

  it("builds five Thai business sheets with GAS IDs, names, Buddhist dates, approvals, and no UUIDs", async () => {
    const report = await collectPostCutoverHrWorkbookRows({
      prisma: syntheticPrisma(),
      exportData: syntheticExportData(),
      marker: { schemaVersion: 1, cutoverAt: cutoff.toISOString(), runId: "12345678-1234-4234-8234-123456789abc" },
    });
    const buffer = await buildPostCutoverHrWorkbookBuffer(report);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(buffer));

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["สรุป", "การลา", "OT", "ลงเวลา", "แก้ไขเวลา", "ค่ารักษา"]);
    const reportText = workbook.worksheets.map(worksheetText).join("\n");
    for (const uuid of Object.values(ids)) expect(reportText).not.toContain(uuid);
    expect(reportText).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

    const leaveText = worksheetText(workbook.getWorksheet("การลา"));
    expect(leaveText).toContain("USER-007");
    expect(leaveText).toContain("พนักงานทดสอบ");
    expect(leaveText).toContain("LEV-0101");
    expect(leaveText).toContain("ลาป่วย");
    expect(leaveText).toContain("03/01/2569");
    expect(leaveText).toContain("ผู้อนุมัติ USER-002 ผู้อนุมัติทดสอบ");
    expect(leaveText).toContain("ผล APPROVED");
    expect(leaveText).toContain("03/01/2569 10:30");
    expect(leaveText).toContain("สร้างใหม่หลัง cutover");

    const overtimeText = worksheetText(workbook.getWorksheet("OT"));
    expect(overtimeText).toContain("OT-0201");
    expect(overtimeText).toContain("ประเภทคำขอ");
    expect(overtimeText).toContain("OT");
    expect(overtimeText).toContain("1.5");
    expect(overtimeText).toContain("แก้ไขหลัง cutover");
    const attendanceText = worksheetText(workbook.getWorksheet("ลงเวลา"));
    expect(attendanceText).toContain("LOG-0101");
    expect(attendanceText).toContain("ลงเวลาเข้า-ออก");
    expect(attendanceText).toContain("7.5");
    const correctionText = worksheetText(workbook.getWorksheet("แก้ไขเวลา"));
    expect(correctionText).toContain("TC-0101");
    expect(correctionText).toContain("แก้ไขเวลาเข้า");
    expect(correctionText).toContain("เวลาเข้าที่ขอแก้");
    const medicalText = worksheetText(workbook.getWorksheet("ค่ารักษา"));
    expect(medicalText).toContain("MED-0101");
    expect(medicalText).toContain("ค่ารักษาพยาบาล");
    expect(medicalText).toContain("1250.5");

    expect(report.summaries).toEqual([
      { moduleName: "การลา", rowCount: 1, created: 1, updated: 0 },
      { moduleName: "OT", rowCount: 1, created: 0, updated: 1 },
      { moduleName: "ลงเวลา", rowCount: 1, created: 1, updated: 0 },
      { moduleName: "แก้ไขเวลา", rowCount: 1, created: 0, updated: 1 },
      { moduleName: "ค่ารักษา", rowCount: 1, created: 1, updated: 0 },
    ]);
  });
});
