/**
 * User Subscription Model & Store
 * 
 * Server-side single source of truth for subscription status.
 * Currently: JSON file store (demo). TODO: Replace with real DB + Stripe.
 * 
 * Key principle: Subscription status comes from provider (Stripe),
 * never from client-side or local flags.
 */

import { promises as fs } from "fs";
import path from "path";
import type { PlanId } from "@/config/plans";

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "unpaid";

export interface UserSubscription {
  /** User ID (from auth system or demo user) */
  userId: string;
  /** Current plan: "free" | "starter" | "creator" | "studio" */
  planId: PlanId;
  /** Payment provider: "stripe" | "none" (none = Free-only) */
  provider: "stripe" | "none";
  /** Provider customer ID (for Stripe: cus_xxx) */
  providerCustomerId?: string;
  /** Provider subscription ID (for Stripe: sub_xxx) */
  providerSubscriptionId?: string;
  /** Subscription status from provider */
  status: SubscriptionStatus;
  /** Unix timestamp: start of current billing period */
  currentPeriodStart: number;
  /** Unix timestamp: end of current billing period */
  currentPeriodEnd: number;
  /** Number of renders used in current period */
  rendersUsedThisPeriod: number;
  /** Last update timestamp */
  updatedAt: number;
}

/**
 * Get the subscription store path.
 * TODO: Replace with real DB query when auth is implemented.
 */
function getSubscriptionStorePath(): string {
  return path.join(process.cwd(), "tmp", "subscriptions.json");
}

/**
 * Initialize subscription store (create empty if missing).
 */
async function ensureSubscriptionStore() {
  const storeFile = getSubscriptionStorePath();
  try {
    await fs.access(storeFile);
  } catch {
    // File doesn't exist, create with empty object
    await fs.mkdir(path.dirname(storeFile), { recursive: true });
    await fs.writeFile(storeFile, JSON.stringify({}, null, 2));
  }
}

/**
 * Get or create default Free subscription for a user.
 */
function getDefaultSubscription(userId: string): UserSubscription {
  const now = Math.floor(Date.now() / 1000);
  return {
    userId,
    planId: "free",
    provider: "none",
    status: "active",
    currentPeriodStart: now,
    currentPeriodEnd: now + 30 * 24 * 60 * 60, // 30 days
    rendersUsedThisPeriod: 0,
    updatedAt: now,
  };
}

/**
 * Get user subscription from store.
 * Returns Free plan if user not found.
 * Automatically resets period if expired.
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  try {
    await ensureSubscriptionStore();
    const storeFile = getSubscriptionStorePath();
    const content = await fs.readFile(storeFile, "utf-8");
    const store = JSON.parse(content || "{}") as Record<string, UserSubscription>;

    let subscription = store[userId];
    if (!subscription) {
      subscription = getDefaultSubscription(userId);
      store[userId] = subscription;
      await fs.writeFile(storeFile, JSON.stringify(store, null, 2));
      return subscription;
    }

    // Auto-reset period if expired
    const now = Math.floor(Date.now() / 1000);
    if (now >= subscription.currentPeriodEnd) {
      subscription.rendersUsedThisPeriod = 0;
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = now + 30 * 24 * 60 * 60;
      subscription.updatedAt = now;
      store[userId] = subscription;
      await fs.writeFile(storeFile, JSON.stringify(store, null, 2));
    }

    return subscription;
  } catch (error) {
    console.error("[subscription] Error loading subscription:", error);
    return getDefaultSubscription(userId);
  }
}

/**
 * Update user subscription.
 * Called by Stripe webhook handler.
 * TODO: When Stripe is fully integrated, this updates from webhook events.
 */
export async function updateUserSubscription(
  userId: string,
  updates: Partial<UserSubscription>
): Promise<UserSubscription> {
  try {
    await ensureSubscriptionStore();
    const storeFile = getSubscriptionStorePath();
    const content = await fs.readFile(storeFile, "utf-8");
    const store = JSON.parse(content || "{}") as Record<string, UserSubscription>;

    let subscription = store[userId] || getDefaultSubscription(userId);
    subscription = {
      ...subscription,
      ...updates,
      userId, // Always preserve userId
      updatedAt: Math.floor(Date.now() / 1000),
    };

    store[userId] = subscription;
    await fs.writeFile(storeFile, JSON.stringify(store, null, 2));
    return subscription;
  } catch (error) {
    console.error("[subscription] Error updating subscription:", error);
    throw error;
  }
}

