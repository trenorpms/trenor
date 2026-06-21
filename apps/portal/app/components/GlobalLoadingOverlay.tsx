'use client';

import React from 'react';

interface GlobalLoadingOverlayProps {
  isVisible: boolean;
  theme?: 'light' | 'dark';
  message?: string;
}

export default function GlobalLoadingOverlay({
  isVisible,
  theme = 'dark',
  message = 'Processing request...',
}: GlobalLoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-all duration-300 backdrop-blur-md ${
        theme === 'light'
          ? 'bg-white/70 text-ink-950'
          : 'bg-[#05080b]/80 text-[#f8f5ef]'
      }`}
    >
      {/* Glow effect matching theme */}
      <div
        className={`absolute w-80 h-80 rounded-full blur-[80px] pointer-events-none opacity-40 animate-pulse ${
          theme === 'light' ? 'bg-coral-400/25' : 'bg-coral-500/10'
        }`}
      />

      {/* Main glassmorphic card */}
      <div
        className={`relative z-10 flex flex-col items-center p-8 rounded-lg shadow-2xl border backdrop-blur-lg max-w-sm w-full mx-4 transition-all duration-300 ${
          theme === 'light'
            ? 'bg-white/80 border-coral-200/50 shadow-coral-100/50'
            : 'bg-[#0c0d12]/90 border-ink-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
        }`}
      >
        {/* Animated Cyber Ring / Spinner */}
        <div className="relative w-16 h-16 mb-5 flex items-center justify-center">
          {/* Inner ring */}
          <div
            className={`absolute inset-1 rounded-full border-2 border-dashed animate-[spin_8s_linear_infinite] ${
              theme === 'light' ? 'border-ink-200' : 'border-ink-800'
            }`}
          />
          {/* Outer glowing track */}
          <div
            className={`absolute inset-0 rounded-full border-t-2 border-r-2 border-coral-500 animate-spin`}
          />
          {/* Central status dot */}
          <div className="w-2.5 h-2.5 bg-coral-500 rounded-full animate-ping" />
        </div>

        {/* Status Message */}
        <h3
          className={`font-heading text-sm font-semibold tracking-wider uppercase mb-1 ${
            theme === 'light' ? 'text-ink-950' : 'text-warm-50'
          }`}
        >
          {message}
        </h3>
        <p
          className={`text-[10px] font-mono tracking-widest ${
            theme === 'light' ? 'text-ink-500' : 'text-ink-400'
          }`}
        >
          TRENOR SECURE PORT
        </p>

        {/* Micro-animation scanner line */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-coral-500/20 overflow-hidden rounded-b-lg">
          <div className="h-full bg-coral-500 w-1/3 rounded animate-[sweep_2s_ease-in-out_infinite]" />
        </div>
      </div>

      <style jsx global>{`
        @keyframes sweep {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(300%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
