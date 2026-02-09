# 🚀 EXACT DEPLOYMENT STEPS FOR WINDOWS

## ✅ PRE-FLIGHT STATUS

- **Build:** ✅ Compiled successfully
- **Health Endpoint:** ✅ /api/health exists
- **Error Handling:** ✅ ErrorBoundary + error.tsx
- **Git:** ✅ Initialized and staged
- **FFmpeg Detection:** ⚠️ Heavy processing in /api/analyze and /api/generate

---

## 📋 STEP-BY-STEP INSTRUCTIONS

### STEP 1: CONFIGURE GIT (One-time setup)

Open PowerShell and run:

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

**Replace with your actual name and email!**

---

### STEP 2: COMMIT AND PREPARE FOR PUSH

```powershell
cd C:\Users\Quise\Downloads\auto-editor

# Commit
git commit -m "Initial commit - production ready"

# Rename branch to main
git branch -M main

# Verify status
git status
```

**Expected:** "On branch main, nothing to commit, working tree clean"

---

### STEP 3: CREATE GITHUB REPOSITORY

#### A. Go to GitHub:

1. Open browser: https://github.com/new
2. **Repository name:** `auto-editor`
3. **Description:** `AI-powered video editor with retention-first editing`
4. **Visibility:** 
   - Choose **Private** if you have API keys/secrets
   - Choose **Public** if open source
5. ⚠️ **DO NOT** check "Add README" or ".gitignore" (you already have these)
6. Click **"Create repository"**

#### B. Copy the repository URL

GitHub will show you something like:
```
https://github.com/YOUR_USERNAME/auto-editor.git
```

**Copy this URL!**

---

### STEP 4: PUSH TO GITHUB

In PowerShell (still in `C:\Users\Quise\Downloads\auto-editor`):

```powershell
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/auto-editor.git

# Push to GitHub
git push -u origin main
```

**Expected:** "Branch 'main' set up to track remote branch 'main' from 'origin'"

If prompted for credentials:
- **Username:** Your GitHub username
- **Password:** Use a Personal Access Token (not your GitHub password)
  - Get token: https://github.com/settings/tokens/new
  - Select "repo" scope
  - Copy token and paste as password

---

### STEP 5: DEPLOY TO VERCEL (FRONTEND)

#### A. Go to Vercel

1. Open: https://vercel.com/signup
2. Click **"Continue with GitHub"**
3. Authorize Vercel to access your GitHub

#### B. Import Project

1. Go to: https://vercel.com/new
2. Click **"Import Git Repository"**
3. Find `auto-editor` in the list
4. Click **"Import"**

#### C. Configure Project

**Framework Preset:** Next.js (auto-detected)  
**Root Directory:** `./` (leave default)  
**Build Command:** `npm run build` (default)  
**Output Directory:** `.next` (default)  
**Install Command:** `npm install` (default)

#### D. Add Environment Variables

Click **"Environment Variables"** dropdown.

**For Development/Testing:**

| Name | Value |
|------|-------|
| `SESSION_SECRET` | `your-random-32-char-string` |
| `NODE_ENV` | `production` |

**Generate SESSION_SECRET (PowerShell):**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

Copy the output and paste as `SESSION_SECRET` value.

**If you have Stripe credentials:**

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` |
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |

**If you plan to use separate backend later:**

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_API_BASE_URL` | Leave empty for now |

#### E. Deploy!

1. Click **"Deploy"** button
2. Wait 2-3 minutes (watch the build logs)
3. ✅ You'll see "Congratulations!" when done

#### F. Get Your Live URL

Vercel will show you:
```
https://auto-editor-xxxxx.vercel.app
```

**Copy this URL!**

---

### STEP 6: VERIFY DEPLOYMENT

Open these URLs in your browser:

1. **Home:** `https://your-site.vercel.app/`
   - Should show dark background, logo, pricing link
   
2. **Pricing:** `https://your-site.vercel.app/pricing`
   - Should show 4 plans with dark background

3. **Login:** `https://your-site.vercel.app/login`
   - Should show login form

4. **Health API:** `https://your-site.vercel.app/api/health`
   - Should return: `{"ok":true,"timestamp":"...","version":"1.0.0"}`

✅ If all 4 work, **YOU ARE LIVE!**

---

### STEP 7: AUTO-DEPLOY SETUP (ALREADY DONE!)

**GitHub → Vercel connection is automatic.**

From now on:

```powershell
# Make changes to your code
git add .
git commit -m "Update feature X"
git push
```

