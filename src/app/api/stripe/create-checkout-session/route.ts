/**
 * CREATE STRIPE CHECKOUT SESSION
 * POST /api/stripe/create-checkout-session
 * 
 * Creates a Stripe Checkout Session for subscription purchase
 * Requires authenticated user and valid Stripe configuration
 * Uses real production-mode Stripe API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlanPriceId, getPlanMetadata } from '@/lib/billing/config';
import { getStripe, isStripeConfigured } from '@/lib/stripe/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Validate Stripe configuration - REQUIRED
    if (!isStripeConfigured()) {
      console.error('[checkout] Stripe is not configured. Set STRIPE_SECRET_KEY.');
      return NextResponse.json(
        { error: 'Stripe is not configured. Contact support.' },
        { status: 500 }
      );
    }

    const stripe = getStripe();

    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { plan } = body;

    if (!plan || typeof plan !== 'string') {
      return NextResponse.json(
        { error: 'Plan is required (starter, creator, or studio)' },
        { status: 400 }
      );
    }

    const planLower = plan.toLowerCase();
    if (!['starter', 'creator', 'studio'].includes(planLower)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be starter, creator, or studio' },
        { status: 400 }
      );
    }

    // Get price ID for the plan
    const priceId = getPlanPriceId(planLower);
    if (!priceId) {
      console.error('[checkout] Missing price ID for plan:', planLower);
      return NextResponse.json(
        { 
          error: `Pricing not configured for ${planLower} plan. Contact support.`,
          code: 'PRICE_NOT_CONFIGURED'
        },
        { status: 500 }
      );
    }

    console.log('[checkout] Creating session:', {
      userId: user.id,
      email: user.email,
      plan: planLower,
      priceId,
    });

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      console.log('[checkout] Creating new Stripe customer');
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);

      console.log('[checkout] Stripe customer created:', customerId);
    }

    // Determine success URL based on billing mode
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
    const successUrl = `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/pricing?canceled=1`;

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        ...getPlanMetadata(planLower),
        user_id: user.id,
        user_email: user.email || '',
      },
      subscription_data: {
        metadata: {
          ...getPlanMetadata(planLower),
          user_id: user.id,
        },
      },
    });

    console.log('[checkout] Session created:', {
      sessionId: session.id,
      url: session.url,
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('[checkout] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
