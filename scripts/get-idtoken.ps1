param(
  [string]$Email = 'marquiseedwards00@gmail.com',
  [string]$Password = 'Quise!2003'
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')
$envFile = Join-Path $repoRoot '.env.local'
if (-not (Test-Path $envFile)) { Write-Error ".env.local not found at $envFile"; exit 1 }

$api = (Get-Content $envFile | Select-String '^\s*NEXT_PUBLIC_FIREBASE_API_KEY\s*=') -replace '^[^=]*=','' -replace '"','' -replace "'",""
$api = $api.Trim()
if (-not $api) { Write-Error 'Could not find NEXT_PUBLIC_FIREBASE_API_KEY in .env.local'; exit 1 }

Write-Host "Using API key prefix: $($api.Substring(0,8))..."

$body = @{email=$Email; password=$Password; returnSecureToken=$true} | ConvertTo-Json
try {
  $idResp = Invoke-RestMethod "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$api" -Method Post -ContentType 'application/json' -Body $body -ErrorAction Stop
} catch {
  Write-Error "Firebase sign-in failed: $_"; exit 1
}

if (-not $idResp.idToken) { Write-Error "No idToken returned"; exit 1 }
Write-Host "IDTOKEN:" $idResp.idToken
