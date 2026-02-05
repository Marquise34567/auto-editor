/**
 * Stripe Configuration
 * 
 * Centralized Stripe setup and price lookup keys.
 */

import Stripe from 'stripe';

// Allow missing key during build time, but require at runtime
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_missing_key';

export const stripe = new Stripe(stripeKey, {
  apiVersion: '2026-01-28.clover',
  typescript: true,
});

/**
 * Stripe Price Lookup Keys
 * These must match the lookup_key values you set in Stripe Dashboard.
 */
export const STRIPE_PRICE_LOOKUPS = {
  starter: process.env.STRIPE_STARTER_PRICE_LOOKUP || 'starter_monthly',
  creator: process.env.STRIPE_CREATOR_PRICE_LOOKUP || 'creator_monthly',
  studio: process.env.STRIPE_STUDIO_PRICE_LOOKUP || 'studio_monthly',
} as const;

/**
 * Get app URL for redirect URLs
 */
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Check if webhooks are enabled
 */
export function areWebhooksLive(): boolean {
  return process.env.BILLING_WEBHOOKS_LIVE === 'true';
}
