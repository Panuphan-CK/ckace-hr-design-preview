# CKACE_HR — Project B HANDOFF

Last Updated: 2026-10-21 Asia/Bangkok

> Canonical continuity file for **Project B only**: `D:\CKACE_HR`.
> CKACE_HR is standalone. Retired-system material is historical evidence only and is not an active dependency.
> Historical pre-split snapshot: `docs/archive/project-b-split-20261008/HANDOFF_MIXED_BEFORE_SPLIT.md`.

## Project Independence Decision — 2026-10-21

The Owner retired Project A / APP_Leave from active CKACE_HR planning because CKACE_HR has progressed beyond compatibility/parity work.

Effective immediately:
- do not use Project A as a code, data, runtime, UI/UX, business-rule, migration, fallback, or acceptance reference;
- do not open new parity or compatibility tasks against Project A;
- current CKACE_HR source/contracts/schema, accepted Owner decisions, TEST evidence, `HANDOFF.md`, and `PROJECT_PLAN.md` are authoritative for active work;
- historical evidence may remain under `docs/` and `docs/archive/` for audit/history only;
- TASK-39.8 parity work is historical/superseded; active Desktop implementation continues under TASK-39.9.

## Current Goal

Phase A is complete. Continue Project B through the remaining Desktop Production parity and release gates.

**Development mode (updated 2026-10-21): CKACE_HR uses a collaborative Codex + Claude workflow. Codex Local is the active implementation environment for the current work period; Claude is paused and may resume later from the canonical GitHub/HANDOFF/PROJECT_PLAN state. CKACE_HR is fully independent from Project A / APP_Leave for active planning and implementation.**

Current state: **TASK-39.9 — Desktop full redesign = IN PROGRESS. Project A parity work is superseded and must not drive new implementation.**

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

Production deployment/cutover remains **NO-GO**. Current Desktop source/local UX/UI work does **not** authorize Production source-of-truth cutover, DNS/Firebase routing changes, Neon PROD migration/data mutation, credential escalation, destructive operations, or separately gated LINE LIFF/runtime changes.

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

**TASK-39.9 — Desktop full redesign (Owner-directed, mockup stage) — IN PROGRESS.** The Owner rejected the Wave 1–2 look and asked for a full redesign. Iterated mockups live in `docs/design/desktop-redesign-v1.html` … `v18.html`; **v18 remains the real-app reference while the newer prototype is under review** (no app code changed in this design pass). The standalone interactive review prototype at `docs/design/desktop-20261018/index.html` now uses an editorial neo-brutalist HR board: persistent top tabs, short labels, warm paper canvas, near-black chrome, electric blue/lime/coral accents, hard borders, offset shadows, and responsive card grids covering leave, OT, time correction, medical claims, attendance, profile, approvals, reports/calendar, HR administration, and announcements/notifications. It uses fictional in-memory data and does not change the Next.js app or any API. Locked Owner decisions so far:
- Platform is split into apps (HR, สำนักงานบัญชี, Audit, บุคลากร, ตั้งค่าระบบ) with an app switcher; each app has its own settings.
- Prototype review direction (2026-10-18): persistent top tabs are the primary navigation; card grids expose employee work and utility modules directly, with dialogs reserved for review/details.
- Latest redesign direction (2026-10-18): replace the previous pastel/rounded visual completely; use the new editorial neo-brutalist tokens and composition in `design-system/ckace-hr-workspace/MASTER.md` and the standalone prototype for Owner review before touching application screens.
- v18 production reference styling remains documented below for parity work; the Owner's latest prototype direction supersedes its white/soft-card treatment with the neo-brutalist board above.
- Each request type has its own page: form on top (with an approver-chain box) and that type's history below. Approvals and reports are split per type the same way; approvals are grid-only.
- Prompt font (same as Production). Approver actions on one line: อนุมัติ / แก้ไข / ไม่อนุมัติ; status for sent-back requests is "รอแก้ไข" (Production wording). Inner cards are white with only a colored top line; submit buttons take their function color; request history uses the same card grid as approval history, with a date tile; every history card opens a detail dialog modelled on Production (requester, dates, reason, quota, files, approval-steps table). Hourly leave takes a start time plus number of hours. Approved status reads "อนุมัติ". History cards show labelled rows (date once, amount, detail, approver). Profile page follows Production "โปรไฟล์ของฉัน": photo on top (click the photo to change it, no separate upload button), general info (name, surname, nickname, email username, agency, department, password), signature box.
- FlowAccount is a usability reference only; never copy its look.
Owner approved v18 on 2026-10-15 and asked to start the real web implementation.

