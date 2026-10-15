# CKACE_HR — Project B HANDOFF

Last Updated: 2026-10-15 Asia/Bangkok

> Canonical continuity file for **Project B only**: `D:\CKACE_HR`.
> Project A `D:\APP_Leave` must remain separate.
> Historical pre-split snapshot: `docs/archive/project-b-split-20261008/HANDOFF_MIXED_BEFORE_SPLIT.md`.

## Current Goal

Phase A is complete. Continue Project B through the remaining Desktop Production parity and release gates.

**Development mode (updated 2026-10-15): the Owner moved Project B development to Claude. Project A (`D:\APP_Leave`) remains with Codex and must not be touched from here.**

Current state: **TASK-39.8 — Full Desktop Production UI Parity = IN PROGRESS; Waves 1–2 = PASS; Wave 3 Reports = NEXT**.

**TASK-39.5A — Employee-facing safe parity = PASS.**  
**TASK-39.5B — Calendar / Reports / Admin parity = PASS.**  
**TASK-39.6 — Leave-first Desktop information architecture / UX/UI redesign = PASS.**  
**TASK-39.7 — Owner-requested Desktop Production visual parity polish = PASS.**  
**TASK-39.8 Wave 1 — Production UI Foundation + My Requests (Leave / OT / Time Correction / Medical) = PASS.**  
**TASK-39.8 Wave 2 — Approval Work Production UI Parity = PASS.**

**Phase A — Project B Web Desktop Functional + Security QA = PASS.**

Shared TEST traffic remains:
- API `ckace-hr-api-test-m9d15d` = **100%**
- Web `ckace-hr-web-test-task35-20261014a` (`task35-responsive`) = **100%**
- previous Web baseline `m9d15a` = **0% rollback target**
- Firebase rewrites unchanged.

TASK-39.6 is verified in source/local production build/browser QA but is **not yet promoted to shared TEST traffic**. It implements the Owner-confirmed Leave-first Desktop structure: hierarchical My Requests, Approval Work, Reports, Employee administration, Leave settings and separate CKACE Platform Settings; Dashboard announcements are managed from the Home experience. Prompt remains the primary font and authorization remains server-authoritative. **LINE LIFF is explicitly out of scope and must not be touched.**

TASK-39.7 is also verified in source/local production build/browser QA and remains **not promoted to shared TEST/Production**. It keeps the TASK-39.6 IA but restores the stronger Production visual language: announcements at the bottom in a 3-column Desktop grid, Production-like period filtering, improved Leave entitlement/bar/doughnut visuals, Calendar list below the calendar, and broader white-card / #f3f4f8 / blue-active-nav parity.

TASK-39.8 is active under the Owner-confirmed Full Desktop Production UI Parity plan. **Waves 1–2 are PASS**: My Requests and Approval Work now follow the Production visual language while preserving Project B server-authoritative APIs/security. Approval Work uses Production-style Search + Reload, 3/2/1 responsive approval cards, module filters, and table-based approval history. Waves 3–4 and final whole-task QA remain pending.

The future Employee Master extensions discussed for the accounting/audit office (accounting vs audit affiliation, registered bookkeeper, auditor/CPA credentials and cross-module access) remain future shared-platform work; TASK-39.6 intentionally does not implement Office / Customer / Audit modules.

Production deployment/cutover remains **NO-GO**. TASK-39.6 authorization covered Project B Desktop source/local UX/UI implementation and QA only. It does **not** authorize Production source-of-truth cutover, DNS/Firebase routing changes, Neon PROD migration/data mutation, credential escalation, destructive operations, Project A writes, or any LINE LIFF/GAS/Gateway work.

## Completed

- TASK-28 — TEST Database Attestation — **PASS**
- TASK-29 — Four Disposable TEST Identities — **PASS**
- TASK-30 — Four-Role Authenticated UAT — **PASS**
- TASK-31 — Core Desktop Functional UAT — **PASS**
- TASK-32 — Medical + Private R2 E2E — **PASS**
- TASK-33 — Failure & Ambiguous-Write QA — **PASS**
- TASK-34 — R2 Orphan Reconciliation — **PASS**
- TASK-35 — Responsive + State QA — **PASS**
- TASK-36 — Exact TEST Data / R2 Cleanup — **PASS**
- TASK-37 — Final Regression — **PASS**
- TASK-38 — Phase A Final Review — **PASS**
- TASK-39 — TEST Traffic Decision + Web Traffic Switch — **PASS**
- TASK-39.5A — Employee-facing Desktop Production parity / UX upgrade — **PASS**
- TASK-39.5B — Calendar / Reports / Admin parity — **PASS**
- TASK-39.6 — Desktop UX/UI Redesign + Leave-first Platform Structure — **PASS**
- TASK-39.7 — Desktop Production Visual Parity Polish — **PASS**
- TASK-39.8 Wave 1 — Production UI Foundation + My Requests — **PASS**
- TASK-39.8 Wave 2 — Approval Work Production UI Parity — **PASS**

