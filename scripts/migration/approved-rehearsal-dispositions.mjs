// Exact exception set approved for the TESTm74 sanitized rehearsal on 2026-10-26.
// Changes require new Owner review; unexpected rows must keep the runner at exit 2.
export const APPROVED_REHEARSAL_OUTCOME_DISPOSITIONS = Object.freeze([
  {
    id: "ATTACHMENTS_WITHOUT_SANITIZED_BYTES",
    approval: "OWNER_APPROVED",
    sourceTabs: ["Attachments", "MedicalAttachments"],
    status: "SKIPPED_TRANSFORM",
    code: "SANITIZED_ATTACHMENT_BYTES_UNAVAILABLE",
    count: 34,
  },
  {
    id: "LEGACY_PENDING_STEP_REPLACED_BY_CURRENT_POLICY",
    approval: "EXPECTED_BY_TARGET_POLICY",
    sourceTabs: ["ApprovalSteps"],
    status: "SKIPPED_TRANSFORM",
    code: "LEGACY_PENDING_APPROVAL_REPLACED_BY_CURRENT_POLICY",
    count: 1,
  },
  {
    id: "ATTENDANCE_LOG_ID_REUSED_ACROSS_EMPLOYEES",
    approval: "OWNER_APPROVED",
    sourceTabs: ["TimeLog"],
    status: "IMPORTED",
    code: "ATTENDANCE_LOG_ID_REUSED_ACROSS_EMPLOYEES",
    legacyIds: ["LOG-001112::USER:USER-007", "LOG-001112::USER:USER-012"],
    count: 2,
  },
]);

export const APPROVED_PENDING_HANDOFF_DISPOSITIONS = Object.freeze([
  {
    id: "LEV-0109_REQUIRES_HR_CLOSE_OUT",
    approval: "OWNER_APPROVED_HR_EXCEPTION",
    requestLegacyId: "LEV-0109",
    reasonCode: "CURRENT_APPROVAL_POLICY_HAS_NO_REMAINING_STEPS",
    count: 1,
  },
]);
