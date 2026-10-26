# CKACE HR

CKACE HR is the employee and people-operations platform for C.K.ACE.

## Current status

- Active executor: Codex Local.
- Verified application baseline: source/main commit 1322ed48e98428ffd580a6ec2e8bb7cdec5132c7.
- Current TEST baseline: TESTm74.
- Current workstream: PROD-READINESS-04 — DEV/TEST Leave migration rehearsal using an approved sanitized source snapshot.
- Owner-selected target is a planning-only bounded Leave cutover: LEAVE_READ/LEAVE_WRITE=NEW; every other module=LEGACY.
- Production: NO-GO. No Production action is authorized by the data-authority decision.

## Start here

1. docs/codex/ACTIVE_TASK.md
2. docs/codex/DECISION_LOG.md
3. HANDOFF.md
4. PROJECT_PLAN.md
5. docs/ARCHITECTURE.md

Earlier TEST releases are historical evidence; TESTm74 is the current baseline.

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

- Production: https://hr.ckaceaccount.com
- TEST/UAT: https://hr-test.ckaceaccount.com
- API: same-origin /api/*
- LIFF: /liff

## Development workflow

Inspect current baseline → plan one active task → implement Local → verify → update continuity docs → summarize → ask Owner whether to commit/push.