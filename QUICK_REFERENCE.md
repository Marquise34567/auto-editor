# 🚀 Quick Reference - Commands & Links

## Terminal Commands

### Development
```bash
# Start dev server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server (after build)
npm run start

# Check build errors
npm run build 2>&1 | grep -i error
```

### Git / GitHub
```bash
# Check what changed
git status

# See differences
git diff

# Stage changes
git add .

# Commit changes
git commit -m "feat: Add Supabase Auth + Stripe checkout integration"

# Push to GitHub
git push origin main

# View recent commits
git log --oneline -10
```

### Testing
```bash
# Test local signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test local login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Check session
curl -X GET http://localhost:3000/api/auth/me

# Test checkout endpoint
curl -X POST http://localhost:3000/api/stripe/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-auth-cookie>" \
  -d '{"plan":"starter"}'
```

---

## 🔗 Links to Dashboards

### Supabase
- **Dashboard**: https://supabase.com/dashboard
- **Your Project**: https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]
- **SQL Editor**: https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/sql
- **Auth Settings**: https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/settings/auth
- **API Keys**: https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/settings/api
- **Database**: https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/editor

### Stripe
- **Dashboard**: https://dashboard.stripe.com
- **Products**: https://dashboard.stripe.com/products
- **Customers**: https://dashboard.stripe.com/customers
- **Webhooks**: https://dashboard.stripe.com/webhooks
- **API Keys**: https://dashboard.stripe.com/apikeys
- **Test Data**: https://dashboard.stripe.com/test/data

### Vercel
- **Dashboard**: https://vercel.com/dashboard
- **auto-editor Project**: https://vercel.com/dashboard/auto-editor
- **Environment Vars**: https://vercel.com/dashboard/auto-editor/settings/environment-variables
- **Deployments**: https://vercel.com/dashboard/auto-editor/deployments
- **Logs**: https://vercel.com/dashboard/auto-editor/logs

### GitHub
- **Repository**: https://github.com/[YOUR_USERNAME]/auto-editor
- **Commits**: https://github.com/[YOUR_USERNAME]/auto-editor/commits/main
- **Settings**: https://github.com/[YOUR_USERNAME]/auto-editor/settings

---

## 📝 File Locations

### Setup Guides (Start Here)
```
SUPABASE_AUTH_STRIPE_SETUP.md    ← Complete step-by-step guide
IMPLEMENTATION_CHECKLIST.md      ← Task checklist + timeline
GITHUB_PUSH_GUIDE.md             ← How to push to GitHub
```

### Configuration Files (Edit/Review)
```
.env.example                     ← Template for local variables
.env.local                       ← Create this locally (copy from .env.example)
supabase/schema.sql              ← Database schema (deploy to Supabase)
```

### Code Files (All Complete)
```
middleware.ts                              ← Route protection
src/lib/supabaseClient.ts                  ← Browser client
src/lib/supabaseServer.ts                  ← Server client
src/lib/auth.ts                            ← Auth helpers
src/app/auth/callback/route.ts             ← OAuth callback
src/app/api/auth/login/route.ts            ← Login endpoint
src/app/api/auth/signup/route.ts           ← Signup endpoint
src/app/api/auth/logout/route.ts           ← Logout endpoint
src/app/api/auth/me/route.ts               ← Session endpoint
src/app/api/stripe/checkout/route.ts       ← Checkout endpoint
src/app/api/stripe/webhook/route.ts        ← Webhook placeholder
```

---

## 🔐 Environment Variables

### For Local Testing (.env.local)
```bash
# Supabase (from Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Supabase Service Role (Secret - never share)
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe (from API Keys page)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Stripe Prices (from Products → Price ID)
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_CREATOR=price_...
STRIPE_PRICE_STUDIO=price_...

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Flags
BILLING_LIVE=false
BILLING_WEBHOOKS_LIVE=false
```

### For Vercel (Same 13 Variables)
```
Settings → Environment Variables → Add each above (mark Secret vs Public)
```

---

## 🧪 Quick Test Sequence

### 1. Local Signup Test
```bash
npm run dev
# Open: http://localhost:3000/login
# Click "Sign Up"
# Email: test@example.com
# Password: password123
# Should redirect to /editor
```

### 2. Verify in Supabase
```bash
# Go to: https://supabase.com/dashboard/project/[ID]/sql
# Run: SELECT * FROM profiles;
# Should see test@example.com row
```

