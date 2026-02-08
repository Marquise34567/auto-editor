/**
 * Login API endpoint
 * POST /api/auth/login
 * 
 * Uses Supabase Auth to authenticate users
 * Properly sets session cookies for subsequent requests
 */

import { createApiRouteClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Create Supabase client with proper response cookie handling
    const responseObj = NextResponse.json({ success: false })
    const { supabase, response } = await createApiRouteClient(responseObj)

    // Sign in with Supabase
    console.log('[api:auth:login] Signing in user:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      console.error('[api:auth:login] Auth error:', error?.message);
      return NextResponse.json(
        { success: false, error: error?.message || 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('[api:auth:login] Login successful, user:', data.user.id);

    // Return success with user data - cookies are already set on response
    const successResponse = NextResponse.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          createdAt: data.user.created_at,
        },
      },
      { status: 200 }
    );

    // Copy cookies from response to success response
    response.cookies.getAll().forEach(({ name, value }) => {
      successResponse.cookies.set(name, value);
    });

    return successResponse;
  } catch (error) {
    console.error('[api:auth:login] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
