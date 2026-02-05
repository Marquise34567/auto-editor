'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

interface BillingStatus {
  plan: string;
  status: string;
  billingMode: string;
}

function SuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setStatus('error');
      return;
    }

    // Confirm the session with the backend
    const confirmSession = async () => {
      try {
        console.log('[billing-success] Confirming session:', sessionId);

        const response = await fetch('/api/stripe/confirm-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to confirm payment');
        }

        console.log('[billing-success] Session confirmed:', data);

        setBillingStatus({
          plan: data.plan,
          status: data.status,
          billingMode: data.billingMode,
        });
        setStatus('success');
      } catch (err) {
        console.error('[billing-success] Error:', err);
        const message = err instanceof Error ? err.message : 'Failed to confirm payment';
        setError(message);
        setStatus('error');
      }
    };

    confirmSession();
  }, [sessionId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#07090f] text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full border-4 border-white/20 border-t-blue-500 h-12 w-12 mb-4"></div>
          <p className="text-lg text-white/70">Confirming your payment...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#07090f] text-white overflow-x-hidden">
        {/* Background gradient blurs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-[-20%] h-130 w-130 -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-[120px]" />
          <div className="absolute right-[-10%] top-[20%] h-90 w-90 rounded-full bg-cyan-500/20 blur-[120px]" />
        </div>

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 lg:px-16 py-4 sm:py-6">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition">
            <Logo />
            <span className="text-base sm:text-lg font-semibold tracking-tight">AutoEditor</span>
          </Link>
        </header>

        {/* Error Content */}
        <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-100px)] px-4 sm:px-6">
          <div className="w-full max-w-md">
            <div className="rounded-2xl sm:rounded-3xl border border-red-500/50 bg-red-500/10 p-6 sm:p-8 shadow-xl backdrop-blur">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                  <span className="text-2xl">✕</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold mb-3">Payment Error</h1>
                <p className="text-white/70 mb-6">{error}</p>
                <div className="flex gap-3">
                  <Link
                    href="/pricing"
                    className="flex-1 rounded-full bg-white/10 border border-white/20 px-4 py-3 text-sm font-semibold hover:bg-white/20 transition"
                  >
                    Try Again
                  </Link>
                  <Link
                    href="/editor"
                    className="flex-1 rounded-full bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-white/90 transition"
                  >
                    Continue
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Success state
  const isPending = billingStatus?.status === 'pending';
  const isActive = billingStatus?.status === 'active';

  return (
    <div className="min-h-screen bg-[#07090f] text-white overflow-x-hidden">
      {/* Background gradient blurs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-20%] h-130 w-130 -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-[120px]" />
        <div className="absolute right-[-10%] top-[20%] h-90 w-90 rounded-full bg-cyan-500/20 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 lg:px-16 py-4 sm:py-6">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition">
          <Logo />
          <span className="text-base sm:text-lg font-semibold tracking-tight">AutoEditor</span>
        </Link>
      </header>

      {/* Success Content */}
      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-100px)] px-4 sm:px-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 shadow-xl backdrop-blur">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                <span className="text-4xl">✓</span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-semibold mb-3">
                Payment Successful!
              </h1>

              <p className="text-white/70 mb-6">
                Thank you for subscribing to the{' '}
                <span className="font-semibold text-white capitalize">{billingStatus?.plan}</span> plan.
              </p>

              {/* Status Badge */}
              {isPending && (
                <div className="mb-6 p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
                  <p className="text-sm text-yellow-200">
                    <strong>Status: Activation Pending</strong>
                  </p>
                  <p className="text-xs text-yellow-200/70 mt-2">
                    {billingStatus?.billingMode === 'soft' ? (
                      'Test mode: Use manual activation to unlock features'
                    ) : (
                      'Your subscription will be activated shortly'
                    )}
                  </p>
                </div>
              )}

              {isActive && (
                <div className="mb-6 p-4 rounded-lg border border-green-500/50 bg-green-500/10">
                  <p className="text-sm text-green-200">
                    <strong>Status: Active</strong>
                  </p>
                  <p className="text-xs text-green-200/70 mt-2">
                    Your subscription is now active. Start creating!
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <Link
                  href="/editor"
                  className="block w-full rounded-full bg-white px-6 py-3 text-sm font-semibold text-black shadow-lg shadow-white/10 transition hover:bg-white/90"
                >
                  Go to Editor
                </Link>
                <Link
                  href="/pricing"
                  className="block w-full rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold transition hover:bg-white/10"
                >
                  View Plans
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#07090f] text-white flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full border-4 border-white/20 border-t-blue-500 h-12 w-12"></div>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  );
}
