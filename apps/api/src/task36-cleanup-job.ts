import {
  disconnectPrismaClient,
  getPrismaClient,
} from "@ckace/database";

const EMPLOYEE_IDS = [
  "29000000-0000-4000-9000-000000000001",
  "29000000-0000-4000-9000-000000000002",
  "29000000-0000-4000-9000-000000000003",
  "29000000-0000-4000-9000-000000000004",
] as const;
const ACCOUNT_IDS = [
  "29000000-0000-4000-a000-000000000001",
  "29000000-0000-4000-a000-000000000002",
  "29000000-0000-4000-a000-000000000003",
  "29000000-0000-4000-a000-000000000004",
] as const;
const ROLE_IDS = [
  "29000000-0000-4000-8000-000000000001",
  "29000000-0000-4000-8000-000000000002",
  "29000000-0000-4000-8000-000000000003",
  "29000000-0000-4000-8000-000000000004",
] as const;
const PERMISSION_IDS = Array.from(
  { length: 24 },
  (_, index) =>
    `29000000-0000-4000-${String(8100 + index).padStart(4, "0")}-000000000001`,
);
const AGENCY_ID = "31000000-0000-4000-8000-000000000001";
const DEPARTMENT_ID = "31000000-0000-4000-8000-000000000002";
const ONBOARDING_EMPLOYEE_ID =
  "31000000-0000-4000-8800-000000000001";
const ONBOARDING_ACCOUNT_ID =
  "31000000-0000-4000-8801-000000000001";

const LEAVE_TYPE_IDS = [
  "31000000-0000-4000-8100-000000000001",
  "31000000-0000-4000-8101-000000000001",
  "31000000-0000-4000-8102-000000000001",
] as const;
const ENTITLEMENT_IDS = [
  "31000000-0000-4000-8200-000000000001",
  "31000000-0000-4000-8201-000000000001",
  "31000000-0000-4000-8202-000000000001",
  "e128fe56-1702-4ed7-8981-e735742d320c",
  "acb7ae1d-b27f-490a-8c51-d7bfe84068cf",
  "06b565fa-e134-4ae4-a47e-e075afc58cf0",
] as const;
const APPROVAL_POLICY_IDS = [
  "31000000-0000-4000-8300-000000000001",
  "31000000-0000-4000-8310-000000000001",
  "32000000-0000-4000-8300-000000000001",
] as const;
const APPROVAL_POLICY_STEP_IDS = [
  "31000000-0000-4000-8301-000000000001",
  "31000000-0000-4000-8311-000000000001",
  "32000000-0000-4000-8301-000000000001",
] as const;
const ATTENDANCE_POLICY_ID =
  "31000000-0000-4000-8400-000000000001";
const BENEFIT_POLICY_ID =
  "31000000-0000-4000-8500-000000000001";
const WEEKLY_RULE_IDS = Array.from(
  { length: 7 },
  (_, index) =>
    `31000000-0000-4000-${String(8601 + index).padStart(4, "0")}-000000000001`,
);
const FIXED_NOTIFICATION_ID =
  "31000000-0000-4000-8700-000000000001";

const LEAVE_REQUEST_IDS = [
  "cbecdbcf-807c-42db-9f2d-dfc4afd2a805",
  "923002a8-d9e8-4c97-b669-70175a899d37",
] as const;
const ATTENDANCE_RECORD_ID =
  "3e6ea093-95c4-4e86-afdf-f6d77e101c7a";
const ATTENDANCE_CALCULATION_ID =
  "9c5464b9-fe2f-4f3a-b700-24fc8c8b2d6e";
const TIME_CORRECTION_IDS = [
  "1af82763-d85b-4a69-a268-da6f71421f2f",
  "d85fdb23-f0b6-4db6-8f5d-c99da91f44b9",
] as const;
const OT_REQUEST_IDS = [
  "32932c82-e8e9-58c6-a570-9b8a924aa9bd",
  "1972e33c-4e54-5543-af7b-726901be8815",
] as const;
const OT_SEGMENT_IDS = [
  "2398d5d4-07fe-4166-b351-1254b9c6fd87",
  "206e330a-b7c3-44b5-9333-6da773b74cc8",
] as const;
const ANNOUNCEMENT_ID =
  "6345b86d-9369-4030-bcc0-f90cec865954";