Vercel will automatically:
- Detect the push
- Build your app
- Deploy new version
- Give you a preview URL

---

## ⚠️ IMPORTANT: FFmpeg LIMITATION

**Current Status:** Everything is deployed to Vercel.

**Problem:** `/api/analyze` and `/api/generate` use FFmpeg for video processing.

**Vercel Limitations:**
- **Hobby plan:** 10 second timeout
- **Pro plan:** 60 second timeout
- No FFmpeg binaries installed
- No persistent file storage

**What this means:**
- ✅ UI works perfectly
- ✅ Login/signup works
- ✅ Pricing/billing works
- ❌ Video upload/analysis will timeout
- ❌ Video generation will fail

---

## 🔧 SOLUTION: SPLIT BACKEND (OPTIONAL, DO LATER)

**When you're ready to process real videos:**

1. Deploy backend to Railway/Render
2. Install FFmpeg there
3. Point Vercel frontend to backend URL
4. Videos process with no limits

**For now:** Test the UI and basic flows!

---

## 📊 WHAT'S DEPLOYED

### ✅ Working on Vercel:

- **All pages:**
  - `/` - Home (landing page)
  - `/pricing` - Pricing plans
  - `/login` - Authentication
  - `/editor` - Video editor UI
  - `/checkout` - Subscription checkout
  - `/billing/success` - Payment confirmation

- **All lightweight APIs:**
  - `/api/health` - Health check
  - `/api/auth/*` - Login/signup/logout
  - `/api/billing/*` - Checkout/status/webhook
  - `/api/preferences` - User settings
  - `/api/ping` - Server ping

### ⏳ Not Yet Working (needs backend):

- `/api/analyze` - Video analysis (FFmpeg)
- `/api/generate` - Video generation (FFmpeg)
- `/api/video` - Video uploads

---

## 🎯 NEXT STEPS

### Immediate (Test Your Site):

1. ✅ Visit your Vercel URL
2. ✅ Click around all pages
3. ✅ Test login/signup flow
4. ✅ View pricing page
5. ✅ Check `/api/health` endpoint

### Later (When Ready for Videos):

1. Deploy backend to Railway
2. Install FFmpeg in backend
3. Configure CORS
4. Update `NEXT_PUBLIC_API_BASE_URL` in Vercel
5. Test video processing

---

## 🆘 TROUBLESHOOTING

### Issue: "git push" asks for password repeatedly

**Fix:** Set up SSH keys or use GitHub CLI

**GitHub CLI (easiest):**
```powershell
# Install GitHub CLI
winget install GitHub.cli

# Authenticate
gh auth login

# Push without password
git push
```

### Issue: Vercel build fails

**Check build logs in Vercel dashboard:**
1. Go to your project
2. Click "Deployments"
3. Click failed deployment
4. View logs

**Common fixes:**
```powershell
# Locally verify build works
npm run build

# If it fails, fix errors and push again
git add .
git commit -m "Fix build errors"
git push
```

### Issue: Page shows white screen

**Solution:** Already fixed! `globals.css` was updated to remove body background.

### Issue: API returns 500 error

**Check Vercel function logs:**
1. Vercel Dashboard → Project
2. Click "Functions" tab
3. View error details

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Git configured (name, email)
- [ ] Code committed to Git
- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] Environment variables added
- [ ] Vercel deployment succeeded
- [ ] Home page loads
- [ ] Pricing page loads
- [ ] Login page loads
- [ ] `/api/health` returns JSON
- [ ] Dark theme displays correctly

---

## 🔗 USEFUL LINKS

- **Your GitHub Repo:** https://github.com/YOUR_USERNAME/auto-editor
- **Your Live Site:** https://auto-editor-xxxxx.vercel.app
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Vercel Docs:** https://vercel.com/docs
- **Next.js Deployment:** https://nextjs.org/docs/deployment

---

## 💰 COST SUMMARY

**Current Setup (Free):**
- GitHub: $0 (unlimited public repos)
- Vercel Hobby: $0 (100GB bandwidth/month)
- **Total: $0/month**

**When You Need Video Processing:**
- Railway: $5/month (500 execution hours)
- **or** Render: $7/month (persistent backend)
- **Total: $5-7/month**

---

## 🎉 YOU'RE LIVE!

Your auto-editor is now deployed and accessible worldwide!

**Share your site:**
```
https://auto-editor-xxxxx.vercel.app
```

Any code changes you push to GitHub will automatically deploy to Vercel within 2-3 minutes.

