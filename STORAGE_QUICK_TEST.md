# Storage Upload - Quick Test Guide

**Time estimate:** 5 minutes  
**Status:** Ready to test

---

## 🚀 Step 1: Verify Environment Variables

1. Open `.env.local` in workspace root
2. Confirm these lines exist:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

**Missing one?**
- Get from: https://supabase.com/dashboard → Settings → API
- Add it and save
- Restart dev server: `npm run dev` (in terminal)

---

## 📦 Step 2: Verify "videos" Bucket Exists

1. Go to: https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/storage
2. Look for bucket named **"videos"**
3. If not there:
   - Click "New Bucket"
   - Name: `videos`
   - Privacy: **Public**
   - Click "Create Bucket"

---

## 🏃 Step 3: Build & Start Dev Server

Terminal:
```powershell
npm run build    # Verify no TypeScript errors
npm run dev      # Start server on localhost:3000
```

Should see: `Ready in X.Xs`

---

## 🧪 Step 4: Test API Endpoint Directly

1. Go to: http://localhost:3000/login
2. Sign in with test account
3. Open Developer Console: **F12**
4. Copy-paste into **Console**:

```javascript
// Test /api/upload-url endpoint
fetch('/api/upload-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    filename: 'test-video.mp4',
    contentType: 'video/mp4',
    size: 50000000  // 50MB
  })
}).then(r => r.json()).then(d => {
  console.log('Response:', d);
  if (d.error) {
    console.error('ERROR:', d.error);
    console.error('Details:', d.details);
    if (d.missingEnv?.length) console.error('Missing env:', d.missingEnv.join(', '));
    if (d.bucketExists === false) console.error('Bucket does not exist!');
  } else {
    console.log('✓ Signed URL:', d.signedUrl.substring(0, 100) + '...');
    console.log('✓ Path:', d.path);
    console.log('✓ Expires in:', d.tokenExpiresIn, 'seconds');
  }
})
```

**Expected output on success:**
```
Response: {
  signedUrl: "https://project.supabase.co/storage/v1/upload/sign/videos/...",
  path: "user-uuid/timestamp-uuid/test-video.mp4",
  tokenExpiresIn: 3600
}
✓ Signed URL: https://project.supabase.co/storage/v1/upload/sign/videos/...
✓ Path: user-uuid/1707123456789-abc12345/test-video.mp4
✓ Expires in: 3600 seconds
```

**If you see an error:**
- Check the "Details" field - it says exactly what's wrong
- "Missing env: SUPABASE_SERVICE_ROLE_KEY" → Add to .env.local
- "Bucket 'videos' not found" → Create bucket in Supabase
- "Not authenticated" → Sign in first

---

## 🎬 Step 5: Upload via UI

1. Go to: http://localhost:3000/editor
2. Click **"Upload Video"** button
3. Select a small test video (< 100MB, any format)
4. Watch console for logs:
   ```
   [storage-upload] Uploading file: myfile.mp4 (45.32MB)
   [storage-upload] Requesting signed URL from /api/upload-url...
   [storage-upload] ✓ Got signed URL, expires in 3600s
   [storage-upload] Starting file upload...
   [storage-upload] ✓ Upload complete
   ```
5. Progress bar shows upload %
6. Should complete in seconds (depends on file size + internet)

---

## ✅ Step 6: Verify in Storage

1. Go to: https://supabase.com/dashboard → Storage → videos
2. You should see a folder: **{your-user-uuid}**
3. Inside: **{timestamp}-{uuid}** folder
4. Inside: **your-filename.mp4**

If you see it → **Congratulations!** Storage upload works! 🎉

---

## 🚨 Common Issues

| Issue | Fix |
|-------|-----|
| "Missing env vars" | Add all 3 to `.env.local`, restart server |
| "Bucket 'videos' not found" | Create "videos" bucket in Supabase Storage |
| "Not authenticated" | Go to /login first, sign in |
| "Invalid content type" | Upload must be a video file (video/mp4, etc) |
| "File too large" | Max is 2GB |
| Upload just sits there | Check network tab in DevTools (Network tab) |
| Upload fails mid-way | Try smaller file, check internet connection |

---

## 🔍 Debugging: Check Server Logs

In terminal where `npm run dev` is running, look for:

```
[upload-url:uuid] POST /api/upload-url started
[upload-url:uuid] Authenticating user...
[upload-url:uuid] User authenticated: user-uuid
[upload-url:uuid] Parsing request body...
[upload-url:uuid] Creating admin client...
[upload-url:uuid] Checking bucket 'videos'...
[upload-url:uuid] Bucket 'videos' exists: true
[upload-url:uuid] Generating storage path...
[upload-url:uuid] Storage path: user-uuid/1707123456789-abc/filename.mp4
[upload-url:uuid] Creating signed upload URL...
[upload-url:uuid] ✓ Signed URL created successfully
```

If you see an error line, that's where the problem is.

---

## 📋 Success Criteria

- [ ] `npm run build` completes with no errors
- [ ] `npm run dev` starts and says "Ready in X.Xs"
- [ ] Can sign in at /login
- [ ] /api/upload-url returns `{ signedUrl, path, tokenExpiresIn }`
- [ ] Can upload video from /editor
- [ ] File appears in Supabase Storage dashboard

Once all ✅, storage uploads are ready for production!

---

## Next Steps

1. **If all tests pass:** Ready to merge/deploy
2. **If any test fails:** Check the error message in console/logs, see SUPABASE_STORAGE_FIX.md troubleshooting section
3. **For production:** Make sure Vercel has the 3 env vars set
