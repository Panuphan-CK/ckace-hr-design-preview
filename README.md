# CKACE HR

CKACE HR is the active standalone employee and people-operations platform for C.K.ACE.

## Current status — 2026-10-21

- **Latest Owner-confirmed TEST baseline:** `TESTm67`
- **Active task:** `TASK-39.9 — Desktop full redesign`
- **Production:** NO-GO; separate readiness/go-no-go approval required
- **Project A / APP_Leave:** retired from active planning; historical evidence only
- **Current active assistant:** Codex Local
- **Collaboration:** Claude is paused and may resume from GitHub + continuity files

See `docs/CURRENT_STATE_TESTM67_20261021.md` for the detailed reconciliation record.

## Platform maturity

The platform is beyond foundation stage and contains mature TEST-stage work across identity/RBAC/audit, employee/company/team structure, Leave, OT, Attendance, Time Correction, Medical, approval routing, revisions/withdrawals/delegation, request numbers/timelines, notifications, policy administration, private R2, holiday/workday-aware dates, OT allowances, reports, Desktop and LIFF work.

## Current Desktop direction

TASK-39.9 uses a People Operations Command Center with:

- persistent top tabs;
- dashboard-first navigation;
- Galaxy hero/metric visual language;
- Thai-first action copy;
- single-workspace module pages;
- responsive and reduced-motion behavior;
- a review-only Overview Hero layout editor.

## Locked stack

TypeScript · Next.js/React · NestJS · PostgreSQL/Neon · Prisma · Cloud Run · Firebase Hosting · private Cloudflare R2

## Runtime targets

- Production: `https://hr.ckaceaccount.com`
- TEST/UAT: `https://hr-test.ckaceaccount.com`
- API: same-origin `/api/*`
- LIFF: `/liff`

## Repository layout

- `apps/web` — Next.js Web / LIFF
- `apps/api` — NestJS API/business services
- `packages/*` — contracts/auth/business rules/database/storage/shared code
- `docs` — active documentation and dated evidence
- `docs/design/desktop-20261018` — current standalone Desktop review prototype
- `design-system/ckace-hr-workspace` — current Desktop design system

## Documentation authority

Start with `AGENTS.md`, `HANDOFF.md`, `PROJECT_PLAN.md`, `docs/CURRENT_STATE_TESTM67_20261021.md`, `docs/README.md`, and `docs/ARCHITECTURE.md`.

Dated M/WD/TASK/design documents are historical evidence and do not override current state.

## Local commands

```text
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run prisma:validate
```

TEST work never authorizes Production mutation.
