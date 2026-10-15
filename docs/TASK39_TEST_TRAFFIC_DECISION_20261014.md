# TASK-39 — TEST Traffic Decision

Date: 2026-10-14 Asia/Bangkok  
Project: `D:\CKACE_HR` / Project B only  
Scope: TEST traffic review/decision only  
Decision: **GO — WEB-ONLY TEST TRAFFIC PROMOTION RECOMMENDED**  
Traffic mutation: **EXECUTED + POST-SMOKE PASS**

## Current Shared TEST Traffic

API:
- service: `ckace-hr-api-test`
- baseline revision: `ckace-hr-api-test-m9d15d`
- immutable image digest: `sha256:587cf33d2c540a0cad6738ea998d73124d108adbb27797b3203dd8d0bd2c2092`
- traffic: **100%**

Web before approved switch:
- service: `ckace-hr-web-test`
- baseline revision: `ckace-hr-web-test-m9d15a`
- immutable image digest: `sha256:df538db04b1d4cfe67a3c77b52186f58e1a839075833bdfb414d1a77e4d7a2f1`
- traffic before switch: **100%**

Web after approved switch:
- revision: `ckace-hr-web-test-task35-20261014a`
- tag: `task35-responsive`
- immutable image digest: `sha256:f0afb619466061bc226571bad42b0badef1a44362b8e1ed2e293d6793ccd8f71`
- traffic: **100%**
- rollback baseline `ckace-hr-web-test-m9d15a` = **0%**

Firebase TEST routing is service-based:
- `/api/**` -> `ckace-hr-api-test`
- all other paths -> `ckace-hr-web-test`

Therefore a Cloud Run Web service traffic switch does not require a Firebase rewrite change and does not change API traffic.

## Candidate Review

Recommended Web candidate:
- revision: `ckace-hr-web-test-task35-20261014a`
- tag: `task35-responsive`
- digest: `sha256:f0afb619466061bc226571bad42b0badef1a44362b8e1ed2e293d6793ccd8f71`
- traffic at review time: **0%**
- Ready / Active / ContainerHealthy / ContainerReady = True
- runtime environment matches baseline:
  - `CKACE_RUNTIME_STAGE=test`
  - `CKACE_MODULE_ROUTING=LEGACY`

The TASK-35 candidate was built after the TASK-33 failure-handling changes and includes the accepted TASK-35 responsive/state hardening. No later TASK-36/37/38 work changed Web application source.

Source scan:
- no `/api/test/` references under `apps/web`
- no Web-side UAT bootstrap/harness route was found.

## API Candidate Exclusion

**Do not promote any TASK-30 / TASK-32 / TASK-34 API revision to shared TEST traffic.**

Current API source still registers TEST-only harnesses:
- `Wd13TestUatController`
- `Task32R2Module`
- `Task34R2Module`

Their runtime guards intentionally activate only on their task-specific revision prefixes:
- `ckace-hr-api-test-task30uat-*`
- `ckace-hr-api-test-task32r2-*`
- `ckace-hr-api-test-task34r2-*`

Promoting those exact revisions would make their corresponding TEST-only harness reachable on shared TEST traffic. They were designed only for isolated tagged execution.

Decision:
- **API stays on `m9d15d` at 100%**
- no API traffic mutation.

## Web-to-Baseline-API Compatibility Smoke

An owned loopback same-origin proxy was started with:

- Web -> `task35-responsive`
- API -> canonical `ckace-hr-api-test` baseline

The proxy itself remained TEST-only and loopback-only.

Results:
- `/login` -> **200**
- `/api/health` -> **200**
- `/api/ready` -> **200**
- signed-out `/api/security/session` -> **401**, expected fail-closed behavior.

Proxy safety tests:
- `node --test infra/rehearsal/wd13-same-origin-proxy.node-check.mjs`
- **8 / 8 PASS**
- Production / unrelated / insecure / credential-bearing target URLs rejected.

The owned proxy was stopped after the smoke.

## Phase A Evidence Supporting the Web Candidate

TASK-35:
- authenticated Browser QA
- 13 Desktop routes × 3 exact widths = 39 rendered combinations
- zero document-level horizontal overflow
- Loading / Empty / Error / Disabled states verified
- mobile navigation interaction PASS
- candidate revision remained 0%.

TASK-37:
- Prisma schema valid
- lint/typecheck PASS
- **78 / 78 test files PASS**
- **505 / 505 tests PASS**
- NestJS API build PASS
- Next.js production build PASS.

TASK-38:
- Phase A = PASS
- current API health/ready = 200
- cleaned Neon DEV state remains zero
- at TASK-38 review time, shared TEST traffic was still baseline 100%.

## Traffic Decision

### API

**KEEP**

`ckace-hr-api-test-m9d15d = 100%`

Reason:
- stable current baseline
- core API contracts already support the accepted Web candidate
- task-specific API revisions contain intentionally reachable UAT/reconciliation harnesses on their exact revision names
- no business API source change from TASK-33/35 requires API promotion.

### Web

**GO FOR PROMOTION — SUBSEQUENTLY APPROVED AND EXECUTED**

Recommended target:
`ckace-hr-web-test-task35-20261014a = 100%`

Recommended rollback target:
`ckace-hr-web-test-m9d15a = 100%`

A direct 100% TEST Web switch is preferred over a mixed canary because:
- this is TEST, not Production
- the candidate already completed authenticated route/viewport/state QA
- mixed UI revisions would make TEST results nondeterministic
- the old Web baseline remains available for immediate rollback.

## Approved Mutation Plan (subsequently executed)

Upon explicit Owner approval for the traffic mutation (later received):

1. Keep API traffic unchanged at `m9d15d = 100%`.
2. Switch Web service traffic:
   - `task35-20261014a = 100%`
   - `m9d15a = 0%`
3. Do not change Firebase rewrites.
4. Re-read Cloud Run traffic.
5. Smoke through canonical TEST front door:
   - Login page
   - API health
   - API ready
   - signed-out session behavior
6. If any regression is detected, rollback Web immediately:
   - `m9d15a = 100%`
   - candidate = 0%.

No Production, Project A, Neon PROD, LIFF/GAS/Gateway, DNS, credential, database, R2 or source-of-truth mutation is part of this traffic switch.

## Executed TEST Traffic Switch

Owner explicitly approved the exact Web-only traffic mutation.

Execution:
- task: `4b6caf0a-455f-4444-87c3-d0cc5d1c7c88`
- Web `ckace-hr-web-test-task35-20261014a` -> **100%**
- Web rollback baseline `ckace-hr-web-test-m9d15a` -> **0%**
- API `ckace-hr-api-test-m9d15d` remained **100%**
- Firebase rewrites unchanged.

Post-switch canonical Firebase TEST smoke:
- `/login` = **200**
- `/api/health` = **200**
- `/api/ready` = **200**
- signed-out `/api/security/session` = **401**

Browser smoke:
- canonical `/desktop` loaded the new shared Web service and redirected client-side to `/login`
- document title = `CKACE HR`
- username field present
- password field present
- submit button present
- document-level horizontal overflow = false.

No rollback condition was triggered.

## Final TASK-39 Decision

**TASK-39 = PASS / CLOSED.**

Final TEST state:
- API: `ckace-hr-api-test-m9d15d = 100%`
- Web: `ckace-hr-web-test-task35-20261014a = 100%`
- Firebase rewrites: unchanged
- old Web baseline: retained at 0% as rollback target
- Production / Project A / Neon PROD / LIFF-GAS-Gateway: unchanged.

Next gated task:
**TASK-40 — Production Readiness Plan**

Do not start TASK-40 without explicit Owner approval.