Implementation progress (apps/web, design system in `src/app/desktop/ui/`):
- DONE: new shell `desktop-shell.tsx` (navy icon rail, per-section flyout, profile/notification popover, app switcher; same session check, capability gating and logout as before) and `ui/ck.css` (ck- prefixed, coexists with legacy globals.css).
- DONE: `/desktop/leave` rebuilt on real data (`/api/leave/me`, `/api/leave/approval-options`, existing idempotent submit/cancel). Hourly leave = start time + number of hours.
- FIXED 2026-10-15: leave quota now reserves days held by PENDING and REVISION_REQUESTED requests on create (`QUOTA_RESERVING_STATUSES` in `packages/database/src/leave-repository.ts`); `LeaveEntitlementView` gained `pending`, and `remaining = quota - used - pending`. The desktop form also blocks over-quota requests. OPEN: the LINE LIFF bridge `apps/api/src/leave/legacy-leave-liff.service.ts` still counts only APPROVED; not changed because LIFF is out of scope without Owner approval.
- Pages not yet rebuilt render unchanged inside the new shell (`REDESIGNED_PATHS` in the shell controls this).
- DONE 2026-10-16 (uncommitted): notification bell + inbox page, delegation page, send-back/withdraw/bulk-OT-approve on approvals, generic resubmit panel for OT/medical/time correction, password change card, approver-chain notice (`ui/approver-chain.tsx`) on OT/medical/time-correction forms, leave overview shows only currently valid entitlements. Verified: lint, typecheck, 762 unit tests. DONE 2026-10-16: missing-check-outs table on attendance report; five new admin pages share the v18 look via `.ck-admin` in `ui/ck.css`. TEST rollout #4 DONE 2026-10-16: images tag `m15-ux-20261016a`, revisions m15a (api), m15b (web, CSS-only follow-up `m15-ux-20261016b`) at 100%, rollback = m14a; migration `20261021_notifications` applied; Firebase cache purged; smoke OK. Calendar/profile/reports/settings pages not yet restyled still render inside the new shell with legacy styling. 2026-10-16 follow-up: TEST revisions m16a (api+web, tag `m16-dates-20261016a`, rollback m15a/m15f). All date inputs are now the click-only `DateField`/`DatePicker` (DD/MM/YYYY, Buddhist year, month/year selects). Leave: `GET /api/leave/me` returns `holidays` + `workingWeekdays`; the picker blocks weekends/holidays and the estimate excludes them; hourly leave on a non-working day counts 0 units and is rejected by the quota rule. Delegation page reworked with DatePicker. Not visually re-checked after m16a (browser pane unavailable). TEST web m16b: every not-yet-rebuilt page now gets the same shell-drawn `PageHead` band (`LEGACY_HEADS` in `desktop-shell.tsx`) and v18 panel/button/table styling via `.ck-legacy`/`.ck-admin` in `ui/ck.css`; their inner layouts (settings, management tables, benefits cards, profile) are still the older structure. TEST data seeded through the admin API on 2026-10-16: 19 holidays for 2026, medical limits 10,000/1,000, attendance policy sample. `.claude/test-admin/run-staff.sh` activates three Owner-registered TEST staff accounts (employee/manager/second SuperAdmin) - not yet run. TODO (remaining): inner layout rebuild of legacy pages; calendar/reports/settings/profile photo+signature, TEST rollout #4 (migration `20261021_notifications`).
- DONE: `/desktop/overtime` (date-range picker, 24h time fields, same idempotent submit/cancel) and `/desktop/medical` (treatment date picker with no future dates, same receipt upload/finalize-recovery logic kept verbatim, history grid with receipt download in the detail dialog).
- DONE: `/desktop/time-correction` (pick work date, check-in/out, read-only system time, corrected 24h time, reason; same idempotent submit/cancel via `/api/attendance/time-corrections`; history grid + detail dialog; blocks a duplicate PENDING for the same record/type). Menu "แก้ไขเวลา" now points here. 590 tests pass.
- DONE: `/desktop/attendance` (clock in/out with same geolocation + idempotent write logic, today box, history grid + detail dialog, link to time correction). The old correction workspace on this page was removed; corrections live on `/desktop/time-correction`.
- DONE: `/desktop/approvals` (grid of pending cards with comment + อนุมัติ/ไม่อนุมัติ, same decision endpoints/payloads and reject-needs-reason rule, per-type tabs via URL hash, search, pending/history switch, history grid + detail dialog). "แก้ไข/ส่งกลับ" is not shown because the API accepts only APPROVED/REJECTED. 595 tests pass.
- DONE (2026-10-15 late): approvals page reworked to v18 (per-type page, 3-col card grid, progress strip, history below); dashboard `/desktop` rebuilt to v18 (hero, quick actions, rings, in-progress, team this week, announcements; editor now at `/desktop/announcements/manage`). Owner review found the real web differs from v18 in many places: full comparison and backend backlog B1–B10 in `docs/design/V18_GAP_ANALYSIS.md` (long project, Owner said not to re-ask).
- DONE (2026-10-15 night): company platform foundation. `Company`, `Agency.companyId`, `Employee.companyId/managerEmployeeId`, role scopes on `UserRole` (migration `20261015_company_scopes`, additive); pure approval-route resolver `packages/business-rules/src/approval-route.ts` (tests cover the Owner organisation); DB loader `packages/database/src/approval-route-loader.ts`; leave `approvalOptionsFor` uses it only when the requester's team belongs to a company (legacy behaviour otherwise). Admin API/UI: companies, team->company, manager (loop-safe), `PUT /management/users/:id/role-assignments` (PLATFORM/COMPANY/TEAM_SET/SELF, validated, audited) in `/desktop/admin/management#organization`. Also: OT optional breaks, OT meal/transport allowance rule (50 baht at >=20:00, per-person transport at >=21:30), tenure vacation entitlement rule, `role-scope.ts`.
- TEST authenticated testing (2026-10-16, local, TEST only): TEST DB had NO roles/permissions (TASK-36 cleanup) and 14 admin permission keys used by code were in no catalog/migration. Fixed with migration `20261017_admin_permissions` (+ guard test `permission-catalog.test.ts`), RBAC baseline seeded once by the Owner-authorised one-off job `.claude/test-admin/` (run by the Owner; activated the first registered account as SUPERADMIN). New admin page /desktop/admin/approval-policies (+GET/PUT /api/management/approval-policies, rbac.admin.*): approval policies previously had NO admin UI/API. TEST now has: 2 companies, 1 team (company A), 1 department, Mon-Fri workdays, 4 default policies (ADMIN same team -> SUPERADMIN global), 1 SUPERADMIN account. Verified in browser as that account: all admin/leave/OT/reports pages render, OT .xlsx download works (valid zip), professional roles seeded (3). NOT yet exercised end-to-end: leave send-back/resubmit/withdraw, OT allowances (need a second login: requester vs approver; leave options correctly return 400 No eligible approver with only one account). TEST revisions now m12c (API+Web); Firebase cache purged after each rollout.
- Notifications (local, NOT committed/deployed; migration `20261021_notifications` NOT applied on cloud; nodemailer 6.9.16 + @types pinned in apps/api): Owner decisions 2026-10-16 = LINE first, email via company mailbox ckace.hr@gmail.com, reminders after 24h pending repeating every 24h in working hours (Mon-Fri 09:00-17:30 Bangkok). Code: pure rules `business-rules/notification-messages.ts` (event classification, Thai texts, reminder timing); `database/notification-dispatcher.ts` (`dispatchNotifications`: outbox -> in-app inbox row + LINE/email delivery per recipient, one delivery per event/channel/person, retry with 5-min backoff x5 then FAILED; waiting notices dropped when the request already moved on; delegates also notified; requester never told to approve own request; `queueOverdueApprovalReminders` sets approval_steps.lastReminderAt); `inbox-repository` + GET /api/inbox/me, POST /api/inbox/read (profile.self.read/write); senders `apps/api/src/notifications/{line-sender,email-sender}.ts`; entry `apps/api/dist/notification-job.js` (one cycle; channels without credentials are skipped so the inbox always works). NOT yet running in cloud: needs (a) Secret Manager values created by the Owner: LINE_CHANNEL_ACCESS_TOKEN (TEST LINE channel first; PROD LINE config is an Owner gate), CKACE_SMTP_USER=ckace.hr@gmail.com, CKACE_SMTP_PASSWORD (Gmail app password, needs 2-step verification on that mailbox) — never paste secrets in chat; (b) a Cloud Run Job ckace-hr-notify-test running `node apps/api/dist/notification-job.js` + Cloud Scheduler every ~10 min (infra change, Owner approval); (c) employees link LINE (line_accounts) to receive LINE; email goes to the login name when it is an email address. No UI for the inbox/bell yet. Local replica: 16/20 + 4/4 targeted checks PASS (the 4 scenario failures were test assumptions about leftover overdue requests, verified separately).
- Missing check-outs, own password change, approver delegation (local, NOT committed/deployed; migrations `20261019_profile_password_permission` and `20261020_approval_delegation` NOT applied on cloud): (1) GET /api/management/reports/missing-checkouts?from&to lists past days with a check-in and no check-out (today excluded, clock-in-exempt people excluded) — replaces the legacy flag-only job, fix is a time correction; (2) POST /api/profile/password {currentPassword,newPassword} (permission profile.self.write for all roles; current password verified incl. legacy hash; new scrypt hash, legacy hash retired; audited; existing signed session tokens are not revoked); (3) delegation: table approval_delegations + approval_steps.decidedByEmployeeId; GET /api/delegations/me, POST /api/delegations {delegateEmployeeId,startDate,endDate} (max 92 days, no overlap, delegate must hold an approve permission, permission delegation.self.manage for SUPERUSER/ADMIN/SUPERADMIN), POST /api/delegations/:id/cancel; during the range the delegate sees and can decide the delegator steps in leave/OT/medical/time correction (never their own request), timeline/leave steps show decidedByName, history lists decisions for both. Also leave endpoints now return 400 (not 500) for malformed request/step IDs. Local replica: delegation 21/21 PASS. No UI yet for any of the three.
- Approver chain preview + bulk OT approval (local, not committed/deployed, no migration): GET /api/overtime/approval-chain, /api/medical/approval-chain (admin-level requesters = autoApproved), /api/attendance/time-corrections/approval-chain return who will approve (names) so submit forms can show the chain; POST /api/overtime/approve-all approves every OT currently waiting for the caller (one transaction each, max 200, returns approved + failed[]). Local replica scenario: previews OK, bulk approve OK (employee 403, repeat call approves 0). Forms do not show the chain yet (UI later).
- Policy admin (local, not committed/deployed; migration `20261019_benefit_policy_per_claim` NOT applied on cloud): GET/PUT /api/management/medical-policy (annual limit + per-claim limit, null = 1000 default; used by medical create/resubmit cap and warning code MEDICAL_AMOUNT_CAPPED_TO_<limit>) and GET/PUT /api/management/attendance-policy (office lat/lng, radius, late time, work end, break); pages /desktop/admin/medical-policy and /desktop/admin/attendance-policy; both audited (organization.admin.*). Local replica 10/10 PASS.
- Send-back / resubmit / withdraw for OT, medical and time correction (local, not committed/deployed; migration `20261018_withdraw_permissions` adds overtime|medical|time_correction `.approved.withdraw` for SUPERADMIN; manifest + guard test updated). API only, NO UI yet (OT/medical/TC pages and approvals page have no send-back button or resubmit form; status labels added). OT: POST /api/overtime/requests/:id/resubmit (time, reason, breaks; date fixed; overlap + minutes recomputed) and /withdraw; medical: POST /api/medical/claims/:id/resubmit (sickness date, amount [capped 1000], description; annual limit re-checked excluding itself; sent-back claims keep holding the limit) and /withdraw (limit restored); time correction: POST /api/attendance/time-corrections/:id/resubmit (corrected time + reason) and /withdraw (attendance record restored to original, refused if the record changed afterwards). Decision REVISION_REQUESTED needs a comment on all three. Verified on the local replica: OT 14/14, medical 13/13, time correction 14/14 scenarios PASS. Known config gaps found: no admin UI/API for BenefitPolicy (medical annual limit; per-claim 1000 is a constant) and for AttendancePolicy (office location, late time, work end) — both must be seeded by SQL today.
- Request numbers for all kinds (local, not deployed; migration `20261018_request_numbers` NOT applied on cloud): OT-0001, MED-0001, TC-0001 (plus LEV-0001) in `RequestStatusItem`/`ApprovalHistoryItem.requestNo`, shown on approval cards and dialogs; verified on the local replica. OT/medical/time-correction detail dialogs with approver timeline still TODO.
- Leave request number + approver timeline (local, not deployed; migration `20261018_leave_request_no` NOT applied on cloud): `leave_requests.requestNo` serial shown as LEV-0001; `LeaveRequestView` now has `requestNo` and `steps` (approver name/status/decidedAt/comment) shown on the leave page card and dialog; verified on the local replica (migration applies, API returns names). OT/medical/time-correction numbers and their dialogs still TODO.
- OT allowance policy admin (local, after commit 27fa22c, not deployed): GET/PUT /api/management/overtime-allowance-policies (organization.admin.*, audited) + page /desktop/admin/overtime-allowance (meal amount, thresholds, active; transport amount stays per person); an inactive MEAL row pays nothing.
- LOCAL replica test (2026-10-16, no cloud): embedded PostgreSQL on D:\ckace-local-test (port 54329, throw-away data and accounts, scripts start-db.mjs / start-api.sh / seed-local.cjs / scenario.mjs / scenario2.mjs; stopped afterwards). All migrations applied from scratch OK. API scenario 20/20 PASS: approval options, leave create, overlap refused, send-back (comment required), resubmit (+idempotent replay), 2-step approval, withdraw (admin 403, reason required, SUPERADMIN ok, quota released), OT create/approve. Second scenario 12/12 PASS: OT .xlsx rows (paid minutes limited to check-out 21:40 = 250, transport 120, meal 50, total 170), report audited, AUDITOR role excluded from attendance stats, vacation generation by tenure (4 yrs -> 7 days). Not covered by browser clicks: UI pages for these flows were only render-checked on cloud TEST.
- DONE (2026-10-16): **TEST rollout #2** (Owner approved: continue as recommended): images tag `m13-leave2-20261016a`; migrations applied to TEST DB via `ckace-hr-migrate-test` (execution jlfj2: leave_request_no, request_numbers; admin_permissions was applied earlier from tag m12-leave1-...b); API `ckace-hr-api-test-m13a` + Web `ckace-hr-web-test-m13a` at 100%; Firebase cache purged (release 1792139572337000). Contents: request numbers (LEV/OT/MED/TC), approver timeline in all four dialogs via GET /api/requests/timeline/:id (requester or approver only), allowance policy admin page, previous commit 27fa22c work. Rollback: API `ckace-hr-api-test-m12c`, Web `ckace-hr-web-test-m12c`. Smoke: health 200, new routes 401 unauthenticated, no missing chunks. Authenticated click-through of the new UI not done (session expired; needs the Owner to log in again). Local replica verified the timeline endpoint (200 for requester/approver, 404 unknown, 400 bad id).
- DONE (2026-10-16): **TEST rollout #3** (Owner approved): commit 19e851b (committed, NOT pushed); images tag `m14-workflow-20261016a`; migrations applied to TEST DB (execution dp8rh): withdraw_permissions, benefit_policy_per_claim, profile_password_permission, approval_delegation; API `ckace-hr-api-test-m14a` + Web `ckace-hr-web-test-m14a` at 100%; Firebase cache purged (release 1792159010963000). Rollback: API/Web `...-m13a`. Smoke: health 200, new routes 401 unauthenticated, no missing chunks. Authenticated check not done (session expired). Contents: send-back/resubmit/withdraw for OT/medical/time correction (API only), delegation, approver chain preview, bulk OT approve, medical + attendance policy admin pages, missing check-out report, own password change.
- TEST rollout step that must not be skipped: Firebase Hosting (front door `https://ckrr-leave-system-2026.web.app`) caches Next prerendered HTML for a year (s-maxage), so after shifting Cloud Run traffic the CDN served old HTML pointing to deleted chunks (stuck spinner / ChunkLoadError). Purge by releasing a clone of the current hosting version (REST: versions:clone with finalize=true, then releases?versionName=...; `firebase` CLI is not logged in here). Done after rollout #1 (release 1792125859912000). Do the same after every TEST rollout. Use the web.app URL, not the *.run.app web URL (no /api proxy). Local C: drive had 0 bytes free on 2026-10-16.
- DONE (2026-10-16): **TEST rollout #1 (leave round 1)** (Owner approved TEST): Cloud Build images tag `m12-leave1-20261016a` (API build b33b5900, Web build b50a93ad, both SUCCESS; web `next build` could not finish locally due to low memory, passed in Cloud Build); 4 migrations applied to the TEST Neon DB via job `ckace-hr-migrate-test` (execution `ckace-hr-migrate-test-trjrc`: approval_route_mode, leave_revision_withdraw, overtime_allowance, professional_roles); API `ckace-hr-api-test-m12a` and Web `ckace-hr-web-test-m12a` (revision tag `m12-leave1`) serve 100% of TEST. Smoke: /api/health 200, new routes 401 without session (fail closed), web page 200. Rollback targets: API `ckace-hr-api-test-m11a`, Web `ckace-hr-web-test-m11a` (`gcloud run services update-traffic <svc> --to-revisions <rev>=100`; migrations are additive so older code keeps working). Production NOT touched. Authenticated click-through of the new flows in TEST not yet done.
- DONE (2026-10-15 night): **TEST environment updated** (Owner approved TEST): migration applied to the TEST Neon database via Cloud Run Job `ckace-hr-migrate-test` (execution `ckace-hr-migrate-test-h54x7`); API `ckace-hr-api-test-m11a` and Web `ckace-hr-web-test-m11a` (image tag `m11-company-20261015a`, revision tag `m11-company`) serve 100% of TEST traffic. Rollback targets: Web `ckace-hr-web-test-task35-20261014a`, API `ckace-hr-api-test-m9d15d` (`gcloud run services update-traffic <svc> --to-revisions <rev>=100`). Production services/DB secret not touched. Company/scope data in TEST is empty so routing is unchanged until a company is configured.
- Docs: `docs/design/` — `V18_GAP_ANALYSIS.md`, `PRODUCTION_GAS_UNDERSTANDING.md`, `PRODUCTION_RULES_SUMMARY.md`, `OWNER_DECISIONS_20261015.md`, `ORG_MODEL_AND_ACCESS.md`, `OT_RULES_AND_ALLOWANCES.md`, `PLATFORM_REPOS_REVIEW.md`.
- DONE (2026-10-16, uncommitted, not yet on TEST): per-employee `approvalRouteMode` (STANDARD / MANAGER_FIRST; migration `20261016_approval_route_mode`, additive) — `buildRouteSteps` in `approval-route.ts`; the company-aware resolver is now used by leave, overtime, medical and time correction when the requester's team belongs to a company (legacy lookups otherwise); admin API (`PATCH /management/users/:id` accepts `approvalRouteMode`) + UI select. 655 tests pass.
- Leave send-back / resubmit / withdraw (local, NOT deployed; migrations 20261016_approval_route_mode and 20261016_leave_revision_withdraw not applied anywhere): approver can send leave back with a required comment (REVISION_REQUESTED, UI button on approvals page); requester edits and resubmits via POST /api/leave/requests/:id/resubmit (returns to the step that sent it back, idempotent); POST /api/leave/requests/:id/withdraw cancels an APPROVED request, SUPERADMIN with covering scope only (permission leave.approved.withdraw, capability leaveWithdraw). Leave overlap check added. Withdraw button is in the approvals history dialog (leave, APPROVED rows; shown from server capability leaveWithdraw, reason required, API re-checks).
- Tenure vacation (local, not deployed): `packages/database/src/vacation-entitlement.ts` creates calendar-year ANNUAL entitlement from employment start (Jan 1 tenure; no start date = 5 days; never overwrites an existing/edited one); used on account approval; admin run for a year via POST /api/management/entitlements/generate-vacation {year}. Special leave per person = existing admin entitlement upsert (PUT entitlements).
- OT allowances + Excel (local, not deployed; migration 20261017_overtime_allowance NOT applied anywhere): segments store chosen breaks (`breakCodes`); `overtime_allowance_policies` (MEAL 50 baht at/after 20:00, TRANSPORT threshold 21:30; defaults seeded by migration) + per-person `Employee.overtimeTransportSatang`; GET /api/management/reports/overtime.xlsx?from&to&companyId&agencyId&employeeId&status (permission reports.management.read, audited as OVERTIME_REPORT_EXPORTED, exceljs 4.4.0 pinned; allowances only for APPROVED days with real check-out, paid minutes limited to check-out); download button on reports page; admin user row has transport amount + attendanceExempt controls. attendanceExempt (individual flag) is stored/editable. No UI yet to edit the company allowance policy rows.
- Professional roles (local, not deployed; migration 20261017_professional_roles NOT applied): tables `professional_roles` (seeded BOOKKEEPER, RESPONSIBLE, AUDITOR[attendanceExempt]) + `employee_professional_roles`; admin API GET/POST/PATCH /api/management/professional-roles and PUT /api/management/users/:id/professional-roles (users.admin.read/write, audited); page /desktop/admin/professional-roles (nav: Settings > employees) lets the Owner add roles, toggle clock-in exemption/active, assign to people. Effective exemption = individual flag OR active exempt role (`attendance-exemption.ts`); applied to the management attendance report, which is the only aggregate attendance statistic in Project B (self views and the missing-check-out job do not exist/are not statistics). Platform read contract for office/audit/RPA systems still TODO.
- NEXT (leave first): notifications (email/LINE/in-app + overdue policy); v18 pages still TODO (calendar, reports, settings, profile, delegation); migration dry run + reconciliation before any Production step (Production gate: Owner approval).
- Needs backend before the UI can match the mockup: "แก้ไข / ส่งกลับให้แก้ไข" approver decision (API accepts only APPROVED/REJECTED), human-readable request numbers, per-request approval-step timeline, team-leave feed for the dashboard, approver delegation, per-type report endpoints, profile photo/signature upload.


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

