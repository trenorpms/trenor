import React from 'react';

interface ManagerCodeStepProps {
  onSubmitCode: (e: React.FormEvent) => void;
  onSkipCode: () => void;
  onBack: () => void;
  inviteToken: string;
  setInviteToken: (val: string) => void;
  isLoading: boolean;
}

export default function ManagerCodeStep({
  onSubmitCode,
  onSkipCode,
  onBack,
  inviteToken,
  setInviteToken,
  isLoading,
}: ManagerCodeStepProps) {
  return (
    <div className="w-full animate-in fade-in duration-200 relative">
      <button 
        type="button"
        onClick={onBack} 
        className="absolute -top-12 left-0 text-xs font-medium text-ink-500 hover:text-warm-100 flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Back
      </button>

      <div className="mb-6 mt-4">
        <div className="w-12 h-12 bg-ink-950 border border-ink-800 rounded flex items-center justify-center text-coral-500 mb-4 shadow-sm">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </div>
        <h2 className="font-heading text-2xl lg:text-3xl font-semibold text-warm-50 tracking-tight">Join or Setup</h2>
        <p className="text-sm text-warm-300 mt-2">Enter an invite code to join an existing team, or skip to set up a new portfolio.</p>
      </div>

      <form onSubmit={onSubmitCode} className="flex flex-col gap-5">
        <div className="relative w-full">
          <input 
            type="text" 
            maxLength={8} 
            placeholder="XXXXXX" 
            value={inviteToken}
            onChange={(e) => setInviteToken(e.target.value)}
            autoComplete="off"
            className="code-input w-full bg-ink-950 border border-ink-700 rounded py-3.5 text-2xl text-warm-50 uppercase placeholder-ink-700 focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500/30 transition-all shadow-inner text-center font-mono tracking-widest"
          />
        </div>
        
        <div className="flex flex-col gap-3">
          <button 
            type="submit" 
            disabled={isLoading || !inviteToken.trim()}
            className="w-full bg-coral-500 hover:bg-coral-600 disabled:opacity-50 disabled:cursor-not-allowed text-ink-950 font-semibold text-sm py-3.5 rounded transition-all shadow-glow hover:shadow-glow-strong flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <span>{isLoading ? 'Verifying Code...' : 'Join Existing Team'}</span>
            {!isLoading && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>}
          </button>

          <button 
            type="button" 
            onClick={onSkipCode}
            disabled={isLoading}
            className="w-full bg-transparent hover:bg-ink-800 border border-transparent hover:border-ink-700 text-ink-400 hover:text-warm-50 text-sm font-medium py-2.5 rounded transition-colors cursor-pointer"
          >
            {isLoading ? 'Setting up...' : 'Skip & Set up new'}
          </button>
        </div>
      </form>
    </div>
  );
}
