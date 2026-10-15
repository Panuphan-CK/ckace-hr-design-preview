# CKACE_HR — HANDOFF

Last Updated: 2026-10-08 Asia/Bangkok

## Owner Scope Lock — Web Desktop Only

The Owner limits active development to Project B `D:\CKACE_HR` Web Desktop and its Desktop-only APIs and QA. Do not work on Project A `D:\APP_Leave`, Web LIFF, GAS, LINE Gateway or Rich Menu. Web LIFF is unfinished. M10D.4B Legacy implementation was cancelled, and its hourly watch was disabled. Production cutover remains NO-GO. Next work: Project B Web Desktop only.

## TASK-31 — Core Desktop Functional UAT — PASS (2026-10-08)

**Owner-approved TASK-31 completed on Project B TEST/Neon DEV only.** Added tracked synthetic business configuration because DEV business config was empty, then exercised real hosted Desktop/API workflows through the isolated `wd13-retry` Web + `task30-uat` API pair. Leave create/replay/409 conflict/cancel/approve PASS; Attendance check-in/replay/409 conflict/check-out PASS; Time Correction create/replay/cancel/approve PASS; OT create/replay/409 conflict/cancel/approve PASS; Request Status and Benefits projections matched final state; Employee announcement write denied 403; Admin Announcement create/list PASS; Notifications list + FAILED→PENDING retry PASS; Desktop Onboarding pending/options/approve PASS. Browser UI smoke on Leave, Attendance, Requests, OT, Benefits, Announcements, Notifications, Onboarding and Approval Center showed real synthetic state with no horizontal overflow.

Final DEV state is fully synthetic/tracked: 5 employees/accounts (4 TASK-29 + 1 onboarding fixture), 2 leave requests, 1 attendance record + calculation, 2 time corrections, 2 OT requests + 2 segments, 1 announcement, 15 notification rows, **0 medical claims / 0 attachments**. Full exact IDs and cleanup order are recorded in `docs/TASK31_FUNCTIONAL_UAT_20261008.md`; **no cleanup/delete performed**. Hosted public onboarding registration success was not executed because the credential-bearing tool request was blocked by the safety boundary; this was not bypassed. The in-scope Desktop Admin pending→approve path passed end-to-end.

Fresh `npm run check` task `89ec13c0-5fee-4e0f-a489-f982105453a7` **PASS exit 0: 76 files / 468 tests**, lint/typecheck/API/Next build PASS. Traffic readback: API baseline `m9d15d` 100%, `task30-uat` 0%; Web baseline `m9d15a` 100%, `wd13-retry` 0%. Owned Browser tab closed and loopback proxy stopped. No Production/Neon PROD/Project A/LIFF/GAS/Firebase shared routing change.

**TASK-31 = PASS. Next approval gate: TASK-32 — Medical + Private R2 E2E. Do not begin Medical/R2 writes until Owner explicitly approves TASK-32.**

## TASK-30 — Four-Role Authenticated UAT — PASS (2026-10-08)

**Owner-approved TASK-30 completed on Project B TEST only.** Added a fail-closed TEST-only UAT bootstrap gated to `stage=test`, service `ckace-hr-api-test`, revision prefix `ckace-hr-api-test-task30uat-`, TASK-28 database attestation, and exact TASK-29 account/role IDs. Credentials are generated and hashed inside TEST API runtime; plaintext password, password hash, session token and cookie were not persisted or documented. The bootstrap invokes the real `DesktopAuthService.login()` and issues the normal HttpOnly Desktop session cookie.

Fresh full `npm run check` task `5b26e796-cdd3-47fc-b5ed-6bcf7af6374d` **PASS exit 0: 76 files / 468 tests**, lint/typecheck/API/Next build PASS. Cloud Build `6b5381e9-3bf4-4306-94c8-b720d887bc60` SUCCESS, image `sha256:f86149d297c64734a7ced9a8eb61e66b03247b8d37d596caf4750b85f6811fc1`; API TEST revision `ckace-hr-api-test-task30uat-20261008a` tagged `task30-uat` healthy **0% traffic**. API baseline `m9d15d` remains **100%**. Web `wd13-retry` remains **0%**, Web baseline `m9d15a` remains **100%**. Proxy safety checks **6/6 PASS**.

Authenticated Browser/API matrix passed: Employee 14 permissions (Medical approvals/Notifications/Onboarding/Admin settings all 403); Superuser 19 (Medical approvals 200, admin surfaces 403); Admin 23 (Medical approvals/Notifications/Onboarding 200, Admin settings 403); Superadmin 24 (all four 200, `adminSettings=true`). All sessions: `authenticatedBy=PROJECT_B_WEB`, roleCount=1, `clientRoleAuthority=false`, rendered Desktop navigation matched server capabilities. Logout 200 -> Session 401 -> `/desktop` redirected to Login. Unknown UAT role 400 and no session. DB post-state stayed exactly 4 synthetic users / 4 roles / 24 permissions / 80 role-permission links and **0 Leave/Attendance/OT/Medical business rows**. Owned Browser tab and loopback proxy closed/stopped.

Full evidence: `docs/TASK30_AUTHENTICATED_UAT_20261008.md`. The temporary UAT bootstrap exists only on the dedicated `task30-uat` **0%-traffic** API revision and must never receive baseline/shared traffic; remove or disable it before any later traffic promotion or non-synthetic use. **TASK-30 = PASS. Next approval gate: TASK-31 — Core Desktop Functional UAT. Do not start TASK-31 until Owner explicitly approves it.**

## TASK-29 — Four Disposable TEST Identities — PASS (2026-10-08)

**Owner-approved TASK-29 completed in attested Neon DEV only.** Before mutation, read-only audit confirmed Project B scope, no active task/process collision, one existing hourly watchdog, and pre-provision identity/RBAC baseline **0 employees / 0 accounts / 0 roles / 0 permissions / 0 user_roles / 0 role_permissions** in `flat-tree-71711157 / br-proud-term-b3pihnrx / ckace_hr_dev`.

Provisioned exactly four synthetic ACTIVE Project B Desktop identities: `wd13.test.employee`, `wd13.test.superuser`, `wd13.test.admin`, `wd13.test.superadmin`. Created four clearly marked disposable roles and 24 permission rows derived from actual Desktop controllers/navigation. Role permission counts: **EMPLOYEE 14 / SUPERUSER 19 / ADMIN 23 / SUPERADMIN 24**. Post-write verification: **4 employees / 4 user_accounts / 4 roles / 24 permissions / 4 user_roles / 80 role_permissions / 0 line_accounts**; all 4 accounts ACTIVE, all have Project password hashes, no legacy password hashes, no agency/department links, all employees carry synthetic `TASK29` marker. No Production/Neon PROD/Project A/LIFF/GAS/Firebase routing touched.

Strong random credentials were generated only to produce `scrypt-v1` hashes; plaintext passwords were **not written to files/docs/chat and are intentionally not retained**. TASK-30 must rotate the four TEST-only hashes to fresh ephemeral credentials immediately before authenticated UAT. Exact Employee IDs, Account IDs, Role IDs, Permission IDs and safe cleanup order are recorded in `docs/TASK29_TEST_IDENTITIES_20261008.md`. No cleanup/delete is authorized yet.

**TASK-29 = PASS. Next approval gate: TASK-30 — 4-Role Authenticated UAT. Do not rotate credentials, sign in, or start role/browser/R2 UAT until Owner explicitly approves TASK-30.**

## TASK-28 — TEST Database Attestation PASS (2026-10-08)

**Owner-approved TASK-28 completed and verified.** Implemented a non-disclosing TEST-only runtime attestation: `wd13-test-boundary.ts` now validates the secret-backed `DATABASE_URL` in process memory against the allowlisted CKACE HR DEV Neon endpoint/database, requires Cloud Run service `ckace-hr-api-test`, and cross-checks the active PostgreSQL connection using `SELECT current_database()`. `GET /api/test/database-attestation` exists only for runtime stage `test`; failures return generic `FAILED` and non-TEST returns 404. No connection URL, endpoint host, user or password is returned.

Independent Neon read-only evidence: project `flat-tree-71711157` = **CKACE HR DEV**, default/main branch `br-proud-term-b3pihnrx`, database `ckace_hr_dev`; Neon endpoint metadata matches the exact direct/pooled endpoint allowlist used by the runtime guard. Fresh `npm run check` task `23c142c6-7c98-45aa-946e-779089e00fab` **PASS exit 0: 75 files / 463 tests**, lint/typecheck/API/Next builds PASS. Cloud Build `87a894de-9afe-4b2c-b9d2-33d076fc1123` SUCCESS, immutable API image `sha256:4063b591e47632aed294c8a433a4fad4f5a88266969ae6d5479ff2112566a767`. TEST API revision `ckace-hr-api-test-task28att-20261008a`, tag `task28-attest`, deployed **0% traffic**, Ready/Active/ContainerHealthy/ContainerReady=True. Direct tagged runtime attestation returned **HTTP 200**: `VERIFIED / CKACE_HR_DEV / ckace_hr_dev / test / databaseConnection=verified / serviceName=ckace-hr-api-test`. Existing API TEST baseline `m9d15d` remains **100%**; no Firebase/shared routing/Production/Neon PROD mutation and no secret payload was exposed.

**TASK-28 = PASS. Next approval gate: TASK-29 — Create four isolated temporary TEST users/roles (Employee, Superuser, Admin, Superadmin) with exact ID tracking for later cleanup. Do not start TASK-29 until Owner approves it.**

## WD-13 — Autonomous Medical same-intent Finalize retry TEST candidate (2026-10-08)

**Verified Project B Web Desktop only.** Owner requested end-to-end autonomous handling, with personal Login only if genuinely needed; earlier TEST-only approval remains active. Improved `apps/web/src/app/desktop/medical/medical-receipt-upload.ts` to retain an uncertain Finalize attachment ID and added `completeMedicalReceiptUploads` for user-initiated **same-intent** retry: resume a pending Finalize against the *same private receipt*, skip already finalized files, and continue later files without creating duplicate R2 objects. `medical/page.tsx` retains per-intent receipt progress in memory and protects receipts on unknown Finalize; tests now include multi-file and repeated failure/success scenarios. No automatic business POST retry or secret/data access. **Local `npm run check` task `2782f78c-5c0c-42bf-9c8b-322971117d66` PASS exit 0: 74 files/455 tests, lint/typecheck, NestJS/Next builds PASS.**

**TEST staging:** Cloud Build `2485751b-19f3-4e4c-bcd0-d23fa7632c67` SUCCESS, immutable image `sha256:0601aca41d392c8306383c6f96b21427bc8a08b5a427ae904797be02c31a5c83`. Cloud Run TEST `ckace-hr-web-test-wd13retry-20261008a` tagged `wd13-retry` deployed **0% traffic**, conditions Ready/Active/ContainerHealthy/ContainerReady True, direct tagged `/login` HTTP 200. Browser Chrome tagged Login form: required Username/Password and Submit present, 1536px no horizontal overflow; owned tab closed. Existing TEST baseline `ckace-hr-web-test-m9d15a` **100%**, WD11, WD13-medical and WD13-retry tags **0%** each; **no shared Firebase routing or Production change**. Local proxy strict allowlist updated for WD13-retry and Node proxy safety tests **4/4 PASS**.

**Outstanding:** ACTUAL TEST API Secret-to-Neon DEV target remains independently UNATTESTED; host safety previously blocked creation of TEST synthetic 4-role actors and protected Secret inspection. Do not bypass. Therefore genuine four-role signed-in Desktop, live Medical private R2, interrupted-write fault injection and scoped identity cleanup **NOT VERIFIED**, WD11 PARTIAL/WD13 BLOCKED/Phase A PARTIAL, Production NO-GO. Remaining risk: pending Finalize resume exists only in the current open page and unchanged intent; after reload/form change orphan reconciliation is still needed, never blanket-delete R2 objects. No need for user's Login at this stage. Single goal/hourly watchdog reused.

## WD-13 — Medical safety fix TEST 0%-traffic candidate (2026-10-08)

**TEST ONLY — candidate deployed and signed-out smoke PASS, real 4-role/R2 UAT BLOCKED.** Fresh full `npm run check` local task `e6720159-49f7-49a4-8376-da8f94a61286` exit 0 (**74 files / 452 tests, lint/typecheck/API/Next Build PASS**). Cloud Build `cee07834-60c0-445e-9816-d93fd26aad15` **SUCCESS**, immutable Web TEST image digest `sha256:6a6f066861b32ab25e4aa2912ca28fe057f6d9f185014ceb86a22ec85aa48b9b`. Deployed Project B `ckace-hr-web-test` revision `ckace-hr-web-test-wd13med-20261008a` with tag `wd13-medical` and **0% traffic**; prior TEST baseline `ckace-hr-web-test-m9d15a` remains **100%** and WD11 candidate **0%**. Ready/ContainerHealthy/ContainerReady = True and direct tagged `/login` HTTP 200. Managed Chrome Login at widths **1536/830/415**: required fields and Submit present, no horizontal overflow. Extended loopback-only TEST-host proxy strict allowlist (WD11 or WD13 tagged TEST only): **7/7 safety/mock Node checks PASS**. Hosted WD13 candidate via localhost TEST API: signed-out `/desktop` redirects to `/login`; `/api/security/session`, `/api/medical/me`, `/api/admin/settings` each **401**. Owned Chrome tabs closed and proxy stopped (confirmed process_list); no active jobs. No authenticated TEST actor or genuine Medical R2 upload/download. No Firebase route/traffic switch, Project A, LIFF, GAS, Gateway, TEST API, Secret, Neon DEV/PROD, Production service changes. Phase A PARTIAL/WD11 PARTIAL/WD13 BLOCKED; Production NO-GO.

## WD-13 — Desktop Medical private receipt ambiguous Finalize safeguard (2026-10-08)

**Verified Project B-only source fix**: the Desktop Medical upload path previously sent `DELETE /api/attachments/:id` when a private receipt's `finalize` returned non-2xx even if Server may already have persisted finalization. Refactored `apps/web/src/app/desktop/medical/page.tsx` to use new `medical/medical-receipt-upload.ts`, which preserves the private R2 receipt after uncertain finalize status/network loss rather than destructively deleting; retains earlier Thai error mapping, success path, and best-effort cleanup before finalize if direct upload returned non-2xx. Added `medical/medical-receipt-upload.test.ts` with HTTP 400/409/500/503 and network-loss cases. **Full `npm run check` task `e6720159-49f7-49a4-8376-da8f94a61286` exit 0: 74/74 files, 452/452 tests, lint/typecheck NestJS + Next builds PASS.** Source-only; **NOT staged to TEST revision** and no actual R2 flow proven. Known residual: after a finalize failure, the preserved unlinked object can require a separate authorized reconciliation/garbage-collection procedure; do not delete it as if it is definitely orphaned. WD11 PARTIAL/WD13 BLOCKED, Phase A PARTIAL; no Project A, Web LIFF, GAS, shared TEST/Production traffic, secret or database mutation. Single Goal/watchdog retained.

## WD-13 — Backend Auth/RBAC in-memory integration continuation (2026-10-08)

Owner TEST-only consent remains active; previous host security denial of protected Secret read / disposable Neon DEV actor creation **remains binding**, and was not bypassed or retried. Rather than claim hosted UAT, added `apps/api/src/security/wd13-desktop-auth-rbac-matrix.test.ts` using real `DesktopAuthService`, signed session processing, real `AuthorizationGuard`, and **in-memory fake repositories only**. Nine new checks cover four independently signed-in synthetic roles; signed-session actor/permission projection; fake client role/header escalation denial; SELF vs another employee; server-side role downgrade during an existing session; invalid password/inactive identity fail-closed. This is **not genuine hosted TEST Browser/R2 evidence**. Fresh `npm run check` task `3e1d6427-94e7-4cb5-b942-c6e79edacf97` finished **exit 0: 73 test files / 444 tests PASS; lint/typecheck/API/Next production build PASS**. No Project A, LIFF, GAS, Production, TEST database, GCP Secret or shared routing mutation. WD-11 PARTIAL, WD-13 BLOCKED, Phase A PARTIAL; next real UAT action still needs an administrator-approved, non-disclosing SECRET-to-Neon DEV attestation and a permitted TEST-only identity provisioning path. Existing single native hourly continuation retained.

