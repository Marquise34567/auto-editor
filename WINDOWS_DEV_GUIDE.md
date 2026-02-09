# Windows Development Guide

## PowerShell / curl Confusion

On Windows, PowerShell has a built-in alias `curl` that maps to `Invoke-WebRequest`, which:
- Is slower than native curl.exe
- Requires verbose JSON parsing
- Behaves differently than curl on macOS/Linux

### ✅ RECOMMENDED: Use `Invoke-RestMethod`

PowerShell's `Invoke-RestMethod` automatically parses JSON responses:

```powershell
# Gets JSON as PowerShell object (fast, easy)
$response = Invoke-RestMethod "http://127.0.0.1:3000/api/billing/status"
$response | ConvertTo-Json -Depth 10

# Or one-liner:
(Invoke-RestMethod "http://127.0.0.1:3000/api/billing/status") | Format-List
```

### ✅ ALTERNATIVE: Use `curl.exe` explicitly

From PowerShell, call the native Windows curl:

```powershell
# Calls native curl.exe (same as Linux/macOS behavior)
& cmd.exe /c "curl.exe http://127.0.0.1:3000/api/billing/status"
```

### ⚠️ AVOID: Bare `curl` in PowerShell

```powershell
# This actually calls Invoke-WebRequest (slow, confusing)
curl http://127.0.0.1:3000/api/billing/status
```

## Testing the API

Run the test script from the project root:

```powershell
powershell -ExecutionPolicy Bypass .\scripts\test-api-windows.ps1
```

This will:
1. ✓ Check billing status endpoint (returns JSON immediately)
2. ✓ Verify pricing page loads (HTTP 200)
3. ✓ Confirm pricing cards render

## Debugging White Screen on /pricing

If `/pricing` loads with HTTP 200 but shows blank page:

1. **Check browser console** (F12):
   - Look for red error messages
   - Check "Network" tab for failed requests

2. **Check server logs** (Terminal where `npm run dev` runs):
   - Look for `[PricingPage] Mounted` confirmation
   - Any `Error:` messages?

3. **Check /api/billing/status** separately:
   ```powershell
   (Invoke-RestMethod "http://127.0.0.1:3000/api/billing/status") | ConvertTo-Json
   ```
   - Must return `"ok": true` in JSON
   - If it fails, the endpoint has a runtime error

## Common Issues

### "Connection refused" on http://127.0.0.1:3000
- Server not running: Run `npm run dev` in a terminal
- Port in use: Try `netstat -ano | findstr ":3000"` to find the process

### /api/billing/status returns timeout or hangs
- **FIXED:** Endpoint now has try/catch and always returns JSON
- If still hanging, check server logs for errors
- Verify `getDemoUserId()` and `getUserSubscription()` don't block

### /pricing page shows white screen
- **FIXED:** Added error boundary and console logging
- Check browser console (F12) for React errors
- Check server logs for API errors
- Try hard refresh (Ctrl+Shift+R)

## Environment Variables

For Stripe integration (TODO):

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Without these, the "Try Stripe" button will show a stub message.

## Building and Running

```bash
# Development (with hot reload)
npm run dev

# Production build
npm run build

# Production server
npm run start

# Type checking
npm run lint
```

## Next Steps

1. ✅ Billing status API returns valid JSON immediately
2. ✅ Pricing page has error boundary and logging
3. ⏳ Set up Stripe integration (pending credentials)
4. ⏳ Wire up UI to consume /api/billing/status on editor page
