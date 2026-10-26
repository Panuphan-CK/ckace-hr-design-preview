# CKACE HR — HANDOFF

Last Updated: 2026-10-26 Asia/Bangkok

## Current state

- Active executor: Codex Local.
- Application repository: Panuphan-CK/ckace-hr, remote source.
- Current worktree: D:\CKACE_HR\.worktrees\main-integration, branch codex/main-integration. The Owner-typed D:\CKACE_HR.worktrees\main-integration path does not exist. The primary checkout D:\CKACE_HR was not modified.
- Verified application source: source/main commit 1322ed48e98428ffd580a6ec2e8bb7cdec5132c7; deployed TEST baseline is TESTm74.
- Owner's new target is a coordinated full-system GAS-to-CKACE HR cutover so employees use one system. The earlier bounded Leave-only Option 2 is superseded.
- This is a planning decision only. Production remains NO-GO until separate named Owner approval for each Production action.
- No live Sheets/Drive data, Project A repo/config, Production system, cloud command, deployment, or source-code edit was used for this documentation task.

## Prior XLSX import and current repository evidence

Owner reports that real employee records and Leave balances were previously loaded into TEST from an Owner-uploaded XLSX. I searched only this CKACE_HR checkout and its reachable repository history.

| Question | Local evidence | Finding |
| --- | --- | --- |
| Is the prior workbook checked in or present in this worktree? | No XLSX/XLS files are listed by the repository file scan. | Not found here. |
| Is there an XLSX importer or migrate job to extend? | No workbook parser or durable XLSX-to-Prisma adapter was found. infra/cloudbuild/test-release.yaml does contain a migrate-test step that updates and executes ckace-hr-migrate-test after building the API image. The job command/configuration itself is not defined in the repository, so its data-migration behavior cannot be established from local source. | No in-repo importer found. |
| What does ExcelJS do here? | apps/api/src/management/management-report-workbook.ts and overtime-report-workbook.ts build report workbooks and call writeBuffer; package-lock contains ExcelJS. | Export/report generation only, not import. |
| What migration code exists? | packages/migration/src/migration-contracts.ts defines ReadOnlyLegacySource and MigrationTargetStore contracts; source-snapshot.ts hashes snapshots; engine.ts has provenance/idempotency orchestration; module transformer files map selected source tabs. | Reuse this contract/transformer layer; add an offline XLSX source adapter and durable target adapter. No live Sheets/Drive reader is needed. |
| Can the earlier TEST import source and scope be proven? | No workbook, upload artifact, XLSX importer path, run ID, or commit evidence was found in the inspected checkout/history. The repository proves a migrate-test job is invoked by the TEST release workflow, but does not define its command or prove that it imports XLSX data. | The Owner's prior import report is recorded as Owner-provided context, not independently verified. Owner must provide the prior file/run reference to trace it exactly. |

Do not search Project A or live GAS to fill this gap. A future test snapshot should be a values-only XLSX, pseudonymized with stable keys, protected outside Git, with no credentials, direct identifiers, live Drive URLs, or real medical files. Keep export time, row counts, tab/column dictionary, timezone, history period, and workbook/per-tab hashes.

## GAS sheet to CKACE HR model inventory

The actual GAS workbook/tab list is not available in this repository. Names below are only the tab names current transformers recognize; they are not proof of today's live GAS schema. Status meanings: มี = transformer/mapping exists only; ไม่มี = no mapper found; ไม่แน่ใจ = actual source tab/columns or semantics need the Owner's workbook manifest. No row in this table claims that a runnable importer exists.