### 3. Local Checkout Test
```bash
# Open: http://localhost:3000/pricing
# Click "Subscribe" on any plan
# Redirects to Stripe test checkout
# Card: 4242 4242 4242 4242
# Expiry: Any future date (e.g., 12/25)
# CVC: Any 3 digits (e.g., 123)
# Click Pay
# Should redirect to /billing/success
```

### 4. Verify in Stripe
```bash
# Go to: https://dashboard.stripe.com/test/customers
# Should see test@example.com customer created
# Check subscription status
```

---

## 🚀 Deploy to Production (30 min total)

### Step 1: Supabase Setup (5 min)
```
1. https://supabase.com/dashboard → New Project
2. Wait for provisioning (~2 min)
3. https://supabase.com/dashboard/project/[ID]/sql → Paste supabase/schema.sql
4. Click RUN
5. https://supabase.com/dashboard/project/[ID]/settings/api → Copy 3 keys
```

### Step 2: Local Testing (10 min)
```
1. Create .env.local (copy template from .env.example)
2. Paste Supabase keys
3. Paste Stripe keys
4. npm run dev
5. Test signup + checkout (see Quick Test Sequence above)
```

### Step 3: Vercel Setup (5 min)
```
1. https://vercel.com/dashboard/auto-editor/settings/environment-variables
2. Add 13 variables (copy from .env.local, mark Secret)
3. Redeploy or push to GitHub (auto-redeploy)
```

### Step 4: GitHub Push (1 min)
```bash
git add .
git commit -m "feat: Add Supabase Auth + Stripe checkout"
git push origin main
# Vercel auto-deploys on push
```

### Step 5: Test Production (5 min)
```
1. https://autoeditor.app/login
2. Sign up
3. Try checkout
4. Verify everything works
```

---

## 🔧 Troubleshooting Quick Links

### Can't Login Locally?
- Check: Is .env.local created with SUPABASE keys?
- Check: Did Supabase schema deploy? (See supabase/schema.sql)
- Check: Is npm run dev running? (port 3000 open?)

### Stripe Checkout Not Working?
- Check: STRIPE_PRICE_* vars in .env.local?
- Check: Do products exist in Stripe Dashboard?
- Check: Is NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY correct?

### Redirect to /auth/callback Fails?
- Check: Is Site URL in Supabase Auth Settings set to localhost:3000 (local) or autoeditor.app (prod)?
- Check: Are Redirect URLs correct? (http://localhost:3000/auth/callback for local)

### Build Errors?
- Run: npm run build 2>&1 | grep -i error
- Check file: middleware.ts (most common issue)
- Check: All new files created in right locations?

### Routes Not Protected?
- Check: middleware.ts in project root (not in src/)
- Check: Is npm run dev restarted after adding middleware?
- Check: Test URL: http://localhost:3000/editor (should redirect to login)

---

## 📚 Documentation Structure

```
SUPABASE_AUTH_STRIPE_SETUP.md (Main Guide - Start Here)
├── Part 1: Supabase Setup (6 steps)
├── Part 2: Local Testing (with test flow)
├── Part 3: Stripe Integration (verify products)
├── Part 4: Vercel Deployment (13 env vars)
├── Testing Checklist (12 items)
├── Troubleshooting (5 issues)
└── Webhook Setup (for later)

IMPLEMENTATION_CHECKLIST.md (This Week's Tasks)
├── Code Implementation (✅ Done)
├── What's Left (For You)
├── Files You Need to Edit
├── Environment Variables Reference
└── Testing Checklist

GITHUB_PUSH_GUIDE.md (How to Push Code)
├── Quick Commands
├── Detailed Steps
├── File Summary
└── Troubleshooting
```

---

## ✨ Key Callouts

🔴 **CRITICAL**: Create .env.local before running `npm run dev` (or you'll get auth errors)

🟡 **IMPORTANT**: Add environment variables to Vercel BEFORE deploying (or production will fail)

🟢 **GOOD**: Test locally first before pushing to GitHub/Vercel

---

## 🆘 Get Help

1. **Check SUPABASE_AUTH_STRIPE_SETUP.md** (answers 90% of questions)
2. **Search error message** in setup guide troubleshooting section
3. **Check Vercel logs**: Vercel Dashboard → Deployments → Latest → Logs
4. **Check browser console**: F12 → Console tab (look for red errors)
5. **Check terminal**: npm run dev output (scroll up for initial errors)

---

**Ready to start?** 👉 Open `SUPABASE_AUTH_STRIPE_SETUP.md` and follow Part 1 (Supabase Setup)
