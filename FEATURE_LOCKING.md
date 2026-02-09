# Feature Locking Implementation Guide

## Overview

This project implements **plan-based feature locking** using Supabase Auth and billing status. Features are gated at multiple levels:

1. **Middleware** - Blocks unauthorized route access
2. **API Routes** - Returns 402 for premium features
3. **Database** - RLS policies enforce data access

## Current Status

✅ **IMPLEMENTED (No Webhooks Yet)**
- Middleware blocks `/editor` and `/generate` for non-active subscriptions
- API routes `/api/analyze` and `/api/generate` return 402 for free users
- Manual activation endpoint `/api/billing/activate` for testing
- Billing status tracked in `billing_status` table

🔄 **PENDING (Next Steps)**
- Stripe webhook integration (see `BILLING_SETUP.md`)
- Automatic activation on successful payment
- Subscription status sync (active/canceled/past_due)

## Architecture

### Billing Status Schema

```sql
CREATE TABLE billing_status (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'locked',
  stripe_subscription_id text,
  updated_at timestamptz DEFAULT now()
);
```

**Plan Values:**
- `free` - No access to premium features
- `creator` - $29/mo plan with editor access
- `studio` - $99/mo plan with all features

**Status Values:**
- `locked` - Default for new users (no payment yet)
- `pending` - Payment received but not verified (post-checkout)
- `active` - ✅ **ONLY THIS STATUS UNLOCKS FEATURES**

### Feature Gating Logic

```typescript
// Features are ONLY accessible when:
billingData.status === 'active' AND billingData.plan !== 'free'
```

**Critical Rule:** Status must be `'active'` (not `'pending'`). The `'pending'` state prevents feature unlocking until webhooks fire.

## Implementation Details

### 1. Middleware Protection (`src/middleware.ts`)

Protects routes before they load:

```typescript
const PROTECTED_ROUTES = {
  '/editor': ['creator', 'studio'],    // Requires Creator or Studio
  '/generate': ['creator', 'studio'],  // Requires Creator or Studio
  '/dashboard': null,                  // Authenticated users only
}
```

**Flow:**
1. Check if user is authenticated
2. Query `billing_status` for plan and status
3. Redirect to `/pricing?locked=editor&required=creator` if unauthorized
4. Allow access if `status === 'active'` and plan matches

**URL Redirect Examples:**
- Not logged in → `/login?redirect=/editor`
- Free plan → `/pricing?locked=editor&required=creator`
- Pending status → `/pricing?locked=editor&required=creator`
- Active Creator → ✅ Access granted to `/editor`

### 2. API Route Protection

Both premium API endpoints check billing status:

#### `/api/analyze/route.ts`

```typescript
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  return NextResponse.json(
    { ok: false, error: "Authentication required" },
    { status: 401 }
  );
}

const { data: billingData } = await supabase
  .from('billing_status')
  .select('plan, status')
  .eq('user_id', user.id)
  .single();

if (!billingData || billingData.status !== 'active' || billingData.plan === 'free') {
  return NextResponse.json(
    { 
      ok: false, 
      error: "This feature requires an active Creator or Studio subscription",
      upgrade_url: "/pricing"
    },
    { status: 402 } // Payment Required
  );
}
```

#### `/api/generate/route.ts`

Same pattern - checks auth, queries billing status, returns 402 if not active.

**Status Codes:**
- `401` - Not authenticated (no session)
- `402` - Payment Required (free plan or status !== 'active')
- `200` - Success (active subscription)

### 3. Manual Activation (Temporary)

Since webhooks aren't live yet, use this endpoint to activate subscriptions after Stripe checkout:

#### `/api/billing/activate` (POST)

**Request:**
```json
{
  "session_id": "cs_test_abc123...",
  "plan": "creator"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription activated",
  "plan": "creator",
  "status": "active"
}
```

**Usage:**
1. User completes Stripe checkout
2. Redirected to `/billing/success?session_id=cs_test_...`
3. Success page calls `/api/billing/activate` with session_id
4. Endpoint verifies session, updates billing_status to `status='active'`
5. User can now access premium features

**Security:**
- Verifies authenticated user
- Confirms Stripe session belongs to user (matches `stripe_customer_id`)
- Uses admin client to bypass RLS policies
- Requires valid `session_id` from Stripe

## Testing Flow

### Step 1: Create Account

```bash
# Open signup page
http://localhost:3000/login?mode=signup

# Create account with test email
# Check database:
SELECT * FROM billing_status WHERE user_id = '<user_id>';
# Expected: plan='free', status='locked'
```

### Step 2: Test Route Protection

```bash
# Try accessing editor (should redirect to pricing)
http://localhost:3000/editor

# Try API endpoint (should return 402)
curl -X POST http://localhost:3000/api/analyze \
  -H "Cookie: sb-access-token=..." \
  -F "file=@test.mp4"
```

