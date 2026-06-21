'use client';

import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-ink-950 p-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-20 z-0"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-coral-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="flex flex-col items-center gap-6 z-10 max-w-sm w-full text-center">
        {/* Glowing Spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-coral-500/20"></div>
          <div className="absolute inset-0 rounded-full border-2 border-t-coral-500 border-r-coral-500 animate-spin"></div>
          <div className="absolute inset-0 w-full h-full rounded-full bg-coral-500/10 blur-[8px] animate-pulse"></div>
        </div>

        {/* Shimmering Text & Branding */}
        <div className="space-y-2 mt-2">
          <h2 className="text-sm font-mono tracking-[0.2em] uppercase text-coral-500 font-bold animate-pulse">
            Trenor
          </h2>
          <p className="text-xs text-warm-300 font-mono">
            Loading details...
          </p>
        </div>

        {/* Premium Progress Bar Indicator */}
        <div className="w-48 h-1 bg-ink-800 rounded-full overflow-hidden mt-4 border border-ink-700/50">
          <div className="h-full bg-gradient-to-r from-coral-500 to-amber-500 w-3/4 animate-pulse rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
