# M7 — HR Modules

Last Updated: 2026-10-05 Asia/Bangkok

## Status

M7 is PASS / CLOSED in DEV/TEST. Production cutover is not authorized by this milestone.

- M7.1 Identity / Profile — PASS
- M7.2 Leave / entitlement / approval — PASS
- M7.3 Attendance / check-in-out / time correction — PASS
- M7.4 Overtime — PASS
- M7.5 Medical Claim — PASS
- M7.6 Benefits — PASS
- M7.7 Request Status / approval surfaces — PASS
- M7.8 Announcements — PASS
- M7.9 Attachments — PASS
- M7.10 Notifications / admin settings — PASS
- M7.1b Pending LINE Binding / Onboarding Compatibility — PASS
- M7 final cross-module QA/docs — PASS

Module routing remains `LEGACY`. M7 did not mutate Production data, Production DNS, Production LINE/GAS configuration, or source-of-truth routing.

### Final Consolidated QA / TEST Closeout — PASS

Implemented and accepted in the final M7 wave:

- Benefits self overview combines canonical Overtime and Medical benefit/request facts without introducing a parallel source of truth.
- Request Status exposes self and assigned-approval projections with server-derived actor identity.
- Announcements support GLOBAL / AGENCY / DEPARTMENT visibility, safe attachment IDs only, actor-owned finalized `INTERNAL` attachment linking, and relation-authorized short-lived download grants. Provider keys/URLs are never business response data.
- Attachment endpoints now cover private R2 upload-intent, finalize verification, download and delete. Finalization verifies declared size/MIME/SHA-256 against the uploaded object.
- Notifications/Admin expose protected notification review/retry and safe runtime settings.
- Pending onboarding stores a modern Project B password hash, allows verified LINE binding while the account remains `PENDING`, blocks protected actor resolution until approval, then provisions ACTIVE state, EMPLOYEE role, legacy-compatible ANNUAL/PERSONAL/SICK entitlements and exactly one approval notification.

Final repository/database verification:

- `npm run check` — PASS;
- lint and all workspace typechecks — PASS;
- tests — 47 files / 274 tests PASS;
- packages/API/Next.js production build — PASS;
- `npm audit --audit-level=high` — 0 vulnerabilities;
- Prisma schema validate — PASS;
- Neon `ckace_hr_dev` — 5/5 migrations applied, schema up to date;
- new migrations `20261005_m7_attachment_finalize` and `20261005_m7_onboarding_password_hash` applied successfully.

Final TEST artifact/runtime:

- Cloud Build `675f9658-00c2-4664-a477-a8981ce1977f` — SUCCESS;
- image `m7-final-20261005b`;
- digest `sha256:2c463c601c9c9e6af3d1e24a45dd19d26bd33d731ab721868bdbca9945e6705f`;
- TEST revision `ckace-hr-api-test-00012-lwk` serves 100%;
- dedicated TEST service account preserved;
- Neon/legacy-bridge/R2 Secret Manager references preserved;
- `LINE_LOGIN_CHANNEL_ID=2011403971` and private TEST R2 bucket configuration present;
- direct Cloud Run and Firebase same-origin `/api/health` + `/api/ready` = 200/200 with database connected and `LEGACY` routing;
- signed-out Profile, Leave, Attendance, Overtime, Medical, Benefits, Request Status, Announcements and Admin settings surfaces all return 401.

Exact-final-image hosted E2E execution `ckace-hr-attendance-smoke-test-7l97f` completed successfully with marker:

`M7_FINAL_E2E_PASS benefits=200 requests_self=200 requests_assigned=200 attachment_upload=201 attachment_finalize=201 announcement_create=201 announcement_read=200 announcement_relation_download=201 generic_attachment_denied=403 admin_notifications=200 admin_retry=201 admin_settings=200 onboarding_register=201 pending_line_bind=1 pending_actor_denied=1 onboarding_approve=201 onboarding_replay=201 active_actor=1 privacy_no_provider_metadata=1 forged_headers_ignored=1`

Synthetic cleanup was verified independently after execution: employee/account/announcement/outbox/medical/overtime/attachment/agency/department/temporary-role/temporary-leave-type/temporary-benefit-policy residue counts are all zero. The reused Attendance QA job was restored to its original image, command, target URL and DB/bridge secret configuration.

