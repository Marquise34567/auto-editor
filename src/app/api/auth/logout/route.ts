/**
 * Logout API endpoint
 * POST /api/auth/logout
 * 
 * Uses Supabase Auth to sign out users
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = await createSupabaseServerClient();

    // Sign out with Supabase (clears session cookies)
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('[auth/logout] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
