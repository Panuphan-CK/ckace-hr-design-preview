# M2 Neon DEV Apply / Verification

**Status:** PASS
**Date:** 2026-10-04 Asia/Bangkok

## Neon DEV

- Project name: CKACE HR DEV
- Project ID: flat-tree-71711157
- Region: aws-ap-southeast-1 (Singapore)
- PostgreSQL: 17
- Plan: Neon Free
- Database: ckace_hr_dev
- Main branch: br-proud-term-b3pihnrx

## Apply Result

- Main database was verified empty before migration.
- M2 baseline migration applied successfully as one Neon SQL transaction.
- 196 migration statements completed.
- Main database now has 42 tables including Prisma migration ledger.
- _prisma_migrations contains one applied row for 20261004_m2_baseline.
- Main business tables remain empty; no Production data was imported.

## Synthetic Verification

Branch m2-verification:
- synthetic agency inserted successfully.
- two Attendance rows for the same employee/date inserted successfully, proving the known legacy duplicate-day anomaly remains representable.
- the same legacy ID was inserted for current and archive source tabs, proving source-qualified provenance.
- exact duplicate provenance was rejected.
- invalid weekday was rejected.
- Leave startDate > endDate was rejected.
- invalid employee FK for LINE account was rejected.
- invalid announcement scope targeting was rejected.

## Reset / Rollback Isolation

Branch m2-reset-check was created from the clean main baseline before synthetic writes.
Verification confirmed synthetic agency, attendance and legacy-record counts are all zero on this branch.
Both verification branches expire automatically on 2026-10-05T12:00:00Z.

## Reconnect / Compute

The m2-verification compute was explicitly suspended.
A subsequent query successfully woke/reconnected the compute and returned the expected synthetic row.

## Security / Scope

- No connection string/password was exposed in chat.
- OAuth credentials are outside the repository.
- No Production data, GAS, LINE, DNS, R2 or Production routing was changed.
- No real employee data was written to Neon DEV.

## Known Tooling Note

Neon CLI psql fallback failed because local psql is absent and the embedded fallback raised tok.startsWith. The database was verified empty after that failure. Baseline apply was then completed through Neon transaction API instead.

## Result

M2_NEON_DEV_VERIFICATION = PASS

Next: M3 Identity / Auth / RBAC / Audit implementation against Neon DEV.
