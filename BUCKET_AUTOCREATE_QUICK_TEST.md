# Quick Test: Bucket Auto-Creation

**Time:** 5 minutes  
**Goal:** Verify bucket auto-creates on first upload

---

## Setup

```bash
# 1. Ensure .env.local has Supabase vars
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# 2. DELETE the "videos" bucket from Supabase Storage (if it exists)
#    Visit: https://supabase.com/dashboard → Storage

# 3. Start dev server
npm run build
npm run dev
```

---

## Test 1: First Upload (Bucket Auto-Created)

**In browser console (F12):**

```javascript
// First, sign in at localhost:3000/login
// Then paste this in console:

fetch('/api/upload-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    filename: 'test.mp4',
    contentType: 'video/mp4'
  })
}).then(r => r.json()).then(d => {
  if (d.signedUrl) {
    console.log('✅ SUCCESS - Bucket auto-created!')
    console.log('Signed URL:', d.signedUrl.substring(0, 80) + '...')
  } else {
    console.error('❌ ERROR:', d.error)
    console.error('Details:', d.details)
  }
})
```

**Expected output:**
```
✅ SUCCESS - Bucket auto-created!
Signed URL: https://project.supabase.co/storage/v1/upload/sign/videos/...
```

**Server logs (where `npm run dev` runs) should show:**
```
[upload-url:...] Ensuring bucket 'videos' exists...
[storage] Auto-created bucket 'videos' (public=false)
[upload-url:...] ✓ Bucket 'videos' created successfully
[upload-url:...] Creating signed upload URL...
```

---

## Test 2: Second Upload (Bucket Already Exists)

**In browser console:**

```javascript
// Same code as Test 1
fetch('/api/upload-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    filename: 'test2.mp4',
    contentType: 'video/mp4'
  })
}).then(r => r.json()).then(d => {
  if (d.signedUrl) {
    console.log('✅ Got signed URL (bucket already exists)')
    console.log('Signed URL:', d.signedUrl.substring(0, 80) + '...')
  } else {
    console.error('❌ ERROR:', d.error)
  }
})
```

**Expected:**
- Same success response
- Server logs show: `[upload-url:...] ✓ Bucket 'videos' exists` (not created)

---

## Test 3: Verify in Supabase Storage

**Go to:** https://supabase.com/dashboard → Storage

**Should see:**
- ✅ Bucket named `videos` (auto-created!)
- ✅ Privacy: Private (not public)

---

## Test 4: Production Safety

**Verify production prevents auto-creation:**

```bash
# Simulate production
NODE_ENV=production npm run build
NODE_ENV=production npm run dev

# Delete "videos" bucket from Supabase

# In browser console:
fetch('/api/upload-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    filename: 'test.mp4',
    contentType: 'video/mp4'
  })
}).then(r => r.json()).then(console.log)
```

**Expected error:**
```json
{
  "error": "Bucket 'videos' unavailable",
  "details": "Bucket 'videos' does not exist in production. Create it via Supabase Storage dashboard or set ALLOW_BUCKET_AUTOCREATE=true to enable auto-creation.",
  "bucketExists": false
}
```

---

## ✅ All Passing?

If all 4 tests pass:

```
✅ Bucket auto-creation works in dev
✅ Subsequent uploads reuse bucket
✅ Bucket confirmed in Supabase
✅ Production safely blocks auto-creation
```

**You're ready!** 🚀

---

## 📝 Notes

- **Dev default:** Auto-creates buckets on first upload
- **Prod default:** Requires manual bucket creation (safe)
- **Prod override:** Set `ALLOW_BUCKET_AUTOCREATE=true` to enable auto-creation
- **Bucket privacy:** Always created as `private` (public=false)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Missing env vars" | Add all 3 to `.env.local` |
| "Bucket still doesn't exist" | Check server logs for creation error |
| Production created bucket | It shouldn't - check NODE_ENV |
| Bucket is public | It shouldn't be - should be private |

---

**Done in 5 minutes!**
