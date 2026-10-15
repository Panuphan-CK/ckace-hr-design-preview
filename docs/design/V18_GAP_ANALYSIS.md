# v18 mockup vs. real web — gap analysis (Project B)

Owner direction (2026-10-15): compare the real web with the approved v18 mockup page by page starting from the
dashboard; anything the mockup needs that the backend cannot provide becomes backend work, run as one long project
without re-asking. Production gates in AGENTS.md still apply (no Production data/DNS/credential change).

Status key: DONE = matches v18 with real data. PARTIAL = layout matches, some fields missing (needs backend).
TODO = still the legacy look.

| Page | Status | Notes |
|---|---|---|
| Shell (icon rail, flyout, app switcher) | DONE | |
| Dashboard `/desktop` | PARTIAL | Rebuilt 2026-10-15: hero, quick actions, balance rings, in-progress, team this week, announcements. Gaps: B4, B5. Announcement editor moved to `/desktop/announcements/manage`. |
| Leave `/desktop/leave` | PARTIAL | B1 approver chain names, B2 request number, B6 timeline |
| Overtime `/desktop/overtime` | PARTIAL | B1, B2, B6 |
| Time correction `/desktop/time-correction` | PARTIAL | B1, B2, B6, evidence attachment field (mockup "หลักฐาน") |
| Medical `/desktop/medical` | PARTIAL | B1, B2, B6 |
| Clock in/out `/desktop/attendance` | DONE | |
| Approvals per type `/desktop/approvals#…` | PARTIAL | B3 send-back ("แก้ไข"), B2, B10 department, B6, per-type detail fields |
| Delegation (mockup v-deleg) | TODO | B7 |
| Calendar `/desktop/calendar` | TODO | not yet compared |
| Reports per type | TODO | B8 |
| Settings (types, holidays, work, flow, medical, notifications) | TODO | not yet compared |
| Profile | TODO | B9 photo/signature upload; layout per HANDOFF notes |

## Backend gaps

- **B1** approver chain per request type for the submit forms (leave has `/leave/approval-options`; OT, time
  correction, medical do not) — return ordered steps with approver display names.
- **B2** human-readable request numbers (e.g. `TC-6910-017`).
- **B3** send-back decision (`REVISION_REQUESTED`) on leave / OT / time correction / medical decision endpoints and the
  employee-side "edit and resubmit" path. `RequestStatus` already has `REVISION_REQUESTED`; step status does not.
- **B4** in-progress feed enriched with current approver name and "step N of M".
- **B5** team-this-week feed: approved leave of colleagues plus company holidays, readable without calendar-admin rights.
- **B6** per-request approval-step timeline for detail dialogs.
- **B7** approver delegation.
- **B8** per-type report endpoints.
- **B9** profile photo / signature upload and display.
- **B10** department/agency name on approval queue and history items.

## Production (Project A GAS web) vs Project B — functional gaps

Source: read-only inspection of `D:\APP_Leave` (Gs/*.js, page/*.html, Sidebar/Navbar) on 2026-10-15. This is a source
comparison, not a live walkthrough of the authenticated Production site. Items marked "intentional" were already
decided as secure replacements in `docs/TASK39_5_DESKTOP_PRODUCTION_PARITY_UXUI_20261014.md`.

### Missing in Project B (real functional gaps)

| # | Production capability (legacy source) | Project B today |
|---|---|---|
| P1 | Approver can send a **leave** request back (leave only in Production, per manual) for revision, employee revises and resubmits (`requestRevisionForLeave`, `resubmitRevisedLeave`, `26_LeaveResubmitCore.js`) | Not implemented; repositories reject REVISION_REQUESTED (= B3) |
| P2 | Employee withdraws their own request including after approval (`27_LeaveWithdrawalCore.js`, `28_OtWithdrawalCore.js`, `29_MedicalWithdrawalCore.js`, `cancelApprovedLeave`, `deleteCorrectionRequest`, `deleteMedicalClaim`) | Cancel works for PENDING only; no withdrawal of approved requests |
| P3 | Approver bulk-approves all pending OT (`approveAllPendingOvertimeForApprover`) | Not implemented |
| P4 | Overdue-approval reminders (`sendOverdueApprovalReminders`) and request notifications by email/LINE (`00_Notification.js`) | Notification outbox/retry exists in admin; no reminder job |
| P5 | Auto-close missing check-outs (`updateMissingCheckOuts`) | Not implemented |
| P6 | Approver chain shown on submit forms for every type (`getDesktopApproverChain`, `getMedicalApproverChain`) | Leave only (= B1) |
| P7 | Reports include approval-flow views for OT and medical ("ขั้นตอนการอนุมัติ OT / เบิกค่ารักษา") and yearly medical totals | Basic filtered tables + CSV |
| P8 | Profile: change own password, photo and signature (`changeUserPassword`, user media) | Password reset by admin only; no photo/signature (= B9) |
| P9 | Medical form step 1 chooses a referenced approved sick leave or OPD without leave | `leaveRequestId` exists in the contract; confirm the redesigned form exposes both paths |
| P10 | Year selector / archived years on the dashboard | Not implemented (archive delete is intentionally excluded) |

### Intentional differences (not gaps)
Chatbot/AI FAQ, LINE rich-menu editor and LIFF (out of scope for Desktop), unauthenticated check-in modal, sheet/folder
protection and backup tooling, client-side Excel export, editable infrastructure settings, archive-year delete.

### Plan
1. B3 + P1: send-back and resubmit across leave, OT, time correction, medical (own session, quota semantics already
   reserve days for REVISION_REQUESTED).
2. P2: withdrawal of approved requests with quota/limit restoration.
3. B1/B4/B5/B2/B6/B10 read-side enrichments (no schema change except request numbers).
4. P3, P5 and P4 (job design needs Owner awareness: scheduled jobs are a runtime change).
5. B7 delegation, B8/P7 reports, B9/P8 profile.

### Owner decision (2026-10-15)
Withdrawing a request that is already APPROVED (P2) may be done **only by the highest-level user** (top admin role).
Employees and ordinary approvers keep cancel-while-PENDING only. Implementation: a dedicated server-side permission
(e.g. `requests.withdraw_approved`) granted only to the top role; the server derives the actor, the UI merely hides the
button; every withdrawal is audited and restores leave quota / medical limit in the same transaction.
