import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { STRIPE_PRICE_LOOKUP_KEYS, type PlanId } from '@/lib/plans';
import { getDemoUserId } from '@/lib/server/subscription';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plan, returnTo } = body as { plan: PlanId; returnTo?: string };

    if (plan === 'free') {
      return NextResponse.json(
        { error: 'Free plan does not require checkout' },
        { status: 400 }
      );
    }

    if (!['starter', 'creator', 'studio'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    const userId = getDemoUserId();
    const lookupKey = STRIPE_PRICE_LOOKUP_KEYS[plan as Exclude<PlanId, 'free'>];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';

    // Look up price by lookup key
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      expand: ['data.product'],
    });

    if (!prices.data.length) {
      console.error(`[checkout] Price not found for lookup key: ${lookupKey}`);
      return NextResponse.json(
        { error: `Price not found for plan: ${plan}` },
        { status: 500 }
      );
    }

    const price = prices.data[0];

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/api/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?canceled=1`,
      metadata: {
        userId,
        plan,
        returnTo: returnTo || '/editor',
      },
      client_reference_id: userId,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[checkout] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
