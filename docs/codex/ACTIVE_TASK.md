# CKACE HR — ACTIVE TASK

Updated: 2026-10-26 Asia/Bangkok

## PROD-READINESS-02 — Confirm initial Production data authority and cutover boundary

Status: **ACTIVE — awaiting Owner decision; no Production action is authorized**
Priority: **P1 — data authority changes migration, rollback, and Production acceptance criteria**

Objective / why now:
The Local-only readiness assessment found that the application defaults all module reads/writes to LEGACY and supports an explicit single-module cutover, while no real Production migration, reconciliation, restore, or rollback evidence is available. The Owner must choose the initial data-authority boundary before a detailed Production plan can be made.

Scope:
- Confirm whether initial Production operation keeps all module READ/WRITE authority at LEGACY or performs a bounded Leave cutover to NEW authority.
- Record the chosen authority boundary as a planning decision only.
- Define the next read-only evidence and readiness TASK for that choice after the Owner responds.

Out of scope:
- Any Production deploy, traffic change, database query/mutation, DNS/Firebase/LINE change, credentials, Secret Manager, IAM, or project setting.
- TEST build/deploy unless separately requested.
- Project A research or external legacy-system assumptions not provided by the Owner.
- Application/source changes; protected design artifacts remain untouched.

Acceptance / verification:
- Owner selects one authority boundary or gives another explicit scope.
- The choice and its implications for migration, reconciliation, rollback, and acceptance are documented.
- No Production system or data is accessed or changed.
- `HANDOFF.md`, `PROJECT_PLAN.md`, and `docs/codex/ACTIVE_TASK.md` match the chosen decision and next task.

Decision needed:
1. **Code-only initial release:** keep every module READ/WRITE on LEGACY; do not make CKACE HR PostgreSQL authoritative for a module in the initial release.
   - Pros: matches the current fail-closed default and avoids an initial data cutover.
   - Cons: depends on the LEGACY route and its bridge; does not verify new Leave storage/workflow as the Production source of truth.
2. **Bounded Leave cutover:** set only LEAVE_READ and LEAVE_WRITE to NEW; keep other modules on LEGACY.
   - Pros: limits the authority change to one module and enables the new Leave database path.
   - Cons: requires real Leave import/delta reconciliation, write freeze, backup/restore evidence, and a tested rollback plan before any Production release.

Recommendation:
Choose option 1 as a temporary authority boundary if the goal is to enable the application without moving data; do not treat that as proof that the new Leave system is fully authoritative or Production-ready. Choose option 2 if CKACE HR Leave must own Leave data from the first Production release; complete its data and recovery evidence first. This is a planning decision only, not approval to deploy.

Evidence / current state:
- `apps/api/src/runtime/runtime-config.ts` requires the Production database name `ckace_hr_prod`, R2 bucket `ckace-hr-prod-private`, and specified runtime dependencies; code-level guards do not prove those services/resources are provisioned.
- `apps/api/src/routing/module-routing-config.ts` defaults routes to LEGACY, requires paired READ/WRITE authority, and allows only one explicitly named NEW module in Production.
- `packages/migration/src/cutover-evidence.ts` requires write freeze, matching delta import reports, module reconciliation, and runtime verification; generated evidence is marked `DEV_TEST_EVIDENCE_ONLY` and `productionMutationAuthorized: false`.
- `packages/database/src/m8-database-rehearsal.ts` is guarded to `ckace_hr_dev` and creates migration/snapshot/recovered rehearsal databases. Its tests verify helper and environment guards; no run output or Production backup/restore evidence is present in current Local documentation.
- `firebase.prod.json` defines a production Hosting site and API/Web service routes. `infra/cloudbuild/` contains generic image build files and a TEST-only release pipeline; no Production release/rollback verification is evidenced in this checkout. External trigger configuration was not inspected.
- API `/health` reports stage/revision metadata and `/ready` checks PostgreSQL connectivity. No Local evidence establishes Production monitoring alerts, SLOs, backup schedules, recovery objectives, or rollback drill.
- `HANDOFF.md`, `PROJECT_PLAN.md`, and `ACTIVE_TASK.md` identify TESTm74. `AGENTS.md`, `README.md`, `docs/ARCHITECTURE.md`, and `docs/codex/DECISION_LOG.md` still state TESTm67/m67; the explicit current Owner direction and current continuity take precedence. Those stale references were not changed in this read-only assessment.
- Assessment used Local source/config/docs only. No tests, cloud commands, Production endpoints, credentials, or Project A sources were accessed.

Next TASK:
`PROD-READINESS-03 — Define the evidence and acceptance plan for the Owner-selected authority boundary`, after the decision above.
