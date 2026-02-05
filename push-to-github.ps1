# push-to-github.ps1
# Simple, safe Git push script (no fancy characters)

$ErrorActionPreference = "Stop"

# Move to this script's folder (repo root if script is in root)
Set-Location -Path (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "Repo:" (Get-Location)

git --version | Out-Null

# Show status
git status

# Add everything
git add -A

# Commit message (change if you want)
$msg = "chore: update"
git commit -m $msg 2>$null

# If nothing to commit, git returns nonzero; ignore that case
if ($LASTEXITCODE -ne 0) {
  Write-Host "Nothing to commit (that's okay)."
}

# Push current branch
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
Write-Host "Pushing branch:" $branch
git push -u origin $branch

Write-Host "Done."

