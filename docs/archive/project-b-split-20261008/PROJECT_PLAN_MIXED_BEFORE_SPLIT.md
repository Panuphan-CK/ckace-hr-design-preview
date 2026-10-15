# CKACE_HR — PROJECT PLAN

Last Updated: 2026-10-08 Asia/Bangkok

## OWNER SCOPE LOCK — WEB DESKTOP ONLY (2026-10-08)

- **Active allowed scope:** Project B `D:\CKACE_HR` Web Desktop UI and Desktop-only API/functional QA.
- **Explicitly excluded:** Project A `D:\APP_Leave` (no access for editing or workflows); Web LIFF, LINE Gateway, GAS, Rich Menu, LINE integrations, Production migration/deploy/traffic/authority changes.
- Web LIFF is unfinished and must not be marked completed or resumed automatically.
- M10D.4B Project A Legacy all-channel freeze implementation was CANCELLED (the 15-path manifest/tests in Project B are retained solely as superseded evidence); its hourly continuation watch was disabled.
- Next working phase: audit and improve Project B Web Desktop functionality and responsive/admin/session/API QA. Production cutover remains NO-GO, source of truth remains LEGACY.


## TASK-31 — Core Desktop Functional UAT — PASS (2026-10-08)

- Owner approved TASK-31. Created only tracked DEV business fixtures required to exercise core workflows; no real employee/business data and no Production resources.
- Hosted TEST workflows PASS: Leave, Request Status/Approval, Attendance/Time Correction, OT, Benefits read projection, Announcements, Notifications Retry, and Desktop Onboarding pending→approve. Idempotency replay and 409 changed-payload conflicts were verified for Leave/Attendance/OT.
- Browser UI smoke rendered final synthetic state without horizontal overflow on all tested Desktop module pages.
- Final regression `89ec13c0-5fee-4e0f-a489-f982105453a7`: **76 test files / 468 tests PASS**, lint/typecheck/API/Next build PASS.
- TEST traffic unchanged: API/Web baselines remain 100%; `task30-uat` and `wd13-retry` remain 0%.
- Exact synthetic fixture/business IDs and dependency-safe future cleanup ledger: `docs/TASK31_FUNCTIONAL_UAT_20261008.md`. No cleanup is authorized yet.
- Public onboarding registration success was not executed because the credential-bearing tool request was safety-blocked; no bypass attempted. Desktop Admin pending→approve is PASS.
- **TASK-31 PASS. Next Owner gate: TASK-32 — Medical + Private R2 E2E.** No Medical/R2 write/failure testing before explicit approval.

## TASK-30 — Four-Role Authenticated UAT — PASS (2026-10-08)

- Owner approved TASK-30. Implemented an exact-revision TEST-only UAT bootstrap that rotates only tracked TASK-29 account hashes internally and authenticates through the real `DesktopAuthService.login()`; no plaintext credential/session secret is stored or reported.
- Full gate `5b26e796-cdd3-47fc-b5ed-6bcf7af6374d`: **76 test files / 468 tests PASS**, lint/typecheck/API/Next builds PASS.
- Cloud Build `6b5381e9-3bf4-4306-94c8-b720d887bc60` SUCCESS; image `sha256:f86149d297c64734a7ced9a8eb61e66b03247b8d37d596caf4750b85f6811fc1`; API TEST revision `ckace-hr-api-test-task30uat-20261008a` tag `task30-uat` healthy **0%**, baseline API still **100%**. Web `wd13-retry` stays **0%**, Web baseline **100%**.
- Hosted Browser/API role matrix PASS: Employee 14, Superuser 19, Admin 23, Superadmin 24 permissions; rendered navigation and API 200/403 boundaries match expected hierarchy. Logout invalidates session and Desktop redirects Login. Invalid UAT role rejected with 400/401.
- Database fixture counts unchanged and no business workflow rows created. Evidence: `docs/TASK30_AUTHENTICATED_UAT_20261008.md`.
- Temporary `task30-uat` bootstrap is allowed only on its dedicated **0%-traffic TEST revision** for synthetic UAT. It must be removed/disabled before any traffic promotion or non-synthetic use.
- **TASK-30 PASS. Next Owner gate: TASK-31 — Core Desktop Functional UAT.** No functional workflow writes until explicit approval.

## TASK-29 — Four Temporary TEST Users — PASS (2026-10-08)

- Owner approved TASK-29 after TASK-28 established the TEST runtime/database boundary. Created exactly four disposable synthetic Desktop users in `CKACE HR DEV / ckace_hr_dev`: Employee, Superuser, Admin, Superadmin. No real employee data, LINE binding, agency or department assignment.
- Created disposable RBAC seed scoped to this UAT only: 4 roles, 24 permissions, 80 role-permission links. Permission keys come from actual Desktop controllers/navigation. Verified hierarchy: EMPLOYEE 14, SUPERUSER 19, ADMIN 23, SUPERADMIN 24.
- Verified database counts after provisioning: employees 4, user_accounts 4, roles 4, permissions 24, user_roles 4, role_permissions 80, line_accounts 0. Four ACTIVE accounts use Project `scrypt-v1` hashes; no legacy password hashes.
- Credential policy: random plaintext used only transiently to compute hashes and not retained. TASK-30 will rotate to fresh ephemeral TEST credentials immediately before Login/UAT, never write plaintext to project docs/files.
- Exact synthetic IDs and future scoped cleanup order are recorded in `docs/TASK29_TEST_IDENTITIES_20261008.md`.
- **TASK-29 PASS. Next Owner gate: TASK-30 — authenticated four-role Browser/API UAT.** No TASK-30 activity until explicit approval.

## TASK-28 — TEST Database Attestation — PASS (2026-10-08)

- Owner approved TASK-28 only. Added a TEST-only, non-disclosing live attestation that verifies runtime stage, Cloud Run TEST service identity, allowlisted secret-backed Neon DEV endpoint/database, and the active connection's `current_database()`. Production/non-TEST endpoint is hidden (404); internal failure response is generic and exposes no Secret/URL/host/user/password.
- Independent Neon read-only metadata verifies `flat-tree-71711157` is **CKACE HR DEV**, main/default branch `br-proud-term-b3pihnrx`, database `ckace_hr_dev`, and exact endpoint hosts match the code allowlist.
- Full regression task `23c142c6-7c98-45aa-946e-779089e00fab` exit 0: **75 test files / 463 tests PASS**, lint/typecheck/API/Next Build PASS.
- TEST API Cloud Build `87a894de-9afe-4b2c-b9d2-33d076fc1123` SUCCESS; image digest `sha256:4063b591e47632aed294c8a433a4fad4f5a88266969ae6d5479ff2112566a767`; revision `ckace-hr-api-test-task28att-20261008a` tag `task28-attest` is healthy and **0% traffic**. Baseline `m9d15d` remains **100%**.
- Live tagged `/api/test/database-attestation` returned HTTP 200, `attestation=VERIFIED`, `verifiedProject=CKACE_HR_DEV`, `databaseName=ckace_hr_dev`, `runtimeStage=test`, `databaseConnection=verified`, `serviceName=ckace-hr-api-test`. Secret payload never exposed.
- **TASK-28 PASS. TASK-29 is the next Owner approval gate**: create four disposable TEST identities/roles with tracked IDs and no real employee data. Do not proceed until explicitly approved.

## WD-13 — Same-intent private receipt retry, TEST 0%-traffic candidate (2026-10-08)

- Improved Medical Desktop multi-file upload recovery: an ambiguous Finalize now yields an error with the original Attachment ID; the page keeps per-intent receipt progress in memory, resuming a **user-initiated** retry against the same ID and not re-uploading prior successful/pending receipts. No automatic write retry. Existing definite pre-Finalize upload errors still perform bounded cleanup, and uncertain Finalize must never delete the object.
- Fresh full `npm run check` exit 0, **74 test files/455 tests, lint/typecheck/API/Next Build PASS**, task `2782f78c-5c0c-42bf-9c8b-322971117d66`.
- Cloud Build `2485751b-19f3-4e4c-bcd0-d23fa7632c67` SUCCESS, image `sha256:0601aca41d392c8306383c6f96b21427bc8a08b5a427ae904797be02c31a5c83`; Cloud Run Project B Web TEST tagged `wd13-retry` revision `ckace-hr-web-test-wd13retry-20261008a` Ready and **0% traffic**; TEST baseline still **100%**. Direct tagged login HTTP 200, Chrome form/no overflow 1536px PASS; updated proxy strict WD13-retry allowlist with 4/4 Node tests PASS. No Firebase route or production mutation.
- Still needed: administrator-permitted independent TEST Secret-to-Neon DEV attestation, four disposable TEST accounts, actual logged-in role/API/Medical private R2/browser/failure UAT and scoped cleanup. Prior host denial must not be bypassed. **WD11 PARTIAL, WD13 BLOCKED, Phase A PARTIAL, Production NO-GO**. Current-page-only retry state does not survive reload; reconcile possibly unlinked private receipts with separate approved non-destructive procedure.

## WD-13 Medical source fix — TEST candidate staged 0% (2026-10-08)

- Verified Cloud Build `cee07834-60c0-445e-9816-d93fd26aad15` SUCCESS and immutable image `sha256:6a6f066861b32ab25e4aa2912ca28fe057f6d9f185014ceb86a22ec85aa48b9b`. Web TEST revision `ckace-hr-web-test-wd13med-20261008a` Ready, **0%**, direct tag `wd13-medical`; previous TEST baseline **100%**, WD11 candidate **0%**. No shared Firebase routing or authority mutation.
- Current tagged Login browser at **1536/830/415 px PASS** (required fields/form/no horizontal overflow), HTTP 200. Local-only proxy allowlisted WD13 TEST + API; Node safety/mock **7/7 PASS**. Signed-out Desktop redirects Login; TEST API session/Medical/Admin each **401**. This is not four-role authenticated UAT/R2.
- Source regression latest `npm run check`: **74/74 test files, 452/452 tests PASS**, lint/typecheck/API/Next Build (exit 0). Remaining P0: permitted TEST secret target attestation and four isolated temporary TEST identities, real signed-in Desktop/Medical R2 E2E, safe reconciliation of possibly unlinked R2 receipts, then cleanup. WD13 BLOCKED and Phase A PARTIAL, Production NO-GO.

## WD-13 — Medical finalize ambiguity prevention (2026-10-08)

- Source fix only: extracted `apps/web/src/app/desktop/medical/medical-receipt-upload.ts` from `medical/page.tsx`. A failed/unknown private R2 receipt **Finalize** response must **not trigger destructive DELETE**, since server may have already finalized. Upload HTTP non-2xx still attempts best-effort cleanup before finalize; Thai status messages preserved.
- Added isolated `medical-receipt-upload.test.ts` safety tests for successful upload and finalize, non-2xx upload cleanup, HTTP 400/409/500/503 finalize error, finalize network loss, intent 401; no real R2/DB/network.
- Fresh `npm run check` terminal **PASS exit 0, 74 files/452 tests, lint/typecheck/API/Next Build** task `e6720159-49f7-49a4-8376-da8f94a61286`.
- Remaining risk: an unlinked private receipt may remain after uncertain finalize; avoid automatic cleanup and plan an authorized reconciliation mechanism. Code not deployed; real 4-role/R2 TEST UAT remains BLOCKED by prior Tool Security Gate. No Project A/LIFF/GAS/Production/shared routing changes.

## WD-13 Authenticated Server Source QA (2026-10-08)

- Owner approved TEST-only UAT, but host security denial on protected Secret/identity mutation is still active. No bypass or new credentials; no TEST/PROD DB write.
- New Project B `apps/api/src/security/wd13-desktop-auth-rbac-matrix.test.ts` uses the **actual DesktopAuthService and AuthorizationGuard** with isolated in-memory repositories to check 4 role sessions, header/client privilege forgery denial, SELF ownership isolation, dynamic permission revocation and inactive/wrong-password fail-closed; **9 checks**. This is not live TEST Browser or R2 validation.
- Fresh `npm run check` task `3e1d6427-94e7-4cb5-b942-c6e79edacf97` exit 0: **73/73 test files, 444/444 tests, lint/typecheck/API/Next Build PASS**.
- WD-13 genuine signed-in 4-role, Medical/R2/fault-injection UAT remains **BLOCKED** pending administrator-permitted attestation and TEST synthetic-identity provisioning. Existing goal and one hourly watchdog remain active. Project A/Web LIFF/GAS/Production/shared routing untouched.

