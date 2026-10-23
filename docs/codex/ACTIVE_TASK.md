# CKACE HR — ACTIVE TASK

Updated: 2026-10-23 Asia/Bangkok

## WEB-LEAVE-05 — TEST rollout + authenticated role matrix rerun

Status: **IN PROGRESS — read-only preflight complete; explicit Build gate pending**
Priority: **P1 — current TEST verification**

Objective / why now:
Promote the pushed role-gate and responsive-NAV fix to TEST, then verify the real employee/manager/superadmin visibility and direct-URL boundaries on the resulting release.

Scope:
- Use only the existing regional Trigger `ckace-hr-test-manual-release` (`4f54907f-eed2-4813-b51e-25af6a3dbf01`).
- Candidate is the pushed source commit `2355d5246d1819899161c0b3c90ee86e3ffd37d2` from `codex/web-leave-05-role-gate`; current TEST traffic is m69, so the next candidate is m70 after the Owner explicitly says `Build`.
- Touch only `ckace-hr-api-test`, `ckace-hr-web-test`, `ckace-hr-migrate-test` and TEST Firebase Hosting.
- Verify public health revision, Ready state, 100% traffic and Hosting live version; rollback to captured m69 if release checks fail.
- Rerun authenticated NAV/direct-URL matrix for employee, manager and superadmin using Owner-controlled logins; never create or set passwords.

Out of scope:
- Production services/traffic/DB/DNS/Firebase, `ckrr-line-gateway*`, Secret Manager, IAM, project settings or new grants.
- Project A, protected `docs/design/desktop-20261018/**`, destructive cleanup and unrelated source refactors.
- Using any trigger other than the approved regional trigger.

Acceptance / verification:
- Owner explicitly says `Build` before any Cloud Build/deploy mutation.
- Cloud checks and trigger build pass; migration job completes successfully if the approved pipeline runs it.
- Both TEST services are Ready and exactly 100% on the new candidate; public `/api/health` reports the new `serviceRevision` and `stage=test` / `runtime=NON_PRODUCTION`.
- Firebase Hosting live version is re-released and read back successfully.
- Employee: self-service routes visible, reports/approvals/admin direct URLs fail closed.
- Manager: permitted approval/report routes visible, unrelated admin routes fail closed.
- Superadmin: management, reports and approval destinations work; narrow viewport has no horizontal overflow.
- If any release verification fails, traffic and Hosting are restored to the captured m69 baseline and the failure is recorded.

Read-only preflight evidence:
- API `ckace-hr-api-test-m69` = 100%; Web `ckace-hr-web-test-m69` = 100%.
- Migration job latest execution `ckace-hr-migrate-test-n9x6v` succeeded.
- Existing regional Trigger is present and points to the Project B GitHub connection; no Trigger/configuration mutation was made.
- Current browser session is `TEST`, roles `EMPLOYEE SUPERADMIN`, 58 permissions; separate employee/manager authenticated sessions are still required.

Next action:
Wait for the Owner's explicit `Build` command, then run the approved Trigger and complete the authenticated matrix without requesting credentials in chat.
