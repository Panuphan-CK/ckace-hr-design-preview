# Phase A — Web Desktop Functional + Security QA

Date: 2026-10-08 Asia/Bangkok
Project: `D:\CKACE_HR` / Project B only
Scope lock: Web Desktop and Desktop-only APIs; **DO NOT** access or mutate Project A `D:\APP_Leave`, Web LIFF, GAS, LINE Gateway, Rich Menu, LINE/DNS, Production credentials, business data, routing, deploy or authority.

## TASK-39 — TEST Traffic Decision + Web Traffic Switch — PASS (2026-10-14)

Owner-approved TASK-39 review concluded **GO for Web-only shared TEST promotion** and **KEEP current API baseline**. Recommended Web target: `ckace-hr-web-test-task35-20261014a` (`task35-responsive`) to 100%; API `ckace-hr-api-test-m9d15d` remains 100%. No Firebase rewrite change is required because TEST Hosting already routes `/api/**` to the API service and all other paths to the Web service.

API task30/task32/task34 revisions are explicitly excluded from promotion because their exact revision names activate TEST-only UAT/R2 harnesses. The selected Web candidate contains no `/api/test/` dependency. Web candidate + canonical API baseline compatibility smoke passed: Login 200, health 200, ready 200, signed-out session 401; proxy target-safety tests 8/8 PASS. Full evidence: `docs/TASK39_TEST_TRAFFIC_DECISION_20261014.md`.

Owner subsequently approved the exact Web-only mutation. Web `ckace-hr-web-test-task35-20261014a` now serves **100%** shared TEST traffic; API `ckace-hr-api-test-m9d15d` remains **100%**; Firebase rewrites are unchanged. Canonical TEST smoke passed Login 200, health 200, ready 200, signed-out session 401, and Browser `/desktop` redirected client-side to `/login` with required controls and no horizontal overflow. **TASK-39 CLOSED PASS.**

## TASK-38 — Phase A Final Review — PASS (2026-10-14)

Owner-approved TASK-38 reviewed TASK-28 through TASK-37 as one Phase A evidence set. Functional, authentication/session/RBAC, failure/idempotency, private Medical/R2, responsive/state, exact cleanup and final regression evidence are internally consistent and no unresolved blocker remains within the Web Desktop TEST scope. Fresh TASK-38 checks confirm Neon DEV tracked synthetic/business rows remain zero, API `/api/health` and `/api/ready` return 200, API baseline `m9d15d` remains 100%, and Web baseline `m9d15a` remains 100%.

Residual items are explicitly non-blocking for Phase A but must carry forward: public onboarding registration E2E if it is part of launch scope, bucket-level R2 CORS administration limitations, TEST-only harness/tag isolation before traffic promotion, and Production readiness. Full evidence: `docs/TASK38_PHASE_A_FINAL_REVIEW_20261014.md`.

**TASK-38 CLOSED PASS. PHASE A — WEB DESKTOP FUNCTIONAL + SECURITY QA = PASS. TASK-39 was later approved, executed, and closed PASS; see the current TASK-39 section above.**

## TASK-37 — Final Regression — PASS (2026-10-14)

Owner-approved TASK-37 is closed PASS. Fresh whole-repository verification after TASK-36 cleanup completed with no source/cloud/data mutation: Prisma schema validation PASS, `npm run check` exit 0, lint and all workspace typechecks PASS, **78/78 test files and 505/505 tests PASS**, package/NestJS API/Next production builds PASS. The initial Prisma validation attempt failed only because the local shell lacked `DATABASE_URL`; rerun with a dummy non-secret local PostgreSQL URL validated the schema without connecting to any database.

Independent post-regression Neon DEV spot checks remained zero for employees/accounts, Leave/Attendance/OT/Medical business rows, attachments, approvals, outbox/audit/idempotency. Final traffic re-read remains API baseline `m9d15d` 100% and Web baseline `m9d15a` 100%; tagged candidates remain 0%/tagged only. Full evidence: `docs/TASK37_FINAL_REGRESSION_20261014.md`.

**TASK-37 CLOSED PASS. TASK-38 was later explicitly approved and completed PASS; see the current TASK-38 section above.**

## TASK-36 — Exact TEST Data / R2 Cleanup — PASS (2026-10-14)

Owner-approved TASK-36 is closed PASS. Fresh Neon DEV and attachment-link preflight matched the exact TASK-29/TASK-31/TASK-32 cleanup ledger. A fail-closed TEST-only R2 cleanup runner validated the finalized 92-byte PDF MIME/checksum, confirmed the two stale keys were already absent, deleted only the exact finalized key, and post-verified all three exact keys as NOT_FOUND. Execution `ckace-hr-task36-r2-cleanup-274f7` emitted `TASK36_R2_CLEANUP_PASS exact_keys=3 deleted_finalized=1 stale_absent=2 post_absent=3`.

A separate fail-closed Neon DEV cleanup runner re-attested all exact fixture counts/IDs/relations immediately before one dependency-safe transaction. Execution `ckace-hr-task36-db-cleanup-679kb` emitted `TASK36_DB_CLEANUP_PASS tracked_fixture_rows=0 identity_rbac=0 attachments=0 business=0 config=0`. Independent post-cleanup Neon reads confirmed identity/RBAC, configuration, business rows, attachments/links, outbox/deliveries, audit and idempotency tables all returned zero for the TEST fixture.

