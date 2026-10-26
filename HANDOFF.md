# CKACE HR — HANDOFF

Last Updated: 2026-10-26 Asia/Bangkok

## Current state

- Active executor: Codex Local.
- Application repository: Panuphan-CK/ckace-hr, remote source.
- Current worktree: D:\CKACE_HR\.worktrees\main-integration, branch codex/main-integration. The Owner-typed D:\CKACE_HR.worktrees\main-integration path does not exist. The primary checkout D:\CKACE_HR was not modified.
- Verified application source: source/main commit 1322ed48e98428ffd580a6ec2e8bb7cdec5132c7; deployed TEST baseline is TESTm74.
- Owner's new target is a coordinated full-system GAS-to-CKACE HR cutover so employees use one system. The earlier bounded Leave-only Option 2 is superseded.
- This is a planning decision only. Production remains NO-GO until separate named Owner approval for each Production action.
- Local implementation is prepared on `codex/main-integration`: XLSX read-only source, deterministic import dispatch, in-memory target, DEV-only Prisma target, global API `ACTIVE`/`READ_ONLY` write mode, and rehearsal scripts are implemented.
- The Owner-supplied sanitized workbooks and manifest are in `D:\CKACE_HR_snapshot`, outside the repository. No workbook or row values were committed.
- In-memory run of the supplied snapshot accounted for all 5,269 rows: 5,232 imported, 35 explicitly skipped, 2 conflicting attendance rows rejected, 0 unaccounted rows, and 0 ambiguous writes. Aggregate evidence is in `docs/migration/evidence/sanitized-xlsx-in-memory-20261026.json`.
- The snapshot has one conflicting `TimeLog.LogID` group with two rows. Both are rejected with `ATTENDANCE_DUPLICATE_SOURCE_LOG_ID`; neither is selected. Owner/reviewer must reconcile or replace those source rows before accepting zero rejections.
- Final local verification passed: lint, workspace typecheck, 115 Vitest files / 824 tests, package build, API build, Prisma validation, and rehearsal script syntax.
- No disposable local PostgreSQL database was available. The DB import, current-policy resolution, Pending reconciliation against real target rows, backup/restore timings, and reset rehearsal have not run. Reviewer entry point: `docs/migration/RUN_REHEARSAL.md`.
- This write-freeze mode does not implement a universal LEGACY/NEW data dispatcher or a reverse writer to GAS. Full authority switching and rollback parity remain future gates.
- Snapshot attachment links are redacted and no file bytes are supplied; notification/LINE logs, chat, settings, announcements, and report extracts are excluded or absent from the manifest. Their migration is not proven by the current importer.
- No live Sheets/Drive data, Project A repo/config, Production system, cloud command, or deployment was accessed or changed.

## Prior TEST import provenance and current importer

Owner reports that real employee records and Leave balances were previously loaded into TEST from an uploaded XLSX. That old run remains untraced. The current rehearsal importer is a new, reproducible path based on the sanitized Owner snapshot.

| Question | Local evidence | Finding |
| --- | --- | --- |
| Is the earlier workbook/run present in this worktree? | No prior workbook, upload artifact, run ID, or commit evidence was found. | Old TEST import provenance remains unverified; exact tracing is not required for this new importer. |
| Does the current branch contain an XLSX importer? | `packages/migration/src/xlsx-source.ts`, `xlsx-import.ts`, `prisma-target-store.ts`, and `in-memory-target-store.ts`. | Yes; local DEV-only path, not DB-rehearsed yet. |
| What is persisted? | `PrismaMigrationTargetStore` writes domain rows, `MigrationRun`, source-qualified `LegacyRecord` hashes, and reconciliation outcomes. | Idempotent provenance comparison is implemented; actual DB behavior awaits reviewer run. |
| How are approval Pending requests handled? | `pending-approval-handoff.ts` and policy resolution in `prisma-target-store.ts`. | Decided history is retained; old Pending assignments are replaced by current-policy Pending steps; changed IDs are reported for HR. Missing/self-only routes stay Pending with an exception. |
| What does ExcelJS do now? | Existing report workbook generation remains; `xlsx-source.ts` also parses the Owner's two snapshot workbooks. | Both export and import paths exist. |

Do not search Project A or live GAS to fill remaining gaps. Preserve the supplied snapshot outside Git. Evidence files contain aggregate counts, stable source IDs, hashes, and exception codes only.

## GAS sheet to CKACE HR model inventory

The Owner-supplied sanitized manifest now provides the snapshot tab names, columns, and row counts for the listed export. Status meanings: มี = importer/transformer exists; ไม่มี = no source/import mapping; ไม่แน่ใจ = target policy, source semantics, or data needed for acceptance remains unverified. Live GAS was not read.

