import { NextResponse, type NextRequest } from "next/server";

const employeeNavigation = {
  leave: true, requestStatus: true, approvals: false, leaveApprovals: false,
  leaveWithdraw: false, overtimeWithdraw: false, medicalWithdraw: false,
  timeCorrectionWithdraw: false, delegation: false, timeCorrectionApprovals: false,
  overtimeApprovals: false, medicalApprovals: false, attendance: true, overtime: true,
  medical: true, benefits: true, announcements: true, calendar: true, reports: false,
  notifications: true, profile: true, onboarding: false, announcementAdmin: false,
  announcementDeleteAdmin: false, managementAdmin: false, usersAdmin: false,
  organizationAdmin: false, entitlementAdmin: false, workCalendarAdmin: false,
  usersAdminWrite: false, organizationAdminWrite: false, entitlementAdminWrite: false,
  workCalendarAdminWrite: false, rbacAdmin: false, rbacAdminWrite: false,
  passwordRecoveryAdmin: false, adminSettings: false, admin: false,
};
const managerNavigation = {
  ...employeeNavigation, approvals: true, leaveApprovals: true,
  timeCorrectionApprovals: true, overtimeApprovals: true, medicalApprovals: true,
  reports: true, managementAdmin: true,
};
const demoRequests = [
  { id: "DEMO-REQ-001", requestNo: "DEMO-LEV-001", kind: "LEAVE", status: "PENDING", submittedAt: "2026-10-26T02:30:00.000Z", summary: "ลาพักร้อน · 2 วัน", decisionReason: null, employeeId: "DEMO-EMP-001", canDecide: false, approvalStepId: null, stepOrder: 1 },
  { id: "DEMO-REQ-002", requestNo: "DEMO-MED-001", kind: "MEDICAL", status: "REVISION_REQUESTED", submittedAt: "2026-10-25T03:00:00.000Z", summary: "เบิกค่ารักษาพยาบาล", decisionReason: "ข้อมูลตัวอย่างสำหรับตรวจหน้าจอ", employeeId: "DEMO-EMP-001", canDecide: false, approvalStepId: null, stepOrder: 1 },
  { id: "DEMO-REQ-003", requestNo: "DEMO-OT-001", kind: "OVERTIME", status: "APPROVED", submittedAt: "2026-10-20T04:00:00.000Z", summary: "คำขอทำงานล่วงเวลา", decisionReason: null, employeeId: "DEMO-EMP-001", canDecide: false, approvalStepId: null, stepOrder: null },
];

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const key = path.join("/");
  const isManager = request.cookies.get("ckace-preview-role")?.value === "manager";
  const employeeId = isManager ? "DEMO-MGR-001" : "DEMO-EMP-001";
  const common = { "Cache-Control": "no-store" };
  let data: unknown;

  switch (key) {
    case "security/session":
      data = { authenticated: true, employeeId, roleCount: 1, permissionCount: isManager ? 24 : 12, navigation: isManager ? managerNavigation : employeeNavigation };
      break;
    case "profile/me":
      data = { employeeId, fullName: isManager ? "หัวหน้าตัวอย่าง" : "พนักงานตัวอย่าง", nickname: isManager ? "หัวหน้าทดลอง" : "ตัวอย่าง", dateOfBirth: null, employmentStart: "2022-04-01", resignationDate: null, accountState: "ACTIVE", loginName: isManager ? "demo.manager" : "demo.employee", agency: { id: "DEMO-TEAM-01", name: "ทีมตัวอย่าง" }, department: null, roles: [isManager ? "SUPERUSER" : "USER"], lineLinked: false, media: { profile: null, signature: null } };
      break;
    case "inbox/me":
      data = { unread: 0, items: [] };
      break;
    case "requests/assigned":
      data = { requests: [] };
      break;
    case "leave/me":
      data = {
        entitlements: [
          { entitlementId: "DEMO-ENT-001", leaveTypeId: "DEMO-LT-001", leaveTypeKey: "VACATION", leaveTypeName: "ลาพักร้อน", quota: 8, used: 2, pending: 1, remaining: 5 },
          { entitlementId: "DEMO-ENT-002", leaveTypeId: "DEMO-LT-002", leaveTypeKey: "SICK", leaveTypeName: "ลาป่วย", quota: 30, used: 2, pending: 0, remaining: 28 },
          { entitlementId: "DEMO-ENT-003", leaveTypeId: "DEMO-LT-003", leaveTypeKey: "PERSONAL", leaveTypeName: "ลากิจ", quota: 6, used: 1, pending: 1, remaining: 4 },
        ], requests: [], holidays: ["2026-10-23", "2026-11-02"], workingWeekdays: [1, 2, 3, 4, 5],
      };
      break;
    case "medical/me":
      data = { entitlement: { annualLimit: 10000, approved: 1800, committed: 2500, remaining: 7500 }, perClaimLimit: 1000, claims: [] };
      break;
    case "requests/me":
      data = { requests: demoRequests.map((item) => ({ ...item, employeeId })) };
      break;
    case "management/calendar": {
      const from = request.nextUrl.searchParams.get("from") ?? "2026-10-26";
      const to = request.nextUrl.searchParams.get("to") ?? "2026-11-01";
      const start = new Date(`${from}T00:00:00.000Z`);
      const synthetic = [0, 1, 2, 4].map((offset, index) => {
        const date = new Date(start.getTime() + offset * 86400000).toISOString().slice(0, 10);
        return { id: `DEMO-CAL-00${index + 1}`, employeeId: `DEMO-EMP-00${index + 2}`, employeeName: `พนักงานตัวอย่าง ${index + 1}`, leaveType: index % 2 === 0 ? "ลาพักร้อน" : "ลากิจ", startDate: date, endDate: date, durationCode: "FULL_DAY", status: index === 1 ? "PENDING" : "APPROVED", currentApprovalStep: null };
      }).filter((item) => item.startDate <= to);
      data = { from, to, items: synthetic };
      break;
    }
    case "announcements":
      data = { dataStatus: "AVAILABLE", announcements: [{ id: "DEMO-ANN-001", title: "ประกาศตัวอย่าง", content: "ข้อความสังเคราะห์สำหรับตรวจการจัดวางหน้า Dashboard เท่านั้น", scope: "GLOBAL", publishedAt: "2026-10-26", hasAttachment: false, attachmentIds: [] }] };
      break;
    default:
      return NextResponse.json({ error: "Synthetic preview endpoint not implemented" }, { status: 404, headers: common });
  }
  return NextResponse.json(data, { headers: common });
}