**Expected Results:**
- Middleware redirects `/editor` → `/pricing?locked=editor&required=creator`
- API returns `{"error": "This feature requires...", "upgrade_url": "/pricing"}` with 402

### Step 3: Complete Checkout

```bash
# Go to pricing page
http://localhost:3000/pricing

# Click "Subscribe" for Creator plan
# Complete Stripe test payment:
#   Card: 4242 4242 4242 4242
#   Expiry: Any future date
#   CVC: Any 3 digits

# Redirected to: /billing/success?session_id=cs_test_...
```

### Step 4: Manual Activation

The `/billing/success` page should automatically call `/api/billing/activate`. Or manually:

```bash
curl -X POST http://localhost:3000/api/billing/activate \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=..." \
  -d '{"session_id": "cs_test_abc123", "plan": "creator"}'
```

**Check Database:**
```sql
SELECT * FROM billing_status WHERE user_id = '<user_id>';
-- Expected: plan='creator', status='active'
```

### Step 5: Verify Access Granted

```bash
# Try editor again (should load)
http://localhost:3000/editor

# Try API (should process)
curl -X POST http://localhost:3000/api/analyze \
  -H "Cookie: sb-access-token=..." \
  -F "file=@test.mp4"
```

**Expected Results:**
- `/editor` loads successfully
- API returns 200 with job data

## Environment Variables

Required for billing features:

```env
# Supabase (from https://supabase.com/dashboard → Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # For admin operations

# Stripe (from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_CREATOR=price_...  # Creator plan Price ID
STRIPE_PRICE_STUDIO=price_...   # Studio plan Price ID

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=https://autoeditor.app
```

## Common Issues

### Issue: "Authentication required" on API calls

**Cause:** Missing or expired session cookie.

**Fix:**
```typescript
// Client-side API calls must include credentials
fetch('/api/analyze', {
  method: 'POST',
  credentials: 'include',  // Include cookies
  body: formData
})
```

### Issue: Middleware redirects even with active subscription

**Cause:** Database query failing or RLS blocking read.

**Debug:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'billing_status';

-- Test query as service role
SET LOCAL ROLE service_role;
SELECT * FROM billing_status WHERE user_id = '<user_id>';
```

**Fix:** Ensure RLS policy allows users to read own billing_status:
```sql
CREATE POLICY "Users can view own billing status"
  ON billing_status FOR SELECT
  USING (auth.uid() = user_id);
```

### Issue: 402 error persists after activation

**Cause:** Cached billing status or old session.

**Fix:**
1. Check database directly: `SELECT * FROM billing_status`
2. Verify `status='active'` and `plan != 'free'`
3. Clear browser cookies and re-login
4. Restart dev server to clear in-memory caches

### Issue: Manual activation returns 403 "Session mismatch"

**Cause:** `stripe_customer_id` in profiles doesn't match session.customer.

**Fix:**
```sql
-- Verify customer ID match
SELECT id, email, stripe_customer_id FROM profiles WHERE id = '<user_id>';

-- Get customer from Stripe session
stripe checkout sessions retrieve cs_test_abc123 | grep customer
```

Ensure checkout endpoint properly saves `stripe_customer_id` during session creation.

## Next Steps: Webhook Integration

Once webhooks are live (see `BILLING_SETUP.md`):

1. **Remove manual activation endpoint** - Delete `/api/billing/activate`
2. **Update success page** - Show "Activating..." and poll billing status
3. **Add webhook handler** - Already exists at `/api/stripe/webhook`
4. **Test webhook events**:
   - `checkout.session.completed` → Sets status='active'
   - `customer.subscription.updated` → Syncs plan changes
   - `customer.subscription.deleted` → Reverts to free plan

## Security Notes

- ✅ Middleware runs on edge runtime (fast, globally distributed)
- ✅ API routes verify auth server-side (can't be bypassed)
- ✅ Database RLS prevents direct data access
- ✅ Service role key only used in API routes (never exposed to client)
- ✅ Stripe session validation prevents customer ID spoofing

## File Checklist

- [x] `src/middleware.ts` - Route protection
- [x] `src/app/api/analyze/route.ts` - API billing check
- [x] `src/app/api/generate/route.ts` - API billing check
- [x] `src/app/api/billing/activate/route.ts` - Manual activation (temporary)
- [x] `src/lib/supabase/server.ts` - Server client + admin client
- [x] `src/lib/supabase/client.ts` - Browser client
- [x] `supabase/migrations/001_initial_schema.sql` - Database schema
- [x] `BILLING_SETUP.md` - Comprehensive setup guide
- [x] `FEATURE_LOCKING.md` - This file

---

**Status:** ✅ Feature locking implemented without webhooks. Manual activation working. Ready for Stripe webhook integration.