| Module / source family | GAS sheet name recognized in local code (actual tab still unverified) | CKACE HR target table/model | Status and evidence |
| --- | --- | --- | --- |
| Identity | Users | Employee, UserAccount, UserRole | มี — `identity-profile.ts` + Prisma target store create identity/account/role; role catalog must already be seeded; no passwords or LINE/profile IDs are imported from this sanitized manifest. |
| Organization | Agency, Departments | Company, Agency, Department, Employee | มี — `organization.ts` uses the Owner company crosswalk. Manager/reporting-line sheet is absent from this manifest. |
| Roles and approval configuration | Users.Role; no policy sheet | Role, UserRole, ApprovalPolicy, ApprovalPolicyStep | ไม่แน่ใจ — user role assignments are mapped, but role catalog and target approval policies must be supplied from an Owner-approved non-Production baseline; GAS Agency approver columns are ignored. |
| Leave catalogs and entitlement inputs | UserPolicies | LeaveType, LeaveEntitlement | มี — imports target quotas from CKACE HR 2026 tenure rules; GAS LeaveQuota is only comparison evidence. |
| Leave requests | LeaveRequests, LeaveRequests_2025 | LeaveRequest, ApprovalInstance | มี — XLSX dispatcher and Prisma target writer import current/archive requests; DB reconciliation remains pending. |
| Leave approval history | ApprovalSteps | ApprovalInstance, ApprovalStep | มี — decided steps are retained. Pending source assignments are skipped and current target-policy steps are generated; changed next approvers require HR review. |
| Attendance history | TimeLog, TimeLog_2025 | AttendanceRecord | มี — raw punches import; legacy WorkHours/OT_Hours are ignored. Target calculation/reconciliation remains pending. |
| Time corrections | TimeCorrections | TimeCorrectionRequest, ApprovalInstance, ApprovalStep | มี — record and decided approver history map; a Pending approval uses the current target policy at finalization. Attendance links require exact resolution. |
| Attendance policies and calendar | Holidays, DayOfWeek | Holiday, WeeklyWorkRule, AttendancePolicy | มี — holiday/weekly work-rule rows map; AttendancePolicy/shift source is absent, so calculation rules must be provisioned separately. |
| OT requests and segments | OvertimeRequests | OvertimeRequest, OvertimeSegment, ApprovalInstance | มี — request/segment transformer and durable target writer exist; numeric DB reconciliation remains pending. |
| OT approvals | OT_ApprovalSteps | ApprovalInstance, ApprovalStep | มี — decided steps import; pending steps route through the current target policy after import. |
| OT configuration | OT allowance, professional-role, work-rule sheets | OvertimeAllowancePolicy, ProfessionalRole, EmployeeProfessionalRole, AttendancePolicy | ไม่แน่ใจ — target tables exist; source tabs/mapping absent. |
| Medical claims | MedicalClaims, MedicalClaims_2025 | MedicalClaim, ApprovalInstance | มี — current/archive claim rows and approvals are mapped; DB reconciliation remains pending. |
| Medical approvals | Medical_ApprovalSteps | ApprovalInstance, ApprovalStep | มี — decided history imports; Pending routes use the target policy, with unresolved cases held for HR. |
| Medical attachments | MedicalAttachments | Attachment, MedicalClaimAttachment | ไม่แน่ใจ — source rows exist but URLs are redacted and no file bytes are supplied; importer records an explicit unavailable-bytes exception. |
| Leave attachments | Attachments | Attachment, LeaveRequestAttachment | ไม่แน่ใจ — source rows exist but URLs are redacted and no file bytes are supplied; no R2 object is created. |
| OT attachment files | None in supplied manifest | Attachment, OvertimeRequestAttachment | ไม่มี — no OT attachment source sheet/bytes in the supplied snapshot. |
| General announcements | ManagerDB | Announcement, AnnouncementAttachment | มี — packages/migration/src/announcements.ts maps announcement-shaped ManagerDB rows and keeps legacy attachment references only. This is not evidence that ManagerDB is an org directory. |
| Notifications and delivery history | Excluded LINE/chat tabs; no notification sheet | NotificationOutbox, NotificationDelivery, InAppNotification | ไม่มี — manifest explicitly excludes LINE/chat history. No delivery state is imported or replayed; verify new-system notifications separately. |
| Reports | No report tab | No report fact table; reports are generated from canonical module data and exported as XLSX | ไม่มี — reports must be regenerated from reconciled canonical data; report scenario checks are still outstanding. |
| Import audit/provenance | No GAS sheet assumed | MigrationRun, LegacyRecord, MigrationReconciliationResult, AuditLog | ไม่มี source mapping — these should be generated by CKACE HR migration/audit process, not copied from an unknown tab without a schema. |

