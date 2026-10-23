# CKACE HR — ACTIVE TASK

Updated: 2026-10-23 Asia/Bangkok

## WEB-LEAVE-05 — TEST rollout + authenticated role matrix rerun

Status: **PARTIAL — TESTm70 rollout passed; employee/manager hosted sessions remain unverified**
Priority: **P1 — current TEST verification**

Objective / why now:
Promote the pushed role-gate and responsive-NAV fix to TEST, then verify the real employee/manager/superadmin visibility and direct-URL boundaries on the resulting release.

Scope:
- Use only the existing regional Trigger `ckace-hr-test-manual-release` (`4f54907f-eed2-4813-b51e-25af6a3dbf01`).
- Candidate source is the pushed commit `2355d5246d1819899161c0b3c90ee86e3ffd37d2` from `codex/web-leave-05-role-gate`; TEST traffic is now m70 after the Owner explicitly said `Build`.
- Touch only `ckace-hr-api-test`, `ckace-hr-web-test`, `ckace-hr-migrate-test` and TEST Firebase Hosting.
- Verify public health revision, Ready state, 100% traffic and Hosting live version; rollback to captured m69 if release checks fail.
- Rerun authenticated NAV/direct-URL matrix for employee, manager and superadmin using Owner-controlled logins; never create or set passwords.

Out of scope:
- Production services/traffic/DB/DNS/Firebase, `ckrr-line-gateway*`, Secret Manager, IAM, project settings or new grants.
- Project A, protected `docs/design/desktop-20261018/**`, destructive cleanup and unrelated source refactors.
- Using any trigger other than the approved regional trigger.

Acceptance / verification:
- Owner explicitly said `Build` before the Cloud Build/deploy mutation; that gate is satisfied for m70.
- Cloud checks and trigger build pass; migration job completes successfully if the approved pipeline runs it.
- Both TEST services are Ready and exactly 100% on the new candidate; public `/api/health` reports the new `serviceRevision` and `stage=test` / `runtime=NON_PRODUCTION`.
- Firebase Hosting live version was re-released by the approved pipeline and its release ID was read back from the build log.
- Employee: self-service routes visible, reports/approvals/admin direct URLs fail closed.
- Manager: permitted approval/report routes visible, unrelated admin routes fail closed.
- Superadmin: management, reports and approval destinations work; narrow viewport has no horizontal overflow.
- If any release verification fails, traffic and Hosting are restored to the captured m69 baseline and the failure is recorded.

TESTm70 rollout evidence (Owner explicitly said `Build`):
- Cloud Build `fd4404e6-4bea-4d21-9cab-96eae051c19c` = **SUCCESS** from source SHA `7ea2c7f2b3ea75c044aeeb6e7d990593e1d65ffd` with `_VERSION=m70`.
- Verify step = `lint`, workspace typecheck and **111 test files / 830 tests PASS**.
- API image pushed with digest `sha256:25afc33c3d477a6e07c95913c8a2d972f738b9f1577b5b330f43c716ff560192`.
- Web image pushed with digest `sha256:b69186c39e530f6e8d35d7ffefeeeb83f1f8e32c3b1fd409b0b68bd6c380481e`.
- Migration execution `ckace-hr-migrate-test-fcckm` = `EXECUTION_SUCCEEDED`.
- API `ckace-hr-api-test-m70` and Web `ckace-hr-web-test-m70` = Ready; each has 100% traffic.
- Public `/api/health` = `ok=true`, `stage=test`, `runtime=NON_PRODUCTION`, `serviceRevision=ckace-hr-api-test-m70`.
- Firebase TEST release `projects/ckrr-leave-system-2026/sites/ckrr-leave-system-2026/releases/1792730304686000` completed in the approved pipeline.
- Authenticated browser rerun for current elevated `TEST` / `EMPLOYEE SUPERADMIN` session: `/desktop`, Leave, Leave approvals, Reports and role-management routes loaded without route denial; narrow viewport `695x668` had `documentWidth=690`, `clientWidth=690`, and no `.ck-sh` overflow offender.

Read-only preflight evidence:
- API `ckace-hr-api-test-m69` = 100%; Web `ckace-hr-web-test-m69` = 100%.
- Migration job latest execution `ckace-hr-migrate-test-n9x6v` succeeded.
- Existing regional Trigger is present and points to the Project B GitHub connection; no Trigger/configuration mutation was made.
- Current browser session is `TEST`, roles `EMPLOYEE SUPERADMIN`, 58 permissions. Separate employee/manager authenticated sessions are still required; no credentials were created, changed or requested in chat.

Next action:
Keep this TASK active until the Owner supplies/opens the employee and manager TEST sessions one at a time, then rerun their allowed/denied NAV and direct-URL matrix on m70 without changing any business data. Do not start a new release or touch Production.
