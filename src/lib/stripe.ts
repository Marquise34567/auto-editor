import Stripe from 'stripe';

// Allow missing key during build time, but require at runtime
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_missing_key';

/**
 * Stripe SDK instance configured with latest API version
 * Handles all server-side Stripe operations (checkout, webhooks, subscriptions)
 */
export const stripe = new Stripe(stripeKey, {
  apiVersion: '2026-01-28.clover',
  typescript: true,
});
