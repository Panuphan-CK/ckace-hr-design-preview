# AGENTS.md — CKACE_HR Worker Rules

## Role

This repository is the active standalone CKACE HR platform.

Active local repository: `D:\CKACE_HR`  
GitHub: `Panuphan-CK/ckace-hr`

## Current authority

Effective 2026-10-21:

- **Owner-confirmed TEST baseline: TESTm67**
- **Active implementation track: TASK-39.9 — Desktop full redesign**
- Project A / APP_Leave is retired from active planning.
- Production remains NO-GO until separate Owner approval.
- Codex Local is the active implementation environment for the current work period.
- Claude is paused but remains part of the collaborative workflow.

Priority of truth:

1. current Owner direction;
2. `AGENTS.md`;
3. `HANDOFF.md`;
4. `PROJECT_PLAN.md`;
5. `docs/CURRENT_STATE_TESTM67_20261021.md`;
6. current CKACE_HR source/contracts/schema and verified TEST evidence;
7. dated historical documents only where not superseded.

## Project independence lock

For new work:

- Do not read, edit, query, compare against, or depend on Project A / APP_Leave.
- Do not use Project A as runtime fallback, source of truth, compatibility target, UI/UX baseline, business-rule baseline, test oracle, migration source, or acceptance criterion.
- Do not create new parity or bridge work whose purpose is to preserve retired behavior.
- Historical Project A references may remain only as audit evidence.

## TESTm67 rule

TESTm67 is the latest Owner-confirmed TEST baseline.

Do not infer that the local dirty working tree exactly equals TESTm67. Local files may contain deployed TESTm67 work, newer work, prototype-only work, tooling, or uncertain provenance. Classify relevant local changes before changing source.

## Collaborative Codex + Claude mode

- Before editing, read active continuity, current branch, Git status, and relevant diffs.
- Do not work concurrently on the same files or overlapping scope.
- Preserve commits and uncommitted work from the other assistant.
- Never reset, clean, stash, discard, or rewrite another assistant's work without explicit Owner approval.
- Treat assistant switches as handoffs, not project resets.
- GitHub plus active continuity files are the shared handoff surface.

## Architecture lock

- TypeScript
- Next.js + React
- NestJS
- PostgreSQL / Neon
- Prisma
- Google Cloud Run
- Firebase Hosting / Google-managed HTTPS
- Cloudflare R2 private storage
- Production domain: `hr.ckaceaccount.com`
- TEST/UAT domain: `hr-test.ckaceaccount.com`
- preferred API: same-origin `/api/*`

## Security

- Frontend is never authorization authority.
- Server derives actor identity and capability.
- Fail closed.
- Never expose or commit secrets, credentials, private medical data, tokens, or production keys.
- Private files require server authorization.
- Business writes must be idempotent and must not be blindly retried after ambiguous commit.

## Production gates

Explicit Owner approval is required for Production deploy/traffic, DNS/Firebase routing, LINE configuration, Production data/source-of-truth mutation, Neon PROD changes, paid upgrades, destructive operations, or production credential/security changes.

## Development workflow

Before editing:

1. read active continuity;
2. check Git status and relevant diff;
3. preserve unrelated local changes;
4. identify whether target work is TESTm67 baseline, newer local work, or prototype-only work;
5. make the smallest architecture-consistent change;
6. use real package scripts.

Before completion run relevant lint/typecheck/tests/build, Prisma validation when applicable, review Git diff/status, and update continuity truthfully.

Do not commit or push unless explicitly requested. Do not use destructive Git commands.
