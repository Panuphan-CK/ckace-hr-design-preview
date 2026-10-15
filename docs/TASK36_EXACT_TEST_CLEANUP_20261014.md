# TASK-36 — Exact TEST Data / R2 Cleanup

Date: 2026-10-14 Asia/Bangkok  
Project: `D:\CKACE_HR` / Project B only  
Environment: TEST / Neon DEV / TEST R2 only  
Owner approval: **GRANTED**  
Final status: **PASS**

## Goal

Remove only the exact tracked synthetic data created by TASK-29 / TASK-31 / TASK-32 and the exact TASK-32 R2 object, with fresh pre-delete attestation, dependency-safe cleanup, and post-verification.

No blanket cleanup, Production, Project A, credential expansion, shared traffic mutation, or unrelated data deletion was authorized or performed.

## Preflight

Verified before cleanup:
- Active Project = `D:\CKACE_HR`
- Neon project = `flat-tree-71711157`
- branch = `br-proud-term-b3pihnrx`
- database = `ckace_hr_dev`
- R2 bucket = `ckace-hr-test-private`
- TEST service account = `ckace-hr-test@ckrr-leave-system-2026.iam.gserviceaccount.com`
- Secret Manager references were used server-side; secret payloads were not printed or stored.
- exact cleanup ledgers were re-read from TASK-29 / TASK-31 / TASK-32 / TASK-34 evidence.

Fresh Neon DEV attestation confirmed the tracked fixture state exactly before cleanup:
- employees/accounts = 5 / 5
- roles/permissions = 4 / 24
- user roles / role permissions = 5 / 80
- Agency / Department = 1 / 1
- Leave Types / Entitlements = 3 / 6
- Approval Policies / Policy Steps = 3 / 3
- Approval Instances / Approval Steps = 7 / 7
- Leave Requests = 2
- Attendance Record / Calculation = 1 / 1
- Time Corrections = 2
- OT Requests / Segments = 2 / 2
- Attendance Policy / Weekly Rules = 1 / 7
- Benefit Policy = 1
- Medical Claims = 1
- Attachments = 3
- Medical attachment links = 1
- Announcements = 1
- Notification outbox / deliveries = 17 / 0
- Audit / Idempotency = 19 / 9
- LINE accounts = 0
- Leave Type Aliases = 0.

Fresh attachment/link attestation immediately before cleanup:
- finalized attachment `d720fb69-7654-48cb-811f-5f3d91c4c328` remained finalized and linked only to Medical claim `87d40ad6-59b2-42a7-9863-1e7767c4ce67`
- stale attachment `b77d51eb-6a95-49d8-904c-25a524ae52a5` was unfinalized and unlinked
- stale attachment `53cb60e3-a7a6-4a14-9e72-f235b5bf5dd6` was unfinalized and unlinked
- no Leave / OT / Announcement / Employee Media links existed for the three TASK-32 attachment rows.

## Cleanup Runners

Two fail-closed source runners were added:
- `packages/storage/src/task36-r2-cleanup.ts`
- `apps/api/src/task36-cleanup-job.ts`

Safety characteristics:
- exact TEST resource boundary checks
- exact ID/key allowlists
- expected global-count checks
- exact row/relation checks
- transaction rollback on DB drift
- no API route added
- no Production path
- no privilege expansion.

Focused verification:
- storage typecheck task `9ce2fa4b-c310-4d9e-bdae-6b5556103f78` = exit 0
- API typecheck task `dbb1edb6-88c6-4d48-8203-f6dc049cf70b` = exit 0
- focused ESLint task `d19af881-893e-454a-9069-47c1fceb85a4` = exit 0.

Cloud Build:
- build ID `9d021006-bfe8-4ba0-89fc-70a5e20b70a9`
- result = **SUCCESS**
- image = `task36-cleanup-20261014a`
- immutable digest = `sha256:63667016c6674674516b82eed8516c74615271b858c8f167e9442a97b05a2f66`
- build task `21a0aaaa-810d-4aeb-96a5-ebe61e9a5c47` = exit 0.

## R2 Cleanup

One-off TEST Cloud Run Job:
- job = `ckace-hr-task36-r2-cleanup`
- successful execution = `ckace-hr-task36-r2-cleanup-274f7`

The runner:
1. inspected all three exact TASK-32 keys
2. required the finalized object to exist with:
   - 92 bytes
   - MIME `application/pdf`
   - SHA-256 `42cef79776cf0d5ce63df78e172ec982c8ce1b7c6da6bd51ecfe3408d9737939`
3. required both stale keys to be NOT_FOUND
4. deleted only the finalized exact key
5. re-inspected all three keys and required all to be NOT_FOUND.

Terminal log evidence:

`TASK36_R2_CLEANUP_PASS exact_keys=3 deleted_finalized=1 stale_absent=2 post_absent=3`

Two earlier inline-job executions failed with JavaScript syntax errors before any cleanup logic executed; they caused no R2 mutation.

## Neon DEV Cleanup

One-off TEST Cloud Run Job:
- job = `ckace-hr-task36-db-cleanup`
- successful execution = `ckace-hr-task36-db-cleanup-679kb`

The DB runner re-attested the exact full synthetic fixture immediately before starting a single Prisma transaction, then deleted only the tracked TASK-29 / TASK-31 / TASK-32 dependencies in safe order.

Terminal log evidence:

`TASK36_DB_CLEANUP_PASS tracked_fixture_rows=0 identity_rbac=0 attachments=0 business=0 config=0`

## Independent Post-Verification

Development Lead read Neon DEV directly after the cleanup job.

Verified `ckace_hr_dev`:
- employees = 0
- user accounts = 0
- roles = 0
- permissions = 0
- user roles = 0
- role permissions = 0
- agencies = 0
- departments = 0
- leave types = 0
- leave entitlements = 0
- approval policies / policy steps = 0 / 0
- approval instances / approval steps = 0 / 0
- leave requests = 0
- attendance records / calculations = 0 / 0
- time corrections = 0
- OT requests / segments = 0 / 0
- attendance policies = 0
- weekly rules = 0
- benefit policies = 0
- medical claims = 0
- attachments / medical links = 0 / 0
- announcements = 0
- notification outbox / deliveries = 0 / 0
- audit logs = 0
- idempotency keys = 0
- LINE accounts = 0
- Leave Type Aliases = 0
- Employee Media = 0.

R2 was post-verified by the exact cleanup runner itself: all three exact keys were NOT_FOUND before the PASS marker was emitted.

## Traffic / Safety

Final TEST traffic re-read:
- API baseline `ckace-hr-api-test-m9d15d` = **100%**
- Web baseline `ckace-hr-web-test-m9d15a` = **100%**
- TASK candidates remain tagged/isolated with no shared traffic.

No Production resource, Project A file/data, Neon PROD, shared routing, DNS, LIFF/GAS/Gateway, real employee data, credential value, or permission set was changed.

The one-off Cloud Run Job definitions are manual-only and not scheduled. Their source runners are fail-closed after cleanup because the expected preflight data/object state no longer exists.

## Files Changed

- `packages/storage/src/task36-r2-cleanup.ts`
- `apps/api/src/task36-cleanup-job.ts`
- `docs/TASK36_EXACT_TEST_CLEANUP_20261014.md`
- continuity/gate documents updated for TASK-36 PASS.

## Final Decision

**TASK-36 = PASS.**

Exact TEST data and R2 cleanup is complete and independently post-verified.

Next gated task: **TASK-37 — Final Regression**.

Do not start TASK-37 without the next Owner approval.