Primary evidence:
- `docs/TASK32_MEDICAL_PRIVATE_R2_E2E_20261008.md`
- `docs/TASK33_FAILURE_AMBIGUOUS_WRITE_QA_20261014.md`
- `docs/TASK34_R2_ORPHAN_RECONCILIATION_20261014.md`
- `docs/TASK35_RESPONSIVE_STATE_QA_20261014.md`
- `docs/TASK36_EXACT_TEST_CLEANUP_20261014.md`
- `docs/TASK37_FINAL_REGRESSION_20261014.md`
- `docs/TASK38_PHASE_A_FINAL_REVIEW_20261014.md`
- `docs/TASK39_TEST_TRAFFIC_DECISION_20261014.md`
- `docs/TASK39_5_DESKTOP_PRODUCTION_PARITY_UXUI_20261014.md`
- `docs/TASK39_6_DESKTOP_UXUI_REDESIGN_20261014.md`
- `docs/TASK39_7_DESKTOP_PRODUCTION_VISUAL_PARITY_20261015.md`
- `docs/TASK39_8_WAVE1_REQUESTS_PRODUCTION_PARITY_20261015.md`
- `docs/TASK39_8_WAVE2_APPROVALS_PRODUCTION_PARITY_20261015.md`

### TASK-36 verified result

Owner-approved exact TEST cleanup completed through fail-closed one-off Cloud Run Jobs.

R2:
- successful execution `ckace-hr-task36-r2-cleanup-274f7`
- exact finalized receipt validated before delete: 92 bytes, `application/pdf`, expected SHA-256
- both stale TASK-32 keys confirmed absent
- only the finalized exact key was deleted
- post-verification confirmed all 3 exact keys NOT_FOUND
- terminal marker:
  `TASK36_R2_CLEANUP_PASS exact_keys=3 deleted_finalized=1 stale_absent=2 post_absent=3`

Neon DEV:
- successful execution `ckace-hr-task36-db-cleanup-679kb`
- runner re-attested the exact full synthetic fixture before one transaction
- dependency-safe cleanup completed
- terminal marker:
  `TASK36_DB_CLEANUP_PASS tracked_fixture_rows=0 identity_rbac=0 attachments=0 business=0 config=0`

Independent post-verification against `ckace_hr_dev`:
- employees/accounts/roles/permissions/user_roles/role_permissions = 0
- agencies/departments/leave types/entitlements = 0
- approval policies/steps/instances = 0
- Leave/Attendance/Time Correction/OT/Medical business rows = 0
- attachments and attachment links = 0
- announcements/outbox/deliveries/audit/idempotency = 0
- attendance/weekly/benefit configuration = 0
- LINE accounts / leave aliases / employee media = 0

Build/QA:
- storage typecheck `9ce2fa4b-c310-4d9e-bdae-6b5556103f78` = exit 0
- API typecheck `dbb1edb6-88c6-4d48-8203-f6dc049cf70b` = exit 0
- focused ESLint `d19af881-893e-454a-9069-47c1fceb85a4` = exit 0
- Cloud Build `9d021006-bfe8-4ba0-89fc-70a5e20b70a9` = SUCCESS
- cleanup image digest `sha256:63667016c6674674516b82eed8516c74615271b858c8f167e9442a97b05a2f66`

Final traffic re-read:
- API baseline `ckace-hr-api-test-m9d15d` = **100%**
- Web baseline `ckace-hr-web-test-m9d15a` = **100%**
- no shared traffic mutation.

## In Progress

