# CKACE_HR — Project B HANDOFF

Last Updated: 2026-10-21 Asia/Bangkok (see docs/HANDOFF_20261021.md)

> Canonical continuity file for **Project B only**: `D:\CKACE_HR`.
> Project A `D:\APP_Leave` must remain separate.
> **2026-10-21: current state, deploy routine and open items are in `docs/HANDOFF_20261021.md`. The "Current Goal" below is stale.**
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

**TASK-39.9 — Desktop full redesign (Owner-directed, mockup stage) — IN PROGRESS.** The Owner rejected the Wave 1–2 look and asked for a full redesign. Iterated mockups live in `docs/design/desktop-redesign-v1.html` … `v18.html`; **v18 is the current Owner-iterated direction** (no app code changed yet). Locked Owner decisions so far:
- Platform is split into apps (HR, สำนักงานบัญชี, Audit, บุคลากร, ตั้งค่าระบบ) with an app switcher; each app has its own settings.
- Left navy icon rail only (no top bar): profile with notification badge first, dashboard next, app switcher and settings at the bottom; clicking an icon opens a white flyout menu.
- White page backgrounds, colored structure: tinted header strip with left bar and bottom line on every box/card, soft (light-tinted) buttons everywhere.
- Each request type has its own page: form on top (with an approver-chain box) and that type's history below. Approvals and reports are split per type the same way; approvals are grid-only.
- Prompt font (same as Production). Approver actions on one line: อนุมัติ / แก้ไข / ไม่อนุมัติ; status for sent-back requests is "รอแก้ไข" (Production wording). Inner cards are white with only a colored top line; submit buttons take their function color; request history uses the same card grid as approval history, with a date tile; every history card opens a detail dialog modelled on Production (requester, dates, reason, quota, files, approval-steps table). Hourly leave takes a start time plus number of hours. Approved status reads "อนุมัติ". History cards show labelled rows (date once, amount, detail, approver). Profile page follows Production "โปรไฟล์ของฉัน": photo on top (click the photo to change it, no separate upload button), general info (name, surname, nickname, email username, agency, department, password), signature box.
- FlowAccount is a usability reference only; never copy its look.
Owner approved v18 on 2026-10-15 and asked to start the real web implementation.

