# 🚀 AUTO-EDITOR DEPLOYMENT GUIDE

## Architecture Decision: Split Deployment

**Frontend + Light APIs:** Vercel  
**Video Processing Backend:** Railway/Render (FFmpeg-heavy)

### Why Split?
- `/api/analyze` and `/api/generate` use FFmpeg for video processing
- Vercel serverless functions have 10s execution limit (Hobby) / 60s (Pro)
- Video processing takes minutes, needs persistent storage, FFmpeg binaries
- Solution: Deploy rendering backend separately, keep Vercel for UI

---

## DEPLOYMENT STEPS

### 1. BUILD VERIFICATION ✅

```powershell
cd C:\Users\Quise\Downloads\auto-editor
npm run build
```

**Expected:** `✓ Compiled successfully`

---

### 2. INITIALIZE GIT & PUSH TO GITHUB

#### A. Initialize Git (if not done)

```powershell
cd C:\Users\Quise\Downloads\auto-editor
git init
git add .
git commit -m "Initial commit - ready for deployment"
git branch -M main
```

#### B. Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `auto-editor`
3. Description: "AI-powered video editor with retention-first editing"
4. **Private** (recommended if using API keys)
5. Click "Create repository"

#### C. Push to GitHub

```powershell
# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/auto-editor.git
git push -u origin main
```

---

### 3. DEPLOY FRONTEND TO VERCEL

#### A. Import Project

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub account
4. Find `auto-editor` and click "Import"
5. Configure project:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./` (leave default)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)
   - **Node Version:** 20.x

#### B. Environment Variables

Click "Environment Variables" and add:

**Required:**
```
SESSION_SECRET=<generate-random-32-char-string>
NEXT_PUBLIC_API_BASE_URL=https://auto-editor-backend.railway.app
```

**Optional (if using Stripe):**
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**To generate SESSION_SECRET (PowerShell):**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

#### C. Deploy

1. Click "Deploy"
2. Wait 2-3 minutes
3. Your site will be live at: `https://auto-editor-XXXXX.vercel.app`

#### D. Verify Frontend

Visit these pages:
- ✅ `https://your-site.vercel.app/` (Home)
- ✅ `https://your-site.vercel.app/pricing` (Pricing)
- ✅ `https://your-site.vercel.app/login` (Login)
- ✅ `https://your-site.vercel.app/api/health` (Returns `{"ok":true}`)

---

### 4. DEPLOY BACKEND TO RAILWAY (Video Processing)

#### A. Create Railway Account

1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project"

#### B. Deploy from GitHub

1. Click "Deploy from GitHub repo"
2. Select `auto-editor`
3. Railway will detect Next.js

#### C. Configure for Backend Mode

1. Go to **Settings** tab
2. Change **Start Command:**
   ```
   node server.js
   ```

3. Add **Environment Variables:**
   ```
   NODE_ENV=production
   SESSION_SECRET=<same-as-vercel>
   PORT=3000
   FFMPEG_PATH=/usr/bin/ffmpeg
   FFPROBE_PATH=/usr/bin/ffprobe
   ```

4. Install FFmpeg in Railway:
   - Go to **Settings** → **Service**
   - Add **Nixpacks Build** command:
     ```
     apt-get update && apt-get install -y ffmpeg
     ```

#### D. Get Backend URL

1. Go to **Settings** → **Domains**
2. Click "Generate Domain"
3. Copy URL: `https://auto-editor-backend-production.up.railway.app`

#### E. Update Vercel with Backend URL

1. Go back to Vercel → Your Project → **Settings** → **Environment Variables**
2. Update `NEXT_PUBLIC_API_BASE_URL` with Railway URL
3. Click "Redeploy" in Vercel

---

### 5. ALTERNATIVE: DEPLOY BACKEND TO RENDER

