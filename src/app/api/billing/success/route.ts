import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { updateUserSubscription } from '@/lib/server/subscription';

export const runtime = 'nodejs';

/**
 * GET /api/billing/success
 * Handles redirect after successful Stripe checkout
 * 
 * Query params:
 *   - session_id: Stripe Checkout Session ID
 *   - returnTo: URL to redirect user after processing (optional)
 * 
 * Behavior:
 *   - If WEBHOOKS_LIVE=false: Mark subscription as pending, redirect with ?pending=1
 *   - If WEBHOOKS_LIVE=true: Activate subscription immediately
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    const returnTo = request.nextUrl.searchParams.get('returnTo') || '/editor';

    if (!sessionId) {
      console.error('[billing/success] Missing session_id');
      return NextResponse.redirect(new URL('/pricing?error=no_session', request.url));
    }

    console.log('[billing/success] Processing session:', sessionId);

    // Retrieve Stripe Checkout Session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    if (!session || session.payment_status !== 'paid') {
      console.error('[billing/success] Payment not completed:', session?.payment_status);
      return NextResponse.redirect(new URL('/pricing?error=payment_failed', request.url));
    }

    const userId = session.metadata?.userId || session.client_reference_id;

    if (!userId) {
      console.error('[billing/success] Missing userId in session metadata');
      return NextResponse.redirect(new URL('/pricing?error=invalid_session', request.url));
    }

    const webhooksLive = process.env.BILLING_WEBHOOKS_LIVE === 'true';
    console.log('[billing/success] Webhooks live:', webhooksLive);

    if (!webhooksLive) {
      // Webhooks NOT enabled - store pending verification state
      console.log('[billing/success] Storing pending activation for user:', userId);
      
      await updateUserSubscription(userId, {
        planId: 'free', // Keep on FREE until webhooks activate
        status: 'pending_activation',
        provider: 'stripe',
        providerCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        providerSubscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
      });

      // Redirect with pending flag
      const redirectUrl = new URL(returnTo, request.url);
      redirectUrl.searchParams.set('pending', '1');
      console.log('[billing/success] Redirecting to:', redirectUrl.pathname + redirectUrl.search);
      return NextResponse.redirect(redirectUrl);
    }

    // Webhooks ARE enabled - activate subscription immediately
    console.log('[billing/success] Activating subscription immediately for user:', userId);
    
    const subscription = typeof session.subscription === 'string'
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;

    if (subscription && 'current_period_start' in subscription) {
      // Determine plan from price ID
      const priceId = subscription.items.data[0]?.price.id;
      let planId: 'starter' | 'creator' | 'studio' = 'starter'; // Default

      // Map price IDs to plans
      if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_STUDIO) {
        planId = 'studio';
      } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_CREATOR) {
        planId = 'creator';
      } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER) {
        planId = 'starter';
      }

      // Type guard for period properties
      const periodStart = 'current_period_start' in subscription 
        ? (subscription.current_period_start as number) 
        : Math.floor(Date.now() / 1000);
      
      const periodEnd = 'current_period_end' in subscription 
        ? (subscription.current_period_end as number) 
        : Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      await updateUserSubscription(userId, {
        planId,
        status: 'active',
        provider: 'stripe',
        providerCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        providerSubscriptionId: subscription.id,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      });

      console.log('[billing/success] Subscription activated:', planId);
    }

    // Redirect to original page
    const redirectUrl = new URL(returnTo, request.url);
    console.log('[billing/success] Redirecting to:', redirectUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('[billing/success] Error:', error);
    return NextResponse.redirect(new URL('/pricing?error=unknown', request.url));
  }
}