Implementation progress (apps/web, design system in `src/app/desktop/ui/`):
- DONE: new shell `desktop-shell.tsx` (navy icon rail, per-section flyout, profile/notification popover, app switcher; same session check, capability gating and logout as before) and `ui/ck.css` (ck- prefixed, coexists with legacy globals.css).
- DONE: `/desktop/leave` rebuilt on real data (`/api/leave/me`, `/api/leave/approval-options`, existing idempotent submit/cancel). Hourly leave = start time + number of hours.
- FIXED 2026-10-15: leave quota now reserves days held by PENDING and REVISION_REQUESTED requests on create (`QUOTA_RESERVING_STATUSES` in `packages/database/src/leave-repository.ts`); `LeaveEntitlementView` gained `pending`, and `remaining = quota - used - pending`. The desktop form also blocks over-quota requests. OPEN: the LINE LIFF bridge `apps/api/src/leave/legacy-leave-liff.service.ts` still counts only APPROVED; not changed because LIFF is out of scope without Owner approval.
- Pages not yet rebuilt render unchanged inside the new shell (`REDESIGNED_PATHS` in the shell controls this).
- DONE 2026-10-17 (uncommitted): **TEST API m19b** (image `m19-addrec-20261017b`, 100%, rollback m19a): OT report rows (`GET /management/reports`) now use the OT work date and show `OT HH:mm-HH:mm` instead of the request submission date (found by the Owner-requested full TEST regression: authz/fail-closed, leave rules, OT weekday+weekend cycle, medical cap at 1,000 and no-receipt refusal, reports/xlsx, delegations, announcements, profile - 35+15 steps pass after the fix; script `holidays` route name was my typo). Fix is in `management-repository.ts` `reports()`; 770 unit tests pass.
- DONE 2026-10-17: **TEST rollout #5** (Owner at the PC, granted run.developer on ckace-hr-web-test): commit 8a05aed pushed; images tag `m19-addrec-20261017a` (built via Cloud Build REST with the source tgz in the `_cloudbuild` bucket because `gcloud builds submit` upload is forbidden for the SA); migration `20261022_medical_auto_approve_roles` applied via job execution `ckace-hr-migrate-test-qtnqz`; API `ckace-hr-api-test-m19a` and Web `ckace-hr-web-test-m19a` at 100% (rollback m18b / m17a); Firebase release 1792248243929000. Smoke: api health 200, add-record 401 without session, web pages 200, chunks 200. TEST API UAT (job execution `ckace-hr-migrate-test-llmxn`, script runs inside the migrate-job image with a temporary session secret that is removed afterwards): 31/31 steps pass - add-record validation (check-out before check-in, future date, empty reason), idempotent replay, duplicate-day block, 2-step approval incl. step-jump refusal, record created on final approval with calculated minutes, withdraw removes it, send-back + resubmit of both times + approve, medical auto-approval policy read/save/validation/restore. Browser click-through of the new pages on TEST not done (UI checked only with mocked-API screenshots). Items below marked 'NOT deployed' for 2026-10-17 are now deployed.
- DONE 2026-10-17: **TEST notifications live** (no code or image change; TEST resources only, PROD untouched). LINE: separate TEST OA, token in Secret Manager `ckace-hr-test-line-token`; Owner LINE userId bound to test@gmail.com; she received the OT-approved message. Email: `ckace.hr@gmail.com` via secret `ckace-hr-test-smtp-password` + env `CKACE_SMTP_USER` on job `ckace-hr-migrate-test`; test mail received (Gmail limit ~500/day, consider a dedicated mail service before real use). Automation: Cloud Scheduler job `ckace-hr-notify-test` (asia-southeast1, every 5 min, Asia/Bangkok) created by the Owner in Cloud Shell; it POSTs the Cloud Run Jobs `:run` API with args override `node apps/api/dist/notification-job.js` as `ckace-hr-test@` (needs `run.developer` on the job; `run.invoker` alone returned 403). The deployer SA has no Scheduler role on purpose (`cloudscheduler.admin` is project-wide and PROD shares the project). First scheduled run 2026-10-17 16:35Z: channels LINE+EMAIL, failed 0, nothing pending. NOT done: equivalent PROD LINE/email/Scheduler setup (Owner gate).
- DONE 2026-10-17 (uncommitted): **time-correction work-hour cap follows the attendance policy** (Owner: item 4). New `attendance_policies.workStart` (migration `20261023_attendance_work_start`, default 09:00, applied on TEST via execution `ckace-hr-migrate-test-46tnx`); cap = workEnd - workStart - break length (`standardWorkdayMinutes`, replaces hard-coded 450); policy API/UI take `workStart` (required on PUT, workEnd must be after it). TEST images tag `m20-workstart-20261017a`, API/Web `m20a` at 100% (rollback API m19b, Web m19a), Firebase release 1792256034505000. Local: lint, typecheck, 771 tests, build pass. TEST UAT (execution `ckace-hr-migrate-test-sb85g`) 9/9: default hours cap 450, policy 08:30-16:30 gives cap 420, missing/invalid workStart rejected, policy restored to 09:00-17:30. Owner decided 2026-10-17 NOT to build Production's OT 95% 'matches approved' label.
- DONE 2026-10-17 (uncommitted): **TEST real-browser click-through** (Playwright with short-lived session cookies minted inside the migrate job for test@gmail.com / employee, 40-minute expiry; no passwords or accounts created). All 31 desktop pages (23 as SUPERADMIN, 8 as EMPLOYEE) load with no console/API errors; screenshots reviewed. Fixes found and deployed as TEST `m21a` (images `m21-dates-20261017a`, rollback API/Web m20a, Firebase release 1792257118977000): admin flyout showed the group headings 'การลา' and 'พนักงานและสิทธิ์' twice (items reordered in `desktop-shell.tsx`); reports subtitle showed ISO dates (now `thaiDateRange`); notification texts now format dates DD/MM/YYYY (Buddhist year) in `notification-dispatcher.ts` (old stored inbox rows keep the ISO text; new format not yet seen live). Not covered: form submission by clicking in the UI (API cycles were covered earlier).
- DONE 2026-10-17 (uncommitted): **submenu clicks did not switch views** (Owner report: Approvals OT/time-correction/medical and Reports detail pages stayed on the first view). Cause: the Next.js router changes `location.hash` with `history.pushState`, which never fires `hashchange`, and the pages choose their view from the hash. Fix: `ui/hash-events.ts` (`installHashChangeEvents`, called once from `DesktopShell`) dispatches `hashchange` when the router changes the hash; no page logic changed. Reproduced on TEST with Playwright before the fix, then verified after on TEST web `m23a` (images `m22-hash-20261017a`, `m23-rptdate-20261017a`; rollback web m21a; Firebase release 1792258818878000): all four approval submenus and all five report submenus switch view. Report detail subtitle now uses `thaiDateRange` too.
- DONE 2026-10-17 (uncommitted): **TEST browser click-through of every request type** (Playwright, short-lived session cookies for the 4 TEST accounts; scripts are scratch, not in the repo). Employee forms submitted by clicking: leave x2, OT x2 (past dates), time-correction edit x2, add-record x1; approvers (manager then second SuperAdmin) clicked approve (2-step), reject with comment and send-back, then the employee used 'แก้ไขและส่งใหม่' and both approvers approved the resubmission. Final statuses read back from the API match for leave, OT, medical, time correction (APPROVED / REJECTED / REVISION_REQUESTED -> APPROVED). Medical claims were seeded server-side because the browser upload failed (RESOLVED 2026-10-18: Owner added the Firebase origin to the R2 bucket CORS; browser claim with receipt then submitted, attachment stored, both approvers approved; approver-side receipt viewing not yet browser-tested): **R2 bucket CORS allows only the old TASK-32 TEST origin, not https://ckrr-leave-system-2026.web.app** (PUT preflight blocked) - Owner must add the origin in the Cloudflare dashboard (bucket CORS), and hr.ckaceaccount.com / hr-test.ckaceaccount.com before those domains are used. Found and fixed (TEST web `m24a`, images `m24-ui-20261017a`, rollback m23a, Firebase release 1792260002741000): approver action buttons overflowed the card (`.ck-ac-act` now wraps); sent-back status label unified to 'รอแก้ไข' on OT/medical/time-correction (leave already used it). OPEN product question: the OT form hint says requests may be sent before the work date but the server rejects future dates (`assertOvertimeDateRangeNotFuture`) with a generic 'ข้อมูล OT ไม่ถูกต้อง' message.
- DONE 2026-10-18 (uncommitted): **OT may be requested before or after the work date** (Owner decision; `assertOvertimeDateRangeNotFuture` removed from business-rules and overtime-repository, test updated). Verified on TEST API `m25a` by UI: future (20 Oct, 3 Nov) and past (15 Sep) OT submitted and approved by 2 steps.
- DONE 2026-10-18 (uncommitted): **approver sees medical amount, sickness date and receipt** (gap found in browser test: the pending medical card showed only the description). `RequestStatusItem.medical` (contracts), populated for pending approvals in `request-status-repository.ts`; approvals page shows the figures and a 'ดูใบเสร็จ' button per attachment (presigned download via `/api/attachments/:id/download`, allowed for the approver with a pending step). TEST API/web `m26a` (images `m26-medrcpt-20261018a`; rollback API m25a, web m24a). Browser-verified as manager: figures shown, download grant 201, file fetched 200 image/png, approve OK. Not covered: receipt on already-decided history (access only allowed while a step is pending). TEST has mock MED-0007/0008 waiting for the second step.
- DONE 2026-10-18 (uncommitted): **approval routing fixes from the org-model probe** (Owner: 'แก้ข้อ 1, แก้ข้อ 2'). (1) OT, time-correction and medical used SYSTEM_PICKS_FIRST, so an Admin's own request was assigned to only the first SuperAdmin by name. New `approval_steps.coApproverEmployeeIds` (migration `20261024_approval_co_approvers`, additive): the other eligible approvers of a step may also see and decide it (pending lists, decide checks, receipt access, notifications). The chain preview still names only the primary approver. (2) `buildRouteSteps(requesterRoleKeys)` drops policy steps below the requester's own highest role, so a SuperAdmin's request goes straight to the other SuperAdmin and an Admin's skips the team lead. Leave still lets the requester pick. Verified on TEST API/web `m27a` (images `m27-coapprove-20261018a`; rollback API m26a, web m26a) with 2 companies / 2 teams temporarily scoped on the 4 test accounts (restored afterwards): employee chain = Admin > own-company SuperAdmin only; SuperAdmin chain = other SuperAdmin only; Admin's OT visible to both SuperAdmins, the non-primary one approved it, the employee got 403. Owner note: SuperAdmin = company owner who only approves; whether SuperAdmins should be blocked from submitting their own requests is an OPEN question. TEST roles are otherwise all PLATFORM scope with one team.
- DONE 2026-10-18 (uncommitted): **new LINE LIFF in Project B** (`apps/web/src/app/liff`). Owner: the look must be Project A's own approved code ('ให้ใช้โค้ดจาก project a มาใช้เลย'). That approved UI is the compiled React app `line-gateway/public/react-read` of the `app-leave-gas` snapshot (Production `liff.html` only embeds it in an iframe and bridges data by postMessage). It is hosted unchanged (images converted to webp, 2.3MB) in `apps/web/public/react-read`; excluded from eslint. `page.tsx` = auth (existing session cookie, else LIFF SDK + `POST /api/desktop-auth/line-login`) + a fullscreen iframe `/react-read/index.html?ckaceBinding=production&ckacePage=<page>` (hash route -> page: home, leave, ot, medical, attendance|correction -> time-edit, history -> request-history, approvals). `bridge.ts` answers the app's `CKACE_*` postMessage protocol using the same `/api/*` as Desktop (one rule set): bootstrap data, leave/OT/medical/attendance/time-correction writes, withdraw, resubmit, approvals (approve/reject), leave history detail. Screens show running numbers (LEV/OT/MED) via an id alias map; write ids are resolved back. Backend additions: LINE login, `requestNo` on OT/medical views, `leave`/`overtime` facts on the assigned-approvals list. Limits of the approved UI (inherent, not bridge bugs): only vacation/sick/personal (+ 'other types' list), no approver picker (first candidate of each step is used), no send-back in approvals, no receipt viewing for approvers, time correction needs an existing record for that day (add-missing-day stays on Desktop), the two dashboard/report panels on Home say 'unavailable' (the bundle's read surface has no such endpoint). NOT yet: real LINE login (needs LINE Login channel + LIFF ID on TEST). Caveat: the GitHub snapshot may be older than her latest local edits; re-copy `react-read` if she pushes a newer Project A. UPDATE 2026-10-18 m38: the four gaps are covered by native Project B screens in Project A's look (`liff/extras.tsx`, `extras.css`, floating 'เพิ่มเติม' button -> `#/x`): leave with every entitlement incl. special leave and approver choice per step (`#/x/leave`), add-record time correction for a day with no clock-in (`#/x/correction`), approver view of medical receipts (`#/x/receipts`, POST `/api/attachments/:id/download`). Send-back from approvals and OT/medical detail+withdraw are bridged. Project A untouched. TEST m38 (rollback m31a).
- DONE 2026-10-18 (uncommitted): **SuperAdmin = company owner who only approves; SuperAdmin stays the highest level** (Owner: 'ซ่อน'; she tried and then dropped a separate SYSTEM_ADMIN role: 'ระดับสูงสุด คือซุปเปอร์แอดมิน พอ'). Migration `20261025_owner_and_sysadmin_roles` (name is historical, idempotent) removes leave/OT/medical/time-correction/attendance/benefits/requests self-service permissions from SUPERADMIN server-side, so the menus and endpoints disappear; someone who is owner AND employee also gets the EMPLOYEE role (the test@ login has both). Attendance statistics exclude accounts holding SUPERADMIN without EMPLOYEE. Approved-request withdrawal therefore stays SuperAdmin only. Verified on TEST `m29a` (images `m29-owneronly-20261018a`; rollback API/web m28a, which still carries the removed SYSTEM_ADMIN role code-free): owner-only login -> self endpoints 403, approvals/reports/admin 200, nav hides leave/OT/medical/attendance (checked with the second SuperAdmin test account re-roled and restored on m28a). The SYSTEM_ADMIN role created on TEST by the first version was deleted (nobody had it). Not covered: dashboard for an owner-only login not click-tested (it gates every call on navigation flags).
- DONE 2026-10-17 (committed in 8a05aed): medical auto-approval is now policy data (`benefit_policies.autoApproveRoleKeys`, migration `20261022_medical_auto_approve_roles` NOT applied anywhere, default ADMIN+SUPERADMIN = old behaviour; editable on the medical-policy admin page). Owner decisions 2026-10-17: late threshold 09:05 (set in the attendance policy page; late = check-in at or after the set time), over-limit medical claims stay capped at the per-claim limit (no rejection), OT 95% rule undecided.
- DONE 2026-10-17 (local, uncommitted, NOT deployed to TEST): (a) "ขอเพิ่มบันทึกลงเวลา" for a day with no attendance record: `POST /api/attendance/time-corrections/add-record` (type `ADD_RECORD`, attendanceRecordId null + both corrected times; refuses if a record or active request exists for that date; policy-driven approval; final approval creates the AttendanceRecord + calculation; withdraw deletes it unless overtime is linked; resubmit supports both times). UI: `time-correction/add-record-form.tsx`. (b) Org management employee list is now one card per person (`user-card*` in `ui/ck.css`), all editing controls kept. Verified: lint, typecheck, build, 769 tests; screenshots with mocked API only. Not yet exercised against a real DB/TEST.
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

**Continue TASK-39.8 with Wave 3 — Reports Production UI Parity.**

Waves 1–2 are closed PASS and the local preview remains available for Owner review. Do not start TASK-40 until TASK-39.8 Waves 3–4 and final whole-task QA are complete and the Owner explicitly approves the release-readiness phase.

## Last Updated

2026-10-15 Asia/Bangkok
