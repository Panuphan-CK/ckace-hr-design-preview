# CKACE HR — Architecture Baseline

Last Updated: 2026-10-21

CKACE_HR is a standalone platform. Project A / APP_Leave is no longer an active runtime, fallback, compatibility target, design baseline, or business-rule source.

## Targets

- Production: `https://hr.ckaceaccount.com`
- LIFF: `https://hr.ckaceaccount.com/liff`
- API: `https://hr.ckaceaccount.com/api/*`
- TEST/UAT: `https://hr-test.ckaceaccount.com`
- Owner-confirmed current TEST baseline: **TESTm67**

## Runtime

Next.js Web/LIFF · NestJS API · Prisma · PostgreSQL/Neon · private Cloudflare R2 · Google Cloud Run · Firebase Hosting

## Boundaries

Presentation is never authorization authority.

The server owns identity/session, authorization/capability, validation, idempotency, transactions, approval/workflow state, request numbering, audit, notifications and private attachment authorization.

Database uses UUID canonical IDs, explicit company/team/employee/role scope, and explicit reconciliation for imported/provenance data.

Private file bytes live in R2; ownership/metadata live in PostgreSQL; protected downloads require server authorization.

## Source-of-truth rule

Every active domain has one authoritative source of truth. Do not introduce dual-write or compatibility layers merely to preserve retired Project A behavior.

## Environments

Local may contain work newer than TESTm67 and must not be equated automatically with deployed TEST.

TEST current baseline: **TESTm67**.

Production: NO-GO until TASK-40/TASK-41 are explicitly approved.

## Desktop design architecture

Current review direction: one People Operations system, persistent top tabs, dashboard-first command center, Galaxy metric/hero language, responsive one-page workspaces, and server-backed real data only when prototype decisions move into application code.

Prototype-only UI is never business-rule or authorization authority.