**Continue TASK-39.9 — CKACE_HR Desktop full redesign implementation using only the current CKACE_HR codebase, accepted current design direction/Owner decisions, and current TEST evidence.**

Do not reopen Project A parity work. Complete the remaining TASK-39.9 redesign/QA items, reconcile the current local/Git state, and keep TASK-40 deferred until the Owner explicitly approves release readiness.

## Last Updated

2026-10-15 Asia/Bangkok

## 2026-10-18 Flow reference and UX reset

- Read-only CUA review completed across FlowAccount business, Payroll, and MyCompany reference surfaces. Inventory is documented in `docs/design/desktop-20261018/flow-function-inventory.md`.
- Rebuilt the design prototype around a lighter FlowAccount-inspired app shell: app launcher, one top app bar, horizontal module tabs, white content panels, card grids, scoped settings, and a separate login view.
- Prototype files: `docs/design/desktop-20261018/index.html`, `style.css`, `prototype.js`, and `README.md`. No production API, authorization, or data flow was changed.
- Design-system source updated at `design-system/ckace-hr-workspace/MASTER.md` to use the new Flow-style direction.

## 2026-10-19 App launcher and Leave-first correction

- Owner clarified that each major area must behave as a separate app: the first screen is an app launcher, and clicking an app navigates into that app's workspace like FlowAccount.
- Reworked the review prototype so `#launcher` is the default route. `ระบบลางาน` is the only detailed app in this pass; Accounting, Audit, People, Announcements, and Business Settings are clearly marked as upcoming app placeholders.
- People Operations workspace routes now cover Leave, OT, attendance, time correction, medical reimbursement, approvals, and module-local settings. Each workflow has overview, list, form, and settings routes in the same app context.
- No production application/API files were changed for this UX correction. Validation was limited to the static prototype syntax and diff checks; repository-wide checks remain affected by the pre-existing LIFF errors and sandbox build/test environment failures recorded in this handoff.