| Module / source family | GAS sheet name recognized in local code (actual tab still unverified) | CKACE HR target table/model | Status and evidence |
| --- | --- | --- | --- |
| Identity | Users | Employee, UserAccount, UserRole, LineAccount (identity_profile_bundle transform) | มี — packages/migration/src/identity-profile.ts maps Users; no durable writer or XLSX reader. Account/role fields must be deliberately filtered for privacy. |
| Organization | Company, Agency, Department, team, manager, reporting-line sheets | Company, Agency, Department, Employee.managerEmployeeId | ไม่แน่ใจ — target schema exists; no organization/crosswalk transformer was found. User transformer preserves legacy Agency/Department IDs only. |
| Roles and approval configuration | Role, role-scope, approval-policy/step sheets | Role, Permission, UserRole, RolePermission, ApprovalPolicy, ApprovalPolicyStep, ApprovalDelegation | ไม่แน่ใจ — target models exist; actual source tabs and a migration mapper were not found. Must preserve least privilege and approval order. |
| Leave catalogs and entitlement inputs | UserPolicies | LeaveType, LeaveTypeAlias, LeaveEntitlement | มี — UserPolicies maps LeaveQuota to a quota-shaped transform. Per Owner direction it is diagnostic only; the new balance must be derived from CKACE HR tenure rules and migrated use/history. LeaveType source tabs are not recognized. |
| Leave requests | LeaveRequests, LeaveRequests_2025 | LeaveRequest, ApprovalInstance | มี — packages/migration/src/leave.ts recognizes current/archive requests; approval-instance and all workflow detail need complete bundle reconciliation. |
| Leave approval history | ApprovalSteps | ApprovalInstance, ApprovalStep | มี — current ApprovalSteps transformer handles a single approver field/step data; full co-approver, decider, actor, and archived history continuity is not proven. |
| Attendance history | TimeLog | AttendanceRecord, AttendanceCalculation | มี — packages/migration/src/attendance.ts maps a record bundle; check the source work-date, timezone, corrections, duplicate-day exceptions, and target recalculation separately. |
| Time corrections | TimeCorrections | TimeCorrectionRequest, ApprovalInstance, ApprovalStep | มี — transformer exists; all source approval states/history and joins must be verified. |
| Attendance policies and calendar | Holiday, WeeklyWorkRule, AttendancePolicy, shift/schedule tabs | Holiday, WeeklyWorkRule, AttendancePolicy | ไม่แน่ใจ — target models exist; no source mapper/tab inventory was found. Needed before deriving attendance, late, and OT totals. |
| OT requests and segments | OvertimeRequests | OvertimeRequest, OvertimeSegment, ApprovalInstance | มี — packages/migration/src/overtime.ts recognizes OvertimeRequests and emits a request bundle. Source columns and attachment relations still need workbook verification. |
| OT approvals | OT_ApprovalSteps | ApprovalInstance, ApprovalStep | มี — transformer recognizes current OT_ApprovalSteps; complete/archive/co-approver history is unproven. |
| OT configuration | OT allowance, professional-role, work-rule sheets | OvertimeAllowancePolicy, ProfessionalRole, EmployeeProfessionalRole, AttendancePolicy | ไม่แน่ใจ — target tables exist; source tabs/mapping absent. |
| Medical claims | MedicalClaims, MedicalClaims_2025 | MedicalClaim, ApprovalInstance | มี — packages/migration/src/medical.ts recognizes current/archive claim tabs; preserve exact amount, status, dates, and sensitive-data class. |
| Medical approvals | Medical_ApprovalSteps | ApprovalInstance, ApprovalStep | มี — current approval transformer exists; full historical/co-approver continuity needs proof. |
| Medical attachments | MedicalAttachments | Attachment, MedicalClaimAttachment | มี — metadata/reference transform only; no file-byte copier. |
| Leave attachments | Attachments | Attachment, LeaveRequestAttachment | มี — metadata/reference transform only; no Drive-to-R2 copy. |
| OT attachment files | OT attachment tab(s) | Attachment, OvertimeRequestAttachment | ไม่แน่ใจ — target relation exists; no dedicated OT attachment-tab transformer was found. |
| General announcements | ManagerDB | Announcement, AnnouncementAttachment | มี — packages/migration/src/announcements.ts maps announcement-shaped ManagerDB rows and keeps legacy attachment references only. This is not evidence that ManagerDB is an org directory. |
| Notifications and delivery history | notification, LINE-send, inbox, trigger-log tabs | NotificationOutbox, NotificationDelivery, InAppNotification | ไม่แน่ใจ — target models exist; no source tab or transformer was found. Import pending state without sending; do not replay already-delivered messages. |
| Reports | report/summary tabs, if any | No report fact table; reports are generated from canonical module data and exported as XLSX | ไม่แน่ใจ — no source report tabs are known. Rebuild target reports after module reconciliation; do not treat a report workbook as canonical data. |
| Import audit/provenance | No GAS sheet assumed | MigrationRun, LegacyRecord, MigrationReconciliationResult, AuditLog | ไม่มี source mapping — these should be generated by CKACE HR migration/audit process, not copied from an unknown tab without a schema. |

