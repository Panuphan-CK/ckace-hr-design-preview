# CKACE HR — Project B

CKACE HR Project B is the new HR platform that will replace the legacy APP_Leave Google Apps Script + Google Sheets runtime module-by-module.

## M1 foundation

Current phase: M3 Identity / Auth / RBAC / Audit PASS. Next: Owner-gated M4 non-production GCP/Firebase/Cloud Run runtime.

Locked stack:

- TypeScript
- Next.js + React for Web and LINE LIFF presentation
- NestJS for backend API/business services
- PostgreSQL / Neon V0
- Prisma
- Google Cloud Run
- Firebase Hosting / Google-managed HTTPS
- Cloudflare R2 private runtime attachments

Target domains:

- Production: https://hr.ckaceaccount.com
- TEST/UAT: https://hr-test.ckaceaccount.com
- API: same-origin /api/*
- LIFF: /liff

## Repository layout

- apps/web — Next.js Web/LIFF presentation shell
- apps/api — NestJS API foundation
- packages/contracts — canonical DTO/routing/provenance contracts
- packages/auth — internal actor/security boundaries
- packages/validation — shared validation primitives
- packages/business-rules — pure domain rules
- packages/database — Prisma/PostgreSQL boundary
- packages/migration — migration/reconciliation framework
- docs — architecture and phase evidence

## Important migration rule

The redesigned UI does not block backend/data migration.

During migration:

- legacy Desktop may call a bounded GAS compatibility bridge
- current LINE LIFF may continue through its Cloud Run gateway
- both adapters converge on NestJS services
- module authority moves LEGACY -> shadow -> NEW read -> NEW write
- indefinite dual-write is prohibited

## Local commands

npm install
npm run lint
npm run typecheck
npm test
npm run build

Prisma validation requires DATABASE_URL in the environment:

npm run prisma:validate

No Production provider, DNS, LINE, database, R2 or routing change is part of M1.
