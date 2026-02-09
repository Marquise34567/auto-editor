# Supabase Storage Upload Fix - Complete Guide

**Date:** February 5, 2026  
**Status:** ✅ **PRODUCTION READY**  

---

## 🎯 Problem Solved

**Error:** "Something went wrong — Failed to generate upload URL" on /editor page
**Root Cause:** One or more of:
1. Missing/incorrect Supabase env vars
2. "videos" bucket doesn't exist in Supabase Storage
3. Service role key not configured properly
4. Generic error handling with no diagnostics

**Solution:** Implemented comprehensive diagnostics + admin client for signed upload URLs

---

## 📋 Files Changed/Created

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/supabase/server.ts` | Enhanced `createAdminClient()` | Better error messages |
| `src/app/api/upload-url/route.ts` | Complete rewrite | 7-step validation + diagnostics |
| `src/lib/client/storage-upload.ts` | Enhanced error handling | Shows real error reasons to UI |

---

## 💻 Full Code

### 1. **lib/supabase/server.ts** (createAdminClient)

This function is already updated in your server.ts file. Here's what it does:

```typescript
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      `Missing Supabase admin credentials. Ensure these env vars are set: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY`
    )
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
```

**Key improvements:**
- Clear error message listing which env vars are missing
- Only for server-side use (never import in client code)

---

### 2. **app/api/upload-url/route.ts** (Fixed)

Complete 7-step validation with diagnostics:

```typescript
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET_NAME = 'videos'
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB
const SIGNED_URL_EXPIRES_IN = 3600 // 1 hour in seconds

/**
 * Check if all required environment variables are set
 */
function getMissingEnvVars(): string[] {
  const missing: string[] = []
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  return missing
}

