import path from "node:path";

import {
  APPROVAL_STEP_STATUS_LABELS,
  LEAVE_DURATION_LABELS,
  LEAVE_REQUEST_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
  leaveTypeDisplayLabel,
} from "@ckace/contracts";
import ExcelJS from "exceljs";

export const HR_WORKBOOK_LOOKUP_SOURCES = Object.freeze([
  { delegate: "employee", fields: ["id", "fullName"], orderBy: [{ id: "asc" }] },
  { delegate: "legacyRecord", fields: ["id", "sourceSystem", "sourceTab", "targetEntityType", "targetEntityId", "legacyId"], orderBy: [{ id: "asc" }] },
  { delegate: "leaveType", fields: ["id", "key", "name"], orderBy: [{ id: "asc" }] },
  { delegate: "benefitPolicy", fields: ["id", "key", "name"], orderBy: [{ id: "asc" }] },
  { delegate: "approvalStep", fields: ["id", "approvalInstanceId", "stepOrder", "approverEmployeeId", "coApproverEmployeeIds", "decidedByEmployeeId", "status", "assignedAt", "decidedAt"], orderBy: [{ id: "asc" }] },
  { delegate: "overtimeSegment", fields: ["id", "overtimeRequestId", "workDate", "startTime", "endTime", "requestedMinutes"], orderBy: [{ id: "asc" }] },
  { delegate: "attendanceCalculation", fields: ["id", "attendanceRecordId", "workMinutes"], orderBy: [{ id: "asc" }] },
]);

const HR_SHEETS = Object.freeze([
  {
    key: "leave",
    name: "การลา",
    entityType: "leave_request",
    source: "leaveRequest",
    employeeField: "requesterEmployeeId",
    createdField: "submittedAt",
    headers: [
      ["employeeCode", "รหัสพนักงานเดิม"], ["employeeName", "ชื่อพนักงาน"], ["legacyRequestId", "เลขคำขอเดิม (GAS)"],
      ["leaveType", "ประเภทการลา"], ["startDate", "วันที่เริ่ม"], ["endDate", "วันที่สิ้นสุด"],
      ["timeRange", "ช่วงเวลา"], ["duration", "จำนวน/รูปแบบการลา"], ["status", "สถานะ"],
      ["approvals", "ผู้อนุมัติแต่ละขั้น (ผล/เวลา)"], ["description", "รายละเอียด/เหตุผล"], ["changeNote", "หมายเหตุหลัง cutover"],
    ],
  },
  {
    key: "overtime",
    name: "OT",
    entityType: "overtime_request_bundle",
    source: "overtimeRequest",
    employeeField: "employeeId",
    createdField: "submittedAt",
    headers: [
      ["employeeCode", "รหัสพนักงานเดิม"], ["employeeName", "ชื่อพนักงาน"], ["legacyRequestId", "เลขคำขอเดิม (GAS)"],
      ["requestType", "ประเภทคำขอ"], ["segments", "วันที่/ช่วงเวลา OT"], ["hours", "จำนวนชั่วโมง"], ["status", "สถานะ"],
      ["approvals", "ผู้อนุมัติแต่ละขั้น (ผล/เวลา)"], ["reason", "เหตุผล"], ["changeNote", "หมายเหตุหลัง cutover"],
    ],
  },
  {
    key: "attendance",
    name: "ลงเวลา",
    entityType: "attendance_record_bundle",
    source: "attendanceRecord",
    employeeField: "employeeId",
    createdField: "createdAt",
    headers: [
      ["employeeCode", "รหัสพนักงานเดิม"], ["employeeName", "ชื่อพนักงาน"], ["legacyRequestId", "รหัสลงเวลาเดิม (GAS)"],
      ["recordType", "ประเภทบันทึก"], ["workDate", "วันที่ลงเวลา"], ["checkIn", "เวลาเข้างาน"], ["checkOut", "เวลาออกงาน"],
      ["hours", "ชั่วโมงทำงานตามระบบใหม่"], ["status", "สถานะ"], ["changeNote", "หมายเหตุหลัง cutover"],
    ],
  },
  {
    key: "timeCorrection",
    name: "แก้ไขเวลา",
    entityType: "time_correction_request",
    source: "timeCorrectionRequest",
    employeeField: "employeeId",
    createdField: "requestedAt",
    headers: [
      ["employeeCode", "รหัสพนักงานเดิม"], ["employeeName", "ชื่อพนักงาน"], ["legacyRequestId", "เลขคำขอเดิม (GAS)"],
      ["correctionType", "ประเภทการแก้ไข"], ["attendanceDate", "วันที่ต้องการแก้"], ["originalCheckIn", "เวลาเข้าเดิม"], ["originalCheckOut", "เวลาออกเดิม"],
      ["correctedCheckIn", "เวลาเข้าที่ขอแก้"], ["correctedCheckOut", "เวลาออกที่ขอแก้"], ["status", "สถานะ"],
      ["approvals", "ผู้อนุมัติแต่ละขั้น (ผล/เวลา)"], ["reason", "เหตุผล"], ["changeNote", "หมายเหตุหลัง cutover"],
    ],
  },
  {
    key: "medical",
    name: "ค่ารักษา",
    entityType: "medical_claim",
    source: "medicalClaim",
    employeeField: "employeeId",
    createdField: "submittedAt",
    headers: [
      ["employeeCode", "รหัสพนักงานเดิม"], ["employeeName", "ชื่อพนักงาน"], ["legacyRequestId", "เลขคำขอเดิม (GAS)"],
      ["claimType", "ประเภทค่ารักษา"], ["claimDate", "วันที่ยื่นเบิก"], ["sicknessDate", "วันที่รักษา"], ["amount", "ยอดเงิน (บาท)"],
      ["status", "สถานะ"], ["approvals", "ผู้อนุมัติแต่ละขั้น (ผล/เวลา)"], ["description", "รายละเอียดการเบิก"],
      ["changeNote", "หมายเหตุหลัง cutover"],
    ],
  },
]);

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const BANGKOK_DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function safeCellText(value) {
  return String(value ?? "").replace(UUID_PATTERN, "[ซ่อนรหัสภายใน]");
}

