<#
clean_and_push.ps1
Goal: safely stop GitHub secret-scan blocks by:
1) Checking for secret files/patterns in your working tree
2) Ensuring .gitignore blocks them
3) Removing any already-tracked secret files from git index (keeps local file if you want)
4) (Optional) Rewriting git history to purge secrets (ONLY if you confirm)
5) Committing + pushing

Run from your repo root:
  powershell -ExecutionPolicy Bypass -File .\clean_and_push.ps1

If you need history rewrite:
  powershell -ExecutionPolicy Bypass -File .\clean_and_push.ps1 -RewriteHistory

#>

param(
  [switch]$RewriteHistory,
  [switch]$AutoCommit,
  [string]$CommitMessage = "chore: remove secrets and ignore key files",
  [string]$Remote = "origin",
  [string]$Branch = ""
)

$ErrorActionPreference = "Stop"

function Write-Section($t) {
  Write-Host ""
  Write-Host "=== $t ===" -ForegroundColor Cyan
}

function Require-Cmd($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $name. Install it and try again."
  }
}

function Confirm($msg) {
  $ans = Read-Host "$msg (type YES to continue)"
  return ($ans -eq "YES")
}

Require-Cmd git

Write-Section "Repo sanity"
if (-not (Test-Path ".git")) { throw "Run this from the ROOT of your git repo (where .git exists)." }

# Resolve current branch if not provided
if ([string]::IsNullOrWhiteSpace($Branch)) {
  $Branch = (git branch --show-current).Trim()
  if ([string]::IsNullOrWhiteSpace($Branch)) {
    Write-Host "Could not detect current branch (detached HEAD). You can pass -Branch <name>."
    $Branch = "main"
  }
}
Write-Host "Using branch: $Branch"
Write-Host "Using remote: $Remote"

Write-Section "Scan for common secret files in working tree"
$secretFileGlobs = @(
  "*adminsdk*.json",
  "*service*account*.json",
  "*firebase*admin*.json",
  "*.pem",
  "*.p12",
  "*.key",
  "*private_key*.txt",
  "*private-key*.txt",
  "*credentials*.json",
  "*google-application-credentials*.json"
)

$foundFiles = @()
foreach ($g in $secretFileGlobs) {
  $foundFiles += Get-ChildItem -Path . -Recurse -File -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like $g -or $_.FullName -like "*\$g" }
}

# Deduplicate
$foundFiles = $foundFiles | Sort-Object FullName -Unique

if ($foundFiles.Count -gt 0) {
  Write-Host "Found files that LOOK like secrets (review carefully):" -ForegroundColor Yellow
  $foundFiles | ForEach-Object { Write-Host "  - $($_.FullName)" -ForegroundColor Yellow }
} else {
  Write-Host "No obvious secret files found by filename."
}

Write-Section "Quick grep for secret-like strings in repo (best-effort)"
# NOTE: this is a fast scan; it can have false positives.
$patterns = @(
  "-----BEGIN PRIVATE KEY-----",
  "private_key",
  "client_email",
  "AIzaSy",              # Google API key prefix
  "sk_live_",            # Stripe live key
  "sk_test_",            # Stripe test key
  "whsec_",              # Stripe webhook secret
  "xoxb-",               # Slack bot token
  "ghp_"                 # GitHub classic token
)

$matches = @()
foreach ($p in $patterns) {
  $m = git grep -n $p 2>$null
  if ($LASTEXITCODE -eq 0 -and $m) { $matches += $m }
}
if ($matches.Count -gt 0) {
  Write-Host "Found secret-like strings in tracked files:" -ForegroundColor Yellow
  $matches | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
  Write-Host "If any are real secrets, rotate them + remove from history." -ForegroundColor Yellow
} else {
  Write-Host "No secret-like strings found in tracked files by this quick scan."
}

Write-Section "Ensure .gitignore blocks key/secret files"
$ignoreAdds = @(
  "# secrets",
  "*.pem",
  "*.p12",
  "*.key",
  "*adminsdk*.json",
  "*service*account*.json",
  "*google-application-credentials*.json",
  ".env",
  ".env.local",
  ".env.*.local"
)