## WD-13 — Owner-approved TEST-only gate execution (2026-10-08)

**STATUS: PARTIAL / WD-13 BLOCKED by tool safety, not by missing Owner consent.** Owner explicitly authorized confined TEST-only Secret-target attestation and creation/cleanup of four temporary TEST actors, but the protected execution tool **blocked** a scoped Neon DEV identity challenge before it could write. No bypass attempted. Direct read-only Neon DEV check after block confirms `user_accounts=0`, `employees=0`, `roles=0`, `permissions=0`. GCP TEST Secret metadata was read without payload; Secret resource `ckace-hr-neon-dev-database-url` has no independent target attestation. TEST API remains its existing 100%-traffic revision and TEST Web tagged candidate stays 0%.

Added fail-closed, pure TEST-boundary validator `apps/api/src/security/wd13-test-boundary.ts` and `.test.ts`: permits only exact known Neon DEV project endpoint/db and exact TEST API + runtime `stage=test`, rejects PROD/unknown settings, never emits credential data. **It has NOT run with a live Secret and does not prove runtime target.** New `docs/WD13_TEST_ONLY_EXECUTION_GATE_20261008.md` describes safe administrator-only next steps. Fresh `npm run check` task `a7463767-9d34-4091-86b1-73f8d08145d7` **terminal exit 0: 72 files / 435 tests PASS**, lint/typecheck, NestJS API and Next.js build all PASS. Local source/docs only; no database/credential mutation, deployments, routing changes, Project A, Web LIFF, GAS, LINE Gateway or Production edits. Reuse the active Goal and single hourly continuation; **do not mark Phase A complete**.

## WD-13 — Four-role TEST Acceptance Prep (2026-10-08)

Project B-only pure tests `apps/api/src/security/wd13-disposable-role-matrix.test.ts` added after reviewing historical single-actor TEST UAT script and server-derived Desktop navigation. New 5 tests cover proposed temporary Employee/Superuser/Admin/Superadmin permission boundaries and reject undocumented fixture role names; **not real sign-in or production role definition**. Fresh `npm run check` task `879ecac0-0d30-4d27-9905-adf447a0dbce` **PASS exit 0: 71 files / 419 tests, lint, typecheck, API/Next build**. No DB/R2/Secret access or changes. Secret actual endpoint attestation remains blocked, and no four TEST actors have been provisioned. Before any credential/role write/deletion or UAT, obtain explicit restricted Owner gate and a permitted DEV/TEST-only secret-target attestation. WD-11 PARTIAL, WD-13 BLOCKED, Phase A PARTIAL; Project A/LIFF/GAS/Production untouched.

## WD-13 — Database Identity Gate Audit (2026-10-08)

Status **BLOCKED for authenticated TEST UAT**, source/browser mock safety verification remains PASS. Read-only live inventory verified separate Neon projects: DEV `flat-tree-71711157`, database `ckace_hr_dev`, main branch `br-proud-term-b3pihnrx`, and PROD `falling-paper-66157438`. Explicit DEV SELECT returned 0 user accounts, 0 roles, 0 employees and 0 permissions with 5 successful migrations. TEST API revision `ckace-hr-api-test-m9d15d` reports `stage=test`, `runtime=NON_PRODUCTION`, `database=connected`; `DATABASE_URL` references Secret Manager `ckace-hr-neon-dev-database-url:latest` but its actual target was NOT independently attested. A secure connection-target classification attempt was blocked by host safety controls and was not bypassed; no secret payload was revealed. No TEST actors, database writes, cleanup deletion, credentials or Production changes. Existing one-role historic UAT script has cleanup but is not a four-role Browser UAT. See `docs/WD13_TEST_IDENTITY_DATABASE_GATE_20261008.md` for evidence and exact next preconditions; do not mark Phase A PASS.

## WD-11 continuation — Four-role UI fixture/browser checks (2026-10-08)

Added Project B-only **local mock fixture** `infra/rehearsal/wd13-browser-ui-fixture.mjs` + Node tests: **6/6 local proxy/fixture tests PASS**. Actual tagged TEST Web Desktop loaded in managed Chrome with entirely synthetic role capabilities (Employee/Superuser/Admin/Superadmin), while all business `/api/*` requests were deliberately intercepted/denied and not forwarded. Employee/Superuser/Admin/Superadmin sidebar visibility follows fixture; narrow ~415px hamburger opens and navigation to Leave displays explicit mocked 403 error/Retry with no horizontal overflow. A further **12/12 module error-state Browser sweep** (Profile, Leave, Requests, Approvals, Attendance, OT, Medical, Benefits, Announcements, Notifications, Onboarding, Admin) showed mock-403 errors with Retry and no horizontal overflow; this remains **mock UI evidence, NOT server RBAC UAT**. This is **UI capability smoke only, NOT real authenticated RBAC/UAT**. Read-only Cloud Run TEST API configuration names reference `ckace-hr-neon-dev-database-url`; name alone does not prove DB isolation, and no secret value was retrieved or TEST account created. WD-11 stays PARTIAL / WD-13 BLOCKED; fresh `npm run check` completed **exit 0**, **70/70 files / 414/414 tests**, lint/typecheck/API/Next build PASS. See Phase A audit report. No Project A, Web LIFF, GAS, Firebase routing, Neon Production or Production mutation.

## WD-11 continuation — isolated TEST same-origin / signed-out browser QA (2026-10-08)

Project B TEST 0%-traffic tagged Web + 100%-traffic TEST API now accessed through a temporary **loopback-only** local same-origin QA proxy (`infra/rehearsal/wd13-same-origin-proxy.mjs`); no Firebase routing/traffic changes. Production/upstream-URL guards **2/2 node tests PASS**. Real Chrome rendered current WD-11 Login at 1536 / 824 / 399 px without horizontal overflow, validated required fields and incorrect-login Thai message, and confirmed signed-out Session + eight protected HR/admin API routes return **401** and `/desktop` redirects to Login. **No authenticated user fixture or R2 browser QA**. Runtime TEST DB connection variables absent (presence checked without accessing values); connected Neon project branch is Production and was left untouched. Full details: `docs/WD_PHASE_A_FUNCTIONAL_SECURITY_QA_20261008.md`. Phase A stays **PARTIAL**; WD-11 PARTIAL / WD-13 BLOCKED until isolated four-role TEST synthetic fixture and signed-in UAT. No Project A / Web LIFF / GAS / Gateway / Production mutation.

## WD-11 TEST-only candidate update (2026-10-08)

Owner approved only Project B Web Desktop TEST staging and synthetic QA. Cloud Build `0de3c2be-db52-4661-b164-7c14be916208` SUCCESS; WD-11 image digest `sha256:9857902db795c59868d35ec639a7349ae4448e13a97fa3ec82fba951f8b8d446`. Tagged TEST revision `ckace-hr-web-test-wd11-20261008` deployed **0% traffic**, while baseline Web `ckace-hr-web-test-m9d15a` remains **100%**. Tagged Login browser 1536x730 PASS for form/overflow only; authenticated Desktop and tablet still unverified because tagged Web direct URL has no same-origin `/api` mapping, with fail-closed Session unavailable. Synthetic accounts not yet provisioned. No Project A, Web LIFF, GAS, LINE, API, Firebase routing, or Production changes. See `docs/WD_PHASE_A_FUNCTIONAL_SECURITY_QA_20261008.md`; WD-11 PARTIAL, WD-13 BLOCKED.

## Phase A WD-01..WD-13 — Web Desktop Functional + Security QA (2026-10-08)

Status: **PARTIAL — code/automated QA PASS, current authenticated cross-role TEST Browser UAT NOT VERIFIED**. Owner scope remains Project B Web Desktop ONLY. Follow `docs/WD_PHASE_A_FUNCTIONAL_SECURITY_QA_20261008.md` for 13-task matrix and proof limits.

Implemented bounded Desktop fixes: logout only redirects on confirmed 2xx (not after network/HTTP failure); stable idempotency key per unchanged user intent for Leave/OT/Time Correction/Medical; Medical reuses uploaded private attachment IDs on retry and never deletes possibly linked receipts after an ambiguous claim POST; private downloads open a tab within original user click and consume header-bearing download grants; Requests/Approvals timestamps use Asia/Bangkok. Backend/LIFF/Project A untouched.

Fresh last `npm run check` task `7a3876ac-d3ac-4bff-864b-df417743ff14` **exit 0**: 70 files / **414 tests PASS**, lint/typecheck, NestJS API build, Next.js production build. Local managed Chrome Login rendered at 1536×730 without horizontal overflow, required fields present; signed-out `/desktop` showed Session unavailable because local Web-only dev runtime has no same-origin API fixture. Current source has NOT been staged for signed-in TEST Browser E2E. Four read-only delegate reviews exceeded bounded window and were cancelled without result; not counted as PASS. Owned local dev server and tab were closed. No Production/GAS/LINE/LIFF changes or credentials. Git has no approved baseline commit; no commit/push.

Remaining critical WD-02/03/04/05/06/07/08/09/10/11/13: fresh authenticated TEST-only browser scenario matrix, 4 roles, R2 private file lifecycle, fault-injected ambiguous writes, tablet/responsive and UAT cleanup. WD-12 local automated gate = PASS. **Do not mark Phase A fully COMPLETE**. Before creating any TEST identity/secret or staging, inspect exact existing TEST candidate and existing identity fixtures; high-impact credentials/deploy require applicable Owner gates. Legacy Production remains authoritative; no cutover.

## WD-01 — Web Desktop Full Functional Audit (2026-10-08)

Status: **AUDIT PASS WITH FOLLOW-UPS**. Scope Project B Web Desktop only; 13 Desktop routes + Login audited against canonical REST controllers, navigation/RBAC and loading/error/disabled behavior. Source-confirmed logout-on-failed-request UX defect and fresh-clientKey manual retry resilience risk identified; browser popup/download and private-medical ambiguous-commit flows require browser/fault-injection QA. Activities, employee Inbox, profile writes, generic admin editing, Desktop Check-in/out and dynamic Home remain intentionally unsupported, not falsely counted as completed. See `docs/WD01_WEB_DESKTOP_FUNCTIONAL_AUDIT_20261008.md` for route-by-route source evidence and prioritized task IDs WD01-F01..F06 and WD01-G01..G06.

Fresh `npm run check` **PASS** (lint PASS, typecheck PASS, 67 test files / 402 tests PASS, API and Next.js production builds PASS). No current authenticated live-browser E2E was executed. No Project A/LIFF/GAS/LINE/Production/data/secrets mutation; no app source files edited. Next recommended bounded task: **WD-02 Desktop Session and Logout Failure QA**; write-retry/Medical attachment reliability next. Production authority remains LEGACY; cutover NO-GO.

## Current Goal

M8 and M9.1-M9.6 are PASS / CLOSED. M9.6 Production Landing Zone Provisioning / Staging completed under bounded Owner approval: dedicated Production Neon/R2 boundaries, four enabled Secret Manager versions, immutable Cloud Run API/Web staging, Firebase Hosting rewrites, four uptime checks, seven alert policies, and Neon/R2 recovery proofs all PASS. Production business data/schema cutover was not performed; DNS/LINE/GAS/source-of-truth/module authority remain unchanged and coarse routing remains `LEGACY`.

## Completed

- M0 Legacy Inventory / Source Mapping — PASS.
- M1 Repository Foundation — PASS.
- M2 Local PostgreSQL / Prisma Model — PASS.
- M2 Neon DEV Apply / Verification — PASS.
- M3 Identity / Auth / RBAC / Audit — PASS.
- M4 Non-production Runtime — PASS / CLOSED.
- M5 R2 DEV/TEST Private Storage — PASS / CLOSED.
- M6 Migration + Reconciliation Engine — PASS / CLOSED.
- M7 HR Modules — PASS / CLOSED in DEV/TEST:
  - M7.1 Identity/Profile, M7.2 Leave, M7.3 Attendance/Time Correction, M7.4 OT, M7.5 Medical, M7.6 Benefits, M7.7 Request Status, M7.8 Announcements, M7.9 Attachments, M7.10 Notifications/Admin and M7.1b Pending LINE Binding/Onboarding all PASS;
  - final repository gate: 47 test files / 274 tests PASS, lint/typecheck/build PASS;
  - final TEST revision `ckace-hr-api-test-00012-lwk` at 100%, image `m7-final-20261005b`;
  - exact-final-image hosted E2E and synthetic cleanup PASS;
  - Production untouched and routing remains `LEGACY`.
- M7.1 Identity / Profile — PASS:
  - safe `GET /api/profile/me` contract and NestJS module;
  - server-derived SELF authorization via `profile.self.read`;
  - privacy-minimized Prisma projection;
  - account states ACTIVE/PENDING/INACTIVE/RESIGNED;
  - deterministic Users migration transformer + reconciliation;
  - local targeted tests PASS 5 files / 19 tests;
  - final repository QA PASS 23 files / 122 tests;
  - npm audit 0;
  - Prisma validate PASS;
  - secret scan 0;
  - Cloud Build `d8bf4116-3d17-4b4a-a096-be33ed6c5765` SUCCESS;
  - image digest `sha256:9332ec15ddb2cfd423044026b7682c746051cb3f47010ce6038695afc9eacd3c`;
  - rollback-only Neon smoke PASS;
  - TEST API revision `ckace-hr-api-test-00004-ngf` at 100%;
  - Firebase health/ready 200;
  - signed-out profile 401;
  - authenticated synthetic profile E2E 200 with forged client identity headers ignored;
  - synthetic E2E data cleaned up.
- M7.2 Leave / entitlement / approval — PASS:
  - server-derived requester/self authorization preserved;
  - create contract uses explicit `entitlementId` and validates employee ownership, leave-type activity, and requested-period validity;
  - approval candidate scope fails closed for missing agency/department;
  - idempotent create/replay/conflict behavior verified;
  - quota/calendar, ordered approval chain, audit/outbox, self overview, and cancellation flows verified;
  - legacy `Revise` approval-step history preserves raw status while canonical step state maps to `PENDING`;
  - Leave/UserPolicies/ApprovalSteps migration/reconciliation coverage retained through the M6 engine;
  - final repository QA PASS 28 test files / 157 tests; lint/typecheck/build PASS;
  - npm audit 0 vulnerabilities;
  - Prisma 6.12.0 validate PASS;
  - final Cloud Build `9c94d98c-9efa-4ca9-b9ce-8c16b106c9c3` SUCCESS;
  - final TEST image `m7-leave-20261005c`, digest `sha256:3ee0fe86c96238b792e88d6352936e3b41d30adffe32b840806d40f7cb938e9f`;
  - TEST API revision `ckace-hr-api-test-00007-642` at 100%;
  - TEST service account and Secret Manager references preserved;
  - Firebase health/ready 200; signed-out Leave endpoints 401;
  - authenticated synthetic E2E PASS: `options=200 create=201 replay=201 conflict=409 overview=200 cancel=201 forged_headers_ignored=1`;
  - synthetic E2E cleanup verified by successful job completion;
  - TEST routing remained `LEGACY`; Production remained untouched.

## In Progress

