param(
  [int]$AmountCents = 100,
  [string]$Currency = 'usd',
  [string]$Nickname = 'dev-temp-price'
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')
$envFile = Join-Path $repoRoot '.env.local'
if (-not (Test-Path $envFile)) { Write-Error ".env.local not found at $envFile"; exit 1 }

$stripeKey = (Get-Content $envFile | Select-String '^\s*STRIPE_SECRET_KEY\s*=') -replace '^[^=]*=','' -replace '"','' -replace "'",""
$stripeKey = $stripeKey.Trim()
if (-not $stripeKey) { Write-Error 'STRIPE_SECRET_KEY not found in .env.local'; exit 1 }

Write-Host "Using Stripe key prefix: $($stripeKey.Substring(0,4))..."

# Create product
try {
  $productResp = Invoke-RestMethod 'https://api.stripe.com/v1/products' -Method Post -Body @{ name = 'Dev Test Product' } -Headers @{ Authorization = "Bearer $stripeKey" } -ErrorAction Stop
  $productId = $productResp.id
  Write-Host "Created product: $productId"
} catch {
  Write-Host "Product creation failed: $($_.Exception.Message)"
  if ($_.Exception.Response) { $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); Write-Host $sr.ReadToEnd() }
  exit 1
}

# Create price
try {
  $priceResp = Invoke-RestMethod 'https://api.stripe.com/v1/prices' -Method Post -Body @{ unit_amount = $AmountCents; currency = $Currency; recurring = @{ interval = 'month' }; product = $productId; nickname = $Nickname } -Headers @{ Authorization = "Bearer $stripeKey" } -ErrorAction Stop
  Write-Host "Created price: $($priceResp.id)"
  Write-Host "Price object: $(ConvertTo-Json $priceResp -Compress)"
} catch {
  Write-Host "Price creation failed: $($_.Exception.Message)"
  if ($_.Exception.Response) { $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); Write-Host $sr.ReadToEnd() }
  exit 1
}

# Optionally print env var snippet to add to .env.local
Write-Host "Add to .env.local: STRIPE_PRICE_CREATOR=$($priceResp.id)"