# Testing Guide: Stripe Webhook Subscription Unlock

This guide walks through testing the subscription unlock flow locally and in production.

---

## Table of Contents
1. [Quick Verification](#quick-verification)
2. [Local Testing with Stripe CLI](#local-testing-with-stripe-cli)
3. [Manual Testing Steps](#manual-testing-steps)
4. [Production Verification](#production-verification)
5. [Troubleshooting](#troubleshooting)

---

## Quick Verification

### 1. Verify Code Changes Built Successfully

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Check for TypeScript errors
npm run type-check 2>&1 | grep -i error

# You should see:
# ✓ No errors
```

### 2. Verify Database Table Names

```bash
# Check webhook uses billing_status (not subscriptions)
grep "from('billing_status')" src/app/api/stripe/webhook/route.ts
# Should show multiple matches

# Verify no references to deprecated subscriptions table
grep "from('subscriptions')" src/lib/supabase/db.ts
# Should show NO matches

# Verify auth callback creates billing_status
grep "from('billing_status')" src/app/auth/callback/route.ts
# Should show one match
```

---

## Local Testing with Stripe CLI

### Prerequisites
- Stripe CLI installed: https://stripe.com/docs/stripe-cli
- Stripe test account with test keys available
- Local dev server running

### Step 1: Start Development Server

```bash
npm run dev

# Output should show:
# ▲ Next.js 16.0.0
# - Local: http://localhost:3000
```

### Step 2: Set Up Webhook Forwarding

In a new terminal window:

```bash
# Log in to Stripe CLI
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Output:
# > Ready! Your webhook signing secret is: whsec_test_1234...
# > Forward to http://localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret and verify it matches `STRIPE_WEBHOOK_SECRET` in `.env.local`.

### Step 3: Test Sign Up → Subscription Flow

**In Browser:**

```
1. Go to http://localhost:3000
2. Click "Sign up"
3. Create test account (use any test email)
4. You should be redirected to /pricing page
5. Check Supabase: profiles table should have new row
6. Check Supabase: billing_status should have new row with status='locked'
```

**Expected Supabase State:**
```sql
-- profiles table
id: [uuid]
email: test@example.com
stripe_customer_id: NULL (empty until after checkout)

-- billing_status table  
user_id: [same uuid]
plan: 'free'
status: 'locked'
stripe_subscription_id: NULL (empty until after checkout)
```

### Step 4: Test Stripe Checkout

**In Browser:**

```
1. Logged in as test user
2. Go to http://localhost:3000/pricing
3. Click "Subscribe to Starter"
4. Complete checkout with test card:
   - Card: 4242 4242 4242 4242
   - Exp: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
5. Click "Pay" button
6. You should be redirected to /billing/success
```

**Expected Page Behavior:**
```
If live mode:
  - Success page shows: "Subscription activated successfully!"
  - Button: "Go to Editor"

If soft mode (test):
  - Success page shows: "Payment received. Activation pending..."
  - Button: "Return to Editor"
```

### Step 5: Verify Webhook Reception

**In Stripe CLI Terminal:**

```
You should see webhook events being received:

  > 2024-01-15 10:30:45 ► checkout.session.completed [evt_test_1234...]
  > 2024-01-15 10:30:46 ► payment_intent.succeeded [evt_test_1234...]
  > 2024-01-15 10:30:47 ► charge.succeeded [evt_test_1234...]
  > 2024-01-15 10:30:48 ► customer.subscription.updated [evt_test_subtst_1234...]
```

### Step 6: Verify Database Updated

**In Supabase Dashboard:**

Navigate to: SQL Editor → Query

Run these queries:

```sql
-- Check billing_status was updated
SELECT user_id, plan, status, stripe_subscription_id, updated_at 
FROM billing_status 
WHERE user_id = '[YOUR_TEST_USER_ID]'
ORDER BY updated_at DESC 
LIMIT 1;

-- Expected result:
-- status: 'active'  ← This is what we're testing!
-- plan: 'starter'   ← Updated from checkout
-- stripe_subscription_id: 'sub_...'  ← Filled by webhook
```

```sql
-- Check profiles was updated
SELECT id, email, stripe_customer_id, created_at
FROM profiles
WHERE id = '[YOUR_TEST_USER_ID]';

-- Expected result:
-- stripe_customer_id: 'cus_...'  ← Filled by webhook
```

### Step 7: Verify Feature Access

**In Browser:**

```
1. Go to http://localhost:3000/editor
2. You should NOT be redirected to /pricing
3. Editor page should load successfully
4. Click "Generate" or start editing
5. You should have access to the features
```

If redirected to pricing, check:
- Supabase: Is `billing_status.status = 'active'`?
- Browser console: Check for any JavaScript errors
- Network tab: Check `/api/billing/status` response

### Step 8: Verify Feature Locking (Negative Test)

**Test that free users are still locked:**

```
1. Create another test account
2. DO NOT complete checkout (stay on pricing page)
3. Try to access http://localhost:3000/editor
4. You SHOULD be redirected to /pricing (as expected)
5. Check Supabase: billing_status.status = 'locked'
```

---

## Manual Testing Steps

If Stripe CLI is not available, manually simulate webhook events:

### Using Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/webhooks
2. Find your webhook endpoint: `/api/stripe/webhook`
3. Scroll down to "Events"
4. Find a real `checkout.session.completed` event
5. Click it → "Resend event"
6. Check your app logs to see webhook processing

### Using curl (Advanced)

```bash
# 1. Get a test webhook signing secret
WEBHOOK_SECRET="whsec_test_..."

# 2. Create a test body
BODY='{"id":"evt_test_1234","type":"test.charge.succeeded","data":{"object":{"id":"ch_test_1234"}}}'

# 3. Sign the request (requires openssl and signature calculation)
# This is complex - recommend using Stripe Dashboard instead

# 4. Send to webhook
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1234567890,v1=signature_here" \
  -d "$BODY"
```

---

## Production Verification

After deploying to Vercel:

### Checklist

- [ ] Build succeeded in Vercel
- [ ] STRIPE_SECRET_KEY is set in Vercel environment
- [ ] STRIPE_WEBHOOK_SECRET is set in Vercel environment  
- [ ] All STRIPE_PRICE_* IDs are set
- [ ] Webhook endpoint registered: https://your-domain.vercel.app/api/stripe/webhook
- [ ] Stripe Dashboard shows webhook as "Enabled"

### Test in Production

```
1. Use real credit card (not test card)
2. Go to production site
3. Sign up
4. Go to /pricing
5. Subscribe to a plan (use real card details or Stripe test card)
6. Complete checkout
7. Verify redirected to /billing/success with "Subscription activated" message
8. Try to access /editor
9. Should have full access (not redirected to /pricing)
10. Go to Stripe Dashboard > Invoices → verify invoice was created
11. Go to Stripe Dashboard > Customers → search by email → verify subscription listed
```

### Check Webhook Delivery

**In Stripe Dashboard:**

```
1. Go to Dashboard → Developers → Webhooks
2. Find your endpoint: /api/stripe/webhook
3. Click it
4. Check "Events" section
5. Recent events should show:
   - checkout.session.completed: 200 ✓
   - customer.subscription.updated: 200 ✓
   - No 500 or timeout errors
```

If you see errors:
- Click event → "Resend event"
- Check Vercel logs for errors
- Verify STRIPE_WEBHOOK_SECRET matches

---

## Troubleshooting

### Symptom: Payment succeeded but features are locked

**Diagnosis:**
```sql
-- Check what status is in database
SELECT user_id, status FROM billing_status 
WHERE user_id = '[TEST_USER_ID]';

-- Check if webhook was received
-- Look in browser logs: are there errors?
-- Check Stripe Dashboard > Webhooks > Events
```

**Common Causes:**
1. ❌ `billing_status.status` is still 'pending' or 'locked'
   - → Webhook didn't fire or failed
   - → Check Stripe webhook logs for errors
   - → Verify STRIPE_WEBHOOK_SECRET is correct

2. ❌ `billing_status.status` is 'active' but user still locked
   - → Middleware might be checking wrong column
   - → Check middleware.ts line that checks status
   - → Try clearing browser cache and reloading

3. ❌ Database shows no `billing_status` row
   - → Auth callback didn't create row on signup
   - → Check auth/callback/route.ts
   - → Manually create row via Supabase SQL editor

### Symptom: Webhook events not being delivered

**Check:**
```
1. Stripe Dashboard > Developers > Webhooks
2. Click endpoint > Events tab
3. Do you see recent events?

If NO events:
  - Verify webhook URL is correct
  - Check if HTTPS (Stripe requires HTTPS)
  - Verify endpoint is accessible
  - Try "Send test event" button

If YES events but with errors (5xx):
  - Check Vercel logs
  - Verify environment variables
  - Look for exceptions in /api/stripe/webhook
```

### Symptom: "Invalid Signature" errors

**Fix:**
```
1. Stripe Dashboard > Developers > Webhooks
2. Find your endpoint
3. Copy signing secret (starts with whsec_)
4. Update .env.local: STRIPE_WEBHOOK_SECRET=[copied_value]
5. Redeploy to Vercel
6. Update STRIPE_WEBHOOK_SECRET in Vercel environment
7. Test webhook again
```

### Symptom: "Table not found" or database errors

**Verify migrations:**
```sql
-- Run in Supabase SQL Editor

-- Check if billing_status table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'billing_status';

-- Check if profiles table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'profiles';

-- If missing, re-run migration:
-- Copy content of supabase/migrations/001_initial_schema.sql
-- and execute in Supabase SQL Editor
```

---

## Success Criteria

All of the following should be true for the fix to be considered successful:

1. ✅ User signs up → Automatically has `billing_status` row with status='locked'
2. ✅ User completes Stripe checkout → `billing_status.status` becomes 'active' within 5 seconds
3. ✅ User can access protected routes (/editor, /generate)
4. ✅ Free users cannot access protected routes (still redirected to /pricing)
5. ✅ Stripe Dashboard shows webhook as successful (200 status)
6. ✅ No database errors in Vercel logs
7. ✅ Webhook events are delivered in <30 seconds after payment
8. ✅ Refreshing page maintains access (not cached locally, verified in database)

---

## Quick Command Reference

```bash
# Build and verify
npm run build

# Check for code errors
npm run type-check

# Run locally
npm run dev

# Listen for webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook

# View deployment logs
vercel logs

# Check specific Vercel function logs  
vercel logs --source functions

# Deploy to Vercel
vercel deploy

# Verify webhook endpoint is accessible
curl -I https://your-domain.vercel.app/api/stripe/webhook
# Should return 405 (Method Not Allowed) for GET, which is correct
```

---

## Contact & Support

If tests fail or you see unexpected behavior:

1. Check STRIPE_WEBHOOK_FIX_REPORT.md for detailed technical explanation
2. Review the Files Modified section to understand changes
3. Check Vercel logs for deployment errors
4. Check Stripe Dashboard > Webhooks > Events for webhook delivery status
5. Check Supabase > SQL Editor for database state

