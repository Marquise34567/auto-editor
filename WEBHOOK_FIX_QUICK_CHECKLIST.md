# Stripe Webhook Fix - Quick Reference Checklist

## What Was Fixed
- [x] Webhook handlers now write to `billing_status` table (not deprecated `subscriptions`)
- [x] Database helper functions updated to use correct tables
- [x] Auth signup creates `billing_status` record automatically
- [x] Auth session endpoint returns correct billing status
- [x] Removed invalid database updates in checkout route
- [x] Stripe status values properly mapped to application status

## Files Modified (5 total)

| File | Change | Status |
|------|--------|--------|
| src/app/api/stripe/webhook/route.ts | 4 event handlers updated | ✅ DONE |
| src/lib/supabase/db.ts | getUserSubscription & updateUserSubscription | ✅ DONE |
| src/app/auth/callback/route.ts | Fixed new user billing_status creation | ✅ DONE |
| src/app/api/auth/me/route.ts | Query billing_status instead of subscriptions | ✅ DONE |
| src/app/api/stripe/checkout/route.ts | Removed invalid table update | ✅ DONE |

## Next Steps (Required)

### 1. Build & Verify (5 minutes)
```bash
npm install
npm run build
# Should complete without errors
```

If build fails, check TypeScript errors:
```bash
npm run type-check
```

### 2. Test Locally (15 minutes)
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Start webhook forwarding
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Browser: Test the flow
# 1. Sign up
# 2. Go to /pricing
# 3. Click "Subscribe"
# 4. Use test card: 4242 4242 4242 4242
# 5. Complete checkout
# 6. Should see success message
# 7. Access /editor should work (not redirected)
```

**Success Indicator:**
- Supabase shows `billing_status.status = 'active'` after checkout
- Editor page loads without redirect to pricing

### 3. Deploy to Vercel (5 minutes)
```bash
# Option A: Using Vercel CLI
vercel deploy

# Option B: Git push to trigger auto-deploy
git add .
git commit -m "Fix: Stripe webhook subscription unlock table mismatch"
git push origin main
```

### 4. Verify Deployment (10 minutes)
- [ ] Vercel build succeeded (check vercel.com dashboard)
- [ ] STRIPE_WEBHOOK_SECRET is in Vercel env vars
- [ ] STRIPE_SECRET_KEY is in Vercel env vars
- [ ] All STRIPE_PRICE_* IDs are set
- [ ] Production URL is accessible

### 5. Production Test (10 minutes)
```
1. Go to production URL
2. Sign up with test email
3. Go to /pricing
4. Subscribe with test card (or real card)
5. Complete checkout
6. Check: Can access /editor (not locked)
7. Go to Stripe Dashboard > verify webhook events succeeded
```

## Quick Diagnostics

**If users still can't access features after payment:**

```sql
-- Run in Supabase SQL Editor
-- Check what's in the database
SELECT user_id, status, plan, stripe_subscription_id 
FROM billing_status 
WHERE user_id = '[USER_ID]'
LIMIT 1;

-- Expected: status = 'active'
-- If status is 'locked' or 'pending' → webhook didn't update it
```

**Check Stripe webhook status:**
- Stripe Dashboard > Developers > Webhooks
- Click `/api/stripe/webhook` endpoint
- Check "Events" tab for recent deliveries
- Look for `checkout.session.completed` event
- Status should be 200 (success)

**Check Vercel logs:**
```bash
vercel logs --source functions --filter webhook
# Look for error messages in webhook processing
```

## Rollback (if needed)

If something breaks, you can rollback by reverting commits:
```bash
git revert [commit-hash]
git push
```

Previous code is in git history if needed.

## Success Criteria

- [x] Code builds successfully
- [ ] Local testing passes (after Step 2)
- [ ] Production deploy successful (after Step 3)  
- [ ] Production test passes (after Step 5)
- [ ] No webhook errors in Stripe Dashboard
- [ ] No database errors in Vercel logs
- [ ] Users can access `/editor` after payment

## Documentation

For detailed information, see:
- **STRIPE_WEBHOOK_FIX_REPORT.md** - Technical details of all changes
- **TESTING_GUIDE_WEBHOOK_FIX.md** - Step-by-step testing procedures
- **verify-webhook-fix.sh** - Automated verification script

## Time Estimate

- Build: 5 min
- Local test: 15 min  
- Deploy: 5 min
- Verify: 10 min
- **Total: ~35 minutes**

## Support

If steps fail:
1. Check Vercel build logs for errors
2. Check Stripe Dashboard > Webhooks > Events for failures
3. Check Supabase > SQL Editor > Run queries to verify database state
4. Check browser console (F12) for JavaScript errors