Cloud Build `9d021006-bfe8-4ba0-89fc-70a5e20b70a9` SUCCESS, digest `sha256:63667016c6674674516b82eed8516c74615271b858c8f167e9442a97b05a2f66`; focused storage/API typecheck and cleanup-runner ESLint passed. Final traffic re-read remains API baseline `m9d15d` 100% and Web baseline `m9d15a` 100%. No Production, Project A, shared routing, credential value, or permission-set mutation occurred. Full evidence: `docs/TASK36_EXACT_TEST_CLEANUP_20261014.md`.

**TASK-36 CLOSED PASS. TASK-37 was later explicitly approved and completed PASS; see the current TASK-37 section above.**

## TASK-35 — Responsive + State QA — PASS (2026-10-14)

Owner-approved TASK-35 is closed PASS on isolated Project B TEST. Shared Desktop layout/state hardening fixed mobile sidebar scrolling, narrow topbar wrapping, long-value overflow, grid/flex min-width behavior, internal table scrolling, Loading/Error accessibility semantics, Onboarding error semantics and Leave unavailable/exhausted entitlement disabling without changing business/API behavior.

Isolated Web revision `ckace-hr-web-test-task35-20261014a` uses immutable digest `sha256:f0afb619466061bc226571bad42b0badef1a44362b8e1ed2e293d6793ccd8f71`, is Ready/Active/Healthy at **0% traffic**, while canonical Web baseline `m9d15a` remains **100%**. Authenticated same-origin Browser QA covered all 13 Desktop routes at exact widths 399 / 824 / 1536 (**39 rendered combinations**) with zero document-level horizontal overflow and correct mobile/desktop navigation modes. Browser-local Fetch interception verified Loading `role=status + aria-busy` and HTTP 503 Error `role=alert + Retry` at 399 without server mutation. Real synthetic fixtures exposed Empty and Disabled states; mobile sidebar open/backdrop/close and internal `overflow-y:auto` passed.

Fresh Development Lead `npm run check` task `5567d00b-7368-43d1-9d10-262416963dd7` exit 0: **78/78 test files, 505/505 tests**, lint/typecheck/NestJS/Next build PASS. Owned loopback proxy/browser tab were closed after QA; final Web traffic re-read remains baseline 100%, TASK-35 candidate 0%. Full evidence: `docs/TASK35_RESPONSIVE_STATE_QA_20261014.md`.

**TASK-35 CLOSED PASS. TASK-36 was later explicitly approved and completed PASS; see the current TASK-36 section above.**

## TASK-34 — R2 Orphan Reconciliation — PASS (2026-10-14)

Owner-approved TASK-34 is closed PASS on isolated Project B TEST. A dedicated read-only probe, locked to the exact two retained TASK-32 attachment IDs/keys and exact TEST resource boundaries, independently compared Neon DEV rows/link state with real R2 object state. Both candidates returned `dbPresent=true`, `finalized=false`, `linked=false`, `objectState=NOT_FOUND`, classification `DB_ONLY_PENDING_OBJECT_MISSING`.

Therefore the prior ambiguity is resolved as **2 stale DB-only attachment rows and 0 corresponding R2 objects**. No R2 delete, Finalize, upload, DB cleanup, credential expansion or Production/shared-traffic change occurred. The two DB rows are retained for TASK-36 exact cleanup, which must re-check link state and R2 absence immediately before deletion.

Manager verification: focused **2 files / 47 tests PASS**; final `npm run check` **exit 0: 78/78 test files, 505/505 tests**, lint/typecheck/NestJS/Next build PASS. Cloud Build `90284569-8e7f-44d7-b56c-8164a93f24fa` SUCCESS; immutable digest `sha256:1f44c67bd686bb6bf3c02a8d828a50fdad61271823bdfe8c97e6c3ef08d82e0e`; revision `ckace-hr-api-test-task34r2-20261014a` Ready/Active/Healthy at **0% traffic**, while canonical baseline `m9d15d` remains **100%**. Full evidence: `docs/TASK34_R2_ORPHAN_RECONCILIATION_20261014.md`.

**TASK-34 CLOSED PASS. TASK-35 was later explicitly approved and completed PASS; see the current TASK-35 section above.**

## TASK-33 — Failure & Ambiguous-Write QA — PASS (2026-10-14)

Owner-approved TASK-33 is closed PASS on Project B source/TEST evidence. Desktop write failures now distinguish definite 401/403/409/other 4xx from ambiguous 5xx/network outcomes: definite rejections discard the prior submission intent, while ambiguous results retain the same client key for explicit retry. No automatic business-write retry was added. Attendance now surfaces a consistent session-expiry message on 401; Leave has explicit 409 conflict feedback; Medical uncertain-finalize/object preservation remains intact.

Independent Development Lead verification: focused **8 files / 41 tests PASS**; fresh `npm run check` **exit 0: 77/77 test files, 479/479 tests**, lint/typecheck/NestJS/Next build PASS. Current TEST baseline signed-out probe returns 401. Read-only exact TASK-32 revision logs provide real 403 authorization denial, 409 changed-replay conflict, and intended 503 ambiguous-finalize evidence. Neon DEV has **0 new Medical claims, 0 new attachments, 0 new idempotency rows** on 2026-10-14; API baseline remains 100%, TASK-32 candidate 0%. No TASK-33 deploy or traffic mutation was performed. Full evidence: `docs/TASK33_FAILURE_AMBIGUOUS_WRITE_QA_20261014.md`.

