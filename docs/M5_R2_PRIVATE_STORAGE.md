# M5 — R2 DEV/TEST Private Storage

**Status:** FUNCTIONAL / QA PASS — FORMAL CLOSURE PENDING SUPERSEDED TOKEN CLEANUP  
**Scope:** DEV/TEST only. Production storage/data remains untouched.

## Architecture

PostgreSQL/Neon remains canonical attachment metadata and ownership authority. Cloudflare R2 stores private object bytes only. NestJS/server-derived actor context remains authorization authority.

Existing privacy classes are preserved:

- `INTERNAL`
- `EMPLOYEE_PRIVATE`
- `MEDICAL_PRIVATE`
- `ADMIN_PRIVATE`

No permanent public object URL is part of the contract.

## Object / Authorization Contract

Private key shape:

`attachments/v1/{attachmentUuid}/{randomUuid}`

Keys contain no employee name, original filename, or medical/privacy label.

Authorization is fail-closed. EMPLOYEE_PRIVATE supports explicit self/global permissions. MEDICAL_PRIVATE requires medical-specific self/global permissions and is not unlocked by generic global attachment access. INTERNAL and ADMIN_PRIVATE use distinct permissions.

Signed grants are short lived:

- minimum 30 seconds
- maximum 900 seconds
- default 300 seconds

Upload metadata validates basename-only filenames, MIME syntax, positive size up to the 20 MiB baseline, and SHA-256 checksum format.

## Concrete R2 Integration

`@ckace/storage` now includes an AWS SDK S3-compatible R2 signer/client:

- S3 region `auto`
- Cloudflare R2 account endpoint
- path-style bucket access
- presigned PUT with bounded expiry and required content type
- presigned GET with bounded expiry and optional download filename
- object deletion
- credentials accepted only at runtime and never written to source

Targeted signer/storage tests: 15/15 PASS across 2 files.

## Cloudflare DEV/TEST Resources

Account:

- `Panuphan2535@icloud.com's Account`

Owner explicitly approved and activated the R2 usage-based subscription.

Bucket:

- `ckace-hr-test-private`
- Standard storage class
- Public Access: Disabled
- no permanent public URL
- empty before hosted smoke

Least-privilege token:

- intended runtime token: `ckace-hr-test-r2-v2`
- permission: Object Read & Write
- scope: only `ckace-hr-test-private`
- secret values are stored only in Secret Manager and are not recorded in this repository/document
- superseded token `ckace-hr-test-r2` remains Active pending explicit Owner approval to revoke it

## GCP Secret Boundary

Prepared secrets:

- `ckace-hr-test-r2-access-key-id`
- `ckace-hr-test-r2-secret-access-key`

Dedicated runtime identity:

- `ckace-hr-test@ckrr-leave-system-2026.iam.gserviceaccount.com`

The runtime identity has `roles/secretmanager.secretAccessor` on those two secrets.

Both prepared R2 secrets now have Version 1 ENABLED. The dedicated TEST service account reads them only through runtime Secret Manager injection.

## Hosted Smoke Harness

`packages/storage/src/r2-hosted-smoke.ts` performs:

1. generate an opaque TEST object key.
2. sign and PUT a small synthetic payload.
3. sign and GET it and verify exact bytes.
4. tamper with the signed URL path and require fail-closed denial.
5. delete the object.
6. verify the deleted object is no longer readable.
7. print only a non-secret PASS/FAIL marker.

TEST Cloud Run job:

- `ckace-hr-r2-smoke-test`
- region `asia-southeast1`
- dedicated CKACE_HR TEST service account
- non-secret env contains the R2 account ID and bucket name
- credentials are injected only from Secret Manager Version 1

## Build / Verification

Initial hosted image:

- build ID `20813345-8fdd-4fd6-9235-5ccf23ea58cb`
- tag `m5-20261005a`
- first hosted smoke `ckace-hr-r2-smoke-test-dxwcf` failed closed at signed upload HTTP 403

Corrected hosted image:

- build ID `3733f137-3794-43b9-b5c5-5fb8fef8beda`
- tag `m5-20261005b`
- digest `sha256:c88d32c1022cb1975968d4c4b7e913f64e50c00b547372527203fbf35babef56`
- Cloud Build status: SUCCESS
- hosted execution `ckace-hr-r2-smoke-test-25762`: PASS
- marker: `M5_R2_HOSTED_SMOKE_PASS upload=200 download=200 tampered=403 deleted=404`
- bucket after smoke: 0 B, Public Access Disabled

Latest repository QA:

- `npm run check` — PASS
- test files — 17 PASS
- tests — 75 PASS
- lint/typecheck/build — PASS
- npm audit — 0 vulnerabilities
- source/config secret-signature scan — 0 findings

## Remaining Acceptance Work

- obtain explicit Owner approval to revoke superseded token `ckace-hr-test-r2`.
- verify only intended token `ckace-hr-test-r2-v2` remains active for the TEST bucket.
- close the M5 durable goal and its watchdog.

## Production Safety

M5 has not changed Production R2/storage, Production data, Production DNS, LINE configuration, GAS source-of-truth or module routing. `LEGACY` remains in effect.

## Current Decision

M5 provider provisioning, implementation, hosted smoke and final QA are PASS. Formal closure waits only on explicit approval to revoke the superseded unused token `ckace-hr-test-r2` and verification that the intended v2 token is the sole active TEST credential.
