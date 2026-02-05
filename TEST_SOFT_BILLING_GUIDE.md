# Soft Billing Test Guide

Complete guide for testing the soft billing system end-to-end.

## Quick Start

### 1. Start the dev server
```bash
npm run dev
```

The app should start on `http://localhost:3000` and db should connect.

### 2. Run the automated test suite
```bash
node scripts/test-soft-billing.mjs
```

This will automatically:
- Create a test user
- Login
- Request a checkout session
- Simulate payment confirmation
- Check billing status transitions from free → pending → active
- Verify feature gating works (API returns 402 when subscription inactive)

### 3. Expected Output

```
[timestamp] [SERVER] Server is healthy (200) ✓
[timestamp] [SIGNUP] User created: abc123d... ✓
[timestamp] [LOGIN] Login successful: abc123d... ✓
[timestamp] [BILLING] Default status: free/locked ✓
[timestamp] [CHECKOUT] Session created: cs_abc... ✓
[timestamp] [CONFIRM] Confirmed: status=pending ✓
[timestamp] [PENDING] Status: starter/pending ✓
[timestamp] [ACTIVATE] Activated: active ✓
[timestamp] [ACTIVE] Status: active (plan=starter) ✓

TEST SUMMARY:
  PASSED: 9
  FAILED: 0
  SKIPPED: 0

✅ ALL TESTS PASSED (100%)
```

## Manual Testing Steps

If you want to manually test without the script, follow these steps:

### Step 1: Create a Test User

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "confirmPassword": "TestPassword123!"
  }'
```

Expected response:
```json
{
  "user": {
    "id": "...",
    "email": "test@example.com"
  }
}
```

### Step 2: Login to Get Session

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

Save the cookies for subsequent requests.

### Step 3: Verify Default Billing Status (free/locked)

In Supabase dashboard:
1. Go to SQL Editor
2. Run: `SELECT * FROM billing_status WHERE user_id = 'YOUR_USER_ID'`
3. Should show: `plan: 'free'` and `status: 'locked'`

### Step 4: Create Checkout Session

```bash
curl -X POST http://localhost:3000/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "plan": "starter"
  }'
```

Expected response:
```json
{
  "url": "https://checkout.stripe.com/pay/cs_...",
  "sessionId": "cs_..."
}
```

### Step 5: Simulate Payment Confirmation

**Option A: Use Stripe Checkout**

1. Copy the `url` from step 4
2. Open in browser
3. Use Stripe test card: **4242 4242 4242 4242**
4. Fill in any expiry (e.g., 12/25) and CVC (e.g., 123)
5. Check the "Save this card for future use" checkbox (if desired)
6. Click Pay
7. Success page should redirect to `/app/billing/success?session_id=cs_...`

**Option B: Simulate Confirmation Without Checkout**

Using a real session ID from Step 4:

```bash
curl -X POST http://localhost:3000/api/stripe/confirm-session \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "session_id": "cs_test_123..."
  }'
```

### Step 6: Check Billing Status (should be pending)

In Supabase dashboard:
```sql
SELECT * FROM billing_status WHERE user_id = 'YOUR_USER_ID'
```

Should now show: `plan: 'starter'` and `status: 'pending'`

### Step 7: Test Feature Gating (should fail)

Try to generate a clip with status='pending':

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "videoPath": "sample.mp4",
    "clips": [{"start": 0, "end": 5}]
  }'
```

Expected response: **402 Payment Required**

```json
{
  "error": "This feature requires an active Creator or Studio subscription"
}
```

### Step 8: Manually Activate (soft mode only)

The `BILLING_ADMIN_KEY` env var allows manual activation for testing.

```bash
curl -X POST http://localhost:3000/api/billing/manual-activate \
  -H "Content-Type: application/json" \
  -H "x-admin-key: test-admin-key-local-dev-only-12345678" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "plan": "starter"
  }'
```

Expected response:
```json
{
  "success": true,
  "user_id": "...",
  "plan": "starter",
  "status": "active",
  "message": "User manually activated"
}
```

### Step 9: Check Billing Status (should be active)

```sql
SELECT * FROM billing_status WHERE user_id = 'YOUR_USER_ID'
```

Should now show: `plan: 'starter'` and `status: 'active'`

### Step 10: Test Feature Gating (should succeed)

Retry the API call:

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "videoPath": "sample.mp4",
    "clips": [{"start": 0, "end": 5}]
  }'