**TASK-33 CLOSED PASS. TASK-34 was later explicitly approved and completed PASS; see the current TASK-34 section above.**

## TASK-32 — Medical + Private R2 E2E — PASS (2026-10-08)

Owner-approved TASK-32 is closed PASS on Project B TEST. Exact candidate `ckace-hr-api-test-task32r2-20261008d` is Ready/Active/Healthy at **0% traffic**, immutable digest `sha256:04cf3bdec5ffb6c22787207dbd94fa7ec4aeeec386c0d31c625d24c0b600ecaf`; canonical API baseline `m9d15d` remains **100%**. Web baseline `m9d15a` remains **100%** and Web WD candidates remain **0%**.

Live request/runtime + Neon DEV evidence verifies private upload intent, real R2 object, ambiguous finalize **503**, same attachment-ID finalize retry, one Medical claim with exact replay and changed-payload **409**, assigned Superuser approval, pre/post-approval authorization boundaries, claim/approval final `APPROVED`, and real 92-byte PDF download whose SHA-256 matches `42cef79776cf0d5ce63df78e172ec982c8ce1b7c6da6bd51ecfe3408d9737939`. Functional R2 CORS preflight returns **204** for the exact TEST origin with `PUT, GET, HEAD` and `content-type`. The least-privilege object token receives 403 for bucket-level CORS management calls; permissions were not broadened and this is non-blocking because the required runtime CORS behavior was directly verified.

Fresh final `npm run check` exit 0: **77/77 test files, 474/474 tests**, lint/typecheck/NestJS/Next build PASS. Exact DB/R2 IDs, retained unfinalized intents and TASK-36 cleanup ledger are in `docs/TASK32_MEDICAL_PRIVATE_R2_E2E_20261008.md`. No cleanup performed. **TASK-33 was later explicitly approved and completed PASS; see the current TASK-33 section above.**

## TASK-31 — Core Desktop Functional UAT — PASS (2026-10-08)

Owner-approved hosted TEST functional UAT now verifies real synthetic workflows for Leave, Request Status/Approval, Attendance/Time Correction, OT, Benefits, Announcements, Notifications and Desktop Onboarding. Create/replay/conflict/cancel/decision behavior matched server contracts; Superuser assigned approvals and Admin operational surfaces passed. Browser rendering matched API/DB state with no horizontal overflow on tested module pages.

DEV post-state remains synthetic and fully tracked: 2 Leave requests, 1 Attendance record, 2 Time Corrections, 2 OT requests, 1 Announcement, 15 Notification outbox rows, and one approved onboarding fixture; **0 Medical claims and 0 Attachments**. Exact IDs/cleanup ledger: `docs/TASK31_FUNCTIONAL_UAT_20261008.md`. Final repository gate `89ec13c0-5fee-4e0f-a489-f982105453a7` exit 0: **76/76 test files, 468/468 tests**, lint/typecheck/API/Next build PASS. API/Web baseline traffic remains 100% and UAT candidates remain 0%. Public onboarding registration success was not executed due credential-bearing tool safety rejection; no bypass was attempted, while the Desktop Admin pending→approve flow passed.

**TASK-31 PASS. TASK-32 subsequently completed PASS; see the current TASK-32 section above.**

## TASK-30 — Authenticated Desktop role/API UAT — PASS (2026-10-08)

Hosted TEST evidence now closes the prior four-role authentication/RBAC blocker. Dedicated `task30-uat` API candidate is revision-gated, TEST-only and connected to the TASK-28-attested DEV database. Its bootstrap rotates exact disposable account hashes internally and calls the real Desktop authentication service without disclosing credentials.

Fresh source gate: **76 files / 468 tests PASS**, lint/typecheck/API/Next build exit 0. API build `6b5381e9-3bf4-4306-94c8-b720d887bc60` SUCCESS, image `sha256:f86149d297c64734a7ced9a8eb61e66b03247b8d37d596caf4750b85f6811fc1`, candidate `ckace-hr-api-test-task30uat-20261008a` healthy **0%**; existing API and Web baselines remain **100%**, Web WD13 candidate remains **0%**.

Role Browser/API matrix verified live: Employee=14 permissions, Superuser=19, Admin=23, Superadmin=24; Desktop menu rendering matches session capabilities and protected API endpoints produce correct 403/200 boundaries. Session/logout lifecycle PASS and arbitrary UAT role input is rejected. No business data created; DB remains four synthetic fixture identities and zero Leave/Attendance/OT/Medical requests. Full evidence in `docs/TASK30_AUTHENTICATED_UAT_20261008.md`. **TASK-30 PASS.** Medical private R2/failure E2E remains downstream and is not claimed here.

## TASK-29 — Four-role TEST identity/RBAC fixture — PASS (2026-10-08)

After explicit Owner approval, four isolated synthetic Desktop identities were provisioned only in the TASK-28-attested Neon DEV database. Baseline identity/RBAC tables were empty. Created users `wd13.test.employee`, `wd13.test.superuser`, `wd13.test.admin`, `wd13.test.superadmin` with ACTIVE Project credentials and one disposable matching role each. Added 24 actual Desktop permission keys derived from current controller requirements and navigation; assignments are hierarchical **14 / 19 / 23 / 24** permissions. Verified post-state: **4 employees, 4 accounts, 4 roles, 24 permissions, 4 user_roles, 80 role_permissions, 0 LINE accounts**, no agency/department linkage, no legacy password hashes.

