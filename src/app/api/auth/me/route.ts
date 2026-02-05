/**
 * Get current session
 * GET /api/auth/me
 * 
 * Returns authenticated user from Supabase session
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // === LOGGING: Request check ===
    const cookieHeader = request.headers.get('cookie') || '';
    console.log('[auth/me:hit] GET /api/auth/me');
    console.log('[auth/me:debug] Cookie header present:', !!cookieHeader);
    console.log('[auth/me:debug] Cookie length:', cookieHeader.length);

    // Create Supabase client
    const supabase = await createSupabaseServerClient();

    // Get current user from session
    console.log('[auth/me:auth] Calling supabase.auth.getUser()...');
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('[auth/me:auth_error] Auth error:', error.message);
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
      console.error('[auth/me:no_session] No user found');
      console.log('[auth/me:no_session:debug] Cookie header sample:', cookieHeader.substring(0, 50));
      return NextResponse.json(
        { success: false, user: null },
        { status: 401 }
      );
    }

    console.log('[auth/me:userId] User found:', user.id, user.email);

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
    console.error('[auth/me] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get session' },
      { status: 500 }
    );
  }
}
