<#
.SYNOPSIS
Delete or rotate USER_MANAGED keys for a GCP service account.

.DESCRIPTION
This script lists a service account's keys, filters user-managed keys
and allows deleting one or all of them. It supports PowerShell's
`-WhatIf` via `SupportsShouldProcess` so you can preview deletes.

USAGE
  .\delete-sa-keys.ps1 -SA my-sa@project.iam.gserviceaccount.com
  .\delete-sa-keys.ps1 -WhatIf
#>

[CmdletBinding(SupportsShouldProcess=$true)]
param(
  [Parameter(Mandatory=$false, HelpMessage="Service account email, e.g. my-sa@project.iam.gserviceaccount.com")]
  [string]$SA = ''
)

function Validate-ServiceAccountEmail {
  param([string]$Email)
  return $Email -match '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
}

if (-not $SA) {
  $SA = Read-Host "Service account email (e.g. my-sa@project.iam.gserviceaccount.com)"
}

if (-not (Validate-ServiceAccountEmail $SA)) {
  Write-Host "Invalid service account email: $SA" -ForegroundColor Red
  return
}

Write-Host "`n== Active gcloud user ==" -ForegroundColor Cyan
gcloud auth list

Write-Host "`n== Active gcloud project ==" -ForegroundColor Cyan
gcloud config get-value project

Write-Host "`n== Listing service account keys (showing keyType) ==" -ForegroundColor Cyan
gcloud iam service-accounts keys list `
  --iam-account="$SA" `
  --format="table(name.basename():label=KEY_ID,keyType:label=TYPE,disabled:label=DISABLED,validAfterTime:label=CREATED_AT,validBeforeTime:label=EXPIRES_AT)"

Write-Host "`n== USER_MANAGED keys only (these are the ones you can delete) ==" -ForegroundColor Cyan
$userKeys = (gcloud iam service-accounts keys list `
  --iam-account="$SA" `
  --managed-by=user `
  --format="value(name.basename())") | Where-Object { $_ -match '^[a-f0-9]{40}$' }

if (-not $userKeys -or $userKeys.Count -eq 0) {
  Write-Host "No USER_MANAGED keys found. If you still see keys above, they are likely SYSTEM_MANAGED (often not deletable).`n" -ForegroundColor Yellow
  return
}

Write-Host "`nUSER_MANAGED KEY_IDs found:" -ForegroundColor Green
$userKeys | ForEach-Object { Write-Host " - $_" }

Write-Host "`nChoose what to do:" -ForegroundColor Cyan
Write-Host "  1) Delete ONE key (safer)"
Write-Host "  2) Delete ALL user-managed keys (only if you're rotating everything)"
$choice = Read-Host "Enter 1 or 2"

if ($choice -eq "1") {
  $target = Read-Host "Paste the KEY_ID (40 chars) you want to delete"
  if ($target -notmatch '^[a-f0-9]{40}$') { Write-Host "That doesn't look like a 40-char key id." -ForegroundColor Red; return }
  if ($userKeys -notcontains $target) { Write-Host "That KEY_ID isn't in the USER_MANAGED list above." -ForegroundColor Red; return }

  $confirm = Read-Host "Delete key $target for $SA ? (Y/N)"
  if ($confirm -match '^[Yy]$') {
    if ($PSCmdlet.ShouldProcess("$SA key $target","Delete")) {
      gcloud iam service-accounts keys delete $target --iam-account="$SA"
      Write-Host "Done." -ForegroundColor Green
    }
    else {
      Write-Host "(Preview) Delete skipped by -WhatIf or user." -ForegroundColor Yellow
    }
  } else {
    Write-Host "Cancelled." -ForegroundColor Yellow
  }
}
elseif ($choice -eq "2") {
  $confirmAll = Read-Host "Delete ALL USER_MANAGED keys for $SA ? (Y/N)"
  if ($confirmAll -match '^[Yy]$') {
    foreach ($k in $userKeys) {
      Write-Host "`nDeleting $k ..." -ForegroundColor Yellow
      if ($PSCmdlet.ShouldProcess("$SA key $k","Delete")) {
        gcloud iam service-accounts keys delete $k --iam-account="$SA" --quiet
      }
      else {
        Write-Host "(Preview) Delete $k skipped by -WhatIf or user." -ForegroundColor Yellow
      }
    }
    Write-Host "`nDone deleting all USER_MANAGED keys." -ForegroundColor Green
  } else {
    Write-Host "Cancelled." -ForegroundColor Yellow
  }
}
else {
  Write-Host "Invalid choice." -ForegroundColor Red
}
