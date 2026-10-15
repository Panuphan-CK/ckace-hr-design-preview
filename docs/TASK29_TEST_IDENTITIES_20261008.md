# TASK-29 — Disposable TEST Identities Manifest

Date: 2026-10-08 Asia/Bangkok
Environment: **TEST / Neon DEV only**
Neon project: `flat-tree-71711157` (**CKACE HR DEV**)
Branch: `br-proud-term-b3pihnrx`
Database: `ckace_hr_dev`

## Purpose

Track every synthetic identity/RBAC row created for TASK-29 so TASK-30/31/32 UAT can use them and TASK-36 can remove exactly these rows later.

No real employee data is used. No LINE account, agency, or department is linked. No plaintext password is stored in this document or any project file.

## Synthetic users

| Role | Login | Employee ID | User Account ID | State |
|---|---|---|---|---|
| EMPLOYEE | `wd13.test.employee` | `29000000-0000-4000-9000-000000000001` | `29000000-0000-4000-a000-000000000001` | ACTIVE |
| SUPERUSER | `wd13.test.superuser` | `29000000-0000-4000-9000-000000000002` | `29000000-0000-4000-a000-000000000002` | ACTIVE |
| ADMIN | `wd13.test.admin` | `29000000-0000-4000-9000-000000000003` | `29000000-0000-4000-a000-000000000003` | ACTIVE |
| SUPERADMIN | `wd13.test.superadmin` | `29000000-0000-4000-9000-000000000004` | `29000000-0000-4000-a000-000000000004` | ACTIVE |

## Role IDs

- `29000000-0000-4000-8000-000000000001` — EMPLOYEE
- `29000000-0000-4000-8000-000000000002` — SUPERUSER
- `29000000-0000-4000-8000-000000000003` — ADMIN
- `29000000-0000-4000-8000-000000000004` — SUPERADMIN

## Permission IDs

- `29000000-0000-4000-8100-000000000001` — `profile.self.read`
- `29000000-0000-4000-8101-000000000001` — `leave.self.read`
- `29000000-0000-4000-8102-000000000001` — `leave.self.write`
- `29000000-0000-4000-8103-000000000001` — `requests.self.read`
- `29000000-0000-4000-8104-000000000001` — `attendance.self.read`
- `29000000-0000-4000-8105-000000000001` — `attendance.self.write`
- `29000000-0000-4000-8106-000000000001` — `time_correction.self.read`
- `29000000-0000-4000-8107-000000000001` — `time_correction.self.write`
- `29000000-0000-4000-8108-000000000001` — `overtime.self.read`
- `29000000-0000-4000-8109-000000000001` — `overtime.self.write`
- `29000000-0000-4000-8110-000000000001` — `medical.self.read`
- `29000000-0000-4000-8111-000000000001` — `medical.self.write`
- `29000000-0000-4000-8112-000000000001` — `benefits.self.read`
- `29000000-0000-4000-8113-000000000001` — `announcements.read`
- `29000000-0000-4000-8114-000000000001` — `requests.approval.read`
- `29000000-0000-4000-8115-000000000001` — `leave.approve`
- `29000000-0000-4000-8116-000000000001` — `time_correction.approve`
- `29000000-0000-4000-8117-000000000001` — `overtime.approve`
- `29000000-0000-4000-8118-000000000001` — `medical.approve`
- `29000000-0000-4000-8119-000000000001` — `notifications.admin.read`
- `29000000-0000-4000-8120-000000000001` — `notifications.admin.retry`
- `29000000-0000-4000-8121-000000000001` — `onboarding.admin.approve`
- `29000000-0000-4000-8122-000000000001` — `announcements.admin.write`
- `29000000-0000-4000-8123-000000000001` — `admin.settings.read`

## Verified counts after provisioning

- employees = 4
- user_accounts = 4
- roles = 4
- permissions = 24
- user_roles = 4
- role_permissions = 80
- line_accounts = 0
- ACTIVE accounts = 4
- Project password hashes present = 4
- Legacy password hashes present = 0
- Agency links = 0
- Department links = 0
- TASK29 nickname marker = 4

Role permission counts:
- EMPLOYEE = 14
- SUPERUSER = 19
- ADMIN = 23
- SUPERADMIN = 24

## Credential handling

TASK-29 generated strong random credentials only to create `scrypt-v1` password hashes. Plaintext credentials were not written to files or documentation and are intentionally not retained for later use. TASK-30 must rotate these four TEST-only password hashes to fresh temporary credentials immediately before authenticated UAT and keep those plaintext values ephemeral/private.

## Cleanup order (for TASK-36, not authorized by TASK-29)

Do **not** execute cleanup until TASK-36 approval.

1. Remove rows in `user_roles` for the four account IDs.
2. Remove the four `user_accounts`.
3. Remove the four `employees`.
4. Remove the four TASK-29 `roles` (role_permissions cascade).
5. Remove the 24 TASK-29 `permissions` after confirming no other role references them.
6. Verify all identity/RBAC counts return to the pre-TASK-29 baseline of zero and no UAT-created dependent rows remain.

Never use broad delete predicates or Production/Neon PROD.
