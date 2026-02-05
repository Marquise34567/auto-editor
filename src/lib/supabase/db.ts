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
 * Queries combined data from billing_status and profiles tables
 */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  try {
    const supabase = await createServerClient()
    
    // Get subscription status from billing_status table
    const { data: billingData, error: billingError } = await supabase
      .from('billing_status')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (billingError) {
      console.error('Failed to get billing_status:', billingError)
      return null
    }

    // Get stripe_customer_id from profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Failed to get profile:', profileError)
      return null
    }

    // Combine data into Subscription format
    const subscription: Subscription = {
      id: userId, // Use user_id as id since billing_status doesn't have an id column
      user_id: billingData.user_id,
      plan_id: billingData.plan || 'free',
      status: billingData.status || 'locked',
      stripe_customer_id: profileData?.stripe_customer_id || null,
      stripe_subscription_id: billingData.stripe_subscription_id || null,
      current_period_start: null,
      current_period_end: null,
      updated_at: billingData.updated_at,
    }

    return subscription
  } catch (error) {
    console.error('Failed to get subscription:', error)
    return null
  }
}

/**
 * Update user subscription (admin/service role operation)
 * Used in API routes and webhook handlers
 * Updates billing_status table and profiles table as needed
 */
export async function updateUserSubscription(
  userId: string,
  updates: Partial<Subscription>
): Promise<Subscription | null> {
  try {
    const admin = createAdminClient()
    
    // Build billing_status updates
    const billingUpdates: any = {}
    if (updates.plan_id) billingUpdates.plan = updates.plan_id
    if (updates.status) billingUpdates.status = updates.status
    if (updates.stripe_subscription_id) billingUpdates.stripe_subscription_id = updates.stripe_subscription_id
    
    // Update billing_status if there are changes
    if (Object.keys(billingUpdates).length > 0) {
      const { error: billingError } = await admin
        .from('billing_status')
        .update(billingUpdates)
        .eq('user_id', userId)

      if (billingError) {
        console.error('Failed to update billing_status:', billingError)
        return null
      }
    }

    // Update profiles if stripe_customer_id changed
    if (updates.stripe_customer_id) {
      const { error: profileError } = await admin
        .from('profiles')
        .update({ stripe_customer_id: updates.stripe_customer_id })
        .eq('id', userId)

      if (profileError) {
        console.error('Failed to update profile:', profileError)
        return null
      }
    }

    // Fetch and return updated subscription
    return getUserSubscription(userId)
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
