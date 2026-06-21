'use client';

import React from 'react';

interface TenantProfile {
  name: string;
  rent: string;
  propertyName?: string;
  unit?: string;
  managerName?: string;
  managerEmail?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  leaseTerm?: string;
}

interface Invoice {
  invoiceId: string;
  propertyName: string;
  unitNumber: string;
  amountDue: number;
  status: string;
}

interface Ticket {
  id: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  status: string;
  createdAt: string;
}

interface OverviewTabProps {
  profile: TenantProfile | null;
  activeInvoices: Invoice[];
  activeTickets: Ticket[];
  outstandingTotal: number;
  onTabChange: (tab: string) => void;
}

export default function OverviewTab({
  profile,
  activeInvoices,
  activeTickets,
  outstandingTotal,
  onTabChange,
}: OverviewTabProps) {
  return (
    <div className="tab-panel active flex-col p-4 md:p-6 lg:p-8 relative z-10 min-h-full max-w-5xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b border-ink-800 pb-5">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-warm-50 tracking-tight">
            Welcome Back, {profile?.name || 'Resident'}
          </h1>
          <p className="text-xs font-mono text-ink-400 mt-1.5">
            Property details, lease status, and quick actions.
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Property & Lease Card */}
        <div className="lg:col-span-2 ops-card bg-ink-900 border border-ink-800 rounded-[2px] p-6 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 left-0 w-1 h-full bg-ink-700"></div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-warm-50 mb-1 pl-2">
              {profile?.propertyName || 'Not Connected to Property'}
            </h3>
            <div className="text-[10px] font-mono text-ink-500 uppercase tracking-widest pl-2 mb-6">
              Unit {profile?.unit || '—'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-ink-950/50 border border-ink-800 p-4 rounded-[2px] mt-auto">
            <div>
              <div className="text-[9px] font-mono text-ink-500 uppercase tracking-widest mb-1">
                Lease Term
              </div>
              <div className="text-sm font-mono text-warm-100 font-bold">{profile?.leaseTerm || '12 Months'}</div>
            </div>
            <div>
              <div className="text-[9px] font-mono text-ink-500 uppercase tracking-widest mb-1">
                Expiration Date
              </div>
              <div className="text-sm font-mono text-warm-100 font-bold">{profile?.leaseEndDate || 'Jan 31, 2027'}</div>
            </div>
            <div className="col-span-2 border-t border-ink-800 pt-3 mt-1">
              <div className="text-[9px] font-mono text-ink-500 uppercase tracking-widest mb-1">
                Property Manager
              </div>
              <div className="text-xs text-warm-50">
                {profile?.managerName || 'Property Manager'} •{' '}
                <span className="text-ink-400 font-mono">
                  {profile?.managerEmail || 'support@trenor.com'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Status Card */}
        <div className="lg:col-span-1 ops-card bg-ink-900 border border-coral-500/30 rounded-[2px] p-6 relative overflow-hidden shadow-[0_0_15px_rgba(255,107,107,0.05)] flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 left-0 w-full h-1 bg-coral-500"></div>
          <div>
            <div className="flex justify-between items-start mb-5">
              <h3 className="font-heading text-sm font-semibold text-warm-50">Current Balance</h3>
              {outstandingTotal > 0 ? (
                <span className="inline-flex px-1.5 py-0.5 bg-coral-500/10 text-coral-500 border border-coral-500/30 rounded-[2px] text-[9px] font-mono font-bold tracking-widest animate-pulse">
                  OVERDUE
                </span>
              ) : (
                <span className="inline-flex px-1.5 py-0.5 bg-ink-800 text-warm-200 border border-ink-700 rounded-[2px] text-[9px] font-mono font-bold tracking-widest">
                  PAID
                </span>
              )}
            </div>

            <div className="text-4xl font-mono font-bold text-coral-500 mb-2 tracking-tight">
              ${outstandingTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] font-mono text-ink-400 uppercase tracking-widest mb-6">
              Monthly Rent: ${Number(profile?.rent || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <button
            onClick={() => onTabChange('payments')}
            className="mt-auto w-full bg-coral-500 hover:bg-coral-600 text-ink-950 text-[10px] font-mono font-bold tracking-widest uppercase py-3 rounded-[2px] transition-all shadow-glow-coral flex items-center justify-center gap-2"
          >
            Make Payment
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Recent Maintenance */}
        <div className="ops-card bg-ink-900 border border-ink-800 rounded-[2px] p-5 flex flex-col min-h-[160px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-heading text-sm font-semibold text-warm-50">Active Maintenance</h3>
            <button
              onClick={() => onTabChange('maintenance')}
              className="text-[9px] font-mono text-ink-500 hover:text-warm-100 transition-colors uppercase tracking-widest"
            >
              View All
            </button>
          </div>

          {activeTickets.length > 0 && activeTickets[0] ? (
            (() => {
              const activeTicket = activeTickets[0];
              return (
                <div
                  className="bg-ink-950 border border-ink-800 rounded-[2px] p-4 flex flex-col gap-1.5 cursor-pointer hover:border-ink-700 transition-colors group mt-auto"
                  onClick={() => onTabChange('maintenance')}
                >
                  <div className="flex justify-between items-start">
                    <span className="inline-flex px-1.5 py-0.5 bg-warm-100 text-ink-950 border border-warm-200 rounded-[2px] text-[9px] font-mono font-bold tracking-widest shadow-sm uppercase">
                      {activeTicket.status}
                    </span>
                    <span className="text-[9px] font-mono text-ink-500 group-hover:text-ink-400 transition-colors">
                      {activeTicket.id}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-warm-50 mt-1">
                    {activeTicket.description}
                  </div>
                  <div className="text-[10px] font-mono text-ink-400 mt-1 uppercase tracking-widest flex items-center gap-1.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    Logged: {new Date(activeTicket.createdAt).toLocaleDateString()}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="py-6 text-center text-ink-500 font-mono text-xs border border-ink-800 border-dashed rounded-[2px] flex-grow flex items-center justify-center">
              NO ACTIVE REQUESTS
            </div>
          )}
        </div>

        {/* Documents & Lease */}
        <div className="ops-card bg-ink-900 border border-ink-800 rounded-[2px] p-5 flex flex-col min-h-[160px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-heading text-sm font-semibold text-warm-50">Recent Documents</h3>
            <button
              onClick={() => onTabChange('documents')}
              className="text-[9px] font-mono text-ink-500 hover:text-warm-100 transition-colors uppercase tracking-widest"
            >
              View All
            </button>
          </div>
          <div
            className="bg-ink-950 border border-ink-800 rounded-[2px] p-4 flex items-center justify-between cursor-pointer hover:border-ink-700 transition-colors group mt-auto h-20"
            onClick={() => onTabChange('documents')}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[2px] bg-ink-900 border border-ink-700 flex items-center justify-center text-ink-500 group-hover:text-warm-100 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold text-warm-50">
                  Lease_Agreement_{profile?.propertyName?.replace(/\s+/g, '_') || 'Property'}_Unit_{profile?.unit || 'N_A'}.pdf
                </div>
                <div className="text-[9px] font-mono text-ink-500 mt-1 uppercase tracking-widest">
                  Executed {profile?.leaseStartDate || 'Jan 1, 2026'}
                </div>
              </div>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              className="text-ink-600 group-hover:text-coral-500 transition-colors"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
