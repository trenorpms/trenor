'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface EmptyPanelProps {
  tabname: string;
}

export default function EmptyPanel({ tabname }: EmptyPanelProps) {
  const router = useRouter();

  return (
    <div className="flex-col items-center justify-center p-4 md:p-6 lg:p-8 relative z-10 min-h-full w-full flex">
      <div className="max-w-md w-full border border-[var(--border-muted)] border-dashed rounded-lg bg-[var(--bg-secondary)]/30 backdrop-blur-sm flex flex-col items-center justify-center text-center p-10 transition-all hover:bg-[var(--bg-secondary)]/50">
        
        <div className="w-12 h-12 bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded mb-4 flex items-center justify-center text-[var(--text-tertiary)] relative overflow-hidden">
          <div className="absolute inset-0 bg-[var(--accent-coral-muted)] animate-pulse"></div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
        </div>

        <h2 className="font-heading text-xl font-medium text-[var(--text-primary)] mb-2 capitalize">
          {tabname} Module Standby
        </h2>
        <p className="text-sm text-[var(--text-tertiary)] mb-6 max-w-[280px]">
          This operational layer is currently in standby mode. Deploy Aura to synchronize state.
        </p>

        <button 
          onClick={() => router.push('/manager/terminal')} 
          className="bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-strong)] text-xs font-bold px-4 py-2 rounded transition-colors cursor-pointer"
        >
          Open Terminal
        </button>

      </div>
    </div>
  );
}
