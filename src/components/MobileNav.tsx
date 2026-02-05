'use client';

import { useState } from 'react';

import { Logo } from './Logo';
import { BetaBadge } from './BetaBadge';

/**
 * MobileNav - Responsive navigation component
 * 
 * Desktop: Horizontal navigation with links
 * Mobile: Hamburger menu with slide-out drawer
 */
export function MobileNav({ children }: { children?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Desktop Navigation - Hidden on mobile */}
      <nav className="hidden lg:flex items-center gap-8 text-sm text-white/70">
        {children}
      </nav>

      {/* Mobile Menu Button - Visible on mobile only */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden flex flex-col gap-1.5 w-6 h-6 justify-center"
        aria-label="Toggle menu"
      >
        <span className={`w-full h-0.5 bg-white transition-all ${isOpen ? 'rotate-45 translate-y-2' : ''}`} />
        <span className={`w-full h-0.5 bg-white transition-all ${isOpen ? 'opacity-0' : ''}`} />
        <span className={`w-full h-0.5 bg-white transition-all ${isOpen ? '-rotate-45 -translate-y-2' : ''}`} />
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-[#0a0c12] border-l border-white/10 z-50 transition-transform duration-300 lg:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col p-6 gap-6">
          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="self-end text-white/70 hover:text-white"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Navigation Links */}
          <div className="flex flex-col gap-4">
            <a
              href="#features"
              className="text-white/70 hover:text-white transition text-base py-2"
              onClick={() => setIsOpen(false)}
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-white/70 hover:text-white transition text-base py-2"
              onClick={() => setIsOpen(false)}
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="text-white/70 hover:text-white transition text-base py-2"
              onClick={() => setIsOpen(false)}
            >
              FAQ
            </a>
            <div className="border-t border-white/10 pt-4 mt-2">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
