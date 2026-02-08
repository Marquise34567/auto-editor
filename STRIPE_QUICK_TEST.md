# 🚀 Stripe Checkout - Quick Test Guide

## Required Setup (5 minutes)

### 1. Create Stripe Products & Prices

In Stripe Dashboard → Products → Create Product:

```
Product 1: Starter
- Monthly Price: $9.00 USD
- Recurring: Monthly
- Copy Price ID → price_...

Product 2: Creator  
- Monthly Price: $29.00 USD
- Recurring: Monthly
- Copy Price ID → price_...

Product 3: Studio
- Monthly Price: $99.00 USD
- Recurring: Monthly
- Copy Price ID → price_...
```

### 2. Add to `.env.local`

```env
# App URL
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe Keys (from Dashboard → API Keys)
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY

# Stripe Price IDs (from step 1)
NEXT_PUBLIC_STRIPE_PRICE_STARTER=price_YOUR_STARTER_ID
NEXT_PUBLIC_STRIPE_PRICE_CREATOR=price_YOUR_CREATOR_ID
NEXT_PUBLIC_STRIPE_PRICE_STUDIO=price_YOUR_STUDIO_ID

# Safety Flags
BILLING_LIVE=true
BILLING_WEBHOOKS_LIVE=false  # ← Keep false for now
```

### 3. Start Dev Server

```bash
npm run dev
```

---

## 🧪 Test Scenarios

### Test 1: Direct API Call

```powershell
$body = @{
  priceId = "price_YOUR_STARTER_ID"
  returnTo = "/editor"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/billing/checkout `
  -Method Post `
  -ContentType "application/json" `
  -Body $body

# ✅ Expected: { "url": "https://checkout.stripe.com/c/pay/cs_test_..." }
```

### Test 2: Full Checkout Flow

1. Navigate to: http://localhost:3000/pricing
2. Click **Subscribe** on Starter plan
3. Use test card: `4242 4242 4242 4242`
4. Any future date for expiry (e.g., `12/34`)
5. Any CVC (e.g., `123`)
6. Submit payment

**✅ Expected Result:**
- Redirect to `/editor?pending=1`
- Amber banner shows: "🔒 Subscription Pending Verification"
- Message: "Payment received — activation pending..."

### Test 3: Check Billing Status

```powershell
Invoke-RestMethod http://localhost:3000/api/billing/status | ConvertTo-Json -Depth 5

# ✅ Expected:
# {
#   "ok": true,
#   "isPending": true,
#   "planId": "free",  # ← Still free (webhooks not active)
#   "subscriptionStatus": "incomplete",
#   "message": "Payment received — activation pending..."
# }
```

### Test 4: Verify Stripe Dashboard

1. Go to: https://dashboard.stripe.com/test/payments
2. Find your test payment (should show "Succeeded")
3. Click payment → Subscription tab
4. Verify subscription is "Active"

**Note:** Even though Stripe shows "Active", your app keeps user on FREE plan because `WEBHOOKS_LIVE=false`. This is intentional safety!

---

## 🎯 What Should Happen

| State | WEBHOOKS_LIVE | After Checkout | Plan | Features | Banner |
|-------|--------------|----------------|------|----------|--------|
| **Current** | `false` | Redirect to `/editor?pending=1` | FREE | Locked | ✅ Shows |
| **Later** | `true` | Redirect to `/editor` | STARTER/CREATOR/STUDIO | Unlocked | ❌ Hidden |

---

## 🔍 Debugging

### Issue: "Invalid priceId" error

```powershell
# Check your env vars loaded correctly
node -e "console.log(process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER)"

# Should print: price_...
# If undefined → restart dev server
```

### Issue: "Failed to create checkout session"

```powershell
# Verify Stripe key is correct
node -e "console.log(process.env.STRIPE_SECRET_KEY?.substring(0, 10))"

# Should print: sk_test_51...
# If undefined → check .env.local exists
```

### Issue: Pending banner doesn't show

1. Check URL after redirect: `http://localhost:3000/editor?pending=1`
2. Open DevTools → Console → Look for errors
3. Verify component imported in editor page:
   ```tsx
   import { PendingSubscriptionBanner } from "@/components/PendingSubscriptionBanner";
   ```

### Issue: Build fails

```bash
npm run build

# If TypeScript error → check:
# - Stripe API version matches (2026-01-28.clover)
# - Type guards in success route
```

---

## 🚀 Next: Enable Webhooks (When Ready)

### Step 1: Install Stripe CLI

```bash
# Windows
winget install stripe.stripe-cli

# Mac
brew install stripe/stripe-cli/stripe
```

### Step 2: Forward Webhooks Locally

```bash
stripe login
stripe listen --forward-to localhost:3000/api/billing/webhook

# Copy webhook secret (whsec_...) → add to .env.local
```

### Step 3: Create Webhook Route

**(Not implemented yet - will be next commit)**

### Step 4: Test Webhook

```bash
stripe trigger checkout.session.completed
```

### Step 5: Enable in Production

```env
BILLING_WEBHOOKS_LIVE=true
```

---

## ✅ Success Criteria

- [ ] Checkout API returns Stripe URL
- [ ] Redirect to Stripe Checkout works
- [ ] Test payment completes successfully
- [ ] Redirect back to `/editor?pending=1` works
- [ ] Pending banner appears on editor page
- [ ] Billing status shows `isPending: true`
- [ ] User stays on FREE plan (features locked)
- [ ] Stripe Dashboard shows successful payment

---

## 📞 Support

If something doesn't work:

1. Check `.env.local` is in project root (not `.env`)
2. Restart dev server after changing env vars
3. Verify Stripe Price IDs in Dashboard match your `.env.local`
4. Check browser DevTools Console for errors
5. Check terminal output for backend errors

---

**Current Status**: ✅ All code implemented and tested. Build passing. Ready to test with your Stripe account!