**TASK-39.9 — Desktop full redesign (Owner-directed, mockup stage) — IN PROGRESS.** The Owner rejected the Wave 1–2 look and asked for a full redesign. Iterated mockups live in `docs/design/desktop-redesign-v1.html` … `v17.html`; **v17 is the current Owner-iterated direction** (no app code changed yet). Locked Owner decisions so far:
- Platform is split into apps (HR, สำนักงานบัญชี, Audit, บุคลากร, ตั้งค่าระบบ) with an app switcher; each app has its own settings.
- Left navy icon rail only (no top bar): profile with notification badge first, dashboard next, app switcher and settings at the bottom; clicking an icon opens a white flyout menu.
- White page backgrounds, colored structure: tinted header strip with left bar and bottom line on every box/card, soft (light-tinted) buttons everywhere.
- Each request type has its own page: form on top (with an approver-chain box) and that type's history below. Approvals and reports are split per type the same way; approvals are grid-only.
- Prompt font (same as Production). Approver actions on one line: อนุมัติ / แก้ไข / ไม่อนุมัติ; status for sent-back requests is "รอแก้ไข" (Production wording). Inner cards are white with only a colored top line; submit buttons take their function color; request history uses the same card grid as approval history, with a date tile; every history card opens a detail dialog modelled on Production (requester, dates, reason, quota, files, approval-steps table). Hourly leave takes a start time plus number of hours. Approved status reads "อนุมัติ". History cards show labelled rows (date once, amount, detail, approver). Profile page follows Production "โปรไฟล์ของฉัน": photo on top (click the photo to change it, no separate upload button), general info (name, surname, nickname, email username, agency, department, password), signature box.
- FlowAccount is a usability reference only; never copy its look.
Next: Owner sign-off on v17, then implement in `apps/web` page by page.


TASK-39.8 remains active.

**Wave 1 — Production UI Foundation + My Requests = PASS.** Leave, OT, Time Correction and Medical request workspaces use the Production-style request shell, tabs, toolbar, forms/tables/cards and responsive behavior.

**Wave 2 — Approval Work Production UI Parity = PASS.** Pending approval queues use Production-style Search + Reload, module-filter headings/icons and 3 / 2 / 1 responsive approval cards. Approval history is now table-based. Server-authoritative approval APIs/security remain unchanged. Wave 3 — Reports is next.

LINE LIFF remains explicitly excluded.

## Remaining

- TASK-39.8 Wave 3 — Reports Production parity — **PENDING**
- TASK-39.8 Wave 4 — Employee/Admin/Leave Settings/Platform Settings parity — **PENDING**
- TASK-39.8 final whole-task responsive/functional regression + Owner visual review — **PENDING**
- TASK-40 — Production Readiness Plan — **NOT STARTED; separate Owner approval required**
- TASK-41 — Production Go / No-Go — **NOT STARTED; separate Production approval required**

## Files Changed

TASK-39.8 Wave 2 — Approval Work Production UI Parity:
- `apps/web/src/app/desktop/approvals/page.tsx`
- `apps/web/src/app/globals.css`
- `docs/TASK39_8_WAVE2_APPROVALS_PRODUCTION_PARITY_20261015.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

TASK-39.8 Wave 1 — Production UI Foundation + My Requests:
- `apps/web/src/app/desktop/request-workspace-tabs.tsx`
- `apps/web/src/app/desktop/leave/page.tsx`
- `apps/web/src/app/desktop/overtime/page.tsx`
- `apps/web/src/app/desktop/attendance/page.tsx`
- `apps/web/src/app/desktop/medical/page.tsx`
- `apps/web/src/app/globals.css`
- `docs/TASK39_8_WAVE1_REQUESTS_PRODUCTION_PARITY_20261015.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

TASK-39.7 Production visual parity polish:
- `apps/web/src/app/desktop/page.tsx`
- `apps/web/src/app/desktop/calendar/page.tsx`
- `apps/web/src/app/globals.css`
- `docs/TASK39_7_DESKTOP_PRODUCTION_VISUAL_PARITY_20261015.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

TASK-39.6 Desktop redesign / Leave-first platform structure:
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
- `docs/TASK39_6_DESKTOP_UXUI_REDESIGN_20261014.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

TASK-39.5B / final parity:
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/reset-password/page.tsx`
- `apps/web/src/app/desktop/desktop-shell.tsx`
- `apps/web/src/app/desktop/page.tsx`
- `apps/web/src/app/desktop/calendar/page.tsx`
- `apps/web/src/app/desktop/reports/page.tsx`
- `apps/web/src/app/desktop/admin/page.tsx`
- `apps/web/src/app/desktop/admin/management/page.tsx`
- `packages/contracts/src/management.ts`
- `packages/contracts/src/password-recovery.ts`
- `packages/contracts/src/announcements.ts`
- `packages/database/src/management-repository.ts`
- `packages/database/src/password-recovery-repository.ts`
- `packages/database/src/announcement-repository.ts`
- `apps/api/src/management/management.controller.ts`
- `apps/api/src/management/management.service.ts`
- `apps/api/src/security/password-recovery.controller.ts`
- `apps/api/src/security/password-recovery.service.ts`
- `apps/api/src/security/desktop-navigation.ts`
- `apps/api/src/announcements/announcement.controller.ts`
- `apps/api/src/announcements/announcement.service.ts`
- focused management/password-recovery/announcement/security tests
- `docs/TASK39_5_DESKTOP_PRODUCTION_PARITY_UXUI_20261014.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