## WD-13 — TEST-only Owner Gate: execution safety blocked (2026-10-08)

- Owner TEST-only approval confirmed, **but tool safety denied the scoped DEV synthetic challenge write before mutation**. Read-only Neon DEV after denial: 0 employee/account/role/permission rows, no cleanup due. No secret payload access or policy bypass.
- Added `apps/api/src/security/wd13-test-boundary.ts` + `.test.ts` to verify only the known CKACE HR DEV Neon endpoint/database, stage=test and approved TEST API origin before an administrator may provision synthetic actors. Test is **pure; not a verified live Secret attestation**. Runbook `docs/WD13_TEST_ONLY_EXECUTION_GATE_20261008.md` documents restricted resume criteria and cleanup.
- Full `npm run check` **PASS exit 0 (72 files / 435 tests, lint/typecheck/API and Next build)** task `a7463767-9d34-4091-86b1-73f8d08145d7`.
- Remaining P0: permitted runtime Secret-to-Neon DEV attestation, four genuine disposable TEST accounts and safe cleanup, actual Browser 4-role RBAC/Medical R2 E2E. WD-13 BLOCKED; Phase A PARTIAL. No Project A, Web LIFF, GAS/Gateway, Production, shared Firebase routing, or credential mutations.

## WD-13 Four-role TEST-only acceptance tests (2026-10-08)

- Added Project B `apps/api/src/security/wd13-disposable-role-matrix.test.ts` — 5 pure tests of **proposed temporary TEST actor** capabilities, not actual role assignment or server authentication. Fresh `npm run check` exit 0: **71 test files / 419 tests**, lint/typecheck/API/Next build PASS.
- Pending gate: non-disclosing attestation of TEST API Secret target to Neon DEV (host safety block must not be bypassed). If unavailable, separately approve a newly isolated TEST-only target; only then approve bounded creation/cleanup of four disposable TEST accounts/roles with tracked IDs.
- WD-13 AUTHENTICATED TEST UAT **BLOCKED**, Phase A **PARTIAL**. No Project A, LIFF, GAS/Gateway, Production, shared Firebase routing or DB/credential mutation.

## WD-13 TEST Database Attestation Gate (2026-10-08)

- Live read-only: Neon DEV `flat-tree-71711157` is distinct from Neon PROD `falling-paper-66157438`; DEV `ckace_hr_dev` has 5 completed Prisma migrations and zero users, roles, employees or permissions. TEST API health/ready 200 (`test`, `NON_PRODUCTION`, DB connected); actual configured Secret `ckace-hr-neon-dev-database-url:latest` target **NOT verified** because protected secret attestation was disallowed. No secret output or PROD DB access.
- WD-13 remains BLOCKED pending permitted DEV-target attestation and disposable four-role test actor provisioning + safe cleanup. Continue using 0%-traffic Web TEST tag and local same-origin proxy; never alter Project A/Web LIFF/GAS/Gateway, Firebase shared routing, Production data/credentials or authority. See `docs/WD13_TEST_IDENTITY_DATABASE_GATE_20261008.md`. Phase A PARTIAL.

## WD-11 / WD-13 UI mock regression continuation (2026-10-08)

- Project B-only Browser harness `infra/rehearsal/wd13-browser-ui-fixture.mjs` intercepts ALL `/api/*` on localhost and exercises 4 **synthetic capability-only** desktop menu profiles. Node safety/mock tests **6/6 PASS**; fresh `npm run check` exit 0, **414/414 tests**, lint/typecheck/API/Next build PASS. Chrome Desktop menus and narrow 415px sidebar + Leave mocked 403/Error/Retry verified; additional **12/12 Desktop modules** display error states/Retry on mocked 403 without horizontal overflow. This does **not** certify real Server RBAC or actual signed-in workflow.
- TEST API metadata names `ckace-hr-neon-dev-database-url` secret, but the exact Neon target isolation is **not verified** (secret values not accessed). Do not use connected Neon Production branch to manufacture TEST accounts.
- WD-11 remains PARTIAL, WD-13 remains BLOCKED pending genuine isolated TEST identities, R2 and write-failure E2E; no PROD/Project A/Web LIFF/GAS/LINE/Firebase route changes. See Phase A report.

## WD-11 / WD-13 continuation status (2026-10-08)

- Created and verified local Project B `infra/rehearsal/wd13-same-origin-proxy.mjs` with node-check **2/2 PASS**, loopback-bound TEST candidate Web + TEST API without shared Firebase rewrite or traffic change.
- Managed Chrome current candidate signed-out login: 1536/824/399 px no horizontal overflow; failed login message PASS; eight HR/Admin API signed-out 401; Desktop redirects to Login. These do not replace real authenticated E2E.
- Remaining **P0**: four disposable TEST roles and safe TEST-only identity provisioning, signed-in Browser module/Medical R2/fault-injection validation, cleanup. Local TEST DB credentials not present; connected Neon Production branch cannot be used for TEST. WD-11 PARTIAL, WD-13 BLOCKED, Phase A PARTIAL, NO Production cutover.
- Do not change Firebase routing, Project A, Web LIFF, GAS, Gateway or Production. Do not claim Phase A PASS until real TEST UAT succeeds.

## WD-11 TEST-only candidate outcome (2026-10-08)

- Owner approved Project B-only TEST Desktop candidate deployment and synthetic-identity QA; no Project A `D:\APP_Leave`, Web LIFF, GAS, LINE Gateway, Rich Menu, Production, or Firebase routing changes.
- Cloud Build `0de3c2be-db52-4661-b164-7c14be916208` SUCCESS; tagged 0%-traffic Web candidate `ckace-hr-web-test-wd11-20261008` digest `sha256:9857902db795c59868d35ec639a7349ae4448e13a97fa3ec82fba951f8b8d446`. Existing Web `ckace-hr-web-test-m9d15a` remains 100%.
- Managed Chrome tagged `/login` desktop 1536x730 PASS for required fields and no horizontal overflow; `/desktop` fail-closed without same-origin `/api`. No authenticated cross-role E2E or genuine tablet viewport results; WD-11 PARTIAL / WD-13 BLOCKED.
- Next: establish TEST-only same-origin candidate/API path without altering shared Firebase routing, provision ephemeral scoped four-role fixture and clean up, then execute authenticated browser, R2 and failure QA, rerun regression. No Production cutover.

## Active Phase A — Functional + Security QA (2026-10-08)

- Scope strictly Project B `D:\CKACE_HR` Web Desktop and Desktop-only API/tests. No Project A, Web LIFF, GAS, Gateway, Rich Menu, LINE/DNS or Production mutation.
- Current outcome: **PARTIAL**. Source/automated QA verified; WD-11/WD-13 current-source authenticated cross-role TEST Browser/UAT remains NOT VERIFIED. See `docs/WD_PHASE_A_FUNCTIONAL_SECURITY_QA_20261008.md` for WD-01..WD-13 matrix and explicit evidence.
- Implemented logout-failure UX, stable intent-scoped idempotency keys, Medical ambiguous-commit private attachment preservation, synchronous-tab private downloads with grant headers, Bangkok timestamps; new regression tests.
- Last `npm run check` terminal **exit 0**, 70/70 files, **414/414 tests**, lint/typecheck/API/Next build PASS.
- QA follow-up: inspect safe already configured TEST candidate/fixture without exposing credentials. If any new TEST credentials, test account, deployment, runtime routing or security changes are required, apply Owner's explicit bounded gate first. Run real signed-in 4-role Browser/UAT with R2 and fault injection before calling Phase A PASS. Production authority stays LEGACY and Production Cutover NO-GO.

## WD-01 — Desktop Functional Audit Complete (2026-10-08)

- Scope: Project B Web Desktop and Desktop-only canonical APIs; no Project A or Web LIFF.
- Audited **13 Desktop routes + Login** against NestJS controllers, server-derived RBAC navigation, reads/writes and UI state handling; kept differences between source verification and real browser QA explicit.
- Report: `docs/WD01_WEB_DESKTOP_FUNCTIONAL_AUDIT_20261008.md`. Follow-ups WD01-F01..F06 include manual retry idempotency, failed logout and asynchronous attachment downloads; existing scope gaps WD01-G01..G06 are separately identified and are not mislabeled bugs.
- Fresh local `npm run check` **exit 0**: lint, typecheck, 67/402 tests PASS and API/Next.js production build PASS. No real hosted browser E2E in this phase.
- **Next:** WD-02 Desktop Session/Logout failure-state QA, then WD-10 ambiguous-write/Medical file lifecycle and WD-11 browser E2E. No deploy/authority changes or Production go-live authorization.

## Current Phase

M7 HR MODULES — PASS / CLOSED IN DEV/TEST  
M8 PRODUCTION PREPARATION / REHEARSAL — PASS / CLOSED  
CURRENT: PROJECT B WEB DESKTOP ONLY — UX / FUNCTIONAL / API QA (Owner scope 2026-10-08)
HISTORICAL M9 CONTROLLED MODULE CUTOVERS — Production cutover suspended  
M8.1 Production Inventory / Topology Audit — PASS  
M8.2 Production Config / IAM / Secrets Parity — PASS  
M8.3 Database Migration Rehearsal / Rollback Proof — PASS  
M8.4 Immutable Release Artifact Manifest / Digest Verification — PASS  
M8.5 Observability / Backup / Rollback Rehearsal — PASS  
M8.6 DNS / LINE / GAS / Source-of-Truth Cutover Runbook — PASS  
M8.7 Production-like UAT / Synthetic Rehearsal — PASS  
M8.8 Final Go / No-Go Evidence Package — PASS  
M9.1 Server-side Module Routing + Write-Freeze Foundation — PASS / CLOSED IN DEV/TEST  
M9.2 Routing / Freeze Security & Failure QA — PASS / CLOSED IN DEV/TEST  
M9.3 Reconciliation / Delta Cutover Tooling — PASS / CLOSED IN DEV/TEST  
M9.4 Production Landing Zone Preparation — PASS / PREPARED / NOT PROVISIONED  
M9.5 Fresh Post-M9 Immutable Release Candidate — PASS / CLOSED / NON-PRODUCTION BUILD  
M9.6 Production Landing Zone Provisioning / Staging — PASS / CLOSED / PROVISIONED + STAGED / NO CUTOVER  
Production source-of-truth and module routing remain unchanged.

## Milestones

- M0 Legacy Inventory / Source Mapping — PASS
- M1 Repository Foundation — PASS
- M2 Local PostgreSQL / Prisma Model — PASS
- M2 Neon DEV Apply / Verification — PASS
- M3 Identity / Auth / RBAC / Audit — PASS
- M4 Non-production Runtime — PASS / CLOSED
- M5 R2 DEV/TEST Private Storage — PASS / CLOSED
- M6 Migration + Reconciliation Engine — PASS / CLOSED
- M7 HR Modules — PASS / CLOSED IN DEV/TEST
  - M7.1 Identity / Profile — PASS
  - M7.2 Leave / entitlement / approval — PASS
  - M7.3 Attendance / check-in-out / time correction — PASS
  - M7.4 OT — PASS
  - M7.5 Medical Claim — PASS
  - M7.6 Benefits — PASS
  - M7.7 Request Status / approval surfaces — PASS
  - M7.8 Announcements — PASS
  - M7.9 Attachments — PASS
  - M7.10 Notifications / admin settings — PASS
  - M7.1b Pending LINE Binding / Onboarding Compatibility — PASS
  - final cross-module QA/docs — PASS
- M8 Production Preparation / Rehearsal — PASS / CLOSED
  - M8.1 Production Inventory / Topology Audit — PASS
  - M8.2 Production Config / IAM / Secrets Parity — PASS
  - M8.3 Database Migration Rehearsal / Rollback Proof — PASS
  - M8.4 Immutable Release Artifact Manifest / Digest Verification — PASS
  - M8.5 Observability / Backup / Rollback Rehearsal — PASS
  - M8.6 DNS / LINE / GAS / Source-of-Truth Cutover Runbook — PASS
  - M8.7 Production-like UAT / Synthetic Rehearsal — PASS
  - M8.8 Final Go / No-Go Evidence Package — PASS