Next phase: M8 Production Preparation / Rehearsal. It is NOT STARTED and remains Owner-gated; M7 does not authorize Production cutover.

### M7.5 Medical Claim — T1 Read-only Audit PASS

Verified legacy/privacy anchors:

- current live baseline: 18 MedicalClaims, 28 Medical_ApprovalSteps and 21 MedicalAttachments; 17 Approved / 1 Rejected;
- archive 2025 contains 5 ClaimIDs and all 5 collide with current IDs while representing different business records;
- 16/18 current claims have no Linked_LeaveID;
- amount is positive / <=2 decimals, effective per-claim amount is capped at 1,000, and Pending + Approved annual committed amount may not exceed 10,000;
- treatment date cannot be future;
- medical receipt attachment is mandatory; legacy validation allows up to 3 JPG/PNG/PDF files, <=2 MiB each and <=4 MiB total;
- Admin/SuperAdmin auto-approve; normal flow uses ordered server-derived approvers;
- rejection requires comment; only assigned current step may decide;
- owner delete is Pending-only;
- medical file access checks actor + claim + file + owner relation and may also allow an assigned claim approver;
- new legacy receipts are private-by-default.

Project B privacy decisions:

- claim create accepts finalized `attachmentId[]` only; no raw Base64/provider URL/storage key;
- attachment must be actor-owned, `MEDICAL_PRIVATE`, R2-backed with finalized checksum/size/mime metadata and currently unlinked;
- claim API responses expose only attachment IDs/safe display metadata;
- actual upload/finalize/download/delete endpoint integration stays M7.9;
- Project B cancellation is non-destructive canonical `CANCELLED`; automatic private-object deletion is deferred to M7.9 retention/lifecycle policy;
- existing schema is sufficient for T2; no Medical schema migration is required yet.

### M7.5 Medical Claim — T2 Contracts / Business Rules PASS

Implemented:

- `packages/contracts/src/medical.ts` with safe claim/self/approval views and no provider storage metadata;
- create contract uses finalized `attachmentId[]`, optional `leaveRequestId`, treatment date, amount, description and client key;
- `packages/business-rules/src/medical.ts` with strict ISO date / money / UUID / client-key validation;
- treatment date future guard;
- transparent legacy 1,000 per-claim cap;
- annual committed calculation where Pending + Approved consume the annual limit;
- 1–3 unique receipt references;
- legacy medical receipt boundaries: JPG/PNG/PDF, <=2 MiB each, <=4 MiB total;
- Admin/SuperAdmin auto-approval role rule;
- Pending-only cancel rule;
- approval/rejection normalization with mandatory rejection comment.

Verification:

- Medical business-rule tests: 11/11 PASS;
- contracts typecheck/lint/build: PASS;
- business-rules typecheck/lint/build: PASS.

No repository/API/migration/deploy work was performed in T2. Routing remains `LEGACY`.

### M7.5 Medical Claim — T3 Migration / Reconciliation PASS

Implemented:

- deterministic current/archive Medical claim transformer using full source-qualified provenance;
- 5/5 archive/current ClaimID reuse remains distinct and cannot collapse into one target identity;
- current Medical approval steps are pinned to current request provenance only;
- current Medical attachments are pinned to current request provenance only and carry `MEDICAL_PRIVATE`, owner, filename, upload date and legacy Drive reference-only migration state;
- Production header aliases for MedicalAttachments are supported explicitly;
- Rejected-chain downstream Pending approval steps preserve raw historical state;
- archive approval/attachment history is explicitly marked incomplete/ambiguous; current history is never attached to archive by ClaimID alone;
- reconciliation covers the M0 18 current claims / 28 steps / 21 attachments baseline, 5 archive claims / 5 ID collisions, owner/orphan/approver guards and the one ambiguous attachment-history association.

Verification:

- targeted Medical/Leave/OT migration regression: 3 files / 26 tests PASS;
- `@ckace/migration` typecheck: PASS;
- `@ckace/migration` lint: PASS;
- `@ckace/migration` build: PASS.

No repository/API/deploy work was performed in T3. Routing remains `LEGACY`.

### M7.5 Medical Claim — T4 Repository / Persistence PASS

Implemented:

- `packages/database/src/medical-repository.ts`;
- ACTIVE-account enforcement for self/create/replay/cancel/approver paths;
- current active `BenefitPolicy(key=MEDICAL)` annual-limit resolution;
- Bangkok current-year committed quota based on claim date and Pending + Approved state;
- optional Project B Leave ownership validation;
- finalized receipt validation: actor-owned + `MEDICAL_PRIVATE` + R2 + storage key + MIME + safe byte size + SHA-256 + unlinked;
- safe claim projections expose receipt ID/filename/MIME/size only and never provider key/legacy URL;
- persisted Admin/SuperAdmin roles auto-approve; normal actors use the server-resolved MEDICAL approval policy chain;
- serializable idempotent create with audit/outbox;
- canonical Pending-only cancellation without deleting attachment bytes;
- assigned current-step approval queue and atomic approve/reject advancement.

Verification:

- Medical/Leave/OT repository targeted regression: 3 files / 17 tests PASS;
- all database-source tests: 7 files / 50 tests PASS;
- `@ckace/database` typecheck: PASS;
- `@ckace/database` lint: PASS;
- `@ckace/database` build: PASS;
- package-local `npm test` is not defined for `@ckace/database`; direct Vitest was used and passed.

No API/deploy work was performed in T4. Routing remains `LEGACY`.

### M7.5 Medical Claim — T5 API / Security PASS

Implemented:

- `MedicalModule`, `MedicalController`, `MedicalService` and AppModule wiring;
- self overview/create/cancel routes with explicit `medical.self.read/write` SELF requirements;
- assigned approval queue/decision routes with explicit `medical.approve` GLOBAL requirement plus repository current-step assignment enforcement;
- server-derived requester/approver identity only;
- strict create/decision/UUID parsing;
- canonical idempotency payload excludes clientKey and any forged client authority while preserving requested amount before the 1,000 cap and sorting attachment IDs deterministically;
- repository error translation is fail-closed and does not expose storage/provider metadata;
- Medical API responses continue to expose only receipt ID/filename/MIME/size from repository safe projections.

Verification:

- targeted Medical + authorization regression: 2 files / 11 tests PASS;
- all API-source tests: 9 files / 46 tests PASS;
- `@ckace/hr-api` typecheck: PASS;
- `@ckace/hr-api` lint: PASS;
- `@ckace/hr-api` build: PASS.

No deployment/routing change was performed in T5. Routing remains `LEGACY`.

Next: M7.5-T6 TEST closeout only.

## M7.1 Identity / Profile — PASS

### Contracts and Security

Implemented `GET /api/profile/me` with:

- server-populated actor identity only;
- explicit `profile.self.read` permission;
- explicit self-target metadata resolved by the authorization guard;
- no client UID/role authority;
- fail-closed signed-out behavior;
- privacy-minimized response.

The profile response contains canonical employee/profile facts, account state, login name, organization refs, role keys, LINE-linked boolean, and attachment IDs for profile/signature media.

It deliberately does not expose:

- legacy password hashes;
- LINE user ID;
- R2 storage keys;
- legacy Drive URLs;
- provider secrets.

Account lifecycle now distinguishes `ACTIVE`, `PENDING`, `INACTIVE`, and `RESIGNED`, matching the M0 live legacy profile and the Prisma model.

### Migration / Reconciliation

Implemented `identity-profile-v1` transformer over the M6 migration engine.

Verified behavior:

- accepts only the legacy `Users` source;
- UID must match source-qualified provenance;
- explicit role map:
  - User → EMPLOYEE
  - SuperUser → SUPERUSER
  - Admin → ADMIN
  - SuperAdmin → SUPERADMIN
- explicit legacy TRUE/FALSE account state mapping;
- DD/MM/YYYY and ISO date parsing only;
- unknown role/date/status fails closed rather than guessing;
- password and LINE identifiers do not appear in migration reports;
- reconciliation checks employee count, exact legacy UID set, account-state counts, and LINE-linked count;
- mismatch results are blocking and disposition-backed.

Project A remained read-only.

### Local Verification

Latest repository QA after all M7.1 source changes:

- `npm run check` — PASS
- test files — 23 PASS
- tests — 122 PASS
- lint/typecheck/build — PASS
- npm audit — 0 vulnerabilities
- Prisma 6.12.0 validate — PASS
- source/config secret-signature scan — 0 findings

### TEST Runtime Verification

Cloud Build:

- build ID: `d8bf4116-3d17-4b4a-a096-be33ed6c5765`
- image: `m7-identity-20261005a`
- digest: `sha256:9332ec15ddb2cfd423044026b7682c746051cb3f47010ce6038695afc9eacd3c`
- result: SUCCESS