TASK-39.5A:
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/login/login-view.ts`
- `apps/web/src/app/login/login-view.test.ts`
- `apps/web/src/app/desktop/page.tsx`
- `apps/web/src/app/desktop/desktop-shell.tsx`
- `apps/web/src/app/desktop/attendance/page.tsx`
- `apps/web/src/app/desktop/attendance/attendance-action.ts`
- `apps/web/src/app/desktop/attendance/attendance-action.test.ts`
- `apps/web/src/app/desktop/attendance/attendance-view.ts`
- `apps/web/src/app/desktop/attendance/attendance-view.test.ts`
- `apps/web/src/app/globals.css`
- `docs/TASK39_5_DESKTOP_PRODUCTION_PARITY_UXUI_20261014.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

TASK-39:
- `docs/TASK39_TEST_TRAFFIC_DECISION_20261014.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`
- Phase A / WD13 gate documentation.

TASK-38:
- `docs/TASK38_PHASE_A_FINAL_REVIEW_20261014.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`
- Phase A / WD13 gate documentation.

TASK-37:
- `docs/TASK37_FINAL_REGRESSION_20261014.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`
- Phase A / WD13 status documentation.

TASK-36:
- `packages/storage/src/task36-r2-cleanup.ts`
- `apps/api/src/task36-cleanup-job.ts`
- `docs/TASK36_EXACT_TEST_CLEANUP_20261014.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`
- relevant Phase A / WD13 gate documentation.

TASK-35 responsive/UI source remains as previously recorded under `apps/web/src/app/desktop/` and `apps/web/src/app/globals.css`.

## Verification

TASK-36:
- exact pre-delete Neon DEV attestation PASS
- exact attachment link-state attestation PASS
- R2 exact-key cleanup + post-verify PASS
- Neon DEV exact fixture cleanup + transaction PASS
- independent Neon DEV post-count verification PASS
- targeted typecheck/lint/build PASS
- final API/Web traffic unchanged.

TASK-37:
- Prisma schema validation PASS
- `npm run check` exit 0
- lint PASS
- all workspace typechecks PASS
- **78 / 78 test files PASS**
- **505 / 505 tests PASS**
- package/API/Next production builds PASS
- post-cleanup Neon DEV spot checks remain zero
- API/Web TEST baseline traffic remains 100%.

TASK-38:
- TASK-28 through TASK-37 evidence reviewed
- functional/security/cleanup/regression gates accepted
- fresh Neon DEV synthetic counts remain zero
- API `/api/health` = 200
- API `/api/ready` = 200
- API/Web TEST baseline traffic remains 100%
- **PHASE A = PASS**.

TASK-39:
- API remained `m9d15d = 100%`
- Web switched to `task35-responsive = 100%`
- old Web baseline `m9d15a = 0%` retained for rollback
- Firebase TEST rewrites unchanged
- canonical Firebase smoke: Login 200, health 200, ready 200, signed-out session 401
- browser `/desktop` -> client-side `/login`, required login controls present, no horizontal overflow
- proxy safety tests = **8 / 8 PASS**
- no rollback condition triggered.

TASK-39.8 Wave 2 final verification:
- Web typecheck `730a35c2-2f8f-4311-a1f0-dc8c34f480aa` = **exit 0**
- Web ESLint `e8a7fd57-2fa4-41e6-97ac-eb4e9255b87c` = **exit 0**
- focused Approval/Navigation regression `8eff923d-8ff1-4bdc-861a-7ac16a562cfc` = **2 / 2 files, 12 / 12 tests PASS**
- Web production build `d98c3b6d-9f82-428b-9e1a-1a1fe6735f3e` = **exit 0**; Next generated **22 / 22 static pages**
- pending approval responsive matrix = **15 / 15 PASS** across All / Leave / OT / Time Correction / Medical × 399 / 824 / 1536
- approval cards verified at **1 / 2 / 3 columns** on 399 / 824 / 1536 with no page-level horizontal overflow
- interaction QA PASS: pending/history switch, module hash filtering, table-based history and `Audit` search filtering
- approve/reject writes were intentionally not executed during read-only browser QA
- Project A remained read-only; no Production, LINE LIFF, GAS, Gateway, Neon PROD, routing or credential mutation performed.