- M9 Controlled Module Cutovers — ENGINEERING / PREPARATION
  - M9.1 Server-side Module Routing + Write-Freeze Foundation — PASS / CLOSED IN DEV/TEST
  - M9.2 Routing / Freeze Security & Failure QA — PASS / CLOSED IN DEV/TEST
  - M9.3 Reconciliation / Delta Cutover Tooling — PASS / CLOSED IN DEV/TEST
  - M9.4 Production Landing Zone Preparation — PASS / PREPARED / NOT PROVISIONED
  - M9.5 Fresh Post-M9 Immutable Release Candidate — PASS / CLOSED / NON-PRODUCTION BUILD
  - M9.6 Production Landing Zone Provisioning / Staging — PASS / CLOSED / PROVISIONED + STAGED / NO CUTOVER
- M10 Full HR Cutover + Stabilization — NOT STARTED
- M11 GAS Retirement — NOT STARTED

## Completed — M7.1 Identity / Profile

1. safe self-profile response contract implemented.
2. NestJS `GET /profile/me` is protected by explicit SELF permission `profile.self.read`.
3. authorization guard derives self target only for routes that explicitly opt in.
4. repository uses privacy-minimized Prisma selection and never selects legacy password, LINE user ID, provider storage keys, or Drive URLs.
5. account lifecycle distinguishes ACTIVE/PENDING/INACTIVE/RESIGNED.
6. Users migration transformer is source-qualified and fail-closed.
7. legacy roles map explicitly to Project B role keys.
8. identity reconciliation covers employee count, exact legacy UID set, state counts and LINE-link counts.
9. latest full QA PASS: 23 files / 122 tests; lint/typecheck/build PASS.
10. npm audit 0, Prisma validate PASS, secret scan 0.
11. TEST image `m7-identity-20261005a` build SUCCESS, digest `sha256:9332ec15ddb2cfd423044026b7682c746051cb3f47010ce6038695afc9eacd3c`.
12. rollback-only Neon smoke PASS and synthetic rows did not persist.
13. TEST API revision `ckace-hr-api-test-00004-ngf` serves 100%.
14. TEST runtime preserved its dedicated service account, database/bridge Secret Manager references, and `LEGACY` routing.
15. Firebase same-origin health/ready = 200, signed-out profile = 401.
16. authenticated synthetic profile E2E = 200 and forged client identity headers did not override the signed server actor.
17. synthetic E2E data was removed in `finally`.
18. Production remained untouched.

## Completed — M7.2 Leave / Entitlement / Approval

1. requester identity remains server-derived; forged client identity headers are ignored.
2. Leave create uses explicit `entitlementId` and validates requester ownership, active leave type, and entitlement validity for the requested period.
3. SAME_AGENCY and SAME_DEPARTMENT approver scopes fail closed when requester organization context is missing.
4. create writes are idempotent: first create 201, exact replay 201/replayed, changed payload with same client key 409.
5. quota/calendar usage, ordered approval chain, audit log, notification outbox, self overview, and cancellation behavior are implemented and tested.
6. legacy LeaveRequests/UserPolicies/ApprovalSteps migration transformers and reconciliation remain source-qualified through the M6 engine.
7. legacy ApprovalSteps `Revise` is preserved as raw history while canonical approval-step state maps to `PENDING`, avoiding invalid request-only status leakage into step state.
8. final repository QA PASS: 28 test files / 157 tests; lint/typecheck/build PASS.
9. npm audit: 0 vulnerabilities.
10. Prisma 6.12.0 validate: PASS.
11. final Cloud Build `9c94d98c-9efa-4ca9-b9ce-8c16b106c9c3` SUCCESS.
12. final TEST image `m7-leave-20261005c`, digest `sha256:3ee0fe86c96238b792e88d6352936e3b41d30adffe32b840806d40f7cb938e9f`.
13. TEST API revision `ckace-hr-api-test-00007-642` serves 100% with dedicated TEST service account, Secret Manager refs, and `LEGACY` routing preserved.
14. Firebase same-origin health/ready = 200; signed-out Leave endpoints = 401.
15. authenticated synthetic Leave E2E PASS: `options=200 create=201 replay=201 conflict=409 overview=200 cancel=201 forged_headers_ignored=1`.
16. synthetic E2E cleanup completed successfully.
17. Production data/DNS/LINE/GAS/source-of-truth remained untouched.

## M7.3 Attendance — PASS

Completed bounded tasks:

- T1 read-only legacy audit — PASS.
- T2 contracts + pure business rules + tests — PASS.
- public write contracts do not accept client identity/role authority.
- checkout and time-correction contracts target an explicit `attendanceRecordId`, avoiding date-only selection when legacy duplicate business days exist.
- verified rule parity includes 09:05 late boundary, 17:30 work-end boundary, 12:00–13:00 break handling, 5 km radius classification, non-workday Approved OT requirement, idempotency inputs, strict GPS/time/client-key validation, and Time Correction rejection/comment rules.
- legacy Attendance regular-work calculation preserves the full lunch deduction when the interval crosses lunch; Time Correction preserves partial-overlap calculation and the 7.5-hour cap.
- Time Correction cannot target future dates and requires an existing original attendance event with a changed time.
- schema-gap decision: no Prisma mutation is required in T2. Existing AttendanceRecord / AttendanceCalculation / AttendancePolicy / TimeCorrectionRequest models remain sufficient for the next layer; per-event source is exposed in the contract and can be derived from migration provenance / approved correction state / new-device write context.
- Attendance and Time Correction routing remain `LEGACY`.

Completed T3 migration/reconciliation:

- deterministic `TimeLog` transformer preserves source-qualified LogID, employee/date facts, Bangkok check-in/out timestamps, nullable checkout, location strings, work/OT minutes, radius classification and raw legacy comments/status;
- deterministic `TimeCorrections` transformer preserves raw Thai display status plus canonical status, corrected-event type and approver/date fields;
- Time Correction attendance resolution is explicit by employee/date with `REQUIRE_EXACTLY_ONE_MATCH_OR_EXPLICIT_EXCEPTION`, so duplicate business days are never guessed;
- reconciliation covers record count, per employee/date counts, duplicate groups, check-in/out presence, nullable checkout, work minutes, location counts, linked OT counts, Time Correction count/status and missing attendance references;
- known duplicate-business-day and nullable-checkout conditions remain explicit non-blocking exceptions when source/target match;
- source/target drift remains blocking;
- targeted migration tests: 3 files / 22 PASS;
- full `@ckace/migration` tests: 8 files / 61 PASS;
- `@ckace/migration` lint/typecheck/build: PASS.

Completed T4 repository/persistence:

- ACTIVE-account enforcement and self Attendance overview;
- serializable/idempotent Check-in and Check-out writes;
- explicit `attendanceRecordId` ownership and current-business-day checks;
- actual OT minutes are capped by approved OT segments and actual checkout time;
- server-side Time Correction approver fallback preserves legacy role/agency behavior;
- Time Correction create/list/cancel and assigned-approver approve/reject are transactional with audit/outbox;
- approval fails closed on duplicate business days and mismatched attendance dates;
- approved Time Correction recalculates corrected regular work/late/early state while preserving existing OT minutes, matching legacy correction semantics;
- final database suite: 5 files / 38 tests PASS;
- final full repository `npm run check`: 31 files / 189 tests PASS; lint/typecheck/build PASS;
- independent read-only reviewer was cancelled after exceeding the bounded Task window without a result and is not counted as evidence.

Compatibility risk retained for closeout:

- older Desktop legacy could create a Time Correction when the original attendance event was missing, whereas LINE LIFF and the canonical Project B path require an existing original event;
- M0 current live TimeCorrections have zero missing matching TimeLog rows;
- routing remains `LEGACY`, so no current Production behavior changed.

Completed T5 NestJS API/security:

- added `AttendanceModule`, controller and service wiring;
- self Attendance routes require `attendance.self.read/write` with SELF authorization targets;
- self Time Correction routes require `time_correction.self.read/write` with SELF authorization targets;
- assigned queue and decision routes require `time_correction.approve` GLOBAL permission, while repository assignment checks remain authoritative for each request;
- requester/approver identity is taken only from server-derived actor context;
- forged client employee/role/approver fields are ignored and excluded from canonical idempotency payloads;
- strict GPS, UUID, client-key, correction and decision validation is translated to explicit 4xx responses rather than accidental 500s;
- Attendance and Time Correction repository state conflicts map to 409 where appropriate;
- API suite after T5: 7 files / 32 tests PASS;
- `@ckace/hr-api` typecheck/lint/build: PASS;
- no deploy/runtime/routing/Production mutation occurred.

Completed T6 TEST verification/closeout:

- Cloud Build `06ca9f66-3426-43d0-9c6f-2bfc74c9fb76` SUCCESS for QA image `m7-attendance-20261005b`, digest `sha256:341418b34ab40d10e3046201ae109cef37df5792d29590c4a50c1ab26977e398`;
- TEST service revision `ckace-hr-api-test-00008-wlq` serves 100% with TEST service account, Secret Manager refs and `LEGACY` routing preserved;
- Firebase same-origin health/ready = 200/200;
- signed-out Attendance and Time Correction endpoints = 401;
- hosted synthetic E2E PASS: check-in 201, replay 201, changed-payload conflict 409, checkout 201, checkout replay 201, overview 200, correction create 201, assigned queue 200, decision 201, forged headers ignored;
- synthetic cleanup completed and container exited 0;
- M7.3 is closed PASS.

Next: M7.4 OT — read-only legacy/schema audit, then bounded implementation and verification. Production remains untouched.

## M7.5 Medical Claim — T1 Audit PASS

Locked source-derived behavior for implementation:

- live current Medical baseline: 18 claims / 28 approval steps / 21 attachments; status 17 Approved / 1 Rejected; no orphan claim employee, approval request, approver, attachment request or attachment owner mismatch;
- 16/18 current claims have no Linked_LeaveID, so leave linkage stays optional;
- archive `MedicalClaims_2025` has 5/5 ClaimID collisions with current rows; archive/current provenance must remain source-qualified and current approval/file rows must never attach to archive by ClaimID alone;
- treatment date cannot be in the future;
- requested amount must be positive with at most 2 decimals; effective reimbursable amount preserves the legacy per-claim cap of 1,000;
- annual committed limit is 10,000 and counts Pending + Approved;
- medical receipts are required; legacy UI accepts 1–3 JPG/PNG/PDF files, max 2 MiB each / 4 MiB total;
- Admin/SuperAdmin medical requests auto-approve; normal employees use the ordered server-resolved agency approval chain;
- rejection requires a comment and only the current assigned step may decide;
- owner deletion semantics are Pending-only. Project B will expose canonical CANCELLED state rather than destructive row deletion; private attachment byte deletion remains an M7.9 lifecycle concern;
- Medical create will accept only finalized private `attachmentId[]` references, never raw Base64, Drive URLs or R2 storage keys. Repository must verify owner, `MEDICAL_PRIVATE`, R2, checksum/size/mime metadata and unlinked state before claim linkage;
- claim/detail responses expose attachment IDs + safe display metadata only. Download grants remain server-authorized and short-lived; provider URLs/storage keys are never returned as business data.

No Prisma schema change is required for T2: existing BenefitPolicy annualLimit, MedicalClaim, ApprovalInstance/Step, Attachment and MedicalClaimAttachment models are sufficient. Per-claim 1,000 remains a medical compatibility rule rather than a new schema field.

Completed T2 contracts/business rules:

- added safe Medical self/claim/approval queue contracts with attachment IDs + display metadata only;
- create accepts treatment date, requested amount, description, 1–3 finalized attachment IDs, optional leaveRequestId and clientKey;
- pure rules preserve the legacy 1,000 per-claim cap while exposing whether the requested amount was capped;
- annual entitlement counts Approved separately and Pending+Approved as committed against the annual limit;
- future treatment dates, invalid money precision, duplicate/missing receipt IDs and invalid client keys fail closed;
- receipt metadata preserves legacy JPG/PNG/PDF, <=2 MiB each and <=4 MiB total boundaries;
- Admin/SuperAdmin auto-approval role detection, Pending-only cancellation and rejection-comment validation are explicit;
- Medical business-rule tests: 11/11 PASS;
- `@ckace/contracts` typecheck/lint/build PASS;
- `@ckace/business-rules` typecheck/lint/build PASS.

