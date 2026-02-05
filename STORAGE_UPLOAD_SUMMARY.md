# Quick Reference - Storage Upload Fix

**Completed:** February 5, 2026  
**Status:** Code ready, needs testing

---

## 🎯 What Was Done

Fixed `/api/upload-url` to return detailed diagnostics + valid signed upload URLs.

---

## 🧪 Quick Test

```bash
# 1. Make sure .env.local has all 3 Supabase vars
# 2. Create "videos" bucket in Supabase Storage  
# 3. npm run build && npm run dev
# 4. Sign in at localhost:3000/login
# 5. Paste in browser console:

fetch('/api/upload-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    filename: 'test.mp4',
    contentType: 'video/mp4',
    size: 50000000
  })
}).then(r => r.json()).then(console.log)

# Should see: { signedUrl, path, tokenExpiresIn: 3600 }
```

---

## ⚙️ Environment Variables (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Get from: https://supabase.com/dashboard → Settings → API

---

## 📋 Files Changed

1. **[src/lib/supabase/server.ts](src/lib/supabase/server.ts#L83)**
   - Enhanced `createAdminClient()` with env var checks

2. **[src/app/api/upload-url/route.ts](src/app/api/upload-url/route.ts)**
   - Rewrote with 7-step validation + logging
   - Returns: `{ signedUrl, path, tokenExpiresIn }`
   - Or error: `{ error, details, missingEnv, bucketExists }`

3. **[src/lib/client/storage-upload.ts](src/lib/client/storage-upload.ts)**
   - Added pre-upload validation
   - Enhanced error parsing

---

## 📊 API Response

**Success (200):**
```json
{
  "signedUrl": "https://...",
  "path": "user-id/timestamp-uuid/filename.mp4",
  "tokenExpiresIn": 3600
}
```

**Error (any status):**
```json
{
  "error": "Brief error",
  "details": "Technical details",
  "missingEnv": ["VAR_NAME"],
  "bucketExists": true/false/null
}
```

---

## 🐛 Common Issues

| Problem | Solution |
|---------|----------|
| "Missing env vars" | Add all 3 to `.env.local`, restart |
| "Bucket not found" | Create "videos" bucket in Supabase |
| "Not authenticated" | Go to /login, sign in |
| "Invalid content type" | Upload must be a video |
| "File too large" | Max 2GB |

---

## ✅ Checklist

- [ ] All 3 env vars in `.env.local`
- [ ] "videos" bucket exists in Supabase Storage
- [ ] `npm run build` - no errors
- [ ] `npm run dev` - starts OK
- [ ] `GET /login` - can sign in
- [ ] `POST /api/upload-url` - returns signedUrl
- [ ] `/editor` - can upload video
- [ ] File appears in Storage bucket

---

## 📚 Full Guides

- [SUPABASE_STORAGE_FIX.md](SUPABASE_STORAGE_FIX.md) - Complete implementation
- [STORAGE_QUICK_TEST.md](STORAGE_QUICK_TEST.md) - Detailed testing steps
- [STORAGE_UPLOAD_COMPLETE.md](STORAGE_UPLOAD_COMPLETE.md) - Summary

---

## 🚀 Deploy to Production

1. Vercel → auto-editor → Settings → Environment Variables
2. Add the 3 Supabase env vars
3. Deploy: `git push` (auto-deploys)
4. Test at https://autoeditor.app/editor

---

**Status:** ✅ Code complete, ready to test!
