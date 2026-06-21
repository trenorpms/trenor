import React from 'react';
import { AuthView } from '../hooks/useAuthFlow';

interface CodeStepProps {
  onSwitchView: (target: AuthView) => void;
  onSubmit: (e: React.FormEvent) => void;
  inviteCode: string;
  setInviteCode: (val: string) => void;
  onSkip: () => void;
  role: 'landlord' | 'tenant';
  isLoading: boolean;
}

export default function CodeStep({
  onSwitchView,
  onSubmit,
  inviteCode,
  setInviteCode,
  onSkip,
  role,
  isLoading,
}: CodeStepProps) {
  return (
    <div className="w-full flex flex-col justify-center">
      <button
        type="button"
        onClick={() => onSwitchView('signup')}
        className="absolute top-0 left-0 text-xs font-medium text-ink-500 hover:text-warm-100 flex items-center gap-1.5 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back
      </button>

      <div className="mb-8 mt-8">
        <div className="w-12 h-12 bg-ink-950 border border-ink-800 rounded flex items-center justify-center text-coral-500 mb-6 shadow-sm">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 className="font-heading text-2xl lg:text-3xl font-semibold text-warm-50 tracking-tight">Enter Invite Code</h2>
        <p className="text-sm text-warm-300 mt-2">
          {role === 'tenant'
            ? 'Enter the 6-digit code provided by your landlord or property manager to link your account to a property. This is required to access the resident portal.'
            : 'Enter the 6-digit code to link your landlord account.'}
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <div className="relative w-full">
          <input
            type="text"
            maxLength={6}
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="XXXXXX"
            autoComplete="off"
            className="code-input w-full bg-ink-950 border border-ink-700 rounded py-4 text-2xl text-warm-50 uppercase placeholder-ink-700 focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500/30 transition-all shadow-inner text-center tracking-widest font-mono"
          />
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={inviteCode.length < 6 || isLoading}
            className={`w-full bg-coral-500 hover:bg-coral-600 text-ink-950 font-semibold text-sm py-3.5 rounded transition-all shadow-glow hover:shadow-glow-strong flex items-center justify-center gap-2 active:scale-95 ${
              inviteCode.length < 6 || isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <span>{isLoading ? 'Connecting Account...' : 'Connect Account'}</span>
            {!isLoading && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            )}
          </button>

          {role !== 'tenant' && (
            <button
              type="button"
              onClick={onSkip}
              className="w-full bg-transparent hover:bg-ink-800 border border-transparent hover:border-ink-700 text-ink-400 hover:text-warm-50 text-sm font-medium py-2.5 rounded transition-colors"
            >
              Skip for now
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