If you prefer Render over Railway:

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect GitHub repository
4. Configure:
   - **Name:** auto-editor-backend
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free (or Starter)
5. Add Environment Variables (same as Railway)
6. In **Settings** → **Environment**, add:
   ```
   Install FFmpeg: apt-get update && apt-get install -y ffmpeg
   ```

---

### 6. CREATE BACKEND SERVER (server.js)

Since the repo currently has API routes in Next.js, we need to extract the FFmpeg endpoints.

Create `server.js` in project root:

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'backend' });
});

// Import and mount existing API routes
// TODO: Extract /api/analyze and /api/generate logic here

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
```

**Note:** This requires refactoring to extract FFmpeg logic from Next.js API routes.

---

### 7. SPLIT DEPLOYMENT STRATEGY

#### Option A: Keep Everything on Vercel (Simpler, but limited)

**Pros:**
- Single deployment
- Auto-redeploy on git push

**Cons:**
- 60s max execution time (Pro plan)
- Limited for long videos
- Serverless = no persistent storage

**When to use:** Videos < 30 seconds, light editing

#### Option B: Split Frontend/Backend (Recommended)

**Pros:**
- No timeout limits
- Persistent storage for videos
- Can install FFmpeg binaries
- Better performance

**Cons:**
- Two deployments to manage
- Need to configure CORS

**When to use:** Production app with real video editing

---

### 8. CUSTOM DOMAIN (Optional)

#### On Vercel:

1. Go to **Settings** → **Domains**
2. Add your domain: `auto-editor.com`
3. Follow DNS configuration
4. Add CNAME: `cname.vercel-dns.com`

---

### 9. AUTO-DEPLOY ON GIT PUSH

**Already configured!**

Push to GitHub:
```powershell
git add .
git commit -m "Update feature"
git push
```

Vercel will automatically:
- Detect the push
- Run `npm run build`
- Deploy new version
- Take ~2 minutes

---

### 10. PRODUCTION CHECKLIST

- [ ] `/api/health` returns `{"ok":true}`
- [ ] Home page loads with dark background
- [ ] Pricing page displays plans
- [ ] Login/signup works
- [ ] Environment variables set in Vercel
- [ ] HTTPS enabled (automatic on Vercel)
- [ ] GitHub auto-deploy connected
- [ ] Backend deployed (if using split architecture)
- [ ] Test video upload works

---

### 11. MONITORING

**Vercel Dashboard:**
- View deployment logs
- Monitor function execution times
- Check error rates

**Railway/Render Dashboard:**
- CPU/Memory usage
- Request logs
- FFmpeg process monitoring

---

### 12. COST ESTIMATE

**Vercel Hobby (Free):**
- 100GB bandwidth/month
- Unlimited deploys
- Serverless functions (10s timeout)

**Vercel Pro ($20/mo):**
- 1TB bandwidth
- 60s function timeout
- Better for API-heavy apps

**Railway ($5/mo):**
- 500 hours/month
- No timeout limits
- Perfect for FFmpeg backend

**Render Free:**
- Spins down after 15 min inactivity
- Good for testing

---

## TROUBLESHOOTING

### Issue: Vercel build fails

```
Error: Cannot find module 'xyz'
```

**Fix:**
```powershell
rm -r node_modules
npm install
git add package-lock.json
git commit -m "Update dependencies"
git push
```

### Issue: API returns 500

**Check Vercel Logs:**
1. Go to Vercel Dashboard
2. Click deployment
3. View "Functions" tab
4. Check error details

### Issue: FFmpeg not found

**Solution:** Move to Railway/Render backend (see Step 4)

---

## NEXT STEPS

1. ✅ Verify build: `npm run build`
2. ✅ Initialize Git
3. ✅ Push to GitHub
4. ✅ Deploy to Vercel
5. ✅ Configure env vars
6. ⏳ (Optional) Deploy backend to Railway
7. ✅ Test production site

**Your live URL:** https://auto-editor-XXXXX.vercel.app

---

## SUPPORT

- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Railway Docs: https://docs.railway.app

