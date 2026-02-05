# SOFT BILLING - QUICK REFERENCE CARD

## 🚀 Quick Start (30 seconds)

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run tests (when server is ready)
node scripts/test-soft-billing.mjs
```

**Expected output**: ✅ ALL TESTS PASSED (100%)

---

## 📍 Key Endpoints

| Endpoint | Method | Purpose | Auth | Response |
|----------|--------|---------|------|----------|
| `/api/ping` | GET | Health check | None | `{ok: true}` |
| `/api/auth/signup` | POST | Create user | None | `{user: {id, email}}` |
| `/api/auth/login` | POST | Login user | None | `{user: {id}}` + cookie |
| `/api/stripe/create-checkout-session` | POST | Start checkout | Yes | `{url, sessionId}` |
| `/api/stripe/confirm-session` | POST | Confirm payment | Yes | `{success, status}` |
| `/api/billing/status` | GET | Get billing status | Yes | `{plan, status, ...}` |
| `/api/billing/manual-activate` | POST | Manual activation | Admin key | `{success, status}` |
| `/api/billing/reset` | POST | Reset to free | Yes | `{success}` |
| `/api/generate` | POST | Premium feature | Yes (402 if inactive) | Feature result |

---

## 🔐 Authentication

```javascript
// Signup
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "Password123!",
  "confirmPassword": "Password123!"
}

// Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "Password123!"
}
// Returns session cookie - include in subsequent requests
```

---

## 💳 Subscription Flow

```
1. User signs up
   → Default: plan='free', status='locked'
   
2. Click "Upgrade"
   → POST /api/stripe/create-checkout-session {plan: 'starter'}
   → Returns Stripe checkout URL
   
3. Complete payment on Stripe (use 4242 4242 4242 4242)
   → Confirms session
   → Status changes to plan='starter', status='pending'
   
4. Manual activation (soft mode only)
   → POST /api/billing/manual-activate (with x-admin-key header)
   → Status changes to plan='starter', status='active'
   
5. Use premium features
   → POST /api/generate {videoPath, clips}
   → Returns 402 if status != 'active'
   → Returns 200 + result if status = 'active'
```

---

## 📋 Status Values

| Status | Meaning | Can Use Premium? |
|--------|---------|-----------------|
| `locked` | Not subscribed | ❌ No (402) |
| `pending` | Payment received, awaiting activation | ❌ No (402) |
| `active` | Fully activated | ✅ Yes (200) |

| Plan | Price Range |
|------|------------|
| `free` | $0 | 
| `starter` | $9/mo |
| `creator` | $29/mo |
| `studio` | $99/mo |

---

## 🧪 Test Scenarios

### Automated Test
```bash
node scripts/test-soft-billing.mjs [--verbose]
```

### Manual Stripe Checkout
```bash
# 1. Create checkout session
curl -X POST http://localhost:3000/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"plan": "starter"}'

# Get the 'url' value, open in browser, use card 4242 4242 4242 4242
# Completes → /app/billing/success?session_id=cs_...
```

### Manual Activation (skips Stripe)
```bash
# Activate for testing
curl -X POST http://localhost:3000/api/billing/manual-activate \
  -H "x-admin-key: test-admin-key-local-dev-only-12345678" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "YOUR_USER_ID", "plan": "starter"}'
```

### Test Feature Gating
```bash
# When status='pending' (should fail with 402)
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{...}' 
# Response: 402 Payment Required

# After manual-activate (should succeed)
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{...}'
# Response: 200 OK + feature result
```

---

## 🐛 Debug Tools

### Browser Debug Panel (Dev Mode Only)
- Bottom-right corner: "🔧 Billing Debug"
- Buttons: Refresh, Activate, Reset
- Shows: plan, status, last update time

### Query Database Directly
```sql
-- Supabase SQL Editor
SELECT * FROM billing_status WHERE user_id = 'YOUR_USER_ID'

-- Check payment status
SELECT plan, status, updated_at FROM billing_status 
ORDER BY updated_at DESC LIMIT 5
```

### Check Server Status
```bash
curl http://localhost:3000/api/ping
# Response: {"ok": true, "ping": true, "time": "..."}

curl http://localhost:3000/api/health
# Response: Health info
```

---

## 🔧 Environment Variables

**To modify behavior, edit `.env.local`:**

```env
# Billing mode
BILLING_MODE=soft                              # soft or live
BILLING_TEST_AUTOACTIVATE=false               # auto-activate on payment
BILLING_TEST_ALLOW_MANUAL_ACTIVATE=true       # allow manual activation
BILLING_ADMIN_KEY=test-admin-key-local-dev-only-12345678

# Stripe test keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Price IDs for each plan
NEXT_PUBLIC_STRIPE_PRICE_STARTER=price_starter_test
NEXT_PUBLIC_STRIPE_PRICE_CREATOR=price_creator_test
NEXT_PUBLIC_STRIPE_PRICE_STUDIO=price_studio_test
```

---

## 🎯 Common Tasks

### Create Test User
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "confirmPassword": "TestPassword123!"
  }'
```

### Check Current Status
```bash
curl http://localhost:3000/api/billing/status \
  -b cookies.txt
```

### Manually Activate
```bash
curl -X POST http://localhost:3000/api/billing/manual-activate \
  -H "x-admin-key: test-admin-key-local-dev-only-12345678" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "abc123", "plan": "starter"}'
```

### Reset User to Free
```bash
curl -X POST http://localhost:3000/api/billing/reset \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

---

## 📊 Test Results Interpretation

```
✅ PASSED: Server is healthy
   → Server running on port 3000

✅ PASSED: User signup successful  
   → User created in Supabase auth

✅ PASSED: User login successful
   → Session cookie obtained

✅ PASSED: Default status is free/locked
   → Initial billing_status correct

✅ PASSED: Checkout session created
   → Got valid Stripe session

✅ PASSED: Session confirmed
   → Payment simulated, status=pending

✅ PASSED: Status is starter/pending
   → Database updated correctly

✅ PASSED: Manual activation successful
   → Admin endpoint working

✅ PASSED: Status is active
   → Final status correct

✅ ALL TESTS PASSED (100%)
   → Soft billing system is functional!
```

---

## 📖 Full Documentation

- **Complete testing guide**: [TEST_SOFT_BILLING_GUIDE.md](TEST_SOFT_BILLING_GUIDE.md)
- **Implementation checklist**: [SOFT_BILLING_IMPLEMENTATION_CHECKLIST.md](SOFT_BILLING_IMPLEMENTATION_CHECKLIST.md)
- **Original soft billing docs**: [SOFT_BILLING_TESTING.md](SOFT_BILLING_TESTING.md)

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| "Server is not running" | Run `npm run dev` |
| "Failed to fetch" during signup | Check Supabase env vars |
| Tests timeout | Server might still be starting |
| "Invalid admin key" | Copy exact key from `.env.local` |
| Billing status doesn't update | Check Supabase permissions |
| Feature gating returns 200 (wrong) | Status must be exactly 'active' |

---

## 🎬 Next Steps

1. ✅ **Verify**: `npm run dev` (server starts)
2. ✅ **Test**: `node scripts/test-soft-billing.mjs` (all pass)
3. ✅ **Inspect**: Use debug panel to verify status changes
4. ⏭️ **Integrate**: Test with real Stripe webhooks
5. ⏭️ **Deploy**: Switch to live mode when ready

---

**Last Updated**: Now  
**Maintainer**: Development Team  
**Status**: ✅ Ready for Testing
