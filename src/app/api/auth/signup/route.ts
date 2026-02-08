/**
 * Signup API endpoint
 * POST /api/auth/signup
 * 
 * Uses Supabase Auth to register new users
 * Sends confirmation email and sets initial session
 */

import { createApiRouteClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, confirmPassword } = body;

    // Validate input
    if (!email || !password || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Email and passwords required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check passwords match
    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Create Supabase client with proper response cookie handling
    const responseObj = NextResponse.json({ success: false })
    const { supabase, response } = await createApiRouteClient(responseObj)

    // Get redirect URL from request origin or fallback
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUrl = `${origin}/auth/callback?next=/editor`;

    // Debug log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[api:auth:signup] Using Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('[api:auth:signup] Redirect URL:', redirectUrl);
    }

    // Sign up with Supabase
    console.log('[api:auth:signup] Signing up user:', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      console.error('[api:auth:signup] Supabase error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Signup failed' },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { success: false, error: 'Failed to create user' },
        { status: 500 }
      );
    }

    console.log('[api:auth:signup] Signup successful, user:', data.user.id);

    // Note: profiles and billing_status are created by the database trigger
    // (see supabase/migrations/001_initial_schema.sql)

    const successResponse = NextResponse.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          createdAt: data.user.created_at,
        },
      },
      { status: 201 }
    );

    // Copy cookies from response
    response.cookies.getAll().forEach(({ name, value }) => {
      successResponse.cookies.set(name, value);
    });

    return successResponse;
  } catch (error) {
    console.error('[api:auth:signup] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Signup failed' },
      { status: 500 }
    );
  }
}
