'use client';

import React from 'react';

interface TenantProfile {
  unit: string;
  propertyName?: string;
  leaseStartDate?: string;
}

interface DocumentsTabProps {
  profile: TenantProfile | null;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function DocumentsTab({ profile, addToast }: DocumentsTabProps) {
  return (
    <div className="flex flex-col p-4 md:p-6 lg:p-8 relative z-10 min-h-full max-w-5xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b border-ink-800 pb-5">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-warm-50 tracking-tight">
            Documents & Lease Agreements
          </h1>
          <p className="text-xs font-mono text-ink-400 mt-1.5">
            Access executed contracts, house rules, and community resources.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {/* Document Card 1 */}
        <div className="ops-card bg-ink-900 border border-ink-800 rounded-[2px] p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ink-950 border border-ink-800 rounded-[2px] flex items-center justify-center text-coral-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div>
              <h4 className="font-heading font-semibold text-warm-50 text-sm">
                Lease_Agreement_{profile?.propertyName?.replace(/\s+/g, '_') || 'Property'}_Unit_{profile?.unit || 'N_A'}.pdf
              </h4>
              <span className="text-[10px] font-mono text-ink-500 uppercase tracking-widest">
                2.4 MB • Executed {profile?.leaseStartDate || 'Jan 1, 2026'}
              </span>
            </div>
          </div>
          <button
            onClick={() => addToast('File download started', 'success')}
            className="text-ink-500 hover:text-warm-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>

        {/* Document Card 2 */}
        <div className="ops-card bg-ink-900 border border-ink-800 rounded-[2px] p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ink-950 border border-ink-800 rounded-[2px] flex items-center justify-center text-coral-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div>
              <h4 className="font-heading font-semibold text-warm-50 text-sm">
                Building_Rules_{profile?.propertyName?.replace(/\s+/g, '_') || 'Property'}.pdf
              </h4>
              <span className="text-[10px] font-mono text-ink-500 uppercase tracking-widest">
                1.1 MB • Updated {profile?.leaseStartDate || 'Jan 1, 2026'}
              </span>
            </div>
          </div>
          <button
            onClick={() => addToast('File download started', 'success')}
            className="text-ink-500 hover:text-warm-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
