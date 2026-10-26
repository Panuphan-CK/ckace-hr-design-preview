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

## Owner-selected full-system data boundary

The target plan migrates all employee-facing modules from GAS to CKACE HR together so employees use one system. The earlier Leave-only Option 2 is superseded. Leave entitlements are calculated from CKACE HR tenure rules; GAS quota is reconciliation evidence only.

This is a planning decision, not Production approval. Current per-module route state is not a universal data dispatcher, and current Production validation rejects more than one module pair set to NEW. Implement and prove one fail-closed LEGACY/FROZEN/NEW system mode and all-path coverage before a full-system rehearsal/cutover. See HANDOFF.md for XLSX inventory, model map, acceptance plan, and Owner inputs.
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
