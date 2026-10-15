# CKACE HR — Architecture Baseline

## Final direction

Desktop/Web and LINE LIFF converge on the same backend services.

Public target:

- https://hr.ckaceaccount.com
- https://hr.ckaceaccount.com/liff
- https://hr.ckaceaccount.com/api/*

Runtime:

- Next.js Web
- NestJS API
- Prisma
- PostgreSQL / Neon
- private Cloudflare R2
- Cloud Run
- Firebase Hosting / Google-managed HTTPS

## Migration transition

Desktop:
legacy Apps Script UI -> GAS compatibility adapter -> NestJS when a module is NEW.

LINE:
current LIFF -> existing Cloud Run adapter -> NestJS when a module is NEW.

A server-only routing state controls read/write authority independently per module.

Default routing is LEGACY for every module.

## Domain layering

Adapters:
- legacy DTO compatibility only
- no long-lived business-rule duplication

Application services:
- identity
- authorization
- validation
- idempotency
- transactions
- approval transitions
- audit
- outbox

Database:
- UUID canonical IDs
- source-qualified legacy provenance
- PostgreSQL source of truth after module write cutover

Files:
- metadata/ownership in PostgreSQL
- bytes in private R2
- no permanent public file URLs

## M1 non-goals

- no Neon project
- no Production database
- no R2 bucket
- no GCP/Firebase project
- no Production LINE/DNS change
- no Production migration/import
- no GAS retirement