## 2026-10-19 Top-tab visual reset

- Owner rejected the rail plus contextual-sidebar visual. The prototype now hides the layered side navigation and uses one compact top bar with current-app switcher, horizontal module tabs, search, notifications, and profile.
- The app launcher and People Operations workflows remain intact; the visual hierarchy is now app card → top tab → focused content card/form, with less copy and no nested navigation column.
- This is still a static UX/UI review artifact. No production application/API behavior was changed.

## 2026-10-19 Framed canvas and centralized People Operations settings

- Adjusted the review prototype canvas to a clearly gray workspace background and placed every page heading inside a white bordered card so the content no longer feels like it is floating.
- Reworked `#leave/settings` into the single People Operations settings hub. Leave, OT, attendance, time correction, medical reimbursement, approval routing, and notifications are represented in one page with module cards and shared settings rows.
- Module overview links and legacy module-settings hashes now land on the central settings hub; no production application/API behavior was changed.
- Static verification completed with JavaScript syntax, CSS brace balance, and `git diff --check`.
- Repository-wide `npm run check` was also attempted: lint/typecheck report pre-existing LIFF errors, Vitest hits sandbox `ENOENT` imports, and Next build hits the existing Turbopack process panic; none involve the static prototype files.

## 2026-10-19 Single-system People Operations Command Center reset

- Replaced the earlier app-launcher and layered navigation direction with one focused People Operations system. The entry point is now a premium Team Pulse dashboard, followed by top tabs for ภาพรวม, ลา, OT, ลงเวลา, แก้ไขเวลา, ค่ารักษา, งานอนุมัติ, รายงาน, and ตั้งค่าระบบ.
- Rebuilt the static review artifact around a midnight command bar, gradient hero, Team Pulse visual, metric cards, module card grid, action/approval panels, reports, and a central settings hub. The leave, OT, attendance, time correction, medical reimbursement, approval, report, and settings routes remain clickable in the prototype.
- Updated `docs/design/desktop-20261018/index.html`, `style.css`, `prototype.js`, `README.md`, `flow-function-inventory.md`, and `design-system/ckace-hr-workspace/MASTER.md` to describe the single-system direction. No production application, API, database, authorization, routing, or source-of-truth behavior was changed.
- Static verification for this reset: JavaScript syntax, CSS brace balance, and whitespace/diff checks pass. Repository-wide checks remain affected by the pre-existing LIFF lint/type errors, sandbox test import failures, and Turbopack build panic recorded above.

## 2026-10-19 Dashboard and single-page workflow polish

- Owner requested a fuller first-screen dashboard. Removed the “เลือกงานที่ต้องทำ” section and quick-action buttons, expanded the Team Pulse area with live insight cards, motion visuals, and moved the full team calendar to the bottom of the dashboard.
- Leave, OT, and Medical now use inline request forms plus recent activity on one page. ลงเวลา and แก้ไขเวลา are combined into one workspace with clock controls, timeline, attendance summary, and inline correction form.
- Added animated orbit/emblem visuals and module-specific icon treatments across page headings and workspaces. No production application, API, database, authorization, routing, or source-of-truth behavior was changed.
- Static verification for this polish: JavaScript syntax, CSS brace balance, whitespace, and `git diff --check` pass. Full repository checks remain affected by the existing LIFF/sandbox/Turbopack issues recorded above.

## 2026-10-19 Dashboard visual correction

- Owner rejected the dashboard's small type, text-heavy section header, plain white cards, and floating appearance. The dashboard now uses a light-blue anchored canvas, larger type, tinted gradient cards, stronger borders/inset highlights, and more visual motion.
- Removed the visible `LIVE DASHBOARD` / explanatory heading copy from the insight block. The first screen now leads with concise metrics, live visual cards, activity, team rhythm, and the team calendar at the bottom.
- No production application/API files changed. JavaScript syntax, dashboard route harness, CSS brace balance, and `git diff --check` pass.

## 2026-10-19 Dashboard v2 redesign

- Owner requested a complete second redesign of the Overview page. Replaced the previous card stack with a single command deck: oversized hero, animated Team Pulse orb, dark stat rail, live activity board, team rhythm board, and an integrated calendar with a date summary panel.
- Removed the remaining explanatory dashboard heading copy and quick-route controls from the Overview markup. The page now uses short labels, larger numbers, stronger visual hierarchy, and one anchored surface instead of disconnected white frames.
- No production app/API files changed. JavaScript syntax, dashboard route harness, CSS balance, and `git diff --check` pass.

## 2026-10-19 Content and copy redesign

- Kept the approved midnight/light-blue visual tone and rewrote the static web copy around a short, action-first voice. Overview now opens with “เช้านี้ทีมพร้อมไปต่อ”; module pages lead with today’s state, the next action, and a compact status label.
- Simplified copy across Leave, OT, attendance/time correction, medical reimbursement, approvals, reports, and settings. Replaced long explanatory phrases and repeated English labels with short Thai labels that match the workflow.
- Updated the shell brand subtitle to `TEAM WORKSPACE` and documented the content direction in the prototype README and design-system master. No production app/API files changed.
- Static verification: JavaScript syntax, route content harness, CSS brace balance, and `git diff --check` pass.

## 2026-10-19 Universal dashboard card redesign

- Owner clarified that the cards also needed a standard dashboard structure. Replaced the custom stat rail/feed/rhythm composition with a universal card system: welcome hero, four consistent KPI cards, Team Status, Activity, Workload chart, and a shared calendar card with a daily summary.
- Kept the approved midnight/light-blue tone, but gave every dashboard card the same header, period label, value, footer, spacing, and status treatment so the Overview scans like a familiar global SaaS dashboard.
- No production app/API files changed. JavaScript syntax, dashboard content harness, CSS brace balance, and `git diff --check` pass.

## 2026-10-19 Expressive dashboard restored

- Owner found the universal card pass too plain. Restored the stronger approved composition: oversized hero, animated Team Pulse orb, dark stat rail, live activity board, team rhythm visual, and integrated calendar. The newer concise content remains in place.
- Removed the universal-card CSS/markup override so the Overview returns to the richer visual direction while keeping the single-page workflow and no quick-action section.
- No production app/API files changed. JavaScript syntax, dashboard content harness, CSS brace balance, and `git diff --check` pass.

## 2026-10-19 Rich dashboard cards added

- Added the requested card set back into the expressive command deck: Welcome Hero, four KPI cards, Team Status, Activity, Workload/OT chart, and Calendar with daily summary.
- The card grid uses the richer dark gradient surfaces and motion language from the preferred dashboard pass, while keeping the concise content and the removed quick-action section.
- No production app/API files changed. JavaScript syntax, dashboard card harness, CSS brace balance, whitespace, and `git diff --check` pass.

## 2026-10-19 Orb satellite treatment

- Owner requested the three small rectangular values around Team Pulse to become circular orbiting nodes. Replaced the three `.orb-float` cards with circular satellite nodes that orbit the core at staggered phases and use teal, amber, and purple treatments.
- Preserved readable number/label hierarchy and added a reduced-motion fallback. No production app/API files changed.
- Static verification: JavaScript syntax, orbit markup harness, CSS brace balance, whitespace, and `git diff --check` pass.

## 2026-10-19 Galaxy drift motion

- Owner refined the motion direction: the satellite nodes should feel like a slow galaxy, with soft scattered drift instead of precise circular rotation. Replaced the strict orbit keyframes with long ease-in-out drift paths, slow ring breathing, and small tilt/scale changes.
- Kept the circular nodes, color accents, readable labels, mobile offsets, and reduced-motion fallback. No production app/API files changed.
- Static verification: JavaScript syntax, CSS balance, whitespace, and `git diff --check` pass.

## 2026-10-19 Ring rotation and core float

- Owner requested visible motion on the large rings and the central orb as well. Added slow continuous rotation to all three ring layers at different speeds and a gentle float/scale cycle to the core.
- Satellite nodes keep the slower irregular galaxy drift. Reduced-motion mode disables rings, nodes, and core motion together.
- Static verification: JavaScript syntax, CSS balance, whitespace, and `git diff --check` pass.

## 2026-10-19 Galaxy theme content and readability pass

- Removed the duplicate hero metadata row (09:20, 103, 98.6%) and added two orbital nodes for `พนักงานทั้งหมด 103` and `ลงเวลาครบ 98.6%`.
- Replaced the fourth KPI card from `แจ้งเตือน` with `ลงเวลาครบ 98.6%`, kept the first three KPI values, added galaxy star texture, and increased Thai type sizes across the prototype.
- Reworked the calendar summary panel to show the people on leave with names and date ranges. No production app/API files changed.
- Static verification: JavaScript syntax, dashboard content harness, CSS balance, whitespace, and `git diff --check` pass.

## 2026-10-19 Attendance and medical benefit overview layer

