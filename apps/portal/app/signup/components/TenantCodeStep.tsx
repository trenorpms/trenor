import React from 'react';
import { AuthView } from '../hooks/useAuthFlow';

interface TenantCodeStepProps {
  onSwitchView: (target: AuthView) => void;
  onSubmit: (e: React.FormEvent) => void;
  inviteCode: string;
  setInviteCode: (val: string) => void;
  isLoading: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function TenantCodeStep({
  onSwitchView,
  onSubmit,
  inviteCode,
  setInviteCode,
  isLoading,
  inputRef,
}: TenantCodeStepProps) {
  return (
    <>
      <button
        type="button"
        onClick={() => onSwitchView('role')}
        className="absolute top-0 left-0 text-xs font-medium text-ink-500 hover:text-warm-100 flex items-center gap-1.5 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Change Role
      </button>

      <div className="mb-6 mt-8">
        <div className="w-12 h-12 bg-ink-950 border border-ink-800 rounded flex items-center justify-center text-coral-500 mb-6 shadow-sm">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
        </div>
        <h2 className="font-heading text-2xl lg:text-3xl font-semibold text-warm-50 tracking-tight">Enter Invite Code</h2>
        <p className="text-sm text-warm-300 mt-2">Enter the 6-digit code provided by your landlord to link your account to a property.</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <div className="relative w-full">
          <input
            type="text"
            ref={inputRef}
            maxLength={6}
            required
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="XXXXXX"
            autoComplete="off"
            className="code-input w-full bg-ink-950 border border-ink-700 rounded py-4 text-2xl text-warm-50 uppercase placeholder-ink-700 focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500/30 transition-all shadow-inner"
          />
        </div>
        <button
          type="submit"
          className={`w-full bg-coral-500 hover:bg-coral-600 text-ink-950 font-semibold text-sm py-3.5 rounded transition-all shadow-glow hover:shadow-glow-strong flex items-center justify-center gap-2 active:scale-95 ${
            isLoading ? 'loading-sweep opacity-80 cursor-wait' : ''
          }`}
        >
          <span>{isLoading ? 'Verifying Code...' : 'Connect Account'}</span>
          {!isLoading && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          )}
        </button>
      </form>
    </>
  );
}
