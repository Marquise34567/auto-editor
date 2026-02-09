$ErrorActionPreference = 'Stop'
$project = 'C:\Users\Quise\Downloads\auto-editor-c93f152cd5f9870dc38c62feb299a85919e1c212\auto-editor-c93f152cd5f9870dc38c62feb299a85919e1c212'
$lock = Join-Path $project '.next\dev\lock'
if (Test-Path $lock) { Remove-Item -LiteralPath $lock -Force; Write-Host 'Removed lock' } else { Write-Host 'No lock' }
$pids = @(Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess)
if ($pids.Count -gt 0) { Stop-Process -Id $pids -Force -ErrorAction SilentlyContinue; Write-Host 'Killed PIDs:' ($pids -join ',') } else { Write-Host 'No process on port 3000' }
Set-Location $project
npm run dev
