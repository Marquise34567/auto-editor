/**
 * Stripe Configuration
 * 
 * Centralized Stripe setup and price lookup keys.
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
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
