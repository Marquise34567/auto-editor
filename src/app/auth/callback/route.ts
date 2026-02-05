import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Auth Callback Route
 * Handles Supabase OAuth/email confirmation callbacks
 * Exchanges auth code for session and redirects to appropriate page
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/editor'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Create profile if it doesn't exist
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Check if profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        // Create profile if it doesn't exist
        if (!profile) {
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
          })

          // Create subscription if it doesn't exist
          await supabase.from('subscriptions').insert({
            user_id: user.id,
            status: 'inactive',
            plan: 'starter', // Default plan
          })
        }
      }

      // Redirect to next page or editor
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // Redirect to login if there was an error
  return NextResponse.redirect(new URL('/login?error=auth', request.url))
}