function dateValue(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function formatDateBE(value) {
  const date = dateValue(value);
  if (!date) return "";
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear() + 543;
  return `${day}/${month}/${year}`;
}

function formatDateTimeBE(value) {
  const date = dateValue(value);
  if (!date) return "";
  const parts = Object.fromEntries(BANGKOK_DATE_TIME.formatToParts(date).map(({ type, value: part }) => [type, part]));
  return `${parts.day}/${parts.month}/${Number(parts.year) + 543} ${parts.hour}:${parts.minute}`;
}

function formatClock(value) {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date) {
    return `${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}`;
  }
  const match = String(value).match(/(?:T|^)(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "";
}

function rowsFor(exportData, module, delegate) {
  return exportData.modules?.[module]?.[delegate] ?? [];
}

function collectUnique(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.length > 0))].sort();
}

function groupBy(rows, key) {
  const grouped = new Map();
  for (const row of rows) {
    const groupKey = row[key];
    if (typeof groupKey !== "string") continue;
    const current = grouped.get(groupKey) ?? [];
    current.push(row);
    grouped.set(groupKey, current);
  }
  return grouped;
}

function requireDelegate(prisma, delegateName) {
  const delegate = prisma[delegateName];
  if (!delegate || typeof delegate.findMany !== "function") {
    throw new Error(`Prisma delegate ${delegateName} is unavailable; HR workbook export stopped.`);
  }
  return delegate;
}

async function findByIds(prisma, descriptor, ids, idField = "id") {
  if (ids.length === 0) return [];
  const selection = Object.fromEntries(descriptor.fields.map((field) => [field, true]));
  return requireDelegate(prisma, descriptor.delegate).findMany({
    where: { [idField]: { in: ids } },
    select: selection,
    orderBy: descriptor.orderBy,
  });
}

