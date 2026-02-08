import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe Webhook Handler
 * POST /api/stripe/webhook
 * 
 * Handles Stripe subscription events:
 * - checkout.session.completed: Initial subscription activation
 * - customer.subscription.updated: Plan changes, renewals, past-due
 * - customer.subscription.deleted: Cancellations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[webhook] Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[webhook] STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const stripe = getStripe();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('[webhook] Invalid signature:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('[webhook] Event received:', event.type);

    const supabase = await createClient();

    // Handle checkout.session.completed - Initial subscription
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      const plan = (session.metadata?.plan as string) || 'starter';

      if (userId && customerId && subscriptionId) {
        console.log('[webhook] Activating subscription:', { userId, plan });

        // Update billing_status table
        const { error: billingError } = await supabase
          .from('billing_status')
          .update({
            status: 'active',
            stripe_subscription_id: subscriptionId,
            plan: plan,
          })
          .eq('user_id', userId);

        if (billingError) {
          console.error('[webhook] Error updating billing_status:', billingError);
        }

        // Update profile with Stripe customer ID
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', userId);

        if (profileError) {
          console.error('[webhook] Error updating profile:', profileError);
        }

        console.log('[webhook] Subscription activated:', { userId, plan, subscriptionId });
      }
    }

    // Handle customer.subscription.updated - Renewals, plan changes, cancellations
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer;
      const stripeStatus = subscription.status;

      if (customerId) {
        console.log('[webhook] Subscription updated:', { customerId, stripeStatus });

        // Map Stripe subscription status to our status
        let status: 'active' | 'pending' | 'locked';
        switch (stripeStatus) {
          case 'active':
          case 'trialing':
            status = 'active';
            break;
          case 'past_due':
          case 'incomplete':
            status = 'active'; // Still has access during past_due
            break;
          case 'canceled':
          case 'unpaid':
          case 'incomplete_expired':
            status = 'locked';
            break;
          default:
            status = 'pending';
        }

        // Find user_id from profiles table using stripe_customer_id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profileError || !profile) {
          console.error('[webhook] Could not find user for customer:', { customerId, error: profileError });
          return;
        }

        // Update billing_status with new status
        const { error: billingError } = await supabase
          .from('billing_status')
          .update({
            status: status,
          })
          .eq('user_id', profile.id);

        if (billingError) {
          console.error('[webhook] Error updating billing_status:', billingError);
        } else {
          console.log('[webhook] Subscription status updated:', { userId: profile.id, status });
        }
      }
    }

    // Handle customer.subscription.deleted - Cancellations
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer;

      if (customerId) {
        console.log('[webhook] Canceling subscription:', { customerId });

        // Find user_id from profiles table using stripe_customer_id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profileError || !profile) {
          console.error('[webhook] Could not find user for customer:', { customerId, error: profileError });
          return;
        }

        // Mark subscription as canceled by setting status to locked
        const { error: billingError } = await supabase
          .from('billing_status')
          .update({
            status: 'locked',
          })
          .eq('user_id', profile.id);

        if (billingError) {
          console.error('[webhook] Error updating billing_status:', billingError);
        } else {
          console.log('[webhook] Subscription canceled:', { userId: profile.id });
        }
      }
    }

    // Handle invoice.payment_failed - Past due accounts
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

      if (customerId) {
        console.log('[webhook] Payment failed, marking status as active (subscription.updated will handle lock):', { customerId });

        // Find user_id from profiles table using stripe_customer_id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profileError || !profile) {
          console.error('[webhook] Could not find user for customer:', { customerId, error: profileError });
          return;
        }

        // Payment failed events are typically followed by subscription.updated with past_due status
        // We don't update here as subscription.updated will handle the status change
        console.log('[webhook] Payment failed event received, awaiting subscription.updated:', { userId: profile.id });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