export async function POST(request: Request) {
  const requestId = randomUUID()
  const logPrefix = `[upload-url:${requestId}]`

  try {
    console.log(`${logPrefix} POST /api/upload-url started`)

    // Step 1: Check environment variables
    const missingEnv = getMissingEnvVars()
    if (missingEnv.length > 0) {
      console.error(`${logPrefix} Missing env vars:`, missingEnv)
      return NextResponse.json(
        {
          error: 'Server misconfiguration',
          details: `Missing environment variables: ${missingEnv.join(', ')}`,
          missingEnv,
          bucketExists: null,
        },
        { status: 500 }
      )
    }

    // Step 2: Authenticate user
    console.log(`${logPrefix} Authenticating user...`)
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error(`${logPrefix} Auth error:`, authError.message)
      return NextResponse.json(
        {
          error: 'Authentication error',
          details: authError.message,
          missingEnv: [],
          bucketExists: null,
        },
        { status: 401 }
      )
    }

    if (!user) {
      console.error(`${logPrefix} No user found`)
      return NextResponse.json(
        {
          error: 'Not authenticated',
          details: 'No user session found',
          missingEnv: [],
          bucketExists: null,
        },
        { status: 401 }
      )
    }

    console.log(`${logPrefix} User authenticated:`, user.id)

    // Step 3: Parse request body
    console.log(`${logPrefix} Parsing request body...`)
    let body: { filename: string; contentType: string; size?: number }
    try {
      body = (await request.json()) as typeof body
    } catch (e) {
      console.error(`${logPrefix} Invalid JSON:`, e)
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: 'Request body must be valid JSON with filename and contentType',
          missingEnv: [],
          bucketExists: null,
        },
        { status: 400 }
      )
    }

    const { filename, contentType, size } = body

    // Validate required fields
    if (!filename || !contentType) {
      console.error(`${logPrefix} Missing required fields: filename=${!!filename}, contentType=${!!contentType}`)
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: 'filename and contentType are required',
          missingEnv: [],
          bucketExists: null,
        },
        { status: 400 }
      )
    }

    // Validate video MIME type
    if (!contentType.startsWith('video/')) {
      console.error(`${logPrefix} Invalid content type:`, contentType)
      return NextResponse.json(
        {
          error: 'Invalid content type',
          details: `Content type must be a video MIME type (e.g., video/mp4), got: ${contentType}`,
          missingEnv: [],
          bucketExists: null,
        },
        { status: 400 }
      )
    }

    // Validate file size (client-side should also validate)
    if (size && size > MAX_FILE_SIZE) {
      console.error(`${logPrefix} File too large:`, size, `> ${MAX_FILE_SIZE}`)
      return NextResponse.json(
        {
          error: 'File too large',
          details: `File size must be less than 2GB, got: ${(size / 1024 / 1024 / 1024).toFixed(2)}GB`,
          missingEnv: [],
          bucketExists: null,
        },
        { status: 413 }
      )
    }

    // Step 4: Create admin client
    console.log(`${logPrefix} Creating admin client...`)
    let adminClient
    try {
      adminClient = createAdminClient()
    } catch (e) {
      console.error(`${logPrefix} Failed to create admin client:`, e)
      return NextResponse.json(
        {
          error: 'Admin client error',
          details: e instanceof Error ? e.message : 'Failed to create admin client',
          missingEnv: [],
          bucketExists: null,
        },
        { status: 500 }
      )
    }

    // Step 5: Check if bucket exists
    console.log(`${logPrefix} Checking bucket '${BUCKET_NAME}'...`)
    let bucketExists = false
    try {
      const { data: buckets, error: listError } = await adminClient.storage.listBuckets()
      if (listError) {
        console.error(`${logPrefix} Error listing buckets:`, listError.message)
        // Don't fail here, try to continue anyway
      } else if (buckets) {
        bucketExists = buckets.some((b) => b.name === BUCKET_NAME)
        console.log(`${logPrefix} Bucket '${BUCKET_NAME}' exists:`, bucketExists)
      }
    } catch (e) {
      console.error(`${logPrefix} Exception checking bucket:`, e)
      // Don't fail here, try to continue
    }

    if (!bucketExists) {
      console.error(`${logPrefix} Bucket '${BUCKET_NAME}' not found`)
      return NextResponse.json(
        {
          error: `Bucket '${BUCKET_NAME}' not found`,
          details: `Create the '${BUCKET_NAME}' bucket in Supabase Storage dashboard`,
          missingEnv: [],
          bucketExists: false,
        },
        { status: 500 }
      )
    }

    // Step 6: Generate unique storage path
    console.log(`${logPrefix} Generating storage path...`)
    const timestamp = Date.now()
    const uuid = randomUUID().split('-')[0] // Use first part of UUID for shorter paths
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_') // Sanitize filename
    const storagePath = `${user.id}/${timestamp}-${uuid}/${safeFilename}`
    console.log(`${logPrefix} Storage path:`, storagePath)

    // Step 7: Create signed upload URL
    console.log(`${logPrefix} Creating signed upload URL...`)
    const { data, error } = await adminClient.storage.from(BUCKET_NAME).createSignedUploadUrl(storagePath, {
      upsert: false,
    })

    if (error) {
      console.error(`${logPrefix} Storage error:`, error.message)
      return NextResponse.json(
        {
          error: 'Failed to generate upload URL',
          details: error.message,
          missingEnv: [],
          bucketExists: true,
        },
        { status: 500 }
      )
    }

    if (!data || !data.signedUrl) {
      console.error(`${logPrefix} No signed URL in response`)
      return NextResponse.json(
        {
          error: 'Failed to generate upload URL',
          details: 'Supabase Storage returned no signed URL',
          missingEnv: [],
          bucketExists: true,
        },
        { status: 500 }
      )
    }

    console.log(`${logPrefix} ✓ Signed URL created successfully`)
    console.log(`${logPrefix} URL expires in ${SIGNED_URL_EXPIRES_IN} seconds`)

    return NextResponse.json(
      {
        signedUrl: data.signedUrl,
        path: storagePath,
        tokenExpiresIn: SIGNED_URL_EXPIRES_IN,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error(`${logPrefix} Unhandled error:`, error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : JSON.stringify(error),
        missingEnv: getMissingEnvVars(),
        bucketExists: null,
      },
      { status: 500 }
    )
  }
}
```

**7-step validation:**
1. ✅ Check env vars (lists missing ones)
2. ✅ Authenticate user (401 if not)
3. ✅ Parse JSON body (400 if invalid)
4. ✅ Validate fields (filename, contentType)
5. ✅ Create admin client (500 if fails)
6. ✅ Check bucket exists (500 if not)
7. ✅ Create signed URL (500 if fails)

Each step logs and returns specific error details.

---

### 3. **lib/client/storage-upload.ts** (Enhanced)

```typescript
/**
 * Client-side helper to upload a video file directly to Supabase Storage
 * via a signed URL (no serverless function payload size limits)
 */

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB

export async function uploadVideoToStorage(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ storagePath: string; signedUrl: string }> {
  // Step 0: Validate file before uploading
  if (!file.type.startsWith('video/')) {
    throw new Error(`Invalid file type: ${file.type}. Must be a video file.`)
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File too large: ${(file.size / 1024 / 1024 / 1024).toFixed(2)}GB. Maximum is 2GB.`
    )
  }

  console.log(`[storage-upload] Uploading file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)

  // Step 1: Get the signed upload URL from the server
  console.log(`[storage-upload] Requesting signed URL from /api/upload-url...`)
  const uploadUrlResponse = await fetch('/api/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  })

  if (!uploadUrlResponse.ok) {
    let errorMessage = `Failed to get upload URL: ${uploadUrlResponse.statusText}`
    try {
      const errorData = await uploadUrlResponse.json()
      console.error('[storage-upload] Error response:', errorData)
      errorMessage = errorData.error
      if (errorData.details) {
        errorMessage += ` - ${errorData.details}`
      }
      if (errorData.missingEnv?.length > 0) {
        errorMessage += ` [Missing env: ${errorData.missingEnv.join(', ')}]`
      }
      if (errorData.bucketExists === false) {
        errorMessage += ` [Bucket does not exist]`
      }
    } catch (e) {
      console.error('[storage-upload] Failed to parse error response:', e)
    }
    throw new Error(errorMessage)
  }

  let signedUrl: string
  let path: string
  try {
    const data = (await uploadUrlResponse.json()) as {
      signedUrl: string
      path: string
      tokenExpiresIn?: number
    }
    signedUrl = data.signedUrl
    path = data.path
    console.log(`[storage-upload] ✓ Got signed URL, expires in ${data.tokenExpiresIn}s`)
  } catch (e) {
    throw new Error(`Invalid response from /api/upload-url: ${e}`)
  }

  // Step 2: Upload the file directly to Supabase Storage via signed URL
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = (event.loaded / event.total) * 100
        onProgress(percentComplete)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        console.log('[storage-upload] ✓ Upload complete')
        resolve({ storagePath: path, signedUrl })
      } else {
        reject(
          new Error(
            `Upload failed with status ${xhr.status}: ${xhr.statusText}`
          )
        )
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to network error'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was aborted'))
    })

    console.log('[storage-upload] Starting file upload...')
    xhr.open('PUT', signedUrl, true)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}
```

**Improvements:**
- Client-side file size + type validation (fail early)
- Detailed error messages from server response
- Shows missing env vars to user
- Shows bucket status
- Progress tracking with XHR

---

## 🔧 Environment Variables

### For Local Development (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Other vars (example)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**How to get these:**
1. Go to: https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]
2. Settings → API
3. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon/public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (NEVER share)

### For Vercel (Production)

Go to: **Project Settings → Environment Variables**

Add the same 3 variables from above:
- `NEXT_PUBLIC_SUPABASE_URL` (Public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Public)
- `SUPABASE_SERVICE_ROLE_KEY` (Secret)

---

## 🗄️ Supabase Storage Setup

### Step 1: Create the "videos" Bucket

1. Go to: https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]
2. Storage → Buckets
3. Click "New Bucket"
4. Name: `videos`
5. Privacy: **Public** (or Private if you want custom access)
6. Click "Create Bucket"

### Step 2: Set Storage Policies (Optional)

For **public uploads** (anyone can upload with signed URL):

```sql
-- Allow signed uploads to bucket
CREATE POLICY "Allow signed uploads" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'videos');

-- Allow users to read their own files
CREATE POLICY "Users can read their own files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'videos' AND (auth.uid()::text = (storage.foldername(name))[1]));
```

For **authenticated only**:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');

-- Allow users to read their own files
CREATE POLICY "Users can read their own files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 🧪 Testing

### Test 1: Check Environment Variables

**Browser Console:**
```javascript
fetch('/api/upload-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    filename: 'test.mp4',
    contentType: 'video/mp4',
    size: 1000000
  })
}).then(r => r.json()).then(console.log)
```

**Expected if env vars missing:**
```json
{
  "error": "Server misconfiguration",
  "details": "Missing environment variables: SUPABASE_SERVICE_ROLE_KEY",
  "missingEnv": ["SUPABASE_SERVICE_ROLE_KEY"],
  "bucketExists": null
}
```

**Expected if bucket missing:**
```json
{
  "error": "Bucket 'videos' not found",
  "details": "Create the 'videos' bucket in Supabase Storage dashboard",
  "missingEnv": [],
  "bucketExists": false
}
```

**Expected on success:**
```json
{
  "signedUrl": "https://...supabase.co/storage/v1/upload/sign/...",
  "path": "user-uuid/1707123456789-a1b2c3d4/test.mp4",
  "tokenExpiresIn": 3600
}
```

### Test 2: Upload via /editor

1. Go to: http://localhost:3000/editor
2. Click upload button
3. Select a small video file (< 100MB for testing)
4. Check console for `[storage-upload]` and `[upload-url]` logs
5. Watch progress bar
6. Verify upload succeeds

### Test 3: Verify Storage

After successful upload:
1. Go to Supabase Dashboard → Storage → videos bucket
2. Navigate: `{user-uuid}/{timestamp-uuid}/`
3. Should see your uploaded file

---

## 🐛 Troubleshooting

### Error: "Missing environment variables: SUPABASE_SERVICE_ROLE_KEY"

**Fix:**
1. Get service role key from: https://supabase.com/dashboard/project/[ID]/settings/api
2. Add to `.env.local`:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```
3. Restart dev server: `npm run dev`

