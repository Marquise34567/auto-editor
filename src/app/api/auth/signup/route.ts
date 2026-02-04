/**
 * Signup API endpoint
 * POST /api/auth/signup
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getUser, createUser, hashPassword, generateToken } from '@/lib/auth/store';

export const runtime = 'nodejs';

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

    // Check if user already exists
    const existingUser = await getUser(email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User already exists' },
        { status: 409 }
      );
    }

    // Create user
    const passwordHash = hashPassword(password);
    const user = await createUser(email, passwordHash);

    // Generate session token
    const token = generateToken();
    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
        },
        token,
      },
      { status: 201 }
    );

    // Set session cookie
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    // Store token mapping
    try {
      const sessions = await import('@/lib/auth/sessions');
      sessions.setSession(token, user.id, expiresAt);
    } catch {
      console.warn('Session store not available');
    }

    return response;
  } catch (error) {
    console.error('[auth/signup] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Signup failed' },
      { status: 500 }
    );
  }
}