Credential plaintext was not retained. Exact IDs for UAT/cleanup are recorded in `docs/TASK29_TEST_IDENTITIES_20261008.md`. This step does not itself prove Login/RBAC/browser behavior; authenticated execution is TASK-30 and must wait for separate Owner approval. Production and shared routing unchanged.

## TASK-28 — TEST database target attestation — PASS (2026-10-08)

The prior Secret-target blocker is closed without reading or disclosing Secret Manager payload. Added TEST-only endpoint `/api/test/database-attestation` backed by a non-disclosing runtime validator: it validates runtime `stage=test`, Cloud Run `K_SERVICE=ckace-hr-api-test`, secret-backed database URL against the exact CKACE HR DEV direct/pooled endpoint and `ckace_hr_dev`, and read-only checks the active connection with `current_database()`. Neon control-plane read-only metadata independently maps those endpoints/database to project `flat-tree-71711157` (**CKACE HR DEV**) branch `br-proud-term-b3pihnrx`.

Fresh repository gate `23c142c6-7c98-45aa-946e-779089e00fab`: **75 files / 463 tests PASS**, lint/typecheck/API/Next build exit 0. API build `87a894de-9afe-4b2c-b9d2-33d076fc1123` SUCCESS, image `sha256:4063b591e47632aed294c8a433a4fad4f5a88266969ae6d5479ff2112566a767`; Cloud Run TEST revision `ckace-hr-api-test-task28att-20261008a` tagged `task28-attest` healthy **0%**, current baseline `m9d15d` remains **100%**. Tagged attestation HTTP 200 returned only safe `VERIFIED / CKACE_HR_DEV / ckace_hr_dev / test / databaseConnection=verified / serviceName=ckace-hr-api-test` fields. **TASK-28 PASS.** Four real temporary TEST roles and signed-in Browser/R2 UAT are still not performed; TASK-29 requires the next Owner approval.

## WD-13 — Current TEST retry-tag and Medical ambiguous Finalize continuity (2026-10-08)

Latest source adds `MedicalReceiptFinalizeUncertainError` with existing attachment ID and `completeMedicalReceiptUploads` to resume *explicit same-intent* private Finalize after an ambiguous response, without re-uploading duplicate receipts. The page retains per-intent progress until resolved or form intent changes. Fake-Fetch unit tests cover multi-file state, failed/recovered Finalize, no automatic retry, normal upload and HTTP/network failure. `npm run check` task `2782f78c-5c0c-42bf-9c8b-322971117d66` **exit 0: 74/74 test files, 455/455 tests, lint/typecheck/API and Next Build PASS**. This does not establish live R2 behavior.

Cloud Build `2485751b-19f3-4e4c-bcd0-d23fa7632c67` **SUCCESS**, immutable Web TEST image digest `sha256:0601aca41d392c8306383c6f96b21427bc8a08b5a427ae904797be02c31a5c83`; deployed `ckace-hr-web-test-wd13retry-20261008a` with tag `wd13-retry` **0% traffic**, all Ready/Container conditions True. Cloud Run readback: prior m9d15a TEST baseline remains **100%**; WD11, WD13-medical and WD13-retry all 0%; no Firebase routing or Production changes. Direct tag `/login` HTTP 200, managed Chrome Login fields/submit 1536px no overflow, QA tab closed. Updated loopback proxy exact allowlist for tag `wd13-retry` with 4/4 Node proxy safety tests PASS. No real signed-in user/R2 testing because Secret target still unattested and TEST temporary identities blocked by host safety policy (Owner consent already recorded; do not bypass or request duplicate). Phase A PARTIAL, WD11 PARTIAL, WD13 BLOCKED. Known residual: pending finalize ID lives only in the current open page; reload/new intent may require authorized reconciliation of private orphan attachments, no blanket deletes.

## WD-13 — TEST-only Cloud Run tagged candidate and signed-out Browser (2026-10-08)

Current Web Desktop medical-finalize safeguard now **staged in TEST only**, not Production. Cloud Build `cee07834-60c0-445e-9816-d93fd26aad15` **SUCCESS**; image immutable `sha256:6a6f066861b32ab25e4aa2912ca28fe057f6d9f185014ceb86a22ec85aa48b9b`. New Cloud Run `ckace-hr-web-test-wd13med-20261008a` tagged `wd13-medical`, **0% traffic**, Ready/ContainerHealthy/ContainerReady True. Existing TEST Web `m9d15a` remains **100%**, WD11 candidate **0%**. Direct tagged `/login` HTTP 200; managed Chrome widths **1536,830,415 px** required form fields present with no overflow. Updated loopback-only proxy to accept exact WD13 tag in addition to WD11; strong PROD URL denial and mock safety tests **7/7 PASS**. Chrome `/desktop` signed-out redirects `/login`, `/api/security/session`, `/api/medical/me`, `/api/admin/settings` each **401** on same-origin local WD13 Web+existing TEST API routing. Owned tabs and proxy stopped. **No real sign-in/4-role Browser/Medical private R2 E2E or fault injection**, and no TEST actor or data/secret mutation. Full source `npm run check` already PASS **74 files/452 tests**. WD11 PARTIAL, WD13 BLOCKED; Phase A PARTIAL, Production NO-GO.

