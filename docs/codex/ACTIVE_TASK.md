# CKACE HR — ACTIVE TASK

Updated: 2026-10-25 Asia/Bangkok

## SOURCE-UNIFY-02 — Build and verify unified source on TEST

Status: **ACTIVE — awaiting separate Owner Build instruction; Production NO-GO**
Priority: **P1 — verify the unified source line on TEST**

Objective / why now:
The Owner approved publication of the locally verified TESTm73 integration to `source/main`. The next gate is a fresh TEST build from that exact unified commit, followed by revision, traffic, health, and authenticated regression checks. The TEST build requires a separate Owner instruction.

Scope after an explicit Build instruction:
- Build and deploy only approved CKACE_HR TEST services and Firebase Hosting using the unified `source/main` commit.
- Verify the exact commit, API/Web TEST revisions, 100% traffic on both new revisions, and public health.
- Recheck authenticated Leave workflow and Employee/Manager/SuperAdmin NAV and direct-URL behavior on the new TEST release.

Out of scope until separately approved:
- Starting any TEST build/deploy without the Owner's Build instruction.
- Any Production deploy, traffic, database, credentials, DNS, Firebase Production, or LINE Production change.
- Resetting, cleaning, stashing, or discarding uncertain Local changes or touching the protected design artifact.

Acceptance / verification:
- The built source is the published `source/main` integration commit.
- API and Web TEST revisions and traffic are verified, with public health identifying the new API revision.
- Authenticated role, NAV, direct-URL, and Leave workflow checks are reported as PASS, FAIL, or NOT VERIFIED with evidence.
- Production remains untouched.

Evidence / current state:
- SOURCE-UNIFY-01 merged `source/main` at `04c3d54` with TESTm73 branch `095e6bd` in `D:\CKACE_HR\.worktrees\main-integration`. Local lint, typecheck, full Vitest (109 files / 796 tests), packages/API build, Web `--webpack` build (31/31 pages), and Prisma validation passed.
- The Owner authorized publication to `source/main` on 2026-10-25 and explicitly required a separate Build instruction for TEST.
- Live TEST remains TESTm73 until a separately authorized release is verified. Production is NO-GO.

Next action:
Wait for the Owner's explicit `Build` instruction. Then build the published unified commit on TEST and verify the release and authenticated regression evidence.