The supplied manifest includes the workbook tabs processed by `xlsx-source.ts`, plus excluded zero-row `LineServiceAttachments`. `ManagerDB` is explicitly excluded by this manifest. Notification/LINE state, approval-policy source, AttendancePolicy/shift source, OT policy source, and report exports are absent or excluded.

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
- `CKACE_SYSTEM_WRITE_MODE=READ_ONLY` now freezes every tagged write route, denies unclassified POST/PUT/PATCH/DELETE requests, and stops/refuses notification and Task36 cleanup writes. Missing/`ACTIVE` mode preserves existing TEST behavior; invalid values fail closed. Migration writes require `CKACE_MIGRATION_JOB=YES` and a local `ckace_hr_dev` DATABASE_URL.
- This implements a system-wide write freeze only. `CKACE_MODULE_ROUTING` remains hard-locked to LEGACY; universal LEGACY/NEW data dispatch, GET/read authority switching, external GAS ingress freeze, and reverse-to-GAS replay remain unimplemented/unproven.

For a future full cutover, add an auditable all-system authority state with LEGACY, FROZEN/MAINTENANCE, and NEW. Keep one stable employee entry URL. Enforce authority at every API read/write path, scheduled/background job, notification dispatch, and external ingress. Per-module route keys remain coverage/telemetry assertions, not the sole switch. Do not allow a split authority state.

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
| P1 / reviewer DB rehearsal | Reviewer provisions disposable loopback PostgreSQL `ckace_hr_dev`, sets `DATABASE_URL` privately, and supplies the target role catalog plus active approval policies from an Owner-approved non-Production baseline. | No URL/secret in chat or Git. Never use remote, TEST, or Production DB. Do not copy GAS approval columns into the target policy. |
| P1 / attachment gap | Owner supplies actual file bytes and a safe manifest/checksum through a protected local path if all historical attachments must move. | Current snapshot redacts links and contains no bytes; do not infer or download from GAS/Drive. |
| P1 / approval handoff | HR reviews every changed next approver in generated evidence and resolves all no-approver/self-only cases. | Pending counts must match exactly; no auto-approval or silent stage skip. |
| Later / rehearsal gates | Ratify proposed full-system freeze <=120m, restore/rollback RTO <=60m, RPO=0 after freeze, and alert thresholds before a Production gate. | These are not approved Production SLAs; DEV only in the current review run. |
| Later / operations | Name GAS administrator, LINE Developers/LIFF administrator, CKACE HR database/runtime operator, HR communications owner, rollback operator, and on-call recipient. Provide a safe TEST channel and synthetic accounts. | Each Production action still requires separate Owner approval. |
| Later / Production | If separately approved: dedicated ckace_hr_prod database, private ckace-hr-prod-private bucket, backups/restore, monitoring, least-privilege identities, and securely configured runtime credentials. | No resources, credentials, or permissions were created/accessed here. Production remains NO-GO. |

## Owner next actions (priority order)

1. Owner/reviewer resolves or supplies a corrected sanitized snapshot for the conflicting attendance `LogID` group; keep both rows rejected until then.
2. Reviewer provisions the temporary database and ensures role and approval-policy seed comes from an approved current non-Production target baseline; no policy is inferred from GAS approval columns.
3. Reviewer runs the temporary database rehearsal in `docs/migration/RUN_REHEARSAL.md`, then returns evidence counts, pending approvals report, backup/restore/reset timings, and exception list.
4. Owner supplies safe attachment bytes if all historical file retention is required.
5. HR reviews changed approver IDs and resolves all pending route exceptions.
6. Before any Production gate, separately ratify RTO/RPO/freeze thresholds and name future operations/LINE/communications/on-call owners.

## Current risks

- The sanitized manifest establishes the supplied snapshot's tabs/columns, but does not prove future live GAS schema changes or every formula/rule semantic.
- The claimed previous XLSX TEST import cannot be traced to a checked-in file/job/run from this repo/history.
- One sanitized TimeLog ID collision group (two rows) remains a source exception; it is intentionally not imported until reconciled.
- DB-backed import and Pending route reconciliation, backup/restore/reset timings, and DB evidence are unverified because no local DEV database is available.
- Attachment bytes are absent; Notifications/LINE history, chat, and settings are excluded; Announcements and Reports are not source tabs in the supplied manifest.
- Target role catalog and active module approval policies must be provisioned in the temporary DEV database; checked-in schema migrations do not seed business approval policies.
- `READ_ONLY` is a verified write freeze only; full-system LEGACY/NEW read/write dispatch and reverse-to-GAS writer remain unimplemented/unproven. Current Production routing intentionally rejects multiple module pairs set to NEW.
- Proposed thresholds are not approved Production SLAs. Production remains NO-GO; no Production access/action was performed.

## Next active task

PROD-READINESS-05R — Reviewer-run disposable DEV database rehearsal. Reconcile the two colliding TimeLog rows, then run the prepared importer against loopback `ckace_hr_dev`, review Pending handoff and row accounting, capture restore/reset timings, and resolve exceptions. Production remains NO-GO.

## Safety rules

Preserve uncertain Local work. Do not reset, clean, stash, discard, rebase, or force-push. Do not edit the primary D:\CKACE_HR checkout for this task. Do not inspect Project A or query live GAS. Do not touch Production, Secret Manager, IAM, gateways, project settings, protected design, or LINE configuration without the required separate approval.