```

Expected response: **200 OK** (request proceeds to generate logic)

## Using the Billing Debug Panel

A dev-only debug panel is available in the browser:

1. Ensure `NODE_ENV=development` and `BILLING_MODE=soft`
2. Visit any page in the app
3. Bottom-right corner should show a **🔧 Billing Debug** panel
4. Features:
   - **Refresh**: Load current billing status
   - **Activate**: Manually activate current plan
   - **Reset**: Reset user to free/locked tier

The panel only appears in development + soft mode.

## Troubleshooting

### "Server is not running"
```bash
npm run dev
```

### "Failed to fetch" during signup/login
- Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Verify Supabase is accessible
- Check network in browser DevTools

### "Unauthorized" from /api/billing/* endpoints
- Ensure cookies are being sent (`-b cookies.txt` in curl, or browser session)
- Verify you're logged in

### "No session ID" in test script
- Run manual stripe checkout to get a real `session_id`
- Then run: `CHECKOUT_SESSION_ID=cs_... node scripts/test-soft-billing.mjs`

### Billing status not updating
- Check Supabase API key has write permissions
- Verify `billing_status` table exists and is accessible
- Check `/api/billing/status` endpoint returns correct data

### Premium API returns 200 when should be 402
- Check `BILLING_MODE=soft` is set
- Verify `billing_status.status` is actually 'pending' (not 'active')
- Manually reset user: `/api/billing/reset`

## Environment Variables

Required for full testing:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# Optional (test script features)
BILLING_ADMIN_KEY=test-admin-key-local-dev-only-12345678
BILLING_MODE=soft
BILLING_TEST_AUTOACTIVATE=false
BILLING_TEST_ALLOW_MANUAL_ACTIVATE=true

# Optional (use existing test user)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!
```

## Test Flow Diagram

```
┌─────────────────────────────────────────────┐
│ 1. Create User                              │
│    POST /api/auth/signup                    │
└────────┬────────────────────────────────────┘
         │ user_id
         ▼
┌─────────────────────────────────────────────┐
│ 2. Default Status                           │
│    SELECT * billing_status                  │
│    → plan: 'free', status: 'locked'         │
└────────┬────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ 3. Test Gating (should fail with 402)       │
│    POST /api/generate                       │
│    ← 402 Payment Required                   │
└────────┬────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ 4. Checkout Session                         │
│    POST /api/stripe/create-checkout-session │
│    ← {url, sessionId}                       │
└────────┬────────────────────────────────────┘
         │ sessionId
         ▼
┌─────────────────────────────────────────────┐
│ 5. Confirm Session (simulate payment)       │
│    POST /api/stripe/confirm-session         │
│    ← {success: true, status: 'pending'}     │
└────────┬────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ 6. Pending Status                           │
│    SELECT * billing_status                  │
│    → plan: 'starter', status: 'pending'     │
└────────┬────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ 7. Test Gating (should still fail)          │
│    POST /api/generate                       │
│    ← 402 Payment Required                   │
└────────┬────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ 8. Manual Activate (soft mode)              │
│    POST /api/billing/manual-activate        │
│    ← {success: true, status: 'active'}      │
└────────┬────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ 9. Active Status                            │
│    SELECT * billing_status                  │
│    → plan: 'starter', status: 'active'      │
└────────┬────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ 10. Test Gating (should succeed)            │
│     POST /api/generate                      │
│     ← 200 OK                                │
└─────────────────────────────────────────────┘
```

## Stripe Test Cards

For manual Stripe checkout testing:

| Card Number | Result |
|---|---|
| 4242 4242 4242 4242 | Successful payment |
| 4000 0000 0000 0002 | Card declined |
| 4000 0000 0000 0069 | Expired card |
| 4000 0000 0000 0127 | Incorrect CVC |

Use any future expiry date and any 3-digit CVC.

## Automated Test Script Options

```bash
# Run with verbose output
node scripts/test-soft-billing.mjs --verbose

# Use existing test user
TEST_USER_EMAIL=test@example.com \
TEST_USER_PASSWORD=TestPassword123! \
node scripts/test-soft-billing.mjs

# Test with specific session ID
CHECKOUT_SESSION_ID=cs_test_... \
node scripts/test-soft-billing.mjs

# Use custom app URL
APP_URL=https://myapp.vercel.app \
node scripts/test-soft-billing.mjs
```

## What's Being Tested

✓ Server health check
✓ User signup with required fields
✓ User login with session persistence
✓ Default billing status is free/locked
✓ Checkout session creation
✓ Session confirmation (payment simulation)
✓ Billing status update to pending
✓ Manual activation (soft mode only)
✓ Billing status update to active
✓ Feature gating enforces status checks

## Next Steps After Testing

1. **If all tests pass**: Soft billing is working correctly
   - Ready for QA/staging testing
   - Can proceed with live billing mode setup

2. **If tests fail**: Identify the failure
   - Check error messages in test output
   - Review API logs: `npm run dev` terminal
   - Use `/api/billing/status` to check database state
   - Use Supabase dashboard to inspect tables

3. **Optional enhancements**:
   - Add webhook testing (Stripe events)
   - Test subscription cancellation flow
   - Test plan upgrades/downgrades
   - Test billing period renewal
   - Load test with multiple simultaneous checkouts

## Reference Documentation

- [SOFT_BILLING_TESTING.md](../SOFT_BILLING_TESTING.md) - Original soft billing checklist
- [STRIPE_INTEGRATION.md](../STRIPE_INTEGRATION.md) - Stripe setup details
- [src/lib/billing/testHelpers.ts](../src/lib/billing/testHelpers.ts) - Test utility functions
- [scripts/test-soft-billing.mjs](../scripts/test-soft-billing.mjs) - Automated test script
- [src/components/BillingDebugPanel.tsx](../src/components/BillingDebugPanel.tsx) - Debug panel
