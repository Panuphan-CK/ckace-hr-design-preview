# TASK-32 — Medical + Private R2 E2E

Date: 2026-10-08 Asia/Bangkok  
Project: `D:\CKACE_HR` / Project B only  
Environment: TEST only  
Verdict: **PASS**

## Scope

TASK-32 proves the live synthetic Medical receipt lifecycle on the isolated TEST API candidate without changing baseline traffic, Production, Neon PROD, Project A, LIFF/GAS/Gateway, Firebase shared routing, or normal session authorization.

## Runtime Candidate

- Service: `ckace-hr-api-test`
- Revision: `ckace-hr-api-test-task32r2-20261008d`
- Tag: `task32-r2`
- Immutable image digest: `sha256:04cf3bdec5ffb6c22787207dbd94fa7ec4aeeec386c0d31c625d24c0b600ecaf`
- Revision conditions: Ready=True, Active=True, ContainerHealthy=True, ContainerReady=True
- API baseline `ckace-hr-api-test-m9d15d` = 100%
- `task32-r2` candidate = 0%
- Web baseline `ckace-hr-web-test-m9d15a` = 100%
- Web WD candidates = 0%
- No traffic mutation was performed.

## Live E2E Evidence

Cloud Run request evidence on the exact TASK-32 revision proves:

1. TEST fixture creation succeeded.
2. Private upload intent succeeded.
3. A synthetic PDF receipt was uploaded to private R2.
4. Ambiguous finalize returned the intended HTTP 503 after persisted finalize.
5. Retrying normal finalize with the **same attachment ID** returned success.
6. Before a claim existed:
   - owner Employee download = allowed
   - Superuser approver = denied
   - unrelated Admin = denied
7. Medical claim create succeeded.
8. Exact replay with the same client key returned success without another claim.
9. Changed payload with the same client key returned HTTP 409.
10. Assigned Superuser saw the pending Medical claim.
11. While assigned:
    - owner Employee download = allowed
    - assigned Superuser download = allowed
    - unrelated Admin = denied
12. Claim approval succeeded.
13. After approval:
    - assigned queue became empty
    - owner Employee remained allowed
    - former assigned Superuser was denied
    - unrelated Admin remained denied

This post-approval result matches current repository authorization policy: assignment-based access ends when the pending approval step is consumed.

## R2 CORS Verification

The runtime R2 object credential can read/write objects but cannot call bucket-level `GetBucketCors` / `PutBucketCors`; those management calls return Cloudflare `403 AccessDenied`. No credential scope was broadened and no safety control was bypassed.

CORS was instead verified functionally through real Cloudflare R2 preflight on the private object endpoint:

- HTTP 204
- exact allowed origin: TASK-32 TEST API origin
- allowed methods: `PUT, GET, HEAD`
- allowed request header: `content-type`
- max age: 3600

Therefore bucket-level CORS **management/introspection is unavailable to this least-privilege token**, while the required runtime CORS behavior is verified and working.

## Byte / Checksum Verification

Finalized private object download:
- HTTP 200
- MIME: `application/pdf`
- size: 92 bytes
- SHA-256: `42cef79776cf0d5ce63df78e172ec982c8ce1b7c6da6bd51ecfe3408d9737939`

Downloaded bytes match the fixed TASK-32 receipt fixture and database metadata. Signed URLs are intentionally not recorded.

## Neon DEV Post-State

Target verified earlier by TASK-28:
- project: `flat-tree-71711157`
- branch: `br-proud-term-b3pihnrx`
- database: `ckace_hr_dev`

### Finalized attachment used by Medical claim

- attachment ID: `d720fb69-7654-48cb-811f-5f3d91c4c328`
- R2 key: `attachments/v1/d720fb69-7654-48cb-811f-5f3d91c4c328/ed8a612f-3daf-44ce-b094-ec7d1b205a5b`
- finalized: yes
- claim ID: `87d40ad6-59b2-42a7-9863-1e7767c4ce67`

### Approval

- policy: `32000000-0000-4000-8300-000000000001`
- policy step: `32000000-0000-4000-8301-000000000001`
- approval instance: `1653f10e-5462-47f8-a000-38145d3fecd7`
- approval step: `d40050df-7890-41be-9d25-a98f98322355`
- final claim status: `APPROVED`
- final approval instance/step status: `APPROVED`

### Idempotency / notification / audit

- idempotency row: `80be6278-eab2-43ff-89a5-e81eec5fc207`
- client key: `task32-medical-claim-0001`
- result reference: claim `87d40ad6-59b2-42a7-9863-1e7767c4ce67`
- outbox CREATED: `dd67e93a-7c0e-44ac-a272-0e00468cccef`
- outbox APPROVED: `b2f322ad-f69f-421f-8804-896adad4f41b`
- audit MEDICAL_CREATE: `0f3ec116-82c9-4028-8338-058816f51982`
- audit MEDICAL_APPROVE: `46c75bce-45ba-44ac-9c03-79d54822d162`

Only one TASK-32 Medical claim and one Medical-create idempotency result exist, confirming replay did not duplicate the business write.

## Exact TASK-32 Cleanup Ledger for TASK-36

Do **not** delete during TASK-32. TASK-36 must verify each exact row/object before dependency-safe cleanup.

Finalized/linked:
- attachment `d720fb69-7654-48cb-811f-5f3d91c4c328`
- R2 key `attachments/v1/d720fb69-7654-48cb-811f-5f3d91c4c328/ed8a612f-3daf-44ce-b094-ec7d1b205a5b`
- claim `87d40ad6-59b2-42a7-9863-1e7767c4ce67`
- approval instance/step and related idempotency/outbox/audit IDs listed above.

Unfinalized upload intents observed and retained:
- attachment `b77d51eb-6a95-49d8-904c-25a524ae52a5`
  - key `attachments/v1/b77d51eb-6a95-49d8-904c-25a524ae52a5/cb578239-3c70-4911-85f9-ec0b2d0ec32f`
- attachment `53cb60e3-a7a6-4a14-9e72-f235b5bf5dd6`
  - key `attachments/v1/53cb60e3-a7a6-4a14-9e72-f235b5bf5dd6/a1db0feb-1b6b-4346-9d2e-0156d30c7044`

Both DB rows have `finalizedAt = null` and owner download correctly fails with `Attachment is not finalized`. R2 object existence for these two keys must be checked individually during orphan reconciliation/cleanup; never infer existence from the DB row and never blanket-delete the bucket.

The fixed TASK-32 Medical approval policy/step are also cleanup candidates only after dependency-safe verification:
- `32000000-0000-4000-8300-000000000001`
- `32000000-0000-4000-8301-000000000001`

## Final Repository Verification

Fresh final command: `npm run check`

Result: **PASS, exit 0**
- lint PASS
- typecheck PASS
- 77 / 77 test files PASS
- 474 / 474 tests PASS
- NestJS API build PASS
- Next.js production build PASS

TASK-32-specific controller tests: 6/6 PASS.

## Known Limitation

The object credential intentionally lacks bucket-level CORS administration permissions. `/api/test/task32-r2/cors` and `/ensure-cors` therefore cannot introspect or change bucket CORS. This is **non-blocking for TASK-32** because real R2 preflight proves the required exact-origin/method/header behavior is already active. Any future change to bucket CORS permissions/configuration is a separate security/credential decision and must not be performed implicitly.

## Final Decision

**TASK-32 = PASS.**

No TASK-33 work is authorized by this result. Wait for explicit Owner approval before starting TASK-33.