- Added a fifth Overview KPI for `กำลังลา` and added two operational cards below the command deck: today’s attendance split (ปกติ, มาสาย, ลงเวลาออกก่อน, ไม่ลงเวลา) and medical benefit usage.
- Applied the medical policy to the static UX copy: ฿10,000 annual allowance and no more than ฿1,000 per claim. Sample Overview/module values now stay within that ceiling.
- No production app/API files changed. Static verification: JavaScript syntax, dashboard operations content harness, CSS balance, whitespace, and `git diff --check` pass.

## 2026-10-19 Galaxy frame and KPI readability pass

- Added a six-node orbit set so the small circles cover the five KPI signals plus OT, including a new `พร้อมทำงาน 86` satellite. Added a slow twinkling star field inside the main Hero frame.
- Increased the KPI labels, values, badges, and Hero date line so Thai text is readable at a glance. The Hero now uses the current clock on render and full month names such as `ตุลาคม`.
- No production app/API files changed. Static verification: JavaScript syntax, dashboard galaxy/KPI harness, CSS balance, whitespace, and `git diff --check` pass.

## 2026-10-19 Live clock, lighter surfaces, and company announcements

- Changed the Hero date line to `จันทร์ 19 ตุลาคม 2569 เวลา HH:MM:SS` with a live one-second update loop. All Overview clock surfaces share the same live value.
- Lightened the Hero, KPI rail, work boards, insight cards, and calendar surfaces while preserving the galaxy accents. Enlarged board text so card content matches its available space.
- Added a light `ประกาศบริษัท` frame below the calendar with holiday, medical policy, and team-event announcements. No production app/API files changed.
- Static verification: JavaScript syntax, CSS balance, live-clock/dashboard content harness, whitespace, and `git diff --check` pass.

## 2026-10-19 Compact galaxy hero and unified frame treatment

- Reduced the Overview Hero height to fit the headline and orb more tightly, with the live Thai date/time line aligned at the top edge of the frame.
- Added a subtle, slow sparkle layer to the KPI rail, Team Status, Activity, Workload, attendance, medical, calendar, and company-announcement frames, with reduced-motion support.
- Reworked the calendar and `ประกาศบริษัท` surfaces from pale standalone panels into the same navy/teal galaxy gradient family as the rest of the command deck. No production app/API files changed.
- Static verification: JavaScript syntax, CSS balance, dashboard content checks, whitespace, and `git diff --check` pass.

## 2026-10-19 Softer calendar surfaces and flash sparkle

- Lightened the calendar and company-announcement panels into a softer blue/teal galaxy gradient with translucent inner cards, while keeping text contrast readable.
- Changed the Overview star layers from slow opacity breathing to short staggered flash pulses across Hero, KPI, boards, insight cards, calendar, and announcements. Reduced-motion mode still disables them.
- No production app/API files changed. Static verification: JavaScript syntax, CSS balance, dashboard sparkle harness, whitespace, and `git diff --check` pass.

## 2026-10-19 Dashboard readability and star-density pass

- Increased the number of galaxy stars across Hero, KPI, boards, insight cards, calendar, and announcements so the sparkle reads as a visible ambient layer.
- Enlarged Thai labels, values, calendar dates/events, announcement copy, and muted status text; strengthened the blue/teal contrast and added light calendar cells with dark event text so the calendar and company announcements are easier to scan. The calendar hierarchy now makes `ปฏิทินทีม` the large heading, `เดือนนี้` the subheading, and centers a larger `ตุลาคม 2569`; `COMPANY UPDATE` was removed, `ประกาศบริษัท` keeps the large accent treatment, and the Attendance/Medical English labels sit below their Thai headings.
- Added mobile-specific type sizing to keep the larger text readable without breaking the compact grid. No production app/API files changed.
- Static verification: JavaScript syntax, CSS balance, dashboard readability harness, whitespace, and `git diff --check` pass.

## 2026-10-19 Leave workspace galaxy redesign

- Replaced the generic Leave overview with a focused single-page workspace: galaxy hero, orbiting leave balance, four leave KPIs, inline request form, balance panel, upcoming team leave, and recent requests.
- Kept the leave request flow in one page with `leave-inline-form`; no production app/API behavior changed. Added responsive layouts for tablet and mobile widths.
- Static verification: JavaScript syntax, CSS balance, leave-page content harness, whitespace, and `git diff --check` pass.

## 2026-10-19 Shared galaxy treatment across modules

- Applied the galaxy workspace shell to every non-Overview route: OT, attendance/time correction, medical benefits, approvals, reports, settings, calendars, histories, request forms, and list views now share star layers, dark glass cards, larger Thai type, and readable input/table states.
- The shell automatically adds the shared `galaxy-page` variant while preserving the dedicated Overview and Leave layouts. No production app/API behavior changed.
- Static verification: JavaScript syntax, CSS balance, all-module galaxy harness, whitespace, and `git diff --check` pass.

## 2026-10-19 Module structures aligned to Leave workspace

- Replaced the top-level OT, attendance/time correction, medical, approvals, reports, and settings routes with the same single-page galaxy composition as Leave: Thai-first hero with English subtitle, orbit visual, KPI rail, one-page action area, side summary, and recent activity.
- Kept the existing prototype route names and inline form IDs so the demo interactions continue to work. No production app/API behavior changed.
- Static verification: JavaScript syntax, CSS balance, route/content harness, and prototype asset whitespace scan pass.

## 2026-10-19 Overview Hero height follow-up

- Set the desktop Overview Hero to a fixed 356px frame with a 320px orbit area. Added one shared galaxy motion contract for Overview and the Leave-first module pages: rings use an 18-second linear orbit, cores use the same 4.7-second pulse, and the metric circles use the same 18-second phase rhythm. Leave satellites now travel the same elliptical language as the Overview satellites; reduced-motion preference freezes both Heroes together. Tablet/mobile layouts keep compact orbit geometry.
- No production app, API, database, authorization, routing, or source-of-truth behavior changed.
- Prototype validation: CSS parse, `node --check docs/design/desktop-20261018/prototype.js`, and `git diff --check` pass. Repository-wide lint/typecheck still report unrelated errors in `apps/web/src/app/liff/_ckace`; 41 tests pass while 64 suites fail to resolve sandbox temporary modules; package/API builds pass, but the Next.js web build hits a Turbopack process-spawn failure. The local browser preview was not re-captured after this CSS-only adjustment.

## 2026-10-19 Verified Hero orbit alignment

- Re-checked the rendered Overview, Leave, and OT pages through a local HTTP preview. Overview and Leave were moving, but their ring progress was not visibly legible as one system and module Heroes still retained the older orbit selectors.
- Added a shared moving ring trace and applied the same ring, core-pulse, satellite-phase, and reduced-motion contract to Leave and all Leave-based module Heroes. The visual check now shows the ring arc and metric circles progressing together on Overview and Leave.
- No production app/API behavior changed. Prototype validation: CSS parse, JavaScript syntax, whitespace, and `git diff --check` pass; browser preview re-captured after the CSS fix.

## 2026-10-19 Overview orbit geometry verification

- Browser inspection at desktop and narrow viewport showed the metric circles following one ellipse while the ring outlines were rotating independently, so the paths visibly separated.
- Centered all Overview rings on the core, matched their ellipse dimensions to the metric orbit at desktop/mobile sizes, and changed the shared ring motion to a restrained breathing scale while the bright arc carries the rotation. The circles now remain on the ring path throughout the motion.
- No production app/API behavior changed. Static checks and a two-frame browser re-check pass.

## 2026-10-19 Overview cloud visual redesign

- Replaced the rendered Overview Hero orbit visual with a cloud field: the circles, ellipses, and ring paths are removed from the visible dashboard and replaced by pastel cloud blobs for the core readiness metric and six supporting KPIs.
- Each dashboard render randomizes cloud position, width, height, scale, drift direction, timing, and stacking order within safe visual anchors. Clouds drift gently without orbiting or rotating, while the metric text stays readable inside each cloud. Leave and module pages retain their own workspace visuals.
- No production app/API behavior changed. Validation: `node --check docs/design/desktop-20261018/prototype.js`, CSS parse, `git diff --check`, and desktop browser reload comparison confirmed the cloud field changes size/position between loads.

## 2026-10-19 Overview cloud silhouette and safe-layout pass

- Refined the Hero clouds to match the supplied reference: a flatter cloud base with three rounded puffs, pastel fills, dark readable KPI text, and soft shadows instead of oval blobs.
- Expanded the cloud field across the full Hero frame while reserving the Thai headline area. Desktop and compact layouts use separate safe anchors so clouds do not cover the heading or each other’s KPI text; mobile metrics use smaller randomized dimensions and lower stacked anchors.
- Browser re-check passed at desktop and narrow viewport after multiple reloads; sizes and positions change per render and the cloud values remain legible. Prototype syntax, CSS parse, and diff checks pass. Repository-wide lint/typecheck/build remain blocked by unrelated existing `_ckace` errors, Turbopack process-spawn failure, and sandbox ENOENT test imports (279 tests passed; 59 suites failed to resolve).

## 2026-10-19 Overview Aurora Glass Garden redesign

- Replaced the rejected cloud and prism visuals in the rendered Overview Hero with Aurora Glass Garden: soft asymmetric glass data panes, pastel-dark KPI tones, diagonal aurora light beams, and small diamond sparks. No circles, ellipses, orbital rings, or cloud silhouettes remain in the visible Hero field.
- Desktop anchors spread the six KPI panes across the full right/center field while reserving the Thai headline. Each render randomizes size, position jitter, scale, drift, rotation, timing, and stacking order; panes float with translate/opacity-only motion and freeze under reduced-motion preferences.
- Desktop browser preview was reloaded and checked at the real viewport; KPI values and Hero copy remain readable without overlap. Prototype JavaScript syntax, CSS parse, and `git diff --check` pass. No production app/API behavior changed.

