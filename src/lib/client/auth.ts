/**
 * Client-side auth utilities
 * Used to check authentication before making sensitive API calls
 */

export interface AuthUser {
  id: string;
  email: string;
}

/**
 * Check if user is currently authenticated
 * Returns user object if authenticated, null otherwise
 */
export async function checkAuth(): Promise<AuthUser | null> {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
    });

    if (!response.ok) {
      console.log('[auth] Not authenticated (status:', response.status + ')');
      return null;
    }

    const data = await response.json();
    if (data.user) {
      console.log('[auth] User authenticated:', data.user.id);
      return data.user;
    }

    return null;
  } catch (error) {
    console.error('[auth] Failed to check authentication:', error);
    return null;
  }
}

/**
 * Require authentication or redirect to login
 * Used before making calls to protected endpoints
 */
export async function requireAuthOrRedirect(
  redirectTo: string,
  router: any
): Promise<AuthUser | null> {
  const user = await checkAuth();

  if (!user) {
    console.log('[auth] Unauthorized attempt, redirecting to login. Will return to:', redirectTo);
    // Redirect to login with callback
    const loginUrl = `/login?redirect=${encodeURIComponent(redirectTo)}`;
    router.push(loginUrl);
    return null;
  }

  return user;
}
