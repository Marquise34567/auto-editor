#!/usr/bin/env pwsh

# Test runner for soft billing system
# Usage: .\scripts\test-soft-billing.ps1 [--no-clean] [--verbose]

param(
    [switch]$NoClean,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

# Colors
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Cyan = "`e[36m"
$Reset = "`e[0m"

function Write-Log {
    param($Message, $Level = "info")
    $Color = switch ($Level) {
        "pass" { $Green }
        "fail" { $Red }
        "warn" { $Yellow }
        "info" { $Cyan }
        default { $Reset }
    }
    Write-Host "${Color}[$(Get-Date -Format 'HH:mm:ss')]${Reset} $Message"
}

try {
    Write-Log "Starting soft billing test suite..." "info"
    Write-Log ""
    
    # Check if npm/node are available
    $NodeVersion = node --version
    Write-Log "Node version: $NodeVersion" "info"
    
    # Option to skip cleanup
    if (-not $NoClean) {
        Write-Log "Cleaning test artifacts..." "info"
        if (Test-Path "./tmp/test-*") {
            Remove-Item "./tmp/test-*" -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    
    # Run the test script
    Write-Log "Running test script..." "info"
    Write-Log ""
    
    $Args = if ($Verbose) { "--verbose" } else { "" }
    & node scripts/test-soft-billing.mjs $Args
    
    $TestExitCode = $LASTEXITCODE
    
    Write-Log ""
    if ($TestExitCode -eq 0) {
        Write-Log "✅ All tests passed!" "pass"
        exit 0
    } else {
        Write-Log "❌ Tests failed with exit code: $TestExitCode" "fail"
        Write-Log "Check the output above for details" "warn"
        exit 1
    }
    
} catch {
    Write-Log "Error: $_" "fail"
    exit 1
}
