# 📋 QUICK CHECKLIST - Print This

## ✅ Local Setup (30 min)

- [ ] Step 1: Create Supabase project (5 min)
  - Go to: https://supabase.com/dashboard
  - Click: New Project
  - Name: auto-editor
  - Wait: ~2 min for provisioning

- [ ] Step 2: Deploy schema (2 min)
  - Open supabase/schema.sql
  - Copy entire file
  - Supabase: SQL Editor → New Query → Paste → RUN

- [ ] Step 3: Get credentials (1 min)
  - Supabase: Settings → API
  - Copy: Project URL
  - Copy: Anon key
  - Copy: Service role key

- [ ] Step 4: Configure auth (2 min)
  - Supabase: Settings → Auth
  - Site URL: http://localhost:3000 (for testing)
  - Redirect URLs: Add http://localhost:3000/auth/callback

- [ ] Step 5: Create .env.local (2 min)
  - Open: .env.example
  - Create: .env.local (copy of .env.example)
  - Paste: Supabase credentials
  - Paste: Stripe keys (if you have them)

- [ ] Step 6: Start dev server (1 min)
  - Terminal: npm run dev
  - Browser: http://localhost:3000/login

- [ ] Step 7: Test signup (5 min)
  - Click: Sign Up
  - Email: test@example.com
  - Password: password123
  - Should redirect to: /editor ✓

- [ ] Step 8: Test checkout (5 min)
  - Go to: http://localhost:3000/pricing
  - Click: Subscribe (any plan)
  - Card: 4242 4242 4242 4242
  - Should redirect to: /billing/success ✓

---

## ✅ Production Deploy (30 min)

- [ ] Step 9: Update Supabase for production
  - Supabase: Settings → Auth
  - Site URL: https://autoeditor.app
  - Redirect URLs: Add https://autoeditor.app/auth/callback

- [ ] Step 10: Add to Vercel
  - Vercel: Settings → Environment Variables
  - Add all 13 variables (see QUICK_REFERENCE.md)
  - Mark Secret: SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY

- [ ] Step 11: Push to GitHub
  ```bash
  git add .
  git commit -m "feat: Add Supabase Auth + Stripe checkout"
  git push origin main
  ```

- [ ] Step 12: Test production
  - Wait: ~5 min for Vercel to deploy
  - Visit: https://autoeditor.app/login
  - Sign up: Should work ✓
  - Test checkout: Should work ✓

---

## ✅ Webhook Setup (Later - When Ready)

- [ ] Step 13: Create Stripe webhook
  - Stripe: Webhooks → Add Endpoint
  - URL: https://autoeditor.app/api/stripe/webhook
  - Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
  - Copy: Signing Secret

- [ ] Step 14: Add webhook secret to Vercel
  - STRIPE_WEBHOOK_SECRET: [paste signing secret]

- [ ] Step 15: Uncomment webhook code
  - File: src/app/api/stripe/webhook/route.ts
  - Uncomment: Reference implementation
  - Implement: Event handlers

- [ ] Step 16: Enable billing
  - Set: BILLING_WEBHOOKS_LIVE=true (in Vercel)
  - Subscriptions now enforce feature access

---

## 📚 Documentation Quick Reference

| Guide | Purpose | Read Time |
|-------|---------|-----------|
| [START_HERE.md](START_HERE.md) | First file to read | 1 min |
| [FIRST_STEPS.md](FIRST_STEPS.md) | Quick 8-step setup | 10 min |
| [README_IMPLEMENTATION.md](README_IMPLEMENTATION.md) | Complete overview | 10 min |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | Commands & links | 5 min |
| [SUPABASE_AUTH_STRIPE_SETUP.md](SUPABASE_AUTH_STRIPE_SETUP.md) | Detailed guide | 20 min |
| [GITHUB_PUSH_GUIDE.md](GITHUB_PUSH_GUIDE.md) | How to push code | 5 min |

---

## 🔑 Environment Variables (13 Total)

### For .env.local
```
NEXT_PUBLIC_SUPABASE_URL=[from Supabase API Settings]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[from Supabase API Settings]
SUPABASE_SERVICE_ROLE_KEY=[from Supabase API Settings]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[from Stripe API Keys - pk_test_]
STRIPE_SECRET_KEY=[from Stripe API Keys - sk_test_]
STRIPE_PRICE_STARTER=[from Stripe Products page]
STRIPE_PRICE_CREATOR=[from Stripe Products page]
STRIPE_PRICE_STUDIO=[from Stripe Products page]
NEXT_PUBLIC_SITE_URL=http://localhost:3000
BILLING_LIVE=false
BILLING_WEBHOOKS_LIVE=false
NODE_ENV=development
```

---

## 🆘 Troubleshooting

| Issue | Fix |
|-------|-----|
| "Cannot find .env.local" | Create it manually (copy from .env.example) |
| "Signup doesn't work" | Check Supabase schema deployed + credentials correct |
| "Checkout doesn't work" | Check Stripe keys (pk_test_, sk_test_) + prices exist |
| "/auth/callback fails" | Check Supabase Site URL + Redirect URLs |
| "Production deploy fails" | Check Vercel logs (Dashboard → Logs) |
| "Module not found" | Run: npm install, delete .next, npm run dev |

---

## 💻 Useful Commands

```bash
# Development
npm run dev                    # Start dev server (localhost:3000)

# Testing
curl -X GET http://localhost:3000/api/auth/me    # Check session

# Build
npm run build                  # Build for production
npm run build 2>&1 | grep -i error  # Check for errors

# Git
git status                     # See what changed
git add .                      # Stage all changes
git commit -m "message"        # Commit with message
git push origin main           # Push to GitHub
```

---

## ✅ Verification Steps

### Local (http://localhost:3000)
- [ ] Can sign up
- [ ] Profile created in Supabase
- [ ] Can log in
- [ ] Can access /editor
- [ ] Can start checkout
- [ ] Redirects to Stripe

### Production (https://autoeditor.app)
- [ ] Can sign up
- [ ] Can log in
- [ ] Can start checkout
- [ ] Redirects to Stripe

---

## 🎯 Success Criteria

You're done when:
1. Local signup works
2. Checkout redirects to Stripe
3. Production deploy succeeds
4. Production signup works

**All 4 = You're ready to go live!** 🚀

---

## 📞 Quick Links

### Dashboards
- Supabase: https://supabase.com/dashboard
- Stripe: https://dashboard.stripe.com
- Vercel: https://vercel.com/dashboard

### Docs (In This Repo)
- Quick start: [FIRST_STEPS.md](FIRST_STEPS.md)
- Full guide: [SUPABASE_AUTH_STRIPE_SETUP.md](SUPABASE_AUTH_STRIPE_SETUP.md)
- Troubleshooting: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

---

## ⏱️ Timeline

```
Local Setup:     30 min  ← Start here
Production:      30 min  ← After local works
Total to Live:   ~1 hour
Webhooks:        30 min  ← Optional, do later
```

---

## 🚀 Next Step

→ Read: [FIRST_STEPS.md](FIRST_STEPS.md)  
→ Follow: The 8 steps  
→ Test: Local signup  
→ Deploy: To Vercel  
→ Done!

---

**Print this page or bookmark it!** 📎
