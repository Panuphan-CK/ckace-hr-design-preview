# Production GAS (CK&RR Request) — what Project B must match

Sources: `D:\APP_Leave\คู่มือการใช้งานระบบ CK&RR Request.pdf` (user manual, dated 2025-10-07), legacy source
`Gs/*.js` and `page/*.html` (read-only), Project A inventory docs. The manual is older than Production v38; items
below marked **(verify)** must be confirmed by a live walkthrough. `Flow.pdf` is image-only and not yet read.

## Roles
User, SuperUser, Admin, SuperAdmin. Approval chain is configured **per agency**: up to 3 steps, each step has a Role
(SuperUser/Admin/SuperAdmin) and a Scope (SameAgency or Global). Admin cannot see or edit other Admins/SuperAdmins;
only SuperAdmin deletes users. Menu visibility per role is a toggle matrix (Setting Role).

## Employee flows
- Register (gmail only, password >= 6), account starts "รออนุมัติ", LINE notice to admins; activation notice back.
- Login with remember-me; forgot password -> email link valid 15 min.
- Profile: edit name, upload photo and signature, change password (needs current password).
- Dashboard: leave cards per type (remaining, used/quota, progress bar, click opens that type's history), show/hide
  charts (used vs remaining bar, donut of usage share), own leave table (newest first, search by reason, filter by
  month, view / **edit / delete while "รออนุมัติ" or "รอแก้ไข"**).
- Leave request: date, type, duration (full / half / hourly), details, optional attachments, shows approval chain;
  email + LINE to first approver and on every status change; after final approval the leave is written to the org
  calendar automatically.
- Time correction: only for the same day+type once (no duplicate until decided); shows existing time; approver shown.
- OT: normal day must start >= 17:30, holiday free start; holiday range crossing 12:00–13:00 deducts 1 hour; no
  overlap with pending/approved OT; multi-day range becomes one request per day. Check-in on a holiday is allowed
  only with an approved OT for that day; at check-out normal hours count to 17:30 and OT from approved start to actual
  check-out capped at approved end.
- Medical: needs an approved sick leave as reference (one leave = one claim) **(verify OPD-without-leave path in v38)**;
  max 1,000 per claim and 10,000 per year; at least one receipt file; remaining annual limit shown.
- Calendar: month navigation, today / weekend / public-holiday marks, leave bars with avatar and reason, click for
  detail; visibility by role (user own, supervisor team); colors yellow pending, green approved, red rejected,
  purple revision, red frame = company holiday.
- Announcements: search, attachments, visibility Global or own agency.
- Chatbot "น้องซีเค" (policy FAQ, feedback, clear history) — intentionally not in Project B.
- Reports: leave / attendance / OT / medical, role-scoped (user own, supervisor team, SuperAdmin all), filter by
  agency/employee/status/date, Excel export.

## Approver flows
Approval cards show request id and type, requester photo/name/agency, key details, status. Actions: **Approve**
(optional comment), **Reject** (reason required), **Send for revision — leave requests only** (reason required,
status becomes "รอแก้ไข"), view detail and attachments. Menu cards carry a red badge with the pending count.

## Admin flows
Users (stat cards, approve new users, add/edit/delete, per-employee leave summary), Agency (name + 3-step approval
chain), Departments, User leave policies (quota per employee per leave type), Role/menu matrix, Holidays (not
counted as leave), Day of week (working days), Announcements (create/edit/delete, date, attachments, scope), Core
settings and old-data deletion (SuperAdmin; intentionally retired in Project B).

## Consequences for Project B plan
1. Send-back is **leave only** in Production; OT / time correction / medical are approve/reject only. Scope B3/P1
   accordingly (do not invent send-back for the other three).
2. Employee can edit or delete own request while PENDING or REVISION_REQUESTED (edit-and-resubmit path for leave).
3. Approval chain is agency-configured, 3 steps with role+scope: Project B must expose it on every submit form (B1).
4. Final leave approval should publish to the organisation calendar (Project B: team-week feed / calendar page).
5. OT rules above (17:30 start, lunch deduction, holiday check-in only with approved OT, OT capped at approved end)
   must be verified against Project B business-rules package.
6. Medical limits 1,000 per claim / 10,000 per year and one-leave-one-claim must be verified in Project B.
7. Role matrix: the 4 Production roles map onto Project B RBAC; "highest-level user" in the withdrawal decision =
   SuperAdmin equivalent.

## Checked against Project B business rules (2026-10-15)
- Medical: per-claim 1,000 and annual 10,000 match (`packages/business-rules/src/medical.ts`).
- OT minutes (`calculateOvertimeRequestedMinutes`): Project B always deducts 12:00–13:00 and, on non-workdays, also
  17:30–18:30. The 2025 manual only mentions the lunch deduction on holidays. **(verify against Production v38
  `Gs/18_Overtime.js` before changing anything)**. The "workday start >= 17:30" rule was not found in this function.

## Where Production is too rigid -> Project B should revise (Owner direction 2026-10-15)
Owner: some legacy behaviour is "FIXed" too hard; Project B should revise and improve, not just copy.
Candidates found so far (confirm with live walkthrough before building):

| Rigid in Production | Project B revision |
|---|---|
| Approval chain exactly 3 steps, roles fixed to SuperUser/Admin/SuperAdmin | N configurable steps per request type per agency, step = role or named person, with fallback/delegation |
| Same chain concept for leave/OT/medical only; time correction picks one approver | Explicit chain per type, visible on the submit form |
| Send-back only for leave | Send-back available on every request type (consistent) |
| Medical 1,000/claim and 10,000/year hard-coded; one sick leave = one claim | Limits come from benefit policy (per agency / role / year); reference to leave optional |
| OT start >= 17:30 and lunch/dinner breaks hard-coded | Work hours and unpaid breaks come from work-calendar settings per agency/day type |
| Registration only @gmail.com, password >= 6 | Verified company/any email with admin approval, modern password policy, rate limiting |
| Fixed Role -> menu toggle matrix | Permission-based RBAC (already in Project B) with audit trail |
| Withdraw/delete of approved requests done ad hoc | Highest-level user only, audited, restores quota (Owner decision) |
| Year reset = archive/delete sheets | Year is a filter; no destructive reset |
| Notifications fire-and-forget, no overdue reminders | Reminder policy per type, outbox with retry (exists), digest for approvers |
| Check-in modal without session on login page | Authenticated check-in only (already done) |
| Leave edit allowed only in PENDING/REVISION | Same, plus clear edit history and re-submission keeps the request number |

## Live observations (Production v38, SuperAdmin session, 2026-10-15, read-only, narrow pane)
- Sidebar: ข้อมูลหลัก (แดชบอร์ด, คำขอและการอนุมัติ, ปฏิทินการลา, ประชาสัมพันธ์, รายงาน), ผู้ใช้งาน (ผู้ใช้งานระบบ),
  a "โหมดเรียลไทม์" toggle (manual polling switch) and logout. No separate settings entry visible at top level.
- Navbar: Check-in button, Chatbot, notification bell with count, dark-mode switch, profile name + role.
- Dashboard for SuperAdmin is organisation-wide (headcount, totals per leave type, year selector, show/hide charts).
- "คำขอและการอนุมัติ" is a hub of large cards paired as request / approval: ขออนุญาตลางาน | อนุมัติคำขอลา,
  ขอแก้ไขเวลา | อนุมัติแก้ไขเวลา, ขอทำงานล่วงเวลา | อนุมัติคำขอล่วงเวลา, then medical.
- Approval page is minimal: title, search box, Reload, Back, list; empty state "ไม่มีรายการที่ต้องอนุมัติในขณะนี้".
- UX issues seen: first load stalls on a splash for 30+ s after a page reload (Apps Script cold start / session
  re-check); sidebar overlay does not close with Escape or an outside click on a narrow viewport.
- Not yet seen live (login state lost after one reload): leave form, calendar, reports, users, settings.

### Second walkthrough (same day)
- Leave form (modal "ขออนุญาตลางาน"): start/end date as DD/MM/YYYY text, **duration cards** เต็มวัน / ครึ่งวันเช้า /
  ครึ่งวันบ่าย / รายชั่วโมง, free-text details, "สายการอนุมัติ" box that says "ยังไม่ได้เลือกผู้อนุมัติ" until chosen
  (approver is picked by the employee), attachments PNG/JPG/PDF/DOCX up to 10 MB each, buttons ยกเลิก / ยืนยัน.
  An account without a leave policy gets a red inline error "ไม่พบสิทธิ์การลาสำหรับผู้ใช้งานนี้".
- Leave list: search box, month filter, green "ขออนุญาตลา" button, columns รหัส, วันที่เริ่ม–สิ้นสุด, จำนวน, เหตุผล,
  สถานะ, จัดการ; footer shows count text.
- Calendar: month title (พ.ศ.), ก่อนหน้า / วันนี้ / ถัดไป, a "แสดงรายการ" toggle (grid <-> list), day cells with weekday
  abbreviation, weekend and holiday cells outlined in red.
- Reports hub: four large cards (รายงานการลา, รายงานเข้าออกงาน, รายงานทำงานล่วงเวลา, รายงานเบิกค่ารักษา); the report
  detail pages did not open in this pane (clicks had no effect), not observed.
- Not observed: users page, settings pages, profile modal, announcements page.

### Third walkthrough: reports and users (pages load slowly, 8–10 s per navigation)
- Leave report "รายงานข้อมูลการลาพนักงาน": back button; filters = page size (10), agency, employee, status, month,
  date range, Clear, green Excel; table columns = request code (human readable `LEV-0109`), employee (photo, name,
  "agency | department"), type chip, start–end (DD/MM/YYYY ถึง ...), amount (days), reason, ... Report data shows real
  employee names: never copy it into repo docs.
- Users page: five coloured stat cards (all users, general users, high-level users, pending, resigned), employee table
  "ข้อมูลพนักงาน" with search and green "เพิ่มข้อมูล"; columns code, employee, status, birth date, start date, level.
- Request codes are human readable per type (LEV-xxxx); Project B has UUIDs only (= B2).
- Settings pages were not reachable from the sidebar for this account; still unobserved.

### Fourth walkthrough: settings menu, agency chain, profile
- Sidebar scrolls: below ผู้ใช้งาน there is a **ตั้งค่าระบบ** group: ตั้งค่าหน่วยงาน, ตั้งค่าฝ่าย, ตั้งค่าวันลา,
  ตั้งค่าวันหยุด, ตั้งค่าวันทำงาน, ตั้งค่าประชาสัมพันธ์, ตั้งค่าระบบ. (No role/menu matrix entry in v38.)
- "จัดการหน่วยงาน": table รหัส (AGC-001), หน่วยงาน, สายอนุมัติ 1 / 2 / 3 (each shows Role + scope "(ในสังกัด)" or
  "(ทุกสังกัด)"), actions edit/delete, search, "เพิ่มข้อมูล", pagination "แสดง 1 ถึง 3 จาก 3 แถว". Observed shape: three
  agencies; the executive agency has two steps (Admin global -> SuperAdmin global), the two team agencies have three
  (SuperUser same-agency -> Admin global -> SuperAdmin global). **One chain per agency, shared by all request types**
  (not per type as in the v18 mockup flow settings).
- Profile modal "โปรไฟล์ของฉัน": photo, first name, last name, nickname, email (username), agency and department
  (read-only), signature box, change password below. Matches the v18 profile layout.

### Fifth walkthrough: remaining settings, attendance report, time-correction page
- ตั้งค่าฝ่าย: table รหัส (DPM-001..), ฝ่าย, edit/delete, search, add, pagination (4 departments).
- ตั้งค่าวันลา: table PL-xxxxx = **one row per employee per leave type** (employee photo, name, "agency | department",
  type chip, "จำนวน N วัน") with edit/delete, search, add. Quota per person per type, no policy templates.
- ตั้งค่าวันหยุด: HD-xxxxx rows with date (DD/MM/YYYY, Gregorian year) and description, edit/delete, search, add.
- ตั้งค่าวันทำงาน: 7 rows (Mon–Sun) with on/off switches.
- ตั้งค่าประชาสัมพันธ์: MNG-xxxx rows with author, description, date, scope chip (e.g. "ทุกคนในองค์กร"), view/edit.
- ตั้งค่าระบบ: a form titled "ฟอร์มตั้งค่าระบบ" that **shows and edits infrastructure secrets in clear text** (Drive
  folder id, a Google API key, both spreadsheet ids, logo URL). Project B correctly excludes this. **Security note for
  the Owner:** that API key and the ids are readable by any SuperAdmin session and appear on screen; consider
  restricting/rotating the key when Project A is retired. Values deliberately not recorded here.
- Attendance report "รายงานข้อมูลการเข้าออกงาน": same filter bar as leave report; columns date, employee (photo, name,
  agency|department), check-in time with seconds, check-out time with seconds, work hours (decimal, e.g. 7.91), OT
  hours, note, plus Excel export.
- Time-correction page "แบบฟอร์มขอแก้ไขเวลา": starts with only a date field (DD/MM/YYYY) and a disabled "ส่งคำขอ";
  more fields appear after a date is chosen; history table columns รหัสคำขอ, วันที่ยื่นคำขอ, วันที่แก้ไข, ประเภท,
  เวลาเดิม, เวลาที่ขอแก้ไข, สถานะ, จัดการ, with "แสดง 0 ถึง 0 จาก 0 รายการ".
- Still not observed: OT form, medical form, check-in modal, bell list, chatbot, approval card with real data.

### Sixth walkthrough: OT and medical forms (SuperAdmin test account without chains)
- OT form "แบบฟอร์มขอทำงานล่วงเวลา": start date, end date (DD/MM/YYYY), start time and end time as 4-digit text
  (placeholders "เช่น 1730", "เช่น 2200"), free-text reason, "สายการอนุมัติ" box (shows red "ไม่พบสายการอนุมัติ" when the
  account has no chain; submit stays disabled), ส่งคำขอ. Back button "กลับ". No history table on this page.
- Medical page "ขอเบิกค่ารักษาพยาบาล": **Step 1 "เลือกวิธีอ้างอิง"** = dropdown of the user's approved, unused sick
  leaves ("ไม่มีคำขอลาป่วยในระบบ" when none) **or** blue button "ยื่นเบิกโดยไม่ใช้วันลา (OPD)" (so the OPD path exists in
  v38). Note "ระบบจะแสดงเฉพาะรายการลาป่วยที่ได้รับอนุมัติแล้วและยังไม่เคยถูกใช้ในการเบิกเท่านั้น". Summary box "สรุปสิทธิ์
  การเบิกค่ารักษา (ต่อปี)": total 10,000.00, accumulated/pending, remaining. History table: รหัสคำขอ, วันที่ยื่นเรื่อง,
  วันที่ป่วย, จำนวนเงิน, ไฟล์แนบ, สถานะ, จัดการ.
- Deliberately not opened: Check-in (would write attendance), Chatbot (AI), notification bell list did not expand.

### Leave request detail dialog (Production v38, opened from a leave list row)
Title "รายละเอียดคำขอลา". Left: requester avatar; รหัสคำขอ (LEV-xxxx); รายละเอียด (reason text); ประเภทการลา;
ผู้ขอ; แผนก; วันที่เริ่ม; วันที่สิ้นสุด; จำนวนวัน with duration label e.g. "0.5 วัน (ครึ่งบ่าย)"; สถานะ; เหตุผลที่อนุมัติ.
Right: **"สรุปการลาประจำปี" of the requester** — one card per leave type with remaining (big number), "ใช้ X/Y วัน",
progress bar and "% ใช้ไปแล้ว". Below: ไฟล์แนบ (or "ไม่มีไฟล์แนบสำหรับคำขอนี้"), **ขั้นตอนการอนุมัติ** stepper
(1—2—3 circles), **รายละเอียดการอนุมัติ** table: ลำดับ, ผู้อนุมัติ (name), วันที่มอบหมาย, วันที่อนุมัติ, สถานะ chip,
ความคิดเห็น.
Project B gap: dialog lacks request code (B2), requester leave summary and approval timeline with assigned/decided
dates (B6/B4); approver names must be returned for non-approvers who own the request.

## Rule extraction 1: approval chain (Gs/06_UserLogin.js, Gs/01_LeaveRequest.js)
Production behaviour:
1. Agency row holds up to 3 (role, scope) pairs, scope = SameAgency or Global.
2. Role levels: User 1 < SuperUser 2 < Admin 3 < SuperAdmin 4.
3. Effective chain = starting at the **first configured step whose role level is higher than the requester's AND that
   has at least one active user (not the requester) in scope**; that step and every later step are kept (later steps
   are kept even when currently empty).
4. For each kept step the candidate pool = all active users with that exact role inside scope.
5. Submit validation: every chosen approver must be inside the pool; at least one approver is required when the pool
   is not empty; every role present in the pool must be represented by one chosen person ("สายการอนุมัติไม่ครบตามระดับ
   ที่กำหนด"). `currentStep` starts at the number of chosen approvers (steps counted down).
6. Idempotency: client key replay + script lock; the requester cannot file for another uid.
Project B today: `/leave/approval-options` returns steps with `requiredRoleKey` and candidates (same idea, UUIDs).
To verify/port: rule 3 (skip leading steps that have no eligible user or are not above the requester), rule 5
(coverage per role), and extend the same resolver to OT, time correction and medical (B1).
Revise proposals: allow "no eligible user" fallback to the next level with an audit note instead of a hard failure;
allow an explicit delegate (B7); show the resolved chain with names on every submit form.
