# WD-13 — Owner-approved TEST-only execution / boundary gate
Date: 2026-10-08 (Asia/Bangkok)
Active repository: `D:\CKACE_HR` (Project B)
Status: **PASS — Phase A complete; TASK-39 Web-only TEST traffic switch executed and post-smoke PASS. TASK-40+ remain separately gated.**

## Owner scope and exclusions
User approved TEST-only execution. This is NOT Production approval. Never modify `D:\APP_Leave` (Project A), Web LIFF, GAS, LINE Gateway, Rich Menu, Firebase shared routing/traffic, Neon PROD, production credentials or real employee data. The exact TASK-39 Web-only traffic switch was later explicitly approved and executed: TASK-35 Web candidate now serves 100% shared TEST traffic, API baseline remains unchanged, and Firebase rewrites were not modified.

## Verified, live, and non-sensitive evidence
- Neon DEV project `flat-tree-71711157` with PostgreSQL database `ckace_hr_dev` and main branch `br-proud-term-b3pihnrx`; distinct from Neon PROD project `falling-paper-66157438`.
- TEST API currently references GCP Secret Manager `ckace-hr-neon-dev-database-url:latest`. The Secret resource has user-managed replication in `asia-southeast1` but no metadata label/annotation that independently attests its connection-string endpoint. No secret payload was accessed.
- TEST API `/api/health` and `/api/ready` were previously HTTP 200 with stage `test`, runtime `NON_PRODUCTION`, database connected. This does not attest the specific Neon Project.
- Historical pre-TASK29 snapshot after the earlier blocked attempt: 0 accounts, 0 employees, 0 roles, 0 permissions. This was subsequently superseded by Owner-approved TASK-29 provisioning documented below.
- Historical direct challenge-response provisioning attempt was blocked by tool safety and was not bypassed. TASK-28 through TASK-30 later used the permitted non-disclosing runtime-attestation and exact synthetic-fixture path documented below.
- Latest full repo QA task `a7463767-9d34-4091-86b1-73f8d08145d7` completed exit 0: **72 test files / 435 tests PASS**, lint/typecheck/API and Next.js build PASS. The earlier baseline was 71 files / 419 tests; this phase added the fail-closed boundary guard tests.

## TASK-39 — TEST Traffic Decision + Web Traffic Switch — PASS (2026-10-14)

Owner-approved TASK-39 review concluded **GO for Web-only shared TEST promotion** and **KEEP current API baseline**. Recommended Web target: `ckace-hr-web-test-task35-20261014a` (`task35-responsive`) to 100%; API `ckace-hr-api-test-m9d15d` remains 100%. No Firebase rewrite change is required because TEST Hosting already routes `/api/**` to the API service and all other paths to the Web service.

API task30/task32/task34 revisions are explicitly excluded from promotion because their exact revision names activate TEST-only UAT/R2 harnesses. The selected Web candidate contains no `/api/test/` dependency. Web candidate + canonical API baseline compatibility smoke passed: Login 200, health 200, ready 200, signed-out session 401; proxy target-safety tests 8/8 PASS. Full evidence: `docs/TASK39_TEST_TRAFFIC_DECISION_20261014.md`.

Owner subsequently approved the exact Web-only mutation. Web `ckace-hr-web-test-task35-20261014a` now serves **100%** shared TEST traffic; API `ckace-hr-api-test-m9d15d` remains **100%**; Firebase rewrites are unchanged. Canonical TEST smoke and browser login redirect checks passed. **TASK-39 CLOSED PASS.**

## TASK-38 — Phase A Final Review — PASS (2026-10-14)

TASK-28 through TASK-37 were reviewed as the complete Phase A evidence set and accepted. Fresh current-state checks confirm Neon DEV synthetic/business counts remain zero, API health/ready are 200, and API/Web baseline traffic remains 100%. Residual TEST harness/CORS/onboarding/Production items are carried forward as later-gate conditions rather than Phase A blockers. Full evidence: `docs/TASK38_PHASE_A_FINAL_REVIEW_20261014.md`.

**PHASE A = PASS. TASK-39 was later explicitly approved, executed, and closed PASS. TASK-40 is the next separate gate.**

## TASK-37 — Final Regression — PASS (2026-10-14)

