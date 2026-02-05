import { createAdminClient } from './admin'
import { createClient as createServerClient } from './server'

export interface Subscription {
  id: string
  user_id: string
  plan_id: string
  status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  updated_at: string
}

export interface UsageRecord {
  id: string
  user_id: string
  month_key: string
  renders_used: number
  updated_at: string
}

/**
 * Get user subscription from database
 * Can be called from Server Components, API Routes, or Server Actions
 */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Failed to get subscription:', error)
      return null
    }

    return data as Subscription
  } catch (error) {
    console.error('Failed to get subscription:', error)
    return null
  }
}

/**
 * Update user subscription (admin/service role operation)
 * Used in API routes and webhook handlers
 */
export async function updateUserSubscription(
  userId: string,
  updates: Partial<Subscription>
): Promise<Subscription | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('subscriptions')
      .update(updates)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) {
      console.error('Failed to update subscription:', error)
      return null
    }

    return data as Subscription
  } catch (error) {
    console.error('Failed to update subscription:', error)
    return null
  }
}

/**
 * Get monthly usage for a user
 */
export async function getMonthlyUsage(userId: string, monthKey: string): Promise<UsageRecord | null> {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('usage_monthly')
      .select('*')
      .eq('user_id', userId)
      .eq('month_key', monthKey)
      .maybeSingle()

    if (error) {
      console.error('Failed to get usage:', error)
      return null
    }

    return data as UsageRecord | null
  } catch (error) {
    console.error('Failed to get usage:', error)
    return null
  }
}

/**
 * Increment usage count (admin/service role operation)
 * Should be called atomically using the database function
 */
export async function incrementRenderUsage(userId: string, monthKey: string): Promise<boolean> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.rpc('increment_usage', {
      p_user_id: userId,
      p_month_key: monthKey,
    })

    if (error) {
      console.error('Failed to increment usage:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to increment usage:', error)
    return false
  }
}

/**
 * Set subscription by Stripe customer ID
 * Used in webhook handlers to update subscriptions
 */
export async function updateSubscriptionByStripeCustomerId(
  stripeCustomerId: string,
  updates: Partial<Subscription>
): Promise<Subscription | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('subscriptions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', stripeCustomerId)
      .select('*')
      .single()

    if (error) {
      console.error('Failed to update subscription by customer ID:', error)
      return null
    }

    return data as Subscription
  } catch (error) {
    console.error('Failed to update subscription by customer ID:', error)
    return null
  }
}
