# TASK-34 — R2 Orphan Reconciliation

Date: 2026-10-14 Asia/Bangkok  
Project: `D:\CKACE_HR` / Project B only  
Environment: TEST only  
Verdict: **PASS**

## Goal

Classify the exact two retained TASK-32 unfinalized private Medical attachment intents by independently verifying:

1. Neon DEV attachment-row state
2. every attachment-link relation
3. actual Cloudflare R2 object existence and metadata

No delete, finalize, upload, DB cleanup, credential expansion, Production change, Project A change, or traffic cutover was authorized or performed.

## Exact Reconciliation Set

The probe is hardcoded to exactly these TASK-32 candidates:

- `b77d51eb-6a95-49d8-904c-25a524ae52a5`
- `53cb60e3-a7a6-4a14-9e72-f235b5bf5dd6`

Expected invariants are pinned in source:
- owner = tracked TASK-32 synthetic employee
- privacy class = `MEDICAL_PRIVATE`
- provider = `R2`
- exact storage key for each attachment
- size = 92 bytes
- MIME = `application/pdf`
- SHA-256 = `42cef79776cf0d5ce63df78e172ec982c8ce1b7c6da6bd51ecfe3408d9737939`

Any DB key or invariant drift is blocked before R2 inspection.

## Read-only Probe Design

Dedicated endpoint:
`GET /api/test/task34-r2/reconcile`

The endpoint:
- accepts no attachment ID and no storage-key input
- reads only the two exact allowlisted rows
- uses only `R2PrivateObjectStore.inspectObject()`
- has no upload/finalize/delete endpoint
- returns only safe classification fields
- never returns signed URLs, storage keys, credentials or secret values.

Runtime boundary fails closed unless all conditions are true:
- `CKACE_RUNTIME_STAGE=test`
- `K_SERVICE=ckace-hr-api-test`
- `K_REVISION` begins `ckace-hr-api-test-task34r2-`
- R2 bucket = `ckace-hr-test-private`
- mounted database URL matches the known CKACE HR DEV endpoint
- live `current_database()` = `ckace_hr_dev`

## Source Changes

- `apps/api/src/task34/task34-r2.controller.ts`
- `apps/api/src/task34/task34-r2.controller.test.ts`
- `apps/api/src/task34/task34-r2.module.ts`
- `apps/api/src/app.module.ts`

No schema migration or normal business API contract was changed.

## Verification

Codex implementer:
- focused TASK-34 tests: **23 / 23 PASS**
- full gate before manager hardening: **78 files / 502 tests PASS**

Independent Development Lead:
- focused TASK-34 + TEST DB boundary: **2 files / 47 tests PASS**
- final `npm run check` task `1eb21666-a094-4b45-96d1-e1f90887b697`: **exit 0**
  - lint PASS
  - typecheck PASS
  - **78 / 78 test files PASS**
  - **505 / 505 tests PASS**
  - NestJS API build PASS
  - Next.js build PASS

## Isolated TEST Candidate

Cloud Build:
- build ID: `90284569-8e7f-44d7-b56c-8164a93f24fa`
- status: **SUCCESS**
- immutable digest:
  `sha256:1f44c67bd686bb6bf3c02a8d828a50fdad61271823bdfe8c97e6c3ef08d82e0e`

Cloud Run:
- revision: `ckace-hr-api-test-task34r2-20261014a`
- tag: `task34-r2`
- Ready = True
- Active = True
- ContainerHealthy = True
- ContainerReady = True
- TASK-34 candidate traffic = **0%**
- canonical TEST API baseline `ckace-hr-api-test-m9d15d` = **100%**

No Production or shared-traffic route changed.

## Live Reconciliation Result

The exact TEST endpoint returned HTTP 200.

Both retained TASK-32 candidates returned:

- `dbPresent=true`
- `finalized=false`
- `linked=false`
- `objectState=NOT_FOUND`
- `metadataMatches=null`
- `reconciliationClass=DB_ONLY_PENDING_OBJECT_MISSING`

Therefore both candidates are **stale DB-only attachment intents**. There is no R2 object at either exact expected key.

## Post-call Neon DEV Verification

After the live read-only probe:

- both exact attachment rows are still present
- both remain `finalizedAt = null`
- both retain the exact expected owner/privacy/provider/key/size/MIME/checksum values
- both are unlinked across:
  - `leave_request_attachments`
  - `overtime_request_attachments`
  - `medical_claim_attachments`
  - `announcement_attachments`
  - `employee_media`
- unfinalized `MEDICAL_PRIVATE` count remains **2**
- attachments created on 2026-10-14 = **0**

The reconciliation created or modified no attachment data.

## Reconciliation Disposition

For both exact IDs:

**Disposition: retain DB row until TASK-36 exact TEST cleanup; no R2 delete required.**

TASK-36 must re-check row existence, link state and R2 non-existence immediately before deleting these stale DB rows.

Do not infer this disposition for any other attachment. No blanket cleanup is authorized.

## Final Decision

**TASK-34 = PASS.**

The orphan ambiguity from TASK-32 is resolved:
- 2 stale DB-only rows
- 0 corresponding R2 objects
- 0 links
- 0 TASK-34-created attachment rows
- no destructive action taken.

Next gated task:
**TASK-35 — Responsive + State QA**

Do not start TASK-35 without explicit Owner approval.