The source tab names currently found in code are Users, UserPolicies, LeaveRequests, LeaveRequests_2025, ApprovalSteps, Attachments, TimeLog, TimeCorrections, OvertimeRequests, OT_ApprovalSteps, MedicalClaims, MedicalClaims_2025, Medical_ApprovalSteps, MedicalAttachments, and ManagerDB. Owner must provide the full actual tab manifest before calling the inventory complete.

## Rule differences to reconcile explicitly

| Domain | Current CKACE HR behavior / model | Migration rule |
| --- | --- | --- |
| Leave entitlement and remaining balance | Current target entitlement rules derive quota from employment tenure and calendar year; usage/reservations are calculated from LeaveRequest status. | Do not write GAS UserPolicies.LeaveQuota as target entitlement or opening balance. Import employmentStart and leave history; recompute with current rules. Every employee/type delta must be explained and Owner-approved. |
| Leave history and approvals | Target uses LeaveRequest + ApprovalInstance + ordered ApprovalStep, including current policy relations, co-approvers, and decision actors. | Preserve immutable legacy request IDs/status/history and map actors. Do not auto-submit pending work or replace historical approvers with the current policy. |
| Attendance and corrections | Target keeps raw AttendanceRecord, computed AttendanceCalculation, AttendancePolicy, Holiday, WeeklyWorkRule, and TimeCorrectionRequest. | Preserve raw source timestamps exactly; normalize timezone only with an approved rule. Recalculate derived values using the target policy and report deltas separately. Do not silently erase duplicate, missing checkout, or out-of-radius records. |
| OT | Target uses OvertimeRequest/OvertimeSegment linked to attendance, plus allowance/professional-role rules. | Preserve approved/requested minutes, dates, breaks, approvals, and payment inputs. Recompute only derived amounts under an approved policy; compare exact decimal totals and document rule changes. |
| Medical | Target uses BenefitPolicy and MedicalClaim with exact decimal amounts, approval state, and private attachments. | Preserve financial/request facts and workflow; apply target auto-approval/per-claim policy only prospectively unless Owner approves a historical restatement. TEST fixtures must replace real health details/files. |
| Organization and permission | Target has Company/Agency/Department, manager links, scopes, roles, permissions, and approval policies. | Build stable crosswalks first. Do not widen roles or infer manager/approval hierarchy from display names alone. |
| Attachments | Target stores protected file bytes in private R2 and metadata/relationships in Attachment/join tables; legacy Drive references are not private R2 copies. | XLSX contains metadata only. Copy approved bytes separately; compare SHA-256 and exact size, owner, privacy class, and request relation before switching the provider. |
| Notifications | Target separates NotificationOutbox, NotificationDelivery, and InAppNotification. | Migrate/preserve pending delivery state; suppress dispatch while loading; exactly-once keys prevent duplicate sends. Already-sent historical messages must never be resent. |
| Reports | Reports are generated from module facts and current rules; no report table exists. | Rebuild reports after reconciliation and compare old/new totals under explicit rule mapping; explain policy-driven differences. |

## Route authority, global switch, and rollback

The current implementation is not ready to switch all modules by configuration alone:

