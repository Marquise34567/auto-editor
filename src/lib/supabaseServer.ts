/**
 * Supabase Server Client
 * Used in Server Components, API Routes, and Server Actions
 * Integrates with Next.js cookies() for session persistence
 * 
 * CRITICAL: This client automatically handles session refresh when auth.getUser() is called.
 * The setAll callback updates cookies in the response, which persists the refreshed session
 * back to the browser.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createSupabaseServerClient() {
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
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware handling cookie setting separately.
          }
        },
      },
    }
  )
}