TASK-39.8 Wave 1 final verification:
- Web typecheck `abc4a52f-6523-4e91-b68d-7ee6862a1483` = **exit 0**
- Web ESLint `caa89e29-a8d2-489d-8405-d824e10cdd40` = **exit 0**
- focused request functional regression `93c88207-2d0b-4095-8b96-e40888a57dd9` = **6 / 6 files, 32 / 32 tests PASS**
- full package/API/Web build `807c23ad-73f8-4e67-a69b-3ecfed7129d2` = **exit 0**; Next generated **22 / 22 static pages**
- Browser responsive request matrix = **12 / 12 PASS** across Leave / OT / Time Correction / Medical × 399 / 824 / 1536 with no page-level horizontal overflow
- request interaction QA PASS in all four modules: New → In Progress → History, no-match search, Clear reset, Create returns to New
- responsive toolbar verified as 1 / 2 / 4-column control layout at 399 / 824 / 1536
- Project A remained read-only; no Production, LINE LIFF, GAS, Gateway, Neon PROD, routing or credential mutation performed.

TASK-39.7 final verification:
- canonical `npm run check` task `9808736d-7b36-4ea9-9050-2f5ac2304cd8` = **exit 0**
- lint PASS; all workspace typechecks PASS
- **83 / 83 test files PASS; 574 / 574 tests PASS**
- package/API/Next production builds PASS; Next generated **22 / 22 static pages**
- Dashboard responsive QA at 399 / 824 / 1536 = no page-level horizontal overflow
- Dashboard announcements verified as final section and 1 / 2 / 3 columns at 399 / 824 / 1536
- Production-style period filter, Thai month picker and approved-period Leave visuals verified
- Calendar responsive QA at 399 / 824 / 1536 = no page-level horizontal overflow; Leave list verified below calendar with 1 / 2 / 2 columns
- representative Leave / OT / Attendance / Medical / Approvals / Reports / Employee / Platform Settings matrix = **16 / 16 PASS** at 399 / 1536
- Project A was read-only visual reference only; no Project A, Production, LINE LIFF, GAS, Gateway, Neon PROD, DNS/Firebase routing or credential mutation performed.

TASK-39.6 final verification:
- final canonical `npm run check` task `dc7c1248-f1b7-4dc4-be5b-51e281a96508` = **exit 0**
- lint PASS; all workspace typechecks PASS
- **83 / 83 test files PASS; 574 / 574 tests PASS**
- package/API/Next production builds PASS; Next generated **22 / 22 static pages**
- Browser responsive matrix **42 / 42 PASS** across 14 core affected routes at 399 / 824 / 1536 with no page-level horizontal overflow
- mobile drawer open/backdrop/close PASS
- Leave New/In Progress/History tabs PASS
- Approval pending/history tabs PASS
- approved-only Leave report QA PASS
- Dashboard inline announcement editor opens under admin capability
- final rebuilt Reports overview and Platform Settings checks PASS at 399 / 1536
- no TEST/Production data mutation, deployment, traffic switch, Project A write, or LINE LIFF/GAS/Gateway work performed.

TASK-39.5B final verification:
- Production-style Browser QA PASS for Login, Reset Password, Dashboard, Calendar, Reports, Settings, Announcement Admin, Users, Roles, Agency, Department, Entitlements, Holidays and Workdays
- final responsive QA at 399 / 824 / 1536 passed for 27 / 27 core route-width combinations with no page-level horizontal overflow
- additional Agency / Department / Entitlement / Holiday / Workday checks passed at 399 and 1536; mobile table overflow stays bounded inside table containers
- mobile sidebar open/backdrop/scroll/close behavior PASS
- focused TASK-39.5B regression = **112 / 112 tests PASS**
- final `npm run check` task `9ab2df38-2458-44fe-b651-ab870a2b44f6` = **exit 0**
- lint PASS; all workspace typechecks PASS; **83 / 83 test files PASS; 571 / 571 tests PASS**
- package/API/Next production builds PASS; Next generated 22 / 22 static pages
- no TEST/Production data mutation, deployment, traffic switch, Project A write, or LINE LIFF work performed.