- packages/contracts/src/module-routing.ts defines 26 route keys across 13 modules.
- apps/api/src/routing/module-routing-config.ts defaults each key to LEGACY and enforces paired READ/WRITE values. In Production it currently requires one named module to be the only pair set to NEW; a full-system state is rejected by design.
- ModuleRoutingGuard attaches the resolved authority to the request. The standard LeaveController calls LeaveService; route context is used for write-freeze checks, not as a universal LEGACY/NEW dispatcher. The existence of CKACE_MODULE_ROUTING_STATE therefore does not prove every controller/service reads from the selected authority.
- CKACE_MODULE_ROUTING in runtime-config remains hard-locked to LEGACY. CKACE_MODULE_WRITE_FREEZE can list module write freezes, but universal route and background-worker coverage is not established.

Recommendation: use an auditable all-system mode with three fail-closed states: LEGACY, FROZEN/MAINTENANCE, NEW. Keep one stable employee entry URL. Enforce the mode at the web/API boundary, every API read and write path, scheduled/background jobs, notification dispatch, and external ingress. Keep per-module route keys as coverage/telemetry assertions, not as the sole switch. Do not allow a split authority state.

Safe cutover/rollback order:

1. Before release, implement and test the global mode, all-route coverage, worker stop/resume, and independent GAS freeze runbook. Default/invalid config must fail closed.
2. Cutover: stop GAS writes/triggers and CKACE writes; capture two identical final XLSX/supplemental-file manifests; import final deltas and reconcile every module; then set the whole system NEW and update the single employee/LIFF entry point under a separately approved Production action.
3. Rollback: set whole system FROZEN first; stop NEW writes, notification dispatch, and workers; export the post-cutover change set; replay/reconcile it idempotently to the LEGACY test/source mapping; verify 100% parity and 0 duplicates; only then restore LEGACY entry and re-enable GAS triggers.
4. If reverse replay is unavailable or parity fails, keep writes frozen/read-only and do not flip to LEGACY. A route flag flip alone is unsafe.

## PROD-READINESS-04 — Full cutover plan and measurable acceptance

Numbers below are proposed DEV/TEST rehearsal targets, not Production SLOs. Proposed full-system write freeze <=120 minutes, restore RTO <=60 minutes, rollback RTO <=60 minutes, and RPO=0 after final freeze must be ratified by the Owner before any Production use.

### 1. Sanitize and rehearse the XLSX snapshot in DEV/TEST

- Owner exports all actual GAS tabs to a values-only workbook and supplies a tab/column dictionary, stable pseudonymous IDs, source period, timezone, export time, and per-tab row counts.
- Two independent parses of an unchanged workbook produce identical workbook/per-tab SHA-256 hashes.
- 100% of declared tabs and rows are accounted for; 0 unknown tabs, duplicate source IDs, required formula-only values, unmasked direct identifiers/secrets, or live Drive links.
- Run at least 2 DEV/TEST passes: dry-run/initial import and idempotent replay. Second pass creates 0 duplicates.
- Files remain outside Git. Attachment content is synthetic/redacted in TEST; workbook references contain no private Drive URL or token.

### 2. Reconcile every module

