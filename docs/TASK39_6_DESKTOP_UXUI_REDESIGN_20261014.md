# TASK-39.6 — Desktop UX/UI Redesign + Leave-first Platform Structure

Date: 2026-10-14 Asia/Bangkok  
Project: `D:\CKACE_HR` / Project B only  
Scope: Web Desktop only; Leave-first  
Verdict: **PASS**

## Goal

Redesign CKACE HR Desktop around the Owner-confirmed Leave-first information architecture while preserving existing business contracts and server-authoritative authorization.

The redesign intentionally prepares shared Employee / Organization / Role & Permission foundations for future CKACE modules without implementing Accounting Office, Customer Portal or Audit in this task.

## Owner-confirmed Information Architecture

- หน้าหลัก
- ปฏิทินการลา
- คำขอของฉัน
  - การลา
  - OT
  - แก้ไขเวลา
  - ค่ารักษาพยาบาล
- งานอนุมัติ
  - การลา
  - OT
  - แก้ไขเวลา
  - ค่ารักษาพยาบาล
- รายงาน
  - ภาพรวม
  - การลา
  - การเข้างาน
  - OT
  - ค่ารักษาพยาบาล
- พนักงาน
  - ฐานข้อมูลพนักงาน
  - โครงสร้างและสังกัด
  - สิทธิ์และการเข้าถึง
- ตั้งค่าระบบลา
  - สิทธิวันลา
  - วันหยุด / วันทำงาน
- ตั้งค่าระบบ — CKACE Platform level

Announcements are surfaced on Dashboard instead of becoming a primary sidebar setting.

## Implementation

### Hierarchical navigation

`apps/web/src/app/desktop/desktop-shell.tsx`

Implemented:
- two-level expand/collapse sidebar groups
- responsive mobile drawer using the same IA
- separate My Requests and Approval Work
- separate Reports workspace
- grouped Employee administration
- grouped Leave settings
- visually separated Platform Settings
- active route/hash-aware highlighting
- retained Prompt typography, theme toggle, Attendance shortcut, notifications, profile and logout behavior

Navigation remains presentation only. Authorization remains server-side.

### Narrow server-derived navigation capabilities

`apps/api/src/security/desktop-navigation.ts`

Added narrow display capabilities:
- `leaveApprovals`
- `timeCorrectionApprovals`
- `overtimeApprovals`
- `medicalApprovals`
- `usersAdmin`
- `organizationAdmin`
- `entitlementAdmin`
- `workCalendarAdmin`

These prevent a broad Approver or Admin label from exposing unrelated menu items. Platform Settings uses `adminSettings`; it is not exposed merely because the actor has some unrelated admin capability.

API authorization remains final authority and fails closed.

### My Requests

New reusable request-workspace tabs:
`apps/web/src/app/desktop/request-workspace-tabs.tsx`

Integrated into:
- Leave
- Overtime
- Attendance time correction
- Medical

Each module owns:
- New / create action
- In progress
- History

The old mental model of one global “สถานะคำขอ / ประวัติ” menu is no longer required for the primary workflow.

Attendance time correction has a stable `#correction-request` anchor.

### Approval Work

`apps/web/src/app/desktop/approvals/page.tsx`

Approval UX is separated from employee requests and supports:
- module-specific hashes
- “รอฉันอนุมัติ”
- “ประวัติการอนุมัติ”

Real approval history is supplied from server-side data rather than fabricated in the client.

Supporting changes:
- `packages/contracts/src/request-status.ts`
- `packages/database/src/request-status-repository.ts`
- `apps/api/src/request-status/request-status.service.ts`
- `apps/api/src/request-status/request-status.controller.ts`

The history read is scoped to the signed-in approver and filtered by the actor's module-specific approve permissions.

### Reports

`apps/web/src/app/desktop/reports/page.tsx`

Reports are now a dedicated analytics workspace, separate from Dashboard.

Implemented:
- overview
- Leave
- Attendance
- OT
- Medical
- hash-specific navigation
- date filters
- real overview summary metrics
- existing safe table/CSV flow

Operational report data uses final/real states:
- Leave: APPROVED
- OT: APPROVED
- Medical: APPROVED
- Attendance: completed attendance records

Pending / rejected request rows are not mixed into the operational report figures.

### Dashboard announcements

New:
`apps/web/src/app/desktop/dashboard-announcements.tsx`

Integrated into:
`apps/web/src/app/desktop/page.tsx`

Behavior:
- employees can read announcements available to them
- authorized announcement admins can add/edit/publish/unpublish directly from Dashboard
- delete remains separately gated by `announcementDeleteAdmin`
- existing attachment-delete safety boundary remains intact
- existing direct announcement/admin surfaces remain for compatibility, but announcements are no longer a primary sidebar setting

### Employee and Leave settings grouping

`apps/web/src/app/desktop/admin/management/page.tsx`

Added grouped workspaces:
- `#organization` combines Agency + Department management
- `#work-calendar` combines Holiday + Weekly Workday management

Legacy hashes remain compatible.

The current Employee Master remains Leave-first. Future accounting-office professional data such as registered bookkeeper, auditor/CPA credentials, multiple business affiliations, and cross-module access is **not implemented in TASK-39.6**; the architecture is intentionally left open for that later phase.

