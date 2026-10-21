# CKACE HR — Active Decisions

Updated: 2026-10-21

Only decisions that still affect current work are kept here.

## Current implementation authority

- Codex Local is the active executor.
- `origin/claude/project-thread-j4idbg` is the primary implementation baseline.
- TESTm67 is the Owner-confirmed current TEST baseline.
- Production remains NO-GO without explicit Owner approval.

## Local-first workflow

Changes are made and verified in `D:\CKACE_HR` first.

GitHub publication happens only after the end-of-task Owner confirmation.

## Active-only documentation

- Keep exactly one active task in `ACTIVE_TASK.md`.
- Do not retain completed/obsolete task documents in the working tree.
- Do not maintain archive folders for task history.
- Preserve `docs/design/desktop-20261018/**` as the Owner-protected current Local review artifact; it is not task-history clutter.
- Git history is the archive.

## Codex Lead Mode

Codex must inspect before asking, ask only material questions, keep one active task, avoid loops/scope drift, use specialist skills when relevant, verify before completion, update active Markdown every session, and ask before commit/push.

## UI specialist routing

- `ui-ux-pro-max` — UX/UI reasoning
- `design-system` — shared design/tokens/component specs
- `ui-styling` — implementation
