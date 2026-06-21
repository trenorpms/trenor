import React from 'react';

interface RoleStepProps {
  onSelectRole: (role: 'manager' | 'contractor') => void;
  userName: string;
  userEmail: string;
  onLogout: () => void;
  isLoading: boolean;
}

export default function RoleStep({
  onSelectRole,
  userName,
  userEmail,
  onLogout,
  isLoading,
}: RoleStepProps) {
  return (
    <div className="w-full animate-in fade-in duration-200">
      <div className="mb-6">
        <h2 className="font-heading text-2xl lg:text-3xl font-semibold text-warm-50 tracking-tight">Choose your role</h2>
        <p className="text-sm text-warm-300 mt-2">Logged in as <strong className="text-white">{userName || 'Operator'}</strong> ({userEmail})</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Field Contractor Card (NO CODE ASKED) */}
        <button 
          onClick={() => onSelectRole('contractor')}
          disabled={isLoading}
          className="text-left p-5 bg-ink-950 border border-ink-700 hover:border-coral-500 rounded transition-all group flex items-start gap-4 cursor-pointer w-full"
        >
          <div className="w-10 h-10 rounded bg-ink-900 flex items-center justify-center text-ink-400 group-hover:text-coral-500 transition-colors shrink-0 border border-ink-800">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-warm-50 group-hover:text-coral-400 transition-colors">Field Contractor</h3>
            <p className="text-xs text-warm-300 mt-1 leading-relaxed">Resolve maintenance tickets, update repair logs, and coordinate jobs.</p>
          </div>
        </button>

        {/* Property Manager Card (OPTIONAL CODE IN NEXT STEP) */}
        <button 
          onClick={() => onSelectRole('manager')}
          disabled={isLoading}
          className="text-left p-5 bg-ink-950 border border-ink-700 hover:border-coral-500 rounded transition-all group flex items-start gap-4 cursor-pointer w-full"
        >
          <div className="w-10 h-10 rounded bg-ink-900 flex items-center justify-center text-ink-400 group-hover:text-coral-500 transition-colors shrink-0 border border-ink-800">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-warm-50 group-hover:text-coral-400 transition-colors">Property Manager</h3>
            <p className="text-xs text-warm-300 mt-1 leading-relaxed">Manage properties, tenants, automate billing, and coordinate dispatches.</p>
          </div>
        </button>
      </div>

      <div className="mt-8 pt-6 border-t border-ink-800/80 flex justify-between items-center text-xs">
        <button onClick={onLogout} className="text-ink-500 hover:text-warm-100 hover:underline cursor-pointer">
          Sign Out
        </button>
        <span className="text-ink-500 font-mono text-[10px]">OPERATIONS ROUTER</span>
      </div>
    </div>
  );
}
