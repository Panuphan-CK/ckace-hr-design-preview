# CKACE HR — Architecture Baseline

Last Updated: 2026-10-21

## Runtime

- Next.js Web / LIFF
- NestJS API
- Prisma
- PostgreSQL / Neon
- private Cloudflare R2
- Google Cloud Run
- Firebase Hosting

## Public targets

- Production: `https://hr.ckaceaccount.com`
- TEST/UAT: `https://hr-test.ckaceaccount.com`
- API: same-origin `/api/*`
- LIFF: `/liff`

Current Owner-confirmed TEST baseline: **TESTm67**.

## Boundaries

Web and LIFF are clients, not authorization authorities.

The server owns identity/session, authorization/capability, validation, idempotency, transactions, approval/workflow state, request numbering, audit, notifications and private attachment authorization.

Database uses UUID canonical IDs and PostgreSQL/Neon as the relational source.

Private file bytes live in R2; ownership/metadata live in PostgreSQL; protected downloads require server authorization.

## Security

- frontend never grants authority;
- server derives actor identity and permission;
- fail closed;
- private medical/signature/profile artifacts remain access-controlled;
- ambiguous business writes are not blindly retried;
- secrets remain outside source control.

## Environments

Local is used for implementation and verification and may contain work newer than TESTm67.

TEST current baseline: **TESTm67**.

Production: **NO-GO** until explicitly approved by the Owner.
