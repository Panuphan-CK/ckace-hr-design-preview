# CKACE_HR — HANDOFF

Last Updated: 2026-10-21 Asia/Bangkok

## Executive state

- **Latest Owner-confirmed TEST baseline: TESTm67**
- **Active track: TASK-39.9 — Desktop full redesign**
- **Production: NO-GO**
- Project A / APP_Leave: retired from active planning
- Codex Local: active implementation environment
- Claude: paused; may resume through GitHub/continuity handoff

## TEST baseline

The Owner states that the latest TEST environment is **TESTm67**.

Repository continuity previously recorded explicit rollout detail only through approximately m16. Therefore m12–m16 rollout entries are historical, not current. Do not invent missing m17–m67 image tags, revisions, builds, migrations, Firebase releases, or rollback targets. Recover exact metadata from cloud evidence only when needed.

See `docs/CURRENT_STATE_TESTM67_20261021.md`.

## Documentation publication

Active documentation is published on GitHub `main`; verified documentation publication SHA: `4a405cf7a969c231d759247dde986f1653c365c8`.

Local active-document contents match GitHub, but Local `main` was not force-reset/cleaned because unrelated dirty source/untracked work must be preserved and classified first.

## Git/local state at reconciliation start

At the start of the 2026-10-21 reconciliation:

- branch `main`
- Local HEAD `65a901b632320bff4dd01fbf9d53d754f49b731b`
- GitHub main at the same SHA
- no committed ahead/behind divergence
- local working tree dirty

Dirty groups included root docs, Desktop auth API changes, current Desktop prototype changes, repo-local skills, TEST/admin tooling, LIFF assets/implementation, and `design-system/ckace-hr-workspace/MASTER.md`.

Do not assume all local dirty work is part of TESTm67.

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

## Collaboration

Codex and Claude may both work on CKACE_HR, but never on overlapping scope at the same time. Update continuity and preserve working-tree provenance before handoff.

## Production gates

Production remains NO-GO. Explicit Owner approval is required for Production deploy/traffic, routing, database/data/source-of-truth changes, LINE configuration, credentials, and destructive operations.

## Immediate next action

1. Treat TESTm67 as the TEST baseline.
2. Finish documentation/Git reconciliation separately from source work.
3. Read-only classify remaining dirty source/untracked groups.
4. Continue TASK-39.9 from the current prototype/design system.
5. Reconcile implementation against TESTm67 before the next TEST rollout.
6. Do not start TASK-40 until TASK-39.9 and whole-system QA are Owner-accepted.
