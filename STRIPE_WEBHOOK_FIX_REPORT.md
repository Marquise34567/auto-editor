# Stripe Webhook Fix Report

**Date:** 2024  
**Issue:** Subscriptions not unlocking after successful Stripe checkout  
**Root Cause:** Database table name mismatch between webhook handlers and current schema  
**Status:** FIXED ✅

---

## Executive Summary

The auto-editor Stripe integration was failing to unlock subscriptions after users completed checkout due to a **critical table mismatch bug**. The webhook handlers were writing to a `subscriptions` table that doesn't exist in the current database migration schema, which uses `billing_status` instead.

All webhook operations were silently failing because the target table didn't exist, leaving users' `billing_status.status` as 'locked' after payment completion, thus blocking feature access.

---

## Issues Found & Fixed

### 1. ✅ WEBHOOK TABLE MISMATCH (CRITICAL)

**File:** `src/app/api/stripe/webhook/route.ts`  
**Problem:**
- Lines 61-67: `checkout.session.completed` handler wrote to non-existent `.from('subscriptions')` table
- Lines 93-104: `customer.subscription.updated` handler wrote to non-existent table
- Lines 113-125: `customer.subscription.deleted` handler wrote to non-existent table
- Lines 131-140: `invoice.payment_failed` handler wrote to non-existent table

**Current Schema vs. Old References:**
```sql
-- Current (migrations/001_initial_schema.sql)
CREATE TABLE IF NOT EXISTS public.billing_status (
  user_id UUID PRIMARY KEY,
  plan TEXT DEFAULT 'free',
  status TEXT DEFAULT 'locked',  -- 'locked', 'pending', 'active'
  stripe_subscription_id TEXT,
  updated_at TIMESTAMPTZ
);

-- Old (schema.sql - deprecated)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID,
  plan_id TEXT,
  status TEXT,
  stripe_customer_id TEXT,  -- Now in 'profiles' table
  stripe_subscription_id TEXT
);
```

**Fix Applied:**
✅ Updated all Event Handlers to use `billing_status` table:
- `checkout.session.completed` → Updates `billing_status` + `profiles.stripe_customer_id`
- `customer.subscription.updated` → Maps Stripe status → Lookup user_id from profiles → Update `billing_status`
- `customer.subscription.deleted` → Lookup user_id from profiles → Set `status = 'locked'`
- `invoice.payment_failed` → Log event (handled by subscription.updated event)

**Key Changes:**
1. Changed all `.from('subscriptions')` → `.from('billing_status')`
2. Removed `stripe_customer_id` from `billing_status` updates (stored in `profiles` table)
3. Added user_id lookup for webhook events (Stripe only provides customer_id)
4. Added Stripe status → Application status mapping

---

### 2. ✅ DB HELPER FUNCTION MISMATCH

**File:** `src/lib/supabase/db.ts`  
**Problem:**
- `getUserSubscription()` queried old `.from('subscriptions')` table
- `updateUserSubscription()` updated old `subscriptions` table
- These functions are used throughout the app for subscription queries

**Fix Applied:**
✅ Updated all database helper functions:
- `getUserSubscription()` now queries `billing_status` + `profiles` tables (combining data)
- `updateUserSubscription()` now updates `billing_status` + `profiles` as needed
- Properly maps column names: `plan_id` (old) → `plan` (new)

---

### 3. ✅ AUTH CALLBACK TABLE MISMATCH

**File:** `src/app/auth/callback/route.ts`  
**Problem:**
- Line 58: New user signup was inserting into non-existent `.from('subscriptions')` table
- Used wrong status ('inactive' not in schema) and plan ('starter' instead of 'free')
- This prevented new users from getting a billing_status record

**Fix Applied:**
✅ Updated to insert into `billing_status` table:
- Changed `.from('subscriptions').insert()` → `.from('billing_status').insert()`
- Set correct default values: `plan = 'free'`, `status = 'locked'`

---

