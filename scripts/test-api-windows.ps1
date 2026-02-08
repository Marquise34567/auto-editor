# Windows PowerShell Testing Guide for auto-editor API
# 
# IMPORTANT: PowerShell aliases 'curl' to Invoke-WebRequest.
# Use Invoke-RestMethod or curl.exe for consistent behavior across platforms.

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PREFERRED: PowerShell Invoke-RestMethod (native JSON support)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Test billing status API (returns JSON immediately, non-blocking)
$billingStatus = Invoke-RestMethod "http://127.0.0.1:3000/api/billing/status"
$billingStatus | ConvertTo-Json -Depth 10

# Alternative: Pretty-print with formatting
Invoke-RestMethod "http://127.0.0.1:3000/api/billing/status" | Format-List

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ALTERNATIVE: cmd.exe with curl.exe (explicit binary)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# From PowerShell, call cmd's curl.exe explicitly:
& cmd.exe /c "curl.exe http://127.0.0.1:3000/api/billing/status"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FULL ENDPOINT VERIFICATION SCRIPT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Host "Testing auto-editor API endpoints..." -ForegroundColor Cyan

# Check if server is running
try {
    Write-Host "`n1. Billing Status Endpoint:" -ForegroundColor Yellow
    $status = Invoke-RestMethod "http://127.0.0.1:3000/api/billing/status" -TimeoutSec 5
    Write-Host "   ✓ Status: $($status.planId)" -ForegroundColor Green
    Write-Host "   ✓ Renders: $($status.rendersRemaining) remaining" -ForegroundColor Green
    Write-Host "   ✓ Can render: $($status.canRender)" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Check pricing page
try {
    Write-Host "`n2. Pricing Page:" -ForegroundColor Yellow
    $response = Invoke-WebRequest "http://127.0.0.1:3000/pricing" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✓ HTTP 200 (page loads)" -ForegroundColor Green
        if ($response.Content -like "*Simple, Transparent Pricing*") {
            Write-Host "   ✓ Content renders (pricing cards found)" -ForegroundColor Green
        } else {
            Write-Host "   ⚠ Content may be blank (check browser console)" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   ✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nDone." -ForegroundColor Cyan

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# WHY NOT JUST 'curl'?
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 
# PowerShell has a built-in 'curl' alias that maps to Invoke-WebRequest:
#   PS> Get-Alias curl
#   CommandType     Name                                               Definition
#   -----------     ----                                               ----------
#   Alias           curl -> Invoke-WebRequest
#
# This can cause confusion because:
#   1. It's slow (Invoke-WebRequest is slower than native curl.exe)
#   2. It requires more verbose JSON parsing
#   3. It behaves differently than curl in other shells (macOS, Linux, bash)
#
# Solution: Use Invoke-RestMethod (auto-parses JSON) or curl.exe (native binary)
#
