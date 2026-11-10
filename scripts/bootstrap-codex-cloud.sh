#!/usr/bin/env bash
set -euo pipefail

echo "CK Leave Desktop: Codex Cloud bootstrap"

if ! command -v python3 >/dev/null 2>&1 && ! command -v python >/dev/null 2>&1; then
  echo "ERROR: Python 3 is required for UI UX Pro Max." >&2
  exit 1
fi

# Install the pinned UI UX Pro Max skill into repo-local .agents/skills.
# The command writes project skill files only; it does not modify CK Leave UI source.
npx --yes ui-ux-pro-max-cli@2.15.0 init --ai codex

echo "Repo-local UI UX Pro Max installed."
echo "CK Leave project rules are in AGENTS.md."
