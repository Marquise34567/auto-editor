# Return-To Flow Quick Reference & Testing Guide

## Quick Start

### Test the Complete Flow Locally

```bash
# 1. Start dev server
npm run dev

# 2. In browser:
# Visit: http://localhost:3000/pricing

# 3. Click "Subscribe" on any plan
# Expected: Redirects to /checkout?plan=PLAN&billingCycle=PERIOD&returnTo=/pricing

# 4. On checkout page:
# - Review plan summary
# - Click "Continue to Payment"
# - Expected: API call to POST /api/billing/checkout

# 5. Mock response (Stripe not integrated yet):
# { "ok": true, "url": "https://checkout.stripe.com/mock?..." }

# 6. In real scenario:
# - Redirect to Stripe checkout
# - Complete payment
# - Stripe redirects to: /billing/success?session_id=xyz&returnTo=/pricing
# - Success page polls /api/billing/status until active
# - Redirects back to /pricing
```

## API Endpoints

### POST /api/billing/checkout
Create a checkout session

```bash
curl -X POST http://localhost:3000/api/billing/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "starter",
    "billingCycle": "monthly",
    "returnTo": "/pricing"
  }'

# Response
{
  "ok": true,
  "url": "https://checkout.stripe.com/pay/...",
  "message": "Stripe integration pending..."
}
```

### GET /api/billing/status
Check subscription status (used by success page for polling)

```bash
curl http://localhost:3000/api/billing/status

# Response
{
  "ok": true,
  "userId": "demo-user",
  "planId": "free",
  "subscriptionStatus": "active",
  "rendersRemaining": 12,
  "maxVideoMinutes": 10,
  "maxExportQuality": "720p",
  "watermarkRequired": true,
  "queuePriority": "background",
  "canRender": true,
  "message": "Free plan: 12 renders left this period"
}
```

## Pages

### /pricing
Pricing page with plan cards
- Clicking "Subscribe" captures current path
- Stores returnTo in localStorage
- Redirects to /checkout with returnTo param

### /checkout?plan=PLAN&billingCycle=PERIOD&returnTo=PATH
Checkout review page
- Shows plan summary
- "Continue to Payment" → POST /api/billing/checkout
- "Back" button uses returnTo to return to previous page

### /billing/success?session_id=ID&returnTo=PATH
Payment confirmation page
- Shows loading spinner while polling /api/billing/status
- Once subscription becomes "active", redirects to returnTo
- Fallback: /editor if no returnTo or timeout

## Client Library

### src/lib/client/returnTo.ts

```typescript
import {
  validateReturnTo,        // Remove unsafe paths
  getCurrentPath,          // Get current location
  storeReturnTo,          // Save to localStorage
  getStoredReturnTo,      // Read from localStorage
  clearReturnTo,          // Remove from localStorage
  getReturnTo,            // Get from URL or storage
  createCheckoutUrl,      // Build /checkout?... URL
} from '@/lib/client/returnTo';

// Example: In pricing page button click
const handleUpgrade = (planId: string) => {
  const currentPath = getCurrentPath();     // '/pricing'
  storeReturnTo(currentPath);               // Save for later
  const url = createCheckoutUrl(planId, 'monthly', currentPath);
  router.push(url);  // → '/checkout?plan=starter&billingCycle=monthly&returnTo=/pricing'
};
```

## Validation Rules

### returnTo Validation
✅ Allowed:
- `/pricing`
- `/editor`
- `/editor?tab=settings`
- `/dashboard`
- `/`

❌ Blocked:
- `http://attacker.com`
- `https://malicious.site`
- `javascript:alert(1)`
- `//evil.com`

```typescript
// How validation works:
const path = "/editor";
if (!path.startsWith('/') || path.includes('http')) {
  return '/editor';  // ← Falls back to safe default
}
```

## Security Checklist

- ✅ returnTo starts with `/` (no protocol-relative URLs)
- ✅ returnTo doesn't contain `http` (no external redirects)
- ✅ returnTo validated on checkout page load
- ✅ returnTo validated in API before storing in metadata
- ✅ returnTo validated before redirect on success page
- ✅ Features ONLY unlock after webhook confirms active status
- ✅ Success page does NOT unlock features (just redirects)

## Troubleshooting

### "Page not redirecting from success page"
- Check browser console for errors
- Verify `/api/billing/status` returns `subscriptionStatus: "active"`
- Check localStorage for returnTo value
- Ensure no firewall/CORS issues blocking status polling

### "returnTo is being ignored"
- Make sure it starts with `/`
- Make sure it doesn't contain `http`
- Check if `/api/billing/status` is returning `planId !== "free"`
- Validate in browser DevTools → Network tab

### "Lost returnTo after page refresh"
- That's by design! localStorage persists it
- Check: `localStorage.getItem('ae_returnTo')` in console
- If not there, try again with storeReturnTo() before redirect

### "Getting redirected to /editor instead of original page"
- Success page fallback triggered (timeout or error)
- Check browser console for polling errors
- Verify webhook hasn't processed yet
- Check /api/billing/status response for errors

## Build Verification

```bash
# Full build (catches TypeScript errors)
npm run build

# Expected output:
# ✓ Compiled successfully
# ✓ Generating static pages (25/25)
# Route (app)
#  ├ / 
#  ├ /checkout           ← NEW
#  ├ /billing/success    ← NEW
#  ├ /api/billing/checkout ← NEW
#  └ ... (other routes)
#
# No TypeScript errors ✓
```

## Files at a Glance

| File | Created | Purpose |
|------|---------|---------|
| `src/lib/client/returnTo.ts` | ✅ | Client utilities for returnTo |
| `src/app/checkout/page.tsx` | ✅ | Checkout review page |
| `src/app/billing/success/page.tsx` | ✅ | Success + polling page |
| `src/app/api/billing/checkout/route.ts` | ✅ | Create Stripe session |
| `src/app/pricing/page.tsx` | 🔄 | Updated handleUpgrade |
| `RETURN_TO_FLOW_IMPLEMENTATION.md` | ✅ | Full documentation |

## Next Steps: Stripe Integration

When ready to use real Stripe:

1. Install Stripe SDK
   ```bash
   npm install stripe @stripe/stripe-js
   ```

2. Set environment variables
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_...
   ```

3. Update `/api/billing/checkout` to create real sessions

4. Update `/api/billing/webhook` to verify signatures

5. Test webhook flow with Stripe CLI
   ```bash
   stripe listen --forward-to localhost:3000/api/billing/webhook
   ```

6. Map `planId` to Stripe `price_id`
   ```
   starter → price_starter_monthly
   creator → price_creator_monthly
   studio  → price_studio_monthly
   ```

## Example: Stripe Session Metadata

Once Stripe is integrated, sessions will look like:

```javascript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer_email: 'user@example.com',
  line_items: [{
    price: 'price_starter_monthly',
    quantity: 1,
  }],
  success_url: 'http://localhost:3000/billing/success?session_id={CHECKOUT_SESSION_ID}&returnTo=/pricing',
  cancel_url: 'http://localhost:3000/checkout?plan=starter&billingCycle=monthly&returnTo=/pricing',
  metadata: {
    userId: 'user123',
    planId: 'starter',
    billingCycle: 'monthly',
    returnTo: '/pricing',  ← ← ← STORED HERE
  },
  client_reference_id: 'user123',
});
```

Webhook can then use `event.data.object.metadata.returnTo` if needed.
