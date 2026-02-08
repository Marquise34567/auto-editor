import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'

/**
 * Server-side Supabase client for Server Components
 * Automatically persists session cookies via next/headers
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Silently fail if cookies cannot be set
            // (e.g., when called from middleware)
          }
        },
      },
    }
  )
}

/**
 * API Route helper: Creates a Supabase server client that properly
 * sets cookies on the response object
 * 
 * Usage in API route:
 * ```
 * const { supabase, response } = await createApiRouteClient(NextResponse.next())
 * const { data: { user } } = await supabase.auth.getUser()
 * return response // Cookies are automatically included
 * ```
 */
export async function createApiRouteClient(responseObj: NextResponse) {
  const cookieStore = await cookies()
  const cookiesToSet: Array<{ name: string; value: string; options?: any }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookies) {
          // Collect cookies to set
          cookies.forEach(({ name, value, options }) => {
            cookiesToSet.push({ name, value, options })
            // Also set on response immediately
            responseObj.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  return {
    supabase,
    response: responseObj,
    cookies: cookiesToSet, // For debugging or advanced usage
  }
}

/**
 * Admin client with service role key for elevated operations
 * USE WITH CAUTION: Bypasses Row Level Security (RLS)
 * Server-side only. Do NOT import or use in client components.
 */
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

/**
 * Ensure a storage bucket exists, creating it if necessary in dev/staging
 * 
 * In production (NODE_ENV=production), buckets are NOT auto-created unless
 * ALLOW_BUCKET_AUTOCREATE=true is explicitly set
 * 
 * @param bucketName The name of the bucket to ensure exists
 * @param options Configuration for bucket creation (public by default is false)
 * @returns { exists: boolean, created: boolean, error?: string }
 */
export async function ensureBucketExists(
  bucketName: string,
  options?: { public?: boolean }
): Promise<{ exists: boolean; created: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient()
    const isProduction = process.env.NODE_ENV === 'production'
    const allowAutoCreate = process.env.ALLOW_BUCKET_AUTOCREATE === 'true'

    // List all buckets
    const { data: buckets, error: listError } = await adminClient.storage.listBuckets()

    if (listError) {
      return {
        exists: false,
        created: false,
        error: `Failed to list buckets: ${listError.message}`,
      }
    }

    const bucketExists = buckets?.some((b) => b.name === bucketName) ?? false

    if (bucketExists) {
      return { exists: true, created: false }
    }

    // Bucket doesn't exist - decide whether to create it
    if (isProduction && !allowAutoCreate) {
      return {
        exists: false,
        created: false,
        error: `Bucket '${bucketName}' does not exist in production. Create it via Supabase Storage dashboard or set ALLOW_BUCKET_AUTOCREATE=true to enable auto-creation.`,
      }
    }

    // Auto-create in dev/staging or if explicitly allowed
    const isPublic = options?.public ?? false
    const { error: createError } = await adminClient.storage.createBucket(bucketName, {
      public: isPublic,
    })

    if (createError) {
      return {
        exists: false,
        created: false,
        error: `Failed to create bucket '${bucketName}': ${createError.message}`,
      }
    }

    console.log(`[storage] Auto-created bucket '${bucketName}' (public=${isPublic})`)
    return { exists: true, created: true }
  } catch (e) {
    return {
      exists: false,
      created: false,
      error: e instanceof Error ? e.message : 'Unknown error checking/creating bucket',
    }
  }
}