TASK-39.5A:
- Manager source review completed
- Manager fixed immediate remember-username clearing when opt-out is selected
- Manager fixed Attendance writes to request fresh GPS for every Check-in/Check-out
- `npm run check` task `ffe0cf69-0984-4fb2-b814-66bfe31b00ae` = exit 0
- lint/typecheck/package/API/Next builds PASS
- **80 / 80 test files PASS**
- **512 / 512 tests PASS**
- local Login QA: remember username, opt-out clearing, password reveal, registration fields and no overflow PASS
- local operational Dashboard QA over in-memory contract responses PASS
- local Attendance QA: Check-in GPS #1 PASS; Check-out fresh GPS #2 PASS; final `09:00 → 17:00` state PASS; no overflow
- no TEST DB, Production, Project A, LINE, R2 or shared traffic mutation.

## Known Issues

1. The one-off TEST Cloud Run Job definitions created for TASK-36 remain manual-only and unscheduled. Re-running them now fails closed because their expected preflight fixture/object state no longer exists.
2. TASK-36 source runners remain in the repository as fail-closed TEST cleanup evidence; they are not API routes.
3. R2 bucket-level CORS administration remains unavailable to the least-privilege runtime object token; functional CORS was already verified and this is unrelated to TASK-36 cleanup completion.
4. Public onboarding registration UI is now implemented and locally/browser validated, but a real shared-TEST registration success remains unexecuted because TASK-36 intentionally removed synthetic fixtures and this review avoided creating new TEST data.
5. TASK-39.8 Waves 1–2 source/local/browser verification is PASS, but the latest TASK-39.6/TASK-39.7/TASK-39.8 Desktop source and narrow navigation capability fields are not automatically promoted/seeded to shared TEST or Production; coordinated promotion remains a later release-gate concern after TASK-39.8 is fully complete.
6. Future accounting-office Employee Master extensions (accounting/audit affiliations, registered bookkeeper, auditor/CPA credentials and professional-document history) are intentionally deferred until after the Leave-first system is stabilized.
7. External Prompt/Boxicons/Font Awesome dependencies remain a deployment-hardening consideration.

None of the above reopens TASK-39.8 Waves 1–2 PASS. TASK-39.8 itself remains active until Waves 3–4 and final whole-task QA are complete.

## Decisions

- Root continuity is Project B only.
- TASK-36 cleanup is exact-ID/key only; no blanket delete.
- Secrets remain Secret Manager references; no secret value is documented.
- Cleanup runners fail closed on TEST resource/count/ID/relation drift.
- No Production / Project A / shared traffic mutation.
- TASK-39 is complete: API baseline retained and TASK-35 Web candidate now serves 100% shared TEST traffic.
- Phase A is accepted PASS on TEST; this is not Production approval.
- Previous Web baseline remains available at 0% for rollback.
- TASK-39.5A employee-facing safe parity is accepted PASS; its changes are not yet on shared TEST traffic.
- TASK-39.5B is accepted PASS using purpose-specific server-authoritative permissions; unrelated permissions were not reused as write authority.
- Read-only admin actors are prevented from receiving active mutation controls through server-derived write capabilities; API authorization remains final authority.
- TASK-39.5 final Desktop Production parity verdict is PASS.
- TASK-39.6 Desktop UX/UI redesign verdict is PASS.
- TASK-39.7 Owner-requested Production visual parity polish verdict is PASS.
- TASK-39.8 Full Desktop Production UI Parity plan is active; Wave 1 My Requests and Wave 2 Approval Work verdicts are PASS.
- TASK-39.7 keeps the Leave-first IA while restoring the stronger Production visual language for Dashboard, Leave visuals, Calendar and shared Desktop surfaces.
- Desktop IA is Leave-first: module-local request/history, separate Approval Work, approved/completed Reports, grouped Employee administration, Leave Settings and distinct Platform Settings.
- Dashboard is the primary announcement surface; announcement administration remains capability-gated.
- Employee / Organization / Role & Permission are treated as future CKACE shared-platform core, but Office / Customer / Audit modules and professional credential fields are not implemented in TASK-39.6.
- LINE LIFF remains out of scope.
- Do not start TASK-40 automatically.

## Next Recommended Action

**Continue TASK-39.8 with Wave 3 — Reports Production UI Parity.**

Waves 1–2 are closed PASS and the local preview remains available for Owner review. Do not start TASK-40 until TASK-39.8 Waves 3–4 and final whole-task QA are complete and the Owner explicitly approves the release-readiness phase.

## Last Updated

2026-10-15 Asia/Bangkok
