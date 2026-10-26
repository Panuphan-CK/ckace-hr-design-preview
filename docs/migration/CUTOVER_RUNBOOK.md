# Full-system GAS to CKACE HR cutover runbook

Status: **Planning only. Production remains NO-GO.** This document describes the future cutover; it does not grant permission to access Production, create resources, change traffic/DNS/Firebase/LINE, migrate data, or notify employees. Each named Production action needs separate Owner approval.

## Mandatory go/no-go gates

Do not schedule or start a cutover until every gate below is supported by current evidence:

1. The Production startup validator accepts only all-module `LEGACY` or all-module `NEW`; every mixed route state must fail startup. No per-module LEGACY/FROZEN/NEW dispatcher is part of this cutover design.
2. The API and background jobs have passing `CKACE_SYSTEM_WRITE_MODE=READ_ONLY` tests. Keep it `READ_ONLY` during preparation/import; use `ACTIVE` only at opening. TEST defaults remain unchanged.
3. A disposable DEV/TEST rehearsal passes all module reconciliations, exact named exception dispositions, R2 byte/hash checks, and backup/restore/reset. The reviewer-reported 2026-10-26 counts are rehearsal evidence only, not Production cutover counts.
4. Owner approves the exact Production snapshot, policy baseline, maintenance window, resources, and each Production action separately. No Production parallel run is planned.
5. Rehearsals meet the planning targets: stop user requests for at most **120 minutes**, restore/rollback within **60 minutes**, and **RPO 0**. These are targets, not approved SLA; failure means postpone.

The Owner is the named operator for GAS, LINE/LIFF, operations, and employee notices. The reviewer independently checks evidence and reconciliation. Codex prepares/reviews local scripts and documents and does not perform Production operations.

## Cutover sequence

