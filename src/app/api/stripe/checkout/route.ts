import { NextRequest, NextResponse } from 'next/server'
import { getStripe, isStripeConfigured } from '@/lib/stripe/server'
import { requireUserServer } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
export const dynamic = 'force-dynamic';


/**
 * Stripe Checkout Session Creation
 * POST /api/stripe/checkout
 * Body: { plan: 'starter' | 'creator' | 'studio' }
 * 
 * Creates a Stripe Checkout Session for the authenticated user
 * Saves session ID to database for future lookup
 */
export async function POST(request: NextRequest) {
  try {
        // Validate Stripe configuration
        if (!isStripeConfigured()) {
          return NextResponse.json(
            { error: 'Stripe is not configured on the server' },
            { status: 500 }
          );
        }

        const stripe = getStripe();

    // Require authentication
    const user = await requireUserServer()

    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { plan } = body

    console.log('[stripe/checkout] Creating session for user:', user.id, 'plan:', plan)

    // Validate plan
    const validPlans = ['starter', 'creator', 'studio']
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      )
    }

    // Get price ID from env vars (server-side, NOT NEXT_PUBLIC)
    const priceMap: Record<string, string> = {
      starter: process.env.STRIPE_PRICE_STARTER || '',
      creator: process.env.STRIPE_PRICE_CREATOR || '',
      studio: process.env.STRIPE_PRICE_STUDIO || '',
    }

    const priceId = priceMap[plan]
    if (!priceId) {
      console.error(`[stripe/checkout] Missing STRIPE_PRICE_${plan.toUpperCase()} env var`);
      return NextResponse.json(
        { error: `Stripe price not configured for ${plan} plan` },
        { status: 500 }
      )
    }

    console.log('[stripe/checkout] Using Stripe price:', priceId)

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        plan: plan,
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing?canceled=1`,
    })

    // Note: Subscription status is updated by confirm-session endpoint and webhooks
    // No need to update here as the session doesn't contain subscription data yet

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('[stripe/checkout] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
