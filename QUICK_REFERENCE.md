# 🚀 Quick Reference - Commands & Links

## ⚡ SUPER QUICK START

**Start development right now:**
```bash
# Option 1: VS Code (Recommended)
Ctrl+Shift+B  →  Select "Dev Server"  →  Open http://localhost:3000

# Option 2: Terminal
npm run dev
```

---

## 🎯 Most Important Commands

### Development (Ctrl+Shift+B)
| Task | Keyboard | What it does |
|------|----------|---|
| **Dev Server** | `Ctrl+Shift+B` | Start with hot reload |
| **Build** | `Ctrl+Shift+B` | Production build |
| **Lint** | `Ctrl+Shift+B` | Check code quality |

### Testing Auth (Ctrl+Shift+T)
| Task | Do This | Details |
|------|---------|---------|
| **Signup** | `Ctrl+Shift+T` | Create test user |
| **Login** | `Ctrl+Shift+T` | Sign in |
| **Get User** | `Ctrl+Shift+T` | Fetch session |
| **Logout** | `Ctrl+Shift+T` | Sign out |

### Via Terminal
```bash
# Test signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"test123","confirmPassword":"test123"}'

# Test get user (should work with cookies!)
curl http://localhost:3000/api/auth/me -b cookies.txt

# Test logout
curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt
```

---

## 🔐 NEW: Supabase Auth SSR Fix

**IMPLEMENTED:** Session cookies now work! `/api/auth/me` returns 200 when logged in

- ✅ Browser sends cookies to API routes
- ✅ Server properly returns Set-Cookie headers  
- ✅ Sessions persist across page refreshes
- ✅ All API routes tested and working

**Quick Test:**
1. Sign in at http://localhost:3000
2. Check DevTools → Application → Cookies → See `sb-*-auth-token`
3. Refresh page - stay logged in ✓
4. Call `/api/auth/me` in console - returns user ✓

**Documentation:**
- Read: `SUPABASE_AUTH_SSR_FIX.md` (complete guide)
- Quick: `DEVELOPMENT.md` (workflow guide)

---

## Terminal Commands

### Development
```bash
# Start dev server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server (after build)
npm start

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

### Documentation (Read These)
```
SUPABASE_AUTH_SSR_FIX.md         ← Complete auth guide (NEW!)
DEVELOPMENT.md                    ← Dev workflow guide (NEW!)
IMPLEMENTATION_STATUS.md          ← What's been completed (NEW!)
SUPABASE_AUTH_STRIPE_SETUP.md    ← Full integration guide
IMPLEMENTATION_CHECKLIST.md      ← Task checklist + timeline
GITHUB_PUSH_GUIDE.md             ← How to push to GitHub
```

### VS Code Config (Already Set Up)
```
.vscode/tasks.json               ← 8 development tasks
.vscode/launch.json              ← Debugger config
.vscode/settings.json            ← Editor settings
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
src/lib/supabase/server.ts                 ← Server client (FIXED!)
src/lib/supabase/client.ts                 ← Browser client
src/lib/auth.ts                            ← Auth helpers
src/app/auth/callback/route.ts             ← OAuth callback
src/app/api/auth/login/route.ts            ← Login endpoint
src/app/api/auth/signup/route.ts           ← Signup endpoint
src/app/api/auth/logout/route.ts           ← Logout endpoint
src/app/api/auth/me/route.ts               ← Session endpoint (FIXED!)
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

### 🟢 NEW: Sessions Not Persisting? (Auth Fix)
- ✅ FIXED: Browser now sends cookies to /api/auth/me
- ✅ READ: `SUPABASE_AUTH_SSR_FIX.md` for complete guide
- ✅ TEST: Use tasks (Ctrl+Shift+T) to verify auth flow

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
SUPABASE_AUTH_SSR_FIX.md          (Complete Auth Guide - 500+ lines)
├── Problem & Solution
├── All Code Files (7 files)
├── Testing Instructions
├── Supabase Dashboard Config
└── Troubleshooting

DEVELOPMENT.md                    (Workflow Guide - 400+ lines)
├── Quick Start
├── VS Code Tasks Usage
├── Manual Testing
├── Debugging Instructions
└── Common Tasks

IMPLEMENTATION_STATUS.md          (Completion Summary)
├── Deliverables Checklist
├── Files Changed/Created
├── Security Features
├── Available Commands
└── Quality Checklist

SUPABASE_AUTH_STRIPE_SETUP.md     (Full Integration Guide)
├── Part 1: Supabase Setup (6 steps)
├── Part 2: Local Testing (with test flow)
├── Part 3: Stripe Integration (verify products)
├── Part 4: Vercel Deployment (13 env vars)
├── Testing Checklist (12 items)
├── Troubleshooting (5 issues)
└── Webhook Setup (for later)

IMPLEMENTATION_CHECKLIST.md       (This Week's Tasks)
├── Code Implementation (✅ Done)
├── What's Left (For You)
├── Files You Need to Edit
├── Environment Variables Reference
└── Testing Checklist

GITHUB_PUSH_GUIDE.md              (How to Push Code)
├── Quick Commands
├── Detailed Steps
├── File Summary
└── Troubleshooting
```

---

## ✨ Key Callouts

🟢 **FIXED**: Session cookies now work! Browser sends auth to /api/auth/me

🔴 **CRITICAL**: Create .env.local before running `npm run dev` (or you'll get auth errors)

🟡 **IMPORTANT**: Add environment variables to Vercel BEFORE deploying (or production will fail)

🟢 **GOOD**: Test locally first before pushing to GitHub/Vercel

---

## 🆘 Get Help

1. **Auth issue?** Check `SUPABASE_AUTH_SSR_FIX.md` (complete guide)
2. **Dev workflow?** Check `DEVELOPMENT.md` (step-by-step)
3. **Stuck?** Search for your error in any guide's troubleshooting section
4. **Browser console**: F12 → Console tab (look for red errors)
5. **Server logs**: npm run dev output (scroll up for initial errors)
6. **Vercel logs**: Dashboard → Deployments → Latest → Logs

---

**Ready to start?** 👉 Run `npm run dev` or press `Ctrl+Shift+B` → "Dev Server"


