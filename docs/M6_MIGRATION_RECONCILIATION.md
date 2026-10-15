# M6 — Migration + Reconciliation Engine

**Status:** PASS / CLOSED  
**Scope:** DEV/TEST and synthetic/read-only legacy analysis only. No Production import/write or source-of-truth change was performed.

## Goal

Provide a first-class migration subsystem that can prove what legacy snapshot was read, how each row was transformed, whether a repeated or interrupted import is safe, how every mismatch is classified, and how a target record traces back to its legacy source.

## Legacy Evidence Baseline

M6 was designed from the finalized M0 read-only evidence in Project A. Critical constraints carried into the engine include:

- legacy IDs are reused across current/archive periods, so legacy ID alone is never globally unique.
- one real duplicate employee/date attendance group must not be auto-merged.
- active employees can have missing leave-policy rows; migration must report rather than auto-create.
- historical Rejected requests can retain downstream Pending approval steps; import must preserve raw history.
- archive approval/attachment history can be incomplete or ambiguous; current history must never be joined to archive rows by reused ID alone.
- historical checkout/location fields can legitimately be null.

## Source Snapshot Contract

`extractReadOnlySnapshot()` accepts a read-only source interface exposing only `readRows()`.

Each extracted row receives:

- source system
- source workbook
- source tab
- source period
- legacy ID
- row number
- deterministic SHA-256 payload hash / row fingerprint
- migration run ID

Snapshot hashes are deterministic for the same source contents and do not depend on the migration run ID or extraction timestamp.

The provenance key now includes:

`sourceSystem + sourceWorkbook + sourceTab + sourcePeriod + legacyId`

This aligns runtime identity with the Prisma `LegacyRecord` uniqueness boundary and prevents current/archive ID collisions.

## Deterministic Transform Contracts

Transformers return exactly one explicit decision:

- `IMPORT`
- `SKIP` with code, reason, and disposition
- `REJECT` with code and reason

Legacy mappings are explicit and fail closed:

- leave duration F/H/AM/PM
- request status English and verified Thai vocabulary
- Annual/Vacation alias normalization
- Personal and Sick mapping
- strict DD/MM/YYYY calendar-date parsing

Unknown status/type/duration/date values are rejected rather than inferred.

## Idempotent Import / Restart Safety

For each source-qualified provenance key:

- identical source payload + identical transformed payload + same transformer version => `SKIPPED_IDENTICAL`.
- changed source payload => `EXCEPTION_SOURCE_CHANGED`; no overwrite.
- changed transformer output/version => `EXCEPTION_TRANSFORM_CHANGED`; no overwrite.
- transform rejection => `REJECTED_TRANSFORM`.
- known disposition-backed anomaly => `SKIPPED_TRANSFORM`.
- target write exception => `AMBIGUOUS_WRITE`; the run stops and does not automatically retry an ambiguous business write.

A later run first queries by provenance, allowing a write that actually committed before an ambiguous transport failure to be detected and skipped safely.

## Reconciliation / Run Reporting

M6 maps engine outcomes to the existing PostgreSQL migration model:

- source snapshot
- transformer version
- status
- imported count
- skipped count
- rejected count
- mismatch count

Run classifications:

- `COMPLETED`
- `COMPLETED_WITH_EXCEPTIONS`
- `FAILED`

Reconciliation requires:

- PASS rows carry no exception disposition.
- EXCEPTION and FAIL rows require an explicit exception code and disposition.
- known legacy exceptions remain visible and separate from failures.
- unresolved source/transform drift, transform rejection, and ambiguous write classify the run as failed/blocking.

## Known Legacy Exception Catalog

The engine has explicit dispositions for:

- duplicate attendance business day
- active user missing leave policy
- Rejected request with downstream Pending steps
- archive/current legacy ID reuse
- incomplete archive approval/attachment history
- nullable historical checkout

No exception is silently repaired.

## Reset / Rollback Evidence

`buildResetPlan()` produces a `PLAN_ONLY` reset plan containing only target records created by that specific migration run.

It always declares:

`requiresExplicitExecutionApproval: true`

M6 does not implement automatic destructive reset/delete execution.

## Verification

Targeted M6 verification:

- `@ckace/contracts` typecheck — PASS
- `@ckace/migration` typecheck — PASS
- contracts + migration tests — 6 files / 41 tests PASS

Full repository verification:

- `npm run check` — PASS
- test files — 20 PASS
- tests — 108 PASS
- lint — PASS
- typecheck — PASS
- build — PASS
- npm audit — 0 vulnerabilities
- Prisma 6.12.0 schema validation — PASS
- source/config secret-signature scan — 0 findings

## Production Safety

No M6 action:

- imported or modified Production business data
- mutated Project A Sheets/Drive/GAS
- changed Production DNS or LINE
- changed module routing/source-of-truth
- created a Production migration run
- executed a destructive reset
- committed or pushed Git

Module routing remains `LEGACY`.

## Files

Primary M6 code:

- `packages/contracts/src/legacy-provenance.ts`
- `packages/contracts/src/contracts.test.ts`
- `packages/migration/src/migration-contracts.ts`
- `packages/migration/src/source-snapshot.ts`
- `packages/migration/src/engine.ts`
- `packages/migration/src/reporting.ts`
- `packages/migration/src/reconciliation.ts`
- `packages/migration/src/rollback.ts`
- `packages/migration/src/known-legacy-exceptions.ts`
- `packages/migration/src/legacy-mappings.ts`
- related M6 test files

## M6 Decision

The M6 engine satisfies the phase exit criteria for synthetic/test migration tooling: read-only extraction contract, deterministic transformation, idempotent repeat import, interrupted-run restart safety, source-qualified legacy traceability, explicit mismatch/disposition reporting, migration-run persistence summaries, and plan-only reset evidence.

**M6 FINAL STATUS: PASS / CLOSED**

The M6 durable goal is terminal and its Native ChatGPT watchdog is cancelled/disabled. Next phase: **M7 — HR Modules**, starting with Identity/Profile and then module migration in the approved order.