Owner explicitly approved TASK-37. Fresh final repository regression after exact TASK-36 cleanup passed: Prisma schema valid, lint/typecheck PASS, **78/78 test files / 505/505 tests PASS**, package/API/Next builds PASS. Independent Neon DEV spot checks confirm cleanup state remains zero, and API/Web TEST baselines remain 100% with no traffic mutation. Full evidence: `docs/TASK37_FINAL_REGRESSION_20261014.md`.

**TASK-37 CLOSED PASS. TASK-38 was later explicitly approved and completed PASS; see the current TASK-38 section above.**

## TASK-36 — Exact TEST Data / R2 Cleanup — PASS (2026-10-14)

Owner-approved TASK-36 completed exact TEST cleanup. Fresh Neon DEV/link preflight matched the tracked TASK-29/TASK-31/TASK-32 fixture. R2 execution `ckace-hr-task36-r2-cleanup-274f7` validated the finalized 92-byte PDF MIME/checksum, confirmed the two stale keys absent, deleted only the finalized exact key, and post-verified all three exact keys NOT_FOUND. DB execution `ckace-hr-task36-db-cleanup-679kb` re-attested exact fixture IDs/counts/relations and completed one dependency-safe transaction.

Independent Neon DEV verification confirms identity/RBAC, configuration, business rows, attachments/links, outbox/deliveries, audit and idempotency counts are all zero. Cloud Build `9d021006-bfe8-4ba0-89fc-70a5e20b70a9` SUCCESS on digest `sha256:63667016c6674674516b82eed8516c74615271b858c8f167e9442a97b05a2f66`; focused typecheck/lint passed. API baseline `m9d15d` and Web baseline `m9d15a` remain 100%. Full evidence: `docs/TASK36_EXACT_TEST_CLEANUP_20261014.md`.

**TASK-36 CLOSED PASS. TASK-37 was later explicitly approved and completed PASS; see the current TASK-37 section above.**

## TASK-35 — Responsive + State QA — PASS (2026-10-14)

Owner explicitly approved TASK-35. Project B Desktop responsive/state hardening and authenticated rendered QA are complete. Exact TEST Web candidate `ckace-hr-web-test-task35-20261014a` is healthy at **0%** on digest `sha256:f0afb619466061bc226571bad42b0badef1a44362b8e1ed2e293d6793ccd8f71`; baseline `m9d15a` remains **100%**.

Authenticated loopback Browser QA covered 13 Desktop routes × widths 399/824/1536 = **39 combinations**, all with zero page-level horizontal overflow and correct navigation breakpoint behavior. Loading, Empty, Error and Disabled states were verified; Loading/Error were exercised through browser-local request interception only, so no server business mutation occurred. Mobile sidebar open/backdrop/close and scroll containment passed. Final Development Lead gate: **78 files / 505 tests PASS**, lint/typecheck/API/Next build. Full evidence: `docs/TASK35_RESPONSIVE_STATE_QA_20261014.md`.

**TASK-35 CLOSED PASS. TASK-36 was later explicitly approved and completed PASS; see the current TASK-36 section above.**

## TASK-34 — R2 Orphan Reconciliation — PASS (2026-10-14)

Owner explicitly approved TASK-34. Exact retained TASK-32 attachment intents were reconciled read-only against both Neon DEV and real R2. Both exact IDs are still unfinalized/unlinked DB rows, but neither exact R2 object exists; both classify as `DB_ONLY_PENDING_OBJECT_MISSING`. No cleanup was performed. Their disposition is DB-row-only cleanup in TASK-36 after a fresh link/object re-check.

Dedicated revision `ckace-hr-api-test-task34r2-20261014a` uses immutable digest `sha256:1f44c67bd686bb6bf3c02a8d828a50fdad61271823bdfe8c97e6c3ef08d82e0e`, is Ready/Active/Healthy at **0%**, and baseline `m9d15d` remains **100%**. Source/runtime guards pin the exact TASK-34 revision, TEST R2 bucket, Neon DEV runtime, IDs/keys and DB row invariants. Manager final gate: **78 files / 505 tests PASS**, lint/typecheck/API/Next build. Full evidence: `docs/TASK34_R2_ORPHAN_RECONCILIATION_20261014.md`.

