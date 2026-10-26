# TESTm74 rehearsal role and approval-policy baseline

Status: **PARTIAL — the source revision is identified, but the actual TESTm74 approval-policy rows are not checked into this repository. Do not treat the reviewer-created temporary DB policies as the TESTm74 baseline.**

## Role catalog

| Role key | Migration evidence | Seed behavior |
| --- | --- | --- |
| `EMPLOYEE` | Legacy `User` is mapped to `EMPLOYEE` in `packages/migration/src/identity-profile.ts`; permission migration `20261017_admin_permissions` also names the role. | Create if absent; preserve an existing key/name/permissions row. |
| `SUPERUSER` | Identity transformer and approval routing tests use this key. | Create if absent; preserve an existing row. |
| `ADMIN` | Identity transformer, role permission migration, and approval routing use this key. | Create if absent; preserve an existing row. |
| `SUPERADMIN` | Owner/permission migrations and approval routing use this key. | Create if absent; preserve an existing row. |

The rehearsal seeder does not assign user roles or role permissions. It only ensures these four role keys exist for the migration and approval-policy foreign keys.

## Approval policies

The verified TESTm74 application revision is `1322ed48e98428ffd580a6ec2e8bb7cdec5132c7`. Policy rows are mutable database configuration, and this repository contains no seed migration with their TESTm74 names, active scopes, or steps. `packages/database/src/management-repository.ts` writes `ApprovalPolicy` and `ApprovalPolicyStep` rows at runtime; Leave, Time Correction, OT, and Medical repositories read those rows. Therefore the actual TESTm74 table cannot be reconstructed from checked-in source/migrations without guessing.

| Request kind | TESTm74 policy table values in repo | Evidence / consequence |
| --- | --- | --- |
| `LEAVE` | **Not present** | Leave reads active rows from `approval_policies`; no migration inserts a policy row. |
| `TIME_CORRECTION` | **Not present** | Runtime policy is optional and the repository also has built-in routing fallback behavior. |
| `OVERTIME` | **Not present** | OT requires active DB policy rows; no canonical seed is checked in. |
| `MEDICAL` | **Not present** | Medical requires active DB policy rows; no canonical seed is checked in. |

The earlier reviewer-created `ckace_hr_dev` rehearsal used global policies (LEAVE/OVERTIME/MEDICAL: SUPERUSER `SAME_AGENCY` then SUPERADMIN `GLOBAL`; TIME_CORRECTION: SUPERUSER `SAME_AGENCY`). That was a temporary reviewer seed, not evidence that TESTm74 uses those exact rows. The implementation deliberately does not copy those values into a default fixture.

## Required sanitized input

Before the policy seeder can create policy rows, provide an external JSON export of the active global policies read from TESTm74. It must identify `source: "TESTm74"`, the verified revision above, capture timestamp, and exactly one active global policy for each request kind with the exact display name and ordered role/scope steps. Keep this file outside Git, for example under `$env:TEMP`. The script rejects missing kinds, duplicates, unverified source revisions, and agency-scoped entries; it never converts a scoped policy into a global policy.

The seeder is idempotent: it inserts a policy only when no global policy exists for that request kind; it skips an exact match; it fails without overwriting any conflicting or ambiguous row. It uses the same `CKACE_MIGRATION_JOB=YES` plus loopback `ckace_hr_dev` guard as `PrismaMigrationTargetStore`, and additionally requires `CKACE_RUNTIME_STAGE=dev` and `CKACE_SYSTEM_WRITE_MODE=READ_ONLY`.

Owner must review/approve this baseline before any Production use. This DEV rehearsal is not Production approval. If TESTm74 contains agency-scoped or multiple active policies, first extend the importer/seeder to map and represent them exactly, then update this baseline; do not run the current global-only seeder.