Completed T3 Medical migration/reconciliation:

- current `MedicalClaims` and archive `MedicalClaims_2025` transform with source-qualified provenance; reused ClaimID values never collapse;
- current `Medical_ApprovalSteps` resolve only to current `MedicalClaims` provenance;
- current `MedicalAttachments` resolve only to current request provenance, preserve `MEDICAL_PRIVATE`, owner/file metadata and legacy Drive reference-only migration state;
- live header aliases `FileName/UploadedBy/UploadedAt` and `Filename/UserID/CreatedDate` are handled without guessing;
- historical Rejected -> downstream Pending approval steps preserve raw state;
- archive approval/attachment incompleteness and 1 ambiguous Medical attachment history association are explicit reconciliation exceptions rather than fabricated links;
- reconciliation covers current count/ID set/status/amount/leave links, 28 steps, 21 attachments, orphan/owner/approver counts, 5 archive claims / 5 current collisions and ambiguity count;
- targeted migration regression: 3 files / 26 tests PASS;
- `@ckace/migration` typecheck/lint/build PASS.

Completed T4 Medical repository/persistence:

- added `PrismaMedicalRepository` and database export;
- ACTIVE account is required for self reads, create, replay, cancellation and approver actions;
- current medical entitlement resolves an active `BenefitPolicy(key=MEDICAL)` with a positive annual limit;
- annual committed quota follows Production semantics: Bangkok current calendar year by claim date, counting Pending + Approved;
- optional Leave reference must exist in Project B and belong to the requester;
- every create receipt must be actor-owned, `MEDICAL_PRIVATE`, R2-backed, have storage key + MIME + positive size + SHA-256 checksum, satisfy legacy file size/type boundaries, and be unlinked from every other business relation;
- business views never select provider storage keys or legacy Drive URLs;
- normal users use a deterministic server-resolved `MEDICAL` approval policy chain; Admin/SuperAdmin role keys are read from persisted user roles and auto-approve;
- create is serializable and idempotent; exact replay resolves the original claim and changed payload conflicts via the shared idempotency primitive;
- cancellation is canonical/non-destructive and Pending-only; private object lifecycle remains M7.9;
- approval decisions require the assigned current step and atomically update step/instance/claim plus audit/outbox;
- targeted repository regression: 3 files / 17 tests PASS;
- full `packages/database/src` Vitest: 7 files / 50 tests PASS;
- database typecheck/lint/build: PASS;
- attempted workspace `npm test` command is unavailable because `@ckace/database` has no test script; this is a non-blocking command mismatch and verification used direct Vitest instead.

No API/deploy/routing/Production mutation was performed in T4.

Completed T5 Medical API/security:

- added `MedicalModule`, `MedicalController`, `MedicalService` and AppModule wiring;
- `GET /api/medical/me` and create/cancel routes require `medical.self.read/write` SELF authorization;
- assigned queue/decision routes require `medical.approve` GLOBAL permission, while repository assignment/current-step checks remain authoritative;
- requester and approver identities come only from verified server actor context; forged employee/approver/role fields in request bodies are ignored;
- strict create parsing validates date, numeric amount, description, UUID receipt IDs, optional Leave UUID and client key;
- canonical idempotency payload contains normalized business semantics only: treatment date, requested amount before cap, description, sorted attachment IDs and optional Leave ID; it excludes clientKey and client-supplied authority;
- strict decision parsing preserves mandatory rejection-comment rule;
- repository errors map fail-closed to 400/403/404/409 as appropriate;
- targeted Medical API/security regression: 2 files / 11 tests PASS;
- all `apps/api/src` tests: 9 files / 46 tests PASS;
- `@ckace/hr-api` typecheck/lint/build: PASS.

No deployment/routing/Production mutation was performed in T5.

Next bounded task: T6 Medical TEST closeout only.

## M7 Final Consolidated QA / TEST Closeout — PASS

Final accepted state:

- full `npm run check` PASS: lint, all workspace typechecks, 47 test files / 274 tests, package/API build and Next.js production build;
- `npm audit --audit-level=high`: 0 vulnerabilities;
- Prisma schema validate: PASS;
- Neon `ckace_hr_dev`: 5 migrations applied and schema up to date;
- attachment finalization and onboarding password-hash migrations are applied;
- final Cloud Build `675f9658-00c2-4664-a477-a8981ce1977f` SUCCESS;
- final image `m7-final-20261005b`, digest `sha256:2c463c601c9c9e6af3d1e24a45dd19d26bd33d731ab721868bdbca9945e6705f`;
- TEST revision `ckace-hr-api-test-00012-lwk` serves 100%;
- dedicated TEST service account plus Neon/legacy-bridge/R2 Secret Manager refs remain intact;
- direct Cloud Run and Firebase health/ready = 200/200 with database connected and module routing `LEGACY`;
- signed-out Profile, Leave, Attendance, OT, Medical, Benefits, Request Status, Announcements and Admin settings = 401;
- exact-final-image hosted E2E execution `ckace-hr-attendance-smoke-test-7l97f` completed successfully;
- final marker verifies Benefits, Request Status, R2 upload/finalize, scoped Announcement relation download, fail-closed generic attachment access, Admin notification/settings, Pending LINE binding, Pending actor denial, approval provisioning/idempotency, ACTIVE actor resolution, privacy and forged-header resistance;
- independent synthetic-residue check returned zero for every created business/config entity;
- reused Attendance smoke job was restored to its original image/command/target and DB/bridge secret refs.

M7 therefore closes PASS in DEV/TEST. Production data/DNS/LINE/GAS/source-of-truth were not changed and all module routing remains `LEGACY`.

M8 is active for READINESS / REHEARSAL only. Production mutation remains separately Owner-gated.

## Completed — M8.1 Production Inventory / Topology Audit

- verified current legacy Production rollback/source-of-truth anchors;
- verified current TEST Cloud Run/Firebase/Neon/R2 topology;
- confirmed no CKACE_HR Production API/Web service, dedicated Production runtime SA, Production PostgreSQL/Neon target, Production R2 bucket, Production secret set or active HR custom domain;
- confirmed current TEST runtime remains `LEGACY`;
- recorded Git no-baseline state as an observability limitation rather than a blocker.

## Completed — M8.2 Production Config / IAM / Secrets Parity

1. Production resource names are fixed in `infra/production/readiness-manifest.json`.
2. Runtime supports `production` readiness but remains fail-closed to `LEGACY` routing.
3. Production runtime requires dedicated database `ckace_hr_prod`, dedicated private bucket `ckace-hr-prod-private`, bridge/R2/LINE configuration and a database connection.
4. Firebase TEST and Production configs are separated with explicit site IDs; Production targets planned site `ckace-hr-prod`, not the default TEST site.
5. Production runtime SA target is `ckace-hr-prod@ckrr-leave-system-2026.iam.gserviceaccount.com`.
6. Production Secret Manager names are defined without secret values.
7. IAM design preserves per-secret `roles/secretmanager.secretAccessor`, no default project-wide runtime role and a separate deployment/runtime identity boundary.
8. Neon Production must use a dedicated Production project/database boundary; DEV/TEST reuse is forbidden.
9. R2 Production must use a dedicated private bucket and bucket-scoped token; TEST bucket/token reuse is forbidden.
10. every Production provisioning/deploy/DNS/LINE/GAS/routing action remains explicitly Owner-gated.
11. final `npm run check` PASS: 47 test files / 278 tests, lint/typecheck/packages/API/Next.js production build PASS.
12. no Production mutation was performed.

## Completed — M8.3 Database Migration Rehearsal / Rollback Proof

1. Added a fail-closed rehearsal harness limited to source database `ckace_hr_dev`, explicit `M8_REHEARSAL_ALLOWED=true` and `LEGACY` routing.
2. Rehearsal database/session operations are allow-listed to M8-specific database names only; Production database names are rejected.
3. Cloud Run TEST job `ckace-hr-m8-db-rehearsal-test` runs with the dedicated TEST service account and DEV database secret reference.
4. Final Cloud Build `4acb2968-e4df-4c16-96a5-fd0d6287da08` SUCCESS.
5. Final rehearsal image `m8-db-rehearsal-20261006b` digest `sha256:365d509a882ae290e98be42ef1d0be41831753c3ffd2558a05bad59e558ba1e0`.
6. Successful hosted execution `ckace-hr-m8-db-rehearsal-test-xznk9`.
7. Exact Prisma migration chain 5/5 applied to an empty isolated rehearsal database.
8. Schema fingerprint included 326 columns and synthetic migration bookkeeping.
9. A deliberate post-snapshot mutation changed the fingerprint as expected.
10. Snapshot and recovered database fingerprints matched exactly: `faf3daecb280265054ffe2b3a909eccb00effedd21d02a7b8c387c0bb757b2ea`.
11. Production mutation = 0; routing remained `LEGACY`.
12. Final `npm run check` PASS: 48 test files / 281 tests; lint/typecheck/packages/API/Next.js build PASS.
13. Evidence rehearsal databases and TEST job are retained; destructive cleanup requires separate explicit approval and is not required for M8.3 closeout.

## Completed — M8.4 Immutable Release Artifact Manifest / Digest Verification

1. Created `infra/production/release-manifest.json` with release ID `ckace-hr-m8-rc-20261006a`, `READINESS_ONLY` mode and `productionMutationAuthorized=false`.
2. Because no approved Git baseline exists, release source identity uses a deterministic 208-file build-input fingerprint: `e7c189bc9a60030cc69167a090ccfafc8e190316d452cb2103fb582bfd5cb619`.
3. Prisma schema and the exact 5-migration set are independently hashed; migration-set SHA-256 is `0f21a111f6fd30a06378d51900e1b0974b91d04aba636366fea5e682e54fabe5`.
4. API release candidate Cloud Build `cbe7f999-2f5d-4de4-8956-76985ca11a9d` SUCCESS; immutable digest `sha256:bef4064b47a4a1dfc6437522248243a60805299582b70e18087891e4c0aaee2b`.
5. Web release candidate Cloud Build `0efdf7b7-7bb3-4384-9930-a671a63dcc3c` SUCCESS; immutable digest `sha256:aced93f23bc778bb33ff7c825b36763e450312c5ad143c7cd0ba19e184a1da49`.
6. Artifact Registry live verification confirmed both immutable refs resolve to the recorded digests.
7. `verify-release-manifest.mjs` fail-closes on source/schema/build/config drift and rejects tag-only deployment authority.
8. `render-production-deploy-plan.mjs` emits a non-executable structured plan using immutable digest refs only.
9. Deployment remains blocked on unresolved Owner-gated `R2_ACCOUNT_ID`, `LINE_LOGIN_CHANNEL_ID` and explicit Production provisioning/deploy approval.
10. No secret value is embedded in the release manifest or plan.
11. Final `npm run check` PASS: 48 test files / 281 tests; lint/typecheck/packages/API/Next.js production build PASS.
12. Production mutation = 0; routing remains `LEGACY`.

## Completed — M8.5 Observability / Backup / Rollback Rehearsal

