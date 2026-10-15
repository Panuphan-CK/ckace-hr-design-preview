# TASK-30 — Four-Role Authenticated TEST UAT

Date: 2026-10-08 Asia/Bangkok
Scope: Project B `D:\CKACE_HR` Web Desktop + Desktop TEST API only
Status: **PASS**

## Safety boundary

- TEST database already attested by TASK-28: Neon DEV `flat-tree-71711157 / br-proud-term-b3pihnrx / ckace_hr_dev`.
- Uses only the four disposable TASK-29 identities.
- Added a TEST-only UAT bootstrap endpoint that is fail-closed unless:
  - `CKACE_RUNTIME_STAGE=test`
  - `K_SERVICE=ckace-hr-api-test`
  - `K_REVISION` starts with `ckace-hr-api-test-task30uat-`
  - runtime database attestation passes
  - the exact tracked account ID, employee ID, login and single expected role match.
- Bootstrap creates a random password inside the TEST API runtime, writes only its `scrypt-v1` hash, invokes the real `DesktopAuthService.login()`, and returns a normal HttpOnly Desktop session cookie. Plaintext passwords, password hashes, session tokens and cookies were not recorded in this report.
- No Production, Neon PROD, Project A, LIFF, GAS, Firebase shared routing or traffic mutation.

## Source / verification

Changed:
- `apps/api/src/security/wd13-test-uat.controller.ts`
- `apps/api/src/security/wd13-test-uat.controller.test.ts`
- `apps/api/src/security/security.module.ts`
- `infra/rehearsal/wd13-same-origin-proxy.mjs`
- `infra/rehearsal/wd13-same-origin-proxy.node-check.mjs`

Full repository gate:
- Task `5b26e796-cdd3-47fc-b5ed-6bcf7af6374d`
- Exit 0
- **76/76 test files PASS**
- **468/468 tests PASS**
- Lint PASS
- Typecheck PASS
- NestJS API build PASS
- Next.js build PASS

Proxy safety:
- Task `07ea6499-7aec-4f87-9a98-f9801225bf0c`
- **6/6 PASS**
- Exact TEST Web/API candidate hosts only; Production/unknown hosts rejected.

## TEST API candidate

Cloud Build:
- ID `6b5381e9-3bf4-4306-94c8-b720d887bc60`
- Status SUCCESS
- Image digest `sha256:f86149d297c64734a7ced9a8eb61e66b03247b8d37d596caf4750b85f6811fc1`

Cloud Run:
- Service `ckace-hr-api-test`
- Revision `ckace-hr-api-test-task30uat-20261008a`
- Tag `task30-uat`
- Traffic **0%**
- Ready/Active/ContainerHealthy/ContainerReady = True
- Existing API baseline `ckace-hr-api-test-m9d15d` remained **100%**

Web UAT candidate:
- `ckace-hr-web-test-wd13retry-20261008a`
- Tag `wd13-retry`
- Traffic **0%**
- Existing Web baseline `ckace-hr-web-test-m9d15a` remained **100%**

## Authenticated role matrix

| Role | Session | Permission count | Desktop navigation | Medical approvals | Notifications admin | Onboarding admin | Admin settings |
|---|---:|---:|---|---:|---:|---:|---:|
| Employee | 200 | 14 | Employee menus only | 403 | 403 | 403 | 403 |
| Superuser | 200 | 19 | Employee + Approvals | 200 | 403 | 403 | 403 |
| Admin | 200 | 23 | Employee + Approvals + Notifications + Onboarding + Admin | 200 | 200 | 200 | 403 |
| Superadmin | 200 | 24 | Admin-visible menus; `adminSettings=true` | 200 | 200 | 200 | 200 |

For every role:
- `authenticated=true`
- `authenticatedBy=PROJECT_B_WEB`
- `roleCount=1`
- `clientRoleAuthority=false`
- Browser rendered navigation matched the server session capabilities.

The valid authentication check used the real `DesktopAuthService.login()` internally so no reusable plaintext credential had to be exposed to the browser automation layer.

## Negative/session cases

- Unknown UAT role -> **400**
- Session after rejected unknown role while signed out -> **401**
- Logout -> **200**
- Session immediately after logout -> **401**
- Navigating to `/desktop` after logout redirected to `/login` and rendered the Login form.

## Database post-state

After TASK-30:
- employees = 4
- user_accounts = 4
- roles = 4
- permissions = 24
- user_roles = 4
- role_permissions = 80
- line_accounts = 0
- leave_requests = 0
- attendance_records = 0
- overtime_requests = 0
- medical_claims = 0

Role assignment verification remained:
- EMPLOYEE = 14 permissions
- SUPERUSER = 19 permissions
- ADMIN = 23 permissions
- SUPERADMIN = 24 permissions

No business workflow rows were created during TASK-30.

## Cleanup

Owned browser tab was closed. Temporary loopback proxy was stopped and no managed proxy process remained running.

Do not delete the TASK-29 identities/RBAC fixture yet; cleanup is a later Owner-approved task.

The temporary UAT bootstrap must remain confined to the dedicated `task30-uat` 0%-traffic TEST revision. Remove or disable it before any future TEST traffic promotion, shared routing change, non-synthetic data use, or Production consideration.

## Result

**TASK-30 = PASS**

Next approval gate: **TASK-31 — Core Desktop Functional UAT**.
