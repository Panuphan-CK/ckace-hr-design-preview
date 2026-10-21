# CKACE_HR — HANDOFF

Last Updated: 2026-10-21 Asia/Bangkok

## Current state

- Active executor: **Codex Local**
- Primary implementation baseline: `origin/claude/project-thread-j4idbg`
- Owner-confirmed TEST baseline: **TESTm67**
- Current focus: **Owner-directed Local Overview visual review** at `docs/design/desktop-20261018`
- Production: **NO-GO**
- Local working tree contains preserved dirty/untracked work and must not be destructively cleaned.

## Documentation state

The working tree now uses **active-only documentation**.

- Keep one active task only in `docs/codex/ACTIVE_TASK.md`.
- Do not retain completed or obsolete task documents in the working tree.
- Git history is the archive.
- Older task/phase documents are not part of the active planning surface. The current Local design prototype at `docs/design/desktop-20261018/**` is a protected working artifact and must not be deleted by cleanup.
- Owner Overview review is active: manager = 4 cards, employee = 3 cards; Today child cards now fill the parent content height and use enlarged readable typography. Current QA preview uses local port 4186.

## Current implementation status

The current implementation line contains mature TEST-stage work across authentication/RBAC/audit, Leave, OT, Attendance, Time Correction, Medical, approvals, notifications, reports/Excel, HR settings, Web LIFF, and TEST release automation.

Local source must be reconciled against the current implementation baseline before promoting older Local code over the tested m67 line.

## Current Git rule

- Local-first.
- Preserve uncertain Local work.
- Do not reset, clean, or stash merely to make Local look clean.
- Commit/push only after the Owner confirms at the end of the task.

## Active task

See `docs/codex/ACTIVE_TASK.md`.

## Immediate next action

Keep the Local Overview prototype stable for Owner visual review and apply only explicit Owner UI changes. After Owner acceptance, resume m67 reconciliation unless superseded by newer Owner direction.

After the task finishes, update active continuity, replace the finished active task with the next task, summarize, then ask the Owner whether to commit and push.