1. Created `infra/production/observability-rollback-manifest.json` in `READINESS_ONLY` mode with `productionMutationAuthorized=false`.
2. Verified TEST `/api/health` and `/api/ready` at HTTP 200; readiness confirms database connected and routing remains `LEGACY`.
3. Verified Cloud Run request-log evidence for HTTP status, latency, trace, span ID, revision and service name.
4. Defined seven explicit observability/rollback alert triggers covering revision readiness, health, DB readiness, 5xx rate, latency, auth/session and R2/attachment failure.
5. Created private isolated API rollback service; M8.4 candidate became Ready, accepted 100% rehearsal traffic and rolled back to the baseline revision at 100% — PASS.
6. Created private isolated Web rollback service with the same candidate-to-baseline traffic rollback proof — PASS.
7. Primary TEST services remained unchanged: API `ckace-hr-api-test-00012-lwk` 100%, Web `ckace-hr-web-test-00001-nwx` 100%.
8. Reused the M8.3 database recovery proof: 5 migrations, snapshot/recovered match and fingerprint `faf3daecb280265054ffe2b3a909eccb00effedd21d02a7b8c387c0bb757b2ea`.
9. Built dedicated R2 restore harness with Cloud Build `a6c5e23a-9424-4ec7-841b-3153bc34e63a` SUCCESS; digest `sha256:7445bf8b16c329c8aa5095d27fe5df95b1f8e796260283003cfc431dcd04ad19`.
10. Hosted R2 execution `ckace-hr-m8-r2-restore-test-trxfl` PASS with backup match, mutation detection, restore match and checksum `8b6623f0dc5d930c90f90bfa905cabefb6f1a0bd87afd3b416ffce89a699f6a9`.
11. R2 rehearsal used the TEST bucket as the same fault domain; Production requires an independent private backup bucket `ckace-hr-prod-backup-private` before Production cutover.
12. `render-production-rollback-plan.mjs` is non-executable and requires Owner approval before any Production rollback mutation.
13. Verification marker: `M8_OBSERVABILITY_ROLLBACK_VERIFY_PASS release=ckace-hr-m8-rc-20261006a api_rollback=PASS web_rollback=PASS db_recovery=PASS r2_recovery=PASS alerts=7`.
14. Final `npm run check` PASS: 48 test files / 281 tests; lint/typecheck/packages/API/Next.js production build PASS.
15. Production mutation = 0; routing remains `LEGACY`.
16. Rehearsal services/job/R2 evidence objects are retained; destructive cleanup requires separate explicit Owner approval.

## Completed — M8.6 DNS / LINE / GAS / Source-of-Truth Cutover Runbook

1. Created `docs/M8_CUTOVER_RUNBOOK.md`, `infra/production/cutover-runbook-manifest.json`, verifier and non-executable plan renderer.
2. Live Production readback corrected the current legacy anchor to `ckrr-line-gateway-readretry-20261006a=100%`, digest `sha256:0b475189399a2f0d5d18e7fbdaf7d3522713e15332dde001fb0367ff88c380a8`.
3. Project A baseline is GAS v38; v37 remains historical GAS rollback.
4. Production LIFF remains `2011403971-rHQJIrOx` on the legacy gateway. Existing Employee/Approver/Unlinked Rich Menus are preserved as the migration entry contract.
5. Live Project B readback confirms `ckace-hr-api-prod` / `ckace-hr-web-prod` are absent and `hr.ckaceaccount.com` is NXDOMAIN.
6. Six-phase runbook locked: plan freeze -> Production landing zone -> domain/TLS -> M9 module cutovers -> direct Project B LIFF entry -> stabilization/GAS retirement boundary.
7. Write-capable modules must switch read/write authority together inside one bounded freeze window after final delta import/reconciliation; indefinite dual-write remains prohibited.
8. After any NEW-authority write, blind routing back to GAS is forbidden; writes stop and data/object changes must be reconciled before Owner-approved rollback/forward-fix.
9. M8.6 discovered a required M9 implementation gap: `ModuleRoutingState` exists only as a contract; runtime still accepts `CKACE_MODULE_ROUTING=LEGACY` only and does not consume per-module routing.
10. Current route keys do not explicitly cover every M7 surface; Benefits, Request Status, Attachments, Notifications, Onboarding and announcement-write granularity require routing decisions before M9 execution.
11. A bounded per-module write-freeze control is also required before the first authority switch.
12. Direct LINE migration preserves the existing LIFF ID and current Rich Menus; only the LIFF endpoint changes to `https://hr.ckaceaccount.com/liff` after required modules are NEW/stable and target health/TLS/auth pass.
13. M8.7 and M8.8 are explicit blockers before any Production execution, in addition to Production landing-zone/backups/alerts and Owner approval.
14. `M8_CUTOVER_RUNBOOK_VERIFY_PASS release=ckace-hr-m8-rc-20261006a legacy=ckrr-line-gateway-readretry-20261006a phases=6 owner_gates=9 production_mutation=0`.
15. Final `npm run check` PASS: 48 test files / 281 tests; lint/typecheck/packages/API/Next.js production build PASS.
16. Production mutation = 0; routing remains `LEGACY`.

## Completed — M8.7 Production-like UAT / Synthetic Rehearsal

1. Owner clarified that functional Web/LIFF HR UI will be integrated later after backend/system testing; it is explicitly deferred and is not an M8.7 or M8.8 blocker.
2. Created isolated `ckace-hr-api-uat-rehearsal-test` and `ckace-hr-web-uat-rehearsal-test` from the immutable M8.4 API/Web image digests.
3. API health/readiness PASS at HTTP200; database connected; runtime remains TEST/NON_PRODUCTION and routing `LEGACY`.
4. Web root and `/liff` foundation routes return HTTP200 with mobile viewport metadata; no functional HR UI claim is made.
5. Auth/security Production-like smoke PASS.
6. Identity/Profile, Leave, Attendance/Time Correction and OT hosted E2E PASS.
7. Initial Medical smoke returned HTTP400 due to the UAT harness. The target API image was unchanged; a standalone harness correction/build was used and Medical rerun PASS.
8. Medical UAT harness build `3f119441-535b-4a35-a784-8363d823f64f`; digest `sha256:cad7a94940073fa89e10b4dc1007cde3cf1d9219cba755eac99f3b334deda9cb`.
9. Final cross-module execution `ckace-hr-m8-uat-final-test-t874m` SUCCESS with `M7_FINAL_E2E_PASS`, covering Benefits, Request Status, Attachments, Announcements, Admin/Notifications and Onboarding.
10. `M8_UAT_REHEARSAL_VERIFY_PASS release=ckace-hr-m8-rc-20261006a backend=7 web=FOUNDATION_ONLY routing=LEGACY production_mutation=0`.
11. Canonical TEST traffic remained unchanged at API `ckace-hr-api-test-00012-lwk=100%` and Web `ckace-hr-web-test-00001-nwx=100%`.
12. M8.4 release manifest remains frozen. Current working-tree source fingerprint differs because of post-release UAT harness/test work; immutable image digests/source archive remain the release authority for M8.8.
13. During M8.7, the separate Project A workstream advanced legacy Production to `ckrr-line-gateway-ownerui-20261006a=100%`, digest `sha256:272fc4db43213b50b90387477d7f0e864f8c2d9cd0a4354c2b1608effea87d7f`. M8.7 performed no Production mutation; M8.8 must refresh this baseline.
14. Final `npm run check` PASS: 48 test files / 281 tests; lint/typecheck/packages/API/Next.js production build PASS.

## Completed — M8.8 Final Go / No-Go Evidence Package

1. Created `docs/M8_FINAL_GO_NO_GO.md`, `infra/production/go-no-go-manifest.json` and `infra/production/verify-go-no-go.mjs`.
2. Final M8 decision: PASS / CLOSED 8 of 8 gates.
3. Final M9 entry decision: GO for DEV/TEST engineering.
4. Final Production decision: NO-GO for module authority/source-of-truth switch; Production provisioning remains HOLD pending explicit Owner approval.
5. Live Project B Production Cloud Run inventory remains empty for `ckace-hr-*-prod`; `hr.ckaceaccount.com` remains NXDOMAIN.
6. Live legacy Production baseline refreshed to `ckrr-line-gateway-ownerui-20261006a=100%`, digest `sha256:272fc4db43213b50b90387477d7f0e864f8c2d9cd0a4354c2b1608effea87d7f`; GAS remains v38 and Legacy remains source of truth.
7. Project A owner-ui baseline carries a known transient read-only 502/timeout operational risk; a fresh quiet-window baseline is required before future Production switching.
8. M8.4 immutable API/Web digests remain historical release/UAT authority.
9. Frozen M8.4 source fingerprint is `e7c189bc9a60030cc69167a090ccfafc8e190316d452cb2103fb582bfd5cb619`; current post-UAT 208-file source fingerprint is `c76bbeb56f77c21ea434ae4601c5a179ca4e2b148b209af980d01591decf7b2f`.
10. Historical M8.4 provenance is intentionally not rewritten. Any M9 runtime code change requires a fresh immutable release candidate before Production deploy.
11. Production-switch blockers remain: server-side module routing, full M7 route coverage, bounded write-freeze, Production landing zone, alerts, DB recovery, independent R2 backup, fresh release, live legacy refresh, named-module reconciliation and explicit Owner approval.
12. Web/LIFF functional HR UI remains Owner-deferred and does not block M9 backend engineering.
13. M8.5, M8.6, M8.7 and M8.8 verifiers PASS.
14. Last full repository QA after M8.7 source changes: `npm run check` PASS; 48 test files / 281 tests; lint/typecheck/packages/API/Next.js build PASS.
15. Production mutation during M8.8 = 0; routing remains `LEGACY`.

## Completed — M9.1 Server-side Module Routing + Write-Freeze Foundation

1. Added 13 HR module keys and 26 paired READ/WRITE route keys covering all M7 business surfaces.
2. Default routing remains fail-closed `LEGACY_ONLY_ROUTING`.
3. Added DEV/TEST server-controlled `CKACE_MODULE_ROUTING_STATE`; unknown keys/values fail.
4. Paired READ/WRITE authority is mandatory; split module authority fails configuration.
5. Production rejects any `NEW` route during M9.1.
6. Added bounded `CKACE_MODULE_WRITE_FREEZE` by module; unknown modules fail configuration.
7. Added `ModuleRoutingService`, global `ModuleRoutingGuard`, route decorator and routing module.
8. Server-derived routing context overwrites forged client routing state.
9. Frozen WRITE routes fail before controller execution with HTTP503 / `MODULE_WRITE_FROZEN` / `retryable=false`; READ routes remain available.
10. Existing business HTTP surface has 40 explicit `@ModuleRoute` mappings; regression coverage scans controllers so future business handlers cannot silently omit routing metadata.
11. `.env.example` documents only placeholder DEV/TEST routing/freeze controls; no credentials added.
12. Targeted routing QA PASS: 4 files / 51 tests.
13. Final repository QA task `84d1c986-17de-4fa8-aae4-360ab942db5d`: `npm run check` PASS; lint/typecheck PASS; 52 files / 332 tests PASS; packages/API/Next.js production build PASS.
14. Production mutation = 0; coarse runtime routing remains `LEGACY`; Project A unchanged.
15. M9.1 establishes control-plane/freeze primitives only. Named Production authority dispatch/switch remains later M9 work and Owner-gated.

## Completed — M9.2 Routing / Freeze Security & Failure QA

1. Audited the M9.1 failure matrix and identified one real security-ordering gap: protected frozen-route state could be disclosed before authentication/authorization.
2. Hardened the guard flow: ModuleRoutingGuard derives server routing context, protected routes defer freeze enforcement until AuthorizationGuard completes auth/permission checks, while intentionally public business writes remain frozen in ModuleRoutingGuard.
3. Verified protected frozen-route responses: unauthenticated 401, authenticated unauthorized 403, authorized frozen write 503 `MODULE_WRITE_FROZEN`.
4. Invalid config QA PASS: malformed/non-object JSON, unknown route, invalid authority, split READ/WRITE authority, Production `NEW` routing and unknown freeze module all fail closed.
5. Client-forged `moduleRouting` state is overwritten by server-derived route context.
6. Concurrent freeze QA PASS: all 32 frozen public write attempts are rejected before controller execution.
7. Restart/config stability PASS: each ModuleRoutingService instance snapshots config and a new instance is required to adopt changed environment state.
8. Ambiguous-write QA PASS for Leave/Attendance/OT/Medical: repository failure propagates after exactly one call; no blind service retry.
9. Targeted M9.2 QA task `138bee21-2d8a-487f-b480-97dca7d2ff6f`: 6 files / 67 tests PASS.
10. Workspace typecheck task `b84c7245-d043-4e33-b1ac-4016c5cc6099`: PASS.
11. Full repository QA task `aa6a16a7-90ed-448d-b4fa-0c8e6852b5bc`: `npm run check` PASS; lint/typecheck PASS; 53 files / 344 tests PASS; packages/API/Next.js production build PASS.
12. An earlier OT targeted failure was test-only because the test clientKey was below the existing minimum length; test input was corrected with no runtime behavior change.
13. Production mutation = 0; coarse runtime routing remains `LEGACY`; Project A unchanged.