const MEDICAL_CLAIM_ID =
  "87d40ad6-59b2-42a7-9863-1e7767c4ce67";
const ATTACHMENT_IDS = [
  "d720fb69-7654-48cb-811f-5f3d91c4c328",
  "b77d51eb-6a95-49d8-904c-25a524ae52a5",
  "53cb60e3-a7a6-4a14-9e72-f235b5bf5dd6",
] as const;

const APPROVAL_INSTANCE_IDS = [
  "ae738c1b-f8c7-4bfd-9244-ff0741a92b74",
  "676e39d9-4039-4f22-9ba5-7a5ef2f383ac",
  "bb1ac67a-ee90-41e4-86cd-b8db6f077926",
  "b99e3151-c53a-42a3-a3d8-3c3bd482bf7d",
  "b06ad356-4405-4105-8c87-c3a89617359f",
  "b350b1b7-e4f1-46db-b17a-d1a97b672aa2",
  "1653f10e-5462-47f8-a000-38145d3fecd7",
] as const;
const APPROVAL_STEP_IDS = [
  "b7f971bf-b3d5-425d-8d42-4b55ff40a2a7",
  "c70add51-b957-4928-9af0-b3ce9c9b61f8",
  "123a7724-b963-4f08-b49c-a420a4dcb7e0",
  "01bb2691-b943-4f1f-b842-56bab232a7ca",
  "e661ff55-eb9f-41c6-86b7-1a2ca671ee04",
  "dc57a9d1-fbfd-47a7-a7dd-dcccf54ba683",
  "d40050df-7890-41be-9d25-a98f98322355",
] as const;
const IDEMPOTENCY_IDS = [
  "fdced041-b5dc-4cdc-a40a-3ab462a59913",
  "2e151a6b-1747-4134-808a-b2bf982f49b7",
  "edfb03af-41e4-4a01-99a5-3bf057cf76a0",
  "feffc219-761b-4ba6-b5e9-d124a29ebb15",
  "409fe4e1-e102-4efb-ab9b-1df33f79d57c",
  "ab50e228-338a-4186-94dc-616188856592",
  "d1233843-ea60-43bb-9dc6-10a25ef6eb60",
  "3a933e21-9462-47d0-8458-0c58c4d86fe2",
  "80be6278-eab2-43ff-89a5-e81eec5fc207",
] as const;

const SAFE_AGGREGATE_IDS = new Set<string>([
  ...LEAVE_REQUEST_IDS,
  ATTENDANCE_RECORD_ID,
  ...TIME_CORRECTION_IDS,
  ...OT_REQUEST_IDS,
  MEDICAL_CLAIM_ID,
]);

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`TASK36_MISSING_${name}`);
  return value;
}

function assertIds(
  label: string,
  actual: readonly string[],
  expected: readonly string[],
): void {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new Error(`TASK36_ID_DRIFT_${label}`);
  }
}

function expectCount(
  label: string,
  actual: number,
  expected: number,
): void {
  if (actual !== expected) {
    throw new Error(
      `TASK36_COUNT_DRIFT_${label}_${actual}_${expected}`,
    );
  }
}

