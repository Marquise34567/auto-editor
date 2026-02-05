'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PLANS, getAnnualDiscount, formatPrice, getMonthlyEquivalent, type PlanId } from '@/config/plans';
import { Logo } from '@/components/Logo';
import { UserNav } from '@/components/UserNav';
import { createCheckoutUrl, storeReturnTo, getCurrentPath } from '@/lib/client/returnTo';
import { ErrorBoundary } from '@/components/ErrorBoundary';

type BillingPeriod = 'monthly' | 'annual';

function PricingPageContent() {
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [billingLive, setBillingLive] = useState<boolean | null>(null);

  // Check if billing is live
  useEffect(() => {
    fetch('/api/billing/status')
      .then(res => res.json())
      .then(data => {
        if (data.ok && typeof data.billingLive === 'boolean') {
          setBillingLive(data.billingLive);
          console.log('[PricingPage] Billing live status:', data.billingLive);
        }
      })
      .catch(err => {
        console.error('[PricingPage] Failed to check billing status:', err);
        setBillingLive(false); // Default to disabled on error
      });
  }, []);

  // Verify pricing page mounted
  useEffect(() => {
    setIsClient(true);
    const planCount = Object.keys(PLANS).length;
    console.log('[PricingPage] Mounted, plans loaded:', planCount);
    if (planCount === 0) {
      console.warn('[PricingPage] WARNING: No plans loaded!');
    }
  }, []);

  const handleUpgrade = (planId: string) => {
    try {
      const currentPath = getCurrentPath();
      storeReturnTo(currentPath);
      const checkoutUrl = createCheckoutUrl(planId, billingPeriod, currentPath);
      router.push(checkoutUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to process checkout: ${msg}`);
    }
  };

  const plans = Object.values(PLANS);
  const plansByPrice = plans.sort((a, b) => a.monthlyPriceCents - b.monthlyPriceCents);

  // Debug info (visible in dev mode)
  const debugInfo = process.env.NODE_ENV === 'development' ? {
    plansLoaded: plans.length,
    timestamp: new Date().toISOString(),
    isClient,
  } : null;

  return (
    <div className="min-h-screen bg-[#07090f] text-white">
      {/* Background gradient blurs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-20%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-[120px]" />
        <div className="absolute right-[-10%] top-[20%] h-[360px] w-[360px] rounded-full bg-cyan-500/20 blur-[120px]" />
      </div>

      {/* Debug Banner (Dev Only) */}
      {debugInfo && (
        <div className="fixed top-0 left-0 right-0 bg-blue-950/70 text-blue-200 px-4 py-2 text-xs z-40 border-b border-blue-500/20">
          <span>🐛 DEV: {debugInfo.plansLoaded} plans | {debugInfo.isClient ? '✓' : '⏳'} client ready</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white px-4 py-3 text-center z-50 mt-10">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-4 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Billing Disabled Banner */}
      {billingLive === false && (
        <div className="fixed top-0 left-0 right-0 bg-amber-600/90 text-white px-4 py-3 text-center z-50 mt-10 border-b border-amber-400/30">
          <span className="font-medium">🔒 Billing is not active yet.</span>
          <span className="ml-2 text-white/90">No charges will be made. All users are on the Free plan.</span>
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 lg:px-16">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
          <Logo />
          <span className="text-lg font-semibold tracking-tight">AutoEditor</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-white/70 lg:flex">
          <UserNav />
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-20 lg:px-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg text-white/70 max-w-2xl mx-auto">
            Scale as your channel grows. Start free, upgrade when you need more.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-4 bg-white/5 rounded-full p-1 border border-white/10">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-8 py-2 rounded-full font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-black'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-8 py-2 rounded-full font-medium transition-all relative ${
                billingPeriod === 'annual'
                  ? 'bg-white text-black'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Annual
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold bg-emerald-500 text-white px-2 py-1 rounded whitespace-nowrap">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto mb-16">
          {plansByPrice.map((plan) => {
            const price = billingPeriod === 'monthly' ? plan.monthlyPriceCents : plan.annualPriceCents;
            const displayPrice = formatPrice(price);
            const monthlyEquivalent = billingPeriod === 'annual' && price > 0 ? getMonthlyEquivalent(price) : null;
            const discount = billingPeriod === 'annual' && price > 0 ? getAnnualDiscount(plan.monthlyPriceCents, plan.annualPriceCents) : 0;

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl border transition-all overflow-visible ${
                  plan.highlighted
                    ? 'border-blue-500/40 bg-white/10 scale-105'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/7'
                }`}
              >
                {/* Most Popular Badge */}
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-blue-500/20 border border-blue-500/40 text-blue-200 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      Popular
                    </span>
                  </div>
                )}

                <div className="p-6">
                  {/* Plan Name & Description */}
                  <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                  <p className="text-white/60 text-sm mb-6">{plan.description}</p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-3xl font-semibold text-white">
                        {price === 0 ? 'Free' : displayPrice}
                      </span>
                      {price > 0 && (
                        <span className="text-white/60 text-sm">
                          /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      )}
                    </div>
                    {monthlyEquivalent && (
                      <p className="text-xs text-white/50">{monthlyEquivalent}/month when billed annually</p>
                    )}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={billingLive === false && price > 0}
                    className={`w-full py-2.5 rounded-full font-semibold text-sm transition-all mb-6 ${
                      plan.highlighted
                        ? 'bg-white text-black shadow-lg shadow-white/10 hover:bg-white/90'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                    } ${billingLive === false && price > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {billingLive === false && price > 0 ? 'Coming Soon' : plan.ctaText}
                  </button>

                  {/* Features - Condensed */}
                  <div className="space-y-2 text-sm">
                    {/* Renders */}
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 flex-shrink-0 mt-0.5">✓</span>
                      <div className="text-white/70">
                        {plan.features.rendersPerMonth >= 999999
                          ? 'Unlimited renders'
                          : `${plan.features.rendersPerMonth} renders/month`}
                      </div>
                    </div>

                    {/* Max Video Length */}
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 flex-shrink-0 mt-0.5">✓</span>
                      <div className="text-white/70">
                        {plan.features.maxVideoLengthMinutes >= 999
                          ? 'Unlimited video length'
                          : `Up to ${plan.features.maxVideoLengthMinutes} min videos`}
                      </div>
                    </div>

                    {/* Export Quality */}
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 flex-shrink-0 mt-0.5">✓</span>
                      <div className="text-white/70">
                        {plan.features.exportQuality === '4k' ? '4K' : plan.features.exportQuality} quality
                      </div>
                    </div>

                    {/* Watermark */}
                    <div className="flex items-start gap-2">
                      {plan.features.hasWatermark ? (
                        <span className="text-white/40 flex-shrink-0 mt-0.5">✗</span>
                      ) : (
                        <span className="text-emerald-400 flex-shrink-0 mt-0.5">✓</span>
                      )}
                      <div className="text-white/70">
                        {plan.features.hasWatermark ? 'Watermark' : 'No watermark'}
                      </div>
                    </div>

                    {/* Queue Priority */}
                    {plan.features.queuePriority !== 'background' && (
                      <div className="flex items-start gap-2">
                        <span className="text-blue-400 flex-shrink-0 mt-0.5">✓</span>
                        <div className="text-white/70">
                          {plan.features.queuePriority === 'standard'
                            ? 'Standard speed'
                            : plan.features.queuePriority === 'priority'
                            ? 'Priority queue'
                            : 'Ultra priority'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Billing Note */}
        <div className="text-center text-white/70 text-sm mb-16">
          <p>All plans include access to retention-first editing, hook detection, silence removal, and pacing analysis.</p>
          <p className="mt-2">
            Need more? Email{' '}
            <a href="mailto:sales@auto-editor.ai" className="text-white hover:text-white/80 underline">
              sales@auto-editor.ai
            </a>{' '}
            for custom enterprise plans.
          </p>
        </div>

        {/* Feature Comparison Table */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-semibold text-white mb-8 text-center">Feature Comparison</h2>
          <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-6 text-white/70 font-semibold">Feature</th>
                  {plansByPrice.map((plan) => (
                    <th key={plan.id} className="text-center py-4 px-6 text-white font-semibold">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-6 text-white/70">Renders per month</td>
                  {plansByPrice.map((plan) => (
                    <td key={plan.id} className="text-center py-4 px-6 text-white/80">
                      {plan.features.rendersPerMonth >= 999999 ? '∞' : plan.features.rendersPerMonth}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-6 text-white/70">Max video length</td>
                  {plansByPrice.map((plan) => (
                    <td key={plan.id} className="text-center py-4 px-6 text-white/80">
                      {plan.features.maxVideoLengthMinutes >= 999 ? '∞' : `${plan.features.maxVideoLengthMinutes}m`}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-6 text-white/70">Export quality</td>
                  {plansByPrice.map((plan) => (
                    <td key={plan.id} className="text-center py-4 px-6 text-white/80">
                      {plan.features.exportQuality === '4k' ? '4K' : plan.features.exportQuality}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-6 text-white/70">No watermark</td>
                  {plansByPrice.map((plan) => (
                    <td key={plan.id} className="text-center py-4 px-6">
                      {plan.features.hasWatermark ? (
                        <span className="text-white/40">—</span>
                      ) : (
                        <span className="text-emerald-400 text-lg">✓</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-6 text-white/70">Priority queue</td>
                  {plansByPrice.map((plan) => (
                    <td key={plan.id} className="text-center py-4 px-6">
                      {plan.features.queuePriority === 'background' ? (
                        <span className="text-white/40">—</span>
                      ) : (
                        <span className="text-emerald-400 text-lg">✓</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-6 text-white/70">Batch uploads</td>
                  {plansByPrice.map((plan) => (
                    <td key={plan.id} className="text-center py-4 px-6 text-white/80">
                      {plan.features.batchUploadSize === 1 ? '—' : plan.features.batchUploadSize >= 999 ? '∞' : plan.features.batchUploadSize}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-6 text-white/70">Advanced retention</td>
                  {plansByPrice.map((plan) => (
                    <td key={plan.id} className="text-center py-4 px-6">
                      {plan.features.advancedRetention ? (
                        <span className="text-emerald-400 text-lg">✓</span>
                      ) : (
                        <span className="text-white/40">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-6 text-white/70">API access</td>
                  {plansByPrice.map((plan) => (
                    <td key={plan.id} className="text-center py-4 px-6">
                      {plan.features.apiAccess ? (
                        <span className="text-emerald-400 text-lg">✓</span>
                      ) : (
                        <span className="text-white/40">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Back Links */}
        <div className="text-center mt-16 space-y-2">
          <p>
            <Link
              href="/"
              className="text-white/70 hover:text-white transition underline"
            >
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function PricingPage() {
  return (
    <ErrorBoundary>
      <PricingPageContent />
    </ErrorBoundary>
  );
}