| # | Step and owner | Pass criteria | Stop / rollback decision |
| --- | --- | --- | --- |
| 1 | **Notify employees** — Owner sends the approved Thai notice below through every official employee channel. Reviewer checks the recipient roster and evidence; Codex supplies the reviewed wording. | 100% of active employee accounts are covered by the roster; notice is posted at least 24 hours before the window; the maintenance start/end time and support contact are present. | If the window or recipient coverage is unclear, postpone before any freeze. |
| 2 | **Close pending GAS requests** — Owner/HR reviews all pending Leave, Attendance correction, OT, and Medical requests in GAS and closes them there. Reviewer compares the resulting status counts. | Pending requests = **0** in each module before freeze. Specifically, close LEV-0109 in GAS and verify terminal status in the final export. No request is auto-approved by CKACE HR. | If any request cannot be closed or its final state cannot be verified, stop before freezing and reschedule. |
| 3 | **Freeze GAS writes** — Owner disables or blocks every GAS write path, including desktop and LINE/LIFF actions. Reviewer runs an approved safe write-denial check; Codex provides the check procedure. | All user write paths refuse new mutations; successful writes after freeze = **0**; the freeze start time is recorded. | If any write still succeeds, restore GAS write availability and postpone. Do not export a cutover snapshot while writes continue. |
| 4 | **Export the final source snapshot** — Owner exports fresh XLSX workbooks and attachments from Drive after the freeze, saves them to a restricted staging location outside Git, and supplies the manifest. Reviewer checks counts/timestamps; Codex runs only local validation after approval. | Every manifest sheet count matches the exported row count; every source row is accounted for; export timestamp is after freeze; attachments include bytes for **100%** of referenced files. No workbook/dump is placed in Git. | Missing workbook, changed counts, an unsafe/unmatched attachment, or an export older than the freeze means stop and repeat the export while GAS remains frozen. |
| 5 | **Prepare Production database and policy** — Owner provisions the separately approved database, private backup schedule, runtime identity, and secrets; Owner applies schema migrations. Reviewer verifies migration and backup evidence; Codex supplies reviewed scripts and checks. | Schema migration errors = **0**; a pre-import backup exists and its restore has been proven within **60 minutes**; the exact approved role/policy baseline matches 100%. The TESTm74 table in `REHEARSAL_POLICY_BASELINE.md` is a reference and requires separate Production approval. | Any missing resource, policy mismatch, secret/config error, or untested restore means do not import. |
| 6 | **Seed roles and approval policies** — Owner/reviewer apply the Owner-approved production baseline under the approved migration identity; Codex verifies the seeder contract locally. | Role keys and every policy row/ordered step match the approved baseline exactly; extra, missing, duplicate, inactive, or changed policy rows = **0**. | Any difference means stop; do not flatten, overwrite, or guess a route. |
| 7 | **Import and reconcile all modules** — Codex runs the approved import only after explicit Production authorization; reviewer independently compares counts and exceptions; Owner accepts the final report. | Per module: source rows = imported + approved skipped + rejected, unaccounted = **0**, ambiguous writes = **0**, rejected rows = **0**, and every mismatch is named and approved. Pending at cutover = **0** source and target. Attendance is recalculated from punch timestamps; GAS `WorkHours`/`OT_Hours` are not used. Entitlements use CKACE HR tenure rules; GAS `LeaveQuota` is comparison-only. | Any count mismatch, unapproved exception, pending request, or changed/ambiguous write blocks opening. Before the point of no return, restore the pre-import backup or repeat import while both systems remain unavailable to employee writes. |
| 8 | **Transfer attachments** — Owner provides the downloaded Drive ZIP and mapping; Codex runs copier dry-run, then only an explicitly authorized production transfer; reviewer checks every object. | Source references = target metadata links = copied objects; matched files = **100%**; missing, ambiguous, duplicate, size mismatch, and SHA-256 mismatch = **0**. | Any discrepancy blocks opening. Do not delete or replace source Drive files during the migration. |
| 9 | **Final data and access check** — Reviewer compares module totals, samples permissions with approved test identities, and validates request ownership/history. Owner accepts the report; Codex supplies aggregate evidence. | Counts match the final frozen snapshot 100%; all access checks pass; no employee can see another employee's private/medical attachment; archive and approval history associations are correct. | Any mismatch or access leak blocks opening. Before link switch, unfreeze GAS and continue there; discard the new DB only after Owner confirms the final backup/evidence is retained. |
| 10 | **Open CKACE HR and switch links** — Codex prepares the reviewed marker procedure; Owner sets every route to `NEW`, leaves the whole system `READ_ONLY`, changes the official URL/LIFF/rich-menu/employee links, records a cutover marker (`cutoverAt` + unique `runId`) outside Git, then sets `CKACE_SYSTEM_WRITE_MODE=ACTIVE`. Reviewer verifies all routes and entry paths. Follow `POST_CUTOVER_EXPORT.md`; never run its Production export without separate approval. | All 26 route keys are `NEW`; mixed-route startup check = **0**; marker exists and its timestamp/run ID are recorded; no GAS writes are enabled; desktop and LIFF health checks pass; designated login and first-password-reset tests pass **100%**. | The first official link change is the point of no return. If a pre-open check fails before it, restore links to GAS and unfreeze GAS. After it, keep GAS frozen; use fix-forward unless an Owner-approved fallback is necessary. |
| 11 | **Monitor hypercare** — Owner operates and supports; reviewer checks evidence daily; Codex reviews supplied logs/count summaries without accessing Production. | Complete the 3-business-day hypercare table below. During each day: availability probes pass **100%**, unresolved P0/P1 incidents = **0** at sign-off, notification backlog returns to **0** within retry policy, and module control totals reconcile **100%**. | Any data-loss/security P0, or repeated critical health failure, starts an Owner decision. Prefer fix-forward. Post-open GAS fallback uses READ_ONLY + export + HR manual re-entry; do not enable GAS writes until reconciliation is **100%**. |

## Point of no return and rollback order

The **point of no return** is the first change of an official employee entry link to CKACE HR. Before that change, no employee write has been accepted by CKACE HR and the Owner can return to GAS without copying employee changes.

Consider fallback if any data loss/unaccounted write, cross-employee or medical-data exposure, module count mismatch, wrong-system write, or critical health failure across **2 consecutive probes** cannot be fixed forward safely. The Owner decides and gives separate approval for the exact Production rollback action.

### Before the point of no return

1. Owner keeps GAS frozen until CKACE final checks pass. If they fail, restore employee links to GAS, verify old writes work, then unfreeze GAS. CKACE remains `READ_ONLY`; retain or discard its database only under the approved retention decision.
2. Confirm there were **0** successful employee writes in CKACE and **0** successful GAS writes after the freeze. Record evidence and downtime.

### After the point of no return

