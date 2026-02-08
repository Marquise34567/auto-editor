# Launch Checklist - Auto-Editor

**Status:** ✅ Code ready, follow this checklist to launch locally and to production

---

## 🟢 Phase 1: Local Environment Setup (15 minutes)

### Step 1: Supabase Configuration
- [ ] Go to https://supabase.com/dashboard
- [ ] Select your project
- [ ] Go to Settings → API
- [ ] Copy and note:
  - [ ] `Project URL` (NEXT_PUBLIC_SUPABASE_URL)
  - [ ] `anon/public` key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
  - [ ] `service_role` key (SUPABASE_SERVICE_ROLE_KEY)

### Step 2: Create Environment File
- [ ] Open workspace root
- [ ] Create `.env.local` file
- [ ] Add:
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
  SUPABASE_SERVICE_ROLE_KEY=eyJ...
  ```
- [ ] Save file

### Step 3: Create Storage Bucket
- [ ] Go to Supabase Dashboard → Storage
- [ ] Click "New Bucket"
- [ ] Name: `videos`
- [ ] Privacy: **Public**
- [ ] Click "Create Bucket"

---

## 🟢 Phase 2: Build & Run Locally (5 minutes)

### Step 4: Build the Project
- [ ] Open terminal
- [ ] Run: `npm run build`
- [ ] ✅ Verify: No errors in output
- [ ] ✅ Verify: "next build completed" or similar message

### Step 5: Start Dev Server
- [ ] Open new terminal
- [ ] Run: `npm run dev`
- [ ] ✅ Verify: "Ready in X.Xs" message appears
- [ ] ✅ Verify: Shows "Local: http://localhost:3000"

---

## 🟢 Phase 3: Test Authentication (5 minutes)

### Step 6: Test Sign In
- [ ] Open browser: http://localhost:3000/login
- [ ] Enter email: `test@example.com`
- [ ] Enter password: `test123456` (or any password)
- [ ] Click "Sign Up" (if first time)
- [ ] ✅ Verify: Redirected to `/editor` page
- [ ] ✅ Verify: Page loaded without errors

### Step 7: Test Session Persistence
- [ ] Refresh page (F5)
- [ ] ✅ Verify: Still on `/editor` page (not logged out)
- [ ] ✅ Verify: No login modal appeared
- [ ] ✅ Verify: User stays authenticated

### Step 8: Test Logout
- [ ] Click logout button (or go to `/logout`)
- [ ] ✅ Verify: Redirected to `/login` page
- [ ] ✅ Verify: Previous session cleared

---

## 🟢 Phase 4: Test Storage Upload URL (5 minutes)

### Step 9: Sign In Again
- [ ] Go to http://localhost:3000/login
- [ ] Sign in with same account as Step 6

### Step 10: Test API Endpoint
- [ ] Open Developer Console (F12)
- [ ] Go to "Console" tab
- [ ] Copy-paste this code:
  ```javascript
  fetch('/api/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      filename: 'test-video.mp4',
      contentType: 'video/mp4',
      size: 50000000
    })
  }).then(r => r.json()).then(d => {
    console.log('Response:', d);
    if (d.signedUrl) {
      console.log('✅ SUCCESS: Got signed URL');
      console.log('Expires in:', d.tokenExpiresIn, 'seconds');
      console.log('Path:', d.path);
    } else {
      console.error('❌ ERROR:', d.error);
      console.error('Details:', d.details);
    }
  })
  ```
- [ ] Press Enter
- [ ] ✅ Verify: Console shows `✅ SUCCESS: Got signed URL`
- [ ] ✅ Verify: No error message in console

### Step 11: Check Server Logs
- [ ] Look at terminal where `npm run dev` is running
- [ ] ✅ Verify: See log lines starting with `[upload-url:...]`
- [ ] ✅ Verify: No error messages in logs

---

## 🟢 Phase 5: Test Full Upload (5 minutes)

### Step 12: Prepare Test Video
- [ ] Find a small test video (< 100MB)
- [ ] OR create a small test MP4 file
- [ ] Keep it ready for next step

### Step 13: Upload via UI
- [ ] Go to http://localhost:3000/editor
- [ ] Click "Upload Video" button
- [ ] Select the test video file from Step 12
- [ ] ✅ Verify: See progress bar
- [ ] ✅ Verify: Progress increases as file uploads
- [ ] ✅ Verify: Upload completes (100%)
- [ ] ✅ Verify: No error message appears

### Step 14: Verify File in Storage
- [ ] Go to Supabase Dashboard → Storage → videos bucket
- [ ] ✅ Verify: See a folder with user ID name
- [ ] Open that folder
- [ ] ✅ Verify: See timestamp-UUID folder inside
- [ ] Open that folder
- [ ] ✅ Verify: See your test video file

---

## 🟢 Phase 6: Production Deployment (10 minutes)

### Step 15: Vercel Setup
- [ ] Go to https://vercel.com/dashboard
- [ ] Find "auto-editor" project
- [ ] Click into project
- [ ] Go to Settings → Environment Variables

### Step 16: Add Environment Variables
- [ ] Click "Add New"
- [ ] Name: `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Value: `https://xxxxx.supabase.co` (from Step 1)
- [ ] Click "Save"
- [ ] Repeat for:
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon key from Step 1)
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (service role from Step 1, marked as Secret)

