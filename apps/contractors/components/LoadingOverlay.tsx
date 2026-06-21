'use client';

import React from 'react';

interface LoadingOverlayProps {
  message?: string;
  active: boolean;
}

export default function LoadingOverlay({ message = 'Loading...', active }: LoadingOverlayProps) {
  if (!active) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[9999] flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-full border-2 border-[var(--accent-coral)]/20 border-t-[var(--accent-coral)] animate-spin mb-2" />
      <span className="font-heading text-xs font-semibold text-[var(--text-primary)] tracking-wider uppercase animate-pulse">
        {message}
      </span>
    </div>
  );
}
