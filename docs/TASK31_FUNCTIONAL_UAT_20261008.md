# TASK-31 — Core Desktop Functional UAT

Date: 2026-10-08 Asia/Bangkok
Project: D:\CKACE_HR (Project B)
Environment: TEST only — Neon DEV flat-tree-71711157 / br-proud-term-b3pihnrx / ckace_hr_dev
Status: PASS

## Scope and safety boundary

Owner explicitly approved TASK-31 after TASK-30 PASS. Tested Leave, Request Status, Approval Center, Attendance/Time Correction, Overtime, Benefits read projection, Announcements, Notifications admin/retry, and Desktop Onboarding pending-to-approve.
Medical claim/R2 upload/finalize/download was not exercised; that is TASK-32. Production, Neon PROD, Project A, Web LIFF, GAS, LINE Gateway, Rich Menu and shared Firebase routing/traffic were not changed.

## Synthetic configuration fixture

- Agency 31000000-0000-4000-8000-000000000001
- Department 31000000-0000-4000-8000-000000000002
- Leave types: ANNUAL 31000000-0000-4000-8100-000000000001; PERSONAL 31000000-0000-4000-8101-000000000001; SICK 31000000-0000-4000-8102-000000000001
- Employee TEST entitlements: 31000000-0000-4000-8200-000000000001 / 8201 / 8202
- Leave approval policy 31000000-0000-4000-8300-000000000001, step 31000000-0000-4000-8301-000000000001
- OT approval policy 31000000-0000-4000-8310-000000000001, step 31000000-0000-4000-8311-000000000001
- Attendance policy 31000000-0000-4000-8400-000000000001
- Weekly work rules 31000000-0000-4000-8601-000000000001 through 8607
- Medical benefit read fixture 31000000-0000-4000-8500-000000000001, annual limit 3000
- Notification retry fixture 31000000-0000-4000-8700-000000000001

## Functional results

Leave: create 201; exact replay 201 replayed=true; changed payload with same client key 409; cancel 201. Approved request cbecdbcf-807c-42db-9f2d-dfc4afd2a805; cancelled request 923002a8-d9e8-4c97-b669-70175a899d37. Superuser approval 201. Annual entitlement final quota/used/remaining = 10/1/9.

Attendance: check-in record 3e6ea093-95c4-4e86-afdf-f6d77e101c7a; create 201; exact replay 201 replayed=true; changed location with same key 409. Immediate same-minute checkout was expected 400 by business rule; retry after the clock advanced with the same client key succeeded 201. Attendance calculation 9c5464b9-fe2f-4f3a-b700-24fc8c8b2d6e. Approved correction changed check-in to 09:00, workMinutes 450, late/early/overtime = 0/0/0.

Time Correction: approved request 1af82763-d85b-4a69-a268-da6f71421f2f; cancelled request d85fdb23-f0b6-4db6-8f5d-c99da91f44b9. Create/replay/cancel/approval paths all passed.

Overtime: approved request 32932c82-e8e9-58c6-a570-9b8a924aa9bd, segment 2398d5d4-07fe-4166-b351-1254b9c6fd87, 120 minutes. Cancelled request 1972e33c-4e54-5543-af7b-726901be8815, segment 206e330a-b7c3-44b5-9333-6da773b74cc8, 60 minutes. Create/replay/409 conflict/cancel/Superuser approval passed.

Request Status: final Employee projection contains 6 synthetic rows — approved Leave/Time Correction/OT plus cancelled Leave/Time Correction/OT.

Benefits: Medical annual limit 3000, committed/approved 0, no Medical claim; OT activity shows one approved and one cancelled request.

Announcements: Employee create attempt 403. Admin created GLOBAL announcement 6345b86d-9369-4030-bcc0-f90cec865954; Employee list 200 and sees it.

Notifications: Admin list 200 with canRetry=true. Fixed failed row 31000000-0000-4000-8700-000000000001 retry 201; state changed FAILED to PENDING and lastError cleared.

Desktop Onboarding: created passwordless/LINE-unbound pending DEV fixture employee 31000000-0000-4000-8800-000000000001 and account 31000000-0000-4000-8801-000000000001. Admin pending list 200, approval options 200, approve 201 ACTIVE, pending list empty. Employee role assigned. Generated entitlement IDs: ANNUAL e128fe56-1702-4ed7-8981-e735742d320c; PERSONAL acb7ae1d-b27f-490a-8c51-d7bfe84068cf; SICK 06b565fa-e134-4ae4-a47e-e075afc58cf0.

