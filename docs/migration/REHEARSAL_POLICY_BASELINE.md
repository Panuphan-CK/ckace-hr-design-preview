# TESTm74 rehearsal role and approval-policy baseline

Status: **Captured from a read-only TESTm74 database review on 2026-10-26.** The rehearsal seeder input remains external and is not committed.

## Role catalog

| Role key | Migration evidence | Seed behavior |
| --- | --- | --- |
| `EMPLOYEE` | Legacy `User` is mapped to `EMPLOYEE` in `packages/migration/src/identity-profile.ts`; permission migration `20261017_admin_permissions` also names the role. | Create if absent; preserve an existing key/name/permissions row. |
| `SUPERUSER` | Identity transformer and approval routing tests use this key. | Create if absent; preserve an existing row. |
| `ADMIN` | Identity transformer, role permission migration, and approval routing use this key. | Create if absent; preserve an existing row. |
| `SUPERADMIN` | Owner/permission migrations and approval routing use this key. | Create if absent; preserve an existing row. |

The rehearsal seeder does not assign user roles or role permissions. It only ensures these four role keys exist for the migration and approval-policy foreign keys.

## Approval policies

The verified TESTm74 application revision is `1322ed48e98428ffd580a6ec2e8bb7cdec5132c7`. A reviewer inspected the TESTm74 policy table read-only on 2026-10-26 (Asia/Bangkok). All four active policies are global; no agency-scoped policies were present. Every employee uses `approvalRouteMode = STANDARD`.

| Request kind | Policy name | Active | Agency scope | Step 1 | Step 2 |
| --- | --- | --- | --- | --- | --- |
| `LEAVE` | สายอนุมัติการลา | Yes | Global | `ADMIN` — `SAME_AGENCY` | `SUPERADMIN` — `GLOBAL` |
| `TIME_CORRECTION` | สายอนุมัติแก้ไขเวลา | Yes | Global | `ADMIN` — `SAME_AGENCY` | `SUPERADMIN` — `GLOBAL` |
| `OVERTIME` | สายอนุมัติ OT | Yes | Global | `ADMIN` — `SAME_AGENCY` | `SUPERADMIN` — `GLOBAL` |
| `MEDICAL` | สายอนุมัติค่ารักษา | Yes | Global | `ADMIN` — `SAME_AGENCY` | `SUPERADMIN` — `GLOBAL` |

The actual sanitized policy export used by the seeder was `D:\CKACE_HR_snapshot\testm74-approval-policies.json`; it remains outside Git. This replaces the earlier temporary rehearsal policy values (`SUPERUSER` at step 1), which were not TESTm74 evidence. The table above is the review baseline; it does not authorize Production seeding.

## Required sanitized input

The rehearsal seeder consumes the external sanitized JSON export at `D:\CKACE_HR_snapshot\testm74-approval-policies.json`. It identifies `source: "TESTm74"`, the verified revision above, capture timestamp, and exactly one active global policy for each request kind with the exact display name and ordered role/scope steps. Keep the file outside Git. The script rejects missing kinds, duplicates, unverified source revisions, and agency-scoped entries; it never converts a scoped policy into a global policy.

The seeder is idempotent: it inserts a policy only when no global policy exists for that request kind; it skips an exact match; it fails without overwriting any conflicting or ambiguous row. It uses the same `CKACE_MIGRATION_JOB=YES` plus loopback `ckace_hr_dev` guard as `PrismaMigrationTargetStore`, and additionally requires `CKACE_RUNTIME_STAGE=dev` and `CKACE_SYSTEM_WRITE_MODE=READ_ONLY`.

Owner must review/approve this baseline before any Production use. This DEV rehearsal is not Production approval. If a future source policy differs from this snapshot, first extend the importer/seeder to map and represent it exactly, then update this baseline; do not flatten or overwrite it.
