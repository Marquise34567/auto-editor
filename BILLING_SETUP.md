# Billing Setup Guide

This guide walks you through setting up Supabase Auth + Stripe billing for auto-editor.

## Prerequisites

- Supabase project created
- Stripe account with test mode enabled
- Vercel deployment (or local .env.local for testing)

---

## Step 1: Supabase Database Setup

### Run the migration SQL

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the contents of `supabase/migrations/001_initial_schema.sql`
5. Paste and click **RUN**

This creates:
- `profiles` table (user info + Stripe customer ID)
- `billing_status` table (plan, status, subscription ID)
- RLS policies (users can read their own data)
- Trigger to auto-create profile + billing_status on signup

### Verify Tables

```sql
-- Check profiles table
SELECT * FROM profiles;

-- Check billing_status table
SELECT * FROM billing_status;
```

---

## Step 2: Environment Variables

### Required Variables

Add these to your `.env.local` (local) and Vercel (production):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Secret! Never expose

# Stripe
STRIPE_SECRET_KEY=sk_test_...  # Use sk_live_ for production
STRIPE_WEBHOOK_SECRET=whsec_...  # Leave empty initially, add after Step 4
STRIPE_PRICE_CREATOR=price_...  # See Step 3
STRIPE_PRICE_STUDIO=price_...   # See Step 3

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Use https://autoeditor.app in production
```

### Get Supabase Keys

1. Supabase Dashboard → **Settings** → **API**
2. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep secret!)

### Get Stripe Keys

1. Stripe Dashboard → **Developers** → **API Keys**
2. Copy:
   - Publishable key → Not needed (we use server-side only)
   - Secret key → `STRIPE_SECRET_KEY`

---

## Step 3: Create Stripe Products & Prices

### Creator Plan ($29/month)

1. Stripe Dashboard → **Products** → **Add Product**
2. Fill in:
   - Name: `Creator`
   - Description: `For content creators`
   - Pricing: `Recurring` → `Monthly` → `$29.00`
3. Click **Save**
4. Copy the **Price ID** (starts with `price_...`)
5. Set `STRIPE_PRICE_CREATOR=price_xxxxx`

### Studio Plan ($99/month)

1. Repeat above for Studio plan
2. Set `STRIPE_PRICE_STUDIO=price_xxxxx`

---

## Step 4: Stripe Webhook Setup (Optional - Enables Feature Unlocking)

⚠️ **IMPORTANT**: Without webhooks, users will stay in "pending" status after checkout and cannot access features.

### For Local Testing (with Stripe CLI)

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. Copy the webhook signing secret (starts with `whsec_...`)
5. Set `STRIPE_WEBHOOK_SECRET=whsec_...` in `.env.local`
6. Restart dev server

### For Production (Vercel)

1. Stripe Dashboard → **Developers** → **Webhooks**
2. Click **Add Endpoint**
3. Set Endpoint URL: `https://autoeditor.app/api/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Add Endpoint**
6. Copy the **Signing Secret** (starts with `whsec_...`)
7. Add to Vercel: `STRIPE_WEBHOOK_SECRET=whsec_...`
8. Redeploy

---

## Step 5: Test the Flow

### 1. Sign Up

- Go to `/login`
- Click "Sign Up"
- Enter email + password
- Should redirect to `/dashboard` after callback
- Check Supabase: `profiles` and `billing_status` rows should exist with `plan='free'`, `status='locked'`

### 2. Subscribe

- Go to `/pricing`
- Click "Subscribe" on Creator or Studio plan
- Should redirect to Stripe Checkout
- Use test card: `4242 4242 4242 4242`, exp: any future date, CVC: any 3 digits
- Click "Pay"

### 3. Success Page

- Should redirect to `/billing/success?session_id=cs_...`
- Shows "Payment Received!" with status "Pending Activation"
- Check Supabase: `billing_status.status` should be `'pending'`

### 4. Webhook Activation (if webhook is set up)

- After a few seconds, webhook fires
- Check Supabase: `billing_status.status` should change to `'active'`
- User can now access premium features

### 5. Feature Access

- Try accessing `/editor` or `/generate`
- If `status='active'` → allowed
- If `status='pending'` or `'locked'` → redirected to `/pricing?locked=1`

---

## Step 6: Feature Gating Implementation

### Protect Server Actions/API Routes

```typescript
import { requireActiveBilling } from '@/lib/billing/getBillingStatus'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await requireActiveBilling(user.id)
  } catch {
    return Response.json({ error: 'Active subscription required' }, { status: 402 })
  }

  // ... your premium feature logic
}
```

### Protect Pages (Server Component)

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBillingStatus } from '@/lib/billing/getBillingStatus'

export default async function EditorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/editor')
  }

  const billing = await getBillingStatus(user.id)
  
  if (!billing || billing.status !== 'active') {
    redirect('/pricing?locked=1')
  }

  // ... render editor
}
```

---

## Troubleshooting

### Issue: "Webhook not configured" error

**Solution**: Add `STRIPE_WEBHOOK_SECRET` to your environment variables. If testing locally without webhooks, users will stay in "pending" status.

### Issue: User stuck in "pending" after checkout

**Cause**: Webhook not firing or `STRIPE_WEBHOOK_SECRET` missing.

**Solution**: 
1. Check Stripe Dashboard → Webhooks → Recent Events
2. Verify webhook endpoint is correct
3. Check webhook signing secret matches `STRIPE_WEBHOOK_SECRET`
4. Manually trigger webhook in Stripe Dashboard (for testing)

### Issue: "SUPABASE_SERVICE_ROLE_KEY is required" error

**Solution**: Add the service role key from Supabase Settings → API to your environment variables. This is needed for admin operations (updating billing status).

### Issue: RLS policy preventing updates

**Cause**: Service role should bypass RLS automatically, but if using anon key, RLS will block updates.

**Solution**: Ensure `createAdminClient()` uses `SUPABASE_SERVICE_ROLE_KEY`, not anon key.

### Issue: Checkout session not found

**Cause**: Session ID is invalid or expired (expires after 24 hours).

**Solution**: User should start checkout flow again from `/pricing`.

---

## Production Checklist

Before going live:

- [ ] Replace all Stripe test keys with live keys
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Set up production webhook endpoint in Stripe
- [ ] Test full flow: signup → subscribe → webhook → feature access
- [ ] Monitor Stripe Dashboard for failed payments/webhooks
- [ ] Set up Stripe email receipts for customers
- [ ] Configure Stripe customer portal (for managing subscriptions)

---

## Security Notes

- ✅ Never expose `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY` client-side
- ✅ Always verify webhook signatures (prevents fake webhook calls)
- ✅ RLS policies prevent users from modifying billing status directly
- ✅ All Stripe operations happen server-side (API routes)
- ✅ Feature gating happens on the server (can't be bypassed client-side)

---

## Next Steps

1. Implement Stripe customer portal for subscription management
2. Add email notifications for subscription changes
3. Implement usage-based billing (if needed)
4. Add analytics/tracking for conversions
5. Set up subscription renewal reminders
6. Add promotional codes/discounts

---

**Need help?** Check the code comments or refer to:
- Supabase docs: https://supabase.com/docs
- Stripe docs: https://stripe.com/docs
- Next.js docs: https://nextjs.org/docs
