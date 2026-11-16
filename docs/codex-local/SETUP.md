# CK Leave Desktop — Codex Local Setup (Windows)

This is the preferred workflow for CK Leave Desktop.

Local Codex is used because the project needs:
- direct access to the working repository
- terminal commands on the development machine
- local browser/frontend preview
- DevTools/browser inspection when approved
- fast visual iteration
- access to local developer tooling

## 1. Open the correct branch locally

Use the setup branch until the Controller workflow is accepted:

```powershell
git fetch origin
git switch codex/ck-leave-design-skills
git pull
```

If the branch does not exist locally yet:

```powershell
git fetch origin codex/ck-leave-design-skills
git switch -c codex/ck-leave-design-skills --track origin/codex/ck-leave-design-skills
```

## 2. Bootstrap the repo-local skills

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap-codex-local.ps1
```

This checks Python/Node and installs pinned UI UX Pro Max v2.15.0 into:
`.agents/skills/ui-ux-pro-max/`

## 3. Open as a Local Codex project

In the Codex desktop app:
1. New chat
2. Choose project
3. Select the local `ckace-hr-design-preview` repository folder
4. Keep execution mode local; do not select Cloud
5. Start the Controller chat from this local project

## 4. Controller model

Recommended starting point:
- Controller: GPT-6 Astra / Medium, when available
- Otherwise: GPT-5.6 Sol / High

The Controller should use Workers only when the local runtime exposes native subagent orchestration. If it does not, it must say so and execute the Design/UX and QA roles sequentially in the same Controller thread.

## 5. Browser and frontend workflow

Start the preview from the repo root:

```powershell
python -m http.server 4173
```

Open:
`http://localhost:4173/#dashboard`

Use the Codex in-app browser for visual QA. For deeper browser inspection/control, enable the supported browser developer controls in the desktop app and approve access when prompted.

## 6. First controlled run

The first run is AUDIT ONLY:
- no production UI edits
- Controller verifies branch, git status, skills, design baseline
- Design/UX audit uses UI UX Pro Max
- QA audit uses Web Design Guidelines
- Controller returns P0/P1/P2/P3 findings
- implementation starts only after owner approval

## 7. Local-first rule

Cloud environment files may remain in the repository for future use, but they are not part of the normal CK Leave workflow.

Normal development path:

```text
OWNER
  ↓
LOCAL CONTROLLER CHAT
  ↓
Design/UX Worker (or sequential role)
Implementation Worker
QA Worker
  ↓
Browser / Local Preview / Tests
  ↓
CONTROLLER REVIEW
  ↓
OWNER APPROVAL
```
