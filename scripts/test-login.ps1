# Test login script: signs in via Firebase REST, posts idToken to /api/auth/login, prints Set-Cookie and /api/auth/me
# Usage: .\test-login.ps1 -Email 'you@example.com' -Password 'p@ssw0rd'
param(
  [string]$Email,
  [string]$Password
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')
$envFile = Join-Path $repoRoot '.env.local'
if (-not (Test-Path $envFile)) { Write-Error ".env.local not found at $envFile"; exit 1 }

$api = (Get-Content $envFile | Select-String '^\s*NEXT_PUBLIC_FIREBASE_API_KEY\s*=') -replace '^[^=]*=','' -replace '"','' -replace "'",''
$api = $api.Trim()
if (-not $api) { Write-Error 'Could not find NEXT_PUBLIC_FIREBASE_API_KEY in .env.local'; exit 1 }

Write-Host "Using API key: $($api.Substring(0,8))..."

if (-not $Email) { $Email = Read-Host "Firebase test email" }
if (-not $Password) { $Password = Read-Host "Firebase test password" -AsSecureString | ConvertFrom-SecureString -AsPlainText -ErrorAction SilentlyContinue }
$password = $Password

$body = @{email=$email; password=$password; returnSecureToken=$true} | ConvertTo-Json
try {
  $idResp = Invoke-RestMethod "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$api" -Method Post -ContentType 'application/json' -Body $body -ErrorAction Stop
} catch {
  Write-Error "Firebase sign-in failed: $_"; exit 1
}

if (-not $idResp.idToken) { Write-Error "No idToken returned"; exit 1 }
$idToken = $idResp.idToken

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
try {
  $loginResp = Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/login' -Method Post -Body (ConvertTo-Json @{idToken=$idToken}) -ContentType 'application/json' -WebSession $session -ErrorAction Stop
} catch {
  Write-Error "/api/auth/login request failed: $_"; exit 1
}

Write-Host "LOGIN STATUS: $($loginResp.StatusCode)"
Write-Host "SET-COOKIE: $($loginResp.Headers['Set-Cookie'])"

try {
  $meResp = Invoke-RestMethod 'http://localhost:3000/api/auth/me' -WebSession $session -ErrorAction Stop
  Write-Host "ME RESPONSE: $(ConvertTo-Json $meResp -Compress)"
} catch {
  Write-Error "/api/auth/me request failed: $_"
}