## 2026-10-19 Final Overview Galaxy Orbit direction

- Restored the Overview Hero to the requested Galaxy Orbit language after review: pastel KPI satellites orbit the central readiness circle while three aligned elliptical rings breathe and trace the same shared rhythm. The rejected Aurora Glass Garden is disabled in the rendered Overview.
- Desktop browser preview was reloaded at the real viewport and checked across two frames; the satellites visibly change orbit position while the Hero copy remains clear. No production app/API behavior changed.

## 2026-10-19 Overview Galaxy Orbit centre alignment

- Re-centered all Overview rings on the Hero orbit core and replaced the separated satellite motion with one shared horizontal ellipse. The core sits at the centre of the right visual lane; all six pastel KPI satellites follow the same x/y path and phase around it.
- Added a slow visible ring trace plus restrained ring breathing, with the orbit expanded across the Desktop Hero while keeping the left Thai copy clear. Desktop browser bounding-box inspection confirms all ring centres match the core and two-frame capture confirms satellite movement.
- Prototype JavaScript syntax, CSS parse, and `git diff --check` pass. No production app/API behavior changed.

## 2026-10-19 Overview Galaxy Orbit centering pass

- Shifted the complete orbit group further toward the Hero centre while preserving a clear buffer from the left Thai copy. Ring trace, ring breathing, and satellite orbit now use the same 22-second rhythm.
- Desktop browser inspection confirms the core and all rings remain co-centered after the shift; no production app/API behavior changed.

## 2026-10-19 Overview Galaxy Orbit slow-circle pass

- Widened the three Desktop Hero orbit tracks and slowed ring/satellite motion to a 60-second rhythm. Satellite phase delays were rescaled so the six KPIs remain evenly distributed around the path instead of clustering.
- Changed the desktop KPI satellites from oval pills to equal 96px circles and slowed the shared motion to an 80-second rhythm. Phase delays remain evenly distributed while the central core, shared centre, left-copy buffer, and pastel theme stay intact.

## 2026-10-19 Overview Hero compact-height pass

- Reduced the Desktop Hero card height from 356px to 340px and tightened its vertical padding so the Thai headline and supporting message sit in a more compact card.
- Kept the 320px orbit field co-centered with the readiness core; the rings, circles, and left-copy buffer remain visible in the Desktop preview. No production app/API behavior changed.

## 2026-10-19 Overview Hero copy pass

- Replaced the large “เช้านี้ทีม / พร้อมไปต่อ” Hero headline with `TEAM OVERVIEW` and the concise Thai subtitle `สถานะทีมและจัดการงานสำคัญ`.
- Added a stronger Prompt headline treatment and readable Thai subtitle styling while keeping the live date, compact Hero height, and Galaxy Orbit layout unchanged.

## 2026-10-19 Overview Hero special typography pass

- Split the `TEAM OVERVIEW` heading into a navy `TEAM` word and a teal-to-violet `OVERVIEW` accent for a more distinctive Galaxy treatment.
- Kept the Thai subtitle in a heavier, readable Noto Sans Thai weight with a soft teal shadow; no content or production app/API behavior changed.

## 2026-10-19 Overview Hero softer type pass

- Softened the Hero lettering by switching the heading to Noto Sans Thai at a lighter 700 weight, tightening tracking, and reducing the Thai subtitle to weight 500.
- Preserved the two-tone Galaxy heading colors and all Hero/orbit geometry; the change is typography-only.

## 2026-10-19 Overview Hero special font pass

- Added the Mitr Google font and applied it to the Hero heading and Thai subtitle for a rounded, more distinctive treatment.
- The two-tone TEAM/OVERVIEW colors, orbit geometry, and dashboard content remain unchanged.

## 2026-10-19 Overview Hero date format pass

- Changed the live Hero date line to the full Thai format `วันจันทร์ที่ 19 ตุลาคม 2569 เวลา HH:MM:SS นาฬิกา`, with the time continuing to update every second.
- Applied Mitr typography and tabular numerals to the date line and kept it aligned at the top of the Hero copy block.

## 2026-10-19 Overview Hero static metrics and top-date pass

- Froze the six Overview metric circles on a calm, readable constellation and populated each with the full Thai label/value pairs, including `พนักงานทั้งหมด 103 คน`, `พร้อมทำงานวันนี้ 86 คน`, `ลาวันนี้ 6 คน`, `รออนุมัติ 8 รายการ`, and `ลงเวลาครบวันนี้ 98.6%`; the existing OT metric remains as an additional full satellite.
- Moved `TEAM OVERVIEW` to the upper-left identity position, moved the live Thai date/time to the Hero's upper-right, removed the visible `นาฬิกา` suffix, and reduced the Desktop Hero to 328px.
- Strengthened the Galaxy star layer with larger visible points and a dedicated blinking animation while retaining reduced-motion support. No production app/API behavior changed. Validation: JavaScript syntax, CSS parse, diff whitespace, and desktop browser re-check pass.

## 2026-10-19 Overview Hero centered orbit pass

- Centered the entire Overview ring, core, and static satellite group on the geometric center of the Desktop Hero rather than leaving it in the right grid lane.
- Kept the left Hero copy above the orbit layer and verified the core center matches the Hero center within sub-pixel rounding in the real desktop viewport. No production app/API behavior changed.

## 2026-10-19 Overview Hero orbit balance pass

- Re-spaced the six static satellites as even points on one ellipse: upper/lower pairs mirror each other and the top/bottom metrics share the same vertical radius.
- Tuned the three centered rings into balanced stepped tracks with symmetric tilt angles, while preserving the compact 328px Hero and left-copy clearance. Desktop screenshot and geometry checks pass.

## 2026-10-19 Overview Hero oval orbit trial

- Tested a more pronounced horizontal oval treatment for the Galaxy Hero: the three concentric tracks are flatter and the six metric satellites use readable horizontal ovals while the central readiness metric stays circular.
- Preserved the shared centre, left-copy clearance, and pastel card contrast. Desktop screenshot and CSS/JavaScript validation pass.

## 2026-10-19 Overview Hero Leave-style ring pass

- Matched the Overview ring language to the Leave Hero: one tilted teal track, one reverse lavender centre track, and one tilted amber track share the same slow orbit motion, glow treatment, and concentric centre.
- Kept the Overview's six oval metric satellites and circular readiness core unchanged. Desktop comparison against the Leave page shows the same Galaxy rhythm without covering the left copy.

## 2026-10-19 Overview Hero Leave-style stars and pulse pass

- Added three white/teal sparkle points using the Leave Hero star treatment, positioned around the Overview orbit so they stay away from the Thai copy.
- Added a soft staggered pulse to the Overview core and six satellite metrics, matching the Leave Hero's breathing feel while keeping each metric anchored to its orbit position.

## 2026-10-19 Overview Hero metric copy pass

- Simplified the Hero labels to `ลงเวลา 98.6%` and `พร้อมทำงาน 86 คน`, and removed the duplicate `พร้อมทำงาน` line from the centre core.
- Normalized the six oval metric font sizes and opened the left/right satellite positions slightly for clearer separation from the core.

## 2026-10-19 Overview Hero oval typography pass

- Increased the oval labels to a shared 10px bold style and set every oval value to the same 15px extra-bold weight for a consistent visual hierarchy.

## 2026-10-19 Overview Hero equal oval pass

- Locked all six satellite frames to the exact same 110×76px oval geometry, removing the wider attendance exception.
- Re-applied the shared label/value font sizes and weights after the geometry lock; Desktop screenshot confirms a uniform constellation.

## 2026-10-19 Overview Hero fixed type scale pass

- Locked every satellite label to the same 10px bold Prompt style and every metric value to the same 15px extra-bold style, with shared line-height and tabular numerals.
- Moved the breathing animation from the satellite containers to their inner halo so pulse timing no longer makes the text appear to change size. Prototype-only scope; no production app/API behavior changed.

## 2026-10-19 Overview Hero uniform orbit copy pass

- Set both text lines inside every satellite to the exact same 14px, 800-weight Prompt scale so labels and values have one consistent visual size.
- Kept the fixed satellite transform and halo-only pulse; the readable copy no longer scales during the Galaxy animation.
- Widened the shared satellite frame to 132×80px and removed label clipping so `พนักงานทั้งหมด` and the other full Thai labels remain visible at that shared size.

## 2026-10-19 Overview Hero core type alignment pass

- Matched `ความพร้อมทีม` to the satellite copy with Prompt 14px/800 styling and the same dark-navy ink.
- Unified the core value, percent mark, and satellite label/value color so adjacent lines no longer look like different text systems.

## 2026-10-19 Overview dashboard card hierarchy pass

- Reordered dashboard card headings so English labels sit above Thai titles, with teal, purple, or amber gradient text matched to each card family; the KPI rail now carries the same English-over-Thai structure.
- Removed the duplicate OT `+12%` badge, kept the single header badge, changed `ชั่วโมง OT สะสม` to dark text, and recolored the weekday bars with a distinct pastel palette beginning with purple for Saturday.
- Changed Recent Activity descriptive copy to dark text while preserving the existing status pill colors.
- Put the calendar and company announcement supporting copy after the English eyebrow and Thai title so every card keeps the same vertical reading order.

## 2026-10-19 Overview English-first heading scale pass

