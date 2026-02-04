import { NextResponse } from "next/server";
import { getUserSubscription, getDemoUserId } from "@/lib/server/subscription";
import { getPlan } from "@/config/plans";

export const runtime = "nodejs";

/**
 * GET /api/billing/status
 *
 * Returns the server-truth subscription status + plan entitlements.
 * Frontend calls this on load to know what features are available.
 *
 * Response:
 * {
 *   ok: true,
 *   userId: string,
 *   planId: "free" | "starter" | "creator" | "studio",
 *   subscriptionStatus: "active" | "past_due" | "canceled" | ...,
 *   rendersRemaining: number,
 *   maxVideoMinutes: number,
 *   maxExportQuality: "720p" | "1080p" | "4k",
 *   watermarkRequired: boolean,
 *   queuePriority: "standard" | "priority" | "ultra",
 *   periodEndUnix: number,
 *   periodEndDate: string (ISO),
 *   periodDaysRemaining: number,
 *   canRender: boolean,
 *   message: string (e.g., "Free plan: 7 renders left")
 * }
 */
export async function GET(request: Request) {
  try {
    // TODO: Get real userId from auth session
    const userId = getDemoUserId();

    const subscription = await getUserSubscription(userId);
    const plan = getPlan(subscription.planId);

    // Determine if user can render
    const isActive =
      subscription.status === "active" || subscription.status === "trialing";
    const canRender =
      isActive &&
      (plan.features.rendersPerMonth >= 999999 ||
        subscription.rendersUsedThisPeriod <
          plan.features.rendersPerMonth);

    // Calculate period info
    const now = Math.floor(Date.now() / 1000);
    const periodDaysRemaining = Math.max(
      0,
      Math.ceil((subscription.currentPeriodEnd - now) / (24 * 60 * 60))
    );
    const rendersRemaining = Math.max(
      0,
      plan.features.rendersPerMonth >= 999999
        ? 999999
        : plan.features.rendersPerMonth -
            subscription.rendersUsedThisPeriod
    );

    // Human-readable message
    let message = "";
    if (!isActive) {
      message = `${plan.name} plan: ${subscription.status}. Downgraded to Free.`;
    } else if (plan.features.rendersPerMonth >= 999999) {
      message = `${plan.name} plan: Unlimited renders`;
    } else {
      message = `${plan.name} plan: ${rendersRemaining}/${plan.features.rendersPerMonth} renders left this period`;
    }

    return NextResponse.json({
      ok: true,
      userId,
      planId: isActive ? subscription.planId : "free",
      subscriptionStatus: subscription.status,
      rendersUsedThisPeriod: subscription.rendersUsedThisPeriod,
      rendersRemaining,
      maxVideoMinutes: plan.features.maxVideoLengthMinutes,
      maxExportQuality: plan.features.exportQuality,
      watermarkRequired: plan.features.hasWatermark,
      queuePriority: plan.features.queuePriority,
      periodStartUnix: subscription.currentPeriodStart,
      periodEndUnix: subscription.currentPeriodEnd,
      periodEndDate: new Date(
        subscription.currentPeriodEnd * 1000
      ).toISOString(),
      periodDaysRemaining,
      canRender,
      message,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[billing-status] Error:", errorMsg, error);
    
    // Always return valid JSON, even on error (non-blocking)
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to get billing status",
        message: "Please refresh the page",
        debug: process.env.NODE_ENV === "development" ? errorMsg : undefined,
      },
      { status: 500 }
    );
  }
}