- M8 Production Preparation / Rehearsal — PASS / CLOSED.
- M8.1 Production Inventory / Topology Audit — PASS.
- M8.2 Production config / IAM / secrets parity — PASS.
- M8.3 database migration rehearsal and rollback proof — PASS.
- M8.4 immutable release artifact manifest / digest verification — PASS.
- M8.5 observability / backup / rollback rehearsal — PASS.
- M8.6 DNS / LINE / GAS / source-of-truth cutover runbook — PASS.
- M8.7 Production-like UAT / synthetic rehearsal — PASS.
- M8.8 Final Go / No-Go evidence package — PASS.
- M9.1 Server-side Module Routing + Write-Freeze Foundation — PASS / CLOSED IN DEV/TEST.
- M9.2 Routing / Freeze Security & Failure QA — PASS / CLOSED IN DEV/TEST.
- M9.3 Reconciliation / Delta Cutover Tooling — PASS / CLOSED IN DEV/TEST.
- M9.4 Production Landing Zone Preparation — PASS / PREPARED / NOT PROVISIONED.
- M9.5 Fresh Post-M9 Immutable Release Candidate — PASS / CLOSED / NON-PRODUCTION BUILD.
- M9.6 Production Landing Zone Provisioning / Staging — PASS / CLOSED / PROVISIONED + STAGED / NO CUTOVER.
- Production landing-zone provisioning/staging is complete; DNS/LINE mutation, Production data import, source-of-truth switching and module authority switching remain separately Owner-gated.

## Remaining

- Refresh the live Legacy Production baseline immediately before the first named-module cutover, then run actual Production migration/reconciliation evidence with M9.3 tooling and obtain the separate Owner gate before any data import or authority switch.
- M9 controlled named-module cutovers after landing-zone, fresh-release and reconciliation prerequisites pass.
- M10 Full HR Cutover + Stabilization.
- M11 GAS Retirement.
- Production data import/cutover, DNS/LINE changes and source-of-truth switching remain explicit Owner-gated work.

## Files Changed

M9.6 primary changes:

- `infra/production/m9.6-provisioning-status.json`
- `infra/production/verify-m9.6-provisioning-status.mjs`
- `infra/production/m9.6-alerts/*.json` (7 alert-policy contracts)
- `infra/production/m9.6-r2-recovery-proof.mjs`
- `infra/production/m9.6-r2-recovery-proof-clipboard.mjs`
- `docs/M9_CONTROLLED_MODULE_CUTOVERS.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

Production resources verified/provisioned in M9.6:

- runtime service account `ckace-hr-prod@ckrr-leave-system-2026.iam.gserviceaccount.com`
- four CKACE_HR Production Secret Manager containers with enabled version 1 and exact per-secret `secretAccessor` bindings
- Neon `CKACE HR PROD` / `ckace_hr_prod` plus pre-stage snapshot and isolated restore-proof branch
- private R2 primary/backup buckets with primary-only runtime credential scope and synthetic restore proof
- Cloud Run `ckace-hr-api-prod` and `ckace-hr-web-prod` from immutable M9.5 digests
- Firebase Hosting site `ckace-hr-prod` with API/Web rewrites
- four Production uptime checks and seven Cloud Monitoring alert policies

M9.5 primary changes:

- `infra/production/m9-release-manifest.json`
- `infra/production/verify-m9-release-manifest.mjs`
- `infra/production/m9-landing-zone-manifest.json`
- `infra/production/verify-m9-landing-zone.mjs`
- `docs/M9_CONTROLLED_MODULE_CUTOVERS.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

M9.4 primary changes:

- `infra/production/m9-landing-zone-manifest.json`
- `infra/production/verify-m9-landing-zone.mjs`
- `infra/production/render-m9-landing-zone-plan.mjs`
- `docs/M9_CONTROLLED_MODULE_CUTOVERS.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

M9.3 primary changes:

- `packages/migration/src/cutover-evidence.ts`
- `packages/migration/src/cutover-evidence.test.ts`
- `packages/migration/src/source-snapshot.ts`
- `packages/migration/src/index.ts`
- `infra/rehearsal/m9.3-generate-leave-evidence.cjs`
- `infra/rehearsal/m9.3-leave-cutover-evidence.json`
- `docs/M9_CONTROLLED_MODULE_CUTOVERS.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

M9.2 primary changes:

- `apps/api/src/routing/module-routing.guard.ts`
- `apps/api/src/routing/module-routing.guard.test.ts`
- `apps/api/src/security/authorization.guard.ts`
- `apps/api/src/security/authorization.guard.test.ts`
- `apps/api/src/routing/module-routing-config.test.ts`
- `apps/api/src/routing/module-routing.service.test.ts`
- `apps/api/src/routing/m9-routing-failure-boundaries.test.ts`
- `docs/M9_CONTROLLED_MODULE_CUTOVERS.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

M9.1 primary changes:

- `packages/contracts/src/module-routing.ts`
- `packages/contracts/src/index.ts`
- `apps/api/src/routing/module-routing-config.ts`
- `apps/api/src/routing/module-routing-config.test.ts`
- `apps/api/src/routing/module-routing.service.ts`
- `apps/api/src/routing/module-routing.service.test.ts`
- `apps/api/src/routing/module-routing.guard.ts`
- `apps/api/src/routing/module-routing.guard.test.ts`
- `apps/api/src/routing/module-route.decorator.ts`
- `apps/api/src/routing/module-routing.module.ts`
- `apps/api/src/routing/module-route-coverage.test.ts`
- `apps/api/src/security/security-request.ts`
- `apps/api/src/app.module.ts`
- business controllers annotated with `@ModuleRoute(...)`
- `.env.example`
- `docs/M9_CONTROLLED_MODULE_CUTOVERS.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

M8.8 primary changes:

- `docs/M8_FINAL_GO_NO_GO.md`
- `infra/production/go-no-go-manifest.json`
- `infra/production/verify-go-no-go.mjs`
- `docs/M8_PRODUCTION_PREPARATION.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

M8.7 primary changes:

- `apps/api/src/medical/hosted-medical-e2e-smoke.ts` — UAT harness-only correction; not imported by API runtime.
- `infra/production/uat-rehearsal-manifest.json`
- `infra/production/verify-uat-rehearsal.mjs`
- `docs/M8_PRODUCTION_PREPARATION.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

Non-repository M8.7 evidence resources:

- `ckace-hr-api-uat-rehearsal-test`
- `ckace-hr-web-uat-rehearsal-test`
- Cloud Run UAT jobs for Auth, Profile, Leave, Attendance, OT, Medical and final cross-module UAT
- Medical UAT harness image `sha256:cad7a94940073fa89e10b4dc1007cde3cf1d9219cba755eac99f3b334deda9cb`

M8.6 primary changes:

- `docs/M8_CUTOVER_RUNBOOK.md`
- `infra/production/cutover-runbook-manifest.json`
- `infra/production/verify-cutover-runbook.mjs`
- `infra/production/render-production-cutover-plan.mjs`
- `docs/M8_PRODUCTION_PREPARATION.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

M8.5 primary changes:

- `infra/production/observability-rollback-manifest.json`
- `infra/production/verify-observability-rollback.mjs`
- `infra/production/render-production-rollback-plan.mjs`
- `infra/production/m8-r2-restore-rehearsal.mjs`
- `infra/cloudbuild/m8-r2-restore.yaml`
- `infra/cloudrun/m8-r2-restore.Dockerfile`
- `docs/M8_PRODUCTION_PREPARATION.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

Non-repository M8.5 evidence resources:

- private API rollback service `ckace-hr-api-rollback-rehearsal-test`
- private Web rollback service `ckace-hr-web-rollback-rehearsal-test`
- R2 restore job `ckace-hr-m8-r2-restore-test`
- R2 restore image digest `sha256:7445bf8b16c329c8aa5095d27fe5df95b1f8e796260283003cfc431dcd04ad19`
- retained TEST R2 synthetic backup/restore evidence objects

M8.4 primary changes:

- `infra/production/release-manifest.json`
- `infra/production/verify-release-manifest.mjs`
- `infra/production/render-production-deploy-plan.mjs`
- `docs/M8_PRODUCTION_PREPARATION.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

Non-repository release evidence:

- API release image `ckace-hr-api-release:m8-rc-20261006a`
- Web release image `ckace-hr-web-release:m8-rc-20261006a`

M8.3 primary changes:

- `packages/database/src/m8-database-rehearsal.ts`
- `packages/database/src/m8-database-rehearsal.test.ts`
- `docs/M8_PRODUCTION_PREPARATION.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

Non-repository TEST evidence resources:

- Cloud Run Job `ckace-hr-m8-db-rehearsal-test`
- rehearsal image `m8-db-rehearsal-20261006b`

M8.2 primary changes:

- `apps/api/src/runtime/runtime-config.ts`
- `apps/api/src/runtime/runtime-config.test.ts`
- `.env.example`
- `firebase.test.json`
- `firebase.prod.json`
- `infra/production/readiness-manifest.json`
- `docs/M8_PRODUCTION_PREPARATION.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

M7.1 primary changes:

- `packages/contracts/src/profile.ts`
- `packages/contracts/src/index.ts`
- `packages/database/src/profile-repository.ts`
- `packages/database/src/profile-repository.test.ts`
- `packages/database/src/index.ts`
- `packages/business-rules/src/account-state.ts`
- `packages/business-rules/src/account-state.test.ts`
- `packages/migration/src/identity-profile.ts`
- `packages/migration/src/identity-profile.test.ts`
- `packages/migration/src/index.ts`
- `packages/migration/package.json`
- `apps/api/src/security/require-permission.decorator.ts`
- `apps/api/src/security/authorization.guard.ts`
- `apps/api/src/security/authorization.guard.test.ts`
- `apps/api/src/profile/profile.service.ts`
- `apps/api/src/profile/profile.controller.ts`
- `apps/api/src/profile/profile.controller.test.ts`
- `apps/api/src/profile/profile.module.ts`
- `apps/api/src/profile/hosted-profile-smoke.ts`
- `apps/api/src/profile/hosted-profile-e2e-smoke.ts`
- `apps/api/src/app.module.ts`
- `package-lock.json`
- `docs/M7_HR_MODULES.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

M7.2 primary changes:

- `packages/contracts/src/leave.ts`
- `packages/business-rules/src/leave.ts`
- `packages/business-rules/src/leave-rules.ts`
- `packages/database/src/leave-repository.ts`
- `packages/database/src/leave-repository.test.ts`
- `packages/migration/src/leave.ts`
- `packages/migration/src/leave.test.ts`
- `apps/api/src/leave/leave.controller.ts`
- `apps/api/src/leave/leave.service.ts`
- `apps/api/src/leave/leave.controller.test.ts`
- `apps/api/src/leave/hosted-leave-e2e-smoke.ts`
- `packages/database/prisma/migrations/20261005_m7_leave_duration_hourly/migration.sql`
- `packages/database/prisma/migrations/20261005_m7_leave_legacy_step_status/migration.sql`
- `docs/M7_HR_MODULES.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

M7.3 T2 primary changes:

- `packages/contracts/src/attendance.ts`
- `packages/contracts/src/index.ts`
- `packages/business-rules/src/attendance.ts`
- `packages/business-rules/src/attendance.test.ts`
- `packages/business-rules/src/index.ts`
- `docs/M7_HR_MODULES.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

M7.3 T3 primary changes:

- `packages/migration/src/attendance.ts`
- `packages/migration/src/attendance.test.ts`
- `packages/migration/src/index.ts`
- `docs/M7_HR_MODULES.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

M7.3 T4 primary changes:

- `packages/database/src/attendance-repository.ts`
- `packages/database/src/attendance-repository.test.ts`
- `packages/database/src/index.ts`
- `docs/M7_HR_MODULES.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

M7.3 T5 primary changes:

- `apps/api/src/attendance/attendance.controller.ts`
- `apps/api/src/attendance/attendance.service.ts`
- `apps/api/src/attendance/attendance.module.ts`
- `apps/api/src/attendance/attendance.controller.test.ts`
- `apps/api/src/app.module.ts`
- `docs/M7_HR_MODULES.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

M7 final-wave primary changes:

- `packages/contracts/src/benefits.ts`
- `packages/contracts/src/request-status.ts`
- `packages/contracts/src/announcements.ts`
- `packages/contracts/src/onboarding.ts`
- `packages/database/src/request-status-repository.ts`
- `packages/database/src/announcement-repository.ts`
- `packages/database/src/attachment-repository.ts`
- `packages/database/src/notification-admin-repository.ts`
- `packages/database/src/onboarding-repository.ts`
- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/20261005_m7_attachment_finalize/migration.sql`
- `packages/database/prisma/migrations/20261005_m7_onboarding_password_hash/migration.sql`
- `packages/storage/src/private-attachment-storage.service.ts`
- `packages/storage/src/storage.test.ts`
- `apps/api/src/benefits/*`
- `apps/api/src/request-status/*`
- `apps/api/src/announcements/*`
- `apps/api/src/attachments/*`
- `apps/api/src/admin/*`
- `apps/api/src/onboarding/*`
- `apps/api/src/hosted-m7-final-e2e-smoke.ts`
- `apps/api/src/app.module.ts`
- `packages/migration/src/announcements.ts`
- `packages/migration/src/announcements.test.ts`
- `vitest.config.ts`
- `package-lock.json`
- `docs/M7_HR_MODULES.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

## Verification

- M9.6 status verifier: `M9_6_PROVISIONING_STATUS_VERIFY_PASS p1=PASS p2=PASS p4=PASS p5=PASS p6=HELD_BY_GATE qa=PASS routing=LEGACY source=LEGACY cutover=0`.
- M9.6 P1 PASS: dedicated Production runtime service account plus four secret containers with per-secret `secretAccessor`; no project-wide runtime role.
- M9.6 P2 PASS: dedicated Neon Production and private R2 primary/backup boundaries verified; all four Production secret versions are enabled; no Production business data/schema import occurred.
- M9.6 recovery proofs PASS: Neon restore used an isolated branch and left Production unchanged; R2 synthetic backup/restore ended with matching SHA-256 and temporary recovery tokens revoked.
- M9.6 P4 PASS: Production API/Web Cloud Run revisions and Firebase Hosting front door staged from immutable M9.5 digests; routing remains `LEGACY`.
- M9.6 P5 PASS: four uptime checks and seven alert policies verified; final Cloud Run ERROR-log query returned 0 entries.
- M9.6 P6 is held by separate Owner gate: DNS/custom domain remains NXDOMAIN/unchanged; LINE/GAS/source-of-truth/module authority remain unchanged.
- M9.5 release verifier marker: `M9_5_RELEASE_VERIFY_PASS release=ckace-hr-m9-rc-20261006a source=478e320df30215adb79965abbbe54c34db3c02ac5da41b6669bfa23c850f86a2 api=sha256:8a14832c4361e4813e786899ee169a93fa4e07beafcb4866771a950d198bb88b web=sha256:a7bc1b9b729518a47345a610a96b7927e5f81defb00fc9ac702f46344656aeeb migrations=0f21a111f6fd30a06378d51900e1b0974b91d04aba636366fea5e682e54fabe5 production_mutation=0`.
- API Cloud Build `e81e8278-8332-4eab-9328-1b2896b86ada` SUCCESS; registry digest `sha256:8a14832c4361e4813e786899ee169a93fa4e07beafcb4866771a950d198bb88b` verified.
- Web Cloud Build `1160f5a5-17dd-4b00-ade9-4c09d7bda460` SUCCESS; registry digest `sha256:a7bc1b9b729518a47345a610a96b7927e5f81defb00fc9ac702f46344656aeeb` verified.
- frozen post-M9 runtime input: 221 files, source SHA-256 `478e320df30215adb79965abbbe54c34db3c02ac5da41b6669bfa23c850f86a2`; schema/migration set unchanged at 5 migrations.
- M9.5 pre-provisioning landing-zone verifier (historical baseline): fresh release `BUILT_VERIFIED`; Production services/SA/secrets/alerts were still absent at M9.5 close and DNS was NXDOMAIN. M9.6 later provisioned/staged the landing zone without cutover.
- M9.5 full repository gate task `563da958-187f-41f9-af20-e2b2823ce101`: `npm run check` PASS; lint/typecheck PASS; 54 test files / 353 tests PASS; packages/API/Next.js production build PASS.
- M9.5 Production deploy/provisioning/data/DNS/LINE/GAS/source-of-truth/module-routing mutation: NONE; coarse runtime routing remains `LEGACY`.
- M9.4 live readback: Production Project B Cloud Run services = 0; dedicated Production runtime SA = absent; CKACE_HR Production secrets = 0/4 present; alert policies = 0; `hr.ckaceaccount.com` = NXDOMAIN.
- M9.4 legacy gateway readback: `ckrr-line-gateway-ownerui-20261006a` remains 100% traffic.
- M9.4 Firebase CLI unavailable locally; Neon connector returns 401; R2 provider inventory is not connected. These are observability limitations and are not treated as proof of provisioning.
- M9.4 verifier marker: `M9_4_LANDING_ZONE_VERIFY_PASS prod_services=0 prod_sa=0 prod_secrets=0 alerts=0 dns=NXDOMAIN fresh_release=NOT_BUILT production_mutation=0`.
- M9.4 renderer: `PLAN_ONLY_NON_EXECUTABLE`, `productionMutationExecuted=false`, `ownerApprovalRequired=true`, all Production-mutating phases `NOT_AUTHORIZED`.
- M9.4 verifier/renderer `node --check`: PASS.
- M9.4 Production mutation: NONE; coarse runtime routing remains `LEGACY`.
- M9.3 targeted cutover/reconciliation QA: 4 test files / 24 tests PASS.
- M9.3 workspace typecheck: PASS.
- M9.3 full repository gate task `99891b65-9d03-43bc-b48c-80a6bb1c6204`: `npm run check` PASS; lint/typecheck PASS; 54 test files / 353 tests PASS; packages/API/Next.js production build PASS.
- snapshot integrity fail-closes on source descriptor drift, provenance mismatch, payload tampering and snapshot-hash mismatch.
- pre-switch evidence requires LEGACY/LEGACY authority plus active write-freeze, exact bounded import-report coverage, explicit removal/module reconciliation and health/readiness/auth/idempotency PASS.
- synthetic LEAVE artifact `infra/rehearsal/m9.3-leave-cutover-evidence.json`: gate PASS, delta 1 ADDED + 1 CHANGED, reconciliation 3 PASS / 0 EXCEPTION / 0 FAIL, evidence hash `e96bb2935d42a4b3070f8e4ef53eb8b1d491dc505c589ccf58ebce70d669f90b`, Production mutation authorization false.
- M9.3 live Production changes: NONE; coarse runtime routing remains `LEGACY`.
- M9.2 targeted security/failure gate task `138bee21-2d8a-487f-b480-97dca7d2ff6f`: 6 test files / 67 tests PASS.
- M9.2 workspace typecheck task `b84c7245-d043-4e33-b1ac-4016c5cc6099`: PASS.
- M9.2 full repository gate task `aa6a16a7-90ed-448d-b4fa-0c8e6852b5bc`: `npm run check` PASS; lint/typecheck PASS; 53 test files / 344 tests PASS; packages/API/Next.js production build PASS.
- protected frozen route ordering: unauthenticated -> 401, unauthorized -> 403, authorized frozen write -> 503; freeze state is not disclosed before auth.
- invalid/malformed/unknown/split routing configuration and Production `NEW` routing fail closed.
- forged client routing context is overwritten by server-derived authority.
- 32 concurrent frozen public write attempts are all rejected before controller execution.
- ModuleRoutingService configuration is stable per service instance and changes only after recreation.
- ambiguous repository failures for Leave/Attendance/OT/Medical are propagated after exactly one repository call; no blind retry.
- earlier OT targeted-test failure was test-input-only (`clientKey` too short) and was corrected without runtime behavior change.
- M9.2 live Production changes: NONE; coarse runtime routing remains `LEGACY`.
- M9.1 targeted routing gate: 4 test files / 51 tests PASS.
- M9.1 full repository gate task `84d1c986-17de-4fa8-aae4-360ab942db5d`: `npm run check` PASS; lint/typecheck PASS; 52 test files / 332 tests PASS; packages/API/Next.js production build PASS.
- M9.1 route contract: 13 module keys / 26 paired READ+WRITE route keys; default all `LEGACY`.
- M9.1 controller coverage: 40 existing business HTTP handlers explicitly mapped; regression test fails future business endpoints without routing metadata.
- paired READ/WRITE authority mismatch = fail closed; unknown route/authority/freeze module = fail closed.
- Production routing to `NEW` remains rejected during M9.1.
- frozen module WRITE routes fail before controller execution with `MODULE_WRITE_FROZEN`, HTTP 503, `retryable=false`; READ remains available.
- forged client `moduleRouting` state is overwritten by server-derived routing context.
- M9.1 Production deploy/data/DNS/LINE/GAS/source-of-truth mutation: NONE; coarse runtime routing remains `LEGACY`.
- M8.8 final marker: `M8_FINAL_GO_NO_GO_VERIFY_PASS m8=PASS m9_engineering=GO production_switch=NO_GO release=ckace-hr-m8-rc-20261006a legacy=ckrr-line-gateway-ownerui-20261006a production_mutation=0`.
- M8.8 live Cloud Run Production inventory: no `ckace-hr-*-prod` services.
- M8.8 live DNS: `hr.ckaceaccount.com` = NXDOMAIN.
- M8.8 live legacy Production: `ckrr-line-gateway-ownerui-20261006a=100%`, digest `sha256:272fc4db43213b50b90387477d7f0e864f8c2d9cd0a4354c2b1608effea87d7f`.
- Project A records transient read-only secondary-API 502/timeouts after the owner-ui deploy; refresh a clean execution-window baseline before future Production switching.
- M8.4 frozen source fingerprint remains `e7c189bc9a60030cc69167a090ccfafc8e190316d452cb2103fb582bfd5cb619`; current post-UAT tree fingerprint is `c76bbeb56f77c21ea434ae4601c5a179ca4e2b148b209af980d01591decf7b2f`, 208 files. Historical release provenance remains frozen.
- M8.5/M8.6/M8.7 verifiers re-run PASS before M8.8 close.
- last full repository gate after M8.7 source changes: `npm run check` PASS; 48 test files / 281 tests PASS; lint/typecheck/packages/API/Next.js production build PASS.
- M8.8 performed no Production deploy/provisioning/data/DNS/LINE/GAS/routing mutation.
- M8.7 final repository gate: `npm run check` PASS; 48 test files / 281 tests PASS; lint/typecheck/packages/API/Next.js production build PASS.
- M8.7 Production-like API health = HTTP 200; readiness = HTTP 200 with database connected; routing remains `LEGACY`.
- M8.7 Web foundation `/` and `/liff` = HTTP 200 with mobile viewport metadata. Functional HR UI is explicitly deferred by Owner and is not claimed as tested.
- M8.7 Auth = PASS.
- Identity/Profile marker `M7_IDENTITY_PROFILE_E2E_PASS`.
- Leave marker `M7_LEAVE_E2E_PASS`.
- Attendance/Time Correction marker `M7_ATTENDANCE_E2E_PASS`.
- OT marker `M7_OVERTIME_E2E_PASS`.
- Medical final marker `M7_MEDICAL_E2E_PASS`; initial HTTP400 harness attempt was superseded by corrected standalone UAT harness against the unchanged M8.4 target API.
- final cross-module execution `ckace-hr-m8-uat-final-test-t874m` SUCCESS with `M7_FINAL_E2E_PASS`; includes Benefits, Request Status, Attachments/R2, Announcements, Admin/Notifications and Onboarding.
- M8.7 verifier marker: `M8_UAT_REHEARSAL_VERIFY_PASS release=ckace-hr-m8-rc-20261006a backend=7 web=FOUNDATION_ONLY routing=LEGACY production_mutation=0`.
- canonical TEST remained API `ckace-hr-api-test-00012-lwk=100%` and Web `ckace-hr-web-test-00001-nwx=100%`.
- M8.4 immutable release manifest remains frozen. Current working-tree source digest differs after post-release UAT harness/test work; this does not change the pinned API/Web Artifact Registry digests and must be reviewed separately in M8.8.
- separate Project A workstream advanced legacy Production to `ckrr-line-gateway-ownerui-20261006a=100%`, image digest `sha256:272fc4db43213b50b90387477d7f0e864f8c2d9cd0a4354c2b1608effea87d7f`; M8.7 itself performed no Production mutation.
- M8.6 final repository gate: `npm run check` PASS; 48 test files / 281 tests PASS; lint/typecheck/packages/API/Next.js production build PASS.
- M8.6 live current state: `ckrr-line-gateway-readretry-20261006a` remains 100%; immutable legacy image digest `sha256:0b475189399a2f0d5d18e7fbdaf7d3522713e15332dde001fb0367ff88c380a8`.
- Project A accepted anchor: GAS v38; historical rollback v37; Production LIFF `2011403971-rHQJIrOx`; Rich Menu aliases `employee-user`, `approver-menu`, `account-link`.
- M8.6 close baseline (historical): no `ckace-hr-api-prod` / `ckace-hr-web-prod` services existed yet; `hr.ckaceaccount.com` was NXDOMAIN. M9.6 later staged both Production services while DNS remained unchanged.
- M8.6 routing-gap audit: per-module contract exists but has no runtime routing consumer; runtime accepts `LEGACY` only; Benefits/Request Status/Attachments/Notifications/Onboarding/announcement-write coverage remains an M9 implementation prerequisite.
- M8.6 verifier marker: `M8_CUTOVER_RUNBOOK_VERIFY_PASS release=ckace-hr-m8-rc-20261006a legacy=ckrr-line-gateway-readretry-20261006a phases=6 owner_gates=9 production_mutation=0`.
- non-executable cutover renderer: PASS; execution blockers include M8.7, M8.8, Production landing zone/backups/alerts, routing plane, write-freeze and full route coverage.
- source-of-truth policy locks paired read/write cutover inside a bounded write freeze and forbids blind return to GAS after any NEW-authority write.
- Production deploy/provisioning/data/DNS/LINE/GAS/routing mutation during M8.6: NONE.
- M8.5 final repository gate: `npm run check` PASS; 48 test files / 281 tests PASS; lint/typecheck/packages/API/Next.js production build PASS.
- M8.5 verifier marker: `M8_OBSERVABILITY_ROLLBACK_VERIFY_PASS release=ckace-hr-m8-rc-20261006a api_rollback=PASS web_rollback=PASS db_recovery=PASS r2_recovery=PASS alerts=7`.
- TEST `/api/health` and `/api/ready` = HTTP 200; readiness confirms database connected; Cloud Run request logs expose status/latency/trace/span/revision/service evidence.
- API isolated rollback rehearsal: M8.4 candidate 100% traffic then baseline 100% rollback — PASS.
- Web isolated rollback rehearsal: M8.4 candidate 100% traffic then baseline 100% rollback — PASS.
- primary TEST services remained unchanged: API `ckace-hr-api-test-00012-lwk` 100%, Web `ckace-hr-web-test-00001-nwx` 100%.
- database recovery evidence from M8.3 remains PASS with recovered fingerprint `faf3daecb280265054ffe2b3a909eccb00effedd21d02a7b8c387c0bb757b2ea`.
- R2 restore build `a6c5e23a-9424-4ec7-841b-3153bc34e63a` SUCCESS; image digest `sha256:7445bf8b16c329c8aa5095d27fe5df95b1f8e796260283003cfc431dcd04ad19`.
- R2 restore execution `ckace-hr-m8-r2-restore-test-trxfl` SUCCESS; marker `M8_R2_RESTORE_PASS backup_match=1 mutation_detected=1 restore_match=1 retained=1`; checksum `8b6623f0dc5d930c90f90bfa905cabefb6f1a0bd87afd3b416ffce89a699f6a9`.
- At M8.5 close (historical), Production alert policies and Production DB/R2 backup resources were not provisioned and were later Owner-gated prerequisites; M9.6 subsequently provisioned/verified them without performing a cutover.
- M8.5 rehearsal services/jobs/R2 evidence objects remain retained; destructive cleanup requires separate explicit Owner approval.
- Production deploy/provisioning/data/DNS/LINE/GAS/routing mutation during M8.5: NONE.
- M8.4 final repository gate: `npm run check` PASS; 48 test files / 281 tests PASS; lint/typecheck/packages/API/Next.js production build PASS.
- M8.4 source input fingerprint: 208 files, SHA-256 `e7c189bc9a60030cc69167a090ccfafc8e190316d452cb2103fb582bfd5cb619`.
- M8.4 migration-set SHA-256: `0f21a111f6fd30a06378d51900e1b0974b91d04aba636366fea5e682e54fabe5`.
- API build `cbe7f999-2f5d-4de4-8956-76985ca11a9d` SUCCESS; immutable digest `sha256:bef4064b47a4a1dfc6437522248243a60805299582b70e18087891e4c0aaee2b`.
- Web build `0efdf7b7-7bb3-4384-9930-a671a63dcc3c` SUCCESS; immutable digest `sha256:aced93f23bc778bb33ff7c825b36763e450312c5ad143c7cd0ba19e184a1da49`.
- Artifact Registry live immutable-ref verification: PASS for API and Web.
- `M8_RELEASE_MANIFEST_VERIFY_PASS`: PASS; negative self-test rejects tag-only deployment authority.
- structured deployment renderer is non-executable, uses immutable image refs only and remains blocked on Owner-approved `R2_ACCOUNT_ID`, `LINE_LOGIN_CHANNEL_ID` and Production deploy approval.
- Production deploy/provisioning/data/DNS/LINE/GAS/routing mutation during M8.4: NONE.
- M8.3 final repository gate: `npm run check` PASS; 48 test files / 281 tests PASS; lint/typecheck/packages/API/Next.js production build PASS.
- M8.3 Cloud Build `4acb2968-e4df-4c16-96a5-fd0d6287da08` SUCCESS; image digest `sha256:365d509a882ae290e98be42ef1d0be41831753c3ffd2558a05bad59e558ba1e0`.
- M8.3 hosted execution `ckace-hr-m8-db-rehearsal-test-xznk9` SUCCESS.
- M8.3 marker: `M8_DB_REHEARSAL_PASS migrations=5 schema_columns=326 synthetic_import=1 mutation_detected=1 snapshot_match=1 recovered_match=1 production_mutation=0`.
- M8.3 recovered fingerprint: `faf3daecb280265054ffe2b3a909eccb00effedd21d02a7b8c387c0bb757b2ea`.
- Rehearsal databases and TEST job remain as evidence; cleanup is deferred because deletion is destructive and requires separate explicit approval.
- Production database/deploy/DNS/LINE/GAS/routing mutation during M8.3: NONE.
- M8.2 final repository gate: `npm run check` PASS; 47 test files / 278 tests PASS; lint/typecheck/packages/API/Next.js production build PASS.
- M8.2 runtime config tests: Production requires dedicated `ckace_hr_prod`, dedicated `ckace-hr-prod-private`, required bridge/R2/LINE configuration and `LEGACY` routing.
- M8.2 Firebase split: TEST site `ckrr-leave-system-2026`; planned Production site `ckace-hr-prod`; no Hosting deploy performed.
- M8.2 readiness manifest contains resource/secret references only and `productionMutationAuthorized=false`.
- M8.2 live IAM parity evidence: TEST runtime secret access is per-secret `roles/secretmanager.secretAccessor`; no CKACE_HR Production services/runtime SA/secret set was provisioned.
- Production deploy/data/DNS/LINE/GAS/routing mutation during M8.2: NONE.
- pre-T5 full repository `npm run check` baseline: PASS, 31 test files / 189 tests; lint/typecheck/build PASS.
- npm audit: 0 vulnerabilities.
- Prisma 6.12.0 validate: PASS.
- M7.1 Identity/Profile final verification: PASS.
- M7.2 Leave final build `9c94d98c-9efa-4ca9-b9ce-8c16b106c9c3`: SUCCESS.
- M7.2 final TEST API revision: `ckace-hr-api-test-00007-642` at 100%.
- TEST API health/ready: 200 / 200.
- TEST signed-out Leave self/options: 401 / 401.
- authenticated synthetic Leave E2E: PASS with create/replay/conflict/overview/cancel checks and forged headers ignored.
- synthetic Leave E2E cleanup: PASS.
- TEST runtime remains `LEGACY`.
- M7.3 T2 Attendance business-rule tests: 15/15 PASS.
- `@ckace/contracts` lint/typecheck/build: PASS.
- `@ckace/business-rules` lint/typecheck/build: PASS.
- M7.3 schema-gap decision: no Prisma migration required in T2; explicit AttendanceRecord UUID targeting avoids date-only ambiguity, while event source can be derived from provenance/correction state in the repository layer.
- M7.3 T3 targeted migration/reconciliation suite: 3 files / 22 tests PASS.
- Full `@ckace/migration` suite after T3: 8 files / 61 tests PASS.
- `@ckace/migration` lint/typecheck/build: PASS.
- TimeLog transformer preserves source-qualified LogID, nullable checkout, legacy location/comments, work/OT minutes and radius classification.
- TimeCorrections transformer preserves raw Thai status plus canonical status and uses employee/date lookup with `REQUIRE_EXACTLY_ONE_MATCH_OR_EXPLICIT_EXCEPTION`.
- Reconciliation exposes duplicate-business-day and nullable-checkout as explicit non-blocking legacy exceptions; true source/target drift remains blocking FAIL.
- M7.3 T4 repository/persistence: PASS.
- final database suite: 5 files / 38 tests PASS.
- final full repository `npm run check`: 31 test files / 189 tests PASS; lint/typecheck/build PASS.
- Attendance persistence enforces ACTIVE account, serializable idempotent check-in/check-out, explicit record ownership/date targeting, actual approved OT calculation, server-side Time Correction approver resolution, atomic decision, audit/outbox, and duplicate-business-day fail-closed behavior.
- independent read-only reviewer was cancelled after exceeding the bounded Task window without returning a result; it is not counted as verification evidence.
- compatibility risk retained for M7.3 closeout: older Desktop legacy could create a correction when the original attendance event was missing, while current LIFF/canonical path requires an existing original event. M0 current corrections have zero missing TimeLog matches, and routing remains `LEGACY`.
- M7.3 T5 API/security suite: 7 API test files / 32 tests PASS.
- `@ckace/hr-api` typecheck/lint/build: PASS after T5.
- Attendance/Time Correction routes are wired through `AttendanceModule`; self routes require explicit SELF permissions and assigned/decision routes require `time_correction.approve` GLOBAL plus repository-level assignment checks.
- client-provided employee/role/approver identity is not authority and is excluded from idempotency canonical payloads.
- T5 performed no deploy/runtime/routing/Production mutation.
- M7.3 T6 build `06ca9f66-3426-43d0-9c6f-2bfc74c9fb76` SUCCESS; QA image `m7-attendance-20261005b`, digest `sha256:341418b34ab40d10e3046201ae109cef37df5792d29590c4a50c1ab26977e398`.
- TEST service revision `ckace-hr-api-test-00008-wlq` serves 100% from `m7-attendance-20261005a`; TEST service account, Secret Manager references and `LEGACY` routing verified unchanged.
- Firebase same-origin health/ready = 200/200; signed-out Attendance self, Time Correction self and assigned routes = 401.
- hosted synthetic Attendance/Time Correction E2E execution `ckace-hr-attendance-smoke-test-jfnlt` completed successfully.
- E2E marker: `M7_ATTENDANCE_E2E_PASS checkin=201 replay=201 conflict=409 checkout=201 checkout_replay=201 overview=200 correction=201 assigned=200 decision=201 forged_headers_ignored=1`.
- synthetic cleanup completed successfully before container exit 0.
- M7.3 Attendance / Time Correction = PASS.
- M7.5 T1 read-only Medical/privacy/schema audit: PASS.
- Medical live baseline: 18 claims / 28 approval steps / 21 attachments; 17 Approved / 1 Rejected; 16/18 without Linked_LeaveID.
- Medical archive: 5/5 ClaimID collisions with current; source-qualified provenance mandatory.
- Medical privacy contract: MEDICAL_PRIVATE only, claim/file/owner authorization, no provider URLs/storage keys in business responses, finalized attachment IDs only on claim create.
- M7.5 T2 Medical business rules: 11/11 tests PASS.
- `@ckace/contracts` and `@ckace/business-rules` Medical state: typecheck/lint/build PASS.
- M7.5 T3 Medical migration/reconciliation: targeted regression 3 files / 26 tests PASS; `@ckace/migration` typecheck/lint/build PASS.
- Medical migration keeps current/archive ClaimID identity source-qualified, pins current approval/file rows to current provenance only, preserves Rejected -> downstream Pending raw history, and records archive approval/attachment ambiguity as an explicit non-fabricated exception.
- M7.5 T4 Medical repository/persistence: PASS. ACTIVE-account self/approver guards, active MEDICAL BenefitPolicy annual-limit resolution, Bangkok calendar-year committed quota, optional owned Leave link validation, finalized actor-owned MEDICAL_PRIVATE R2 receipt guards, serializable idempotent create, server-derived Admin/SuperAdmin auto-approval or MEDICAL approval policy chain, pending-only cancel, assigned current-step decisions, audit/outbox and safe attachment projections implemented.
- Medical repository targeted regression: 3 files / 17 tests PASS; full database folder: 7 files / 50 tests PASS; `@ckace/database` typecheck/lint/build PASS.
- `npm test -w @ckace/database` is not a valid repo command because that workspace has no `test` script; verification used the repository-supported Vitest command instead. This is a non-blocking command mismatch, not a product defect.
- M7.5 T5 Medical API/security: PASS. Added Medical NestJS module/controller/service and AppModule wiring; strict request/UUID parsing; canonical idempotency payload excludes clientKey and forged actor/role fields; server-derived requester/approver identity; `medical.self.read/write` SELF guards; `medical.approve` GLOBAL permission plus repository assigned-current-step enforcement; repository errors map fail-closed to HTTP classes.
- Medical API targeted regression: 2 files / 11 tests PASS; full `apps/api/src` regression: 9 files / 46 tests PASS; `@ckace/hr-api` typecheck/lint/build PASS.
- T2 added safe claim/self/approval contracts, 1,000 per-claim cap, 10,000 annual committed logic, future-date guard, 1–3 unique receipt IDs, legacy MIME/size limits, Admin/SuperAdmin auto-approval rule, Pending-only cancel and rejection-comment validation.
- M7 final repository gate: `npm run check` PASS; 47 test files / 274 tests PASS; lint/typecheck/packages/API/Next.js build PASS.
- M7 final dependency/security gate: `npm audit --audit-level=high` = 0 vulnerabilities.
- Neon final gate: 5/5 migrations applied; schema up to date; Prisma validate PASS.
- final Cloud Build `675f9658-00c2-4664-a477-a8981ce1977f` SUCCESS.
- final image `m7-final-20261005b`, digest `sha256:2c463c601c9c9e6af3d1e24a45dd19d26bd33d731ab721868bdbca9945e6705f`.
- final TEST API revision `ckace-hr-api-test-00012-lwk` serves 100% with dedicated TEST service account; Neon/bridge/R2 Secret Manager refs preserved; `CKACE_MODULE_ROUTING=LEGACY`.
- direct Cloud Run and Firebase same-origin health/ready = 200/200 with database connected.
- signed-out Profile, Leave, Attendance, Overtime, Medical, Benefits, Request Status, Announcements and Admin settings = 401.
- exact-final-image hosted E2E execution `ckace-hr-attendance-smoke-test-7l97f` completed successfully.
- final E2E marker: `M7_FINAL_E2E_PASS benefits=200 requests_self=200 requests_assigned=200 attachment_upload=201 attachment_finalize=201 announcement_create=201 announcement_read=200 announcement_relation_download=201 generic_attachment_denied=403 admin_notifications=200 admin_retry=201 admin_settings=200 onboarding_register=201 pending_line_bind=1 pending_actor_denied=1 onboarding_approve=201 onboarding_replay=201 active_actor=1 privacy_no_provider_metadata=1 forged_headers_ignored=1`.
- synthetic residue verification: all checked employee/account/announcement/outbox/medical/overtime/attachment/agency/department/temporary-role/temporary-leave-type/temporary-benefit-policy counts = 0.
- reused Attendance smoke job restored to its original image/command/target and DB/bridge secret configuration.
- Git still has no approved baseline commit; files remain untracked and no commit/push was performed.

## Known Issues / Risks

- M7 has no unresolved blocking issue in DEV/TEST.
- M8 is PASS / CLOSED and M9.6 landing-zone provisioning/staging is now PASS / CLOSED. Production business-data import and authority/source-of-truth cutover remain NO-GO until the named-module execution-window evidence and separate Owner gate pass.
- The Production landing zone is provisioned and staged, but no Production business data/schema cutover has occurred; source-of-truth and module routing remain `LEGACY` until a separately approved named-module cutover.
- Neon Production is PostgreSQL 18; M9.6 deliberately did not persist the application schema. Revalidate Prisma 6.12 migration/runtime compatibility immediately before the first persistent Production schema apply.
- Neon Free-plan history retention was observed as a 6-hour window; a manual pre-stage snapshot and isolated restore proof exist. Do not upgrade to a paid plan without an Owner gate.
- archive approval/attachment history remains a known legacy ambiguity; never join by legacy ID alone.
- one real Attendance duplicate-business-day exception must remain distinct.
- repository has no approved Git baseline commit.
- Web/LIFF remains foundation UI by Owner decision; functional Web/LIFF HR UI/mobile UX is deferred to a later dedicated project and is not an M8.7/M8.8 blocker.
- M9.1 routing control-plane prerequisites are now implemented and verified in DEV/TEST: full M7 route coverage, server-derived authority resolution and bounded write-freeze.
- M9.1 routing/write-freeze foundation and M9.2 security/failure QA are implemented and verified in DEV/TEST.
- M9.2 fixed auth-before-freeze disclosure ordering for protected routes; future changes must preserve 401/403 before 503 freeze disclosure.
- Actual named-module Production authority switching remains later M9 Owner-gated work.
- Fresh post-M9 immutable release prerequisite is satisfied by `ckace-hr-m9-rc-20261006a`, and the Production landing zone is now provisioned/staged. Production business-data import and named-module authority switching still require execution-window evidence plus a separate explicit Owner gate.
- Legacy operational risk confirmed again in the 2026-10-07 pre-cutover read-only refresh: `ckrr-line-gateway-ownerui-20261006a` remains 100% at digest `sha256:272fc4db43213b50b90387477d7f0e864f8c2d9cd0a4354c2b1608effea87d7f`; `/`, `/liff`, `/health` are 200 and the latest 5-minute ERROR slice was empty, but the 30-minute lookback contained three HTTP 502 request errors on `/api/liff/corrections`, `/api/liff/benefits`, and `/api/liff/announcements`. Require a fresh clean quiet-window check before any Production authority switch.

## Decisions

- backend/server remains authorization authority.
- client UID/role is not authority.
- legacy extraction remains read-only.
- source-qualified provenance and explicit reconciliation dispositions remain mandatory.
- coarse runtime routing remains `LEGACY` through M9.1; DEV/TEST may resolve paired per-module `NEW` authority only through server-controlled M9 routing state.
- write-capable module cutover must switch read/write authority together inside a bounded write-freeze window after final delta reconciliation.
- after any NEW-authority business write, blind routing back to GAS is prohibited; stop writes and reconcile before an Owner-approved rollback/fix.
- preserve the existing Production LIFF ID and current three Rich Menu objects during M9 module cutovers; direct LIFF endpoint change is a later Owner-gated step.
- no Production import/write/source switch, DNS/LINE change or cutover without explicit Owner approval.
- no Git commit/push without explicit Owner approval.

## Current Goal

M9D.2 — LEAVE Desktop — complete at code/UI level.

Owner direction remains Desktop-first. This chat owns Project B (`D:\\CKACE_HR`) only. Project A / LINE LIFF/mobile / Rich Menu / Flex remain owned by the separate Project A chat.

## Completed

- Preserved the M9D.1 signed HttpOnly Desktop session and server-derived RBAC shell.
- Implemented Desktop LEAVE dashboard at `/desktop/leave` with entitlement balances, request metrics, create form and leave history.
- Implemented leave request create/cancel flows against canonical Project B APIs; browser-supplied employee/role identity is not trusted.
- Implemented approval-chain selection from server-provided eligible approver options.
- Implemented leave duration states for full day, morning, afternoon and hourly leave, including hourly time inputs.
- Implemented LEAVE-only request status at `/desktop/requests`.
- Implemented LEAVE approval queue at `/desktop/approvals`.
- Added canonical `POST /api/leave/requests/:requestId/decision` instead of using the legacy-LIFF compatibility endpoint.
- Approval decisions derive approver identity from the authenticated server actor, require explicit `leave.approve` GLOBAL permission, validate current approval-step ownership/order, require a reason for rejection, and update approval/request/audit/notification state transactionally.
- Enabled Desktop shell navigation for Leave / Request Status / Approvals only when server navigation capabilities expose them.
- Added loading, empty, signed-out/API failure, disabled-action and responsive states. API 503 remains visible when the module route is not enabled in the current environment.
- Existing `/liff` route and all Project A files were untouched.

## Verification

- LEAVE targeted controller/repository tests: 2 files / 12 tests PASS after the final security assertion.
- Explicit security assertion verifies the decision route requires `leave.approve` with GLOBAL scope.
- Full repository lint PASS.
- Full repository typecheck PASS.
- Full repository tests PASS: 57 files / 365 tests.
- Production build PASS.
- Next.js production build verifies `/desktop/leave`, `/desktop/requests`, `/desktop/approvals`, plus existing `/`, `/desktop`, `/login`, and `/liff`.

## TEST Readiness

- M9D.2 is not deployed to hosted TEST in this task.
- Hosted Desktop authentication still requires managed `CKACE_DESKTOP_SESSION_SECRET` and, where Legacy password verification is used, `CKACE_LEGACY_PASSWORD_SALT`.
- LEAVE TEST execution will additionally require TEST module routing for LEAVE read/write and Request Status read, plus appropriate RBAC data including `leave.approve` for approvers.
- No credential/security/TEST routing mutation was performed in M9D.2.

## Safety State

- LEAVE READ = `LEGACY`;
- LEAVE WRITE = `LEGACY`;
- source-of-truth = `LEGACY`;
- write freeze = OFF;
- Production baseline schema/data staging from the earlier preparation remains present;
- final delta = not captured;
- module authority switch = 0;
- Project A / LINE / LIFF / Rich Menu / Flex mutation from this chat = 0;
- DNS/GAS mutation = 0;
- Production credential migration = 0;
- Legacy retirement = 0.

## Known Issues / Risks

- Production user accounts still do not have migrated password hashes; Production credential migration remains a separate explicit security gate.
- Hosted TEST Desktop authentication/routing/RBAC configuration is not part of M9D.2 and remains for the later TEST/UAT phase.
- Historical LEAVE archive/attachment exceptions remain source-qualified and unchanged.
- The new `leave.approve` permission must exist in the target environment RBAC data before hosted approval UAT.
- LINE LIFF/mobile remains a separate Project A workstream and is not a dependency for Desktop development.

## Completed — M9D.3 Unified Desktop Request Status / Approval Center

- `/desktop/requests` is now a unified multi-module status view for LEAVE, TIME_CORRECTION, OVERTIME and MEDICAL.
- Added type/status filters, unified metrics, module labels and responsive/loading/empty/error/503 states.
- `/desktop/approvals` is now a unified approval center for the same four request kinds.
- Approval actions dispatch to each existing canonical Project B endpoint:
  - LEAVE -> `/api/leave/requests/:id/decision`
  - TIME_CORRECTION -> `/api/attendance/time-corrections/:id/decision`
  - OVERTIME -> `/api/overtime/requests/:id/decision`
  - MEDICAL -> `/api/medical/claims/:id/decision`
- Aggregate approval visibility is filtered from server-derived module permissions: `leave.approve`, `time_correction.approve`, `overtime.approve`, `medical.approve`.
- The generic Approval Center no longer grants visibility solely from a broad client/navigation role; each module decision API still performs its own canonical authorization check.
- Desktop navigation shows Approval Center when any supported module-approve permission exists.
- Targeted Request Status/navigation tests PASS: 2 files / 4 tests.
- Full repository lint PASS.
- Full repository typecheck PASS.
- Full repository tests PASS: 57 files / 366 tests.
- Production build PASS and confirms `/desktop/requests` and `/desktop/approvals`.
- No hosted TEST deployment, Production routing/authority switch, credential migration, Project A, LINE, LIFF, Rich Menu, Flex, DNS or GAS mutation occurred.

## Remaining / Risks

- Unified center can display/decide a module only when that environment has the matching module-specific approve permission and the module route is enabled.
- Module-specific Desktop create/history screens for Attendance/Time Correction, OT and Medical remain future M9D tasks.
- Hosted Desktop TEST/UAT remains deferred until managed Desktop auth secrets, TEST routing and RBAC data are provisioned.
- Production authority/source-of-truth remains `LEGACY`.

## Next Recommended Action

Start M9D.4 — Attendance Desktop: attendance dashboard/history and the Time Correction Desktop flows, reusing the unified Request Status / Approval Center completed in M9D.3.

## Status

PASS — M9D.3 CODE/UI CLOSED / UNIFIED REQUEST STATUS + APPROVAL CENTER READY FOR LATER TEST/UAT / PRODUCTION AUTHORITY LEGACY

## Completed — M9D.4 Attendance Desktop

- Added `/desktop/attendance` as the Project B Desktop Attendance surface.
- Attendance dashboard shows business-day state, current check-in/check-out summary and server-derived current status.
- Attendance history shows check-in/check-out timestamps, work minutes, late minutes, early minutes, overtime minutes, radius state, policy version and source (`DEVICE` / `CORRECTION` / `LEGACY`).
- Desktop intentionally does **not** perform Check-in/Check-out writes in M9D.4; those actions remain outside this Desktop phase.
- Time Correction is integrated in the same Desktop module:
  - create correction from an owned Attendance record;
  - choose check-in/check-out target only when the underlying event exists;
  - submit corrected time + reason through the canonical Project B API;
  - show correction history;
  - cancel pending correction requests.
- Time Correction approval remains in the unified `/desktop/approvals` center from M9D.3 and is not duplicated here.
- Desktop navigation now enables the Attendance item when the server grants Attendance read capability.
- Added Desktop view helpers/tests for attendance metrics, correction-target availability, radius labels and source labels.
- Targeted Attendance Desktop/API tests PASS: 2 files / 10 tests.
- Full repository lint PASS.
- Full repository typecheck PASS.
- Full repository tests PASS: 58 files / 369 tests.
- Production build PASS and confirms `/desktop/attendance`.
- No hosted TEST deployment, Production authority/source-of-truth switch, Project A, LINE, LIFF, Rich Menu, Flex, DNS or GAS mutation occurred.

## Remaining / Risks

- Hosted Attendance/Time Correction TEST/UAT still requires Desktop auth secrets plus TEST routing/RBAC for `ATTENDANCE_*` and `TIME_CORRECTION_*`.
- Production authority/source-of-truth remains `LEGACY`.
- The known Attendance duplicate-business-day record remains intentionally distinct and must not be silently merged.
- Desktop Check-in/Check-out writes remain intentionally deferred from M9D.4.
- M9D.5 (Time Correction Desktop) is absorbed into M9D.4 because create/history/cancel plus unified approval are already implemented and verified.

## Next Recommended Action

Start M9D.6 — OT Desktop. Reuse the unified Request Status / Approval Center from M9D.3 and the Desktop module patterns established by LEAVE/Attendance. M9D.5 requires no separate implementation unless a future gap is discovered.

## Status

PASS — M9D.4 CODE/UI CLOSED / ATTENDANCE + TIME CORRECTION DESKTOP READY FOR LATER TEST/UAT / PRODUCTION AUTHORITY LEGACY

## Completed — M9D.6 OT Desktop

- Added `/desktop/overtime` as the Project B Desktop OT surface.
- OT dashboard shows total requests, pending/approved counts, total requested minutes and Attendance linkage counts.
- Added canonical Desktop OT create flow using the existing `POST /api/overtime/requests`.
- Desktop form respects server business-rule constraints: dates cannot target the future, end date cannot precede start date and end time must be after start time; Server remains final authority.
- OT history shows request status, submitted time, reason, segment dates/times/requested minutes and per-segment `attendanceRecordId` linkage state.
- Attendance linkage remains server-owned; Desktop only renders whether a segment is linked and never creates or edits the linkage itself.
- Pending OT requests can be cancelled through the existing canonical endpoint.
- OT approvals remain in the unified `/desktop/approvals` center from M9D.3 and are not duplicated.
- Desktop navigation now enables the OT item when the server grants OT read capability.
- Loading/empty/error/disabled/409/503/responsive states are covered.
- Targeted OT Desktop/API tests PASS: 3 files / 14 tests.
- Full repository lint PASS.
- Full repository typecheck PASS.
- Full repository tests PASS: 59 files / 372 tests.
- Production build PASS and confirms `/desktop/overtime`.
- No hosted TEST deployment, Production authority/source-of-truth switch, Project A, LINE, LIFF, Rich Menu, Flex, DNS or GAS mutation occurred.

## Remaining / Risks

- Hosted OT TEST/UAT still requires Desktop auth secrets plus TEST OT routing/RBAC.
- Production authority/source-of-truth remains `LEGACY`.
- Attendance linkage displayed by Desktop depends on server-side OT reconciliation/linkage data and is intentionally not synthesized client-side.

## Next Recommended Action

M9D.7 — Medical Claim Desktop is now completed. Continue with M9D.8 — Benefits Desktop.

## Status

PASS — M9D.6 CODE/UI CLOSED / OT DESKTOP READY FOR LATER TEST/UAT / PRODUCTION AUTHORITY LEGACY

## Completed — M9D.7 Medical Claim Desktop

- Added `/desktop/medical` as the Project B Desktop Medical Claim surface.
- Dashboard shows annual Medical benefit limit, approved amount, committed amount and remaining entitlement from the canonical server-side entitlement calculation.
- Added canonical Medical create flow through `POST /api/medical/claims`.
- Desktop pre-validation mirrors current server rules without replacing server authority:
  - treatment date cannot be in the future;
  - effective per-claim limit is 1,000 THB;
  - 1–3 receipt files are required;
  - JPG / PNG / PDF only;
  - maximum 2 MiB per receipt and 4 MiB total.
- Receipt upload uses the existing private attachment pipeline:
  1. browser computes SHA-256;
  2. requests `MEDICAL_PRIVATE` upload intent;
  3. uploads to the signed private-object grant;
  4. finalizes through Project B so object size/MIME/checksum are verified server-side;
  5. Medical create receives only finalized attachment IDs.
- Unlinked receipt metadata/object cleanup is attempted fail-safe if claim creation fails.
- Medical history shows claim status, treatment/submission dates, amount, description, linked-leave state and receipt metadata.
- Receipt download uses the existing authorized short-lived signed download endpoint.
- Pending claims can be cancelled through the existing canonical endpoint.
- Optional owned Leave requests are offered for Medical ↔ Leave linkage when the actor also has Leave read access; Medical remains usable if Leave read is unavailable.
- Medical approvals continue through the unified `/desktop/approvals` center from M9D.3 and are not duplicated.
- Desktop navigation now enables the Medical self page only for `medical.self.read`; actors with only `medical.approve` see the Approval Center but not the Medical self menu.
- Loading/empty/error/disabled/409/503/responsive states are covered.
- Targeted Medical Desktop/API/business-rule/navigation tests PASS: 4 files / 23 tests.
- Full repository lint PASS.
- Full repository typecheck PASS.
- Full repository tests PASS: 60 files / 376 tests using a bounded single-worker run. The first concurrent run produced only three 5-second scrypt/onboarding timeouts; those same tests passed 4/4 when rerun serially and the final full single-worker suite passed 376/376.
- Production build PASS and confirms `/desktop/medical`.
- No hosted TEST deployment, Production authority/source-of-truth switch, Project A, LINE, LIFF, Rich Menu, Flex, DNS or GAS mutation occurred.

## Remaining / Risks

- Hosted Medical/Attachments TEST/UAT still requires Desktop auth secrets plus TEST `MEDICAL_*` and `ATTACHMENTS_*` routing/RBAC.
- Production authority/source-of-truth remains `LEGACY`.
- R2 browser upload/download CORS and hosted private-object flow still require real hosted TEST/UAT; local/build verification cannot prove browser-to-R2 network policy.
- Legacy/archive Medical attachment provenance remains subject to the existing source-qualified migration exceptions and must not be silently rewritten.

## Completed — M9D.8 Benefits Desktop

- Added `/desktop/benefits` as a read-only Project B Desktop Benefits surface.
- Benefits uses the existing canonical `GET /api/benefits/me` projection only; no Benefits write path was added.
- The current contract exposes:
  - Medical annual entitlement: annual limit, approved amount, committed amount and remaining amount.
  - Unified OT + Medical request activity.
- The Desktop intentionally does not invent unsupported generic benefit-policy data outside the current Project B contract.
- Medical entitlement includes separate approved and committed progress indicators.
- Unified Benefits history supports:
  - OT / Medical kind filtering;
  - Pending / Approved / Rejected / Cancelled status filtering;
  - canonical request date, submitted time, reason and status;
  - correct value units per kind (OT hours vs Medical THB);
  - attachment count from the existing Benefits projection;
  - links back to canonical `/desktop/overtime` or `/desktop/medical` surfaces.
- Benefits navigation is now enabled only when the server grants `benefits.self.read`.
- Loading/empty/error/403/503/responsive states are covered.
- Targeted Benefits API/UI tests PASS: 2 files / 5 tests.
- Full repository lint PASS.
- Full repository typecheck PASS.
- Full repository tests PASS: 61 files / 379 tests.
- Production build PASS and confirms `/desktop/benefits`.
- No hosted TEST deployment, Production authority/source-of-truth switch, Project A, LINE, LIFF, Rich Menu, Flex, DNS or GAS mutation occurred.

## Remaining / Risks

- Hosted Benefits TEST/UAT still requires Desktop auth secrets plus TEST `BENEFITS_READ` routing/RBAC.
- Production authority/source-of-truth remains `LEGACY`.
- Benefits currently reflects only the data supported by the existing contract (OT + Medical + Medical entitlement). Additional benefit categories require explicit backend/contracts before they can appear here.

## Completed — M9D.9 Announcements / Activities Desktop

- Added `/desktop/announcements` as the Project B Desktop news/announcement surface.
- Employee visibility uses the existing canonical `GET /api/announcements` contract only.
- Server-side repository remains authoritative for:
  - ACTIVE account enforcement;
  - published-only rows;
  - GLOBAL / AGENCY / DEPARTMENT visibility.
- Desktop announcement feed includes:
  - scope labels;
  - publish timestamp;
  - title/content search;
  - scope filtering;
  - loading/empty/error/403/503 states;
  - responsive layout.
- Announcement attachments use the existing relation-authorized
  `POST /api/announcements/:announcementId/attachments/:attachmentId/download`
  flow and short-lived signed private-object grants.
- Desktop navigation now exposes News/Activities only when the server grants
  `announcements.read`; `announcements.admin.write` alone does not expose
  the employee read surface.
- Announcement creation/admin write UI was intentionally not duplicated here;
  that capability belongs in the later Admin Desktop phase.
- Project B currently has no separate Activities contract/repository/API.
  M9D.9 therefore renders an explicit “activity source not connected” state
  rather than inventing activity records or re-labeling announcements as activities.
- Targeted M9D.9 tests PASS: 4 files / 10 tests.
- Full repository lint PASS.
- Full repository typecheck PASS.
- Full repository tests PASS: 62 files / 383 tests.
- Production build PASS and confirms `/desktop/announcements`.
- No hosted TEST deployment, Production authority/source-of-truth switch,
  Project A, LINE, LIFF, Rich Menu, Flex, DNS or GAS mutation occurred.

## Remaining / Risks

- Hosted Announcements TEST/UAT still requires Desktop auth secrets plus TEST
  `ANNOUNCEMENTS_READ` routing/RBAC and hosted attachment-download verification.
- Production authority/source-of-truth remains `LEGACY`.
- Company Activities remains a real backend contract gap. A future Activities
  module requires an explicit contract/repository/API and cannot be represented
  as completed by M9D.9.

## Next Recommended Action

Start M9D.10 — Notifications Desktop.

## Status

PASS — M9D.9 CODE/UI CLOSED / ANNOUNCEMENTS DESKTOP READY FOR LATER TEST/UAT / ACTIVITIES CONTRACT GAP EXPLICIT / PRODUCTION AUTHORITY LEGACY

## Completed — M9D.10 Notifications Desktop

- Added `/desktop/notifications` as the Project B Desktop Notification Operations surface.
- The current canonical notification model is operational/admin outbox data, not an employee inbox:
  - `NotificationOutbox` has aggregate/event/status/attempt/error timing fields.
  - `NotificationDelivery` has channel/status/provider/error attempt fields.
  - there is no `recipientEmployeeId`, unread/read flag or employee-notification inbox contract.
- M9D.10 therefore does not fabricate employee unread/read notifications. That remains an explicit backend contract gap.
- Notification Operations includes:
  - total / queued-processing / sent / failed metrics;
  - status filtering and text search;
  - event/aggregate identifiers;
  - attempts and delivery counts;
  - last-error visibility;
  - FAILED-only Retry through the existing canonical admin endpoint.
- `GET /api/admin/notifications` now exposes server-derived `canRetry` so Desktop can disable Retry when the actor lacks `notifications.admin.retry`.
- Notification navigation appears only with `notifications.admin.read`; Retry remains separately protected by `notifications.admin.retry`.
- Retry races/non-FAILED transitions now map to HTTP 409 rather than accidental 500s.
- Targeted M9D.10 tests PASS: 4 files / 13 tests.
- Full repository lint PASS.
- Full repository typecheck PASS.
- Full repository tests PASS: 63 files / 389 tests.
- Production build PASS and confirms `/desktop/notifications`.
- No hosted TEST deployment, Production authority/source-of-truth switch, Project A, LINE, LIFF, Rich Menu, Flex, DNS or GAS mutation occurred.

## Remaining / Risks

- Hosted Notifications TEST/UAT still requires Desktop auth secrets plus TEST `NOTIFICATIONS_READ/WRITE` routing and RBAC for `notifications.admin.read/retry`.
- Production authority/source-of-truth remains `LEGACY`.
- An employee-facing Notification Center with unread/read semantics cannot be implemented truthfully until Project B gains an explicit recipient/inbox/read-state contract and persistence model.

## Next Recommended Action

Start M9D.11 — Identity / Profile Desktop.

## Status

PASS — M9D.10 CODE/UI CLOSED / ADMIN NOTIFICATION OPERATIONS READY FOR LATER TEST/UAT / EMPLOYEE INBOX CONTRACT GAP EXPLICIT / PRODUCTION AUTHORITY LEGACY


## Completed — M9D.11 Identity / Profile Desktop

- Added `/desktop/profile` as the Project B read-only self Identity / Profile surface.
- The page uses the existing privacy-minimized canonical `GET /api/profile/me` response plus safe `GET /api/security/session` diagnostics.
- Desktop Profile shows:
  - full name / nickname;
  - employee ID;
  - date of birth / employment start / resignation date;
  - login name and account lifecycle state;
  - agency / department;
  - canonical role keys;
  - LINE-link presence as a boolean only;
  - server-derived functional menu capabilities rather than trusting client roles.
- Profile navigation now appears only when the server grants `profile.self.read`.
- Profile/signature media remain attachment-ID references only in the Profile contract.
- Media open uses the existing private Attachment download flow; R2 provider URL/storage key remain outside the Profile response and storage policy still enforces owner/permission access for `EMPLOYEE_PRIVATE`.
- The Profile page is intentionally read-only in M9D.11. No name/account/password/media mutation contract was added.
- Loading/error/401/403/404/503/responsive states are covered.
- Targeted M9D.11 tests PASS: 4 files / 15 tests.
- Full repository lint PASS.
- Full repository typecheck PASS.
- Full repository tests PASS: 64 files / 393 tests.
- Production build PASS and confirms `/desktop/profile`.
- Git has no approved baseline commit; verification therefore remains direct read/test/build evidence.
- No hosted TEST deployment, Production authority/source-of-truth switch, Project A, LINE, LIFF, Rich Menu, Flex, DNS or GAS mutation occurred.

## Remaining / Risks

- Hosted Profile/Attachment TEST/UAT still requires Desktop auth secrets plus TEST `IDENTITY_READ` / `ATTACHMENTS_READ` routing and matching RBAC.
- Opening profile/signature media depends on the actor also having the appropriate private attachment read permission; a Profile attachment reference alone does not bypass storage policy.
- Production authority/source-of-truth remains `LEGACY`.
- Profile editing, password change/reset and media upload/replace remain separate explicit contracts and are not implemented by M9D.11.

## Next Recommended Action

Start M9D.12 — Onboarding Desktop.

## Status

PASS — M9D.11 CODE/UI CLOSED / IDENTITY + PROFILE DESKTOP READY FOR LATER TEST/UAT / READ-ONLY PRIVACY BOUNDARY PRESERVED / PRODUCTION AUTHORITY LEGACY


## Completed — M9D.12 Onboarding Desktop

- Added `/desktop/onboarding` as the Project B admin onboarding surface.
- Added bounded read-only onboarding admin contracts needed for a usable Desktop approval flow:
  - `GET /api/onboarding/pending`;
  - `GET /api/onboarding/approval-options`.
- Both read endpoints and the existing approval write remain protected by `onboarding.admin.approve` GLOBAL permission.
- Pending projection exposes safe employee display/lifecycle fields only and does not expose password hashes, legacy credential material or LINE user IDs.
- Approval options expose active Agency/Department IDs + names; Desktop does not require operators to type raw UUIDs.
- Account activation continues to use the existing canonical `POST /api/onboarding/employees/:id/approve` path. No duplicate approval write path was introduced.
- Desktop supports search, LINE-linked boolean state, Agency/Department selection, confirmation, busy/disabled, empty and 401/403/409/503 states.
- Registration and LINE binding public flows remain unchanged and outside the Desktop admin page.

## Completed — M9D.13 Admin Desktop

- Added `/desktop/admin` as a bounded Project B Admin hub.
- Admin tool visibility is derived from server capabilities, while each API remains the final authorization authority.
- Supported surfaces are composed from canonical contracts only:
  - Onboarding approval;
  - Notification Operations;
  - read-only runtime/admin settings;
  - GLOBAL announcement creation through the existing canonical announcement write API.
- Generic user editor, role editor and policy editor were intentionally not invented because Project B currently has no canonical write contracts for those operations.
- Desktop navigation now exposes Onboarding/Admin only when corresponding server-derived admin capabilities are present.

## Completed — M9D.14 Desktop Full QA

- Final Desktop repository lint: PASS.
- Final Desktop repository typecheck: PASS.
- Final full test suite: 67 files / 400 tests PASS.
- Module-route coverage: 44 route assertions PASS, including the new Onboarding admin reads.
- Production build: PASS.
- Next.js build confirms all Desktop routes including `/desktop/onboarding` and `/desktop/admin`.
- Loading/empty/error/disabled and permission-gated patterns were retained across the Desktop module set.
- Production authority/source-of-truth remains `LEGACY`; no Production deployment or cutover occurred.

## M9D.15 Historical Pre-Approval Gate Evidence

Fresh TEST-only release evidence:

- API Cloud Build `0aa0bb89-ee1a-4343-9d44-78c7fb9d4b5b` — SUCCESS.
- API image digest: `sha256:b63c7ff94d2c1e72a39912f725dd3c2b82d3529ec7e8ef3ed99378103ea861de`.
- Web Cloud Build `d3965053-0ca5-47f2-acd4-4e28c2aa7511` — SUCCESS.
- Web image digest: `sha256:df538db04b1d4cfe67a3c77b52186f58e1a839075833bdfb414d1a77e4d7a2f1`.
- TEST candidate revisions deployed with 0% canonical traffic:
  - API `ckace-hr-api-test-m9d15a`;
  - Web `ckace-hr-web-test-m9d15a`;
  - both tagged `m9d15-desktop`.
- Candidate direct smoke:
  - API `/api/health` = 200;
  - API `/api/ready` = 200;
  - signed-out API `/api/security/session` = 401;
  - Web `/login` = 200;
  - Web `/desktop` = 200;
  - Web `/desktop/onboarding` = 200;
  - Web `/desktop/admin` = 200.
- Canonical TEST traffic is unchanged:
  - API baseline `ckace-hr-api-test-00012-lwk` = 100%;
  - Web baseline `ckace-hr-web-test-00001-nwx` = 100%.
- Actual TEST Secret Manager inventory contains no existing Desktop session secret, and the API TEST environment has no `CKACE_DESKTOP_SESSION_SECRET`.
- Therefore authenticated Desktop TEST/UAT cannot truthfully pass yet.
- Creating/binding a new TEST-only Desktop session secret is a security/credential change and remains an explicit Owner approval gate.
- A synthetic Project B TEST account can use the modern Project password hash, so `CKACE_LEGACY_PASSWORD_SALT` is not required for bounded synthetic Desktop UAT.

## Remaining / Risks

- M9D.15 requires explicit approval to create/bind a TEST-only `CKACE_DESKTOP_SESSION_SECRET`, then authenticated same-origin TEST UAT and cleanup.
- Canonical TEST traffic must not switch until the credential gate is satisfied and candidate readiness remains healthy.
- Production authority/source-of-truth remains `LEGACY`.
- Project A / LINE / LIFF / Rich Menu / Flex / GAS / DNS remain outside this workstream.

## Next Recommended Action

Owner gate: approve creation and binding of a managed TEST-only `CKACE_DESKTOP_SESSION_SECRET` so M9D.15 authenticated Desktop TEST/UAT can proceed.

## Status

PARTIAL — M9D.12 PASS / M9D.13 PASS / M9D.14 PASS / M9D.15 CANDIDATE 0% + SIGNED-OUT SMOKE PASS / AUTHENTICATED UAT WAITING ON TEST SECURITY CREDENTIAL APPROVAL

## Completed — M9D.15 Desktop TEST/UAT Final Closeout

- Owner-approved TEST Desktop security gate completed without adding a Legacy password salt.
- Firebase-compatible Desktop session cookie is now `__session`.
- Post-fix QA PASS: targeted security 3 files / 7 tests; full lint PASS; typecheck PASS; full tests 67 files / 400 tests PASS; production build PASS.
- Fresh API Cloud Build `1da918a4-4e79-46e4-aa29-435063478f8d` SUCCESS.
- Final API image digest: `sha256:587cf33d2c540a0cad6738ea998d73124d108adbb27797b3203dd8d0bd2c2092`.
- Canonical TEST traffic:
  - API `ckace-hr-api-test-m9d15d` = 100%;
  - Web `ckace-hr-web-test-m9d15a` = 100%.
- Direct authenticated UAT PASS: login/session/profile = 200, 16 critical authenticated reads PASS, forged client identity headers ignored, `clientRoleAuthority=false`, logout = 200.
- Firebase same-origin authenticated UAT at `https://ckrr-leave-system-2026.web.app` PASS with the same assertions.
- Synthetic cleanup PASS after both UAT runs: no synthetic employee, role, permission, or weekly-work-rule rows remain.
- Final Firebase smoke PASS:
  - all Desktop routes from `/login` through `/desktop/admin` = 200;
  - `/api/health` = 200;
  - `/api/ready` = 200;
  - signed-out `/api/security/session` = 401.