function makeIdMap(rows, idField = "id") {
  return new Map(rows.map((row) => [row[idField], row]));
}

function employeeDetails(employeeId, employeeById, legacyUserByEmployeeId) {
  const employee = employeeById.get(employeeId);
  return {
    employeeCode: safeCellText(legacyUserByEmployeeId.get(employeeId) ?? ""),
    employeeName: safeCellText(employee?.fullName ?? ""),
  };
}

function summarizeApprovals(instanceId, stepsByInstance, employeeById, legacyUserByEmployeeId) {
  if (!instanceId) return "ไม่มีข้อมูลขั้นอนุมัติ";
  const steps = [...(stepsByInstance.get(instanceId) ?? [])].sort((left, right) => left.stepOrder - right.stepOrder);
  if (steps.length === 0) return "ไม่มีข้อมูลขั้นอนุมัติ";

  return steps.map((step) => {
    const approverIds = collectUnique([
      step.approverEmployeeId,
      ...(Array.isArray(step.coApproverEmployeeIds) ? step.coApproverEmployeeIds : []),
    ]);
    const approverNames = approverIds.map((id) => {
      const person = employeeDetails(id, employeeById, legacyUserByEmployeeId);
      return [person.employeeCode, person.employeeName].filter(Boolean).join(" ") || "ไม่พบผู้อนุมัติ";
    });
    const decidedBy = typeof step.decidedByEmployeeId === "string"
      ? employeeDetails(step.decidedByEmployeeId, employeeById, legacyUserByEmployeeId)
      : null;
    const decidedByName = decidedBy
      ? [decidedBy.employeeCode, decidedBy.employeeName].filter(Boolean).join(" ")
      : "";
    const decisionTime = step.decidedAt ? formatDateTimeBE(step.decidedAt) : "ยังไม่ตัดสินใจ";
    const decidedByText = decidedByName && !approverNames.includes(decidedByName)
      ? `; ผู้ตัดสินจริง: ${decidedByName}`
      : "";
    const stepStatusLabel = APPROVAL_STEP_STATUS_LABELS[step.status] ?? safeCellText(step.status);
    return `ขั้น ${step.stepOrder}: ผู้อนุมัติ ${approverNames.join(" / ") || "ไม่ระบุ"}; ผล ${stepStatusLabel}; เวลา ${decisionTime}${decidedByText}`;
  }).join("\n");
}

function dateTimeAtOrAfter(value, cutoff) {
  const date = dateValue(value);
  return date !== null && date.getTime() >= cutoff.getTime();
}

function cutoverNote(row, createdField, cutoff) {
  return dateTimeAtOrAfter(row[createdField], cutoff)
    ? "สร้างใหม่หลัง cutover"
    : "แก้ไขหลัง cutover";
}

function requestLegacyId(mappingByTargetAndType, targetId, targetEntityType) {
  return safeCellText(mappingByTargetAndType.get(`${targetEntityType}:${targetId}`)?.legacyId ?? "");
}

function requestStatusLabel(moduleKey, status) {
  const labels = moduleKey === "leave" ? LEAVE_REQUEST_STATUS_LABELS : REQUEST_STATUS_LABELS;
  return labels[status] ?? safeCellText(status);
}

function numberValue(value) {
  if (value === null || value === undefined || value === "") return "";
  const parsed = Number(typeof value === "object" && typeof value.toString === "function" ? value.toString() : value);
  return Number.isFinite(parsed) ? parsed : "";
}

function roundHours(minutes) {
  if (!Number.isFinite(Number(minutes))) return "";
  return Math.round((Number(minutes) / 60) * 100) / 100;
}

function correctionType(row) {
  const changed = [];
  if (formatClock(row.correctedCheckIn) && formatClock(row.correctedCheckIn) !== formatClock(row.originalCheckIn)) changed.push("เวลาเข้า");
  if (formatClock(row.correctedCheckOut) && formatClock(row.correctedCheckOut) !== formatClock(row.originalCheckOut)) changed.push("เวลาออก");
  return changed.length > 0 ? `แก้ไข${changed.join("และ")}` : "ตรวจสอบคำขอแก้ไขเวลา";
}

