# CKACE HR — ACTIVE TASK

Updated: 2026-10-24 Asia/Bangkok

## WEB-LEAVE-06A — TEST rollout + responsive NAV accessibility recheck

Status: **ACTIVE — TEST Build approved; release config corrected locally; hosted TESTm72 unchanged**
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

Acceptance / verification:
- At 375px and 695px, all visible NAV links/buttons have meaningful accessible names; section names remain descriptive and approval count is announced when nonzero.
- No page-level horizontal overflow or unexpected layout/permission/direct-route regression on representative Employee, Manager and SuperAdmin pages.
- After rollout, public health identifies the new TEST API revision and Cloud Run API/Web traffic is 100% on the intended TEST revisions.
- Release must use `m73` and have a tested rollback target of the current `m72` revisions; the existing manual trigger must use the current application source/config.
- Production remains untouched.

Evidence carried forward:
- TESTm72 health: `ok=true`, `stage=test`, `runtime=NON_PRODUCTION`, `serviceRevision=ckace-hr-api-test-m72`; API/Web m72 each at 100% traffic.
- The existing trigger was pinned to `refs/tags/claude/project-thread-j4idbg`; its release config defaulted to m67 and hard-coded rollback to m66. The local release config is corrected to `_VERSION=m73` and `_ROLLBACK_VERSION=m72`; the trigger has not yet been changed.
- Updating this trigger with `--inline-config` was rejected twice with `INVALID_ARGUMENT`; readback confirms the trigger remains unchanged. Do not retry the inline-config approach. Next use its existing `gitFileSource` and repoint both source refs after the corrected YAML is published.
- WEB-LEAVE-06 role matrix: Employee 12/35 grants, Manager 33/35 grants with two expected denials, SuperAdmin 35/35 grants; narrow-width role checks and representative pages passed.
- New source patch in this isolated worktree adds accessible names for dashboard, calendar, section-menu and profile controls plus a focused naming contract test.
- TESTm72 still runs the old markup; no TEST build/deploy or business mutation was performed in this session.

Verification run:
- Node source-wiring + accessible-name contract smoke check: PASS; profile trigger and dialog share one accessible name.
- `git diff --check`: PASS.
- `npm ci --no-audit --no-fund`, Prisma generate, lint and workspace typecheck: PASS.
- Full Vitest suite with threads pool and one worker: 112/112 files, 833/833 tests PASS. The default fork pool hit sandbox-temp `ENOENT`; this is recorded as an environment limitation.
- `git diff --check` for release config: PASS. No YAML parser is installed in this worktree; Cloud Build has not yet validated the config.

Next action:
After explicit approval to publish the release-config change, push it, repoint the existing manual trigger's `gitFileSource` and `sourceToBuild` refs to `codex/web-leave-06-nav-a11y`, read back the trigger, then run TESTm73 and verify rollout plus the responsive/accessibility gate before starting WEB-LEAVE-07.
