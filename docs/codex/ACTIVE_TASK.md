# CKACE HR — ACTIVE TASK

Updated: 2026-10-26 Asia/Bangkok

## PROD-READINESS-04 — DEV/TEST Leave migration rehearsal from approved sanitized source

Status: READY AFTER OWNER INPUT — no live GAS or Production access
Priority: P1 — the selected bounded cutover has no end-to-end source/target importer or evidence yet

Decision boundary:
The Owner selected a planning-only Leave cutover. LEAVE_READ and LEAVE_WRITE are the only routes intended for NEW; every other module remains LEGACY. This is not Production approval.

Objective / why now:
Turn the Local migration contracts and Leave transformers into an evidenced DEV/TEST rehearsal using an Owner-approved, privacy-scrubbed APP_LEAVE_GAS snapshot. Prove that identities, organization references, entitlements, requests, approval state and attachments can be mapped and reconciled before any Production decision.

Required Owner inputs:
- An approved sanitized snapshot/export with stable pseudonymous IDs and no unmasked names, emails, phone numbers, LINE IDs, credentials, or live private file URLs/content.
- A tab/column data dictionary and confirmation of which tabs and historical periods are authoritative.
- Leave quota semantics for the cutover year: granted quota versus current remaining balance, manual adjustments, carry-over, and treatment of pending/sent-back requests.
- Confirmation of the proposed rehearsal ceilings: write-freeze maximum 60 minutes, restore RTO maximum 60 minutes, and RPO 0 committed writes after the final freeze snapshot.
- A named Project A/GAS and LINE configuration owner for a later separately approved cutover; no access is requested in this task.

Scope:
- Implement a read-only source adapter and a durable, provenance-keyed DEV/TEST target-store adapter only after the sanitized fixture contract is approved. Prove each LEAVE_READ/LEAVE_WRITE route is consumed by the intended service; do not infer a source switch from route configuration alone.
- Map the required organization and employee identity dependencies before importing Leave entitlements, requests, approval steps, and attachment links.
- Rehearse full snapshot plus final delta, idempotent replay, reconciliation, pending-request continuity, attachment copy/checksum, DEV/TEST backup/restore, and rollback behavior.
- Keep evidence tagged DEV_TEST_EVIDENCE_ONLY and keep all other module routes on LEGACY.

Out of scope:
- Reading live Sheets/Drive or inspecting Project A source/configuration.
- Production DB, R2 bucket, credentials, Secret Manager, IAM, Cloud settings, migration, deploy, traffic, DNS/Firebase, or LINE changes.
- Any Production cutover or data mutation; those require separate named Owner approval.
- Treating a proposed RTO/freeze threshold as approved until the Owner confirms it.

Acceptance criteria:
1. Two extractions of an unchanged sanitized snapshot produce identical per-tab SHA-256 hashes; 100% of manifest-required tabs/rows are accounted for; privacy scan finds 0 unmasked direct identifiers or secrets.
2. 100% of employee identities and required org/role references map; 100% of in-scope Leave row counts and request statuses match. Per-employee/type balance delta is at most 0.01 day; 0 unexplained differences. Every exception has a unique ID, owner-approved reason, and disposition.
3. 100% of in-scope current Leave attachments are present in DEV/TEST R2 with exact SHA-256, byte size, owner/request link, and privacy class; 0 missing or unauthorized objects.
4. Re-running the same migration creates 0 duplicate target rows and reports 100% idempotent matches.
5. 100% of open requests retain the same status, current step, full approver/co-approver set, comments, and history; 0 pending request is lost or duplicated. ApprovalInstance, co-approver, and decider mappings are covered.
6. Two DEV/TEST backup/restore rehearsals pass; all in-scope row counts and hashes match 100%; proposed RPO is 0 committed writes after freeze and RTO is at most 60 minutes.
7. Two rollback rehearsals include at least 1 post-cutover request and 1 approval each; 100% of those writes are replayed/reconciled to LEGACY with 0 lost or duplicate records; proposed rollback completion is at most 60 minutes, subject to Owner confirmation.
8. Prove 100% of Leave routes reach the intended target, attachment/notification dependencies work without silently broadening the selected boundary, and unaffected modules remain LEGACY. Before PASS, evidence includes source hashes, importer run IDs, reconciliation reports, attachment checksum manifest, backup/restore timings, rollback logs, and route-state integration evidence. No Production system is accessed or changed.

Next TASK:
After this rehearsal passes, define a separately gated Production readiness/go-no-go task. Production remains NO-GO until that task is complete and separately approved.