Neon rollback smoke:

- Cloud Run job: `ckace-hr-profile-smoke-test`
- execution: `ckace-hr-profile-smoke-test-sxrfh`
- marker: `M7_IDENTITY_PROFILE_DB_SMOKE_PASS safe_projection=1 rollback=1`
- synthetic data was rolled back and did not persist.

TEST API deployment:

- service: `ckace-hr-api-test`
- revision: `ckace-hr-api-test-00004-ngf`
- traffic: 100%
- dedicated TEST service account preserved
- `DATABASE_URL` Secret Manager reference preserved
- legacy bridge Secret Manager reference preserved
- `CKACE_MODULE_ROUTING=LEGACY` preserved

Firebase same-origin verification:

- `/api/health` — HTTP 200
- `/api/ready` — HTTP 200, database connected
- `/api/profile/me` signed out — HTTP 401
- authenticated synthetic E2E — PASS:
  `M7_IDENTITY_PROFILE_E2E_PASS signed=200 self=1 forged_headers_ignored=1`
- the synthetic E2E employee/account/organization rows were deleted in `finally`.

### Production Safety

M7.1 did not mutate Production data, Production DNS, LINE configuration, GAS source-of-truth, or module routing.

## M7.2 Leave / Entitlement / Approval — PASS

### Contracts and Security

Implemented and verified:

- server-derived requester identity; client-supplied employee/role headers are not authority;
- explicit `entitlementId` on create instead of ambiguous leave-type lookup;
- entitlement ownership, active leave type, and requested-period validity checked server-side;
- fail-closed SAME_AGENCY / SAME_DEPARTMENT approver scope;
- ordered approval options and selected-approver validation;
- self overview and self cancellation;
- audit log and notification outbox relationships.

### Idempotency / Business Rules

Verified:

- first create returns 201;
- exact replay with the same client key returns 201 with replay semantics;
- changed payload with the same client key returns 409;
- quota/calendar usage is calculated server-side;
- cancellation persists canonical `CANCELLED`.

### Migration / Reconciliation

Legacy audit and transformer coverage include:

- `Gs/01_LeaveRequest.js`;
- `Gs/02_Approval.js`;
- `Gs/09_UserPolicies.js`;
- `Gs/21_LineIntegration.js` and LINE leave paths;
- M0 source-qualified provenance/reconciliation contracts.

Legacy ApprovalSteps `Revise` remains preserved in raw history while the canonical approval-step state maps to `PENDING`. Request-level revision remains `REVISION_REQUESTED`. This prevents an invalid request-only status from leaking into the approval-step enum.

Historical/archive ambiguity remains explicit and is not silently repaired.

### Final Local Verification

- `npm run check` — PASS
- test files — 28 PASS
- tests — 157 PASS
- lint/typecheck/build — PASS
- npm audit — 0 vulnerabilities
- Prisma 6.12.0 validate — PASS

### TEST Runtime Verification

Final Cloud Build:

- build ID: `9c94d98c-9efa-4ca9-b9ce-8c16b106c9c3`
- image: `m7-leave-20261005c`
- digest: `sha256:3ee0fe86c96238b792e88d6352936e3b41d30adffe32b840806d40f7cb938e9f`
- result: SUCCESS

TEST API:

- revision: `ckace-hr-api-test-00007-642`
- traffic: 100%
- dedicated TEST service account preserved
- `DATABASE_URL` Secret Manager reference preserved
- legacy bridge Secret Manager reference preserved
- `CKACE_MODULE_ROUTING=LEGACY` preserved

Firebase same-origin checks:

- `/api/health` — 200
- `/api/ready` — 200
- signed-out `/api/leave/me` — 401
- signed-out `/api/leave/approval-options` — 401

Authenticated synthetic E2E:

`M7_LEAVE_E2E_PASS options=200 create=201 replay=201 conflict=409 overview=200 cancel=201 forged_headers_ignored=1`

The smoke job completed successfully and its `finally` cleanup verifies the synthetic requester is removed.

### Production Safety

M7.2 did not mutate Production data, Production DNS, LINE configuration, GAS source-of-truth, or module routing. Leave remains routed to `LEGACY`.

## M7.3 Attendance / Check-in-out / Time Correction — PASS

