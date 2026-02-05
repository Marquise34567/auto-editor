import { NextRequest, NextResponse } from 'next/server';
import { validateReturnTo } from '@/lib/client/returnTo';
import type { PlanId } from '@/config/plans';
import { isBillingLive } from '@/lib/server/subscription';

export const runtime = 'nodejs';

/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout Session.
 * 
 * Request:
 * {
 *   planId: "starter" | "creator" | "studio"
 *   billingCycle: "monthly" | "annual"
 *   returnTo: "/editor" (internal path, validated)
 * }
 *
 * Response:
 * {
 *   ok: true,
 *   url: "https://checkout.stripe.com/pay/..." (Stripe checkout URL)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // CRITICAL SAFETY: Block checkout if billing is not live
    if (!isBillingLive()) {
      return NextResponse.json(
        {
          ok: false,
          code: "BILLING_DISABLED",
          error: "Billing is not active yet. No charges will be made.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { planId, billingCycle, returnTo } = body;

    // Validate inputs
    if (!planId || !billingCycle || !['starter', 'creator', 'studio'].includes(planId)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid plan ID' },
        { status: 400 }
      );
    }

    if (!['monthly', 'annual'].includes(billingCycle)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid billing cycle' },
        { status: 400 }
      );
    }

    // Validate and sanitize returnTo
    const validatedReturnTo = validateReturnTo(returnTo);

    // TODO: Integrate with Stripe
    // For now, return a placeholder that would normally be the Stripe URL
    console.log('[checkout] Creating session:', {
      planId,
      billingCycle,
      returnTo: validatedReturnTo,
    });

    // Placeholder: In production, this would call Stripe API
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const session = await stripe.checkout.sessions.create({
    //   payment_method_types: ['card'],
    //   mode: 'subscription',
    //   customer_email: user.email,
    //   line_items: [
    //     {
    //       price: PLAN_PRICE_IDS[planId][billingCycle], // e.g., "price_1234_monthly"
    //       quantity: 1,
    //     },
    //   ],
    //   success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}&returnTo=${encodeURIComponent(validatedReturnTo)}`,
    //   cancel_url: `${baseUrl}/checkout?plan=${planId}&billingCycle=${billingCycle}&returnTo=${encodeURIComponent(validatedReturnTo)}`,
    //   metadata: {
    //     userId: user.id,
    //     planId,
    //     billingCycle,
    //     returnTo: validatedReturnTo,
    //   },
    //   client_reference_id: user.id,
    // });

    // For demo, return a mock URL
    const mockUrl = `https://checkout.stripe.com/mock?planId=${planId}&cycle=${billingCycle}`;

    return NextResponse.json(
      {
        ok: true,
        url: mockUrl,
        message: 'Stripe integration pending. See server logs.',
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[checkout] Error:', errorMsg);

    return NextResponse.json(
      { ok: false, error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