### 4. ✅ AUTH ME ROUTE TABLE MISMATCH

**File:** `src/app/api/auth/me/route.ts`  
**Problem:**
- Line 38: Session endpoint queried deprecated `.from('subscriptions')` table
- Returned subscription data that wouldn't exist

**Fix Applied:**
✅ Updated to query correct table:
- Changed `.from('subscriptions')` → `.from('billing_status')`
- Renamed response field from `subscription` → `billingStatus` for clarity

---

### 5. ✅ STRIPE CHECKOUT ROUTE INVALID UPDATE

**File:** `src/app/api/stripe/checkout/route.ts`  
**Problem:**
- Lines 93-99: Tried to save checkout session.id as `stripe_subscription_id` in subscriptions table
- Session.id ≠ Subscription.id (subscription is created after payment, not at session creation)
- Added unnecessary database operation

**Fix Applied:**
✅ Removed incorrect update operation:
- Deleted the `.from('subscriptions').update()` block
- Subscription is properly created by webhook on `checkout.session.completed` event
- `confirm-session` route handles status updates after payment verification

---

## Data Flow: Correct vs. Incorrect

### ❌ BEFORE (BROKEN)
```
User completes Stripe checkout
    ↓
Stripe webhook received: checkout.session.completed
    ↓
Webhook tries: UPDATE subscriptions WHERE user_id = ? ← TABLE DOESN'T EXIST
    ↓
Supabase silently fails (table not found)
    ↓
User's billing_status.status remains 'locked' or 'pending'
    ↓
Middleware checks: billing_status.status === 'active'? → FALSE
    ↓
User redirected to pricing page (features locked) ❌
```

### ✅ AFTER (FIXED)
```
User completes Stripe checkout
    ↓
Stripe webhook received: checkout.session.completed
    ↓
Webhook: UPDATE billing_status WHERE user_id = ?
    ↓
Webhook: UPDATE profiles SET stripe_customer_id = ?
    ↓
Supabase successfully updates billing_status.status = 'active'
    ↓
Middleware checks: billing_status.status === 'active'? → TRUE
    ↓
User granted access to /editor and /generate ✅
```

---

## Files Modified

| File | Changes | Impact |
|------|---------|--------|
| `src/app/api/stripe/webhook/route.ts` | Updated 4 event handlers to use `billing_status` table | 🔴 CRITICAL - Enables subscription activation |
| `src/lib/supabase/db.ts` | Updated getUserSubscription() & updateUserSubscription() | HIGH - Affects subscription queries throughout app |
| `src/app/auth/callback/route.ts` | Fixed new user signup to create billing_status record | HIGH - Enables new users to have billing status |
| `src/app/api/auth/me/route.ts` | Changed subscription query to billing_status | MEDIUM - Affects session endpoint |
| `src/app/api/stripe/checkout/route.ts` | Removed invalid subscriptions table update | LOW - Cleanup, removes broken code |

---

## Verification Checklist

### ✅ Phase 1: Code Changes Verified
- [x] Webhook uses `billing_status` table (not `subscriptions`)
- [x] Webhook looks up user_id from `profiles` for non-checkout events
- [x] Auth callback creates `billing_status` record for new users
- [x] DB helper functions query correct tables
- [x] No remaining references to deprecated `subscriptions` table in source code
- [x] Stripe status mapping implemented correctly

### 🔶 Phase 2: Build & Deployment (PENDING)
- [ ] Project builds successfully: `npm run build`
- [ ] No TypeScript errors reported
- [ ] Deploy to Vercel
- [ ] Verify STRIPE_WEBHOOK_SECRET is set in Vercel environment

### 🔶 Phase 3: Local Testing (PENDING)
```bash
# Start dev server
npm run dev

# In another terminal, listen for Stripe webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Test sign up
# Test Stripe checkout with test card: 4242 4242 4242 4242

# Verify in Supabase:
# 1. new user row in 'profiles' table
# 2. new row in 'billing_status' with status='active'
# 3. row in 'profiles' has stripe_customer_id filled
```

