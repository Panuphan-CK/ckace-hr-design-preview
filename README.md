# CKACE HR

CKACE HR is the active employee and people-operations platform for C.K.ACE.

## Current status

- Active executor: **Codex Local**
- Primary implementation baseline: `origin/claude/project-thread-j4idbg`
- TEST baseline: **TESTm67**
- Current workstream: **m67 stabilization**
- Production: **NO-GO**

## Start here

1. `AGENTS.md`
2. `HANDOFF.md`
3. `PROJECT_PLAN.md`
4. `docs/codex/ACTIVE_TASK.md`
5. `docs/CURRENT_STATE_TESTM67_20261021.md`
6. `docs/ARCHITECTURE.md`

## Documentation policy

The working tree contains current documentation only.

Completed or obsolete tasks are removed instead of archived in the repository. Git history is the archive and can recover older material when explicitly needed.

## Locked platform

- TypeScript
- Next.js + React
- NestJS
- PostgreSQL / Neon
- Prisma
- Google Cloud Run
- Firebase Hosting
- private Cloudflare R2

## Runtime targets

- Production: `https://hr.ckaceaccount.com`
- TEST/UAT: `https://hr-test.ckaceaccount.com`
- API: same-origin `/api/*`
- LIFF: `/liff`

## Development workflow

```text
inspect current baseline
→ plan one active task
→ implement Local
→ verify
→ update ACTIVE_TASK / PROJECT_PLAN / HANDOFF
→ summarize
→ ask Owner whether to commit/push
```