## WD-13 — Medical R2 Finalize ambiguous-response safety (2026-10-08)

Reviewed actual `apps/web/src/app/desktop/medical/page.tsx`, `AttachmentService.finalize`, and private receipt repository. Server Finalize is idempotent once a finalized row exists, but Desktop previously called DELETE on *any* non-2xx finalize response, risking loss of a receipt already persisted on the Server. Extracted real upload flow into `apps/web/src/app/desktop/medical/medical-receipt-upload.ts` with tests. Failed/uncertain Finalize (including HTTP 400, 409, 500, 503 and network failure) now preserves private attachment rather than deleting it. Failed upload before Finalize still cleans unlinked metadata best-effort. Previous Thai 401/403/409/503 messages retained. **`npm run check` task `e6720159-49f7-49a4-8376-da8f94a61286` terminal exit 0: 74 files/452 tests PASS, lint/typecheck/API/Next build PASS.** This is source-level/fake-Fetch QA only; source has not been deployed to the tagged TEST Web and live private R2 browser flow remains **UNVERIFIED**. Residual risk: preserved unlinked attachments may need a separate safe reconciliation policy; no delete/reset should target possibly finalized or linked receipts. Prior Secret/TEST actor tooling safety blockage unchanged. Phase A PARTIAL/WD13 BLOCKED, Production NO-GO.

## WD-13 — Signed-session/auth-guard source integration coverage (2026-10-08)

After Owner TEST-only approval, added `apps/api/src/security/wd13-desktop-auth-rbac-matrix.test.ts`. Actual `DesktopAuthService`, project password verification, signed session and `AuthorizationGuard` were exercised using **only in-memory fixture repositories**. Nine checks cover 4 distinct synthetic role logins, navigation projection, spoofed high-role header/client navigation still forbidden, cross-employee SELF authorization denial, role/permission downgrade enforced on a still-valid Session, and invalid password/inactive actor fail-closed. `npm run check` task `3e1d6427-94e7-4cb5-b942-c6e79edacf97` finished **exit 0, 73 test files / 444 tests PASS**, lint/typecheck/API/Next build PASS. The prior tool-safety denial of actual TEST identity provision and protected Secret target attestation was **not retried or bypassed**. These integration tests are NOT current hosted signed-in Browser/R2 UAT; WD-11 PARTIAL, WD-13 BLOCKED, Phase A PARTIAL, Production NO-GO.

## WD-13 — TEST-only Owner-approved execution gate (2026-10-08)

Owner authorized **TEST-only**. Scoped transient Neon DEV fixture insertion/attestation was blocked by OpenAI tool safety **before database mutation**, so no synthetic identity was created, and no alternative method was used to circumvent that control. Immediately afterward a separate read-only Neon DEV SQL check showed account/employee/role/permission totals **0/0/0/0**. The Secret resource itself has no independently attested endpoint metadata; the TEST API's Secret payload was never accessed. Added pure fail-closed `apps/api/src/security/wd13-test-boundary.ts` + `.test.ts` for approved TEST-only stage, DEV host/DB, and TEST API match. The validator is **not runtime-attested** and must not be counted as authenticated E2E. Latest full repository gate `npm run check` task `a7463767-9d34-4091-86b1-73f8d08145d7`: **72/72 files, 435/435 tests, lint/typecheck/API/Next builds PASS (exit 0)**. See `docs/WD13_TEST_ONLY_EXECUTION_GATE_20261008.md`. WD-11 PARTIAL, WD-13 BLOCKED, overall Phase A PARTIAL, Production NO-GO; Project A/LIFF/GAS untouched.

## WD-13 Four-role Test Matrix Preparation (2026-10-08)

Project B source-only: added `apps/api/src/security/wd13-disposable-role-matrix.test.ts` with 5 strict no-DB/no-network proposed TEST-role projection assertions and missing-role rejection. Fresh `npm run check` completed **exit 0, 71/71 test files, 419/419 tests, lint/typecheck/API and Next build PASS** (task `879ecac0-0d30-4d27-9905-adf447a0dbce`). This is a **synthetic acceptance gate**, not actual deployed four-role server RBAC. Underlying TEST Secret connection target and 4 real temporary accounts remain unverified/unprovisioned, so WD-13 and overall Phase A cannot be closed.

## WD-13 Live Database Isolation Investigation (2026-10-08)

Live read-only verified two separate Neon projects (DEV `flat-tree-71711157` vs PROD `falling-paper-66157438`). DEV database `ckace_hr_dev` has five successful migrations and zero accounts/roles/employees/permissions. Hosted TEST API `/api/health` and `/api/ready` each returned HTTP 200, `stage=test`, `NON_PRODUCTION` runtime, `database=connected`. Cloud Run `DATABASE_URL` references `ckace-hr-neon-dev-database-url:latest`, but underlying connection endpoint is **NOT cryptographically/independently verified**: host safety blocked a secure non-disclosing classification attempt. No attempt to bypass and no secret exposed. Thus four-role authenticated TEST UAT remains blocked until a permitted DB-target attestation and scoped temporary identity provisioning. See `docs/WD13_TEST_IDENTITY_DATABASE_GATE_20261008.md`. No Production, legacy, UI/LIFF, Firebase or DB mutation.

## Decision