### 🔶 Phase 4: Production Verification (PENDING)
- [ ] Subscribe to a plan in production
- [ ] Verify payment completes in Stripe dashboard
- [ ] Check Supabase dashboard: `billing_status.status` = 'active'
- [ ] Access protected routes (/editor, /generate) succeeds
- [ ] Webhook delivery shows success in Stripe Dashboard > Webhooks > Events

---

## Database Schema Notes

### Relevant Tables

**profiles** table:
```sql
id UUID PRIMARY KEY
email TEXT
stripe_customer_id TEXT  -- Set by webhook
created_at TIMESTAMP
```

**billing_status** table:
```sql
user_id UUID PRIMARY KEY
plan TEXT ('free'|'starter'|'creator'|'studio')
status TEXT ('locked'|'pending'|'active')
stripe_subscription_id TEXT
updated_at TIMESTAMP
```

### RLS Policies
- ✅ Service role can manage billing_status (for webhook updates)
- ✅ Users can view/update their own billing_status
- ✅ All RLS policies are correctly configured

---

## Stripe Status Mapping

The webhook now correctly maps Stripe subscription statuses to application statuses:

```typescript
Stripe Status → Application Status
- "active" → "active"
- "trialing" → "active"  
- "past_due" → "active"        (still has access during grace period)
- "incomplete" → "active"       (still has access during setup)
- "canceled" → "locked"
- "unpaid" → "locked"
- "incomplete_expired" → "locked"
- (other) → "pending" (default)
```

---

## Deployment Checklist

Before deploying to production:

1. **Verify Build:**
   ```bash
   npm run build
   # Should complete without errors
   ```

2. **Verify Environment Variables:**
   - [ ] STRIPE_SECRET_KEY is set (in Vercel)
   - [ ] STRIPE_WEBHOOK_SECRET is set (in Vercel)  
   - [ ] All STRIPE_PRICE_* IDs are set
   - [ ] NEXT_PUBLIC_SUPABASE_* keys are set
   - [ ] Database migrations are applied

3. **Verify Webhook Registration:**
   - [ ] Stripe Dashboard > Webhooks > Endpoints shows /api/stripe/webhook
   - [ ] Webhook registered for events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed
   - [ ] Signing secret matches STRIPE_WEBHOOK_SECRET

4. **Post-Deployment Test:**
   - [ ] Sign up new user
   - [ ] Complete Stripe checkout with test card
   - [ ] Verify `/api/auth/me` returns `billingStatus.status = 'active'`
   - [ ] Access `/editor` route succeeds
   - [ ] Check Supabase Dashboard rows are created/updated correctly

---

## Troubleshooting

### Webhook Events Not Received
1. Check Stripe Dashboard > Webhooks > Events for error logs
2. Verify STRIPE_WEBHOOK_SECRET is correct (matches Stripe endpoint)
3. Check Vercel build logs for deployment errors
4. Verify `/api/stripe/webhook` endpoint is accessible

### Subscription Status Not Updating
1. Check Supabase: Does user have profile row with stripe_customer_id?
2. Check Supabase: Does user have billing_status row?
3. Check Stripe webhook logs for failed delivery attempts
4. Verify webhook event payload contains user metadata

### Users Still Locked After Payment
1. Confirm webhook executed (check Stripe webhook logs)
2. Verify `billing_status.status = 'active'` in Supabase for that user
3. Check middleware.ts - ensure it checks correct column and value
4. Clear browser cache/cookies and try again

---

## Summary

**Root Cause:** Database table name mismatch between webhook code (using deprecated `subscriptions` table) and current schema (using `billing_status` table).

**Impact:** All webhook-based subscription activations were silently failing, preventing users from accessing paid features after checkout.

**Solution:** Updated 5 files to use correct `billing_status` table and properly map between Stripe data model and application data model.

**Status:** ✅ CODE CHANGES COMPLETE - Ready for testing and deployment