**TASK-34 CLOSED PASS. TASK-35 was later explicitly approved and completed PASS; see the current TASK-35 section above.**

## TASK-33 — Failure & Ambiguous-Write QA — PASS (2026-10-14)

Owner explicitly approved TASK-33. Source/test QA now enforces definite-vs-ambiguous write handling across Leave, Attendance/Time Correction, Overtime and Medical: 401/403/409 discard the prior create intent; 5xx/network uncertainty retains the same client key for explicit retry; no automatic write retry is introduced. Attendance 401 session-expiry feedback and Leave 409 conflict feedback were made explicit, while Medical uncertain R2 finalize continues to preserve the same attachment/object without duplicate upload or unsafe delete.

Manager verification: focused **8 files / 41 tests PASS**; full `npm run check` **77 files / 479 tests PASS** with lint/typecheck/API/Next build. Current TEST signed-out API returns 401; read-only exact TASK-32 Cloud Run logs show real 403/409/503 contracts. Neon DEV confirms no TASK-33 Medical/attachment/idempotency rows were created; TEST traffic remained unchanged. No TASK-33 deployment was required or performed. Full evidence: `docs/TASK33_FAILURE_AMBIGUOUS_WRITE_QA_20261014.md`.

**TASK-33 CLOSED PASS. TASK-34 was later explicitly approved and completed PASS; see the current TASK-34 section above.**

## TASK-32 — Medical + Private R2 E2E — PASS (2026-10-08)

Owner explicitly approved TASK-32. The isolated TEST API revision `ckace-hr-api-test-task32r2-20261008d` remained **0% traffic** while API/Web baselines remained **100%**. Live TEST evidence proves upload intent -> private R2 object -> ambiguous finalize 503 -> same-ID successful finalize retry -> Medical create/replay/conflict -> assigned approval -> authorization -> real private download/checksum -> approval.

Neon DEV contains one TASK-32 Medical claim, one linked finalized attachment, one approval instance/step, one Medical-create idempotency result, created/approved outbox events and create/approve audit rows; the claim and approval are `APPROVED`. Two earlier unfinalized TASK-32 attachment intents remain explicitly tracked for later orphan reconciliation/cleanup and were not deleted.

R2 functional CORS preflight is verified directly: HTTP 204, exact TASK-32 TEST origin, `PUT, GET, HEAD`, and `content-type`. Current least-privilege object credentials cannot perform bucket-level Get/Put CORS management (403 AccessDenied); no credential escalation was attempted. Fresh final `npm run check` exit 0: **77 files / 474 tests**, lint/typecheck/API/Next builds PASS. Full evidence and exact cleanup ledger: `docs/TASK32_MEDICAL_PRIVATE_R2_E2E_20261008.md`.

**TASK-32 CLOSED PASS. TASK-33 was later explicitly approved and completed PASS; see the current TASK-33 section above.**

## TASK-31 — Hosted core Desktop functional UAT — PASS (2026-10-08)

Owner explicitly approved TASK-31. Real TEST workflows were exercised only against attested Neon DEV using the tracked synthetic identities/configuration. Leave, Attendance/Time Correction, OT, Request Status, Benefits, Announcements, Notification retry and Desktop Onboarding admin approval passed. No Medical claim or R2 attachment was created. Browser UI showed the final synthetic state on all core tested pages without horizontal overflow.

Final source gate `89ec13c0-5fee-4e0f-a489-f982105453a7`: **76 files / 468 tests PASS**, lint/typecheck/API/Next build PASS. TEST traffic remained unchanged: API/Web baseline 100%, `task30-uat`/`wd13-retry` 0%. Exact UAT IDs and later cleanup ordering are recorded in `docs/TASK31_FUNCTIONAL_UAT_20261008.md`; no delete/cleanup was performed. Public onboarding registration success was not executed because the credential-bearing tool call was safety-blocked; the Desktop pending/options/approve workflow passed and the restriction was not bypassed.

**TASK-31 CLOSED PASS. TASK-32 subsequently completed PASS; see the current TASK-32 section above.**

## TASK-30 — Hosted authenticated four-role UAT — PASS (2026-10-08)