- A 0%-traffic normal-template revision `ckace-hr-api-test-m9d15e` restores the image-default command after temporary self-test revisions.
- Production authority/source-of-truth remains `LEGACY`; no Production cutover occurred.
- Project A / LINE / LIFF / Rich Menu / Flex / GAS / DNS were not mutated.

## Remaining / Risks After M9D.15

- Activities still has no canonical Project B backend contract.
- Employee notification inbox/unread-read semantics still have no canonical Project B backend contract.
- Generic user/role/policy editors remain unsupported until explicit canonical admin write contracts exist.
- Historical archive/attachment exceptions from prior milestones remain unchanged.

## Next Recommended Action

Start M10D.1 — Desktop Production Readiness. Prepare Production reconciliation, rollback, monitoring and cutover evidence, then request a separate explicit Owner Production gate before any Production authority switch.

## Final Status

PASS — M9D.12 ONBOARDING DESKTOP / M9D.13 ADMIN DESKTOP / M9D.14 FULL DESKTOP QA / M9D.15 AUTHENTICATED TEST UAT CLOSED / PRODUCTION AUTHORITY REMAINS LEGACY

## Completed — M10D.1 Desktop Production Readiness

M10D.1 is PASS / CLOSED as a readiness/evidence phase. The Production deployment/cutover decision is **NO-GO** until the explicit remediation gates below are completed and separately approved.

