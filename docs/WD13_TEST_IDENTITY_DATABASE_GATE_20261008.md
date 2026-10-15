# WD-13 — TEST Identity and Database Isolation Gate
Date: 2026-10-08 Asia/Bangkok
Project: `D:\CKACE_HR` (Project B only)
Status: **PARTIAL / AUTHENTICATED UAT BLOCKED**. This is a read-only gate audit, not a synthetic account test.

## Verified facts (read-only, live)

1. GCP service `ckace-hr-api-test` in `ckrr-leave-system-2026`, region `asia-southeast1`:
   - 100% current TEST API revision `ckace-hr-api-test-m9d15d`.
   - `DATABASE_URL` references Secret Manager secret **`ckace-hr-neon-dev-database-url`**, version `latest`. **Reference alone does not prove secret value/target.**
   - Direct `/api/health` returned **HTTP 200**, `stage=test`, `runtime=NON_PRODUCTION`, `moduleRouting=LEGACY`.
   - Direct `/api/ready` returned **HTTP 200**, `database=connected`, `stage=test`, current TEST revision confirmed.
2. Neon DEV project: `CKACE HR DEV`, project ID `flat-tree-71711157`, main branch `br-proud-term-b3pihnrx`, database `ckace_hr_dev`; endpoint exists in separate Neon project. Production project: `CKACE HR PROD`, project ID `falling-paper-66157438`. **Distinct Neon projects and endpoint identities were independently inspected.**
3. **Read-only SQL on explicit DEV project/branch/database** returned:
   - `user_accounts=0`, `roles=0`, `employees=0`, `permissions=0`;
   - successful Prisma migrations `=5`.
   - This means a disposable four-role UAT requires explicit role, permission and synthetic identity provisioning; no pre-existing test identities were found in this DEV database.
4. The historic Project B `apps/api/src/hosted-m9d15-desktop-uat.ts` creates a disposable UAT identity and contains a `finally` cleanup and post-cleanup employee existence check. That script was **not** executed in this gate; it targets one broad-capability synthetic actor, **not a verified four-role Browser UAT**.
5. Attempt to securely classify the Secret Manager connection endpoint without exposing values was blocked by the host safety system. **Do not bypass this restriction or label the secret endpoint as independently verified.** No Secret payload was read, no credentials shown, no test/Production database changes made.

## Owner-approved TEST-only gate — latest execution result (2026-10-08)

Owner explicitly approved TEST-only attestation and temporary identity provisioning/cleanup after a verified DEV boundary. The tool safety layer rejected a scoped DEV-only challenge-response fixture creation before DB write; no bypass permitted or attempted. Follow-up read-only SQL on explicit DEV project/branch/database confirmed 0 accounts, 0 employees, 0 roles and 0 permissions. The secret resource has no metadata attesting its true Neon target, and no secret payload was accessed. Prepared fail-closed pure `apps/api/src/security/wd13-test-boundary.ts` plus its regression test, not yet run against a live Secret. `npm run check` completed **72 files / 435 tests PASS, lint/typecheck/API/Next build PASS**, exit 0, task `a7463767-9d34-4091-86b1-73f8d08145d7`. See `docs/WD13_TEST_ONLY_EXECUTION_GATE_20261008.md` for administrator-only execution and cleanup gates. WD-13 remains BLOCKED by tool-level access; Owner approval has already been obtained, do not request the same approval again unless the requested scope changes.

## Current-turn preparation — 4-role TEST-only acceptance tests

- Reviewed existing one-actor `apps/api/src/hosted-m9d15-desktop-uat.ts` and canonical `desktopNavigationForPermissions`. Existing script creates a single broad-permission disposable TEST actor and cleans identifiers in a `finally` block; it must **not** be executed against any database until TEST DB target and scoped cleanup authorization are verified.
- Created **`apps/api/src/security/wd13-disposable-role-matrix.test.ts`**, a strictly pure, **no-network/no-database** set of proposed temporary TEST role permission projections. Five new tests verify Employee, Superuser, Admin, Superadmin navigation boundaries and disallow unspecified role names. These are NOT certified production role definitions, real user provisioning, or server-authenticated Browser E2E.
- Fresh `npm run check` task `879ecac0-0d30-4d27-9905-adf447a0dbce`: **exit 0**, lint/typecheck PASS, **71/71 test files and 419/419 tests PASS**, API build and Next.js production build PASS.
- There was no Secret Manager payload inspection, no bypass after the prior host safety block, no database or R2 mutation, and no deployment or traffic change.
- To proceed beyond this read-only/pure-test stage, obtain explicit Owner scope approval for an isolated TEST identity/credential gate and an administrator-approved non-disclosing Secret-to-Neon endpoint attestation (or a new strictly TEST-only database target). Do not take 'next step' as authorization for credential/security changes.

## Remaining WD-13 preconditions

- **G1 — DB boundary:** Obtain a permitted authoritative mapping of the secret's actual target to the identified Neon DEV project, or provision a new explicitly isolated TEST-only database/credentials **after a separate Owner gate**. No PROD database reads/writes or credential reuse.
- **G2 — Fixture provisioning:** Prepare four distinct temporary users (Employee, Superuser, Admin, Superadmin) in verified TEST-only DB with minimum required permissions and zero real employee data. Document each role's expected capabilities, test data IDs, and cleanup plan. Because new role rows and later deletions change DB, require explicit approved scope and keep test-only evidence.
- **G3 — Authenticated browser:** Reuse 0%-traffic tagged Desktop candidate and loopback-only same-origin proxy (no Firebase traffic change), then assert genuine signed-in session cookie, server-side 401/403/permission controls, logout, and 12 Desktop modules with responsive viewports.
- **G4 — R2 and write failures:** Use only private TEST R2 objects, validate Medical finalize/download and denied grants; fault-inject ambiguous submit/response-lost/409/503, confirm idempotency and no unintended orphan deletion. No real employee records.
- **G5 — Cleanup:** Delete only tracked disposable TEST rows and TEST R2 objects once independently authorized, verify zero residual accounts/roles/attachments, then rerun `npm run check`, reconcile actual TEST traffic and finish Phase A only when all evidence is PASS.

## Current result

- WD-01 and WD-12 remain PASS.
- WD-11 PARTIAL: real Chrome 4-role **mock capability** UI and 12/12 mocked 403/error page tests PASS, but genuine signed-in TEST Browser E2E not proven.
- WD-13 **BLOCKED**: actual secret target not verified, no disposable authorized TEST four-role actors.
- Production Cutover **NO-GO**, authority remains `LEGACY`.
- Project A `D:\APP_Leave`, Web LIFF, GAS, LINE Gateway, Firebase shared routing/traffic, Neon Production and Production credentials **untouched**.

## Exact next authorized action

Perform a permissioned **non-disclosing Secret-to-Neon endpoint attestation** through an approved Secret Manager/Neon administrator capability; if unavailable, request Owner permission to create a newly isolated TEST database/credential and four disposable test actors, with scoped cleanup. Do not use a shell workaround to override safety checks.