Owner explicitly approved TASK-30. A dedicated TEST-only bootstrap is restricted to the exact `task30uat` API revision, TEST service/stage, attested DEV database and four tracked TASK-29 accounts. It generates credentials only inside runtime, updates exact synthetic account hashes, then authenticates through the production-path `DesktopAuthService.login()` and normal session cookie. No plaintext credential, hash, token or cookie was captured in documentation.

Repository gate: **76/76 test files, 468/468 tests, lint/typecheck/API/Next builds PASS**. Cloud Build `6b5381e9-3bf4-4306-94c8-b720d887bc60` SUCCESS -> digest `sha256:f86149d297c64734a7ced9a8eb61e66b03247b8d37d596caf4750b85f6811fc1`; Cloud Run `ckace-hr-api-test-task30uat-20261008a` tag `task30-uat` healthy **0%**, API baseline **100%**. Loopback candidate routing safety **6/6 PASS**.

Browser/API UAT PASS for Employee/Superuser/Admin/Superadmin: sessions 200 with server-derived permission counts 14/19/23/24 and expected navigation; permission endpoints return the expected 403/200 matrix, including Admin settings restricted to Superadmin. Logout 200 -> Session 401 -> Desktop redirects Login. Unknown fixture role -> 400 and stays signed out. DB post-state remains only four TASK-29 synthetic identities/RBAC and zero Leave/Attendance/OT/Medical rows. See `docs/TASK30_AUTHENTICATED_UAT_20261008.md`. **TASK-30 CLOSED PASS; TASK-31 requires separate Owner approval.**

## TASK-29 — Disposable four-role identity provision — PASS (2026-10-08)

Owner explicitly approved TASK-29. The only mutated database was the TASK-28-attested Neon DEV target `flat-tree-71711157 / br-proud-term-b3pihnrx / ckace_hr_dev`. Pre-write read-only baseline had zero Employee/UserAccount/Role/Permission/UserRole/RolePermission rows. Created exactly four synthetic ACTIVE Project B Desktop users and UAT-only RBAC rows; no Production or real employee records.

Post-write read-only verification: `employees=4`, `user_accounts=4`, `roles=4`, `permissions=24`, `user_roles=4`, `role_permissions=80`, `line_accounts=0`. Role permission counts are EMPLOYEE=14, SUPERUSER=19, ADMIN=23, SUPERADMIN=24. All four have Project password hashes; legacy hashes=0; agency/department links=0; all carry TASK29 synthetic marker. Exact IDs are in `docs/TASK29_TEST_IDENTITIES_20261008.md`.

Passwords were randomly generated only to produce scrypt hashes and plaintext was not persisted or documented. For TASK-30, rotate only these four TEST account hashes to new ephemeral credentials just before UAT. Do not disclose credentials or perform cleanup yet. **TASK-29 PASS. TASK-30 requires separate Owner approval.**

## TASK-28 — Non-disclosing TEST runtime database attestation — PASS (2026-10-08)

Owner explicitly approved TASK-28. A safe runtime method was implemented instead of reading the protected Secret payload. The TEST API parses its already-mounted `DATABASE_URL` only in memory, fail-closed validates the known CKACE HR DEV endpoint/database, requires `K_SERVICE=ckace-hr-api-test`, and executes constant read-only SQL `SELECT current_database()` on the active connection. The response contains only safe labels/status. Non-TEST returns 404 and internal failures return generic `attestation=FAILED`.

Independent Neon control-plane read-only verification shows project `flat-tree-71711157` named **CKACE HR DEV**, main/default branch `br-proud-term-b3pihnrx`, database `ckace_hr_dev`, and compute endpoint direct/pooled hosts equal the guard's exact allowlist. `npm run check` task `23c142c6-7c98-45aa-946e-779089e00fab`: **75/75 test files, 463/463 tests, lint/typecheck/API/Next builds PASS**. Cloud Build `87a894de-9afe-4b2c-b9d2-33d076fc1123` SUCCESS -> immutable image `sha256:4063b591e47632aed294c8a433a4fad4f5a88266969ae6d5479ff2112566a767`. Cloud Run TEST revision `ckace-hr-api-test-task28att-20261008a` tag `task28-attest` deployed at **0% traffic**; Ready/Active/ContainerHealthy/ContainerReady True, baseline API `m9d15d` still **100%**.

