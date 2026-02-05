import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic';


/**
 * Stripe Webhook Handler
 * POST /api/stripe/webhook
 * 
 * TODO: IMPLEMENT AFTER WEBHOOKS ARE LIVE IN STRIPE DASHBOARD
 * 
 * This route will handle the following Stripe events:
 * 
 * 1. checkout.session.completed
 *    - Get session.client_reference_id (userId)
 *    - Get session.customer (Stripe customer ID)
 *    - Get session.subscription (Stripe subscription ID)
 *    - Get session.metadata.plan
 *    - Update subscriptions table:
 *      UPDATE subscriptions SET 
 *        status = 'active',
 *        stripe_customer_id = customer_id,
 *        stripe_subscription_id = subscription_id,
 *        plan = plan
 *      WHERE user_id = userId
 * 
 * 2. customer.subscription.updated
 *    - Get subscription.id (Stripe subscription ID)
 *    - Get subscription.status (active, past_due, unpaid, canceled, etc)
 *    - Get subscription.customer (Stripe customer ID)
 *    - Get subscription.current_period_end
 *    - Update subscriptions table:
 *      UPDATE subscriptions SET
 *        status = subscription.status,
 *        current_period_end = subscription.current_period_end
 *      WHERE stripe_customer_id = customer_id
 * 
 * 3. customer.subscription.deleted
 *    - Get subscription.customer (Stripe customer ID)
 *    - Update subscriptions table:
 *      UPDATE subscriptions SET
 *        status = 'canceled'
 *      WHERE stripe_customer_id = customer_id
 * 
 * SETUP STEPS:
 * 1. Go to https://dashboard.stripe.com/webhooks
 * 2. Create a new endpoint: https://autoeditor.app/api/stripe/webhook
 * 3. Select events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
 * 4. Copy the signing secret (starts with whsec_)
 * 5. Add STRIPE_WEBHOOK_SECRET=whsec_... to .env
 * 6. Uncomment the code below and implement the event handlers
 * 7. Test with Stripe CLI: stripe listen --forward-to localhost:3000/api/stripe/webhook
 */

export async function POST(request: NextRequest) {
  // TODO: Implement webhook handler
  // For now, return 501 Not Implemented to indicate this is a placeholder

  return NextResponse.json(
    {
      error: 'Webhook handler not yet implemented',
      message: 'This endpoint is ready for Stripe webhooks once you complete the setup steps in the code comments.',
      status: 'NOT_IMPLEMENTED',
    },
    { status: 501 }
  )
}

/**
 * REFERENCE IMPLEMENTATION (uncomment when ready)
 * 
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
      const stripe = getStripe();
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('[webhook] Invalid signature:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.client_reference_id
      const customerId = session.customer as string
      const subscriptionId = session.subscription as string
      const plan = (session.metadata?.plan as string) || 'starter'

      if (userId) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan: plan,
          })
          .eq('user_id', userId)
      }
    }

    // Handle customer.subscription.updated
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const status = subscription.status

      await supabase
        .from('subscriptions')
        .update({
          status: status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_customer_id', customerId)
    }

    // Handle customer.subscription.deleted
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
        })
        .eq('stripe_customer_id', customerId)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
 */
