# CKACE HR — ACTIVE TASK

Updated: 2026-10-23 Asia/Bangkok

## WEB-LEAVE-05 — TEST rollout + authenticated role matrix rerun

Status: **PARTIAL — role matrix verified; local responsive fix ready, TESTm71 verification pending**
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
- Authenticated Manager session (`หัวหน้า`) on TESTm70: self-service (`/desktop`, Leave, Attendance, Overtime, Time correction, Medical, Calendar, Requests), all four approval hashes, Reports, Announcements, and permitted admin routes loaded without denial; `/desktop/admin/management#roles` failed closed with `ไม่มีสิทธิ์ใช้งานหน้านี้` as expected. No business action was submitted.
- Manager responsive check at the hosted viewport (`innerWidth=695`): all tested routes were within the viewport except `/desktop/admin`, where `documentWidth=696` vs `clientWidth=690`; the only identified offender was `.ck-dot-tip` ending at `right=695.9`. Record as a P3 responsive follow-up; do not claim full no-overflow PASS for Manager until resolved or explicitly accepted.
- The Owner-opened session currently displays `TEST` and Profile roles `EMPLOYEE`, `SUPERADMIN` with `58` permissions. Treat it as the already-known elevated/superadmin fixture, not as the plain Employee deny-case. Its approvals/reports/admin access therefore does not satisfy the Employee acceptance criterion.
- Read-only Users view confirms the plain Employee fixture is the separate account labelled `พนักงาน`; `TEST` and `SuperAdmin คนที่สอง` are elevated, while `หัวหน้า` is the Manager fixture.
- Plain Employee session (`พนักงาน`) on TESTm70 passed the matrix: Home, Attendance, Leave, Overtime, Time correction, Medical, Calendar, Requests, Profile, Inbox, Benefits and read-only Announcements loaded; all approval hashes, Reports, announcement management, Admin, Management, Professional roles and Approval policies failed closed with `ไม่มีสิทธิ์ใช้งานหน้านี้`. Dashboard NAV exposed only permitted self-service links and had no horizontal overflow at `innerWidth=695` (`documentWidth=690`, `clientWidth=690`). No business action was submitted.
- Local fix applied in `apps/web/src/app/desktop/ui/ck-v2.css`: at `max-width: 760px`, `SettingRow` status-dot tooltips anchor to the right edge, wrap long labels, and cap width to the viewport. This targets the proven `.ck-dot-tip` overflow without changing permissions or business behavior.
- Local verification: web lint **PASS**; targeted `desktop-route-access.test.ts` **7/7 PASS**; Webpack production build compiled successfully before the existing TypeScript contract errors stopped the build. Turbopack build remains blocked by the isolated-worktree `node_modules` symlink error. No TESTm71 build/deploy was run.

Read-only preflight evidence:
- API `ckace-hr-api-test-m69` = 100%; Web `ckace-hr-web-test-m69` = 100%.
- Migration job latest execution `ckace-hr-migrate-test-n9x6v` succeeded.
- Existing regional Trigger is present and points to the Project B GitHub connection; no Trigger/configuration mutation was made.
- Current verification covered the elevated `TEST` / `EMPLOYEE SUPERADMIN` fixture, Manager `หัวหน้า`, and plain Employee `พนักงาน`; no credentials were created, changed or requested in chat.

Next action:
Keep this TASK active until the Owner explicitly says `Build`; then use the approved TEST trigger for m71 and recheck Manager `/desktop/admin` at the hosted viewport, including no overflow and tooltip readability. Do not touch Production.
