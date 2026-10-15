# AGENTS.md — CKACE_HR Project B Worker Rules

## Role

This repository is the new CKACE HR platform that will replace the legacy APP_Leave GAS/Sheets runtime module-by-module.

Project A reference:
\`D:\APP_Leave\`

Project B active repository:
\`D:\CKACE_HR\`

Do not edit Project A from this repository unless the Owner explicitly authorizes a bounded compatibility change.

## Architecture Lock

- Language: TypeScript
- Web / LINE LIFF UI: Next.js + React
- Backend API: NestJS
- Database: PostgreSQL
- V0 provider: Neon
- ORM: Prisma
- Runtime: Google Cloud Run
- Front door: Firebase Hosting / Google-managed HTTPS
- Runtime file storage: Cloudflare R2 private storage
- Production domain: hr.ckaceaccount.com
- TEST/UAT domain: hr-test.ckaceaccount.com
- Preferred public API surface: same-origin /api/*
- app.ckaceaccount.com is reserved for a future platform portal.

## Migration Rules

- Backend/data migration may proceed before the redesigned Web/LIFF UI is complete.
- Current Desktop and LINE LIFF contracts must remain compatible during bounded migration.
- No Big Bang cutover.
- No indefinite GAS + PostgreSQL dual-write.
- A migrated module must end with exactly one authoritative source of truth.
- Legacy extraction is read-only.
- Preserve source-qualified legacy provenance. Never assume legacy_id is globally unique.
- Do not silently repair migration anomalies. Record explicit reconciliation disposition.
- Project B uses UUID canonical IDs.

## Security

- Frontend is never authorization authority.
- Server derives actor identity and capability.
- Fail closed.
- Do not expose secrets, tokens, passwords, API keys, private medical data, or production credentials.
- Do not commit .env files or credentials.
- Use Secret Manager/runtime secret configuration for production secrets.
- Private files stay private and require server authorization.
- Business writes must be idempotent and must not be automatically retried after an ambiguous commit.

## Production Gates

Do not perform without explicit Owner approval:

- Production DNS mutation
- Production LINE configuration mutation
- Production data import/write
- Production source-of-truth switch
- GAS retirement
- paid provider purchase/upgrade
- destructive migration or deletion
- credential/security changes with Production impact

M1 repository/local foundation work does not authorize any of those gates.

## Development

Before editing:

1. Inspect relevant files.
2. Check Git status.
3. Preserve unrelated changes.
4. Make the smallest architecture-consistent change.
5. Use real package scripts; do not invent verification commands.

## Continuity Files

- Root `HANDOFF.md` and `PROJECT_PLAN.md` are canonical **Project B only** continuity files.
- Do not place Project A `D:\APP_Leave` status, task history, or handoff material in these files.
- Keep root continuity concise and current. Detailed historical evidence belongs in dated files under `docs/` or `docs/archive/`.
- Project A may be mentioned only as a scope boundary or compatibility reference, never as Project B progress.

Before completion:

1. Run lint.
2. Run typecheck.
3. Run tests.
4. Run build.
5. Run Prisma validation when database configuration changes.
6. Review Git diff/status.
7. Update HANDOFF.md and PROJECT_PLAN.md truthfully.

Do not commit or push unless explicitly requested.
Do not use destructive Git commands.
