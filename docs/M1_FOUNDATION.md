# M1 — Repository Foundation Evidence

**Status:** PASS
**Date:** 2026-10-04 Asia/Bangkok

## Goal

Create a separate modern Project B repository without changing Project A Production.

## Environment

- path: D:\CKACE_HR
- workspace: CKACE_HR
- Node: 22.20.0
- npm: 10.9.3
- Git: 2.51.0
- package manager: npm workspaces
- pnpm: not installed / not required

## Pinned foundation packages

- Next.js 16.3.8
- React 19.3.0
- NestJS 12.1.2
- Prisma CLI 6.12.0 exact
- @prisma/client 6.12.0 exact
- TypeScript 5.9.3
- Vitest 5.0.3
- ESLint 10.12.0

Prisma 8.0.0-rc is intentionally not used.

Prisma dependency decision history:
- Prisma 7.10.0 produced high-severity transitive audit findings.
- Prisma 6.19.3 still fell inside the affected advisory range.
- the stale 6.19.3 workspace tree was removed and 6.12.0 reinstalled exactly.
- final npm audit reports 0 vulnerabilities.

## Foundation created

- root npm workspace/Git/tooling baseline.
- apps/web Next.js presentation shell.
- apps/api NestJS API shell.
- packages/contracts canonical routing/provenance contracts.
- packages/auth internal actor boundary.
- packages/validation shared validation primitives.
- packages/business-rules pure domain rules.
- packages/database Prisma/PostgreSQL boundary.
- packages/migration migration/reconciliation skeleton.
- docs architecture/continuity evidence.

## Migration safeguards encoded in foundation

- every module route defaults to LEGACY.
- current/archive legacy IDs are source-qualified.
- migration EXCEPTION is distinct from FAIL.
- active/pending/resigned account-state distinction is modeled in pure business rules.
- no client-supplied role/UID becomes backend authority.
- no real secret is committed.
- business schema is intentionally deferred to M2.

## Verification

Dependency/security:
- npm ls prisma @prisma/client --all -> Prisma/client 6.12.0, exit 0.
- npm audit --json -> 0 vulnerabilities, exit 0.

Code quality:
- npm run lint -> exit 0.
- npm run typecheck -> exit 0 across API/Web/shared packages.
- npm test -> 3 test files / 5 tests PASS.
- npm run build -> exit 0.
- Next.js production build generated / and /liff.
- prisma validate -> schema valid using process-local placeholder DATABASE_URL, exit 0.

## Boundaries verified

M1 did not create Neon, R2, GCP/Firebase Project B runtime, mutate Production DNS/LINE, import Production data, switch a Production source of truth, or retire GAS.

## Result

M1_REPOSITORY_FOUNDATION = PASS

Next: M2 local PostgreSQL/Prisma schema design; Neon DEV creation remains an explicit Owner gate.
