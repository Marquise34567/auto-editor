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

        // Update subscriptions table
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan: plan,
          })
          .eq('user_id', userId);

        // Update profile with Stripe customer ID
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', userId)
          .select()
          .single();
      }
    }

    // Handle customer.subscription.updated - Renewals, plan changes, cancellations
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer;
      const status = subscription.status;
      const currentPeriodEnd = (subscription as any).current_period_end;

      if (customerId) {
        console.log('[webhook] Updating subscription:', { customerId, status });

        // Update subscriptions table with new status and period end
        await supabase
          .from('subscriptions')
          .update({
            status: status,
            current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
          })
          .eq('stripe_customer_id', customerId);
      }
    }

    // Handle customer.subscription.deleted - Cancellations
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer;

      if (customerId) {
        console.log('[webhook] Canceling subscription:', { customerId });

        // Mark subscription as canceled
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
          })
          .eq('stripe_customer_id', customerId);
      }
    }

    // Handle invoice.payment_failed - Past due accounts
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

      if (customerId) {
        console.log('[webhook] Payment failed, marking past_due:', { customerId });

        await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
          })
          .eq('stripe_customer_id', customerId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
