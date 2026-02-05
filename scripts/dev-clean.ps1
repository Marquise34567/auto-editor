# Clean dev server startup script for Windows

Write-Host "Cleaning up..." -ForegroundColor Yellow

# Kill any existing Node processes
taskkill /F /IM node.exe 2>$null | Out-Null
Start-Sleep -Seconds 2

# Remove .next build cache
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Removed .next cache" -ForegroundColor Green
}

Write-Host "Starting clean dev server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor DarkGray
Write-Host "  Open -> http://127.0.0.1:3000" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor DarkGray
Write-Host ""

# Start Next.js dev server bound to all interfaces
& npm run dev