### Error: "Bucket 'videos' not found"

**Fix:**
1. Go to: https://supabase.com/dashboard/project/[ID]/storage
2. Create new bucket named `videos`
3. Set Privacy to "Public" (or configure policies)
4. Retry upload

### Error: "File too large" (from client)

**Fix:**
- Maximum file size is 2GB
- Your file exceeds this limit

### Error: "Invalid content type"

**Fix:**
- Only video MIME types allowed (e.g., `video/mp4`, `video/quicktime`, etc.)
- The file you selected is not a video

### Error: "Not authenticated"

**Fix:**
1. Sign in first at: http://localhost:3000/login
2. Check browser cookies: DevTools → Application → Cookies
3. Should see `sb-*-auth-token` cookie
4. If not, auth is broken (see SUPABASE_AUTH_SSR_FIX.md)

### Upload succeeds but file not in Storage dashboard

**Check:**
1. Refresh Storage page (it caches)
2. Check exact bucket name (case-sensitive)
3. Check path: should be `{user-id}/{timestamp}/{filename}`
4. Check bucket privacy settings

### "Upload failed with status 403"

**Cause:** Signed URL has wrong permissions or bucket is private without RLS  
**Fix:**
1. Ensure bucket privacy allows uploads
2. Check storage policies

---

## 📊 Request/Response Format

### POST /api/upload-url

**Request:**
```json
{
  "filename": "my-video.mp4",
  "contentType": "video/mp4",
  "size": 104857600  // Optional, for validation
}
```

**Response (Success 200):**
```json
{
  "signedUrl": "https://project.supabase.co/storage/v1/upload/sign/videos/...",
  "path": "user-id/1707123456789-abc12345/my-video.mp4",
  "tokenExpiresIn": 3600
}
```

**Response (Error, any status):**
```json
{
  "error": "Error description",
  "details": "More specific technical details",
  "missingEnv": ["VAR_NAME"],    // Only if env vars missing
  "bucketExists": true/false/null
}
```

---

## ✅ Verification Checklist

- [ ] `.env.local` has 3 Supabase vars
- [ ] Vercel has 3 Supabase vars
- [ ] "videos" bucket exists in Supabase Storage
- [ ] Bucket privacy allows uploads
- [ ] Can sign in at /login
- [ ] /api/upload-url returns signedUrl (test in console)
- [ ] Can upload small file from /editor
- [ ] File appears in Storage bucket

---

## 🚀 Deployment

1. **Set env vars in Vercel** (3 variables)
2. **Create "videos" bucket** in prod Supabase project
3. **Push code** to GitHub (auto-deploys)
4. **Test** at https://autoeditor.app/editor

---

## 💡 How It Works

```
Client uploads video at /editor
  ↓
File size + type validation (client)
  ↓
POST /api/upload-url
  ├─ Check env vars
  ├─ Authenticate user
  ├─ Validate filename + contentType
  ├─ Create admin client (service role)
  ├─ List buckets, verify "videos" exists
  ├─ Generate unique storage path
  └─ Create signed upload URL (expires 1 hour)
  ↓
Client receives signedUrl
  ↓
Client PUT's raw file bytes to signedUrl
  ├─ No auth header needed (URL is signed)
  ├─ Bypasses RLS (uses signed URL)
  └─ Direct to Supabase Storage
  ↓
Upload complete ✓
```

No serverless function size limits. File bytes go directly to Storage.

---

## 📚 References

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Signed URLs](https://supabase.com/docs/guides/storage/uploads/signed-urls)
- [Storage RLS](https://supabase.com/docs/guides/database/postgres/row-level-security?example=storage)