async function assertPreflight(): Promise<{
  outboxIds: string[];
  auditIds: string[];
}> {
  if (
    required("CKACE_TASK36_CLEANUP") !== "YES" ||
    required("CKACE_TASK36_R2_CLEANUP_CONFIRMED") !== "YES" ||
    required("CKACE_RUNTIME_STAGE").toLowerCase() !== "test"
  ) {
    throw new Error("TASK36_DB_BOUNDARY_MISMATCH");
  }

  const prisma = getPrismaClient();
  const databaseRows = await prisma.$queryRawUnsafe<
    Array<{ database_name: string }>
  >("SELECT current_database() AS database_name");
  if (databaseRows[0]?.database_name !== "ckace_hr_dev") {
    throw new Error("TASK36_DATABASE_MISMATCH");
  }

  const counts = await Promise.all([
    prisma.employee.count(),
    prisma.userAccount.count(),
    prisma.role.count(),
    prisma.permission.count(),
    prisma.userRole.count(),
    prisma.rolePermission.count(),
    prisma.lineAccount.count(),
    prisma.agency.count(),
    prisma.department.count(),
    prisma.leaveType.count(),
    prisma.leaveTypeAlias.count(),
    prisma.leaveEntitlement.count(),
    prisma.approvalPolicy.count(),
    prisma.approvalPolicyStep.count(),
    prisma.approvalInstance.count(),
    prisma.approvalStep.count(),
    prisma.leaveRequest.count(),
    prisma.attendanceRecord.count(),
    prisma.attendanceCalculation.count(),
    prisma.timeCorrectionRequest.count(),
    prisma.overtimeRequest.count(),
    prisma.overtimeSegment.count(),
    prisma.attendancePolicy.count(),
    prisma.weeklyWorkRule.count(),
    prisma.benefitPolicy.count(),
    prisma.medicalClaim.count(),
    prisma.attachment.count(),
    prisma.medicalClaimAttachment.count(),
    prisma.leaveRequestAttachment.count(),
    prisma.overtimeRequestAttachment.count(),
    prisma.announcementAttachment.count(),
    prisma.employeeMedia.count(),
    prisma.announcement.count(),
    prisma.notificationOutbox.count(),
    prisma.notificationDelivery.count(),
    prisma.auditLog.count(),
    prisma.idempotencyKey.count(),
  ]);

  const expectedCounts = [
    5, 5, 4, 24, 5, 80, 0, 1, 1, 3, 0, 6, 3, 3, 7, 7, 2, 1, 1,
    2, 2, 2, 1, 7, 1, 1, 3, 1, 0, 0, 0, 0, 1, 17, 0, 19, 9,
  ];
  counts.forEach((count, index) =>
    expectCount(`global_${index}`, count, expectedCounts[index] ?? -1),
  );

  const [
    employees,
    accounts,
    roles,
    permissions,
    userRoles,
    rolePermissions,
    leaveTypes,
    entitlements,
    policies,
    policySteps,
    instances,
    steps,
    leaveRequests,
    attendanceRecords,
    attendanceCalcs,
    corrections,
    otRequests,
    otSegments,
    attendancePolicies,
    weeklyRules,
    benefitPolicies,
    medicalClaims,
    attachments,
    announcements,
    idempotency,
    agencies,
    departments,
    outbox,
    audits,
  ] = await Promise.all([
    prisma.employee.findMany({
      select: {
        id: true,
        nickname: true,
        agencyId: true,
        departmentId: true,
      },
    }),
    prisma.userAccount.findMany({ select: { id: true } }),
    prisma.role.findMany({ select: { id: true } }),
    prisma.permission.findMany({ select: { id: true } }),
    prisma.userRole.findMany({
      select: { userAccountId: true, roleId: true },
    }),
    prisma.rolePermission.findMany({
      select: { roleId: true, permissionId: true },
    }),
    prisma.leaveType.findMany({ select: { id: true } }),
    prisma.leaveEntitlement.findMany({ select: { id: true } }),
    prisma.approvalPolicy.findMany({ select: { id: true } }),
    prisma.approvalPolicyStep.findMany({ select: { id: true } }),
    prisma.approvalInstance.findMany({ select: { id: true } }),
    prisma.approvalStep.findMany({ select: { id: true } }),
    prisma.leaveRequest.findMany({ select: { id: true } }),
    prisma.attendanceRecord.findMany({ select: { id: true } }),
    prisma.attendanceCalculation.findMany({ select: { id: true } }),
    prisma.timeCorrectionRequest.findMany({ select: { id: true } }),
    prisma.overtimeRequest.findMany({ select: { id: true } }),
    prisma.overtimeSegment.findMany({ select: { id: true } }),
    prisma.attendancePolicy.findMany({ select: { id: true } }),
    prisma.weeklyWorkRule.findMany({ select: { id: true } }),
    prisma.benefitPolicy.findMany({ select: { id: true } }),
    prisma.medicalClaim.findMany({ select: { id: true } }),
    prisma.attachment.findMany({
      select: {
        id: true,
        ownerEmployeeId: true,
        finalizedAt: true,
        medicalLink: {
          select: {
            attachmentId: true,
            medicalClaimId: true,
          },
        },
        leaveLink: { select: { attachmentId: true } },
        overtimeLink: { select: { attachmentId: true } },
        announcementLink: { select: { attachmentId: true } },
        employeeMedia: { select: { attachmentId: true } },
      },
    }),
    prisma.announcement.findMany({ select: { id: true } }),
    prisma.idempotencyKey.findMany({ select: { id: true } }),
    prisma.agency.findMany({ select: { id: true } }),
    prisma.department.findMany({ select: { id: true } }),
    prisma.notificationOutbox.findMany({
      select: { id: true, aggregateId: true },
    }),
    prisma.auditLog.findMany({
      select: { id: true, actorEmployeeId: true },
    }),
  ]);

  assertIds(
    "employees",
    employees.map((row) => row.id),
    [...EMPLOYEE_IDS, ONBOARDING_EMPLOYEE_ID],
  );
  assertIds(
    "accounts",
    accounts.map((row) => row.id),
    [...ACCOUNT_IDS, ONBOARDING_ACCOUNT_ID],
  );
  assertIds("roles", roles.map((row) => row.id), ROLE_IDS);
  assertIds(
    "permissions",
    permissions.map((row) => row.id),
    PERMISSION_IDS,
  );
  assertIds(
    "leave_types",
    leaveTypes.map((row) => row.id),
    LEAVE_TYPE_IDS,
  );
  assertIds(
    "entitlements",
    entitlements.map((row) => row.id),
    ENTITLEMENT_IDS,
  );
  assertIds(
    "approval_policies",
    policies.map((row) => row.id),
    APPROVAL_POLICY_IDS,
  );
  assertIds(
    "approval_policy_steps",
    policySteps.map((row) => row.id),
    APPROVAL_POLICY_STEP_IDS,
  );
  assertIds(
    "approval_instances",
    instances.map((row) => row.id),
    APPROVAL_INSTANCE_IDS,
  );
  assertIds(
    "approval_steps",
    steps.map((row) => row.id),
    APPROVAL_STEP_IDS,
  );
  assertIds(
    "leave_requests",
    leaveRequests.map((row) => row.id),
    LEAVE_REQUEST_IDS,
  );
  assertIds(
    "attendance_records",
    attendanceRecords.map((row) => row.id),
    [ATTENDANCE_RECORD_ID],
  );
  assertIds(
    "attendance_calculations",
    attendanceCalcs.map((row) => row.id),
    [ATTENDANCE_CALCULATION_ID],
  );
  assertIds(
    "time_corrections",
    corrections.map((row) => row.id),
    TIME_CORRECTION_IDS,
  );
  assertIds(
    "ot_requests",
    otRequests.map((row) => row.id),
    OT_REQUEST_IDS,
  );
  assertIds(
    "ot_segments",
    otSegments.map((row) => row.id),
    OT_SEGMENT_IDS,
  );
  assertIds(
    "attendance_policies",
    attendancePolicies.map((row) => row.id),
    [ATTENDANCE_POLICY_ID],
  );
  assertIds(
    "weekly_rules",
    weeklyRules.map((row) => row.id),
    WEEKLY_RULE_IDS,
  );
  assertIds(
    "benefit_policies",
    benefitPolicies.map((row) => row.id),
    [BENEFIT_POLICY_ID],
  );
  assertIds(
    "medical_claims",
    medicalClaims.map((row) => row.id),
    [MEDICAL_CLAIM_ID],
  );
  assertIds(
    "attachments",
    attachments.map((row) => row.id),
    ATTACHMENT_IDS,
  );
  assertIds(
    "announcements",
    announcements.map((row) => row.id),
    [ANNOUNCEMENT_ID],
  );
  assertIds(
    "idempotency",
    idempotency.map((row) => row.id),
    IDEMPOTENCY_IDS,
  );
  assertIds("agencies", agencies.map((row) => row.id), [AGENCY_ID]);
  assertIds(
    "departments",
    departments.map((row) => row.id),
    [DEPARTMENT_ID],
  );

  const expectedUserRoles = new Set([
    `${ACCOUNT_IDS[0]}|${ROLE_IDS[0]}`,
    `${ACCOUNT_IDS[1]}|${ROLE_IDS[1]}`,
    `${ACCOUNT_IDS[2]}|${ROLE_IDS[2]}`,
    `${ACCOUNT_IDS[3]}|${ROLE_IDS[3]}`,
    `${ONBOARDING_ACCOUNT_ID}|${ROLE_IDS[0]}`,
  ]);
  if (
    userRoles.length !== 5 ||
    userRoles.some(
      (row) =>
        !expectedUserRoles.has(
          `${row.userAccountId}|${row.roleId}`,
        ),
    )
  ) {
    throw new Error("TASK36_USER_ROLE_DRIFT");
  }

  const rolePermissionCounts = new Map<string, number>();
  for (const row of rolePermissions) {
    if (
      !ROLE_IDS.includes(row.roleId as (typeof ROLE_IDS)[number]) ||
      !PERMISSION_IDS.includes(row.permissionId)
    ) {
      throw new Error("TASK36_ROLE_PERMISSION_DRIFT");
    }
    rolePermissionCounts.set(
      row.roleId,
      (rolePermissionCounts.get(row.roleId) ?? 0) + 1,
    );
  }
  const expectedRolePermissionCounts = [14, 19, 23, 24];
  ROLE_IDS.forEach((roleId, index) =>
    expectCount(
      `role_permissions_${roleId}`,
      rolePermissionCounts.get(roleId) ?? 0,
      expectedRolePermissionCounts[index] ?? -1,
    ),
  );

  for (const employeeId of EMPLOYEE_IDS) {
    const employee = employees.find((row) => row.id === employeeId);
    if (
      employee?.nickname !== "TASK29" ||
      employee.agencyId !== AGENCY_ID ||
      employee.departmentId !== DEPARTMENT_ID
    ) {
      throw new Error("TASK36_TASK29_EMPLOYEE_DRIFT");
    }
  }

  const finalized = attachments.find(
    (row) => row.id === ATTACHMENT_IDS[0],
  );
  const stale = attachments.filter(
    (row) => row.id !== ATTACHMENT_IDS[0],
  );
  if (
    !finalized?.finalizedAt ||
    finalized.ownerEmployeeId !== EMPLOYEE_IDS[0] ||
    finalized.medicalLink?.medicalClaimId !== MEDICAL_CLAIM_ID ||
    finalized.leaveLink ||
    finalized.overtimeLink ||
    finalized.announcementLink ||
    finalized.employeeMedia ||
    stale.some(
      (row) =>
        row.finalizedAt !== null ||
        row.ownerEmployeeId !== EMPLOYEE_IDS[0] ||
        row.medicalLink ||
        row.leaveLink ||
        row.overtimeLink ||
        row.announcementLink ||
        row.employeeMedia,
    )
  ) {
    throw new Error("TASK36_ATTACHMENT_RELATION_DRIFT");
  }

  if (
    outbox.some(
      (row) =>
        row.id !== FIXED_NOTIFICATION_ID &&
        !SAFE_AGGREGATE_IDS.has(row.aggregateId),
    )
  ) {
    throw new Error("TASK36_OUTBOX_DRIFT");
  }

  if (
    audits.some(
      (row) =>
        !row.actorEmployeeId ||
        !EMPLOYEE_IDS.includes(
          row.actorEmployeeId as (typeof EMPLOYEE_IDS)[number],
        ),
    )
  ) {
    throw new Error("TASK36_AUDIT_DRIFT");
  }

  return {
    outboxIds: outbox.map((row) => row.id),
    auditIds: audits.map((row) => row.id),
  };
}

