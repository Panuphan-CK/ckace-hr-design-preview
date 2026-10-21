# TASK-CX.1 — Local Working-Tree Provenance Reconciliation

Date: 2026-10-21
Status: **PASS**
Mode: read-only source inspection; documentation updates only

## Baseline

- Local branch: `main`
- Local HEAD: `65a901b632320bff4dd01fbf9d53d754f49b731b`
- `origin/main`: `ee42f38ae11b051b745c444c2d0e904b6de75e29`
- Local committed divergence vs `origin/main`: **0 ahead / 18 behind**
- Local working tree: dirty
- Owner-confirmed operational TEST baseline: **TESTm67**

Important: local dirty files must not be assumed to equal TESTm67.

## Remote lineage finding

The strongest current TEST-source lineage is `origin/claude/project-thread-j4idbg`.

Relative to Local HEAD:

- merge base: `4e20dded1a12e18820d66b43d07018dba3a36874`
- Local side after the merge base: 3 commits
- Claude branch side after the merge base: 26 commits

The Claude branch contains the TEST rounds m58–m66 and a TEST release pipeline configured for `m67`. Repository evidence does not by itself prove which exact Claude-branch commit produced the currently live TESTm67, so that exact deployment/source commit must be recovered before branch integration.

## Provenance classification

| Group | Evidence | Classification | Action |
|---|---|---|---|
| `apps/api/src/security/desktop-auth.*` — 3 tracked modified files | Local writes dated 2026-10-18; no matching commit contains `DESKTOP_LINE_VERIFIER` / `liff-login`; current Claude branch has a different later LIFF/auth implementation and additional login protections | **Superseded local LIFF-auth precursor / uncertain experimental branch of implementation** | Preserve. **Do not merge as-is.** Compare only after exact TESTm67 source commit is identified. |
| `docs/design/desktop-20261018/{prototype.js,style.css,hero-layout-editor.js}` | Current local design work; absent from Claude TEST branch; belongs to the active standalone prototype/design track | **TASK-39.9 work, newer/local-only, not TESTm67 evidence** | Preserve and continue only after TEST source reconciliation. |
| `apps/web/src/app/liff/_ckace/` — 32 files | Created 2026-10-18 immediately before Claude commit `786fdb1` (“Add Project B LIFF…”); comments and API shape match the LIFF bridge effort, but these source files are not in the committed Claude branch | **Strongly likely precursor/source workspace for the LIFF integration that was later committed in another form** | Preserve for now. Do not treat as current deploy source; do not commit wholesale. |
| `apps/web/public/liff-assets/` — 60 files | Same creation window as the local LIFF source; names correspond to assets later bundled under `apps/web/public/react-read/assets/` in commit `786fdb1`, but bytes are not exact matches | **LIFF source/design asset precursor** | Preserve until unique-value review; not TESTm67 source-of-truth. |
| `.claude/test-admin/` — 4 files | One-off TEST DB bootstrap/admin scripts dated 2026-10-16; contain TEST mutation logic; absent from committed branches | **Historical TEST-only operational tooling** | Keep out of normal product commits. Archive/ignore/delete only by explicit Owner decision after confirming no further TEST need. |
| `.claude/launch.json` | Local launch configuration for web/mock API | **Local development tooling** | Keep local unless Codex/Claude launch configuration is intentionally standardized. |
| Existing specialist skills under `.agents/skills/` — 172 files excluding the 3 controller/quality skills | Added locally 2026-10-18; absent from `origin/main`; includes `ui-ux-pro-max`, `design-system`, `ui-styling`, `design`, `brand`, `banner-design`, `slides` | **Local specialist agent tooling, not product/TEST code** | Preserve. Review licensing/size and decide later whether to version selected skills or keep them local. |
| Controller/quality skills — 3 files | Exact blob matches with `origin/main` | **Already published; only appears untracked because Local HEAD is behind** | No separate commit needed after safe branch sync. |
| `docs/codex/` — 6 files | Exact blob matches with `origin/main` before this TASK update | **Already published; local untracked appearance is branch-lag artifact** | No duplicate commit after safe branch sync; this TASK update becomes new Local doc work. |
| `docs/CURRENT_STATE_TESTM67_20261021.md`, `docs/README.md`, `design-system/ckace-hr-workspace/MASTER.md` | Exact blob matches with `origin/main` | **Already published; local untracked appearance is branch-lag artifact** | No duplicate commit after safe branch sync. |

## Critical risk found

The 3 local Desktop-auth modifications should **not** be promoted as current code.

Compared with the newer Claude TEST branch, the local version diverges in authentication behavior and removes/does not contain later protections/behavior, including the newer login-rate-limit/account-state handling present on the Claude branch. Treating these local files as authoritative would risk regressing current TEST behavior.

## What TESTm67 means for Local

Current evidence supports:

1. TESTm67 is the Owner-confirmed operational baseline.
2. Local `main` at `65a901b` is **not** the TESTm67 source baseline.
3. `origin/main` contains current documentation/controller commits, but not the later TEST implementation lineage.
4. `origin/claude/project-thread-j4idbg` contains the later implementation/test-round lineage and the `m67` release configuration.
5. The exact commit/build that produced live TESTm67 still needs to be proven from deployment/build evidence before integrating branches.

## Safe commit/work order

1. **TASK-CX.2 — Recover exact TESTm67 source/deployment commit and branch lineage.**
2. Create a protected integration plan for Local `main` without resetting or losing current prototype/local-only work.
3. Integrate the confirmed TESTm67 code lineage in bounded Git operations.
4. Re-evaluate the local LIFF-auth precursor and untracked LIFF source/assets against the confirmed TEST baseline.
5. Resume TASK-39.9 Desktop implementation from the reconciled codebase.
6. Review specialist skills separately as tooling provenance/licensing, not as product source.

## Verification

- No application/API/LIFF/prototype source file was modified during TASK-CX.1.
- No reset, clean, stash, checkout, merge, rebase, deploy, or source commit was performed.
- Findings came from Git history/tree/diff/hash comparison and read-only file inspection.