**PARTIAL — source/code/automated QA and signed-out browser security smoke PASS; authenticated cross-role TEST UAT NOT VERIFIED.** Phase A must **not** be called fully complete or Production-ready. The current Desktop candidate **was** staged on a TEST-only 0%-traffic tagged revision. A local loopback-only same-origin TEST Web/API route was verified, but disposable authenticated TEST identities are not provisioned, and complete Browser/R2 UAT remains blocked. No shared Firebase routing or Production cutover occurred.

## WD-01..WD-13 acceptance matrix

| Task | Verification outcome | Evidence / limits |
| --- | --- | --- |
| WD-01 Desktop Functional Audit | **PASS** | Existing `docs/WD01_WEB_DESKTOP_FUNCTIONAL_AUDIT_20261008.md`: 13 Desktop routes + Login mapped to canonical API controllers, RBAC navigation and known gaps. |
| WD-02 Login/Logout/Session | **PARTIAL** | Signed token/session tests exist; added `logout-request.test.ts` (6 cases), fixed UI redirect-on-logout-failure. Browser Login local renders. Authenticated cookie logout, concurrent expiry and actual hosted invalidation not exercised with a signed-in actor. |
| WD-03 4-role RBAC | **PARTIAL** | Server-side permissions and `AuthorizationGuard`, navigation capability tests and 44 route-coverage assertions all PASS. Real employee/Superuser/Admin/Superadmin account-role matrix in Browser was NOT run. UI hiding alone never conveys authority. |
| WD-04 Leave | **PARTIAL** | Leave controller/business-rule tests PASS. Desktop create/cancel GET/POST are canonical and a stable same-intent clientKey is now used. Fresh signed-in Browser create/cancel not run. |
| WD-05 Requests/Approvals | **PARTIAL** | Four canonical decision APIs cross-checked; server approval permission and assigned-step tests PASS. Bangkok display timezone normalized. Real cross-role reject/approve Browser workflow not run. |
| WD-06 Attendance/Time Correction | **PARTIAL** | Controller/time-correction rule tests PASS; Desktop history/correction endpoints matched; stable same-intent clientKey. Browser correction E2E not run. Desktop check-in/out intentionally not implemented; not a defect for this phase. |
| WD-07 Overtime | **PARTIAL** | Controller/persistence and UI helper tests PASS; stable same-intent clientKey. Fresh signed-in Browser E2E not run. |
| WD-08 Medical / Private R2 | **PARTIAL** | Validation/authorization/controller tests PASS. Claim create now reuses same-intent clientKey and finalized receipt IDs on an uncertain POST; does not delete possibly linked files on ambiguous write. `medical-view.test.ts` includes cleanup decision check. Private downloads open tabs synchronously and honor grant headers. Live R2 CORS/read/expiration and ambiguity fault-injection not run. |
| WD-09 Onboarding/Admin | **PARTIAL** | Canonical pending/options/approve, admin settings/notification and announcement API controller tests PASS. Current Desktop Admin navigation is permission-derived. Browser cross-role create/approve with synthetic data not run. |
| WD-10 Failure/Timeout/409/503 | **PARTIAL** | New pure tests for logout 401/403/500/503/network failure and submission same-key retry; existing API guard/route-failure tests PASS; popup block helper test PASS. Full browser fault injection and interrupted post-commit response tests still needed. |
| WD-11 Browser/Responsive | **PARTIAL** | Initial Web-only local Login 1536×730 rendered without overflow but had no API. Later the current tagged TEST Web was tested through a local same-origin TEST-only proxy at 1536, 824 and 399 px: no Login horizontal overflow, invalid-login error visible, unauthenticated Desktop redirects to Login. Authenticated Desktop pages have not been tested. |
| WD-12 Full Regression | **PASS** | Fresh `npm run check` task `7a3876ac-d3ac-4bff-864b-df417743ff14`: exit 0, lint PASS, typecheck PASS, **70 test files / 414 tests PASS**, NestJS API build and Next.js 16.3.8 production build PASS (18 static routes, no deploy). |
| WD-13 Authenticated TEST UAT | **BLOCKED / NOT VERIFIED** | Historical M9D.15 TEST UAT used an older candidate and disposable actor since cleaned up. The changed Web Desktop code is now staged on a **0%-traffic tagged TEST revision**, and a local TEST-only same-origin proxy has passed signed-out Browser checks. There remains no current safe disposable four-role authenticated fixture/session, so WD-13 signed-in workflows/R2 are NOT VERIFIED. Do not treat historical UAT as new-source proof. |

## Files modified in Project B (no Project A edits)

- `apps/web/src/app/desktop/desktop-shell.tsx` — logout only redirects on confirmed 2xx, otherwise explicit error and retry.
- `apps/web/src/app/desktop/logout-request.ts` + `.test.ts` — testable logout response/network semantics.
- `apps/web/src/app/desktop/submission-intent.ts` + `.test.ts` — retain the same clientKey for an identical user intent on retry; clear on success; no automatic retry of writes.
- `apps/web/src/app/desktop/leave/page.tsx`, `overtime/page.tsx`, `attendance/page.tsx` — same-intent clientKey reuse.
- `apps/web/src/app/desktop/medical/page.tsx`, `medical/medical-view.ts`, `medical/medical-view.test.ts` — stable claim key, reuse uploaded receipt IDs after uncertain result, avoid cleanup after ambiguous claim POST; explicit result confirmation warning.
- `apps/web/src/app/desktop/private-download.ts` + `.test.ts` — synchronous popup creation and grant-header handling.
- `apps/web/src/app/desktop/announcements/page.tsx`, `medical/page.tsx` — private download tab flow.
- `apps/web/src/app/desktop/requests/page.tsx`, `approvals/page.tsx` — Bangkok timezone timestamps.
- This report and `HANDOFF.md`, `PROJECT_PLAN.md` continuity.

