# M3 — Identity / Auth / RBAC / Audit

**Status:** PASS
**Date:** 2026-10-04 Asia/Bangkok

## Implemented

- canonical InternalActorContext with server-derived employee, roles, permissions, organization scope and correlation ID.
- fail-closed permission evaluator for SELF / AGENCY / DEPARTMENT / GLOBAL.
- no implicit authorization from role name alone.
- HMAC-SHA256 legacy Desktop bridge actor envelope with short TTL, nonce, tamper detection and minimum 32-byte secret.
- identity service with ACTIVE-state enforcement and LINE mapping boundary.
- audit/correlation primitives and Prisma audit sink.
- idempotency payload hashing, composite key claim/replay handling and Prisma store.
- Prisma identity repository joining Employee -> UserAccount -> Role -> Permission.
- NestJS RequirePermission decorator and AuthorizationGuard.
- public diagnostic contract confirms client role/UID is not authority and module routing remains LEGACY.

## Security Rules Verified

- missing server-populated actor -> Unauthorized.
- wrong SELF target -> Forbidden.
- missing scope target -> denied.
- SuperAdmin role without explicit permission -> denied.
- tampered/expired bridge envelope -> rejected.
- weak bridge secret -> rejected.
- PENDING/RESIGNED identity -> rejected by IdentityService.
- duplicate LINE user binding -> PostgreSQL unique rejection.
- duplicate normalized login -> PostgreSQL unique rejection.
- duplicate idempotency actor+operation+clientKey -> PostgreSQL unique rejection.
- invalid audit actor -> PostgreSQL FK rejection.

## Neon DEV Synthetic Verification

- branch: m3-security-verification
- branch id: br-steep-wildflower-b378233e
- auto-expiry: 2026-10-05T12:00:00Z
- active identity join returned role EMPLOYEE and permissions profile.self.read + leave.self.read.
- active identity had one LINE binding, one audit row, two independent idempotency rows.
- PENDING account remained PENDING and application service is tested to fail closed.
- rejected constraint transactions left no partial rows.
- Neon main remains clean: employees=0, user_accounts=0, line_accounts=0, audit_logs=0, idempotency_keys=0.

## Verification

- npm run check: PASS.
- lint: PASS.
- typecheck: PASS.
- Vitest: 12 files / 49 tests PASS.
- API/package/Next.js production build: PASS.
- npm audit: 0 vulnerabilities.
- secret-signature scan: 0 hits.

## Production Boundary

- module routing remains LEGACY.
- no Production GAS, LINE, DNS, routing, data or source-of-truth mutation.
- no real employee data written to Neon DEV.

## Result

M3_IDENTITY_AUTH_RBAC_AUDIT = PASS

Next: M4 non-production runtime preparation. Creating GCP/Firebase/Cloud Run resources remains an external infrastructure gate.