### Live Production refresh

- Project B Production Cloud Run is healthy but still runs the pre-Desktop M9.5/M9.6 release:
  - API revision `ckace-hr-api-prod-m9-6-stage-20261007a`;
  - API digest `sha256:8a14832c4361e4813e786899ee169a93fa4e07beafcb4866771a950d198bb88b`;
  - Web revision `ckace-hr-web-prod-m9-6-stage-20261007a`;
  - Web digest `sha256:a7bc1b9b729518a47345a610a96b7927e5f81defb00fc9ac702f46344656aeeb`.
- Production runtime remains `CKACE_MODULE_ROUTING=LEGACY` and source-of-truth remains `LEGACY`.
- Firebase Production front door:
  - `/api/health` = 200;
  - `/api/ready` = 200;
  - signed-out `/api/security/session` = 401;
  - `/login` = 404;
  - `/desktop` = 404.
- `hr.ckaceaccount.com` remains NXDOMAIN.
- Live Cloud Monitoring refresh verifies 7 CKACE HR PROD alert policies and 4 uptime checks.
- Production Desktop session secret is not present/bound.

### Production database live-state reconciliation

Historical M9.8 zero-table/no-import evidence is stale. Live Neon Production is authoritative:

- project `CKACE HR PROD` / `falling-paper-66157438`;
- branch `br-flat-sky-b3swsapw`;
- database `ckace_hr_prod`;
- 41 application tables;
- no `_prisma_migrations` table;
- employees 25;
- user accounts 25;
- leave requests 192;
- leave entitlements 69;
- attachments 13;
- legacy records 654;
- migration runs 1.

