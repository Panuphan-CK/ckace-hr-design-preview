# CKACE HR — Architecture Baseline

Last Updated: 2026-10-26

## Runtime

- Next.js Web / LIFF
- NestJS API
- Prisma
- PostgreSQL / Neon
- private Cloudflare R2
- Google Cloud Run
- Firebase Hosting

## Public targets

- Production: https://hr.ckaceaccount.com
- TEST/UAT: https://hr-test.ckaceaccount.com
- API: same-origin /api/*
- LIFF: /liff

Current verified TEST baseline: TESTm74, built from unified source/main commit 1322ed48e98428ffd580a6ec2e8bb7cdec5132c7.

## Owner-selected Leave data boundary

The target plan is a bounded Leave cutover: LEAVE_READ and LEAVE_WRITE use NEW; every other module route, including IDENTITY, remains LEGACY. This is a planning decision only. No Production route, resource, data, or deployment change is authorized.

CKACE HR migration code currently contains contracts, snapshot hashing, and entity transformers. It does not yet evidence a concrete APP_LEAVE_GAS Sheets/Drive reader, a persistent migration target adapter, organization mapping, bulk legacy attachment copy to R2, or a tested reverse-write rollback path. See HANDOFF.md for the Local-only gap inventory and proposed acceptance plan.

## Boundaries

Web and LIFF are clients, not authorization authorities.

The server owns identity/session, authorization/capability, validation, idempotency, transactions, approval/workflow state, request numbering, audit, notifications, and private attachment authorization.

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

Local is used for implementation and verification and may contain work newer than TESTm74.

TEST current baseline: TESTm74.

Production: NO-GO until readiness gates pass and the Owner separately approves a named Production action.