Direct tagged call returned HTTP 200 with only: `ok=true`, `attestation=VERIFIED`, `verifiedProject=CKACE_HR_DEV`, `databaseName=ckace_hr_dev`, `runtimeStage=test`, `apiScope=CKACE_HR_TEST_API`, `databaseConnection=verified`, `serviceName=ckace-hr-api-test`, and TEST revision ID. **No password, connection string, host or credential was output. TASK-28 is CLOSED PASS.** Next step TASK-29 requires separate Owner approval to create tracked temporary TEST identities.

## Latest WD-13 retry-tag TEST candidate (2026-10-08)

- Owner asked for autonomous execution; user will personally log in only when a genuine identity prompt requires it. No Login handoff currently required. Preserved TEST-only and Project B Desktop-only scope and prior host access restrictions.
- New Medical retry logic tracks uncertain Finalize ID and per-intent receipt progress within the same page. Explicit same-intent retries use original private object and do not re-upload completed or uncertain files. Multi-file and failure recovery tests PASS. New source `npm run check` exit 0, **74 test files/455 tests**, lint/typecheck/API/Next builds PASS, task `2782f78c-5c0c-42bf-9c8b-322971117d66`.
- Cloud Build `2485751b-19f3-4e4c-bcd0-d23fa7632c67` SUCCESS -> immutable image `sha256:0601aca41d392c8306383c6f96b21427bc8a08b5a427ae904797be02c31a5c83`. Revision `ckace-hr-web-test-wd13retry-20261008a` tagged `wd13-retry` healthy **0%**; 100% TEST baseline unchanged. Direct Login HTTP 200, browser required fields + button and no overflow at 1536px; 4/4 proxy tag allowlist tests PASS. No Production change.
- WD-13 signed-in UAT and R2 still BLOCKED by non-disclosing Secret-target attestation and permitted isolated temporary actor provisioning; prior tool safety denial must not be bypassed. Future live E2E must validate recovery across reload/new intent via safe private-object reconciliation rather than blanket deletion.

## Current continuation — WD13 Medical TEST 0%-traffic deploy and signed-out smoke (2026-10-08)

- Existing Owner TEST-only deployment approval used **only** for Cloud Build `cee07834-60c0-445e-9816-d93fd26aad15` SUCCESS, immutable `sha256:6a6f066861b32ab25e4aa2912ca28fe057f6d9f185014ceb86a22ec85aa48b9b`, new Web TEST `ckace-hr-web-test-wd13med-20261008a` tagged `wd13-medical` **0% traffic**. Baseline Web TEST remains 100%, WD11 tag remains 0%; no Firebase rewrites or PROD cutover.
- Candidate tagged `/login` HTTP 200, managed Chrome widths 1536/830/415 no overflow with required login fields; local WD13 tagged Web + existing TEST API same-origin signed-out /desktop -> /login; session/Medical/Admin 401. Local proxy strict allowlist and mock Node tests 7/7 PASS. All owned QA tabs closed, proxy stopped.
- This does **not** prove four genuine user sessions or R2 upload/finalize/download; host protection denied Secret-target attestation and disposable TEST account creation previously and must not be bypassed. Residual private unlinked-object reconciliation open. WD13 remains BLOCKED / Phase A PARTIAL.

## Current continuation — private Medical receipt finalize safeguard (2026-10-08)

- Owner TEST-only approval preserved. **No new Secret or test actor attempts** after host tool safety denial.
- Source-only Desktop Medical refactor to `apps/web/src/app/desktop/medical/medical-receipt-upload.ts` and added `.test.ts`: an ambiguous/failed Finalize must **not automatically DELETE the R2 object**, since the Server may have persisted finalization. After failed upload (before finalize), best-effort cleanup is retained. On the same test run Thai session errors and normal upload/finalize passed.
- Fresh `npm run check` task `e6720159-49f7-49a4-8376-da8f94a61286`: **exit 0, 74 files, 452 tests PASS, lint/typecheck/NestJS/Next Build**.
- Until authorized reconciliation is designed, a private unlinked receipt could remain after uncertain finalize; avoid blanket cleanup of R2 files. Live authenticated Browser, 4 TEST roles and real R2 still BLOCKED; no TEST or Production deploy/traffic modifications.

