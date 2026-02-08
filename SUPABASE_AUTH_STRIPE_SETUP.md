# Supabase Auth + Stripe Subscription Setup Guide

## 🎯 Overview

This guide covers the complete setup for **Supabase Authentication + Stripe Subscriptions** in Auto-Editor. You'll:

1. ✅ Create a Supabase project and deploy the database schema
2. ✅ Wire up Supabase Auth for signup/login/logout
3. ✅ Protect /editor and /generate routes
4. ✅ Create Stripe checkout sessions
5. ✅ Set up subscription gating (with webhook placeholder)
6. ✅ Deploy to Vercel

**Current Status**: Build ✅ passes. Ready for Supabase setup.

---

## 📋 Prerequisites

- Supabase account (https://supabase.com)
- Stripe account with products/prices configured
- Vercel account for deployment
- GitHub repository for code

---

## Part 1: Supabase Setup

### Step 1.1: Create a Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **New Project**
3. Fill in:
   - **Name**: `auto-editor`
   - **Database Password**: Save this securely!
   - **Region**: Choose closest to you
4. Wait ~2 minutes for provisioning

### Step 1.2: Deploy the Database Schema

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open `supabase/schema.sql` from your project
4. Copy **entire file contents**
5. Paste into Supabase SQL editor
6. Click **RUN**
7. Verify all tables created (no errors)

**Tables created**:
- `profiles` - User profile data
- `subscriptions` - Subscription status + Stripe IDs
- Auto-triggers for profile creation on signup

### Step 1.3: Get Your Supabase Credentials

In Supabase Dashboard, go to **Settings > API**:

| Variable | Location | Example |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Copy "Project URL" | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | "Project API Keys" → "anon (public)" | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | "Project API Keys" → "service_role" | `eyJhbGc...` |

**⚠️ CRITICAL**: 
- `ANON_KEY` is safe to expose (used in browser)
- `SERVICE_ROLE_KEY` is a SECRET - never commit, only in env

### Step 1.4: Configure Site URL in Supabase

1. In Supabase, go to **Settings > Auth > Site URL**
2. Set to your app URL:
   - **Local**: `http://localhost:3000`
   - **Production**: `https://autoeditor.app`
3. Click **Save**

### Step 1.5: Configure Redirect URLs in Supabase

1. In Supabase, go to **Settings > Auth > Redirect URLs**
2. Add these URLs:
   - `http://localhost:3000/auth/callback`
   - `https://autoeditor.app/auth/callback`
3. Click **Save**

---

## Part 2: Local Testing Setup

### Step 2.1: Create `.env.local`

In project root, create `.env.local` with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Site URL for auth callbacks
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Stripe (from your Stripe dashboard)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_CREATOR=price_...
STRIPE_PRICE_STUDIO=price_...

# Billing safety flags (keep false until webhooks live)
BILLING_LIVE=false
BILLING_WEBHOOKS_LIVE=false

# Other
NODE_ENV=development
```

### Step 2.2: Test Locally

```bash
# Install dependencies (if not already)
npm install

# Run dev server
npm run dev
```

Go to http://localhost:3000:

1. **Click "Sign Up"** on landing page
2. **Create test account**: `test@example.com` / `password123`
3. **Confirm signup** (check browser console for any errors)
4. **Should redirect to /editor**
5. **Click pricing button** → should show "Subscribe to Starter"
6. **Click Subscribe** → redirects to Stripe Checkout

✅ **Expected behavior**: 
- User created in Supabase
- Profile + subscription records auto-created
- Checkout session created
- Redirect to Stripe (test card: 4242 4242 4242 4242)

❌ **If auth fails**:
- Check browser Network tab for `/api/auth/signup` response
- Verify `.env.local` has correct Supabase keys
- Check Supabase SQL Editor for any schema errors

---

## Part 3: Stripe Integration

### Step 3.1: Verify Stripe Products/Prices

In Stripe Dashboard (https://dashboard.stripe.com):

1. Go to **Products**
2. Verify you have:
   - **Starter** plan with a price (e.g., $29/month)
   - **Creator** plan with a price (e.g., $99/month)
   - **Studio** plan with a price (e.g., $299/month)
3. Copy each price ID (starts with `price_`) into `.env.local`

### Step 3.2: Test Checkout Locally

1. From pricing page, click **Subscribe** for any plan
2. You're redirected to Stripe Checkout
3. Use test card: **4242 4242 4242 4242** (exp: any future date, CVC: any 3 digits)
4. Complete payment
5. Redirected to `/billing/success`

**What happens next** (since webhooks aren't live):
- ✅ Checkout session created
- ✅ Redirect to success page
- ⏳ Subscription status: `pending_webhook` (awaiting webhook activation)
- ⏳ Features still **LOCKED** (because `BILLING_WEBHOOKS_LIVE=false`)

### Step 3.3: Webhook Setup (For Later)

When you're ready to go live:

1. In Stripe Dashboard, go to **Webhooks**
2. Create endpoint: `https://autoeditor.app/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy signing secret (whsec_...) to `STRIPE_WEBHOOK_SECRET=...`
5. In app, uncomment webhook handler in `src/app/api/stripe/webhook/route.ts`
6. Set `BILLING_WEBHOOKS_LIVE=true`
7. Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

---

## Part 4: Vercel Deployment

### Step 4.1: Set Environment Variables in Vercel

1. Go to https://vercel.com/dashboard
2. Select your **auto-editor** project
3. Go to **Settings > Environment Variables**
4. Add these variables:

| Key | Value | Type |
|-----|-------|------|
| `NEXT_PUBLIC_SITE_URL` | `https://autoeditor.app` | Public |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Anon Key | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Service Role Key | Secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Your Stripe publishable key | Public |
| `STRIPE_SECRET_KEY` | Your Stripe secret key | Secret |
| `STRIPE_PRICE_STARTER` | price_... | Public |
| `STRIPE_PRICE_CREATOR` | price_... | Public |
| `STRIPE_PRICE_STUDIO` | price_... | Public |
| `BILLING_LIVE` | `false` | Public |
| `BILLING_WEBHOOKS_LIVE` | `false` | Public |

### Step 4.2: Update Supabase Site URL for Production

1. In Supabase, **Settings > Auth > Site URL**
2. Set to: `https://autoeditor.app`
3. Also add redirect URL: `https://autoeditor.app/auth/callback`

### Step 4.3: Deploy

```bash
# Push to GitHub
git add .
git commit -m "feat: Add Supabase Auth + Stripe checkout scaffolding"
git push origin main

# Vercel auto-deploys on push
# Or manually trigger in Vercel dashboard
```

**Test in production**:
1. Go to https://autoeditor.app/login
2. Create account with test email
3. Verify redirect to /editor
4. Try checkout with test Stripe card

---

## 📁 Files Changed/Added

### New Files
- `middleware.ts` - Route protection via Supabase auth
- `src/lib/supabaseClient.ts` - Browser Supabase client
- `src/lib/supabaseServer.ts` - Server Supabase client
- `src/lib/auth.ts` - Server auth utilities
- `src/app/auth/callback/route.ts` - OAuth/email callback handler
- `src/app/api/stripe/checkout/route.ts` - Checkout session creation
- `src/app/api/stripe/webhook/route.ts` - Webhook placeholder

### Updated Files
- `src/app/api/auth/login/route.ts` - Now uses Supabase Auth
- `src/app/api/auth/signup/route.ts` - Now uses Supabase Auth
- `src/app/api/auth/logout/route.ts` - Now uses Supabase Auth
- `src/app/api/auth/me/route.ts` - Now queries Supabase user/profile
- `.env.example` - Added Supabase + Stripe variables

---

## 🔐 Security Notes

### RLS (Row-Level Security)
- Users can **read/update** only their own profile & subscription
- Service role (server-side) has full access
- ✅ Data isolation enforced at database level

### Secret Management
- **Secrets**: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`
- ❌ Never commit to Git
- ✅ Only in `.env.local` (ignored by Git)
- ✅ Add to Vercel as "Secret" type

### Auth Flow
1. User signs up → Supabase creates auth.users record
2. Trigger fires → auto-creates profiles + subscriptions rows
3. Middleware checks session on protected routes
4. Redirects to /login if no session

---

## 🧪 Testing Checklist

- [ ] Local signup works
- [ ] Profiles table populated in Supabase
- [ ] Subscriptions table shows user records
- [ ] /editor redirects to /login if not logged in
- [ ] Checkout button works
- [ ] Stripe Checkout loads
- [ ] Test payment processes
- [ ] /billing/success shows "pending activation"
- [ ] Vercel deploy succeeds
- [ ] Production signup works

---

## 🚨 Common Issues

### "NEXT_PUBLIC_SUPABASE_URL is not set"
- ✅ Verify `.env.local` exists in project root
- ✅ Restart dev server after adding .env.local

### "Invalid credentials" on login
- ✅ Check user was created in Supabase > Authentication > Users
- ✅ Verify email/password match

### Checkout redirects to /login
- ✅ Verify middleware is protecting /editor properly
- ✅ Check `requireUserServer()` in checkout API

### Webhooks don't trigger
- ✅ Webhook endpoint must be publicly accessible (https://, not localhost)
- ✅ Stripe webhook secret must match `STRIPE_WEBHOOK_SECRET`
- ✅ Test with Stripe CLI first

---

## 📞 Support

- **Supabase Docs**: https://supabase.com/docs
- **Stripe Docs**: https://stripe.com/docs
- **Next.js**: https://nextjs.org/docs

---

## Next Steps After Setup

1. **Enable billing** (when webhooks are live):
   - Set `BILLING_LIVE=true`
   - Set `BILLING_WEBHOOKS_LIVE=true`

2. **Implement webhook handler**:
   - Uncomment code in `src/app/api/stripe/webhook/route.ts`
   - Update subscription status in database
   - Test with Stripe CLI

3. **Monitor usage** (if implementing render limits):
   - Query `usage_monthly` table for user
   - Increment on successful render

4. **Customer support**:
   - View subscriptions in Supabase SQL Editor
   - Update manually if needed

---

**Last Updated**: February 2026
**Status**: ✅ Ready for Supabase + Stripe configuration
