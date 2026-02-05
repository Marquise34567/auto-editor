import { createBrowserClient } from '@supabase/ssr'

/**
 * Create Supabase browser client for client-side auth operations
 * Uses NEXT_PUBLIC_ env vars that are available in the browser
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('[supabase:client] Initializing browser client', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl?.substring(0, 30) + '...'
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    const error = 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Add them to .env.local and restart dev server.'
    console.error('[supabase:client]', error)
    throw new Error(error)
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