The live migration run:

- id `e6f8374c-2d24-4661-877d-56758105f774`;
- source `APP_LEAVE_GAS`;
- transformer `m9.8-leave-prod-baseline-v1`;
- status `COMPLETED_WITH_EXCEPTIONS`;
- imported 654;
- rejected 0;
- mismatch 86;
- migration reconciliation result rows = 0.

This drift must be reconciled before any Production Desktop deployment that depends on the imported state.

### Desktop identity / RBAC readiness

Production Desktop authentication is not ready:

- ACTIVE accounts = 20;
- RESIGNED accounts = 5;
- modern password hashes = 0;
- legacy password hashes = 0;
- permissions = 0;
- role_permissions = 0;
- roles = 4;
- user_roles = 25.

Therefore Desktop password login and server-derived capability/RBAC cannot be accepted for Production yet.

### Fresh immutable Desktop release candidate

Current source passed the full repository gate before release:

- lint PASS;
- typecheck PASS;
- tests 67 files / 400 tests PASS;
- API/Web production build PASS.

Frozen source:

- runtime artifact input files = 267;
- source SHA-256 = `2edb9151f27f35041ddd735c7683d55511f5fed43494371c9565de9a13f3331a`;
- Prisma schema SHA-256 unchanged from M9.5;
- migration set unchanged at 5 migrations.

Fresh release:

- release ID `ckace-hr-m10d1-rc-20261008a`;
- API Cloud Build `b9c09a7e-b6a0-4c15-8566-c5c9eb3023aa` — SUCCESS;
- API digest `sha256:9e8f2c95d83c23447fe1cc3ac70f779227e5f1073beeadf3448e5632154ec720`;
- Web Cloud Build `1cc62374-50e5-486e-9f9a-ec0e67fccfe8` — SUCCESS;
- Web digest `sha256:b054a993a70dbbd29d2087b392cef04ff3b24f0a1291d03109bd8af102624fd9`;
- registry tag-to-digest readback verified for both images;
- Production deploy = 0.

Evidence:

- `infra/production/m10d1-source-provenance.mjs`;
- `infra/production/m10d1-release-manifest.json`;
- `infra/production/m10d1-desktop-readiness-status.json`;
- `infra/production/verify-m10d1-desktop-readiness.mjs`.

Verifier marker:

`M10D1_DESKTOP_READINESS_VERIFY_PASS decision=NO_GO source=2edb9151f27f35041ddd735c7683d55511f5fed43494371c9565de9a13f3331a api=sha256:9e8f2c95d83c23447fe1cc3ac70f779227e5f1073beeadf3448e5632154ec720 web=sha256:b054a993a70dbbd29d2087b392cef04ff3b24f0a1291d03109bd8af102624fd9 tests=400 prod_tables=41 prod_accounts=25 prod_permissions=0 prod_password_hashes=0 migration_mismatches=86 production_mutation=0`

### Production gate blockers

1. Live Production data/import state must be reconciled and the 86 mismatches dispositioned.
2. Production schema provenance lacks Prisma migration-history tracking and needs an approved baseline strategy before future schema mutation.
3. Production Desktop credentials are absent for all accounts.
4. Production permissions / role_permissions are not seeded.
5. Production Desktop session secret is not created/bound.
6. Current Production API/Web images predate Desktop M9D.
7. Production custom domain remains NXDOMAIN.

### Next Recommended Action

M10D.2 — Production Identity / RBAC / Data Reconciliation.

This next phase requires separate explicit Owner approval because it can involve Production data, identity credentials, RBAC data and Production security-secret changes. Only after M10D.2 passes may the fresh immutable M10D.1 API/Web release be staged at 0% Production traffic for authenticated Production UAT.

### M10D.1 Safety

- Production business-data write by M10D.1 = 0.
- Production schema mutation by M10D.1 = 0.
- Production credential/IAM mutation by M10D.1 = 0.
- Production Cloud Run/Firebase deployment by M10D.1 = 0.
- Production DNS/LINE/LIFF/GAS mutation by M10D.1 = 0.
- Production authority/source-of-truth switch by M10D.1 = 0.
- source-of-truth remains `LEGACY`.

## M10D.1 Status

