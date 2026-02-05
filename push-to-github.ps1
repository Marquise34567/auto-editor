# ============================================
# PUSH TO GITHUB - Auto-Editor
# ============================================
# 
# INSTRUCTIONS:
# 1. Replace YOUR_USERNAME below with your GitHub username
# 2. Run this script: .\push-to-github.ps1
#

$GITHUB_USERNAME = "YOUR_USERNAME"  # ← CHANGE THIS!

# ============================================

Write-Host "`n🚀 PUSHING TO GITHUB" -ForegroundColor Cyan
Write-Host "Repository: https://github.com/$GITHUB_USERNAME/auto-editor`n" -ForegroundColor White

# Verify we're in the right directory
$cwd = Get-Location
if ($cwd.Path -ne "C:\Users\Quise\Downloads\auto-editor") {
    Set-Location "C:\Users\Quise\Downloads\auto-editor"
    Write-Host "✓ Changed to project directory" -ForegroundColor Green
}

# Check git status
Write-Host "`n📊 Git Status:" -ForegroundColor Yellow
git status

# Confirm before pushing
Write-Host "`n⚠️  Ready to push 95 files to GitHub?" -ForegroundColor Yellow
Write-Host "   Repository: $GITHUB_USERNAME/auto-editor" -ForegroundColor White
$confirm = Read-Host "   Continue? (Y/N)"

if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "`n❌ Cancelled" -ForegroundColor Red
    exit
}

# Add remote
Write-Host "`n🔗 Adding remote..." -ForegroundColor Cyan
git remote remove origin 2>$null  # Remove if exists
git remote add origin "https://github.com/$GITHUB_USERNAME/auto-editor.git"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Remote added" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to add remote" -ForegroundColor Red
    exit 1
}

# Rename branch to main
Write-Host "`n🌿 Setting branch to main..." -ForegroundColor Cyan
git branch -M main
Write-Host "✓ Branch renamed to main" -ForegroundColor Green

# Push to GitHub
Write-Host "`n⬆️  Pushing to GitHub..." -ForegroundColor Cyan
Write-Host "   This may take 30-60 seconds..." -ForegroundColor Gray

git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ SUCCESS! Code pushed to GitHub" -ForegroundColor Green
    Write-Host "`n📍 Repository URL:" -ForegroundColor Cyan
    Write-Host "   https://github.com/$GITHUB_USERNAME/auto-editor" -ForegroundColor White
    Write-Host "`n🎯 Next Step: Deploy to Vercel" -ForegroundColor Yellow
    Write-Host "   1. Visit: https://vercel.com/new" -ForegroundColor White
    Write-Host "   2. Import: $GITHUB_USERNAME/auto-editor" -ForegroundColor White
    Write-Host "   3. Add SESSION_SECRET env var" -ForegroundColor White
    Write-Host "   4. Deploy!" -ForegroundColor White
    Write-Host "`n📖 See DEPLOY_NOW.md for full instructions" -ForegroundColor Gray
} else {
    Write-Host "`n❌ PUSH FAILED" -ForegroundColor Red
    Write-Host "`n🔐 Authentication Required:" -ForegroundColor Yellow
    Write-Host "   If you see 'Authentication failed', you need a Personal Access Token:" -ForegroundColor White
    Write-Host "`n   1. Visit: https://github.com/settings/tokens" -ForegroundColor Cyan
    Write-Host "   2. Click 'Generate new token (classic)'" -ForegroundColor White
    Write-Host "   3. Select scope: ✓ repo" -ForegroundColor White
    Write-Host "   4. Generate token and copy it" -ForegroundColor White
    Write-Host "   5. When prompted for password, paste the TOKEN (not your password)" -ForegroundColor Yellow
    Write-Host "`n   Or use SSH: See DEPLOY_STEPS.md section 'SSH Setup'" -ForegroundColor Gray
    Write-Host "`n   Then re-run: .\push-to-github.ps1" -ForegroundColor Cyan
}

Write-Host ""
