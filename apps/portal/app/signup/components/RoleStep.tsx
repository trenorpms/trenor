import React from 'react';
import { AuthView } from '../hooks/useAuthFlow';

interface RoleStepProps {
  onSwitchView: (target: AuthView) => void;
  onSelectRole: (role: 'landlord' | 'tenant') => void;
}

export default function RoleStep({ onSwitchView, onSelectRole }: RoleStepProps) {
  const handleSelect = (selectedRole: 'landlord' | 'tenant') => {
    onSelectRole(selectedRole);
    if (selectedRole === 'tenant') {
      onSwitchView('tenant-code');
    } else {
      onSwitchView('manager-code');
    }
  };

  return (
    <>
      {/* Back Button to Signup */}
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

      <div className="mb-6 mt-8">
        <h2 className="font-heading text-2xl lg:text-3xl font-semibold text-warm-50 tracking-tight">Choose your role</h2>
        <p className="text-sm text-warm-300 mt-2">How will you use the platform?</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Resident Card */}
        <button
          type="button"
          onClick={() => handleSelect('tenant')}
          className="text-left p-5 bg-ink-950 border border-ink-700 hover:border-coral-500 rounded transition-all group flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded bg-ink-900 flex items-center justify-center text-ink-400 group-hover:text-coral-500 transition-colors shrink-0 border border-ink-800">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-warm-50 group-hover:text-coral-400 transition-colors">Resident</h3>
            <p className="text-xs text-warm-300 mt-1 leading-relaxed">Pay rent, submit maintenance requests, and message property management.</p>
          </div>
        </button>

        {/* Property Manager Card */}
        <button
          type="button"
          onClick={() => handleSelect('landlord')}
          className="text-left p-5 bg-ink-950 border border-ink-700 hover:border-coral-500 rounded transition-all group flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded bg-ink-900 flex items-center justify-center text-ink-400 group-hover:text-coral-500 transition-colors shrink-0 border border-ink-800">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
              <path d="M9 22v-4h6v4" />
              <path d="M8 6h.01" />
              <path d="M16 6h.01" />
              <path d="M12 6h.01" />
              <path d="M12 10h.01" />
              <path d="M12 14h.01" />
              <path d="M16 10h.01" />
              <path d="M16 14h.01" />
              <path d="M8 10h.01" />
              <path d="M8 14h.01" />
            </svg>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-warm-50 group-hover:text-coral-400 transition-colors">Property Manager</h3>
            <p className="text-xs text-warm-300 mt-1 leading-relaxed">Manage properties, tenants, automate billing, and deploy AI agents.</p>
          </div>
        </button>
      </div>
    </>
  );
}