PASS — READINESS PACKAGE + FRESH IMMUTABLE DESKTOP RELEASE COMPLETE / PRODUCTION DEPLOY & CUTOVER NO-GO / OWNER GATE REQUIRED FOR M10D.2

## Completed — M10D.2 Production Identity / RBAC / Data Reconciliation

M10D.2 is PASS / CLOSED as an engineering, Production-readiness and 0%-traffic staging phase. Production user traffic, module authority and source-of-truth were **not** switched.

### Production migration reconciliation

The existing Production migration run `e6f8374c-2d24-4661-877d-56758105f774` now has explicit persisted reconciliation evidence:

- 11 PASS rows covering source/target counts for agency, approval step, attachment, department, employee, holiday, leave entitlement, leave request, legacy provenance total, user account and weekly work rule.
- 1 EXCEPTION row for the historical aggregate `mismatchCount=86`.
- Exception code: `HISTORICAL_MISMATCH_DETAIL_NOT_PERSISTED`.
- Disposition: preserve imported rows and source-qualified provenance, and require a fresh read-only Legacy source re-extraction/delta reconciliation before any authority switch.
- No row-level mismatch detail was fabricated.

### Production schema baseline / rollback point

A non-destructive Neon branch was created before M10D.2 identity/RBAC mutations:

- branch `br-muddy-scene-b3v0ens5`;
- name `m10d2-pre-identity-rbac-20261008`;
- parent Production branch `br-flat-sky-b3swsapw`;
- parent LSN `0/1F34E98`;
- parent timestamp `2026-10-08T04:11:25Z`.
- Schema comparison against Production returned no diff.
- Production schema was not mutated by M10D.2.

### Production RBAC

Canonical explicit permissions were seeded and verified:

- permission catalog = 42;
- EMPLOYEE = 20 grants;
- SUPERUSER = 27 grants;
- ADMIN = 38 grants;
- SUPERADMIN = 38 grants.
- Role name alone remains non-authoritative; authorization requires explicit permissions.
- High-risk global attachment write/delete permissions remain ungranted by default.

Evidence: `infra/production/m10d2-rbac-manifest.json`.

### Production Desktop credential bootstrap

Imported ACTIVE accounts use a new one-time activation flow:

- endpoint: `POST /api/onboarding/desktop-activate`;
- verifies an existing LINE identity via LINE ID token;
- accepts only ACTIVE imported accounts;
- refuses accounts that already have a Desktop password;
- stores a modern `scrypt-v1` password hash using compare-and-set;
- writes audit action `DESKTOP_CREDENTIAL_ACTIVATED_WITH_LINE`;
- admin does not assign or learn employee passwords.

Live Production eligibility:

- ACTIVE accounts = 20;
- ACTIVE accounts with existing LINE binding = 19;
- ACTIVE accounts without LINE binding = 1;
- real employee modern password hashes after M10D.2 = 0.

The one ACTIVE EMPLOYEE without a LINE binding remains an explicit fail-closed identity exception: no Desktop access until an owner-verified LINE or identity remediation is completed. M10D.2 did not weaken security or assign a password on that employee's behalf.

Credential activation targeted QA: 3 files / 8 tests PASS.

### Production Desktop session secret

- managed secret `ckace-hr-prod-desktop-session-secret` exists;
- one enabled version;
- runtime accessor limited to `ckace-hr-prod@ckrr-leave-system-2026.iam.gserviceaccount.com`;
- candidate API binds `CKACE_DESKTOP_SESSION_SECRET` from Secret Manager;
- secret value was not exposed or written to the repository.

### Fresh immutable M10D.2 release

Current source:

- runtime artifact input files = 267;
- source SHA-256 = `a4a5741b1497cda9f432e284d9333ae3a0e0b0c9d3a91a9e5519178d62893abe`;
- Prisma schema/migration set remain unchanged from M10D.1.

Full repository verification:

- lint PASS;
- typecheck PASS;
- 67 test files / 402 tests PASS;
- API/Web production build PASS.

Release `ckace-hr-m10d2-rc-20261008a`:

- API Cloud Build `194d41fe-29de-4bec-9694-077f91ca13db` — SUCCESS;
- API digest `sha256:d81150489bc92de5b5ee0ccef26744629c2067210f64c1c311b3149bbe7888b4`;
- Web Cloud Build `4366327f-124b-4128-ba26-aa939ed7e0ff` — SUCCESS;
- Web digest `sha256:1af21f148f26793fd2655ffcba89f7aff32a0dea1982ee13d312ab7df3c62216`;
- registry readback verified both tag-to-digest mappings.

### Production 0%-traffic staging

Baseline remains live at 100%:

- API `ckace-hr-api-prod-m9-6-stage-20261007a` = 100%;
- Web `ckace-hr-web-prod-m9-6-stage-20261007a` = 100%.

Current M10D.2 candidates remain 0%:

- API `ckace-hr-api-prod-m10d2d`, tag `m10d2-desktop-final-current`, digest `sha256:d81150489bc92de5b5ee0ccef26744629c2067210f64c1c311b3149bbe7888b4`;
- Web `ckace-hr-web-prod-m10d2b`, tag `m10d2-desktop-current`, digest `sha256:1af21f148f26793fd2655ffcba89f7aff32a0dea1982ee13d312ab7df3c62216`.

Candidate smoke:

- API health = 200;
- API ready = 200;
- signed-out session = 401;
- Web `/login`, `/desktop`, `/desktop/profile`, `/desktop/admin` = 200.

### Authenticated Production UAT

Authenticated UAT was rerun on the **current API image digest** using bounded synthetic data:

- revision `ckace-hr-api-prod-m10d2uat2`;
- login = 200;
- session = 200;
- profile = 200;
- 16 critical authenticated reads PASS;
- forged identity headers ignored;
- `clientRoleAuthority=false`;
- logout = 200;
- synthetic cleanup PASS.

Live cleanup verification confirms:

- synthetic employees = 0;
- synthetic roles = 0;
- synthetic benefit policies = 0.
- The seven weekly work rules are canonical rows from the 2026-10-07 baseline and are not UAT residue.

After UAT, `ckace-hr-api-prod-m10d2d` restores the normal image entrypoint with no UAT command/env override.

### M10D.2 verifier

Evidence:

- `infra/production/m10d2-rbac-manifest.json`;
- `infra/production/m10d2-release-manifest.json`;
- `infra/production/m10d2-production-staging-status.json`;
- `infra/production/verify-m10d2-production-staging.mjs`.

Verifier marker:

`M10D2_PRODUCTION_STAGING_VERIFY_PASS decision=PASS_WITH_EXPLICIT_IDENTITY_EXCEPTION source=a4a5741b1497cda9f432e284d9333ae3a0e0b0c9d3a91a9e5519178d62893abe api=sha256:d81150489bc92de5b5ee0ccef26744629c2067210f64c1c311b3149bbe7888b4 web=sha256:1af21f148f26793fd2655ffcba89f7aff32a0dea1982ee13d312ab7df3c62216 tests=402 reconciliation=11_PASS_1_EXCEPTION rbac=42 active_line_eligible=19 active_identity_exception=1 candidate_traffic=0 baseline_traffic=100 uat=PASS source_of_truth=LEGACY`

### Remaining gates

Before any Production traffic or module-authority switch:

1. perform a fresh read-only Legacy source re-extraction and bounded delta reconciliation;
2. owner-verify remediation or explicit launch exclusion for the one ACTIVE account without LINE binding;
3. request a separate explicit Owner Production traffic/cutover approval;
4. custom-domain DNS activation remains a separate gate if required for launch.

### M10D.2 Safety

- Production baseline traffic remains 100%; M10D.2 candidates remain 0%.
- Production module authority/source-of-truth remains `LEGACY`.
- No DNS mutation.
- No LINE configuration mutation.
- No GAS mutation.
- No real employee password assigned by admin.
- Synthetic UAT data cleanup verified.

## M10D.2 Status

PASS — PRODUCTION IDENTITY/RBAC/DATA RECONCILIATION + 0%-TRAFFIC STAGING + AUTHENTICATED UAT COMPLETE / ONE FAIL-CLOSED IDENTITY EXCEPTION / PRODUCTION TRAFFIC & AUTHORITY SWITCH NOT PERFORMED

## Next Recommended Action

M10D.3 — Production Cutover Gate: fresh read-only Legacy extraction/delta reconciliation, resolve or explicitly exclude the one active unlinked identity, then request a separate named Owner approval before any Production traffic or module-authority switch.

## Completed — M10D.3 Production Cutover Gate

M10D.3 is PASS / CLOSED as a read-only Production cutover decision phase. It did **not** execute the LEAVE cutover.

### Fresh Legacy LEAVE source refresh

The five bounded M9.7 LEAVE sources were read directly from Google Sheets in read-only mode:

1. `CK&RR_Requests / UserPolicies / CURRENT`
2. `Data_CK&RR_Requests / LeaveRequests / CURRENT`
3. `Data_CK&RR_Requests / LeaveRequests_2025 / 2025`
4. `Data_CK&RR_Requests / ApprovalSteps / CURRENT`
5. `Data_CK&RR_Requests / Attachments / CURRENT`

Production baseline migration:
- run `e6f8374c-2d24-4661-877d-56758105f774`;
- imported at `2026-10-07T06:58:06.814Z`;
- relevant LEAVE source rows = 576.

Fresh live source:
- relevant LEAVE rows = 576;
- added = 0;
- removed = 0;
- raw changed = 27.

Deterministic hash sanity matched Production provenance exactly for representative unchanged records `PL-00001` and `LEV-0001`.

### Semantic delta classification

The 27 raw hash changes reconcile into:

- **6 actionable canonical changes**
  - requests: `LEV-0103`, `LEV-0104`, `LEV-0108`;
  - approval steps: `LEV-0103-STEP3`, `LEV-0104-STEP3`, `LEV-0108-STEP1`.
  - `LEV-0103` and `LEV-0104`: Legacy advanced from PENDING to APPROVED on 2026-10-08.
  - `LEV-0108`: Legacy remains PENDING but Step 1 is now approved and the request advanced to Step 2.
- **1 source inconsistency**
  - `LEV-0106`: request-level `currentStep=3` while all corresponding approval steps remain PENDING; canonical current step remains 1.
  - disposition: do not blindly import request currentStep; require explicit source reconciliation/disposition during the execution window.
- **20 representation / expected-model drifts**
  - 11 current request rows are terminal-step/time representation differences with canonical business state already equivalent;
  - 9 archive request rows include Google Sheets time-cell rendering as `30/12/1899` date-serial display while canonical Production time values remain semantically correct after normalization.

No private leave descriptions, employee names or raw source rows were persisted in the M10D.3 evidence.

### Legacy Production runtime refresh

Live Legacy Production remains:

- service `ckrr-line-gateway`;
- revision `ckrr-line-gateway-ownerui-20261006a`;
- immutable image digest `sha256:272fc4db43213b50b90387477d7f0e864f8c2d9cd0a4354c2b1608effea87d7f`;
- traffic = 100%;
- backend authority = GAS.

Fresh smoke:
- `/` = 200;
- `/liff` = 200;
- `/health` = 200.

Fresh 30-minute Cloud Run ERROR lookback:
- ERROR count = 0.

### Project B Production runtime

Production baseline remains 100%:
- API `ckace-hr-api-prod-m9-6-stage-20261007a`;
- Web `ckace-hr-web-prod-m9-6-stage-20261007a`.

M10D.2 candidates remain staged at 0%:
- API `ckace-hr-api-prod-m10d2d`, digest `sha256:d81150489bc92de5b5ee0ccef26744629c2067210f64c1c311b3149bbe7888b4`;
- Web `ckace-hr-web-prod-m10d2b`, digest `sha256:1af21f148f26793fd2655ffcba89f7aff32a0dea1982ee13d312ab7df3c62216`.

Production authority/source-of-truth remains `LEGACY`.

### Identity gate refresh

- ACTIVE accounts = 20;
- ACTIVE accounts with existing LINE binding = 19;
- Desktop activated accounts = 0;
- active unlinked identity exceptions = 1.

The one unlinked ACTIVE account remains fail-closed pending Owner-verified identity remediation or explicit launch exclusion.

### M10D.3 decision

**Gate phase = PASS. Cutover execution = NO-GO without a new Owner approval.**

Before LEAVE authority can switch, the bounded execution window must:

1. enable a bounded LEAVE write freeze;
2. recapture the same five Legacy sources after freeze;
3. reconcile/disposition `LEV-0106`;
4. import only verified changed/added delta records;
5. run final LEAVE reconciliation and migration-report coverage;
6. Owner-verify remediation or explicit exclusion for the active unlinked identity;
7. obtain explicit approval for paired `LEAVE_READ + LEAVE_WRITE` authority switch;
8. run Production smoke/monitoring and release the freeze only if all gates pass.

M10D.3 itself performed:
- no Production write freeze;
- no Production delta import;
- no traffic switch;
- no module-authority/source-of-truth switch;
- no DNS mutation;
- no LINE/LIFF mutation;
- no GAS mutation.

### Verification

- M9.3 source snapshot + cutover evidence regression: 2 files / 15 tests PASS.
- `node --check infra/production/verify-m10d3-cutover-gate.mjs` PASS.
- verifier PASS:
  `M10D3_CUTOVER_GATE_VERIFY_PASS decision=GATE_PASS_EXECUTION_NO_GO baseline_rows=576 live_rows=576 raw_changed=27 actionable=6 source_exception=1 representation_drift=20 legacy_quiet_errors=0 legacy_traffic=100 candidate_traffic=0 active_unlinked_identity=1 source_of_truth=LEGACY`

Evidence:
- `infra/production/m10d3-leave-live-delta.json`;
- `infra/production/m10d3-cutover-gate-status.json`;
- `infra/production/verify-m10d3-cutover-gate.mjs`.

## M10D.3 Status

PASS — CUTOVER GATE EVIDENCE COMPLETE / LEAVE EXECUTION NO-GO UNTIL OWNER APPROVES BOUNDED EXECUTION WINDOW

## Next Recommended Action

M10D.4 — LEAVE Execution Window. Requires a separate explicit Owner approval before Production write freeze, delta import, paired LEAVE authority switch, or any source-of-truth change.

## M10D.4 Pre-execution (2026-10-08)

Status: PARTIAL / EXECUTION NO-GO. Owner approval covers preparation only. An audit identified 11 Legacy LEAVE write paths: seven Desktop GAS, two GAS LIFF, and two Gateway LIFF. The local Gateway write-freeze guard does not cover direct GAS Desktop writes. Production-wide freeze coverage is unverified. LEV-0106 disposition and one ACTIVE unlinked identity remain open.

Prepared `infra/production/m10d4-preexecution-readiness.json`, `infra/production/verify-m10d4-preexecution.mjs`, `infra/production/verify-m10d4-preexecution.node-check.mjs`, and `docs/M10D4_LEAVE_PREEXECUTION_READINESS.md`. Focused safety tests passed 9/9; read-only verifier confirms EXECUTION_NO_GO. Final `npm run check` PASS (lint, typecheck, 67 test files / 402 tests and production API/Next.js build). The initial duplicate discovery of Node-native tests by Vitest was corrected by using the `.node-check.mjs` filename; final QA passed. No Project A source or Production state was changed.

Historical M10D.4B: the previous local/TEST approval was superseded by the newer Owner scope lock. Project A active T17 mutation ownership blocked A-source edits; no files in Project A were modified. Project B prepared a 15-path inventory, fail-closed preparation verifier (6/6 isolated tests PASS), and exact handoff in `docs/M10D4B_LEGACY_FREEZE_IMPLEMENTATION_HANDOFF.md`. DO NOT resume A-source implementation after T17 releases. This older M10D.4B Legacy plan is SUPERSEDED by the Owner's 2026-10-08 Web Desktop-only scope; 15-path inventory is historical evidence only. Production freeze, import and paired LEAVE authority switch remain separately Owner-gated.
