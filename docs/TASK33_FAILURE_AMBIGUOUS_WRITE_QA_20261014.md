# TASK-33 — Failure & Ambiguous-Write QA

Date: 2026-10-14 Asia/Bangkok  
Project: `D:\CKACE_HR` / Project B only  
Environment: source + TEST read-only runtime evidence  
Verdict: **PASS**

## Scope

TASK-33 verifies Desktop failure and ambiguous-write behavior after TASK-32, without Production, Project A, routing, credential, Neon data, R2 data/config, or traffic mutation.

Acceptance focus:
- 401 session expiry / signed-out behavior
- 403 permission denial
- 409 definite conflict
- 503 and network-loss ambiguity
- no automatic business-write retry
- unchanged explicit retry reuses the same client key
- changed payload rotates client key
- Medical uncertain finalize never creates a second upload and never deletes the uncertain object
- server/client failure-state consistency.

## Implementation

A small shared Desktop write-failure classifier was added:

- `401` -> `SESSION_EXPIRED` -> definite
- `403` -> `PERMISSION_DENIED` -> definite
- `409` -> `CONFLICT` -> definite
- `5xx` -> `AMBIGUOUS`
- other non-5xx HTTP failures -> definite
- network failures have no HTTP status, so the existing submission intent is retained.

The shared rule is used by Leave, Attendance Time Correction, Overtime and Medical create flows:
- definite rejection discards the prior submission intent
- ambiguous HTTP 5xx or network loss retains the same intent for an explicit user retry
- no automatic business-write retry was added.

Attendance now consistently surfaces:
`Session หมดอายุ กรุณาเข้าสู่ระบบใหม่`
for 401 responses in attendance/correction reads and writes.

Leave now has a specific 409 conflict message.

Medical claim handling now uses the same definite/ambiguous classification while preserving the pre-existing receipt safety contract:
- uncertain finalize retains the attachment ID
- explicit same-intent retry resumes that attachment
- no second upload is created
- no DELETE occurs for an uncertain finalize/object
- uncertain claim POST outcome preserves finalized receipts and the same client key.

## Files Changed

- `apps/web/src/app/desktop/submission-intent.ts`
- `apps/web/src/app/desktop/submission-intent.test.ts`
- `apps/web/src/app/desktop/leave/page.tsx`
- `apps/web/src/app/desktop/attendance/page.tsx`
- `apps/web/src/app/desktop/attendance/attendance-view.ts`
- `apps/web/src/app/desktop/attendance/attendance-view.test.ts`
- `apps/web/src/app/desktop/overtime/page.tsx`
- `apps/web/src/app/desktop/medical/page.tsx`

No API contract, database schema, runtime config, Cloud Run, Neon, R2, credential, Project A, LIFF/GAS/Gateway, Production, or routing file was changed.

## Deterministic Failure Evidence

### Submission intent

Tests verify:
- unchanged payload after an ambiguous result reuses the same client key
- changed payload rotates the key
- 401 / 403 / 409 are definite failures and discard the old intent
- 503 is ambiguous and retains the intent
- network-loss retry with unchanged payload retains the intent.

### Server no-blind-retry

Existing `apps/api/src/routing/m9-routing-failure-boundaries.test.ts` remains green and verifies Leave / Attendance / Overtime / Medical service paths do not blindly retry repository failures after an ambiguous result.

### Session expiry / logout

- signed desktop session tests cover expired sessions and fail-closed behavior
- logout tests continue to require confirmed 2xx success and do not treat 401/403/5xx/network failures as successful logout.

### Medical uncertain finalize

Existing Medical receipt upload tests remain green and verify:
- HTTP/network finalize uncertainty preserves the same attachment ID
- explicit retry finalizes the same attachment
- no second upload
- no DELETE of the uncertain object
- upload failure before finalize may clean only the unlinked pre-finalize metadata path.

## TEST Runtime Evidence

No new TASK-33 deployment or business write was needed.

Current TEST baseline signed-out probe:
- `GET /api/leave/me` -> **401 Unauthorized**

Read-only Cloud Run request logs from exact TASK-32 TEST revision
`ckace-hr-api-test-task32r2-20261008d` show real contract behavior:
- intended ambiguous finalize -> **503**
- private authorization denials -> **403**
- changed Medical replay with same client key -> **409**

This runtime evidence validates the Server status contracts that the TASK-33 Desktop source now classifies.

API traffic was re-read:
- `ckace-hr-api-test-m9d15d` = **100%**
- `task32-r2` tagged revision = **0%**

No TASK-33 traffic mutation or deployment occurred.

## Neon DEV Non-Mutation Check

Read-only verification on 2026-10-14:
- new Medical claims today = **0**
- new attachments today = **0**
- new idempotency keys today = **0**
- TASK-32 Medical claims remain **1**
- TASK-32 receipt attachment rows remain **3**

TASK-33 created no DB/R2 test data.

## Verification

Codex implementer:
- focused regression: 6 files / 34 tests PASS
- full `npm run check`: 77 files / 479 tests PASS

Independent Development Lead verification:
- focused regression task `0828d7c3-ae39-4f37-b904-c3137df13daf`: **8 files / 41 tests PASS**
- full `npm run check` task `8dbe41a5-b946-48c0-a145-974167c91e06`: **exit 0**
  - lint PASS
  - typecheck PASS
  - **77 / 77 test files PASS**
  - **479 / 479 tests PASS**
  - NestJS API build PASS
  - Next.js production build PASS.

## Review Decision

The implementation is bounded and preserves the required invariant:

> A result that might follow a committed write is never automatically repeated with a new intent.

Definite rejections can safely abandon the old intent; ambiguous outcomes retain the same key/object identity until the user explicitly retries or reconciles state.

No unresolved TASK-33 blocker remains.

## Final Decision

**TASK-33 = PASS.**

Next gated task:
**TASK-34 — R2 Orphan Reconciliation**

Do not start TASK-34 without explicit Owner approval.
