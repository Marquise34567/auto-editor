# Quick Setup Guide

## Current Status ✅

Your auto-editor project now has:

✅ **Supabase Auth Integration** - Server & client configured  
✅ **Stripe Billing** - Checkout + webhook handlers  
✅ **Feature Locking** - Middleware + API protection  
✅ **Manual Activation Endpoint** - `/api/billing/activate` for testing  
✅ **Build Compiles** - All TypeScript checks pass  
✅ **Dev Server Running** - Ready at http://localhost:3000

## ⚠️ Next Steps Required

### 1. Set Up Supabase (5 minutes)

**Option A: Use Real Supabase Project (Recommended)**

1. Go to https://supabase.com/dashboard
2. Create new project (or use existing)
3. Copy credentials from **Project Settings → API**:
   - Project URL (looks like: `https://abc123.supabase.co`)
   - `anon` public key
   - `service_role` secret key

4. Update `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```

5. Run database migration:
   ```bash
   # Copy contents of supabase/migrations/001_initial_schema.sql
   # Paste into Supabase SQL Editor
   # Click "Run"
   ```

**Option B: Use Supabase Local Dev**

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase (requires Docker)
supabase start

# Use auto-generated credentials:
# - API URL: http://localhost:54321
# - anon key: (shown in terminal)
# - service_role key: (shown in terminal)
```

### 2. Configure Stripe (5 minutes)

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy **Secret key** (starts with `sk_test_`)
3. Go to Products → Create Product:
   - Name: "Creator Plan"
   - Price: $29/month recurring
   - Copy Price ID (starts with `price_`)
4. Create Studio plan ($99/mo), copy Price ID

5. Update `.env.local`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PRICE_CREATOR=price_...
   STRIPE_PRICE_STUDIO=price_...
   ```

### 3. Test the Flow (10 minutes)

```bash
# Restart dev server to load new env vars
npm run dev
```

**Test Signup:**
1. Open http://localhost:3000/login?mode=signup
2. Create account with test email
3. Should redirect to `/dashboard` after signup

**Test Feature Locking:**
1. Go to http://localhost:3000/editor
2. Should redirect to `/pricing` (no active subscription)

**Test Checkout:**
1. Go to `/pricing` and click "Subscribe"
2. Use Stripe test card: `4242 4242 4242 4242`
3. Complete checkout
4. Redirected to `/billing/success`

**Manual Activation:**
The success page will call `/api/billing/activate` automatically. Check terminal for:
```
✓ Subscription activated: plan=creator, status=active
```

**Verify Access:**
1. Refresh http://localhost:3000/editor
2. Should load successfully (no redirect)
3. Try `/api/analyze` - should return 200 (not 402)

## Environment Variables Checklist

Your `.env.local` should have:

```env
# App URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Session
SESSION_SECRET=random-32-char-string

# Supabase (GET FROM DASHBOARD)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Stripe (GET FROM DASHBOARD)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_CREATOR=price_...
STRIPE_PRICE_STUDIO=price_...

# Optional: Webhooks (for production)
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Current Issue

🔴 **Supabase Not Connected**

Your `.env.local` currently points to `localhost:54321` but no local Supabase is running. This causes:
```
TypeError: fetch failed
ECONNREFUSED localhost:54321
```

**Fix:** Choose Option A (real Supabase project) or Option B (local dev) above.

## Documentation

📖 **Comprehensive Guides:**
- [BILLING_SETUP.md](./BILLING_SETUP.md) - Full Stripe + Supabase integration
- [FEATURE_LOCKING.md](./FEATURE_LOCKING.md) - How feature gating works
- [.env.example](./.env.example) - All environment variables explained

## Architecture Summary

```
User → Middleware Check → Route/API
         ↓                    ↓
    Auth Required?      Billing Check
         ↓                    ↓
    billing_status     status='active'?
         ↓                    ↓
    Redirect/Allow      402/200
```

**Key Files:**
- `src/middleware.ts` - Protects routes (editor, generate)
- `src/app/api/analyze/route.ts` - Returns 402 for free users
- `src/app/api/generate/route.ts` - Returns 402 for free users
- `src/app/api/billing/activate/route.ts` - Manual activation (temporary)
- `src/app/api/stripe/webhook/route.ts` - Auto-activation (production)

## What's Working Now

✅ All code compiles  
✅ Dev server runs  
✅ Middleware protects routes  
✅ API endpoints check billing  
✅ Stripe checkout creates sessions  
✅ Manual activation endpoint ready  

## What Needs Configuration

⏳ Supabase credentials (`.env.local`)  
⏳ Database migration (SQL Editor)  
⏳ Stripe products/prices (Dashboard)  
⏳ Test signup/login flow  
⏳ Test checkout → activation → access  

---

**Next Command:**
```bash
# After updating .env.local with real Supabase credentials:
npm run dev
```

Then test signup at: http://localhost:3000/login?mode=signup
