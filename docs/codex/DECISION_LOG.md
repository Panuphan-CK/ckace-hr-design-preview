# CKACE HR — Active Decisions

Updated: 2026-10-26 Asia/Bangkok

## Current implementation and TEST authority

- Codex Local is the active executor.
- The verified application baseline is source/main commit 1322ed48e98428ffd580a6ec2e8bb7cdec5132c7, released as TESTm74.
- The active continuation branch is codex/main-integration; application publication uses the explicitly named source remote.
- Production remains NO-GO until readiness gates pass and the Owner separately approves each named Production action.

## Owner decision PROD-READINESS-02 — replaced by full-system cutover

On 2026-10-26, the Owner replaced the earlier Option 2 bounded Leave-only plan:

- The target is one coordinated migration from GAS to CKACE HR for the complete employee-facing system: Leave, Attendance, time correction, OT, Medical, Attachments, Notifications, Announcements, and Reports, with identity, organization, policies, and approval data required by those modules.
- Employees should use one system after cutover. Do not plan a Leave-only split between NEW and LEGACY.
- Leave quota/balance at cutover is calculated using CKACE HR's current tenure-based entitlement rules. GAS UserPolicies/LeaveQuota is evidence for reconciliation only and is not the authoritative target balance.
- The earlier Option 2 routing (LEAVE_READ/LEAVE_WRITE=NEW with other modules=LEGACY) is superseded and must not be used as the active cutover plan.
- This is a planning decision only. It does not authorize Production data access, resource creation, data mutation, deployment, traffic/DNS/Firebase changes, LINE/LIFF changes, or cutover.

## Implementation implications

- Current module contracts expose 26 route keys across 13 modules. Current Production validation permits exactly one module pair to be NEW and rejects a multi-module full-system route state.
- CKACE_MODULE_ROUTING_STATE and ModuleRoutingGuard currently provide per-route authority context. The context is not a universal legacy/new data dispatcher: standard controllers/services can call the new database directly.
- CKACE_MODULE_WRITE_FREEZE is a per-module API write guard; coverage of every mutation, worker, notification, and external GAS trigger is not yet proven as a system-wide stop switch.
- Before rehearsal or release, design and verify one global, fail-closed system mode and a stable employee entry point. The states must be LEGACY, FROZEN/MAINTENANCE, or NEW for the whole system. Module route metadata can support audit and test coverage, but it is not sufficient by itself.
- A rollback must freeze NEW writes and side-effect workers, capture and reverse-reconcile every post-cutover change, and only then restore LEGACY. A config flip alone can lose writes. Reverse import/replay is not implemented or proven.

## Data and safety boundaries

- Use an Owner-exported, privacy-scrubbed XLSX snapshot for DEV/TEST rehearsal. Do not create a live Sheets/Drive reader for this plan.
- No XLSX importer or prior TEST workbook/run was identified in the CKACE_HR checkout or reachable repository history. infra/cloudbuild/test-release.yaml invokes ckace-hr-migrate-test, but its command is configured outside the repository and no local evidence proves it imports XLSX data. The Owner's report that real employees and Leave balances were previously loaded to TEST is not independently traceable.
- No live GAS/Sheets/Drive data, Project A repository, Production system, cloud command, deployment, credential, secret, or IAM setting was accessed or changed during this planning task.
- Full-system migration targets and proposed thresholds are planning evidence only. Production remains NO-GO.
- Secrets and real employee/medical data must not be sent in chat or committed to Git. Use an approved protected data-transfer path for any later snapshot.

## Separate Production approvals

Every future Production action needs separate explicit Owner approval, including live source export/read, production database or bucket creation, credentials/Secret Manager/IAM, migration/data mutation, system routing, deploy/traffic, DNS/Firebase, LINE/LIFF, employee notification, and rollback.
