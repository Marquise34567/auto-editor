import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    console.log('[auth:callback] Exchanging code for session...');
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      console.log('[auth:callback] ✓ Session exchanged successfully');
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

          // Create billing_status record if it doesn't exist
          await supabase.from('billing_status').insert({
            user_id: user.id,
            plan: 'free',
            status: 'locked',
          })
        }
      }

      // Redirect to next page or editor
      console.log('[auth:callback] Redirecting to:', next);
      return NextResponse.redirect(new URL(next, request.url))
    } else {
      console.error('[auth:callback] Failed to exchange code:', error.message);
    }
  } else {
    console.error('[auth:callback] No code provided in callback');
  }

  // Redirect to login if there was an error
  return NextResponse.redirect(new URL('/login?error=auth', request.url))
}