## Completed — M9.3 Reconciliation / Delta Cutover Tooling

1. Added deterministic `m9.3-v1` named-module final-delta and cutover evidence tooling in `packages/migration/src/cutover-evidence.ts`.
2. Final delta is source-qualified and classifies ADDED/CHANGED/REMOVED records without relying on globally unique legacy IDs.
3. Baseline/final source descriptor sets must match exactly during the bounded freeze window.
4. Snapshot integrity is re-verified: descriptor/provenance match, canonical payload hash, row fingerprint and snapshot hash must all agree.
5. ADDED/CHANGED records become bounded import snapshots; REMOVED records require explicit reconciliation.
6. Pre-switch evidence requires paired `LEGACY/LEGACY` authority and active write-freeze.
7. Migration reports must exactly cover expected delta snapshots/provenance; missing, unexpected, duplicate or mismatched reports block the gate.
8. Module reconciliation and runtime health/readiness/auth/idempotency evidence are mandatory.
9. Blocking failures produce `BLOCKED`; explicit non-blocking legacy exceptions remain `PASS_WITH_EXCEPTIONS` with auditable disposition details.
10. Evidence carries deterministic SHA-256 and `productionMutationAuthorized=false`.
11. Synthetic LEAVE evidence artifact PASS: `infra/rehearsal/m9.3-leave-cutover-evidence.json`, 1 ADDED + 1 CHANGED, 3 reconciliation PASS, evidence hash `e96bb2935d42a4b3070f8e4ef53eb8b1d491dc505c589ccf58ebce70d669f90b`.
12. Targeted QA: 4 files / 24 tests PASS; workspace typecheck PASS.
13. Full repository task `99891b65-9d03-43bc-b48c-80a6bb1c6204`: `npm run check` PASS; lint/typecheck PASS; 54 files / 353 tests PASS; packages/API/Next.js build PASS.
14. Production mutation = 0; coarse routing remains `LEGACY`; Project A unchanged.

## Completed — M9.4 Production Landing Zone Preparation

1. Refreshed live GCP/DNS landing-zone inventory read-only.
2. Confirmed zero Project B `ckace-hr-*-prod` Cloud Run services.
3. Confirmed dedicated Production runtime service account is absent.
4. Confirmed all four planned CKACE_HR Production secrets are absent; only the existing Neon DEV database secret was observed.
5. Confirmed Cloud Monitoring alert-policy count is zero.
6. Confirmed `hr.ckaceaccount.com` remains NXDOMAIN.
7. Firebase CLI remains unavailable locally; Firebase Production site is therefore not claimed live-verified.
8. Neon connector currently returns HTTP 401 for configured project `flat-tree-71711157`; Production database state is not claimed verified.
9. R2 provider inventory is not available through the current connected toolchain; Production primary/backup buckets are not claimed provisioned.
10. Reconciled historical M8 blockers: M9.1 routing/full coverage/write-freeze = PASS, M9.2 security/failure QA = PASS, M9.3 reconciliation/delta tooling = PASS.
11. Added `infra/production/m9-landing-zone-manifest.json` with exact target resources and bounded phases P1-P6.
12. Added fail-closed `verify-m9-landing-zone.mjs`; marker PASS with prod services/SA/secrets/alerts all zero, DNS NXDOMAIN, fresh release NOT_BUILT and Production mutation zero.
13. Added `render-m9-landing-zone-plan.mjs`; output remains `PLAN_ONLY_NON_EXECUTABLE` and every Production-mutating phase remains `NOT_AUTHORIZED` pending Owner approval.
14. M8.4 immutable release remains historical evidence only; M9.1-M9.3 changed build inputs, so a fresh post-M9 immutable release is mandatory before Production deploy.
15. No Production resource/data/DNS/LINE/GAS/routing/source-of-truth mutation occurred.

## Completed — M9.5 Fresh Post-M9 Immutable Release Candidate

1. Frozen post-M9 runtime build selector contains 221 files with source SHA-256 `478e320df30215adb79965abbbe54c34db3c02ac5da41b6669bfa23c850f86a2`.
2. package-lock SHA-256 remains `d55db9c755ccd8056d5724df2393eefc4acf74badadfec4ce92ab8b197260286`.
3. Prisma schema remains `0b7d9ad4dc893d0f1f644150d0dfca80bdff22be0fdb81dc43f5de45adea37c0`; migration count remains 5 and migration-set SHA-256 `0f21a111f6fd30a06378d51900e1b0974b91d04aba636366fea5e682e54fabe5`.
4. API Cloud Build `e81e8278-8332-4eab-9328-1b2896b86ada` SUCCESS; immutable digest `sha256:8a14832c4361e4813e786899ee169a93fa4e07beafcb4866771a950d198bb88b`.
5. Web Cloud Build `1160f5a5-17dd-4b00-ade9-4c09d7bda460` SUCCESS; immutable digest `sha256:a7bc1b9b729518a47345a610a96b7927e5f81defb00fc9ac702f46344656aeeb`.
6. Artifact Registry tag-to-digest readback matches both build-result digests.
7. Added `infra/production/m9-release-manifest.json` and fail-closed `verify-m9-release-manifest.mjs`.
8. Historical M8.4 release remains frozen and is explicitly not reusable as current post-M9 deploy authority.
9. Current landing-zone readiness advanced fresh release from NOT_BUILT to BUILT_VERIFIED; M9.5 is recorded as completed prerequisite and P3 is `COMPLETED_NON_PRODUCTION_BUILD`.
10. P1/P2/P4/P5/P6 remain `NOT_AUTHORIZED`; Production landing zone remains unprovisioned.
11. M9.5 release verifier PASS and current landing-zone verifier PASS with fresh release BUILT_VERIFIED.
12. Full repository task `563da958-187f-41f9-af20-e2b2823ce101`: `npm run check` PASS; lint/typecheck PASS; 54 files / 353 tests PASS; packages/API/Next.js production build PASS.
13. Production mutation = 0; coarse routing remains `LEGACY`; Project A unchanged.

## Completed — M9.6 Production Landing Zone Provisioning / Staging

1. Owner explicitly authorized the bounded M9.6 landing-zone provisioning/staging phase; DNS/LINE/GAS/source-of-truth/module-authority cutover remained outside scope.
2. P1 PASS: dedicated Production runtime service account plus four Secret Manager containers were created with per-secret `roles/secretmanager.secretAccessor` only and no project-wide runtime role.
3. P2 PASS: dedicated Neon project `CKACE HR PROD` (`falling-paper-66157438`) in Singapore, Production branch `br-flat-sky-b3swsapw`, PostgreSQL 18 database `ckace_hr_prod`; DEV/TEST resources were not reused and no Production business data/schema was imported during M9.6.
4. P2 PASS: private R2 buckets `ckace-hr-prod-private` and `ckace-hr-prod-backup-private` created; runtime Object Read & Write token is scoped only to the primary bucket and excludes backup.
5. P2 PASS: all four required Production Secret Manager containers have enabled version 1.
6. P4 PASS: immutable M9.5 API/Web images staged as `ckace-hr-api-prod-m9-6-stage-20261007a` and `ckace-hr-web-prod-m9-6-stage-20261007a` using the dedicated Production service account/secrets while routing remained `LEGACY`.
7. P4 PASS: Firebase Hosting site `ckace-hr-prod` released with `/api/** -> ckace-hr-api-prod` and `** -> ckace-hr-web-prod` rewrites; no custom domain/DNS mutation occurred.
8. Final front-door verification PASS: health=200, ready=200 with database connected, Web=200, signed-out profile=401.
9. P5 PASS: four Production uptime checks and seven Cloud Monitoring alert policies provisioned; final Cloud Run ERROR-log query returned zero entries.
10. Neon recovery proof PASS: snapshot `m9-6-prestage-20261007` restored by multi-step restore into branch `br-withered-shape-b3in6ifc` while the Production branch remained unchanged.
11. R2 recovery proof PASS using synthetic object `m9-6-recovery-proof/synthetic-proof-20261007.txt`; primary/backup SHA-256 matched `b38bd91575bbc7781e9292d14edbd66c038741d5a7d27347de07361b6e1f6c03` after restore; temporary recovery tokens were revoked.
12. Final repository task `56dd6aa8-cac8-4f67-a171-83a418ba69ff`: lint/typecheck PASS, 54 test files / 353 tests PASS, packages/API/Next.js production build PASS.
13. P6 PASS/HELD BY DESIGN: `hr.ckaceaccount.com` remains NXDOMAIN and no DNS/custom-domain change occurred.
14. Source-of-truth/module routing remain `LEGACY`; Production business-data import, LINE mutation, GAS mutation and module-authority switch remain zero.

## Completed — M9.7 First Named-Module Production Cutover Preparation (`LEAVE`)

M9.7 is PASS / CLOSED as preparation-only. Production routing, read/write authority and source-of-truth remain `LEGACY`; Production business-data import, module schema apply, write-freeze activation and authority switch remain separately Owner-gated.

Completed evidence:

1. Legacy revision/digest remained stable; `/`, `/liff`, `/health` returned 200.
2. Final 30-minute `severity>=ERROR` quiet-window check returned zero entries at `2026-10-07T05:51:15Z`; a fresh check is still mandatory immediately before any future execution window.
3. LEAVE read-only source contract fixed to five descriptors: `UserPolicies`, current/archive LeaveRequests, current ApprovalSteps, and current Attachments.
4. M9.3 delta/reconciliation contracts remain fail-closed and require `LEGACY/LEGACY` pre-switch authority plus an active bounded freeze.
5. Added `leaveAttachmentTransformer` `leave-attachment-v1` and `attachment_count` reconciliation, closing the previously uncovered Legacy LEAVE attachment source.
6. Added `infra/production/m9.7-leave-precutover-status.json` and `verify-m9.7-leave-precutover-status.mjs`.
7. Verification PASS: targeted 2 files / 19 tests, full 54 files / 355 tests, lint, typecheck and production build.
8. No Production business data/schema was written; no DNS/LINE/GAS/module-authority/source-of-truth mutation occurred.

Next bounded action was approved by the Owner: LEAVE Production execution window.

## Completed — M9D.1 Desktop Foundation + Auth + Shell

Owner direction is Desktop-first. Chat ownership remains split: this chat owns Project B (`D:\\CKACE_HR`) only; a separate chat owns Project A (`D:\\APP_Leave`) including Rich Menu/Flex, WEB LINE TEST, LINE LIFF/mobile and its Production-readiness path.

M9D.1 was corrected to Foundation/Auth/Shell only. LEAVE business screens are M9D.2.

Completed M9D.1:

1. signed HttpOnly Project B Desktop session cookie with server-side actor refresh, bounded TTL and hosted Secure/SameSite=Strict attributes;
2. Desktop login/logout API using Project B scrypt and existing Legacy GAS password verification primitives;
3. browser session middleware with `PROJECT_B_WEB` actor context and fail-closed ACTIVE account enforcement;
4. server-derived navigation capabilities; client role/navigation state is not authorization authority;
5. responsive Next.js `/login` and `/desktop` shell with sidebar, loading, signed-out and error states;
6. `/` redirects to `/desktop`; existing `/liff` route remains untouched;
7. safe environment placeholders for `CKACE_DESKTOP_SESSION_SECRET` and `CKACE_LEGACY_PASSWORD_SALT`;
8. targeted auth/security tests PASS 8/8;
9. full repository verification PASS: lint, typecheck, 57 files / 363 tests, production build.

TEST readiness audit:

- TEST API remains `ckace-hr-api-test-00012-lwk` at 100%;
- TEST Web remains `ckace-hr-web-test-00001-nwx` at 100%;
- TEST API does not yet have the Desktop session secret or Legacy password salt configured;
- no secret/security mutation was performed automatically;
- hosted authenticated Desktop UAT is therefore deferred to a later TEST gate.

