# SOFT BILLING TESTING CHECKLIST

## Setup Complete ✓

The soft billing system has been implemented with safe test controls:

### Files Changed
1. `.env.example` - Added soft billing configuration flags
2. `.env.local` - Configured for local testing
3. `src/lib/billing/config.ts` - Billing mode helpers (NEW)
4. `src/app/api/stripe/create-checkout-session/route.ts` - Create Stripe checkout (NEW)
5. `src/app/api/stripe/confirm-session/route.ts` - Confirm payment (NEW)
6. `src/app/api/billing/manual-activate/route.ts` - Manual activation (NEW)
7. `src/app/billing/success/page.tsx` - Success page (NEW)
8. `src/app/pricing/page.tsx` - Updated checkout flow

---

## Testing Instructions

### Prerequisites
- Dev server running: `npm run dev`
- Stripe test mode keys in `.env.local`
- BILLING_MODE=soft in `.env.local`

### Test Flow

#### 1. Create Test User
```bash
# Navigate to: http://localhost:3000/login?mode=signup
# Create account: test@example.com / password123
# Check Supabase Auth → Users (user should exist)
```

#### 2. Verify Free Plan Default
```bash
# After signup, check Supabase:
# Table: billing_status
# Expected: plan='free', status='locked'
```

#### 3. Subscribe via Stripe Test Mode
```bash
# Navigate to: http://localhost:3000/pricing
# Click "Subscribe" on Starter/Creator/Studio plan
# Should redirect to Stripe Checkout

# Use Stripe test card:
# Card: 4242 4242 4242 4242
# Expiry: Any future date (e.g., 12/34)
# CVC: Any 3 digits (e.g., 123)
# ZIP: Any 5 digits (e.g., 12345)

# Complete payment
# Should redirect to: /billing/success
```

#### 4. Verify Pending Status
```bash
# Check Supabase billing_status:
# Expected: plan='starter' (or selected plan), status='pending'

# Check /billing/success page:
# Should show: "Status: Activation Pending"
# Should show: "Test mode: Use manual activation to unlock features"
```

#### 5. Manual Activation (Test Only)
```bash
# Get your user_id from Supabase Auth → Users table
# Copy the UUID

# Open PowerShell and run:
curl.exe -X POST http://localhost:3000/api/billing/manual-activate `
  -H "Content-Type: application/json" `
  -H "x-admin-key: test-admin-key-local-dev-only-12345" `
  -d '{\"user_id\":\"YOUR-USER-ID-HERE\",\"plan\":\"creator\"}'

# Expected response:
# {"success":true,"user_id":"...","plan":"creator","status":"active","message":"Subscription manually activated (test mode)"}
```

#### 6. Verify Active Status
```bash
# Check Supabase billing_status:
# Expected: plan='creator', status='active'

# Refresh /billing/success page (if still open):
# Should show: "Status: Active"
```

#### 7. Test Premium Features
```bash
# Navigate to premium features (editor/generate/etc)
# Features should now be unlocked based on plan limits
```

---

## Environment Configuration

### Billing Modes

**BILLING_MODE=off**
- All users locked to free plan
- Checkout disabled
- For: Pre-launch development

**BILLING_MODE=soft** ← Current
- Checkout works
- Payment recorded
- Status set to 'pending'
- Manual activation required
- For: Testing subscription flow without auto-unlock

**BILLING_MODE=live**
- Full production mode
- Webhooks auto-activate subscriptions
- For: Production deployment

### Test Flags

**BILLING_TEST_AUTOACTIVATE=false** (default)
- Subscriptions stay 'pending' after checkout
- Requires manual activation

**BILLING_TEST_AUTOACTIVATE=true**
- Subscriptions auto-activate after checkout
- Useful for quick testing (skip manual activation step)

**BILLING_TEST_ALLOW_MANUAL_ACTIVATE=true** (default)
- Enables `/api/billing/manual-activate` endpoint
- Allows manual activation with admin key

---

## Manual Activation Examples

### Activate User with PowerShell
```powershell
$userId = "USER-ID-FROM-SUPABASE"
$plan = "creator"  # or "starter", "studio"

curl.exe -X POST http://localhost:3000/api/billing/manual-activate `
  -H "Content-Type: application/json" `
  -H "x-admin-key: test-admin-key-local-dev-only-12345" `
  -d "{`"user_id`":`"$userId`",`"plan`":`"$plan`"}"
```

### Activate User with curl (Linux/Mac)
```bash
USER_ID="USER-ID-FROM-SUPABASE"
PLAN="creator"

curl -X POST http://localhost:3000/api/billing/manual-activate \
  -H "Content-Type: application/json" \
  -H "x-admin-key: test-admin-key-local-dev-only-12345" \
  -d "{\"user_id\":\"$USER_ID\",\"plan\":\"$PLAN\"}"
```

---

## Stripe Test Cards

| Card Number         | Description          |
|---------------------|----------------------|
| 4242 4242 4242 4242 | Success              |
| 4000 0000 0000 0002 | Declined             |
| 4000 0000 0000 9995 | Insufficient funds   |

---

## Troubleshooting

### "Billing is currently disabled"
- Check `BILLING_MODE` in `.env.local` is set to `soft` or `live`
- Restart dev server after changing .env

### "Invalid admin key"
- Check `BILLING_ADMIN_KEY` in `.env.local`
- Check `x-admin-key` header matches exactly
- Ensure no extra spaces

### Checkout fails
- Check Stripe keys are set correctly
- Check `STRIPE_PRICE_STARTER/CREATOR/STUDIO` are valid Price IDs
- Check logs in terminal for detailed error

### Session not confirmed
- Check session_id in URL after redirect
- Check browser console for errors
- Check API logs for confirmation errors

---

## Next Steps for Production

1. **Set Real Stripe Keys**
   - Replace test keys with live keys
   - Update Price IDs to production prices

2. **Configure Stripe Webhooks**
   - Create webhook endpoint: https://your-domain.com/api/stripe/webhook
   - Subscribe to events: `checkout.session.completed`, `customer.subscription.updated`
   - Set `STRIPE_WEBHOOK_SECRET`

3. **Enable Live Mode**
   - Set `BILLING_MODE=live`
   - Set `BILLING_TEST_AUTOACTIVATE=false`
   - Set `BILLING_TEST_ALLOW_MANUAL_ACTIVATE=false`

4. **Security**
   - Rotate `BILLING_ADMIN_KEY` to strong secret
   - Never expose admin key in client code
   - Use HTTPS only in production

---

## Quick Reference

```bash
# Start dev server
npm run dev

# Check billing status (Supabase SQL Editor)
SELECT * FROM billing_status WHERE user_id = 'YOUR-USER-ID';

# Manual activate
curl.exe -X POST http://localhost:3000/api/billing/manual-activate -H "Content-Type: application/json" -H "x-admin-key: test-admin-key-local-dev-only-12345" -d '{"user_id":"USER-ID","plan":"creator"}'

# View logs
# Terminal running npm run dev
```