### Platform Settings

`apps/web/src/app/desktop/admin/page.tsx`

Platform Settings is separated from Leave settings and presents:
- current platform runtime settings read-only
- Shared Platform Core explanation
- capability-gated links to Employee Master, Organization and Role/Permission

This establishes the boundary for future shared CKACE modules without implementing Office / Customer / Audit.

### Visual system

`apps/web/src/app/globals.css`

Implemented a clean modern business layer while retaining Prompt:
- soft off-white / blue-gray layered background
- subtle gradients
- white/translucent floating sidebar and topbar
- light borders and restrained shadows
- CKACE blue as accent rather than full-surface color
- modern nested nav
- unified cards/forms/tables
- responsive mobile behavior
- dark-mode compatibility

## Files Changed

Primary TASK-39.6 source:
- `apps/web/src/app/desktop/desktop-shell.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/desktop/request-workspace-tabs.tsx`
- `apps/web/src/app/desktop/dashboard-announcements.tsx`
- `apps/web/src/app/desktop/page.tsx`
- `apps/web/src/app/desktop/leave/page.tsx`
- `apps/web/src/app/desktop/overtime/page.tsx`
- `apps/web/src/app/desktop/attendance/page.tsx`
- `apps/web/src/app/desktop/medical/page.tsx`
- `apps/web/src/app/desktop/approvals/page.tsx`
- `apps/web/src/app/desktop/reports/page.tsx`
- `apps/web/src/app/desktop/admin/page.tsx`
- `apps/web/src/app/desktop/admin/management/page.tsx`
- `apps/api/src/security/desktop-navigation.ts`
- `apps/api/src/security/desktop-navigation.test.ts`
- `apps/api/src/security/security.controller.test.ts`
- `apps/api/src/request-status/request-status.controller.ts`
- `apps/api/src/request-status/request-status.service.ts`
- `apps/api/src/request-status/request-status.controller.test.ts`
- `packages/contracts/src/request-status.ts`
- `packages/database/src/request-status-repository.ts`

QA-only fixture:
- `.tmp/task39_6_visual_proxy.cjs`

Continuity:
- `docs/TASK39_6_DESKTOP_UXUI_REDESIGN_20261014.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

## Verification

### Automated

Final canonical command:

`npm run check`

Task:
`dc7c1248-f1b7-4dc4-be5b-51e281a96508`

Result: **PASS, exit 0**
- lint PASS
- all workspace typechecks PASS
- **83 / 83 test files PASS**
- **574 / 574 tests PASS**
- packages build PASS
- NestJS API build PASS
- Next.js production build PASS
- **22 / 22 static pages generated**

Additional focused evidence:
- navigation/security focused regression: **10 / 10 PASS**
- Web typecheck after final page refinements: PASS
- rebuilt Web production build: PASS, 22 / 22 pages

### Responsive browser QA

Read-only local same-origin QA fixture; no business write was sent.

Core matrix:
- 14 affected routes
- 399 px
- 824 px
- 1536 px
- **42 / 42 route-width combinations PASS**
- no document-level horizontal overflow
- 399 / 824: mobile menu visible and sidebar initially off-canvas
- 1536: desktop navigation visible; mobile toggle hidden
- no fixture/load error on the tested routes

Routes included:
- Dashboard
- Leave
- OT
- Attendance / time correction
- Medical
- Approval Work
- Reports overview
- Leave report
- Employee Master
- Organization
- Role/Permission
- Leave entitlement
- Work calendar
- Platform Settings

Interaction checks:
- mobile drawer open -> backdrop -> close PASS
- Leave tabs New / In Progress / History PASS
- Approval pending/history tabs PASS
- Leave report contains approved row and excludes pending row PASS
- Dashboard announcement editor opens for authorized admin PASS
- final rebuilt Reports overview renders 4 real summary metrics at 399 / 1536 PASS
- final rebuilt Platform Settings / Shared Platform Core at 399 / 1536 PASS

Local QA Web/proxy services were stopped and the dedicated QA browser tab was closed after verification.

## Security / Scope

Preserved:
- frontend is never authorization authority
- server-derived capabilities control navigation
- API authorization remains final authority
- module-specific approval capabilities
- separate read/write admin capabilities
- private attachment boundaries
- idempotent/ambiguous-write behavior

Not performed:
- Project A write
- LINE LIFF change
- GAS / Gateway change
- Production deployment
- Production data mutation
- Neon PROD mutation
- DNS/Firebase routing change
- credential/security change
- Office / Customer / Audit module implementation

## Known Follow-up

TASK-39.6 does not implement the future professional Employee Master fields discussed with the Owner:
- accounting vs audit primary/additional affiliation
- registered bookkeeper status / registration number
- auditor/CPA credentials
- credential validity/history/documents
- cross-module professional assignment

Those remain future shared-platform work after the Leave-first system is stabilized.

Shared TEST/Production promotion of this source remains a later gated release activity. TASK-39.6 PASS is a source/local/browser verification result, not Production approval.

## Decision

**TASK-39.6 = PASS.**

The Desktop now follows the Owner-confirmed Leave-first UX/UI structure while preserving server-authoritative security and establishing a clean separation between Leave-module settings and future CKACE Platform settings.

Next release work remains separately gated.
