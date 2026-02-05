import { NextResponse } from 'next/server'
import { createClient, createAdminClient, ensureBucketExists } from '@/lib/supabase/server'
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

    // Step 5: Ensure bucket exists (auto-create in dev/staging)
    console.log(`${logPrefix} Ensuring bucket '${BUCKET_NAME}' exists...`)
    const bucketResult = await ensureBucketExists(BUCKET_NAME, { public: false })

    if (!bucketResult.exists) {
      console.error(`${logPrefix} Bucket '${BUCKET_NAME}' unavailable:`, bucketResult.error)
      return NextResponse.json(
        {
          error: `Bucket '${BUCKET_NAME}' unavailable`,
          details: bucketResult.error || `Failed to ensure bucket '${BUCKET_NAME}' exists`,
          missingEnv: [],
          bucketExists: false,
        },
        { status: 500 }
      )
    }

    if (bucketResult.created) {
      console.log(`${logPrefix} ✓ Bucket '${BUCKET_NAME}' created successfully`)
    } else {
      console.log(`${logPrefix} ✓ Bucket '${BUCKET_NAME}' exists`)
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