1. Fix-forward is the default. Do not resume GAS writes in parallel with CKACE.
2. If the Owner selects fallback, first set `CKACE_SYSTEM_WRITE_MODE=READ_ONLY`; verify successful user/business writes after the freeze = **0** and notification/cleanup jobs skip writes and sends.
3. Run the reviewed post-cutover export from the cutover marker to an encrypted/restricted file outside Git, following `POST_CUTOVER_EXPORT.md`. It reports module counts, timestamps, and run ID without putting data in repository evidence; attachment bytes remain in R2 and must be retrieved separately if HR needs them.
4. Owner/HR manually re-enters every accepted post-cutover business item into GAS. Reviewer reconciles **100%** of exported items against GAS and checks duplicates = **0**. This is manual recovery, not reverse replay.
5. Only after reconciliation passes may the Owner point official links back to GAS and re-enable GAS writes. Keep CKACE read-only and retain its database/attachments until incident closure.
6. Record restore/fallback duration; the rehearsal target is **≤60 minutes**, with **0** missing or duplicate items. If that cannot be met, continue fix-forward and do not enable GAS writes.

### Three-business-day hypercare

| Day | Owner | Reviewer | Codex review | Sign-off criteria |
| --- | --- | --- | --- | --- |
| Day 1 | Watch support channel, health, requests, and notifications throughout the first business day. | Check probes and module control totals at opening, midday, and close. | Review only supplied aggregate logs/reconciliation results. | Health probes **100%**; open P0/P1 = **0**; notification backlog = **0**; all module counts reconciled **100%**. |
| Day 2 | Triage employee issues; confirm no GAS writes or stale entry links. | Recheck every module and compare daily totals to Day 1. | Review supplied exception and error summaries. | Stale GAS-link writes = **0**; unexplained count deltas = **0**; P0/P1 open = **0**. |
| Day 3 | Confirm support readiness and accept operational handoff. | Complete final access, backup, and module-total review. | Review closure evidence and list remaining non-blocking defects. | All critical checks pass; unresolved P0/P1 = **0**; Owner signs hypercare closure. |

## Thai employee notices

### Before maintenance

> **แจ้งปิดปรับปรุงระบบชั่วคราว**
>
> บริษัทจะย้ายระบบงานบุคคลไปยัง C.K.ACE HR ในวันที่ **[วัน/วันที่]** เวลา **[เวลาเริ่ม]–[เวลาสิ้นสุด]** (คาดว่าไม่เกิน 120 นาที) ระหว่างช่วงดังกล่าวจะไม่สามารถส่งคำขอลา บันทึก/แก้ไขเวลา ยื่น OT หรือเบิกค่ารักษาได้ กรุณาส่งคำขอที่จำเป็นและติดตามคำขอค้างให้เสร็จก่อน **[กำหนดเวลา]** หากมีเหตุเร่งด่วนติดต่อ **[ผู้ประสานงาน]** บริษัทจะแจ้งอีกครั้งเมื่อระบบใหม่พร้อมใช้งาน

### After opening and first password setup

> **ระบบ C.K.ACE HR พร้อมใช้งานแล้ว**
>
> เข้าใช้งานที่ [https://hr.ckaceaccount.com](https://hr.ckaceaccount.com) หรือเปิดผ่าน LINE LIFF/เมนูที่บริษัทแจ้งไว้ หากเข้าใช้งานครั้งแรกหรือยังไม่มีรหัสผ่าน ให้เลือก **“ลืมรหัสผ่าน”** ที่หน้าเข้าสู่ระบบ แล้วทำตามขั้นตอนผ่านอีเมลหรือ LINE ที่ลงทะเบียนไว้ ห้ามส่งรหัสผ่านให้ผู้อื่น หากตั้งรหัสผ่านไม่ได้หรือพบข้อมูลไม่ตรง กรุณาติดต่อ **[ผู้ประสานงาน]**

### If the cutover is rolled back

> **แจ้งกลับไปใช้ระบบเดิมชั่วคราว**
>
> ขณะนี้บริษัทกำลังตรวจสอบระบบ C.K.ACE HR กรุณาหยุดส่งคำขอผ่านลิงก์ใหม่และกลับไปใช้ **[ลิงก์ระบบเดิมที่ Owner ยืนยัน]** จนกว่าจะมีประกาศใหม่ รายการที่ส่งระหว่างช่วงเปลี่ยนระบบจะได้รับการตรวจสอบและแจ้งผลอีกครั้ง หากมีรายการเร่งด่วนติดต่อ **[ผู้ประสานงาน]**
