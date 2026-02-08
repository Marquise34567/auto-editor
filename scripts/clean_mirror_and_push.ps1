<#
PowerShell script: clean_mirror_and_push.ps1
Purpose: Run BFG to purge secrets and large files from a mirror repo, GC, verify, and prompt before destructive push.
Usage: run inside the mirror clone directory (the one created with `git clone --mirror ...`)
Examples:
  cd C:\Users\Quise\Downloads\auto-editor-clean.git
  pwsh .\scripts\clean_mirror_and_push.ps1
#>

param(
    [string]$BfgUrl = 'https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar',
    [string]$BfgJar = 'bfg.jar',
    [string]$ReplaceFile = 'replace.txt',
    [string]$RemoteUrl = 'https://github.com/Marquise34567/auto-editor.git'
)

function Abort($msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

Write-Host "Running mirror cleanup script in: $(Get-Location)"

# Ensure this is a bare/mirror repo
$bare = (& git rev-parse --is-bare-repository 2>$null) -eq 'true'
if (-not $bare) {
    Write-Host "Warning: repository is not bare. This script expects a mirror (bare) repo created by `git clone --mirror`." -ForegroundColor Yellow
}

# Download BFG if not present
if (-not (Test-Path $BfgJar)) {
    Write-Host "Downloading BFG from $BfgUrl..."
    try {
        Invoke-WebRequest -Uri $BfgUrl -OutFile $BfgJar -UseBasicParsing -ErrorAction Stop
        Write-Host "Downloaded $BfgJar"
    } catch {
        Abort "Failed to download BFG jar: $_"
    }
} else {
    Write-Host "Found existing $BfgJar"
}

# Create replace.txt
if (-not (Test-Path $ReplaceFile)) {
    @'
private_key==>REMOVED
"private_key":==>REMOVED
client_email==>REMOVED
"client_email":==>REMOVED
-----BEGIN PRIVATE KEY-----==>REMOVED
-----END PRIVATE KEY-----==>REMOVED
BEGIN PRIVATE KEY==>REMOVED
'@ | Set-Content -Path $ReplaceFile -NoNewline
    Write-Host "Created $ReplaceFile"
} else {
    Write-Host "Using existing $ReplaceFile"
}

# Run BFG to delete filenames and replace secret literals
$deletePatterns = @(
    "firebase-adminsdk*.json",
    "*service-account*.json",
    "*.pem",
    "*.key",
    "google-credentials*",
    ".env.local",
    ".env.production",
    ".next",
    "node_modules",
    "public/outputs",
    "tmp",
    "test-output",
    "*.mp4",
    "*.mkv",
    "*.webm"
)

$delArgs = $deletePatterns | ForEach-Object { "--delete-files '$_'" } | Out-String
$delArgs = $delArgs -replace "\r?\n"," "

Write-Host "Running BFG to delete patterns and scrub secrets..."
$javaCmd = "java -jar $BfgJar $delArgs --replace-text $ReplaceFile ."
Write-Host $javaCmd

$proc = Start-Process -FilePath 'java' -ArgumentList "-jar", $BfgJar, $deletePatterns + @("--replace-text", $ReplaceFile, ".") -NoNewWindow -Wait -PassThru -ErrorAction Stop
if ($proc.ExitCode -ne 0) {
    Abort "BFG exited with code $($proc.ExitCode)"
}
Write-Host "BFG finished successfully."

# Finalize cleanup
Write-Host "Expiring reflogs and running aggressive GC..."
& git reflog expire --expire=now --all
& git gc --prune=now --aggressive

# Quick verification
Write-Host "Verifying history does not contain common secret strings (showing up to 20 results)..."
$privateKeyMatches = & git log --all -S 'private_key' --oneline 2>$null
if ($privateKeyMatches) { Write-Host "Found matches for 'private_key' (unexpected):"; $privateKeyMatches | Select-Object -First 20; } else { Write-Host "OK: no 'private_key' matches found." }

$filenameMatches = @()
foreach ($rev in (& git rev-list --all)) {
    $r = & git grep -I --line-number 'firebase-adminsdk.json' $rev 2>$null
    if ($r) { $filenameMatches += $r }
    if ($filenameMatches.Count -gt 0) { break }
}
if ($filenameMatches.Count -gt 0) { Write-Host "Found firebase-adminsdk.json in history (unexpected):"; $filenameMatches | Select-Object -First 10 } else { Write-Host "OK: no firebase-adminsdk.json in history." }

# Check or set remote origin
$remotes = & git remote -v
if (-not $remotes) {
    Write-Host "No remotes configured. Setting origin to: $RemoteUrl"
    & git remote add origin $RemoteUrl
} else {
    Write-Host "Existing remotes:"; $remotes
}

# Prompt before destructive push
Write-Host "ABOUT TO RUN DESTRUCTIVE PUSH: git push --force --mirror origin" -ForegroundColor Yellow
$answer = Read-Host "Type 'YES' to proceed, anything else to abort"
if ($answer -ne 'YES') {
    Write-Host "Aborting push. Review the mirror repo and run the force-push manually when ready." -ForegroundColor Cyan
    exit 0
}

# Execute force-push
Write-Host "Performing git push --force --mirror origin..."
$pushProc = Start-Process -FilePath 'git' -ArgumentList 'push','--force','--mirror','origin' -NoNewWindow -Wait -PassThru -ErrorAction SilentlyContinue
if ($pushProc) {
    if ($pushProc.ExitCode -eq 0) { Write-Host "Mirror push completed successfully." -ForegroundColor Green } else { Write-Host "Mirror push failed with exit code $($pushProc.ExitCode)" -ForegroundColor Red }
} else {
    Write-Host "git push failed to start or returned no process information." -ForegroundColor Red
}

Write-Host "Script complete."