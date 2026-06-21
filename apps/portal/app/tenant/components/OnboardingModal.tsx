'use client';

import React from 'react';

interface OnboardingModalProps {
  claimCode: string;
  setClaimCode: (val: string) => void;
  isClaimingCode: boolean;
  handleClaimCode: (e: React.FormEvent) => void;
  previewLoading: boolean;
  previewError: string | null;
  previewData: {
    propertyName: string;
    unit: string;
    managerName: string;
    totalAmount: number;
    invoices?: Array<{
      id: string;
      description: string;
      amount: number;
    }>;
  } | null;
  onLogout: () => void;
}

export default function OnboardingModal({
  claimCode,
  setClaimCode,
  isClaimingCode,
  handleClaimCode,
  previewLoading,
  previewError,
  previewData,
  onLogout,
}: OnboardingModalProps) {
  return (
    <div className="fixed inset-0 bg-ink-950/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-ink-900 border border-coral-500/30 rounded-[2px] shadow-[0_30px_60px_-15px_rgba(255,107,107,0.2)] flex flex-col relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-coral-500"></div>

        <div className="px-6 py-5 border-b border-ink-800 bg-ink-950 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded bg-coral-500/10 border border-coral-500/20 flex items-center justify-center text-coral-500 mb-3 font-mono font-bold text-lg">
            !
          </div>
          <h2 className="font-heading font-semibold text-warm-50 text-base">Connection Code Required</h2>
          <p className="text-xs text-ink-400 mt-1">
            Welcome to the resident portal. To continue, you must link your account to a property.
          </p>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <form onSubmit={handleClaimCode} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-mono text-ink-400 uppercase tracking-widest block mb-2 text-center">
                Enter Invitation Code
              </label>
              <input
                type="text"
                placeholder="6-DIGIT CODE"
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                className="cyber-input w-full p-3 text-sm text-center font-mono tracking-widest border border-ink-700 rounded-[2px] focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500/20"
                maxLength={6}
                required
              />
            </div>

            {previewLoading && (
              <div className="py-4 flex flex-col items-center justify-center gap-2 border border-ink-800 border-dashed rounded-[2px] bg-ink-950/40">
                <svg
                  className="animate-spin text-coral-500"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" stroke-dashoffset="10"></circle>
                </svg>
                <span className="text-[10px] font-mono text-ink-400 uppercase tracking-widest">
                  Retrieving property ledger...
                </span>
              </div>
            )}

            {previewError && (
              <div className="p-3 border border-coral-500/30 bg-coral-500/5 text-coral-400 text-xs font-mono rounded-[2px] text-center">
                {previewError}
              </div>
            )}

            {previewData && (
              <div className="bg-ink-950 border border-ink-800 rounded-[2px] p-4 flex flex-col gap-3">
                <div className="text-[9px] font-mono text-ink-500 uppercase tracking-widest border-b border-ink-800 pb-2">
                  Verify Connection Details
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-mono text-ink-500 uppercase tracking-widest">Property</span>
                  <span className="text-xs font-bold text-warm-50">{previewData.propertyName}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-ink-800 pt-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-ink-500 uppercase tracking-widest">Unit</span>
                    <span className="text-xs font-bold text-warm-50">{previewData.unit}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-ink-500 uppercase tracking-widest">Manager</span>
                    <span className="text-xs font-bold text-warm-50">{previewData.managerName}</span>
                  </div>
                </div>

                <div className="border-t border-ink-800 pt-2 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono text-ink-500 uppercase tracking-widest">Total Invoice</span>
                    <span className="text-xs font-mono font-bold text-coral-500">
                      $
                      {previewData.totalAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  {previewData.invoices && previewData.invoices.length > 0 && (
                    <div className="bg-ink-900 border border-ink-800 p-2 rounded-[2px] flex flex-col gap-1.5 max-h-24 overflow-y-auto">
                      {previewData.invoices.map((inv: any) => (
                        <div key={inv.id} className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-ink-400 truncate max-w-[150px]">{inv.description}</span>
                          <span className="text-warm-100">${inv.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isClaimingCode || !claimCode.trim() || !previewData}
              className={`w-full text-xs font-mono font-bold text-ink-950 bg-coral-500 hover:bg-coral-600 py-3 rounded-[2px] transition-colors uppercase tracking-widest flex items-center justify-center gap-2 ${
                !previewData || isClaimingCode ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isClaimingCode ? 'Connecting...' : 'Confirm and Connect'}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </form>

          <div className="border-t border-ink-800 pt-4 text-center">
            <button
              onClick={onLogout}
              className="text-[10px] font-mono text-ink-500 hover:text-warm-100 uppercase tracking-widest transition-colors bg-transparent border-none cursor-pointer"
            >
              Log Out of Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
