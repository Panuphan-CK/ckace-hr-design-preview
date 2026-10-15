# M10D.4 — LEAVE Pre-execution Readiness

Updated: 2026-10-08 Asia/Bangkok

## Decision
Preparation evidence: PASS. Production execution: NO-GO. Current Owner authorization covers pre-execution inspection and reversible preparation only. No Production freeze, import, deployment, traffic, authority, DNS, LINE, GAS or credential action is permitted yet.

## Verified legacy LEAVE write paths
- Desktop direct GAS: addRequest, upRequest, delDataLeaveRequests, cancelApprovedLeave (Gs/01_LeaveRequest.js); setConfirmLeaveApprove, requestRevisionForLeave, resubmitRevisedLeave (Gs/02_Approval.js).
- GAS LIFF: submitLineLeaveRequest (Gs/21_LineIntegration.js), decideLineLeaveRequest_ (Gs/25_LineLiffServices.js).
- Gateway LIFF: /api/liff/leave and /api/liff/decision (line-gateway/server.js).

The Gateway source has a CKACE_LEAVE_WRITE_FREEZE check for leave and decision, but does not govern Desktop google.script.run calls to GAS. End-to-end live Production freeze coverage is NOT proven. The previously planned Production LEAVE bridge is not established as deployed. Do not confuse local guard presence with Production coverage.

## Other open gates
- LEV-0106 source currentStep conflicts with pending approval steps. Explicit correction/disposition is required before import.
- 1 of 20 ACTIVE identities lacks LINE binding; keep fail-closed until Owner-verified remediation or documented launch exclusion.
- M10D.3 delta evidence: 576 rows, 27 raw changes (6 actionable, 1 source inconsistency, 20 representation differences). Recapture all five bounded sources after an approved and verified freeze.
- Before any Production execution: recheck Legacy quiet window, backups and recovery, exact deployed revisions, login/RBAC, migration/attachment reconciliation, monitoring and rollback.

## Preparation remediation plan
1. Implement and test a shared Legacy GAS LEAVE write barrier at each direct Desktop and GAS LIFF write entry, without blocking unrelated HR modules.
2. Verify that the Gateway guard and immutable deployed gateway revision match the intended LEAVE-only behavior.
3. Validate the frozen and unfrozen flows, including in-flight writes and read continuity, on TEST or isolated runtimes.
4. Establish an owner-approved bounded Production window and require a distinct approval for each Production freeze, delta import and paired LEAVE_READ + LEAVE_WRITE authority switch.
5. Use exact final snapshots and migrations with source-qualified provenance; never silently repair LEV-0106 or blindly import raw representation differences.
6. After any NEW-authority write, stop writes and reconcile before attempting rollback to GAS; never perform an automatic blind route-back.

## Verification artifacts
- infra/production/m10d4-preexecution-readiness.json
- infra/production/verify-m10d4-preexecution.mjs
- infra/production/verify-m10d4-preexecution.node-check.mjs

The verifier confirms that evidence is internally consistent and remains EXECUTION_NO_GO. Evidence PASS is not authorization for a live cutover.

## Status
PREEXECUTION_PARTIAL — live Legacy global write-freeze, identity and source exception are outstanding. No Production changes performed.