if (-not (Test-Path ".gitignore")) { New-Item -ItemType File -Path ".gitignore" | Out-Null }

$gi = Get-Content ".gitignore" -ErrorAction SilentlyContinue
$toAdd = @()
foreach ($line in $ignoreAdds) {
  if ($gi -notcontains $line) { $toAdd += $line }
}
if ($toAdd.Count -gt 0) {
  Add-Content ".gitignore" ($toAdd -join "`n")
  Write-Host "Updated .gitignore with secret-blocking rules."
} else {
  Write-Host ".gitignore already has the key rules."
}

Write-Section "Remove any already-tracked secret files from git index"
# This does NOT delete local files, it just untracks them.
# We only attempt for files that are both found AND tracked.
if ($foundFiles.Count -gt 0) {
  $tracked = @()
  foreach ($f in $foundFiles) {
    $rel = Resolve-Path $f.FullName -Relative
    $rel = $rel.TrimStart(".\")
    git ls-files --error-unmatch $rel 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $tracked += $rel }
  }

  if ($tracked.Count -gt 0) {
    Write-Host "These secret-like files are TRACKED by git (will untrack):" -ForegroundColor Yellow
    $tracked | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    if (Confirm "Untrack these files now? (local files will remain)") {
      foreach ($t in $tracked) {
        git rm --cached -- $t | Out-Host
      }
      Write-Host "Untracked secret-like files."
    } else {
      Write-Host "Skipped untracking."
    }
  } else {
    Write-Host "No secret-like files appear to be tracked by git."
  }
} else {
  Write-Host "No secret-like files found by filename, skipping untrack step."
}

Write-Section "Git status"
git status

Write-Section "OPTIONAL: rewrite git history to purge secrets"
if ($RewriteHistory) {
  Require-Cmd git
  # git-filter-repo is safest, but may not be installed
  $hasFilterRepo = $false
  try { git filter-repo --help 1>$null 2>$null; $hasFilterRepo = $true } catch { $hasFilterRepo = $false }

  if (-not $hasFilterRepo) {
    Write-Host "git-filter-repo not found." -ForegroundColor Yellow
    Write-Host "Install:  pip install git-filter-repo" -ForegroundColor Yellow
    Write-Host "Then re-run with -RewriteHistory." -ForegroundColor Yellow
    exit 1
  }

  Write-Host "History rewrite is DESTRUCTIVE (force-push). Make sure nobody else is relying on current history." -ForegroundColor Yellow
  if (-not (Confirm "Proceed with HISTORY REWRITE?")) {
    Write-Host "Skipped history rewrite."
    goto AfterRewrite
  }

  # Build paths file to remove, based on found files + common patterns
  $pathsFile = Join-Path $PWD "paths-to-remove.txt"
  $paths = @()
  foreach ($g in $secretFileGlobs) { $paths += $g }
  # Also include explicit known files if they exist
  if ($foundFiles.Count -gt 0) {
    foreach ($f in $foundFiles) {
      $rel = Resolve-Path $f.FullName -Relative
      $rel = $rel.TrimStart(".\")
      $paths += $rel
    }
  }
  $paths = $paths | Sort-Object -Unique
  Set-Content -Path $pathsFile -Value ($paths -join "`n")

  Write-Host "Created $pathsFile with patterns/paths to purge from history."

  # Rewrite history removing those paths
  git filter-repo --paths-from-file $pathsFile --invert-paths | Out-Host

  Write-Host "History rewrite completed locally."
  Write-Host "Next: force-push to remote." -ForegroundColor Yellow
  if (Confirm "Force-push rewritten history to $Remote/$Branch now?") {
    git push $Remote $Branch --force | Out-Host
    Write-Host "Force-push complete."
  } else {
    Write-Host "Skipped force-push. You must force-push manually for GitHub to accept."
  }
}

:AfterRewrite

Write-Section "Commit + push"
if ($AutoCommit) {
  git add -A
  git commit -m "$CommitMessage" | Out-Host
}

Write-Host "If you already committed your changes, push now with:"
Write-Host "  git push -u $Remote $Branch" -ForegroundColor Green

Write-Host ""
Write-Host "Done." -ForegroundColor Cyan