## QA risks and remaining gates

1. **P0** No current authenticated TEST browser UAT of this exact changed source. To close WD-02..WD-11 & WD-13, first verify a suitable existing TEST-only synthetic identity/permission fixture and same-origin runtime can be used safely. If staging the Desktop candidate, verify explicit TEST-only scope, isolation and cleanup; never touch Production or Project A. No new credentials or security policy changes without Owner gate.
2. **P0** Real-browser permission matrix: employee, superuser, admin and superadmin; signed-out, 401/403, 409, 503; concurrent clicks and session expiry.
3. **P0** Medical R2 actual browser CORS, upload/finalize/download, denied private grants and interrupted/committed-then-response-lost cases. Never infer server Data Loss or E2E PASS from source tests.
4. **P1** Tablet responsive pages. Source CSS has breakpoints, but this test covered only Login at 1536×730.
5. **P1** Stateless desktop cookie session is cleared by logout; server token has a TTL rather than server-side revocation registry. No auth architecture change was included; evaluate token revocation expectations separately before Production sign-off.
6. **P1** There is no approved clean Git baseline commit (hundreds of preexisting untracked files); source change review uses exact guarded edits and readback. No commit/push performed.
7. Independent read-only delegate audits (4 parallel) yielded no result after a bounded review window and were cancelled; they are not counted as PASS. Automated test/read-only code audit is valid independently.

## Verification, changes and safety

- `npm run check`: exit 0; 414/414 tests, 70/70 files; lint/typecheck/API/Next build PASS.
- Project A mutations 0, Web LIFF changes 0, GAS/Gateway/LINE/Rich Menu 0, Production changes/deploy/source authority changes 0, credential changes 0.
- No TEST DB synthetic write/deploy, no unauthorized secrets read, no real employee data modified.
- Local dev web port 4189 and its Chrome tab were used for bounded visual inspection and then shut down.

## Next Recommended Action

Complete **WD-13 current-source TEST-only authenticated browser E2E** through an approved existing TEST deployment/identity path, or obtain a separate explicit TEST-only gate for new deployment/synthetic test credential if necessary. When tests and cleanup pass, rerun full regression and mark WD-02..WD-11 verified. **Do not mark Phase A complete now.**

Status: **PARTIAL** (code + automated QA PASS, remaining live authenticated browser UAT BLOCKED).

## WD-11/13 continuation — four-role UI fixture browser QA (2026-10-08, later same day)

- Existing Project B Phase A durable Goal resumed in place; no new goal, no additional watchdog.
- **Read-only TEST runtime metadata:** canonical `ckace-hr-api-test` references Secret Manager resource named `ckace-hr-neon-dev-database-url` as `DATABASE_URL`; no secret **values** were read. This label suggests a DEV/TEST data source but **does not prove isolation from any Production database**. Do not operate against the connected Neon `production` branch or create TEST actors until actual isolation is independently verified.
- Created `infra/rehearsal/wd13-browser-ui-fixture.mjs` plus `.node-check.mjs` strictly for **localhost/mock UI QA**. It serves immutable tagged TEST Web code while intercepting **every** `/api/*` call: synthetic `GET /api/security/session` capabilities for Employee/Superuser/Admin/Superadmin, mock Logout, and **403 for all remaining API calls including business writes and login**. It never communicates with TEST API, DB, R2, Secret Manager or Production for the mocked API paths; no real credentials or identities generated.
- `node --test infra/rehearsal/wd13-browser-ui-fixture.node-check.mjs infra/rehearsal/wd13-same-origin-proxy.node-check.mjs`: **6/6 PASS**. Tests validate separated profile capabilities, impossible role rejection, total mock API business-write isolation, URL upstream gate and rejection of Production/unknown targets.
- **Real Chrome UI fixture at 1536 px:** Employee navigation 9 items; Superuser adds Approvals (10); Admin adds Approvals, Notification Operations, Onboarding and Admin Hub (13); Superadmin also shows all 13 menu items. Admin-vs-Superadmin capability distinctions inside Admin are not demonstrated by menu count alone and their backend role permissions remain **UNVERIFIED**.
- **Real Chrome at ~415 px:** Homepage no horizontal overflow; hamburger is correctly labelled and opens the Sidebar; click Leave navigates, mock **403** produces an explicit no-permission error and Retry button; no horizontal overflow. These are mock/browser presentation proofs only, not genuine authenticated E2E.
- **Expanded Chrome 403 page-failure sweep** at desktop width with entirely mocked API: `/desktop/profile`, `/desktop/leave`, `/desktop/requests`, `/desktop/approvals`, `/desktop/attendance`, `/desktop/overtime`, `/desktop/medical`, `/desktop/benefits`, `/desktop/announcements`, `/desktop/notifications`, `/desktop/onboarding`, and `/desktop/admin` (**12/12 routes**) displayed module-specific failure content + visible `ลองใหม่` Retry, with **no horizontal overflow**. Their mock 403 response verifies only front-end error rendering: it does **not** prove a real 403/role result from TEST API. The root `/desktop` was tested separately (13 Desktop routes total).
- Fresh `npm run check` task `24b675c7-a93c-4cc8-bacd-2a0d8f44d33c` completed **exit 0**: Lint PASS, Typecheck PASS, **70/70 test files and 414/414 tests PASS**, API NestJS build and Next.js 16.3.8 production build PASS (18 static routes). The additional fixture scripts live only in `infra/rehearsal`; no Desktop app/API source changes in this continuation.
- **WD-11 PARTIAL**, **WD-13 BLOCKED** until test-only data boundary, four disposable TEST authenticators, private R2 upload/download and error/fault-injection E2E are verified. Never call mocked capability profiles genuine Server RBAC or Production readiness.

