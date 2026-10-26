# CKACE HR — ACTIVE TASK

Updated: 2026-10-26 Asia/Bangkok

## PROD-READINESS-01 — Read-only Production readiness gap assessment

Status: **ACTIVE — TESTm74 authenticated Leave and role/NAV gate PASS; Production remains NO-GO**
Priority: **P1 — establish evidence and Owner decisions before any Production readiness claim**

Objective / why now:
The TESTm74 authenticated Leave workflow and Employee/Manager/SuperAdmin NAV, direct-URL, and responsive checks are complete. Production is still NO-GO because current evidence does not prove the intended data source of truth, migration/reconciliation, recovery, monitoring, or rollback readiness. First assemble a source-based readiness gap assessment without accessing or changing Production.

Scope:
- Read current CKACE_HR source, migrations, deployment configuration, and Local documentation to map Production-critical paths and identify evidence gaps.
- Assess documented migration/reconciliation, backup/restore, monitoring, rollback, and operational acceptance evidence using Local sources only.
- List material Owner decisions, especially the source-of-truth and cutover choice, only after the repository evidence is assembled.
- Propose the next bounded readiness TASK with concrete acceptance criteria.

Out of scope:
- Any Production deploy, traffic change, database query/mutation, DNS/Firebase/LINE change, credentials, Secret Manager, IAM, or project setting.
- TEST build/deploy unless separately requested.
- Accessing Project A or using its code/data/reference without explicit Owner direction.
- Changing application source or protected design artifacts unless a proven P0/P1 blocker requires a separately scoped implementation task.

Acceptance / verification:
- Production deployment topology and relevant data/migration paths are described with Local source/document references.
- Each readiness gate is classified PASS, GAP, or NOT VERIFIED with evidence; no status is inferred from old milestones.
- Any decisions that materially change data authority, architecture, permissions, or cutover are presented to the Owner with options, pros/cons, and a recommendation.
- No Production system or data is accessed or changed.
- `HANDOFF.md`, `PROJECT_PLAN.md`, and this file reflect the current one-task plan when the assessment session completes.

Evidence / current state:
- TESTm74 is live from `source/main` commit `1322ed48e98428ffd580a6ec2e8bb7cdec5132c7`; Cloud Build `3830ed94-07c4-49b5-a7e3-adaa073abd48`, API/Web traffic, public health, and Firebase Hosting were verified earlier.
- TEST Leave request `LEV-0024` passed Employee submission, Manager step 1 approval, SuperAdmin step 2 approval, and Employee final detail/notification verification. TEST data is retained.
- Employee NAV destinations rendered and its direct access to Approvals, Reports, and RBAC was denied. Manager visible Request, Approval, Calendar, Reports, and HR Settings destinations rendered; direct access to approval policies and RBAC was denied. SuperAdmin visible Request, Approval, Calendar, five Reports, and all 12 HR Settings destinations rendered; approval policies and RBAC were allowed.
- Responsive checks at 390 px covered Employee Leave/request menu; Manager dashboard, approvals/HR flyouts and checked pages; SuperAdmin dashboard, the complete HR Settings flyout, RBAC and Platform Settings. No checked document overflowed horizontally; final Platform Settings measurement was `innerWidth=390`, `scrollWidth=386`.
- Navigation/render checks do not claim full business-transaction coverage for every non-Leave module. No application regression was observed in this gate.
- Production readiness gates (data authority/migration/reconciliation, backup/restore, monitoring, rollback drill, and final go/no-go) remain NOT VERIFIED; Production remains NO-GO.

Next TASK:
`PROD-READINESS-02 — Resolve data authority and define the Production readiness evidence plan`, after the read-only gap assessment and Owner decisions.
