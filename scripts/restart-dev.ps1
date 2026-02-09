Param()

# Stop processes listening on ports 3000..3010
$ports = 3000..3010
foreach ($p in $ports) {
  try {
    $conns = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue
    if ($conns) {
      $procs = $conns | Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue
      $procs | Sort-Object -Unique | ForEach-Object {
        if ($_ -and $_ -gt 0) {
          Write-Host "Stopping PID: $_"
          Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        }
      }
    }
  } catch {
    Write-Host "Error enumerating port" $p ":" $_
  }
}

# Remove Next.js cache and lockfiles
try { Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue } catch {}

# Start dev server (use default script)
npm run dev
