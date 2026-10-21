# CKACE_HR — HANDOFF

Last Updated: 2026-10-21 Asia/Bangkok

## Executive state

- **Latest Owner-confirmed TEST baseline: TESTm67**
- **Active track: TASK-39.9 — Desktop full redesign**
- **Production: NO-GO**
- Project A / APP_Leave: retired from active planning
- Codex Local: **only active implementation assistant for the current work period**
- Claude: paused; may resume only through an explicit handoff
- Codex operating mode: **CKACE HR Codex Lead Mode** — inspect → targeted discovery → TASK → specialist skill routing → implementation → verification → session summary

## TEST baseline

The Owner states that the latest TEST environment is **TESTm67**.

Repository continuity previously recorded explicit rollout detail only through approximately m16. Therefore m12–m16 rollout entries are historical, not current. Do not invent missing m17–m67 image tags, revisions, builds, migrations, Firebase releases, or rollback targets. Recover exact metadata from cloud evidence only when needed.

See `docs/CURRENT_STATE_TESTM67_20261021.md`.

## Documentation publication

Active documentation and Codex Lead Mode are published on GitHub `main`. At TASK-CX.1 inspection time, `origin/main` was `ee42f38ae11b051b745c444c2d0e904b6de75e29`.

Local active-document contents had matched the published state before TASK-CX.1 documentation updates, but Local `main` remains intentionally at `65a901b` because unrelated dirty source/untracked work must be preserved until branch/source provenance is reconciled.

## Git/local state at reconciliation start

At the start of the 2026-10-21 reconciliation:

- branch `main`
- Local HEAD `65a901b632320bff4dd01fbf9d53d754f49b731b`
- GitHub main at the same SHA
- no committed ahead/behind divergence
- local working tree dirty

TASK-CX.1 classified the dirty groups. Key result:

- Desktop-auth API changes are a local LIFF-auth precursor/experimental implementation and **must not be merged as-is** over the later TEST branch.
- `docs/design/desktop-20261018/` changes are current TASK-39.9 local design work, not TESTm67 deployment evidence.
- `_ckace` LIFF source + `liff-assets` strongly align by timing/content with the LIFF effort later committed in a different form on the Claude branch; preserve, but do not treat them as current deploy source.
- `.claude/test-admin/` is historical TEST-only mutation tooling.
- 172 specialist-skill files are Local agent tooling, not product/TEST code.
- controller/quality skills, `docs/codex/`, current-state docs, and the design-system master were already published to `origin/main`; they appear untracked locally because Local HEAD is behind.

Detailed evidence: `docs/codex/TASK_CX1_PROVENANCE_20261021.md`.

## Platform maturity

Major implemented/verified capability exists across:

- Identity/Auth/RBAC/Audit
- Company/team/manager/scoped roles
- Leave, OT, Attendance, Time Correction, Medical
- Approval policy/routing
- Send-back/resubmit/withdraw
- Delegation and bulk OT approval
- Request numbering and approval timelines
- Vacation entitlement and professional roles
- OT allowances and Excel reporting
- Private R2 attachments
- In-app/LINE/email notifications and overdue reminders
- holiday/workday-aware date handling
- management/admin configuration

Earlier TASK-28 through TASK-39.x documents remain historical evidence.

## TASK-39.9 — active Desktop work

Current review prototype: `docs/design/desktop-20261018/`
Current design system: `design-system/ckace-hr-workspace/MASTER.md`

Latest Local direction:

- one People Operations system;
- persistent top tabs;
- dashboard-first command center;
- Galaxy-style hero/orbit metric language;
- Thai-first action copy;
- one-page module workspaces;
- Approval Center, Reports and Settings in the same shell;
- Desktop Overview Hero layout editor for review;
- prototype-only data/interactions, not business-rule authority.

Older v18/parity and neo-brutalist directions are historical/superseded where they conflict with the current prototype/design system.

## Project A retirement

Project A / APP_Leave is not an active dependency, runtime fallback, compatibility target, UI/UX baseline, business-rule baseline, migration source, test oracle, or acceptance criterion. Historical references remain audit evidence only.

## Development operating mode

Current mode is **Codex-only active development**.

Codex must follow `docs/codex/WORKFLOW.md` and `.agents/skills/ckace-hr-controller/SKILL.md`: inspect first, ask only material Owner questions, plan meaningful work as bounded TASKs, route specialist skills, avoid repeated failed approaches, verify before completion, update `docs/codex/TASKS.md` + `PROJECT_PLAN.md` + `HANDOFF.md` after every completed work session, end with the mandatory summary, and always ask the Owner whether to commit and push to GitHub.

Claude is paused. If the Owner reactivates Claude later, stop overlapping work and perform an explicit continuity/Git handoff first.

## Production gates

Production remains NO-GO. Explicit Owner approval is required for Production deploy/traffic, routing, database/data/source-of-truth changes, LINE configuration, credentials, and destructive operations.

## Immediate next action

1. Treat TESTm67 as the Owner-confirmed operational baseline.
2. Execute **TASK-CX.2 — Recover exact TESTm67 source/deployment lineage**.
3. Use Cloud Build/Cloud Run/Firebase TEST evidence plus Git history to identify the exact or best-provable source commit behind live TESTm67.
4. Do not merge/reset/clean/stash the Local tree before the integration plan is proven.
5. Preserve the current TASK-39.9 prototype and all uncertain local source artifacts during reconciliation.
6. Resume TASK-39.9 implementation only after the TEST baseline is safely integrated.
7. Do not start TASK-40 until TASK-39.9 and whole-system QA are Owner-accepted.
