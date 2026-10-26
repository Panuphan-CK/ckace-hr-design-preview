# Full-system GAS to CKACE HR cutover runbook

Status: **Planning only. Production remains NO-GO.** This document describes the future cutover; it does not grant permission to access Production, create resources, change traffic/DNS/Firebase/LINE, migrate data, or notify employees. Each named Production action needs separate Owner approval.

## Mandatory go/no-go gates

Do not schedule or start a cutover until every gate below is supported by current evidence:

1. A full-system, fail-closed `LEGACY` / `FROZEN` / `NEW` authority switch exists and has all-route coverage. Current module routing is not a universal data dispatcher; `docs/ARCHITECTURE.md` records this blocker.
2. A rollback drill proves that NEW writes and side-effect workers can be frozen, all post-cutover writes reconciled/replayed, and the old system safely restored. A config flip alone is not rollback evidence.
3. A disposable DEV/TEST rehearsal passes all module reconciliations, exact named exception dispositions, R2 byte/hash checks, and backup/restore/reset. Reconcile the final post-freeze snapshot; the 2026-10-26 rehearsal counts are reference evidence, not cutover counts.
4. Owner approves the exact production data snapshot, policy baseline, maintenance window, resource configuration, and every Production action separately.
5. The achievable rehearsal objectives remain: write freeze and employee downtime at most **120 minutes**, recovery/rollback at most **60 minutes**, and **RPO 0**. If a timed rehearsal exceeds either limit or cannot prove zero lost writes, do not proceed.

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
| 7 | **Import and reconcile all modules** — Codex runs the approved import only after explicit Production authorization; reviewer independently compares counts and exceptions; Owner accepts the final report. | Per module: source rows = imported + approved skipped + rejected, unaccounted = **0**, ambiguous writes = **0**, rejected rows = **0**, and every mismatch is named and approved. Pending at cutover = **0** source and target. Attendance is recalculated from punch timestamps; GAS `WorkHours`/`OT_Hours` are not used. Entitlements use CKACE HR tenure rules; GAS `LeaveQuota` is comparison-only. | Any count mismatch, unapproved exception, pending request, policy route issue, or changed/ambiguous write blocks opening. Restore the pre-import backup only before any NEW writes; otherwise use the proven freeze-and-reconcile rollback sequence. |
| 8 | **Transfer attachments** — Owner provides the downloaded Drive ZIP and mapping; Codex runs copier dry-run, then only an explicitly authorized production transfer; reviewer checks every object. | Source references = target metadata links = copied objects; matched files = **100%**; missing, ambiguous, duplicate, size mismatch, and SHA-256 mismatch = **0**. | Any discrepancy blocks opening. Do not delete or replace source Drive files during the migration. |
| 9 | **Final data and access check** — Reviewer compares module totals, samples permissions with approved test identities, and validates request ownership/history. Owner accepts the report; Codex supplies aggregate evidence. | Counts match the final frozen snapshot 100%; all access checks pass; no employee can see another employee's private/medical attachment; archive and approval history associations are correct. | Any mismatch or access leak blocks opening; keep GAS frozen only while the agreed window permits. Otherwise restore the old service using the tested rollback. |
| 10 | **Open CKACE HR and switch links** — Owner enables the approved full-system `NEW` mode, publishes the approved URL/LIFF entry, and updates LINE LIFF, rich menu, and employee links. Reviewer checks both browser and LIFF paths; Codex confirms version/config evidence without changing Production. | Desktop and LIFF health checks pass; all module entry links reach CKACE HR; login and first-time reset work for 100% of the designated test accounts; no route goes to the wrong system. | If an authority route is missing, a write reaches the wrong database, or health/login fails, freeze NEW writes and invoke the proven rollback. Never rely on a simple route flip. |
| 11 | **Monitor and close the window** — Owner monitors the system; reviewer checks logs/alerts and operational counts; Codex reviews supplied evidence. | For the first **24 hours**, availability probes pass 100%, unhandled P0/P1 incidents = **0**, failed notification backlog returns to **0** within the configured retry window, and daily source/target control totals match. | Trigger rollback criteria below on data loss, cross-user access, sustained health failure, or module writes going to the wrong authority. Owner decides and separately authorizes Production rollback. |

## Rollback criteria and order

Trigger a rollback decision if any of these occur: any unaccounted/lost write; any cross-employee or medical-data exposure; any module route writes to the wrong authority; any module reconciliation mismatch; critical health failure for 2 consecutive probes; or recovery is forecast to exceed the approved **60-minute** limit.

1. Owner authorizes the named rollback action and the on-call roles record the decision time.
2. Freeze every NEW user write and every notification/cleanup/side-effect worker. Verify successful NEW mutations after the freeze = **0**.
3. Export and reconcile all writes accepted by NEW after opening. If a safe reverse replay into GAS has not been implemented and rehearsed with **zero lost/duplicated writes**, the cutover is not eligible to start.
4. Restore/verify the last known-good LEGACY operation and switch official links only after write authority is confirmed. Do not delete the NEW database or attachments during rollback.
5. Verify login, one safe transaction per module, source/target control totals, LINE entry, and monitoring. Record recovery time; it must be at most **60 minutes** and RPO must remain **0**.
6. Notify employees using the rollback message approved by the Owner and keep the incident open until all counts reconcile.

Current source evidence says the full-system authority switch and reverse replay are not implemented/proven. Therefore steps 10 and rollback remain blocking prerequisites, not executable Production instructions.

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