export async function collectPostCutoverHrWorkbookRows({ prisma, exportData, marker }) {
  const cutoff = dateValue(marker?.cutoverAt);
  if (!cutoff) throw new Error("HR workbook requires a valid cutover marker timestamp.");

  const recordsBySheet = new Map(HR_SHEETS.map((sheet) => [
    sheet.key,
    rowsFor(exportData, sheet.key === "timeCorrection" ? "attendance" : sheet.key, sheet.source),
  ]));
  const attendanceRows = rowsFor(exportData, "attendance", "attendanceRecord");
  const requestRows = [...recordsBySheet.values()].flat();
  const approvalInstanceIds = collectUnique(requestRows.map((row) => row.approvalInstanceId));
  const overtimeRequestIds = collectUnique(recordsBySheet.get("overtime").map((row) => row.id));
  const attendanceRecordIds = collectUnique(attendanceRows.map((row) => row.id));
  const leaveTypeIds = collectUnique(recordsBySheet.get("leave").map((row) => row.leaveTypeId));

  const approvalStepSource = HR_WORKBOOK_LOOKUP_SOURCES.find(({ delegate }) => delegate === "approvalStep");
  const approvalSteps = await findByIds(prisma, approvalStepSource, approvalInstanceIds, "approvalInstanceId");
  const overtimeSegmentsSource = HR_WORKBOOK_LOOKUP_SOURCES.find(({ delegate }) => delegate === "overtimeSegment");
  const overtimeSegments = await findByIds(prisma, overtimeSegmentsSource, overtimeRequestIds, "overtimeRequestId");
  const attendanceCalculationSource = HR_WORKBOOK_LOOKUP_SOURCES.find(({ delegate }) => delegate === "attendanceCalculation");
  const attendanceCalculations = await findByIds(prisma, attendanceCalculationSource, attendanceRecordIds, "attendanceRecordId");
  const leaveTypeSource = HR_WORKBOOK_LOOKUP_SOURCES.find(({ delegate }) => delegate === "leaveType");
  const leaveTypes = await findByIds(prisma, leaveTypeSource, leaveTypeIds);
  const benefitPolicyIds = collectUnique(recordsBySheet.get("medical").map((row) => row.benefitPolicyId));
  const benefitPolicySource = HR_WORKBOOK_LOOKUP_SOURCES.find(({ delegate }) => delegate === "benefitPolicy");
  const benefitPolicies = await findByIds(prisma, benefitPolicySource, benefitPolicyIds);

  const employeeIds = collectUnique([
    ...requestRows.map((row) => row.requesterEmployeeId ?? row.employeeId),
    ...approvalSteps.flatMap((step) => [
      step.approverEmployeeId,
      step.decidedByEmployeeId,
      ...(Array.isArray(step.coApproverEmployeeIds) ? step.coApproverEmployeeIds : []),
    ]),
  ]);
  const targetIds = collectUnique([
    ...employeeIds,
    ...requestRows.map((row) => row.id),
    ...attendanceRows.map((row) => row.id),
  ]);

  const employeeSource = HR_WORKBOOK_LOOKUP_SOURCES.find(({ delegate }) => delegate === "employee");
  const employees = await findByIds(prisma, employeeSource, employeeIds);
  const legacySource = HR_WORKBOOK_LOOKUP_SOURCES.find(({ delegate }) => delegate === "legacyRecord");
  const legacySelection = Object.fromEntries(legacySource.fields.map((field) => [field, true]));
  const legacyRecords = targetIds.length === 0
    ? []
    : await requireDelegate(prisma, "legacyRecord").findMany({
        where: { sourceSystem: "APP_LEAVE_GAS", targetEntityId: { in: targetIds } },
        select: legacySelection,
        orderBy: legacySource.orderBy,
      });

  const employeeById = makeIdMap(employees);
  const legacyUserByEmployeeId = new Map();
  const mappingByTargetAndType = new Map();
  for (const record of legacyRecords) {
    if (!record.targetEntityId || !record.legacyId) continue;
    if (record.sourceTab === "Users" && !legacyUserByEmployeeId.has(record.targetEntityId)) {
      legacyUserByEmployeeId.set(record.targetEntityId, record.legacyId);
    }
    if (record.targetEntityType) {
      const key = `${record.targetEntityType}:${record.targetEntityId}`;
      if (!mappingByTargetAndType.has(key)) mappingByTargetAndType.set(key, record);
    }
  }

  const stepsByInstance = groupBy(approvalSteps, "approvalInstanceId");
  const segmentsByRequest = groupBy(overtimeSegments, "overtimeRequestId");
  const calculationByAttendance = makeIdMap(attendanceCalculations, "attendanceRecordId");
  const leaveTypeById = makeIdMap(leaveTypes);
  const benefitPolicyById = makeIdMap(benefitPolicies);

  const rowsBySheet = {};
  for (const sheet of HR_SHEETS) {
    const rows = recordsBySheet.get(sheet.key);
    rowsBySheet[sheet.key] = rows.map((row) => {
      const employeeId = row[sheet.employeeField] ?? row.requesterEmployeeId;
      const employee = employeeDetails(employeeId, employeeById, legacyUserByEmployeeId);
      const base = {
        ...employee,
        legacyRequestId: requestLegacyId(mappingByTargetAndType, row.id, sheet.entityType),
        status: safeCellText(requestStatusLabel(sheet.key, row.status)),
        approvals: summarizeApprovals(row.approvalInstanceId, stepsByInstance, employeeById, legacyUserByEmployeeId),
        changeNote: cutoverNote(row, sheet.createdField, cutoff),
      };

      if (sheet.key === "leave") {
        const leaveType = leaveTypeById.get(row.leaveTypeId);
        return {
          ...base,
          leaveType: safeCellText(leaveTypeDisplayLabel(leaveType?.key ?? "", leaveType?.name ?? "")),
          startDate: formatDateBE(row.startDate),
          endDate: formatDateBE(row.endDate),
          timeRange: [formatClock(row.startTime), formatClock(row.endTime)].filter(Boolean).join("–"),
          duration: safeCellText(LEAVE_DURATION_LABELS[row.durationCode] ?? row.durationCode),
          description: safeCellText(row.description),
        };
      }
      if (sheet.key === "overtime") {
        const segments = (segmentsByRequest.get(row.id) ?? []).map((segment) => {
          const date = formatDateBE(segment.workDate);
          const range = [formatClock(segment.startTime), formatClock(segment.endTime)].filter(Boolean).join("–");
          const hours = roundHours(segment.requestedMinutes);
          return `${date}${range ? ` ${range}` : ""}${hours !== "" ? ` (${hours} ชม.)` : ""}`;
        });
        const totalMinutes = (segmentsByRequest.get(row.id) ?? []).reduce((total, segment) => total + Number(segment.requestedMinutes ?? 0), 0);
        return {
          ...base,
          requestType: "OT",
          segments: segments.join("\n"),
          hours: roundHours(totalMinutes),
          reason: safeCellText(row.reason),
        };
      }
      if (sheet.key === "attendance") {
        const calculation = calculationByAttendance.get(row.id);
        const status = row.checkInAt && row.checkOutAt ? "บันทึกเวลาเข้า-ออกครบ" : "ข้อมูลเวลาเข้า/ออกไม่ครบ";
        return {
          ...base,
          recordType: "ลงเวลาเข้า-ออก",
          legacyRequestId: requestLegacyId(mappingByTargetAndType, row.id, sheet.entityType),
          workDate: formatDateBE(row.workDate),
          checkIn: formatDateTimeBE(row.checkInAt),
          checkOut: formatDateTimeBE(row.checkOutAt),
          hours: calculation ? roundHours(calculation.workMinutes) : "",
          status,
        };
      }
      if (sheet.key === "timeCorrection") {
        return {
          ...base,
          correctionType: correctionType(row),
          attendanceDate: formatDateBE(row.attendanceDate),
          originalCheckIn: formatClock(row.originalCheckIn),
          originalCheckOut: formatClock(row.originalCheckOut),
          correctedCheckIn: formatClock(row.correctedCheckIn),
          correctedCheckOut: formatClock(row.correctedCheckOut),
          reason: safeCellText(row.reason),
        };
      }
      return {
        ...base,
        claimType: safeCellText(benefitPolicyById.get(row.benefitPolicyId)?.name ?? benefitPolicyById.get(row.benefitPolicyId)?.key ?? "ค่ารักษาพยาบาล"),
        claimDate: formatDateBE(row.claimDate),
        sicknessDate: formatDateBE(row.sicknessDate),
        amount: numberValue(row.amount),
        description: safeCellText(row.description),
      };
    });
  }

  return {
    generatedAt: exportData.generatedAt,
    cutoverAt: exportData.cutoverAt,
    summaries: HR_SHEETS.map((sheet) => {
      const rows = rowsBySheet[sheet.key];
      const created = rows.filter((row) => row.changeNote === "สร้างใหม่หลัง cutover").length;
      return {
        moduleName: sheet.name,
        rowCount: rows.length,
        created,
        updated: rows.length - created,
      };
    }),
    sheets: HR_SHEETS.map((sheet) => ({
      name: sheet.name,
      columns: sheet.headers.map(([key, header]) => ({ key, header })),
      rows: rowsBySheet[sheet.key],
    })),
  };
}

