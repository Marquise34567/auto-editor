/**
 * Get current session
 * GET /api/auth/me
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, user: null },
        { status: 401 }
      );
    }

    // Validate token
    try {
      const sessions = await import('@/lib/auth/sessions');
      const userId = sessions.getSessionUser(token);

      if (!userId) {
        return NextResponse.json(
          { success: false, user: null },
          { status: 401 }
        );
      }

      // TODO: Load full user details from database
      return NextResponse.json({
        success: true,
        user: {
          id: userId,
          email: 'user@example.com', // Placeholder
        },
      });
    } catch {
      return NextResponse.json(
        { success: false, user: null },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('[auth/me] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get session' },
      { status: 500 }
    );
  }
}
