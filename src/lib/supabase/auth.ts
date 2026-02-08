import { createClient } from './server'

/**
 * Get the currently authenticated user from Supabase
 * This works in Server Components, API Routes, and Middleware
 */
export async function getAuthUser() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email || '',
      createdAt: Math.floor(new Date(user.created_at || '').getTime() / 1000),
    }
  } catch (error) {
    console.error('Failed to get auth user:', error)
    return null
  }
}

/**
 * Get the current session for use in Server Components
 * Returns the user if authenticated, null otherwise
 */
export async function getSession() {
  try {
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return session
  } catch (error) {
    console.error('Failed to get session:', error)
    return null
  }
}
