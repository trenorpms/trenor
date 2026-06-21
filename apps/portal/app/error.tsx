'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Captured UI crash:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#05080b] flex items-center justify-center p-6 text-[#f8f5ef] relative overflow-hidden font-body">
      {/* Glow effect */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-coral-500/5 blur-[130px] rounded-full pointer-events-none" />

      {/* Cyber grid */}
      <div className="bg-grid absolute inset-0 opacity-10 pointer-events-none" />

      <div className="relative z-10 max-w-md w-full bg-ink-900/60 border border-ink-800 backdrop-blur-md p-8 rounded-[4px] shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col items-center text-center">
        {/* Error Icon */}
        <div className="w-16 h-16 rounded-full bg-coral-500/10 border border-coral-500/30 flex items-center justify-center mb-6 text-coral-500">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        {/* Header */}
        <h1 className="font-heading text-lg font-semibold text-warm-50 mb-2">
          An Unexpected Error Occurred
        </h1>
        <p className="text-xs text-ink-400 mb-6 leading-relaxed">
          The portal application encountered a runtime issue. We have logged the trace and will investigate immediately.
        </p>

        {/* Optional Error Detail for Developers */}
        {error.message && (
          <div className="w-full text-left bg-ink-950/80 border border-ink-800 rounded p-4 mb-6 max-h-28 overflow-y-auto custom-scrollbar font-mono text-[9px] text-ink-500 break-all select-all">
            <span className="text-coral-400 font-bold block mb-1">EXCEPTION DIAGNOSTIC:</span>
            {error.message}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <button
            onClick={() => reset()}
            className="flex-1 text-xs font-mono font-bold text-ink-950 bg-coral-500 hover:bg-coral-600 px-5 py-3 rounded-[2px] transition-colors shadow-glow-coral uppercase tracking-widest"
          >
            Try Again
          </button>
          <Link
            href="/tenant/overview"
            className="flex-1 text-xs font-mono font-bold text-warm-100 hover:text-white bg-ink-850 hover:bg-ink-800 border border-ink-750 px-5 py-3 rounded-[2px] transition-colors uppercase tracking-widest flex items-center justify-center"
          >
            Dashboard
          </Link>
        </div>
      </div>

      <style jsx global>{`
        .bg-grid {
          background-size: 24px 24px;
          background-image: linear-gradient(to right, rgba(255, 107, 107, 0.02) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 107, 107, 0.02) 1px, transparent 1px);
        }
      `}</style>
    </div>
  );
}