export function hrWorkbookPathForJson(jsonPath) {
  const parsed = path.parse(path.resolve(jsonPath));
  if (parsed.ext.toLowerCase() !== ".json") {
    throw new Error("The JSON export path must end in .json so its HR workbook path is unambiguous.");
  }
  return path.join(parsed.dir, `${parsed.name}.hr.xlsx`);
}

export async function buildPostCutoverHrWorkbookBuffer(report) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CKACE HR";
  workbook.subject = "รายการหลัง cutover สำหรับ HR ตรวจและคีย์กลับ GAS";
  workbook.title = "รายงานรายการหลัง cutover สำหรับ HR";
  workbook.created = dateValue(report.generatedAt) ?? new Date(0);
  workbook.modified = workbook.created;

  const summary = workbook.addWorksheet("สรุป", { views: [{ state: "frozen", ySplit: 1 }] });
  summary.columns = [
    { header: "ระบบงาน", key: "moduleName", width: 20 },
    { header: "จำนวนรายการ", key: "rowCount", width: 16 },
    { header: "สร้างใหม่หลัง cutover", key: "created", width: 22 },
    { header: "แก้ไขหลัง cutover", key: "updated", width: 20 },
  ];
  summary.addRows(report.summaries);

  for (const sheet of report.sheets) {
    const worksheet = workbook.addWorksheet(sheet.name, { views: [{ state: "frozen", ySplit: 1 }] });
    worksheet.columns = sheet.columns.map(({ key, header }) => ({ header, key, width: /อนุมัติ|รายละเอียด|เหตุผล|ช่วงเวลา/.test(header) ? 44 : /ชื่อ|ประเภท/.test(header) ? 22 : 18 }));
    worksheet.addRows(sheet.rows);
    for (const [columnIndex, { key }] of sheet.columns.entries()) {
      if (key === "amount") worksheet.getColumn(columnIndex + 1).numFmt = "#,##0.00";
    }
    const lastColumn = worksheet.getColumn(worksheet.columnCount).letter;
    worksheet.autoFilter = { from: "A1", to: `${lastColumn}1` };
    worksheet.getColumn(1).alignment = { vertical: "top" };
    for (let index = 1; index <= worksheet.columnCount; index += 1) {
      worksheet.getColumn(index).alignment = { vertical: "top", wrapText: true };
    }
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF315B7D" } };
    worksheet.getRow(1).height = 32;
  }
  summary.autoFilter = { from: "A1", to: "D1" };
  summary.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  summary.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF315B7D" } };
  return workbook.xlsx.writeBuffer();
}
