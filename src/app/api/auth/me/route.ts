/**
 * Get current session
 * GET /api/auth/me
 * 
 * Returns authenticated user from Supabase session
 * Properly handles session cookies for SSR
 */

import { createApiRouteClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // === LOGGING: Request diagnostics ===
    const cookieHeader = request.headers.get('cookie') || '';
    console.log('[api:auth:me] GET /api/auth/me');
    console.log('[api:auth:me] Cookie header present:', !!cookieHeader);
    console.log('[api:auth:me] Cookie length:', cookieHeader.length);

    // Create response object to hold cookies
    const response = NextResponse.json({ success: false })
    const { supabase } = await createApiRouteClient(response)

    // Get current user from session
    console.log('[api:auth:me] Calling supabase.auth.getUser()...');
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('[api:auth:me] Auth error:', error.message);
      return NextResponse.json(
        { 
          success: false, 
          user: null,
          error: 'Auth failed',
          detail: error.message
        },
        { status: 401 }
      );
    }

    if (!user) {
      console.error('[api:auth:me] No user found in session');
      console.log('[api:auth:me] Request cookies:', cookieHeader.substring(0, 100));
      return NextResponse.json(
        { success: false, user: null, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('[api:auth:me] User found:', user.id, user.email);

    // Get user profile from database
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Get user billing status
    const { data: billingStatus } = await supabase
      .from('billing_status')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Return success response with user data
    // Cookies are already set on response from createApiRouteClient
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
      profile,
      billingStatus,
    });
  } catch (error) {
    console.error('[api:auth:me] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get session' },
      { status: 500 }
    );
  }
}