## WD-11/13 continuation — isolated TEST same-origin QA (2026-10-08 16:20 Asia/Bangkok)

- Reused **same existing Phase A durable goal**. Actual TEST Cloud Run read-only verification: tagged Web `ckace-hr-web-test-wd11-20261008` receives 0% traffic; original TEST Web `ckace-hr-web-test-m9d15a` receives 100%. TEST API `ckace-hr-api-test-m9d15d` receives 100%. No traffic/routing mutation.
- Implemented `infra/rehearsal/wd13-same-origin-proxy.mjs` and `.node-check.mjs` in Project B only: a **loopback-bound, ephemeral** two-upstream proxy that routes `/api/*` to existing TEST API and all other paths to WD-11 tagged TEST Web. It **rejects Production/unknown/insecure upstream URLs** and never touches Firebase config. `node --test infra/rehearsal/wd13-same-origin-proxy.node-check.mjs` **2/2 PASS**.
- Real managed Chrome verified `http://127.0.0.1:4198/login` renders WD-11 candidate while `/api/security/session` returns **401** for signed-out visitors. Invalid non-existent TEST login returns **401** with Thai form error; signed-out `/desktop` redirects to `/login`. Protected routes `leave/me`, `requests/assigned`, `attendance/me`, `overtime/me`, `medical/me`, `benefits/me`, `admin/settings`, and `onboarding/pending` all return **401** without Session.
- Actual Chrome Login viewport checks: **1536 px, 824 px and 399 px**, required username/password fields and no horizontal overflow. These verify Login only; **authenticated module responsiveness remains unverified**.
- Local runtime reports `DATABASE_URL`, `DIRECT_URL`, Desktop UAT target, and session secret **absent** (existence check only; no values accessed). No disposable four-role signed-in TEST fixture available. The connected Neon project inspected exposes a branch named Production, **not an approved TEST branch**; no SQL mutation/access to user records attempted. Do not use Production database to bypass TEST fixture gate.
- Existing Cloud Run TEST Jobs inspected by name/status are historic M8 module smoke jobs; no proven current WD-13 browser fixture. The proxy can support same-origin authenticated QA once an isolated **TEST-only** synthetic identity is provisioned through an approved safe TEST mechanism. Never log/expose credentials, alter shared Firebase routing or perform Production writes.
- **WD-11 remains PARTIAL; WD-13 remains BLOCKED**: no current-source signed-in four-role UI, private Medical R2 or ambiguous-commit fault-injection results. Production authority remains LEGACY; no cutover.

## WD-11 TEST-only execution update — 2026-10-08

Owner explicitly approved Project B-only TEST Desktop staging and disposable synthetic identities, with strict prohibition on Project A `D:\APP_Leave`, Web LIFF, GAS, LINE Gateway, Rich Menu, Production, and shared routing changes.

- Actual TEST service verification with explicit `--project=ckrr-leave-system-2026`: canonical Web `ckace-hr-web-test-m9d15a` 100%; canonical API `ckace-hr-api-test-m9d15d` 100%. The machine-wide gcloud default project was `audit-pdftools`, left untouched.
- Cloud Build `0de3c2be-db52-4661-b164-7c14be916208` **SUCCESS**, built current Project B Web source using `infra/cloudrun/cloudbuild-wd11-web.yaml`, image digest `sha256:9857902db795c59868d35ec639a7349ae4448e13a97fa3ec82fba951f8b8d446`.
- Cloud Run revision `ckace-hr-web-test-wd11-20261008` deployed tagged `wd11-candidate` at **0% canonical traffic**. Readback confirmed prior TEST Web revision retains 100%; no Firebase routing, Project A, API, or Production changes.
- Managed Chrome tagged candidate `/login`: 1536x730 rendering, Username/Password required, no horizontal overflow, **PASS** for this viewport. The same-origin Firebase TEST baseline `/login` rendered earlier at 1536x730. Tablet/mobile viewport emulation was **NOT** achieved; test attempts did not change the viewport.
- Tagged direct Cloud Run candidate `/desktop` rendered fail-closed `Session unavailable`: expected because the Web-only tagged URL has no `/api` same-origin backend. This is **NOT** authenticated E2E PASS.
- **Still blocked:** safely isolated same-origin candidate/API route and fresh four-role TEST fixture/browser workflows, Medical private R2 lifecycle, fault injection, Tablet/Responsive acceptance. No synthetic identity created yet. WD-11 **PARTIAL**, WD-13 **BLOCKED**. Do not mark Phase A complete.

