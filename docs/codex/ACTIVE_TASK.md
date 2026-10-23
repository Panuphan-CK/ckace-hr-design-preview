# CKACE HR — ACTIVE TASK

Updated: 2026-10-23 Asia/Bangkok

## WEB-LEAVE-05 — Complete Role Matrix + Responsive NAV Gate

Status: **IN PROGRESS — local gate implemented; TEST role-session rerun and rollout remain pending**
Priority: **P1 — remaining TEST evidence before Production discussion**

Objective / why now:
Close the remaining direct-URL role-matrix and narrow-viewport NAV gaps without weakening server-authoritative permissions or touching Production.

Scope:
- Add a single client-side route gate driven by the server session navigation capabilities.
- Cover hash destinations under approvals and HR management with their exact capability.
- Preserve self-service routes and announcement reader/admin access rules.
- Remove the measured narrow viewport overflow caused by admin section headers.
- Verify with focused unit tests, lint, read-only TEST browser evidence and final diff checks.

Out of scope:
- Production deploy/traffic/DB/DNS/Firebase, `ckrr-line-gateway*`, Secret Manager, IAM or project settings.
- TEST deploy/build, account provisioning, password handling or business-data mutation in this session.
- Protected `docs/design/desktop-20261018/**` changes and Project A references.

Acceptance / verification:
- Direct routes fail closed when the session lacks the mapped navigation capability.
- Hash routes map to the exact approval/management capability; management landing accepts any management read capability.
- Focused route-gate tests pass and changed source passes targeted ESLint.
- Existing TESTm69 browser evidence records the elevated session limitation and reproduces the responsive overflow at 695px; no claim is made that the local fix is deployed.
- `git diff --check` is clean and all continuity files record the partial state.

Evidence / current result:
- `desktop-route-access.test.ts`: 7/7 tests PASS.
- Targeted ESLint: PASS (0 errors / 0 warnings).
- Web workspace typecheck: baseline fails on pre-existing contract drift outside this task; no errors were reported for the changed route-gate files.
- TESTm69 read-only browser: current session is `EMPLOYEE SUPERADMIN`; `/desktop/admin/professional-roles` at 695px has `documentWidth=698`, `clientWidth=690`, and `.ck-sh` offenders at `left=-8/right=698.4`.

Next action:
After Owner review, commit/push this isolated source change only when explicitly authorized; then deploy to TESTm69 and rerun the employee/manager/superadmin authenticated matrix plus responsive NAV evidence.