/**
 * Check if billing is live (server-side only).
 * Returns true only if BILLING_LIVE is explicitly set to "true".
 */
export function isBillingLive(): boolean {
  return process.env.BILLING_LIVE === "true";
}

/**
 * Plan Entitlements - What features does this plan allow?
 */
export interface PlanEntitlements {
  planId: PlanId;
  rendersPerMonth: number;
  maxVideoLengthMinutes: number;
  exportQuality: "720p" | "1080p" | "4k";
  hasWatermark: boolean;
  queuePriority: "standard" | "priority" | "ultra";
  canExportWithoutWatermark: boolean;
}

/**
 * Get user entitlements based on subscription.
 * 
 * CRITICAL BILLING SAFETY:
 * - If BILLING_LIVE !== "true", ALWAYS return FREE plan
 * - If subscription.status is not "active" or "trialing", return FREE plan
 * - Otherwise return plan-based entitlements
 * 
 * This is the ONLY source of truth for feature access.
 */
export async function getUserEntitlements(userId: string): Promise<PlanEntitlements> {
  // SAFETY CHECK: If billing is not live, everyone gets FREE
  if (!isBillingLive()) {
    return {
      planId: "free",
      rendersPerMonth: 10,
      maxVideoLengthMinutes: 5,
      exportQuality: "720p",
      hasWatermark: true,
      queuePriority: "standard",
      canExportWithoutWatermark: false,
    };
  }

  // Get subscription from store
  const subscription = await getUserSubscription(userId);

  // If subscription is not active/trialing, downgrade to FREE
  const isActive =
    subscription.status === "active" || subscription.status === "trialing";
  
  if (!isActive || subscription.planId === "free") {
    return {
      planId: "free",
      rendersPerMonth: 10,
      maxVideoLengthMinutes: 5,
      exportQuality: "720p",
      hasWatermark: true,
      queuePriority: "standard",
      canExportWithoutWatermark: false,
    };
  }

  // Return entitlements based on actual plan
  switch (subscription.planId) {
    case "starter":
      return {
        planId: "starter",
        rendersPerMonth: 50,
        maxVideoLengthMinutes: 15,
        exportQuality: "1080p",
        hasWatermark: false,
        queuePriority: "standard",
        canExportWithoutWatermark: true,
      };
    case "creator":
      return {
        planId: "creator",
        rendersPerMonth: 200,
        maxVideoLengthMinutes: 30,
        exportQuality: "4k",
        hasWatermark: false,
        queuePriority: "priority",
        canExportWithoutWatermark: true,
      };
    case "studio":
      return {
        planId: "studio",
        rendersPerMonth: 999999, // Unlimited
        maxVideoLengthMinutes: 120,
        exportQuality: "4k",
        hasWatermark: false,
        queuePriority: "ultra",
        canExportWithoutWatermark: true,
      };
    default:
      // Fallback to FREE
      return {
        planId: "free",
        rendersPerMonth: 10,
        maxVideoLengthMinutes: 5,
        exportQuality: "720p",
        hasWatermark: true,
        queuePriority: "standard",
        canExportWithoutWatermark: false,
      };
  }
}

/**
 * Increment render usage for current period.
 * Only called after successful render completion.
 * Atomic operation (in production, use DB transaction).
 */
export async function incrementRenderUsage(userId: string): Promise<UserSubscription> {
  const subscription = await getUserSubscription(userId);
  return updateUserSubscription(userId, {
    rendersUsedThisPeriod: subscription.rendersUsedThisPeriod + 1,
  });
}

/**
 * Get demo user ID (for testing without real auth).
 * TODO: Replace with real authenticated user ID from session/token.
 */
export function getDemoUserId(): string {
  return "demo-user-default";
}

/**
 * Helper: Check if subscription is active (unlocked).
 * "active" and "trialing" are considered valid.
 */
export function isSubscriptionActive(subscription: UserSubscription): boolean {
  return subscription.status === "active" || subscription.status === "trialing";
}