Production Neon schema/baseline data prepared during the earlier M9.8 attempt remains staged while LEAVE authority/source-of-truth stay `LEGACY`. No Project A, LINE, LIFF, Rich Menu, Flex, DNS or GAS mutation occurred in M9D.1.

## Completed — M9D.2 LEAVE Desktop

M9D.2 is PASS at code/UI level and remains Desktop-only in Project B.

Completed scope:

1. `/desktop/leave` dashboard with leave entitlement balances, request metrics, create form and leave history;
2. canonical Project B create/cancel leave flows with server-derived identity and existing idempotency controls;
3. server-provided approval-chain options for leave creation;
4. `/desktop/requests` LEAVE request-status view;
5. `/desktop/approvals` LEAVE approval queue;
6. new canonical `POST /api/leave/requests/:requestId/decision` with transactional approval state changes;
7. explicit `leave.approve` GLOBAL permission gate and server-derived approver identity;
8. loading/empty/error/disabled/503/responsive UI states;
9. Desktop shell now marks Leave / Request Status / Approvals as implemented surfaces;
10. no Project A/LINE/LIFF/Rich Menu/Flex mutation and no Production authority switch.

Verification: targeted LEAVE tests PASS 12/12; full lint PASS; full typecheck PASS; full tests PASS 57 files / 365 tests; production build PASS. Next.js build includes `/desktop/leave`, `/desktop/requests` and `/desktop/approvals`.

Hosted TEST deployment/UAT is intentionally deferred. TEST will require managed Desktop auth secrets, bounded module routing and RBAC data including `leave.approve`.

Next phase completed: M9D.3 — unified Desktop Request Status / Approval Center across supported Project B request modules.

## Completed — M9D.3 Unified Desktop Request Status / Approval Center

Completed scope:

1. unified `/desktop/requests` across LEAVE, TIME_CORRECTION, OVERTIME and MEDICAL;
2. type/status filters, aggregate metrics and module-specific labels;
3. unified `/desktop/approvals` across all four request kinds;
4. decision dispatch reuses each module's existing canonical API rather than creating a parallel approval write path;
5. aggregate approval visibility is filtered by server-derived module-specific permissions;
6. Desktop approval navigation appears when any supported module-specific approve permission is present;
7. module decision endpoints remain the final authorization authority for writes;
8. loading/empty/error/disabled/503/responsive UI states are covered;
9. targeted tests PASS 2 files / 4 tests;
10. full verification PASS: lint, typecheck, 57 files / 366 tests, production build.

M9D.3 made no hosted TEST deployment and no Production authority/source-of-truth switch. Project A/LINE/LIFF/Rich Menu/Flex/GAS/DNS remain untouched.

Next phase completed: M9D.4 — Attendance Desktop, including Attendance dashboard/history and Time Correction Desktop flows. The unified Request Status / Approval Center from M9D.3 is reused rather than duplicated.

## Completed — M9D.4 Attendance Desktop

Completed scope:

1. `/desktop/attendance` Attendance dashboard and history;
2. check-in/check-out timestamps plus work/late/early/overtime metrics;
3. explicit radius and source states, including corrected and legacy provenance;
4. Time Correction create flow using the existing canonical `POST /api/attendance/time-corrections`;
5. Time Correction self-history and pending cancellation flow;
6. correction target choices are constrained to existing Attendance events;
7. unified M9D.3 Approval Center remains the approval surface for Time Correction;
8. Attendance navigation is now enabled in the Desktop shell;
9. loading/empty/error/disabled/403/409/503/responsive states are covered;
10. Desktop Check-in/Check-out writes remain intentionally out of scope.

Verification: targeted Attendance Desktop/API tests PASS 2 files / 10 tests; full lint PASS; full typecheck PASS; full tests PASS 58 files / 369 tests; production build PASS and confirms `/desktop/attendance`.

M9D.5 — Time Correction Desktop is considered absorbed into M9D.4 because create/history/cancel plus approval integration are already implemented and verified. Do not duplicate this work unless a future gap is identified.

M9D.4/M9D.5 made no hosted TEST deployment and no Production authority/source-of-truth switch. Project A/LINE/LIFF/Rich Menu/Flex/GAS/DNS remain untouched.

## Completed — M9D.6 OT Desktop

Completed scope:

1. added `/desktop/overtime` OT dashboard/create/history surface;
2. OT create uses the existing canonical Project B API and server-derived employee identity;
3. Desktop constrains dates to today-or-earlier while Server remains final business-rule authority;
4. history shows status, reason, submitted time and per-day OT segments;
5. segment-level Attendance linkage is displayed from canonical `attendanceRecordId` only and is never created client-side;
6. pending self requests support cancellation through the canonical OT cancel endpoint;
7. unified M9D.3 Approval Center remains the OT approval surface;
8. OT navigation is now enabled from server-derived `overtime.self.read` capability;
9. loading/empty/error/disabled/409/503/responsive states are covered;
10. targeted OT Desktop/API tests PASS 3 files / 14 tests;
11. full verification PASS: lint, typecheck, 59 files / 372 tests, production build;
12. no hosted TEST deployment and no Production authority/source-of-truth switch occurred.

M9D.7 — Medical Claim Desktop is PASS / CLOSED at code/UI level.

Completed:
- Desktop Medical dashboard with annual/approved/committed/remaining entitlement.
- Medical create/history/cancel.
- Private receipt upload/finalization through Project B attachment APIs using `MEDICAL_PRIVATE`, SHA-256 verification and signed R2 grants.
- Optional owned Leave linkage.
- Receipt metadata/download flow.
- Medical self navigation restricted to `medical.self.read`; approver-only access stays in the unified Approval Center.
- Targeted 23/23 PASS; lint PASS; typecheck PASS; full tests 60 files / 376 PASS; production build PASS with `/desktop/medical`.
- No hosted TEST deploy or Production authority/source-of-truth switch.

M9D.8 — Benefits Desktop is PASS / CLOSED at code/UI level.

Completed:
- Read-only Desktop Benefits dashboard using canonical `GET /api/benefits/me`.
- Medical annual/approved/committed/remaining entitlement summary.
- Approved/committed entitlement progress display.
- Unified OT + Medical activity with kind/status filters.
- Correct unit separation: OT in hours, Medical in THB; no invalid cross-unit total.
- Links back to canonical OT and Medical Desktop surfaces instead of introducing duplicate write flows.
- Benefits navigation enabled only from server-derived `benefits.self.read`.
- Loading/empty/error/403/503/responsive states covered.
- Targeted 5/5 PASS; lint PASS; typecheck PASS; full tests 61 files / 379 PASS; production build PASS with `/desktop/benefits`.
- No hosted TEST deploy or Production authority/source-of-truth switch.

M9D.9 — Announcements / Activities Desktop is PASS / CLOSED at code/UI level.

Completed:
- Added read-only `/desktop/announcements` employee news feed using canonical `GET /api/announcements`.
- Preserved server-side ACTIVE-account and GLOBAL/AGENCY/DEPARTMENT visibility authority.
- Added scope filter, text search, publish timestamps and empty/error/403/503/responsive states.
- Added relation-authorized announcement attachment download flow through the existing signed private-object endpoint.
- Desktop navigation exposes the surface only from server-derived `announcements.read`.
- Announcement admin-write UI remains deferred to M9D.13 Admin Desktop.
- Project B has no separate Activities contract/repository/API. M9D.9 records this explicitly and does not fabricate activities from announcement rows.
- Targeted tests PASS: 4 files / 10 tests.
- Full lint PASS; typecheck PASS; tests PASS 62 files / 383 tests; production build PASS with `/desktop/announcements`.
- No hosted TEST deployment or Production authority/source-of-truth switch.

M9D.10 — Notifications Desktop is PASS / CLOSED at code/UI level.

Completed:
- Added `/desktop/notifications` operational outbox dashboard using canonical `GET /api/admin/notifications`.
- Added total/queued-processing/sent/failed metrics, status filters, search, attempts, delivery counts and last-error visibility.
- Added server-derived `canRetry` to the canonical admin notification overview.
- Retry is shown/enabled only when `notifications.admin.retry` is present and still uses the existing FAILED-only canonical retry endpoint.
- Retry state races now return HTTP 409 Conflict.
- Desktop navigation exposes Notifications only from `notifications.admin.read`.
- Current schema has no employee recipient/unread-read model; M9D.10 records this as a real backend contract gap rather than inventing an employee inbox.
- Targeted tests PASS 4 files / 13 tests.
- Full lint PASS; typecheck PASS; tests PASS 63 files / 389 tests; production build PASS with `/desktop/notifications`.
- No hosted TEST deployment or Production authority/source-of-truth switch.

Next phase completed: M9D.11 — Identity / Profile Desktop.

M9D.11 — Identity / Profile Desktop is PASS / CLOSED at code/UI level.

Completed:
- Added `/desktop/profile` read-only self Identity/Profile surface using canonical `GET /api/profile/me`.
- Combined the privacy-minimized Profile projection with safe server session diagnostics for functional access visibility.
- Shows account lifecycle, login name, organization, roles, LINE-link boolean, employment dates and server-derived menu capabilities.
- Profile/signature media use existing private attachment download grants; no storage key/provider URL is exposed through the Profile contract.
- Profile navigation is enabled only from server-derived `profile.self.read`.
- No profile/account/password/media mutation API was added.
- Loading/error/401/403/404/503/responsive states covered.
- Targeted tests PASS 4 files / 15 tests.
- Full lint PASS; typecheck PASS; tests PASS 64 files / 393 tests; production build PASS with `/desktop/profile`.
- No hosted TEST deployment or Production authority/source-of-truth switch.

M9D.12 — Onboarding Desktop is PASS / CLOSED at code/UI level.

Completed:
- Added safe pending-employee and active Agency/Department read projections protected by `onboarding.admin.approve` GLOBAL.
- Added `/desktop/onboarding` with pending-account metrics/search, organization selection and canonical account approval/activation.
- No credential fields are exposed by the admin projection and no duplicate onboarding write path was added.

M9D.13 — Admin Desktop is PASS / CLOSED at code/UI level.

Completed:
- Added `/desktop/admin` bounded Admin hub.
- Reused canonical Onboarding, Notification Operations, admin settings and GLOBAL announcement contracts.
- Generic user/role/policy editors remain explicit unsupported contract gaps rather than direct-database or invented writes.

M9D.14 — Desktop Full QA is PASS / CLOSED.

Verification:
- lint PASS;
- typecheck PASS;
- full tests 67 files / 400 tests PASS;
- module route coverage 44 assertions PASS;
- production build PASS with the full Desktop route set including `/desktop/onboarding` and `/desktop/admin`.

M9D.15 Historical Pre-Approval Gate Evidence:

Prepared evidence:
- fresh API TEST image build SUCCESS, digest `sha256:b63c7ff94d2c1e72a39912f725dd3c2b82d3529ec7e8ef3ed99378103ea861de`;
- fresh Web TEST image build SUCCESS, digest `sha256:df538db04b1d4cfe67a3c77b52186f58e1a839075833bdfb414d1a77e4d7a2f1`;
- 0%-traffic candidate revisions `ckace-hr-api-test-m9d15a` and `ckace-hr-web-test-m9d15a`;
- candidate health/ready = 200/200, signed-out session = 401, core Desktop static routes = 200;
- canonical TEST API/Web baseline traffic remains 100% on the pre-M9D revisions.
- TEST Secret Manager currently has no Desktop session secret and TEST API has no `CKACE_DESKTOP_SESSION_SECRET` binding.
- authenticated Desktop UAT therefore remains blocked pending explicit Owner approval for a new managed TEST-only session secret.
- bounded synthetic UAT can use a modern Project password hash, avoiding any need to introduce a Legacy password salt for the synthetic actor.

Next phase after the Owner security gate: bind TEST-only session secret, complete authenticated same-origin Desktop UAT, clean synthetic data, and close M9D.15. Production remains `LEGACY`.


## Completed — M9D.15 Desktop TEST/UAT

