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
    // Create Supabase client
    const supabase = await createSupabaseServerClient();

    // Get current user from session
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { success: false, user: null },
        { status: 401 }
      );
    }

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