- Shared identity/org/policy prerequisites: 100% active employees, company/team, manager, role/scope, approver, leave type, attendance policy, holiday/work-rule, OT policy, and benefit-policy references resolve; 0 orphan FKs, unauthorized role grants, or unresolved manager cycles.
- Leave: 100% in-scope request IDs, counts, statuses, dates, durations, and approval history match. Entitlements are recalculated using CKACE HR tenure policy, never copied from GAS quota. 100% per-employee/type differences are documented and Owner-approved; 0 silent quota imports.
- Attendance and Time Corrections: 100% source rows, request statuses, IDs, exact input timestamps, and required relationships are accounted for. 100% recalculated totals/differences are compared under the target timezone/policy; 0 unexplained or unapproved duplicate/missing-punch exceptions.
- OT: 100% requests, segments, approvers, status, requested/approved minutes, and money totals reconcile to source precision; 0 missing/duplicate open requests.
- Medical: 100% claim counts, statuses, amount totals (to 0.01 THB), policy/owner links, and approvals reconcile; 0 unapproved health-data exceptions.
- Attachments across all request types: 100% of in-scope bytes match exact SHA-256 and byte size; 100% owner/request/privacy metadata matches; 0 missing, public, unauthorized, duplicated, or orphan objects.
- Notifications: 100% pending/outstanding event/delivery states accounted for; 0 duplicate sends. Historical sent messages are imported only within the Owner-approved retention window or listed as an explicit exclusion.
- Announcements: 100% of in-scope records, recipient scope, and attachment links reconcile; 0 wrong-scope recipients.
- Reports: execute 12 fixed scenarios (Leave, Attendance, OT, Medical x current period, year-to-date, full history); 100% of row counts/totals match after approved rule translation, or have a signed exception; 0 unexplained deltas.
- Provenance: 100% imported/excluded rows have workbook, tab, period, stable ID, disposition, and run provenance; 0 silent drops.

### 3. Back up and restore the full DEV/TEST candidate

- Complete 2 full-system backup/restore rehearsals into an isolated recovery database and private TEST object store.
- 100% of in-scope database row counts, source provenance, and attachment object checksums match after restore.
- Proposed RPO=0 committed writes after final freeze; proposed restore RTO <=60 minutes from restore start to verified application readiness.
- Record backup IDs, restore IDs, timings, counts, hashes, operator, and health checks.

### 4. Rehearse whole-system rollback to LEGACY

- Complete 2 rollback rehearsals. Each includes at least 1 post-cutover create/update/approval mutation per in-scope module, including a file operation and a queued notification.
- Freeze NEW writes/workers first; reverse-replay the delta to the legacy test fixture; compare 100% record/status/relationship/attachment/delivery state.
- 0 lost, duplicated, or externally re-sent mutations; 100% idempotent replay and audit trail; proposed rollback completion <=60 minutes.
- Current source has no proven reverse writer to GAS. If reverse replay cannot pass, the rollback rehearsal fails and the system must remain frozen.

### 5. Prove minimum monitoring and alerts

- Probe employee web entry, API/readiness, database, private object storage, each module's synthetic read/write gate, and notification queue every 60 seconds.
- Alert after 2 consecutive failed probes; database unavailable within 1 minute; API 5xx >5% over 5 minutes with >=20 requests; P95 >2 seconds over 5 minutes; pending notification older than 5 minutes; migration/reconciliation drift >0.
- Simulate 6 failures (web entry, API, DB, R2 object, module write gate, notification backlog); 6/6 alerts reach the named on-call destination within 5 minutes and are acknowledged.
- These are proposed thresholds, not existing configured monitors or Production SLOs.

### 6. Cutover-day checklist and employee/LIFF communication

- Require separate Owner approval for live export/read, Production database/bucket/secrets/monitoring, migration, full-system switch, deploy/traffic, DNS/Firebase, LINE/LIFF, employee notice, and rollback.
- Confirm 0 open P0/P1 issues, 0 unapproved exceptions, two identical final source manifests, 100% pre-cutover reconciliation, and passing restore/rollback evidence.
- Freeze all GAS and CKACE writes, schedules/triggers, notification sends, and file mutations; complete final delta. Proposed entire-system write freeze <=120 minutes, subject to Owner ratification.
- Update the single stable employee entry point to CKACE HR only after the global NEW mode passes all 13 module smoke routes. Verify all 26 paired route keys agree with the approved full-system state; 0 route remains split or unguarded.
- Run 13/13 module smoke bundles for identity/org, Leave, Attendance, Time Corrections, OT, Medical/Benefits, Attachments, Notifications, Announcements, Reports, Request Status, Admin, and Onboarding. Each bundle includes its relevant role allow/deny, one synthetic read, and one approved TEST write.
- HR communications owner publishes an in-app notice to 100% of active accounts and schedules the employee notice before the window. In LINE rehearsal, dispatch to synthetic test recipients only; proposed success >=99%, with 100% of failures in a fallback list. No real Production employee message is sent without separate approval.
- LINE Developers/LIFF owner points the employee LIFF entry to the approved CKACE HR LIFF URL and verifies login/return path; GAS admin disables old write endpoints/triggers and duplicate notifications. CKACE HR operations verifies matching LINE login/channel/notification config through the secure approved process. No Project A code/config is edited by this task.
- If any gate fails or freeze exceeds the approved cap, remain FROZEN and follow the approved rollback sequence; do not let employees write to two systems.

