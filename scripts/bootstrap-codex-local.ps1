$ErrorActionPreference = "Stop"

Write-Host "=== CK Leave Desktop / Codex Local bootstrap ===" -ForegroundColor Cyan

# Confirm repository context.
if (-not (Test-Path ".git")) {
  throw "Run this script from the ckace-hr-design-preview repository root."
}

Write-Host "Repository:" (git remote get-url origin)
Write-Host "Branch:" (git branch --show-current)
Write-Host "HEAD:" (git rev-parse --short HEAD)

# Python is required by UI UX Pro Max.
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
  $python = Get-Command python3 -ErrorAction SilentlyContinue
}
if (-not $python) {
  throw "Python 3 is required. Install Python 3, then rerun this script."
}

& $python.Source --version

# Node/npm is required to bootstrap the pinned UUPM skill.
$npx = Get-Command npx -ErrorAction SilentlyContinue
if (-not $npx) {
  throw "Node.js/npx is required. Install Node.js, then rerun this script."
}

Write-Host "Installing repo-local UI UX Pro Max v2.15.0 for Codex..." -ForegroundColor Yellow
npx --yes ui-ux-pro-max-cli@2.15.0 init --ai codex

if (-not (Test-Path ".agents/skills/ui-ux-pro-max/SKILL.md")) {
  throw "UI UX Pro Max installation did not create .agents/skills/ui-ux-pro-max/SKILL.md"
}

Write-Host ""
Write-Host "Local setup complete." -ForegroundColor Green
Write-Host "Open this repository as a LOCAL Codex project."
Write-Host "Controller rules: AGENTS.md"
Write-Host "Controller skill: .agents/skills/ck-leave-controller/SKILL.md"
Write-Host "Design baseline: design-system/ck-leave-desktop/MASTER.md"
