'use client';

import React from 'react';

interface TenantProfile {
  name: string;
  propertyName: string;
  unit: string;
}

interface SidebarProps {
  profile: TenantProfile | null;
  currentTab: string;
  activeInvoicesCount: number;
  activeTicketsCount: number;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export default function Sidebar({
  profile,
  currentTab,
  activeInvoicesCount,
  activeTicketsCount,
  onTabChange,
  onLogout,
}: SidebarProps) {
  return (
    <aside className="w-64 flex-shrink-0 border-r border-ink-800 bg-ink-950 flex flex-col z-20 shadow-2xl relative h-full">
      {/* Profile Header */}
      <div className="h-16 border-b border-ink-800 flex items-center px-4 flex-shrink-0">
        <div className="flex items-center gap-3 w-full">
          <div className="w-10 h-10 rounded border-2 border-ink-800 bg-ink-900 overflow-hidden flex-shrink-0">
            <img
              src={`https://api.dicebear.com/7.x/notionists/svg?seed=${profile?.name || 'Alex'}&backgroundColor=ff6b6b`}
              className="w-full h-full object-cover"
              alt="Profile Avatar"
            />
          </div>
          <div className="flex flex-col w-full pr-2 overflow-hidden">
            <span className="font-heading font-semibold text-sm tracking-tight text-warm-50 leading-none truncate">
              {profile?.name || 'Resident'}
            </span>
            <div className="font-mono text-[9px] text-ink-500 tracking-widest mt-1 flex items-center gap-1.5 w-full uppercase overflow-hidden">
              <svg className="flex-shrink-0" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="truncate flex-1">
                {profile?.propertyName || 'Not Connected'}, {profile?.unit || '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Nav Links */}
      <nav className="flex-1 overflow-y-auto py-5 px-2 flex flex-col gap-0.5 custom-scrollbar">
        <div className="text-[9px] font-semibold text-ink-600 uppercase tracking-widest mb-1 px-3 mt-2">
          Resident Portal
        </div>

        <button
          onClick={() => onTabChange('overview')}
          className={`nav-link w-full text-left flex items-center px-3 py-2 rounded-[2px] ${
            currentTab === 'overview' ? 'active text-warm-50' : 'text-warm-200'
          }`}
        >
          <svg className="sidebar-icon w-4 h-4 flex-shrink-0 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          <span className="text-xs font-medium">Dashboard</span>
        </button>

        <button
          onClick={() => onTabChange('payments')}
          className={`nav-link w-full text-left flex items-center px-3 py-2 rounded-[2px] ${
            currentTab === 'payments' ? 'active text-warm-50' : 'text-warm-200'
          }`}
        >
          <svg className="sidebar-icon w-4 h-4 flex-shrink-0 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span className="text-xs font-medium flex-grow text-left">Payments</span>
          {activeInvoicesCount > 0 && (
            <span className="text-[9px] bg-coral-500/10 text-coral-400 border border-coral-500/20 px-1 py-px rounded-[2px] font-mono font-bold">
              {activeInvoicesCount} DUE
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange('maintenance')}
          className={`nav-link w-full text-left flex items-center px-3 py-2 rounded-[2px] ${
            currentTab === 'maintenance' ? 'active text-warm-50' : 'text-warm-200'
          }`}
        >
          <svg className="sidebar-icon w-4 h-4 flex-shrink-0 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 9.36l-7.1 7.1a1 1 0 0 1-1.41 0l-1.41-1.41a1 1 0 0 1 0-1.41l7.1-7.1a6 6 0 0 1 9.36-7.94l-3.77 3.77z" />
          </svg>
          <span className="text-xs font-medium flex-grow text-left">Maintenance</span>
          {activeTicketsCount > 0 && (
            <span className="text-[9px] bg-coral-500/10 text-coral-400 border border-coral-500/20 px-1.5 py-px rounded-[2px] font-mono font-bold">
              {activeTicketsCount} OPEN
            </span>
          )}
        </button>

        <div className="text-[9px] font-semibold text-ink-600 uppercase tracking-widest mb-1 px-3 mt-5">
          Account
        </div>

        <button
          onClick={() => onTabChange('documents')}
          className={`nav-link w-full text-left flex items-center px-3 py-2 rounded-[2px] ${
            currentTab === 'documents' ? 'active text-warm-50' : 'text-warm-200'
          }`}
        >
          <svg className="sidebar-icon w-4 h-4 flex-shrink-0 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span className="text-xs font-medium">Documents & Lease</span>
        </button>

        <button
          onClick={() => onTabChange('settings')}
          className={`nav-link w-full text-left flex items-center px-3 py-2 rounded-[2px] ${
            currentTab === 'settings' ? 'active text-warm-50' : 'text-warm-200'
          }`}
        >
          <svg className="sidebar-icon w-4 h-4 flex-shrink-0 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="text-xs font-medium">Profile Settings</span>
        </button>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-ink-800 bg-ink-950 flex justify-between items-center">
        <span className="text-[10px] font-mono text-ink-500 uppercase">LEDGER: OK</span>
        <button
          onClick={onLogout}
          className="text-[10px] font-mono text-coral-500 hover:text-coral-400 font-bold transition-colors flex items-center gap-1.5"
        >
          LOGOUT
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