async function cleanup(): Promise<void> {
  const prisma = getPrismaClient();
  const snapshot = await assertPreflight();

  await prisma.$transaction(async (tx) => {
    expectCount(
      "delete_outbox",
      (
        await tx.notificationOutbox.deleteMany({
          where: { id: { in: snapshot.outboxIds } },
        })
      ).count,
      17,
    );
    expectCount(
      "delete_audits",
      (
        await tx.auditLog.deleteMany({
          where: { id: { in: snapshot.auditIds } },
        })
      ).count,
      19,
    );
    expectCount(
      "delete_idempotency",
      (
        await tx.idempotencyKey.deleteMany({
          where: { id: { in: [...IDEMPOTENCY_IDS] } },
        })
      ).count,
      9,
    );
    expectCount(
      "delete_medical_attachment_link",
      (
        await tx.medicalClaimAttachment.deleteMany({
          where: {
            attachmentId: ATTACHMENT_IDS[0],
            medicalClaimId: MEDICAL_CLAIM_ID,
          },
        })
      ).count,
      1,
    );
    expectCount(
      "delete_approval_steps",
      (
        await tx.approvalStep.deleteMany({
          where: { id: { in: [...APPROVAL_STEP_IDS] } },
        })
      ).count,
      7,
    );
    expectCount(
      "delete_medical_claim",
      (
        await tx.medicalClaim.deleteMany({
          where: { id: MEDICAL_CLAIM_ID },
        })
      ).count,
      1,
    );
    expectCount(
      "delete_ot_segments",
      (
        await tx.overtimeSegment.deleteMany({
          where: { id: { in: [...OT_SEGMENT_IDS] } },
        })
      ).count,
      2,
    );
    expectCount(
      "delete_ot_requests",
      (
        await tx.overtimeRequest.deleteMany({
          where: { id: { in: [...OT_REQUEST_IDS] } },
        })
      ).count,
      2,
    );
    expectCount(
      "delete_time_corrections",
      (
        await tx.timeCorrectionRequest.deleteMany({
          where: { id: { in: [...TIME_CORRECTION_IDS] } },
        })
      ).count,
      2,
    );
    expectCount(
      "delete_attendance_calculation",
      (
        await tx.attendanceCalculation.deleteMany({
          where: { id: ATTENDANCE_CALCULATION_ID },
        })
      ).count,
      1,
    );
    expectCount(
      "delete_attendance_record",
      (
        await tx.attendanceRecord.deleteMany({
          where: { id: ATTENDANCE_RECORD_ID },
        })
      ).count,
      1,
    );
    expectCount(
      "delete_leave_requests",
      (
        await tx.leaveRequest.deleteMany({
          where: { id: { in: [...LEAVE_REQUEST_IDS] } },
        })
      ).count,
      2,
    );
    expectCount(
      "delete_announcement",
      (
        await tx.announcement.deleteMany({
          where: { id: ANNOUNCEMENT_ID },
        })
      ).count,
      1,
    );
    expectCount(
      "delete_approval_instances",
      (
        await tx.approvalInstance.deleteMany({
          where: { id: { in: [...APPROVAL_INSTANCE_IDS] } },
        })
      ).count,
      7,
    );
    expectCount(
      "delete_attachments",
      (
        await tx.attachment.deleteMany({
          where: { id: { in: [...ATTACHMENT_IDS] } },
        })
      ).count,
      3,
    );

    expectCount(
      "delete_onboarding_entitlements",
      (
        await tx.leaveEntitlement.deleteMany({
          where: { id: { in: [...ENTITLEMENT_IDS.slice(3)] } },
        })
      ).count,
      3,
    );
    expectCount(
      "delete_onboarding_user_role",
      (
        await tx.userRole.deleteMany({
          where: { userAccountId: ONBOARDING_ACCOUNT_ID },
        })
      ).count,
      1,
    );
    expectCount(
      "delete_onboarding_account",
      (
        await tx.userAccount.deleteMany({
          where: { id: ONBOARDING_ACCOUNT_ID },
        })
      ).count,
      1,
    );
    expectCount(
      "delete_onboarding_employee",
      (
        await tx.employee.deleteMany({
          where: { id: ONBOARDING_EMPLOYEE_ID },
        })
      ).count,
      1,
    );

    expectCount(
      "delete_task31_entitlements",
      (
        await tx.leaveEntitlement.deleteMany({
          where: { id: { in: [...ENTITLEMENT_IDS.slice(0, 3)] } },
        })
      ).count,
      3,
    );
    expectCount(
      "delete_policy_steps",
      (
        await tx.approvalPolicyStep.deleteMany({
          where: { id: { in: [...APPROVAL_POLICY_STEP_IDS] } },
        })
      ).count,
      3,
    );
    expectCount(
      "delete_policies",
      (
        await tx.approvalPolicy.deleteMany({
          where: { id: { in: [...APPROVAL_POLICY_IDS] } },
        })
      ).count,
      3,
    );
    expectCount(
      "delete_attendance_policy",
      (
        await tx.attendancePolicy.deleteMany({
          where: { id: ATTENDANCE_POLICY_ID },
        })
      ).count,
      1,
    );
    expectCount(
      "delete_benefit_policy",
      (
        await tx.benefitPolicy.deleteMany({
          where: { id: BENEFIT_POLICY_ID },
        })
      ).count,
      1,
    );
    expectCount(
      "delete_weekly_rules",
      (
        await tx.weeklyWorkRule.deleteMany({
          where: { id: { in: WEEKLY_RULE_IDS } },
        })
      ).count,
      7,
    );
    expectCount(
      "delete_leave_types",
      (
        await tx.leaveType.deleteMany({
          where: { id: { in: [...LEAVE_TYPE_IDS] } },
        })
      ).count,
      3,
    );

    expectCount(
      "clear_org_refs",
      (
        await tx.employee.updateMany({
          where: { id: { in: [...EMPLOYEE_IDS] } },
          data: { agencyId: null, departmentId: null },
        })
      ).count,
      4,
    );
    expectCount(
      "delete_department",
      (
        await tx.department.deleteMany({
          where: { id: DEPARTMENT_ID },
        })
      ).count,
      1,
    );
    expectCount(
      "delete_agency",
      (
        await tx.agency.deleteMany({
          where: { id: AGENCY_ID },
        })
      ).count,
      1,
    );

    expectCount(
      "delete_task29_user_roles",
      (
        await tx.userRole.deleteMany({
          where: { userAccountId: { in: [...ACCOUNT_IDS] } },
        })
      ).count,
      4,
    );
    expectCount(
      "delete_task29_accounts",
      (
        await tx.userAccount.deleteMany({
          where: { id: { in: [...ACCOUNT_IDS] } },
        })
      ).count,
      4,
    );
    expectCount(
      "delete_task29_employees",
      (
        await tx.employee.deleteMany({
          where: { id: { in: [...EMPLOYEE_IDS] } },
        })
      ).count,
      4,
    );
    expectCount(
      "delete_task29_roles",
      (
        await tx.role.deleteMany({
          where: { id: { in: [...ROLE_IDS] } },
        })
      ).count,
      4,
    );
    expectCount(
      "delete_task29_permissions",
      (
        await tx.permission.deleteMany({
          where: { id: { in: PERMISSION_IDS } },
        })
      ).count,
      24,
    );
  });

  const postCounts = await Promise.all([
    prisma.employee.count(),
    prisma.userAccount.count(),
    prisma.role.count(),
    prisma.permission.count(),
    prisma.userRole.count(),
    prisma.rolePermission.count(),
    prisma.agency.count(),
    prisma.department.count(),
    prisma.leaveType.count(),
    prisma.leaveEntitlement.count(),
    prisma.approvalPolicy.count(),
    prisma.approvalPolicyStep.count(),
    prisma.approvalInstance.count(),
    prisma.approvalStep.count(),
    prisma.leaveRequest.count(),
    prisma.attendanceRecord.count(),
    prisma.attendanceCalculation.count(),
    prisma.timeCorrectionRequest.count(),
    prisma.overtimeRequest.count(),
    prisma.overtimeSegment.count(),
    prisma.attendancePolicy.count(),
    prisma.weeklyWorkRule.count(),
    prisma.benefitPolicy.count(),
    prisma.medicalClaim.count(),
    prisma.attachment.count(),
    prisma.announcement.count(),
    prisma.notificationOutbox.count(),
    prisma.notificationDelivery.count(),
    prisma.auditLog.count(),
    prisma.idempotencyKey.count(),
    prisma.lineAccount.count(),
    prisma.leaveTypeAlias.count(),
    prisma.medicalClaimAttachment.count(),
    prisma.leaveRequestAttachment.count(),
    prisma.overtimeRequestAttachment.count(),
    prisma.announcementAttachment.count(),
    prisma.employeeMedia.count(),
  ]);
  if (postCounts.some((count) => count !== 0)) {
    throw new Error("TASK36_DB_POST_CLEANUP_NONZERO");
  }

  process.stdout.write(
    "TASK36_DB_CLEANUP_PASS tracked_fixture_rows=0 identity_rbac=0 attachments=0 business=0 config=0\n",
  );
}

void cleanup()
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : String(error);
    process.stderr.write(`TASK36_DB_CLEANUP_FAIL ${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaClient();
  });