## Current continuation — Backend auth and guard integration (2026-10-08)

- Owner authorization already obtained; no duplicate approval request needed. The host restriction on Secret payload / disposable TEST DB write is unresolved; **do not bypass it**.
- Added source-only `apps/api/src/security/wd13-desktop-auth-rbac-matrix.test.ts`: 9 assertions around 4 role-specific logins, forged privileges, cross-user SELF access, permissions changing after login, inactive identity and wrong password, with actual `DesktopAuthService`/`AuthorizationGuard` but **no DB/network requests**.
- Full `npm run check`: **exit 0**, `73/73` files / `444/444` tests, lint, typecheck, API and Next.js build; task `3e1d6427-94e7-4cb5-b942-c6e79edacf97`.
- Authenticated WD-13 TEST Browser, R2 and cleanup still **not run**. No temporary database rows, no Credentials read and no Production operations.

## Additional safety guard prepared
`apps/api/src/security/wd13-test-boundary.ts`, with `wd13-test-boundary.test.ts`, provides a pure, fail-closed permissioned runtime precondition that checks without disclosing credentials:
- `runtimeStage === "test"`
- URL protocol PostgreSQL and exact Neon DEV host `ep-twilight-bread-b32n36nz.c-4.ap-southeast-1.aws.neon.tech` or exact DEV pooler variant, database `ckace_hr_dev`;
- exact TEST API origin `https://ckace-hr-api-test-cjcyhgow2q-as.a.run.app/`;
- rejects known Production host, unknown hosts, changed DB name, invalid scheme or stage, and unexpected API target.

**The guard does not connect to databases and has NOT been executed with real Secret Manager payload.** It is not evidence that the TEST API currently points to Neon DEV; permissioned attestation is still required.

## When an approved administrator/execution path is available

1. Independently verify through an approved, non-disclosing TEST runtime administration procedure that the latest Secret target is exactly the Neon DEV endpoint/project above. Do not reveal the URL, login or password to ChatGPT. If this cannot be done, use a separately approved isolated TEST data service; never fall back to Production.
2. Run the WD-13 guard in that permissioned runtime before **any** fixture write. Record only PASS/BLOCKED and a non-sensitive project/DB identity attestation. Do not bypass any policy that blocks protected Secret data.
3. With verified isolated TEST target, create four traceable, temporary synthetic actors (Employee, Superuser, Admin, Superadmin) with role-specific minimal permissions and cryptographically random credentials. IDs must be tracked privately; **no credentials in Git, Markdown or chat**.
4. Test current tagged TEST Web through the loopback-only same-origin TEST API proxy: actual desktop Login, HttpOnly cookie, 4-role navigation and server 401/403, profile, leave, requests/approvals, attendance/time corrections, overtime, benefits, announcements/notifications, onboarding/admin, plus 399/824/1536-pixel responsive checks. The earlier mock role Browser run is NOT equivalent to this.
5. Validate private TEST R2 Medical file upload/finalize/download authorization, CORS/grant expiry and interrupted-write/409/503 cases against synthetic-only data. Do not automatically retry writes after ambiguous results. Avoid creating real HR transactions.
6. Cleanup **only recorded synthetic IDs** and private TEST objects; verify counts back to pre-test baseline and no orphaned attachments/roles/permissions, without deleting other users or customer data. Do not run blanket truncate/reset/drop statements.
7. Re-run `npm run check`, inspect exact terminal result, record whether phase acceptance is PASS or PARTIAL; preserve Production `LEGACY` authority and NO-GO until separate cutover gate.

## Execution status
- Owner TEST-only consent: **CONFIRMED**
- Distinct Neon DEV/PROD project metadata: **VERIFIED**
- Actual API Secret-to-Neon DEV target: **NOT ATTESTED**
- TEST synthetic actor provisioning: **NOT RUN (HOST SAFETY BLOCK)**
- 4-role real authenticated Desktop/R2 Browser UAT: **NOT RUN**
- Phase A: **PARTIAL**; WD-13: **BLOCKED**; rollback/cleanup not applicable (zero created).