- Increased the English card labels and reduced the Thai supporting titles across KPI, board, insight, calendar, and announcement cards so the English-first hierarchy is visually clear.

## 2026-10-19 Overview OT badge correction

- Restored the single `+12%` change-rate badge at the upper-right of the OT summary card; the duplicate inline pseudo-element remains hidden.

## 2026-10-19 Overview bilingual header alignment pass

- Aligned the heading icons for Attendance, Medical, Team Calendar, and Company Update to the left of both English and Thai lines, matching the Team Status card; English labels remain larger than the Thai titles.

## 2026-10-19 Overview calendar galaxy content pass

- Renamed the dashboard calendar title to `วันลาและกิจกรรมของทีม` and the announcement title to `ข่าวสำคัญที่ทีมควรรู้`.
- Added a compact monthly pulse row for today and leave, plus galaxy-style star points, orbit glow, pastel event chips, and an emphasized today cell.

## 2026-10-19 Overview calendar cleanup pass

- Removed all WFH references because the product does not support WFH, including the dashboard calendar event, hidden legend, leave-calendar event, and pulse summary item.
- Removed redundant calendar and announcement supporting copy and the top activity-count note.
- Muted previous/next month controls and styled Saturday/Sunday headers and cells as gray holidays on desktop.
## 2026-10-19 Overview activity and OT framing pass

- Replaced Recent Activity text statuses with framed status icons (spark, clock, and check), removed the visible ใหม่ label, and shortened เบิกค่ารักษา to ค่ารักษา.
- Added a shared score-style frame to the OT summary with วันนี้ 10.5 ชั่วโมง before 42.5 ชั่วโมง OT สะสม, keeping the existing +12% header badge and pastel chart.
## 2026-10-19 Overview activity and calendar density pass

- Matched Recent Activity status icons to the 24px type icon size, kept each status distinct, and changed the pending state to an alert icon.
- Kept every activity field on a single compact line with ellipsis only when the card width requires it.
- Reflowed the OT totals into one smaller inline row, using the same pastel yellow/green surface and border family as the OT card.
- Removed the dashboard calendar today/leave pulse frame so the calendar opens directly into its month grid.
## 2026-10-19 Overview activity spacing and OT chart pass

- Added a protected right gutter to each activity card so copy cannot run into the status icon.
- Removed the OT totals frame, equalized the inline label/value typography, and returned the freed vertical space to the chart.
## 2026-10-19 Overview activity detail gutter correction

- Limited the status-icon gutter to each activity card's title line; person, date, duration, and reason rows now reclaim the full card width while staying single-line.
## 2026-10-19 Overview activity full-width copy pass

- Removed the remaining copy truncation and right padding from Recent Activity so each card can use its full width; the status icon remains layered separately in the upper-right corner.
- Preserved single-line fields with compact tracking so dates, durations, and reasons stay inside the card.
## 2026-10-19 Overview activity typography pass

- Increased Recent Activity type labels to 12px and detail rows to 10px with stronger weight and compact tracking so the three-card grid remains one-line and readable.
## 2026-10-19 Overview activity 16px readability pass

- Set the Recent Activity grid type and detail copy to the requested 16px scale with compact tracking so the enlarged text remains inside each desktop card.
## 2026-10-19 Overview activity detail type scale pass

- Set Recent Activity person, date, duration, and reason lines to 14px regular weight; the activity type remains the larger bold heading.
## 2026-10-19 Overview activity WIP text lock

- Locked Recent Activity rows to each card boundary: copy is clamped to one line with ellipsis and cannot bleed under the status icon or outside the card.
## 2026-10-19 Overview activity wrapping pass

- Revised the WIP text lock so long activity copy wraps to the next line inside the card instead of truncating with an ellipsis or spilling outside the boundary.
## 2026-10-19 Overview natural activity wrapping pass

- Removed arbitrary character-level breaks from activity copy; text now consumes the available line naturally before moving to the next line within the card.## 2026-10-19 Overview activity edge-wrap correction

- Restored the original three-column desktop card proportions after the attempted widening pass.
- Removed the reserved right gutter from activity rows; detail copy now uses the full card width and wraps naturally to the next line while remaining inside each card.## 2026-10-19 Overview activity type scale correction

- Reduced Recent Activity type labels by one step to 15px so labels such as ลาพักร้อน sit more comfortably beside their icons; the detail rows remain 14px regular.## 2026-10-19 Overview activity heading wrap correction

- Kept activity names such as ลาพักร้อน on one complete line by removing the title-only right gutter; supporting detail rows still use the full card width and wrap naturally.## 2026-10-19 Overview statistics row redesign

- Added a Leave Statistics board before the OT section, with today’s six leave count, three leave-type breakdowns, and the eight-item approval queue.
- Moved OT Summary into the same three-card row as Attendance / Today and Medical / Benefit.
- Reworked Attendance and Medical into scannable statistic cards with summary scores, progress, and compact metric tiles while preserving the pastel galaxy card system.
## 2026-10-19 Overview OT and attendance statistic refinement

- Put OT Summary before Attendance / Today in the shared statistics row.
- Enlarged the inline OT totals to 15px, removed duplicate medical claim/pending tiles, and strengthened the four attendance metrics with distinct pastel surfaces.
- Kept the six overview cards on distinct pastel color families.

## 2026-10-19 Overview card consistency pass

- Removed the duplicate medical progress label from the dashboard card.
- Changed the Attendance header badge to the date label `19 OCT 26` and matched the `86 / 103 คน` progress text to the `83.5%` scale.
- Standardized the Leave Statistics approval badge geometry and white surface, while giving Attendance a distinct rose score accent.

## 2026-10-19 Leave Statistics color alignment

- Shifted Leave Statistics heading, icon, score, and approval badge from purple to the dashboard card's sky-blue family.
- Matched each leave progress bar to its corresponding purple, amber, or teal status dot.

## 2026-10-19 Attendance and medical progress alignment

- Applied a pink accent to Attendance / Today, its icon, completion score, and `86 / 103 คน` progress label.
- Moved Medical / Benefit progress directly below its score, with green endpoint labels `38.4%` and `61.6%` before the allowance breakdown.

## 2026-10-19 OT total alignment

- Centred the inline `วันนี้ 10.5 ชั่วโมง · ชั่วโมง OT สะสม 42.5 ชั่วโมง` summary within the OT card without moving the chart.

## 2026-10-19 Recent Activity typography alignment

- Matched the Recent Activity detail rows for employee, date, duration, and reason to the status-row typography used by `พร้อมทำงาน 86 คน`.
- Kept the four detail rows readable with natural wrapping inside each activity card.

## 2026-10-19 Leave and medical metric alignment

- Changed Leave Statistics progress endpoints from raw counts to `50%`, `33%`, and `17%` so they read like the Team Status percentages.
- Matched the Team Status `103 คน` badge to the card's teal accent.
- Put each Medical / Benefit usage label and amount on one line: `ใช้ไป ฿3,840` and `คงเหลือ ฿6,160`.

## 2026-10-19 Medical endpoint accent

- Changed the Medical / Benefit right progress endpoint `61.6%` to the dashboard purple accent while keeping `38.4%` green.

## 2026-10-19 Medical allowance copy hierarchy

- Changed the Medical / Benefit badge to `วงเงิน ฿10,000 / ปี`.
- Stacked `ใช้ไป` over `฿3,840` and `คงเหลือ` over `฿6,160`, removing the explanatory sub-lines.

## 2026-10-19 Dashboard metric hierarchy

- Centred the Medical / Benefit amounts inside their tiles.
- Reordered Attendance / Today tiles so each status label is on the first line and its number is on the second line.

## 2026-10-19 Attendance progress accent

- Changed the Attendance / Today progress track and fill to the same rose-pink accent used by its icon, heading, score, and labels.

## 2026-10-19 Recent Activity readability

- Increased spacing and contrast in the activity details so employee, date, duration, and reason read as distinct rows.
- Gave the employee name a stronger hierarchy while keeping all copy inside each activity card.

## 2026-10-19 Hero date day-color coding

- Added Thai weekday color coding to the live Hero date and clock (Monday uses a readable gold accent; other days switch automatically).

## 2026-10-20 Live Hero date rollover fix

- Added a live date node to the Hero kicker so the weekday, Buddhist date, and day-color class refresh with the existing one-second clock timer; crossing midnight no longer requires F5.

## 2026-10-20 Personal leave statistics card

