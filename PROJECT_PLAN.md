# CKACE HR — PROJECT PLAN

Last Updated: 2026-10-26 Asia/Bangkok

## One active TASK

PROD-READINESS-04 — DEV/TEST Leave migration rehearsal from approved sanitized source is READY AFTER OWNER INPUT, P1. The Owner selected a planning-only bounded Leave cutover: LEAVE_READ/LEAVE_WRITE=NEW, all other modules=LEGACY. Production remains NO-GO.

## Verified baseline and completed gates

1. Unified source at commit 1322ed48e98428ffd580a6ec2e8bb7cdec5132c7 was published to source/main and released as TESTm74.
2. Cloud Build 3830ed94-07c4-49b5-a7e3-adaa073abd48 passed; TEST API/Web traffic and public health, plus Firebase Hosting, were verified.
3. TESTm74 Leave workflow LEV-0024 passed Employee submission, Manager step 1, SuperAdmin step 2, and Employee final-state/notification checks.
4. Role/NAV/direct-URL and 390px responsive navigation/render checks passed for the documented Employee, Manager, and SuperAdmin scope. This is not a complete transaction test of every non-Leave module.
5. Local-only Production readiness assessment and bounded Leave cutover evidence plan are complete. No Production system, Project A source, or live GAS data was accessed.

## Owner-selected target boundary

- LEAVE_READ=NEW and LEAVE_WRITE=NEW.
- All other module routes remain LEGACY, including IDENTITY.
- Production route state must also declare CKACE_PRODUCTION_CUTOVER_MODULE=LEAVE. The separate global CKACE_MODULE_ROUTING setting remains LEGACY.
- This is a planning decision only; no Production resource, environment, data, or deployment change is approved.

## Leave cutover source gaps

- The migration package has a ReadOnlyLegacySource contract and deterministic snapshot hashing but no concrete Sheets/Drive reader. MigrationTargetStore is a contract; the only implementations found are test stores. Module route configuration exists, but the standard LeaveController does not dispatch by the route authority; end-to-end source switching is not proven.
- identityProfileTransformer maps Users into an identity/profile bundle and retains legacy agency/department identifiers, but there is no Company/Agency/Department transformer or production persistence path.
- Leave transformers map UserPolicies, current/archive request rows, current approval steps, and current attachment metadata. The attachment transformer explicitly keeps LEGACY_DRIVE references; no Drive-to-R2 bulk-copy importer was found.
- Current migration reconciliation compares aggregate counts/totals, not per-employee entitlement/balance equality. A current calendar-year/no-carry-over policy exists in local business rules, but equivalence to the live legacy policy is unverified.
- Pending status/step mapping exists, but ApprovalInstance, co-approver and decider mappings, an end-to-end importer, and full open-request reconciliation were not demonstrated. Archived approval history can be marked as an exception.
- CKACE HR LIFF calls the CKACE HR same-origin API, and CKACE HR has its own LINE login/push code. The live APP_LEAVE_GAS web-app target, LINE Developers configuration, and Project A notification routing are unknown from this repository.
- CKACE API module freeze is configurable, but it does not freeze GAS/Sheets/Drive writers or Project A triggers. Leave attachments and notifications also use separately keyed routes; validate these dependencies while preserving the Owner-selected module boundary.
- Current source has a plan-only reset for imported targets, not a proven post-cutover write-back/rollback adapter to LEGACY.

## Proposed measurable acceptance targets

These values are rehearsal targets, not approved Production SLAs:
- Sanitized snapshot: 2 unchanged reads produce identical hashes; 100% manifest coverage; 0 unmasked direct identifiers/secrets.
- Reconciliation: 100% exact counts/statuses/relationships; balance delta <=0.01 day per employee/type; 0 unexplained mismatches and 0 unapproved exceptions.
- Backup/restore: 2 successful DEV/TEST rehearsals, 100% restored row/hash checks, proposed RPO=0 committed writes after freeze, proposed RTO<=60 minutes.
- Rollback: 2 successful DEV/TEST rehearsals including post-cutover request/approval writes; 0 missing/duplicate records; replay/reconciliation 100%.
- Freeze/cutover: 3 rehearsal runs with Leave writes frozen for <=60 minutes; 0 source drift after the final frozen snapshot; 100% route and smoke checks pass.
- Monitoring: 60-second health/readiness probes; alert after 2 consecutive failed probes; 5xx rate >5% for 5 minutes; P95 latency >2 seconds for 5 minutes; 4/4 simulated alert types delivered to on-call within 5 minutes.

## Owner resources and approval gates

- Before DEV/TEST: approved sanitized export, tab/column dictionary, source-of-truth rules for quotas/history, and a test-only source fixture. No live GAS access is needed for the current documentation task.
- For DEV/TEST execution: disposable target database and private TEST R2 write/read access; service credentials must use the approved secure configuration path.
- For a future cutover: read-only Sheets/Drive access for final extraction; a named Project A/GAS owner to disable all Leave writes/triggers and authorize rollback replay; an identified LINE/LIFF configuration owner; an on-call recipient and approved alert thresholds.
- Production provisioning (database ckace_hr_prod, private bucket ckace-hr-prod-private), secrets, IAM, monitoring, backup policy, and any Production access/action each require the relevant separate Owner approval. No secrets in chat.

## Next action

Owner provides the approved sanitized snapshot and data dictionary and confirms the proposed freeze/RTO/RPO limits. Then begin PROD-READINESS-04 in DEV/TEST only. Production remains NO-GO.