Bounded limitation: hosted public /api/onboarding/register success was not executed because the credential-bearing browser/tool request was rejected by the safety boundary. This was not bypassed. The in-scope Desktop Admin pending-to-approve workflow passed end-to-end.

## Browser UI smoke

Real TEST data rendered with no horizontal overflow on: /desktop/leave, /desktop/attendance, /desktop/requests, /desktop/overtime, /desktop/benefits, /desktop/announcements, /desktop/notifications, /desktop/onboarding, /desktop/approvals. Rendered values matched API/DB final state.

## Approval manifest

- Leave APPROVED cbecdbcf-807c-42db-9f2d-dfc4afd2a805 -> instance ae738c1b-f8c7-4bfd-9244-ff0741a92b74 -> step b7f971bf-b3d5-425d-8d42-4b55ff40a2a7
- Leave CANCELLED 923002a8-d9e8-4c97-b669-70175a899d37 -> instance 676e39d9-4039-4f22-9ba5-7a5ef2f383ac -> step c70add51-b957-4928-9af0-b3ce9c9b61f8
- Time Correction APPROVED 1af82763-d85b-4a69-a268-da6f71421f2f -> instance bb1ac67a-ee90-41e4-86cd-b8db6f077926 -> step 123a7724-b963-4f08-b49c-a420a4dcb7e0
- Time Correction CANCELLED d85fdb23-f0b6-4db6-8f5d-c99da91f44b9 -> instance b99e3151-c53a-42a3-a3d8-3c3bd482bf7d -> step 01bb2691-b943-4f1f-b842-56bab232a7ca
- OT APPROVED 32932c82-e8e9-58c6-a570-9b8a924aa9bd -> instance b06ad356-4405-4105-8c87-c3a89617359f -> step e661ff55-eb9f-41c6-86b7-1a2ca671ee04
- OT CANCELLED 1972e33c-4e54-5543-af7b-726901be8815 -> instance b350b1b7-e4f1-46db-b17a-d1a97b672aa2 -> step dc57a9d1-fbfd-47a7-a7dd-dcccf54ba683

## Idempotency manifest

- fdced041-b5dc-4cdc-a40a-3ab462a59913 — task31-leave-approve-0001
- 2e151a6b-1747-4134-808a-b2bf982f49b7 — task31-leave-cancel-0001
- edfb03af-41e4-4a01-99a5-3bf057cf76a0 — task31-att-in-0001
- feffc219-761b-4ba6-b5e9-d124a29ebb15 — task31-att-out-0001
- 409fe4e1-e102-4efb-ab9b-1df33f79d57c — task31-tc-approve-0001
- ab50e228-338a-4186-94dc-616188856592 — task31-tc-cancel-0001
- d1233843-ea60-43bb-9dc6-10a25ef6eb60 — task31-ot-approve-0001
- 3a933e21-9462-47d0-8458-0c58c4d86fe2 — task31-ot-cancel-0001

## Post-state

employees 5; accounts 5; agencies 1; departments 1; leave types 3; entitlements 6; approval policies 2; policy steps 2; approval instances 6; approval steps 6; leave requests 2; attendance records/calculations 1/1; time corrections 2; OT requests/segments 2/2; benefit policies 1; announcements 1; notification outbox 15; idempotency keys 8; audit logs 17; medical claims 0; attachments 0.

## Verification

Final npm run check task 89ec13c0-5fee-4e0f-a489-f982105453a7: exit 0, 76/76 test files, 468/468 tests, lint PASS, typecheck PASS, NestJS API build PASS, Next.js build PASS.

## Cleanup ledger — TASK-36 only

No delete/cleanup is authorized by TASK-31. TASK-36 must remove only tracked synthetic rows in dependency-safe order: notification/audit/idempotency rows; approval steps/instances; OT segments/requests; time corrections; attendance calculation/record; leave requests; announcement; onboarding entitlements/user-role/account/employee; initial Employee TEST entitlements; approval policy steps/policies; attendance/benefit/weekly-rule fixture; leave types; then clear Agency/Department references from the four TASK-29 employees before deleting the Agency/Department. Never use blanket delete predicates. Do not remove TASK-29 identity/RBAC rows until their separately approved cleanup step.

## Result

TASK-31 = PASS

Next approval gate: TASK-32 — Medical + Private R2 E2E.