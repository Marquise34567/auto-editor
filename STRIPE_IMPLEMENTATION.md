# 🔥 STRIPE SUBSCRIPTION IMPLEMENTATION GUIDE

**Status**: Billing safety system already implemented ✅
**Next**: Full Stripe checkout + plan gating

---

## 📦 REQUIRED PACKAGES

Add to your project:

```bash
npm install stripe@16.17.0
```

---

## 🔐 ENVIRONMENT VARIABLES

### Add to Vercel (Production):

```
# Billing Control
BILLING_LIVE=true
BILLING_WEBHOOKS_LIVE=false  # Set to true only after webhook is configured

# Stripe Keys
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...  # Get after creating webhook

# Price Lookups (already configured in Stripe)
STRIPE_STARTER_PRICE_LOOKUP=starter_monthly
STRIPE_CREATOR_PRICE_LOOKUP=creator_monthly
STRIPE_STUDIO_PRICE_LOOKUP=studio_monthly

# App URL
NEXT_PUBLIC_APP_URL=https://auto-editor.vercel.app

# Session Secret (already set)
SESSION_SECRET=37389d36a9e12acb02ee28823f092b847206aa949a177a39091b10018e64a65d
NODE_ENV=production
```

### Local Development (.env.local):

```
BILLING_LIVE=true
BILLING_WEBHOOKS_LIVE=false
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
SESSION_SECRET=37389d36a9e12acb02ee28823f092b847206aa949a177a39091b10018e64a65d
```

---

## 📝 FILES TO CREATE/UPDATE

I've created the Stripe config file. Now you need to:

### 1. Replace checkout route

```bash
# In PowerShell
mv src/app/api/billing/checkout/route-new.ts src/app/api/billing/checkout/route.ts
```

### 2. Update pricing page Subscribe button

Find in `src/app/pricing/page.tsx`:

```typescript
const handleUpgrade = (planId: string) => {
  // Change this function to:
  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') {
      router.push('/login'); // or '/editor' if logged in
      return;
    }

    try {
      const currentPath = getCurrentPath();
      storeReturnTo(currentPath);

      // Call checkout API
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planId,
          returnTo: currentPath,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Checkout failed');
      }

      // Redirect to Stripe
      window.location.href = data.url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to start checkout: ${msg}`);
    }
  };
```

### 3. Update button text in plans array

```typescript
// In PLANS config (src/config/plans.ts), change ctaText:
FREE: {
  ctaText: 'Start Free',  // was 'Sign Up'
},
STARTER: {
  ctaText: 'Subscribe',  // was 'Sign Up'
},
CREATOR: {
  ctaText: 'Subscribe',
},
STUDIO: {
  ctaText: 'Subscribe',
},
```

### 4. Update /billing/success page

In `src/app/billing/success/page.tsx`, update the polling logic:

```typescript
// Add session_id check
const sessionId = searchParams.get('session_id');

if (sessionId) {
  // Verify payment with Stripe
  const response = await fetch(`/api/billing/status?session_id=${sessionId}`);
  const data = await response.json();

  if (data.paymentStatus === 'paid' && data.activation === 'pending') {
    // Show pending activation message
    setStatus('pending_activation');
  } else if (data.paymentStatus === 'paid' && data.activation === 'active') {
    setStatus('confirmed');
  }
}
```

### 5. Add /api/billing/status session check

Update `src/app/api/billing/status/route.ts`:

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  // If session_id provided, verify Stripe payment
  if (sessionId) {
    try {
      const { stripe } = await import('@/lib/stripe/config');
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      return NextResponse.json({
        ok: true,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_details?.email,
        plan: session.metadata?.plan,
        returnTo: session.metadata?.returnTo,
        activation: areWebhooksLive() ? 'active' : 'pending',
      });
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: 'Invalid session' },
        { status: 400 }
      );
    }
  }

  // ... rest of existing status logic
}
```

---

## 🧪 TESTING CHECKLIST

### Local Testing (with test keys):

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Test Free plan**:
   - [ ] Visit /pricing
   - [ ] Click "Start Free" on Free plan
   - [ ] Should go to /login (or /editor)

3. **Test Paid plan**:
   - [ ] Click "Subscribe" on Starter plan
   - [ ] Should redirect to Stripe Checkout
   - [ ] Use test card: `4242 4242 4242 4242`, any future date, any CVC
   - [ ] Complete checkout
   - [ ] Should land on /billing/success
   - [ ] Should show "Payment received — activation pending"
   - [ ] After 3 seconds, redirect to returnTo path

4. **Test Feature Limits**:
   - [ ] Try to render 13th video on FREE → Should block with "Quota exceeded"
   - [ ] Try to upload 11-minute video on FREE → Should block with "Video too long"

### Production Testing:

1. **Deploy to Vercel** with env vars above
2. **Test checkout** with real card (will charge $9)
3. **Verify** pending activation shows
4. **Set up webhook**:
   - Vercel URL: `https://your-domain.vercel.app/api/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Get webhook secret
5. **Add to Vercel**: `STRIPE_WEBHOOK_SECRET=whsec_...`
6. **Set**: `BILLING_WEBHOOKS_LIVE=true`
7. **Redeploy**
8. **Test again** → Features should unlock immediately

---

## 🎯 WHAT'S ALREADY DONE

✅ **Billing safety system** (BILLING_LIVE flag)
✅ **getUserEntitlements()** - Server-side plan enforcement
✅ **Feature limits** in /api/generate
✅ **Pricing page** UI with dark theme
✅ **Return-to flow** helpers
✅ **Success page** with polling logic
✅ **Git repository** with all code pushed

---

## 📋 DEPLOYMENT STEPS

1. **Install Stripe package**:
   ```bash
   npm install stripe@16.17.0
   ```

2. **Move new checkout route**:
   ```bash
   mv src/app/api/billing/checkout/route-new.ts src/app/api/billing/checkout/route.ts
   ```

3. **Update pricing page** handleUpgrade function (see section 2 above)

4. **Update plans config** button text (see section 3 above)

5. **Build and test**:
   ```bash
   npm run build
   # Should compile successfully
   ```

6. **Commit and push**:
   ```bash
   git add -A
   git commit -m "feat: Implement Stripe subscription checkout

- Add Stripe SDK and config
- Create checkout session route
- Update pricing page to call Stripe
- Add pending_activation state
- Update success page for payment verification
- Add BILLING_WEBHOOKS_LIVE flag"
   git push origin main
   ```

7. **Deploy to Vercel**:
   - Add all env vars listed above
   - Set `BILLING_LIVE=true`
   - Set `BILLING_WEBHOOKS_LIVE=false` (until webhook configured)
   - Deploy

8. **Test checkout** (charges real card in production!)

9. **Configure webhook** in Stripe Dashboard

10. **Enable webhooks**: Set `BILLING_WEBHOOKS_LIVE=true` and redeploy

---

## 🚨 IMPORTANT SAFETY NOTES

1. **NEVER commit STRIPE_SECRET_KEY** to Git
2. Keep `BILLING_WEBHOOKS_LIVE=false` until webhook is tested
3. Test with Stripe test keys first (sk_test_...)
4. Users will see "pending activation" until webhooks are live
5. No paid features unlock without webhook confirmation

---

## 📞 SUPPORT

If checkout fails, check:
1. Vercel logs for Stripe errors
2. Stripe Dashboard → Logs
3. Browser console for client errors
4. Ensure all env vars are set correctly

The system is designed to fail safely - if anything breaks, users stay on FREE plan.

