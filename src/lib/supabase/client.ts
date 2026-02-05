import { createBrowserClient } from '@supabase/ssr'

/**
 * Create Supabase browser client for client-side auth operations
 * Uses NEXT_PUBLIC_ env vars that are available in the browser
 * Configured to store session in cookies (not localStorage) for SSR compatibility
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

  // createBrowserClient from @supabase/ssr automatically handles cookies
  // It stores session in httpOnly cookies which are readable by server routes
  const client = createBrowserClient(supabaseUrl, supabaseAnonKey)
  
  console.log('[supabase:client] Browser client created successfully')
  
  return client
}