## Owner access/resources by phase

| Priority / phase | Owner action or resource | Boundary |
| --- | --- | --- |
| P1 / before importer | Supply full sanitized XLSX snapshot through a protected local path, with every sheet, tab/column dictionary, stable pseudonymous keys, periods/timezone, export timestamp, and counts. Also provide the earlier TEST workbook reference or job/run/build ID if exact lineage is needed. | No unredacted medical/employee data, secrets, credentials, or live file URLs in chat/Git. No live GAS read in this task. |
| P1 / mapping | Confirm source crosswalks and in-scope periods for org/manager/role/approver, holidays/work rules, Leave history, OT/benefit policies, attachments, notification retention, and report filters. | Leave quota is explicitly derived from CKACE HR tenure rules; GAS quota is diagnostic. Exceptions need a named Owner approver. |
| P1 / rehearsal gates | Ratify proposed full-system freeze <=120m, restore/rollback RTO <=60m, RPO=0 after freeze, alert thresholds, and whether an all-module TEST database/R2 rehearsal may write. | DEV/TEST only; no cloud action in this planning task. |
| Later / operations | Name GAS administrator, LINE Developers/LIFF administrator, CKACE HR database/runtime operator, HR communications owner, rollback operator, and on-call recipient. Provide a safe TEST channel and synthetic accounts. | Each Production action still requires separate Owner approval. |
| Later / Production | If separately approved: dedicated ckace_hr_prod database, private ckace-hr-prod-private bucket, backups/restore, monitoring, least-privilege identities, and securely configured runtime credentials. | No resources, credentials, or permissions were created/accessed here. Production remains NO-GO. |

## Owner next actions (priority order)

1. Provide the sanitized complete XLSX snapshot and manifest via a protected local path; do not commit the workbook.
2. If the previous TEST upload must be traced, provide its workbook reference or run/build identifier. No in-repository importer/workbook/run evidence was found.
3. Confirm crosswalk, history window, target policy details, attachment/notification retention, and named exception approver.
4. Ratify the proposed freeze/RTO/RPO and alert thresholds before a Production gate.
5. Name the future GAS, LINE/LIFF, CKACE operations, employee communications, and on-call owners.

## Current risks

- Actual GAS tab names, columns, formulas, periods, and rule semantics are unknown until the Owner supplies a sanitized workbook manifest.
- The claimed previous XLSX TEST import cannot be traced to a checked-in file/job/run from this repo/history.
- No XLSX importer, durable database target adapter, full org/policy mapper, bulk file-byte copier, system-wide dispatcher/switch, or reverse-to-GAS writer has been demonstrated in current CKACE_HR source.
- Current Production module routing intentionally rejects multiple module pairs set to NEW; all-module mode and end-to-end dispatch must be implemented/tested first.
- Proposed thresholds are not approved Production SLAs. Production remains NO-GO; no Production access/action was performed.

## Next active task

PROD-READINESS-05 — Sanitized XLSX import tooling + full-module DEV/TEST rehearsal. Begin only after the Owner supplies the sanitized workbook/manifest and mapping decisions. No cloud/TEST job execution unless separately requested under the TEST build process.

## Safety rules

Preserve uncertain Local work. Do not reset, clean, stash, discard, rebase, or force-push. Do not edit the primary D:\CKACE_HR checkout for this task. Do not inspect Project A or query live GAS. Do not touch Production, Secret Manager, IAM, gateways, project settings, protected design, or LINE configuration without the required separate approval.