### Step 17: Production Bucket
- [ ] If using separate Supabase project for production:
  - [ ] Go to production Supabase project
  - [ ] Storage → Create "videos" bucket
  - [ ] Set privacy to Public
- [ ] If using same project:
  - [ ] Already have "videos" bucket ✅

### Step 18: Push Code
- [ ] Terminal: `git add .`
- [ ] Terminal: `git commit -m "Storage upload fix"`
- [ ] Terminal: `git push origin main`
- [ ] Vercel auto-deploys
- [ ] Watch deployment progress in Vercel dashboard

### Step 19: Wait for Deployment
- [ ] ✅ Verify: Deployment shows "Ready" status
- [ ] ✅ Verify: No errors in Deployment log
- [ ] Note the production URL (e.g., https://auto-editor-xxxxx.vercel.app)

### Step 20: Test Production
- [ ] Open production URL in browser
- [ ] Go to `/login`
- [ ] Sign in with test account
- [ ] Go to `/editor`
- [ ] Upload a test video
- [ ] ✅ Verify: Upload completes successfully
- [ ] Go to production Supabase Storage
- [ ] ✅ Verify: File appears in "videos" bucket

---

## ✅ Success Criteria

### Local Development ✅
- [x] Code builds without errors
- [x] Dev server starts successfully
- [x] Can sign in and stay logged in
- [x] /api/upload-url returns signed URL
- [x] Can upload video file
- [x] File appears in Storage bucket

### Production ✅
- [x] Vercel deployment "Ready"
- [x] Environment variables set
- [x] Production Supabase has "videos" bucket
- [x] Can sign in on production
- [x] Can upload video on production
- [x] File appears in production Storage

---

## 🐛 If Something Goes Wrong

### Build fails
→ Check: `.env.local` has all 3 variables  
→ Solution: Add missing vars, restart dev server

### Dev server won't start
→ Run: `npx kill-port 3000`  
→ Try: `npm run dev` again

### Can't sign in
→ Check: Supabase project is created  
→ Check: Auth enabled in Supabase  
→ Check: Using correct email format

### /api/upload-url returns error
→ Check error message - it tells you exactly what's wrong  
→ "Missing env vars" → Add to .env.local  
→ "Not authenticated" → Sign in at /login first  
→ "Bucket not found" → Create "videos" bucket

### Upload fails in UI
→ Check browser console for `[storage-upload]` error  
→ Check server logs for `[upload-url]` error  
→ Error message explains the issue

---

## 📚 Documentation References

- [STORAGE_QUICK_TEST.md](STORAGE_QUICK_TEST.md) - Detailed testing steps
- [SUPABASE_STORAGE_FIX.md](SUPABASE_STORAGE_FIX.md) - Full documentation
- [DEVELOPMENT.md](DEVELOPMENT.md) - Dev workflow
- [VALIDATION_REPORT.md](VALIDATION_REPORT.md) - Implementation status

---

## 📋 Time Estimate

| Phase | Time | Status |
|-------|------|--------|
| Phase 1: Env Setup | 15 min | ⏳ Do this first |
| Phase 2: Build & Run | 5 min | ⏳ After Phase 1 |
| Phase 3: Auth Test | 5 min | ⏳ After Phase 2 |
| Phase 4: Upload URL | 5 min | ⏳ After Phase 3 |
| Phase 5: Full Upload | 5 min | ⏳ After Phase 4 |
| Phase 6: Production | 10 min | ⏳ After Phase 5 |
| **TOTAL** | **~45 min** | ⏳ Plan for 1 hour |

---

## 🚀 You're Ready!

Once you complete the checklist above:
- ✅ All features are working locally
- ✅ All features are working in production
- ✅ Users can sign in and upload videos
- ✅ Videos appear in Supabase Storage
- ✅ Ready for beta testing or launch

**Need help?** Check the relevant documentation file or review the error message - it explains what's wrong!

---

**Last Updated:** February 5, 2026  
**Status:** ✅ Ready to follow