- Added a dashboard card for personal leave rights with total allowance, used days, remaining days, and separate vacation, personal business, and sick leave breakdowns.
- Flattened the card to a single Leave Statistics-style frame, using divider rows and progress bars instead of nested cards.
- Reworked the card to match the Leave Statistics pattern directly: one full-width blue frame, one total-rights score panel, and three leave-type progress rows before the OT/attendance/medical cards.
- Updated the personal leave card to a soft rose theme, changed the badge to `ปี 2569`, removed the total summary frame, and added explicit `ใช้ไป 25%` / `คงเหลือ 75%` endpoints with remaining-day labels per leave type.
- Switched the personal leave card to a distinct coral-orange accent and moved calculated used/remaining percentages into each vacation, personal business, and sick leave progress row.
- Moved each leave percentage pair below its progress bar to match the MEDICAL / BENEFIT card hierarchy.
- Matched each percentage label color to its leave progress bar: purple for vacation, amber for personal business, and teal for sick leave.
- Increased the leave progress bars to the same 12px height as TEAM STATUS, color-coded the leave titles, and added `เหลือสิทธิ์ลา 12 วัน` to the vacation row.
- Changed the personal business leave bar and its labels to a coral-red accent for contrast against the orange card background.
- Added remaining leave-rights notes to all three rows: 12 days vacation, 2 days personal business, and 4 days sick leave.
- Moved used and remaining percentages inside the filled and neutral portions of each leave progress bar, leaving only the percentage values visible.
- Applied the same inline percentage treatment to ATTENDANCE / TODAY and MEDICAL / BENEFIT, with taller bars and italic, color-matched remaining percentages.
- Updated the vacation row to `ลาพักร้อน ใช้ไป 3 / 15 วัน` and aligned each personal-leave progress bar on the same desktop row as its leave text.
- Reflowed the desktop overview cards into two paired rows: TEAM STATUS with RECENT ACTIVITY, then LEAVE STATISTICS with MY LEAVE STATISTICS.
- Moved Attendance's `86 / 103 คน` into the filled progress segment and `83.5%` to the right endpoint, removing the former `16.5%` and the count below the bar.
- Added a matching `คงเหลือรวม 18 วัน` score panel to MY LEAVE STATISTICS and reordered each row to leave type, progress, then `คงเหลือ` days.
- Increased the personal leave, Attendance, and Medical progress tracks to 28px while keeping the percentages centered and visible.
- Updated the personal leave copy to `ลากิจ ใช้ไป 1 / 3 วัน` and `ลาป่วย ใช้ไป 1 / 5 วัน`; restored its compact 16px tracks and replaced the gray remainder with leave-type pastel gradients. Attendance and Medical retain 28px tracks.
- Warmed the `คงเหลือรวม 18 วัน` score text to dark brown with a deeper orange number for legibility on the peach panel.
- Recolored the remaining progress tracks in TEAM STATUS, LEAVE STATISTICS, and MEDICAL / BENEFIT with matching pastel tones; widened MY LEAVE STATISTICS tracks and aligned its dots and row typography.
- Validation: `node --check` and `git diff --check` pass. `npm run check` stops at existing LIFF lint errors (43 errors outside the dashboard prototype), so typecheck/tests/build did not run in that chained command.
- Unified leave-type colors in both paired dashboard cards: vacation purple, business leave green, sick leave red; changed personal leave remaining labels from `คงเหลือ` to `เหลือ`.
- Corrected the inline used-percentage labels in MY LEAVE STATISTICS to white on each colored fill; remaining percentages retain their leave-type color.
- Matched TEAM STATUS row text and percentages to their teal, purple, and amber progress colors.
- Changed the OT SUMMARY +12% corner badge to the same white pill surface as the other dashboard card badges.
- Matched MY LEAVE STATISTICS row label and remaining-day typography to LEAVE STATISTICS by using Noto Sans Thai at the same 13px/800 weight.
- Reflowed the desktop Overview prototype so RECENT ACTIVITY is a full-width horizontal card above TEAM STATUS, LEAVE STATISTICS, and MY LEAVE STATISTICS; removed the five duplicate KPI rail cards. Verified in the local Desktop preview at 1440px.
- Restored the Owner-selected two-row Overview order: TEAM STATUS beside RECENT ACTIVITY, then LEAVE STATISTICS beside MY LEAVE STATISTICS. KPI rail remains hidden. Desktop preview verified at 1440px.
- Adjusted Overview density: TEAM STATUS and LEAVE STATISTICS now use one-third-width cards matching OT SUMMARY; RECENT ACTIVITY and MY LEAVE STATISTICS span the full desktop row. Preview verified at 1440px.
- Finalized the requested two-row 1+2 grid: TEAM STATUS with two-column RECENT ACTIVITY above LEAVE STATISTICS with two-column MY LEAVE STATISTICS. Desktop preview verified at 1440px.
- Redesigned MY LEAVE STATISTICS as a three-tile pastel grid: vacation, sick leave, and business leave each show the used count, entitlement, progress, and remaining days in the existing dashboard style. Preview verified at 1440px.
- Replaced the three personal-leave tile icons with the supplied 3D artwork, added Thai/English labels, white entitlement badges, and expanded progress bars with inline percentages plus used/remaining day labels above each track.
- Updated MY LEAVE STATISTICS so all three tiles show English above Thai, removed entitlement copy, and match the MEDICAL / BENEFIT progress treatment with used and remaining day labels above each percentage bar.
- Validation: `node --check` and `git diff --check` pass for the prototype changes; repository lint/typecheck still report pre-existing LIFF errors, tests hit 61 sandbox-path `ENOENT` failures, and the production build hits the existing Turbopack CSS worker panic.
- Polished the three MY LEAVE STATISTICS tiles so each icon sits beside its English/Thai title, the percentages use Medical's italic bold treatment, and entitlement badges are fully hidden.
- Restored consistent top-right entitlement pills (`สิทธิ์ 15 วัน`, `สิทธิ์ 3 วัน`, and `สิทธิ์ 5 วัน`) on all three MY LEAVE STATISTICS tiles and widened the icon-to-title gap to prevent overlap. Desktop preview verified at 1440px.
- Validation after the entitlement and spacing update: `node --check` and `git diff --check` pass; repository lint still reports the existing 43 LIFF errors, typecheck reports existing LIFF errors, tests report sandbox-path `ENOENT` failures, and the production build still hits the existing Turbopack CSS worker panic.
- Rebalanced the three personal-leave tile headers by removing the legacy absolute icon offset, aligning each artwork box with its bilingual title, and adding a calendar icon to each color-matched entitlement pill.
- Updated the Overview Hero constellation with `พร้อมทำงาน 86/103 คน`, `ค่ารักษา ฿3,840`, and `OT สะสม 42.5 ชั่วโมง`; added vacation, business-leave, and sick-leave oval satellites and moved the wider horizontal ellipse into the right visual lane. Desktop preview verified at 1800px.
- Matched the three new leave satellites to the existing Hero ovals at 132×80px with the same 14px bold two-line metric type, then opened their positions slightly to keep each badge separated.
- Matched the leave satellite fills to the existing purple, green, and red Hero gradients and changed all three frames to the shared white border, neutral navy text, and matching category shadow treatment.
- Recolored the three new Hero leave ovals to unique pastel hues (gold, mint, and orchid) so none repeats an existing metric, and shifted the complete orbit group 36px right while keeping every badge within the Hero bounds.
- Clustered the vacation, business-leave, and sick-leave ovals together on the right side of the constellation in a compact diagonal arrangement, with clear spacing from OT, attendance, and the live timestamp.
- Rebalanced all nine Hero ovals into a shared three-level ellipse layout: three across the top, four around the centre, and three across the bottom, while preserving the clear left copy lane and Hero bounds.
- Tightened the Hero constellation so vacation, business-leave, and sick-leave ovals stay together as a right-side leave cluster while the six operational metrics remain evenly distributed around the inner ellipse.
- Re-spread the six operational Hero metrics into an asymmetric orbital layout instead of a fixed row pattern, while keeping the three leave metrics clustered and every oval within the Hero bounds.
- Repositioned Medical to the owner-marked left slot, moved Ready Today to Medical's former slot, moved OT to Ready Today's former slot, and redistributed the three leave ovals around the vacated OT area.
- Fine-tuned the final Hero spacing: operational ovals now follow a balanced asymmetric arc, the leave trio keeps a clean triangular cluster, and all oval gaps remain collision-free.
- Added a Desktop-only Hero layout editor: drag any satellite, use arrow keys for fine movement, save positions per browser, and reset to the CSS arrangement.
- Matched the secondary Desktop workspaces to the Overview visual system: light pastel galaxy surfaces, shared card borders, readable dark content, and consistent progress, timeline, request, approval, report, and settings panels.
- Started the Leave workspace detail pass: added an Overview-level leave balance board by leave type, a weekly team leave map with date states, and a clearer planning action while preserving the existing request, balance, upcoming, and history flows.
- Aligned the Leave page to Overview point by point: matched the 328px Hero baseline and orbital lane, rebuilt the first two rows as 440/898px pastel boards at 299px height, and matched bilingual heading hierarchy, gradients, progress bars, activity cards, team map, and three personal leave tiles.
- Completed the visual parity pass with Overview card tones, border colors, activity row geometry, title letter spacing, Thai font metrics, and the live date/time kicker structure.
- Kept Leave history on the same page: exposed the styled `LEAVE HISTORY` panel below the action area, routed `leave/requests` back to that page, and added in-page scrolling from Recent Activity.
- Reworked the Leave action area into an Overview-style desktop grid: the request form spans two columns, balance and upcoming leave sit beside it, and history spans the full row.
- Converted the three Leave history records into matching desktop sub-cards inside the full-width history board; tablet and mobile layouts retain the readable stacked list.
- Reordered the Leave home flow so the request card is the first actionable board after the Hero, with reference-aligned type, date, duration, detail, attachment, approval, and submit steps before the overview statistics.
- Reframed the Leave home page as three explicit desktop sections—request, leave statistics, and leave history—with in-page section navigation and statistics boards grouped by personal/team context.
- Rebuilt the Leave desktop workspace from the ground up with a focused request form, balance and upcoming-leave side rail, dedicated statistics cards, entitlement breakdown, and filterable history table.
- Added a clearer Desktop Overview Hero layout editor: all nine metric ovals are named in a picker, selectable, draggable, keyboard-adjustable, saveable, and resettable as one layout.
- Added a clearer Desktop Overview Hero layout editor: all nine metric ovals are named in a picker, selectable, draggable, keyboard-adjustable, saveable, and resettable as one layout.
