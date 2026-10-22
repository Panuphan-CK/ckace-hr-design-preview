# AGENTS.md — CKACE HR Design Preview Rules

## Repository role

This repository is the primary GitHub publication target for CKACE HR / Overview UXUI design previews.

Primary GitHub:
- `Panuphan-CK/ckace-hr-design-preview`
- Normal writable remote: `origin`

## Publication boundary

- Publish design-preview work here.
- Do **not** push design-preview commits to `Panuphan-CK/ckace-hr`.
- `Panuphan-CK/ckace-hr` is not a publication target for this preview repository.
- Never force-push unless the Owner explicitly authorizes it for a specific recovery.
- Prefer fast-forward publication from the current preview `main`.

## Scope

This repository contains preview-facing HTML/CSS/JS/assets for Owner UX/UI review.
It is not the Production API/runtime repository and must not be treated as authorization to deploy TEST or Production services.

## Design workflow

1. Inspect the current preview before editing.
2. Preserve the Owner-approved visual baseline.
3. Make bounded UX/UI changes only.
4. Verify rendered output in the browser.
5. Check for overflow/layout regressions.
6. Commit only reviewed preview files.
7. Push to this repository only after Owner approval.

## Source/reference repository

Application/runtime history may be read from `Panuphan-CK/ckace-hr` when needed for reference, but design-preview publication must remain in this repository.
