'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  const goBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen bg-[#05080b] flex items-center justify-center p-6 text-[#f8f5ef] relative overflow-hidden font-body">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-coral-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-ink-800/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Cyber Grid Pattern */}
      <div className="bg-grid absolute inset-0 opacity-10 pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full text-center flex flex-col items-center bg-ink-900/40 border border-ink-800 backdrop-blur-md p-10 rounded-[4px] shadow-2xl">
        {/* Error Code */}
        <div className="font-mono text-7xl font-bold text-coral-500 mb-4 tracking-tighter">
          404
        </div>

        {/* Message */}
        <h1 className="font-heading text-xl font-semibold mb-3 tracking-tight">
          Page Not Found
        </h1>
        <p className="text-xs text-ink-400 mb-8 leading-relaxed max-w-sm">
          The node or resource you are looking for has either been relocated, removed, or is temporarily inaccessible.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3.5 w-full justify-center">
          <button
            onClick={goBack}
            className="flex-1 text-xs font-mono font-bold text-warm-100 hover:text-white uppercase tracking-widest bg-ink-850 hover:bg-ink-800 border border-ink-750 px-5 py-3 rounded-[2px] transition-colors"
          >
            ← GO BACK
          </button>
          <Link
            href="/tenant/overview"
            className="flex-1 text-xs font-mono font-bold text-ink-950 bg-coral-500 hover:bg-coral-600 px-5 py-3 rounded-[2px] transition-colors shadow-glow-coral flex items-center justify-center uppercase tracking-widest"
          >
            RESIDENT PORTAL
          </Link>
        </div>

        {/* Support Link */}
        <div className="mt-8 pt-6 border-t border-ink-800 w-full flex justify-between items-center text-[10px] font-mono text-ink-500">
          <span>PORT STATUS: ACTIVE</span>
          <Link href="/login" className="hover:text-coral-400 transition-colors uppercase">
            SIGN IN
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
