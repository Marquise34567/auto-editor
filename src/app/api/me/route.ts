/**
 * DEBUG SESSION ENDPOINT
 * GET /api/me
 * 
 * Returns current user session status for debugging
 * Uses Supabase SSR with proper cookie handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('[api/me:hit] GET /api/me');
    
    // Get all cookies for debugging
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('[api/me:cookies] Total cookies:', allCookies.length);
    console.log('[api/me:cookies] Cookie names:', allCookies.map(c => c.name).join(', '));

    // Create Supabase client with SSR cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              console.error('[api/me:cookie_error]', error);
            }
          },
        },
      }
    );

    console.log('[api/me:auth] Calling supabase.auth.getUser()...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('[api/me:auth_error]', authError.message);
      return NextResponse.json(
        {
          signedIn: false,
          error: authError.message,
          cookies: allCookies.length,
        },
        { status: 401 }
      );
    }

    if (!user) {
      console.error('[api/me:no_session] No user found');
      return NextResponse.json(
        {
          signedIn: false,
          cookies: allCookies.length,
          cookieNames: allCookies.map(c => c.name),
        },
        { status: 401 }
      );
    }

    console.log('[api/me:user] ✓ User authenticated:', user.id, user.email);
    return NextResponse.json({
      signedIn: true,
      userId: user.id,
      email: user.email,
      cookies: allCookies.length,
    });
  } catch (error) {
    console.error('[api/me:error]', error);
    return NextResponse.json(
      { signedIn: false, error: 'Internal error' },
      { status: 500 }
    );
  }
}