### T1 Read-only Audit — PASS

Authoritative legacy paths, M0 live reconciliation, Project B schema/routing and existing regression suites were reviewed without mutation.

Key preserved facts include:

- one real duplicate employee/date Attendance group with two distinct LogIDs; never auto-merge;
- nullable historical checkout is valid;
- late boundary is 09:05;
- regular work end is 17:30;
- break window is 12:00–13:00;
- 5 km radius is recorded as a classification, not a hard attendance block;
- non-workday attendance requires Approved OT;
- check-in/check-out are actor-bound, locked and idempotent;
- Time Correction is self/assigned-approver scoped, date/time validated and atomically applied with attendance mutation.

### T2 Contracts / Business Rules — PASS

Implemented:

- `packages/contracts/src/attendance.ts`;
- explicit self-overview / attendance-record / check-in / check-out contracts;
- explicit `attendanceRecordId` targeting for checkout and Time Correction to avoid date-only ambiguity on duplicate business days;
- Attendance event-source contract values `DEVICE | CORRECTION | LEGACY | UNKNOWN`;
- Time Correction create/view/cancel/decision contracts;
- `packages/business-rules/src/attendance.ts`;
- strict GPS, accuracy, clock, UUID and client-key validation;
- Haversine radius classification;
- non-workday Approved OT guard;
- 09:05 late and 17:30 early-out classification;
- regular Attendance work-minute calculation preserving legacy full-lunch deduction;
- Time Correction work-minute calculation preserving partial lunch overlap and 450-minute cap;
- future-date rejection, original-event requirement, changed-time requirement, active-duplicate guard and decision-comment rules.

Verification:

- Attendance business-rule tests: 15/15 PASS.
- `@ckace/contracts` lint/typecheck/build: PASS.
- `@ckace/business-rules` lint/typecheck/build: PASS.

Schema-gap decision:

- no Prisma migration is required in T2;
- existing `AttendanceRecord`, `AttendanceCalculation`, `AttendancePolicy` and `TimeCorrectionRequest` models remain sufficient for the next bounded layer;
- event source can be derived from migration provenance, approved correction state, or new-device write context rather than adding an unnecessary persisted source column now.

Routing remains `LEGACY`. No repository/API/runtime/deploy work was performed in T2.

### T3 Migration / Reconciliation — PASS

Implemented `packages/migration/src/attendance.ts` with two deterministic transformers:

- `attendanceRecordTransformer` accepts only `TimeLog`, verifies LogID against source-qualified provenance, converts DD/MM/YYYY + legacy clock values to Bangkok timestamps, preserves nullable checkout without inference, keeps location strings/raw comments/OT status for traceability, and maps work/OT hours to minutes plus explicit radius state;
- `timeCorrectionTransformer` accepts only `TimeCorrections`, verifies RequestID provenance, preserves raw Thai status while mapping only Pending/Approved/Rejected canonical states, requires exactly one corrected event, and emits employee/date attendance lookup metadata with `REQUIRE_EXACTLY_ONE_MATCH_OR_EXPLICIT_EXCEPTION` instead of guessing across duplicate business days.

Attendance reconciliation now verifies:

- attendance record count;
- exact employee/date count map;
- duplicate employee/date group count;
- check-in/check-out presence;
- nullable checkout count;
- total work minutes;
- check-in/check-out location presence;
- linked OT count;
- Time Correction request count/status counts;
- Time Correction missing-attendance reference count.

Known legacy conditions remain visible:

- matching duplicate business-day groups => `LEGACY_DUPLICATE_BUSINESS_DAY` EXCEPTION with `PRESERVE_DISTINCT_RECORDS_AND_REQUIRE_OWNER_REVIEW`;
- matching nullable historical checkout => `NULLABLE_HISTORICAL_CHECKOUT` EXCEPTION;
- any true source/target drift => blocking FAIL.

Verification:

- targeted Attendance/M6 migration suite: 3 files / 22 tests PASS;
- full `@ckace/migration` suite: 8 files / 61 tests PASS;
- `@ckace/migration` lint/typecheck/build: PASS.

No repository/API/runtime/deploy work was performed in T3. Routing remains `LEGACY`.

### T4 Repository / Persistence — PASS

Implemented `PrismaAttendanceRepository` with:

- ACTIVE-account enforcement for all self/approver operations;
- self Attendance overview with derived event source and explicit current-record state;
- serializable/idempotent Check-in and Check-out using Project B `IdempotencyKey`;
- explicit `attendanceRecordId` ownership and current-business-day validation;
- non-workday Approved OT enforcement and server-selected Attendance policy;
- actual OT calculation capped by approved OT segment windows and actual checkout time;
- server-side Time Correction approver fallback preserving the verified legacy User/SuperUser/Admin chain;
- Time Correction self/assigned lists, create, pending-only cancel and assigned-approver approve/reject;
- atomic Time Correction decision that updates Attendance + request + approval state + audit/outbox in one transaction;
- fail-closed duplicate-business-day and correction-date/target-record mismatch guards;
- corrected regular-work/late/early recalculation while preserving existing OT minutes, matching legacy correction semantics.

Verification:

- final database suite: 5 files / 38 tests PASS;
- final `npm run check`: 31 files / 189 tests PASS;
- lint/typecheck/build: PASS across the monorepo.

Review note:

- the independent read-only delegated reviewer exceeded the bounded Task window and was cancelled without returning a result; it is not counted as PASS evidence;
- Development Lead review caught and corrected actual-OT parity and correction target-date guards before final QA.

Compatibility risk retained for M7.3 closeout:

- older Desktop legacy could create a Time Correction when the original attendance event was missing;
- current LINE LIFF and Project B canonical path require an existing original event;
- M0 live TimeCorrections have zero missing TimeLog matches;
- routing remains `LEGACY`, so Production behavior is unchanged.

No NestJS API/runtime/deploy work was performed in T4.

### T5 NestJS API / Security — PASS

Implemented `AttendanceModule` with one bounded API surface:

- `GET /attendance/me`
- `POST /attendance/check-in`
- `POST /attendance/check-out`
- `GET /attendance/time-corrections/me`
- `GET /attendance/time-corrections/assigned`
- `POST /attendance/time-corrections`
- `POST /attendance/time-corrections/:requestId/cancel`
- `POST /attendance/time-corrections/:requestId/decision`

Security and input rules:

- Attendance self read/write routes require explicit `attendance.self.read/write` SELF permissions;
- Time Correction self routes require explicit `time_correction.self.read/write` SELF permissions;
- assigned queue and decision require `time_correction.approve` GLOBAL permission, while the repository independently verifies assignment to the actor before returning/deciding a request;
- all requester/approver identity comes from server-derived actor context;
- client `employeeId`, role and approver-like fields are not authorization authority and are excluded from canonical idempotency payloads;
- GPS values must be finite numbers and existing business-rule normalization remains authoritative;
- checkout/correction UUIDs, client keys, correction type/time/reason and decision/comment rules fail closed;
- expected business-state conflicts are translated to explicit 4xx responses rather than accidental 500s.

Verification:

- final API suite: 7 test files / 32 tests PASS;
- `@ckace/hr-api` typecheck: PASS;
- `@ckace/hr-api` lint: PASS;
- `@ckace/hr-api` build: PASS.

No TEST/Production deploy or routing change was performed in T5. Routing remains `LEGACY`.

## M7 Next Action

### T6 TEST Verification / Closeout — PASS

Final hosted evidence:

- build `06ca9f66-3426-43d0-9c6f-2bfc74c9fb76` SUCCESS;
- QA image `m7-attendance-20261005b`, digest `sha256:341418b34ab40d10e3046201ae109cef37df5792d29590c4a50c1ab26977e398`;
- TEST revision `ckace-hr-api-test-00008-wlq` at 100%;
- TEST service account, Secret Manager refs and `LEGACY` routing preserved;
- Firebase `/api/health` and `/api/ready` = 200;
- signed-out Attendance self and Time Correction self/assigned endpoints = 401;
- hosted synthetic execution `ckace-hr-attendance-smoke-test-jfnlt` completed successfully;
- marker: `M7_ATTENDANCE_E2E_PASS checkin=201 replay=201 conflict=409 checkout=201 checkout_replay=201 overview=200 correction=201 assigned=200 decision=201 forged_headers_ignored=1`;
- synthetic cleanup completed before exit 0.

M7.3 Attendance / Time Correction is closed PASS. Production remained untouched.

## M7 Next Action

Start M7.4 Overtime with read-only legacy/schema audit, then bounded contracts/rules/migration/repository/API/security/tests. Keep routing `LEGACY` and do not touch Production.
