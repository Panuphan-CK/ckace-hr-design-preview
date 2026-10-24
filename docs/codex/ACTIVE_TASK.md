# CKACE HR — ACTIVE TASK

Updated: 2026-10-24 Asia/Bangkok

## WEB-LEAVE-06A — TEST rollout + responsive NAV accessibility recheck

Status: **ACTIVE — Local source fix prepared; hosted TESTm72 has not been changed**
Priority: **P2 — close the NAV accessibility gap before the next authenticated workflow gate**

Objective / why now:
WEB-LEAVE-06's Employee / Manager / SuperAdmin direct-URL and responsive role matrix is already verified PASS on TESTm72. The narrow NAV review found that icon-only controls lose their accessible names when labels are visually hidden. Correct that without changing visual layout, role permissions, or route behavior, then verify the fix on TEST after an Owner-authorized rollout.

Scope:
- Give dashboard, calendar, section-menu and profile controls stable, descriptive accessible names at narrow widths.
- Include the pending approval count in the approval section's accessible name when present.
- Preserve the existing TESTm72 role/direct-URL evidence; repeat focused responsive and route checks only after the changed build is on TEST.
- Keep implementation in the application/source repository and preserve the protected design artifact.

Out of scope:
- Leave business-flow writes until this gate is verified; those belong to WEB-LEAVE-07.
- Any Production, Project A, Secret Manager, IAM, gateway, Firebase/Cloud project-setting or protected-design changes.
- TEST build/deploy before the Owner explicitly requests `Build`.

Acceptance / verification:
- At 375px and 695px, all visible NAV links/buttons have meaningful accessible names; section names remain descriptive and approval count is announced when nonzero.
- No page-level horizontal overflow or unexpected layout/permission/direct-route regression on representative Employee, Manager and SuperAdmin pages.
- After rollout, public health identifies the new TEST API revision and Cloud Run API/Web traffic is 100% on the intended TEST revisions.
- Production remains untouched.

Evidence carried forward:
- TESTm72 health: `ok=true`, `stage=test`, `runtime=NON_PRODUCTION`, `serviceRevision=ckace-hr-api-test-m72`; API/Web m72 each at 100% traffic.
- WEB-LEAVE-06 role matrix: Employee 12/35 grants, Manager 33/35 grants with two expected denials, SuperAdmin 35/35 grants; narrow-width role checks and representative pages passed.
- New source patch in this isolated worktree adds accessible names for dashboard, calendar, section-menu and profile controls plus a focused naming contract test.
- TESTm72 still runs the old markup; no TEST build/deploy or business mutation was performed in this session.

Verification run:
- Node source-wiring + accessible-name contract smoke check: PASS; profile trigger and dialog share one accessible name.
- `git diff --check`: PASS.
- Vitest / web lint / typecheck: not run because this isolated worktree has no installed dependencies; do not install or use dependencies from the dirty main checkout.

Next action:
After publication, wait for an explicit `Build` request before TEST rollout. Then verify the accessible tree and responsive gate before starting WEB-LEAVE-07.
