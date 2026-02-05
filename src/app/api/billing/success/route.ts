import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { updateUserSubscription } from '@/lib/server/subscription';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.redirect(new URL('/pricing?error=no_session', request.url));
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    if (!session || session.payment_status !== 'paid') {
      return NextResponse.redirect(new URL('/pricing?error=payment_failed', request.url));
    }

    const userId = session.metadata?.userId || session.client_reference_id;
    const plan = session.metadata?.plan as 'starter' | 'creator' | 'studio';
    const returnTo = session.metadata?.returnTo || '/editor';

    if (!userId || !plan) {
      return NextResponse.redirect(new URL('/pricing?error=invalid_session', request.url));
    }

    const webhooksLive = process.env.BILLING_WEBHOOKS_LIVE === 'true';

    if (!webhooksLive) {
      // Store pending activation state
      await updateUserSubscription(userId, {
        planId: 'free', // Keep on free until webhooks activate
        status: 'incomplete',
        provider: 'stripe',
        providerCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        providerSubscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
      });

      return NextResponse.redirect(new URL(`${returnTo}?pending=1`, request.url));
    }

    // Webhooks are live - activate subscription immediately
    const subscription = typeof session.subscription === 'string'
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;

    if (subscription && 'current_period_start' in subscription) {
      await updateUserSubscription(userId, {
        planId: plan,
        status: 'active',
        provider: 'stripe',
        providerCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        providerSubscriptionId: subscription.id,
        currentPeriodStart: subscription.current_period_start as number,
        currentPeriodEnd: subscription.current_period_end as number,
      });
    }

    return NextResponse.redirect(new URL(returnTo, request.url));
  } catch (error) {
    console.error('[billing/success] Error:', error);
    return NextResponse.redirect(new URL('/pricing?error=unknown', request.url));
  }
}
