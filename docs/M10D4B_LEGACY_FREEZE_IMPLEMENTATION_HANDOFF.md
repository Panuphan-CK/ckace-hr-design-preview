# SUPERSEDED / DO NOT EXECUTE — M10D.4B Legacy Freeze Handoff

Owner changed scope on 2026-10-08: **Project B Web Desktop ONLY**. Do not touch Project A, GAS, Web LIFF, LINE Gateway or Rich Menu. The Legacy freeze implementation goal was cancelled and its ChatGPT scheduled watch disabled. The material below is **historical analysis**, NOT an active implementation plan. Do not resume it when T17 closes; only a fresh explicit Owner change of scope could reopen it.

## Historical title

M10D.4B — Local Legacy LEAVE Freeze Implementation Handoff

Date: 2026-10-08 Asia/Bangkok
Owner approval: source hardening and LOCAL/TEST verification ONLY. **No Production deployment/activation, Delta import, Traffic or Authority switch.**

## Current blocker
Project A `D:\APP_Leave` has a separate T17 Rich Menu scheduled-goal mutation owner (active). The guarded file-edit tool rejected the first M10D.4B source edit with a mutation-owner conflict. No A-source edit succeeded. Do not bypass goal ownership or overwrite unrelated T17 changes. Superseded: the old implementation goal was cancelled and must not be resumed when T17 closes. Project A remains excluded.

## Source audit
Expanded M10D.4's eleven LEAVE entrypoints to **15 paths** by discovering UserPolicies administration and default entitlement creation during employee activation.

- Direct Desktop leave: `Gs/01_LeaveRequest.js`: `addRequestWithVerifiedActor_`, `upRequestValidated_`, `delDataLeaveRequestsValidated_`, `cancelApprovedLeave`.
- Direct Desktop leave approval: `Gs/02_Approval.js`: `setConfirmLeaveApprove`, `requestRevisionForLeave`, `resubmitRevisedLeave`.
- GAS LIFF: `Gs/21_LineIntegration.js`: `submitLineLeaveRequest` delegates to `addRequestWithVerifiedActor_`; `Gs/25_LineLiffServices.js`: `decideLineLeaveRequest_` performs a locked batch update.
- Gateway LIFF: `line-gateway/server.js`: `POST /api/liff/leave` and `POST /api/liff/decision`, currently guarded by a local environment-controlled `CKACE_LEAVE_WRITE_FREEZE` check. Gateway flag does NOT block Desktop GAS writes.
- Admin entitlement add/edit/delete: `Gs/24_UserManagementSecurity.js` public `addUserPolicies`, `upUserPolicies`, `delDataUserPolicies` wrappers call private implementations in `Gs/09_UserPolicies.js`.
- Automatic default entitlement creation: `Gs/09_UserPolicies.js` `ensureDefaultLeavePoliciesUnlocked_`, called from employee approval `Gs/06_Users.js` and helper `ensureDefaultLeavePolicies_`. Temporarily rejecting this leave-policy operation may block employee activation during a bounded freeze. Do NOT silently skip required leave policies or activate an employee without expected policy consistency.
- Policy rollback-only helpers: `rollbackLeavePoliciesByIds_` and `rollbackLeavePoliciesForUser_`. Treat clean-up of partial transactions carefully during the freeze window; verify no in-flight operations before final snapshot.

## Implementation plan when Project A ownership is released
1. Implement one server-side GAS read-only guard helper `assertLegacyLeaveWriteOpen_` with `PropertiesService.getScriptProperties().getProperty('CKACE_LEAVE_WRITE_FREEZE')`. Unset or explicitly `false` preserves existing behavior. `true` throws stable `LEAVE_WRITE_FROZEN`. Invalid values and access failures must reject writes (fail closed); never expose a public setter or client override. GAS Script Property is **independent** of the same-named Cloud Run environment flag.
2. Call guard inside existing ScriptLock boundaries, after authentication and before the first side effect; for create check before replay and recheck after acquiring lock. Cover all desktop mutations, approval/revision, GAS LIFF decision, three policy admin wrappers, and automatic policy creation. For GAS LIFF create, verify guard runs within its delegated locked creator. Do not apply the guard to generic user-management locks, Attendance, OT, Medical, reads, or unrelated user mutations.
3. Write isolated GAS VM fixtures for frozen/unfrozen/malformed/unavailable config; guard ordering before Sheet/Drive mutation; idempotency replay boundary; authorization; disabled unrelated modules; protected UserPolicies default creation; leave reads; concurrent behavior under existing LockService.
4. Run the existing local `test-system` regressions relevant to security, registration, leave source, LIFF and existing LINE Gateway `npm run test:leave-bridge`, plus syntax checks. Existing registration/entitlement VM fixtures load `Gs/09_UserPolicies.js` alone: update their PropertiesService mock when introducing fail-closed property reads. Do not change accepted Production fixture hashes or call deployment scripts.
5. Only after code/test proof, update A/B HANDOFF and Project B M10D.4B evidence to VERIFIED_LOCAL. Production route/config remains LEGACY and should not be marked ready without live immutable revision proof.

## Production safety gates remain
- No all-channel Production freeze is active or authorized.
- No Production migration Delta import, source-of-truth/paired authority switch, Cloud Run traffic change or GAS/LINE deploy.
- `LEV-0106` remains unresolved, as does one ACTIVE account without LINE binding.
- A separate Owner Production execution approval is required for each high-impact phase.

## Evidence
`infra/production/m10d4b-legacy-freeze-preparation.json` is intentionally blocked until A-source tests are complete.
`infra/production/verify-m10d4b-legacy-freeze.mjs` and `verify-m10d4b-legacy-freeze.node-check.mjs` test that the preparation cannot accidentally claim implementation or Production approval.
