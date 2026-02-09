param(
  [string]$Token,
  [string]$Plan = 'creator'
)

if (-not $Token) { Write-Error 'Token is required'; exit 1 }

try {
  $body = @{ plan = $Plan } | ConvertTo-Json
  $resp = Invoke-RestMethod 'http://localhost:3000/api/stripe/checkout' -Method Post -Headers @{ Authorization = "Bearer $Token"; 'Content-Type' = 'application/json' } -Body $body -ErrorAction Stop
  Write-Host "OK: $(ConvertTo-Json $resp -Compress)"
} catch {
  if ($_.Exception.Response) {
    $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $body = $sr.ReadToEnd()
    Write-Host "ERROR BODY: $body"
  } else {
    Write-Host "ERROR: $($_.Exception.Message)"
  }
  exit 1
}
