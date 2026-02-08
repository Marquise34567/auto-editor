# Untrack .next dev artifacts, ensure .gitignore ignores them, commit and push
if (-not (Test-Path ".gitignore")) { New-Item .gitignore -ItemType File | Out-Null }
if (-not (Select-String -Path .gitignore -Pattern '/.next' -SimpleMatch -Quiet)) {
  Add-Content -Path .gitignore -Value "`n/.next"
  Write-Host '.next appended to .gitignore'
} else {
  Write-Host '.next already in .gitignore'
}

if (Test-Path ".next") {
  git rm -r --cached .next
} else {
  Write-Host 'No .next directory present'
}

git add .gitignore
git add -A
$staged = git diff --cached --name-only
if ($staged) {
  git commit -m 'chore: remove tracked dev build artifacts (.next) and ignore them'
} else {
  Write-Host 'No changes to commit'
}

git push origin main