- Owner-approved TEST Desktop security gate completed; no Legacy password salt was introduced.
- Firebase-compatible Desktop session cookie is `__session`.
- Post-fix QA PASS: targeted security 3 files / 7 tests; lint PASS; typecheck PASS; full tests 67 files / 400 tests PASS; production build PASS.
- Fresh API Cloud Build `1da918a4-4e79-46e4-aa29-435063478f8d` SUCCESS, digest `sha256:587cf33d2c540a0cad6738ea998d73124d108adbb27797b3203dd8d0bd2c2092`.
- Canonical TEST traffic: API `ckace-hr-api-test-m9d15d` = 100%; Web `ckace-hr-web-test-m9d15a` = 100%.
- Direct authenticated UAT PASS: login/session/profile 200, 16 critical reads PASS, forged client identity headers ignored, `clientRoleAuthority=false`, logout 200.
- Firebase same-origin authenticated UAT PASS at `https://ckrr-leave-system-2026.web.app`.
- Synthetic cleanup PASS: no synthetic employee, role, permission or weekly-work-rule rows remain.
- Final Firebase route smoke PASS for every Desktop route through `/desktop/admin`; health/ready = 200/200; signed-out session = 401.
- A 0%-traffic normal-template API revision `ckace-hr-api-test-m9d15e` restores the image-default command after temporary self-test revisions.
- M9D.12, M9D.13, M9D.14 and M9D.15 are PASS / CLOSED.
- Production authority/source-of-truth remains `LEGACY`; no Production cutover occurred.

Next phase: M10D.1 Desktop Production Readiness. Prepare reconciliation, rollback, monitoring and cutover evidence, then require a separate explicit Owner Production gate before any Production authority switch.

## Completed — M10D.1 Desktop Production Readiness

M10D.1 completed the post-M9D Production readiness refresh without deploying or switching Production.

Completed:

- refreshed live Production Cloud Run/Firebase/Neon/monitoring state;
- reconciled stale M9.8 zero-table/no-import evidence against the live Production database;
- confirmed Production Desktop auth/RBAC/session-secret gaps;
- ran full current-source QA: lint PASS, typecheck PASS, 67 files / 400 tests PASS, API/Web build PASS;
- froze current source provenance at 267 runtime files, SHA-256 `2edb9151f27f35041ddd735c7683d55511f5fed43494371c9565de9a13f3331a`;
- confirmed Prisma schema and the 5-migration set are unchanged from M9.5;
- built and registry-verified fresh immutable Desktop release `ckace-hr-m10d1-rc-20261008a`;
- API digest `sha256:9e8f2c95d83c23447fe1cc3ac70f779227e5f1073beeadf3448e5632154ec720`;
- Web digest `sha256:b054a993a70dbbd29d2087b392cef04ff3b24f0a1291d03109bd8af102624fd9`;
- created M10D.1 release/readiness manifests and fail-closed verifier;
- verifier PASS with Production mutation = 0.

Live Production facts that now override historical M9.8 evidence:

- Production DB has 41 application tables, 25 employees/accounts, 192 leave requests, 69 entitlements, 13 attachments and 654 legacy provenance rows;
- migration run `e6f8374c-2d24-4661-877d-56758105f774` imported 654 rows with 86 mismatches and status `COMPLETED_WITH_EXCEPTIONS`;
- detailed migration reconciliation rows = 0;
- `_prisma_migrations` is absent;
- modern password hashes = 0;
- legacy password hashes = 0;
- permissions = 0;
- role_permissions = 0;
- Production Desktop session secret is absent/unbound;
- Production Firebase front door health/ready remains 200/200 but `/login` and `/desktop` remain 404 because Production still serves the pre-M9D Web image;
- Production monitoring retains 7 alert policies and 4 uptime checks;
- `hr.ckaceaccount.com` remains NXDOMAIN.

M10D.1 decision:

- readiness/evidence phase = PASS / CLOSED;
- Production Desktop deployment = NO-GO;
- Production authority/source-of-truth remains `LEGACY`;
- fresh release is build authority only and is not Production deployment authority.

Next planned phase:

M10D.2 — Production Identity / RBAC / Data Reconciliation.

Owner approval is required before M10D.2 performs any Production data repair/reconciliation write, credential population, permission/RBAC seed, Production Desktop session-secret creation/binding, or Production API/Web staging.

## Completed — M10D.2 Production Identity / RBAC / Data Reconciliation

M10D.2 is PASS / CLOSED as the Production identity/RBAC/data-reconciliation and 0%-traffic staging phase.

Completed:

- persisted 11 PASS reconciliation rows plus 1 explicit aggregate EXCEPTION for the historical 86 mismatches without fabricating unavailable row-level detail;
- created non-destructive Production baseline branch `br-muddy-scene-b3v0ens5` and verified no schema diff;
- seeded 42 canonical permissions with least-privilege role grants: EMPLOYEE 20, SUPERUSER 27, ADMIN 38, SUPERADMIN 38;
- implemented one-time LINE-verified Desktop credential activation for imported ACTIVE accounts;
- verified 19/20 ACTIVE accounts have an existing LINE binding and can use the safe activation path;
- retained one ACTIVE EMPLOYEE without LINE binding as an explicit fail-closed identity exception rather than assigning a password or guessing an identity mapping;
- created/bound managed Production Desktop session secret to the candidate API runtime;
- ran targeted credential activation tests: 3 files / 8 tests PASS;
- ran full repository gate: lint PASS, typecheck PASS, 67 files / 402 tests PASS, production build PASS;
- built fresh immutable release `ckace-hr-m10d2-rc-20261008a`;
- API digest `sha256:d81150489bc92de5b5ee0ccef26744629c2067210f64c1c311b3149bbe7888b4`;
- Web digest `sha256:1af21f148f26793fd2655ffcba89f7aff32a0dea1982ee13d312ab7df3c62216`;
- staged current API revision `ckace-hr-api-prod-m10d2d` and Web revision `ckace-hr-web-prod-m10d2b` at 0% Production traffic;
- kept M9.6 baseline API/Web revisions at 100% Production traffic;
- authenticated Production UAT PASS on the current API digest: login/session/profile 200, 16 critical reads, forged identity headers ignored, `clientRoleAuthority=false`, logout 200;
- verified synthetic UAT cleanup and restored the normal API entrypoint;
- M10D.2 verifier PASS.

M10D.2 launch/cutover status:

- Production traffic switch = NOT PERFORMED;
- Production module-authority switch = NOT PERFORMED;
- Production source-of-truth = `LEGACY`;
- DNS / LINE configuration / GAS = unchanged;
- one ACTIVE account remains deliberately excluded from Desktop credential activation until owner-verified identity remediation.

Next planned phase:

M10D.3 — Production Cutover Gate. Perform a fresh read-only Legacy source extraction/delta reconciliation, resolve or explicitly exclude the one active unlinked identity, then require a separate named Owner approval before any Production traffic or module-authority switch.

## Completed — M10D.3 Production Cutover Gate

M10D.3 is PASS / CLOSED as the read-only Production LEAVE cutover decision phase.

Verified:
- refreshed the five bounded live Legacy LEAVE sources directly from Google Sheets read-only;
- baseline relevant LEAVE source rows = 576 and live rows = 576;
- added = 0, removed = 0, raw changed = 27;
- semantic classification = 6 actionable canonical changes, 1 explicit Legacy source inconsistency (`LEV-0106`), 20 representation/expected-model drifts;
- actionable request changes: `LEV-0103`, `LEV-0104`, `LEV-0108`;
- actionable approval-step changes: `LEV-0103-STEP3`, `LEV-0104-STEP3`, `LEV-0108-STEP1`;
- Legacy Production gateway remains `ckrr-line-gateway-ownerui-20261006a` at 100%, GAS authority, `/ /liff /health` = 200/200/200, fresh 30-minute ERROR lookback = 0;
- Project B M9.6 baseline API/Web remain 100%, M10D.2 API/Web candidates remain 0%;
- Production authority/source-of-truth remains `LEGACY`;
- ACTIVE identity state remains 20 accounts / 19 LINE-linked / 1 fail-closed unlinked exception;
- M9.3 source snapshot + cutover evidence regression = 2 files / 15 tests PASS;
- M10D.3 verifier PASS.

M10D.3 decision:
- cutover gate evidence = PASS;
- LEAVE cutover execution = NO-GO until a separately approved bounded execution window;
- no Production write freeze, delta import, traffic switch, authority switch, DNS, LINE/LIFF or GAS mutation occurred.

Evidence:
- `infra/production/m10d3-leave-live-delta.json`;
- `infra/production/m10d3-cutover-gate-status.json`;
- `infra/production/verify-m10d3-cutover-gate.mjs`.

Next planned phase:

M10D.4 — LEAVE Execution Window. Requires separate explicit Owner approval. The execution window must freeze Legacy LEAVE writes, recapture the same five sources, reconcile/disposition `LEV-0106`, import only verified delta, run final reconciliation/report coverage, resolve or explicitly exclude the one active unlinked identity, and only then permit a paired LEAVE read/write authority switch if all gates pass.

### M10D.4 Pre-execution readiness (2026-10-08)

Preparation audit completed, but Production execution remains NO-GO. Eleven Legacy LEAVE write paths were inventoried: seven direct Desktop GAS, two GAS LIFF, and two Gateway LIFF. The Gateway-only local freeze guard does not cover direct Desktop GAS writes, and deployed all-channel coverage is not proven. LEV-0106 and the one ACTIVE unlinked identity are still pending.

Added a machine-readable preexecution record, fail-closed verifier, nine negative safety tests and `docs/M10D4_LEAVE_PREEXECUTION_READINESS.md`. No Project A source or Production operations were changed. Next: obtain bounded approval for all-channel Legacy freeze hardening/testing and separate named Production execution gates. The new preexecution verifier intentionally returns EXECUTION_NO_GO. Historical M10D.4B Legacy GAS/Gateway hardening was prepared but is now CANCELLED/SUPERSEDED by the Owner's latest WEB DESKTOP ONLY scope. Project B retained the 15-path inventory and 6/6 preparation tests as historical evidence; no Project A source edits occurred. The A goal was cancelled and auto-resume watch disabled. Do NOT resume GAS/Gateway hardening when T17 finishes; Production LEAVE migration/cutover stays NO-GO. Final `npm run check` PASS: lint, typecheck, 67 files / 402 tests, API build and Next.js production build; standalone Node-native safety checks 9/9 PASS.

## Technical Decisions

- Next.js + React + TypeScript frontend.
- NestJS REST backend.
- Neon PostgreSQL / Prisma 6.12.0.
- Google Cloud Run + Firebase same-origin front door.
- Cloudflare R2 private object storage.
- server-derived actor context is authorization authority.
- Project B canonical IDs are UUIDs.
- immutable legacy provenance is source-qualified.
- coarse runtime routing remains `LEGACY` until controlled cutover; DEV/TEST per-module authority is server-derived from the M9 routing control plane.
- write-capable module read/write authority must switch together inside a bounded write-freeze window after final delta reconciliation.
- after any NEW-authority write, source-of-truth rollback requires write stop + reconciliation; no blind route-back to GAS.
- preserve the existing Production LIFF ID and Rich Menus through M9 module cutovers; direct LIFF endpoint switch is a later Owner gate.
- no indefinite dual-write.
- no Production mutation without explicit Owner gate.
- no Git commit/push without explicit Owner approval.

## Known Risks

- M8 is PASS / CLOSED 8/8. M9 DEV/TEST engineering is GO; Production authority/source-of-truth switching remains NO-GO until all listed M9/Production prerequisites pass and Owner explicitly approves the named gate.
- M9.1 routing/write-freeze, M9.2 security/failure QA, M9.3 reconciliation/delta tooling, M9.4 landing-zone preparation, M9.5 fresh immutable release and M9.6 Production landing-zone provisioning/staging are implemented and verified. Production authority switching remains blocked by the execution-window Legacy baseline refresh, actual named-module Production migration/reconciliation evidence and explicit Owner cutover gates.
- historical approval/attachment records can be incomplete or ambiguous across archive/current periods and must stay source-qualified.
- the known Attendance duplicate-business-day record must remain distinct and must not be silently merged.
- repository has no approved Git baseline commit, so review evidence remains direct read/test/runtime verification rather than Git diff history.
- Project B Desktop Web is now under active module-by-module implementation (M9D.x). LINE LIFF/mobile, Rich Menu/Flex and WEB LINE TEST remain a separate Project A workstream and are not blockers for Project B Desktop development.
