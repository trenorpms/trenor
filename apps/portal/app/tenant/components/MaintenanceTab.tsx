'use client';

import React from 'react';

interface TenantTicket {
  id: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  status: string;
  contractorId?: number;
  contractorAccepted?: boolean;
  rating?: number;
  ratingComment?: string;
}

interface Contractor {
  id: number;
  name: string;
  email: string;
  specialty: string;
  phone?: string;
}

interface MaintenanceTabProps {
  activeTicketsList: TenantTicket[];
  historyTicketsList: TenantTicket[];
  contractors: Contractor[];
  maintenanceSubTab: 'active' | 'history';
  setMaintenanceSubTab: (val: 'active' | 'history') => void;
  ratingOpenTicketId: string | null;
  setRatingOpenTicketId: (val: string | null) => void;
  ratingValue: number;
  setRatingValue: (val: number) => void;
  ratingCommentText: string;
  setRatingCommentText: (val: string) => void;
  isSubmittingRating: boolean;
  handleCompleteAndRate: (id: string) => void;
  setIsRequestModalOpen: (val: boolean) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function MaintenanceTab({
  activeTicketsList,
  historyTicketsList,
  contractors,
  maintenanceSubTab,
  setMaintenanceSubTab,
  ratingOpenTicketId,
  setRatingOpenTicketId,
  ratingValue,
  setRatingValue,
  ratingCommentText,
  setRatingCommentText,
  isSubmittingRating,
  handleCompleteAndRate,
  setIsRequestModalOpen,
  addToast,
}: MaintenanceTabProps) {
  return (
    <div className="flex flex-col p-4 md:p-6 lg:p-8 relative z-10 min-h-full max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b border-ink-800/80 pb-5">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-warm-50 tracking-tight">Maintenance</h1>
          <p className="text-xs font-mono text-ink-400 mt-1.5">
            Track repairs, communicate with contractors, and submit requests.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="bg-coral-500 hover:bg-coral-600 text-white text-xs font-bold px-5 py-2.5 rounded-[2px] transition-colors flex items-center gap-2 font-mono uppercase tracking-widest shadow-glow-coral"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Submit Request
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-ink-800/80 pb-0.5">
        <button
          onClick={() => setMaintenanceSubTab('active')}
          className={`px-4 py-2.5 text-xs font-mono tracking-widest uppercase transition-all duration-200 relative ${
            maintenanceSubTab === 'active'
              ? 'text-coral-500 font-bold'
              : 'text-ink-500 hover:text-warm-100'
          }`}
        >
          Active Requests
          <span className="bg-coral-500/10 border border-coral-500/20 text-coral-500 px-1.5 py-0.5 rounded-[2px] text-[9px] ml-1.5 font-bold">
            {activeTicketsList.length}
          </span>
          {maintenanceSubTab === 'active' && (
            <div className="absolute bottom-[-1.5px] left-0 right-0 h-[2px] bg-coral-500 shadow-[0_0_8px_rgba(255,107,107,0.5)]"></div>
          )}
        </button>
        <button
          onClick={() => setMaintenanceSubTab('history')}
          className={`px-4 py-2.5 text-xs font-mono tracking-widest uppercase transition-all duration-200 relative ${
            maintenanceSubTab === 'history'
              ? 'text-coral-500 font-bold'
              : 'text-ink-500 hover:text-warm-100'
          }`}
        >
          History
          {maintenanceSubTab === 'history' && (
            <div className="absolute bottom-[-1.5px] left-0 right-0 h-[2px] bg-coral-500 shadow-[0_0_8px_rgba(255,107,107,0.5)]"></div>
          )}
        </button>
      </div>

      {/* Active Tab Panel */}
      {maintenanceSubTab === 'active' && (
        <div className="flex flex-col w-full gap-5">
          {activeTicketsList.length === 0 ? (
            <div className="p-8 text-center text-ink-500 font-mono text-xs border border-ink-800 border-dashed rounded-[2px] bg-ink-900/30">
              NO ACTIVE MAINTENANCE REQUESTS FOUND.
            </div>
          ) : (
            activeTicketsList.map((t) => {
              const contractor = contractors.find((c) => c.id === t.contractorId);
              const isAssigned = !!t.contractorId;
              const isAccepted = !!t.contractorAccepted;

              return (
                <div key={t.id} className="ops-card bg-ink-900 border border-ink-800 rounded-[2px] p-5 flex flex-col relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${t.urgency === 'high' ? 'bg-coral-500' : 'bg-ink-600'}`}></div>

                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-5 pl-2">
                    <div>
                      <span className="inline-flex px-1.5 py-0.5 bg-ink-800 text-warm-50 border border-ink-700 rounded-[2px] text-[9px] font-mono font-bold tracking-widest mb-2 shadow-sm uppercase">
                        {isAssigned && isAccepted
                          ? 'ASSIGNED • SCHEDULED'
                          : isAssigned
                          ? 'APPROVED • AWAITING ASSIGNMENT'
                          : 'PENDING REVIEW'}
                      </span>
                      <h3 className="font-heading text-lg font-semibold text-warm-50 leading-tight">{t.description}</h3>
                      <div className="text-[10px] font-mono text-ink-500 mt-1.5 uppercase tracking-widest">
                        REQ-{t.id.slice(0, 8).toUpperCase()} • URGENCY: {t.urgency.toUpperCase()}
                      </div>
                    </div>

                    {isAssigned && (
                      <div className="bg-ink-950 border border-ink-800 rounded-[2px] p-3 flex items-center gap-3 w-full sm:w-auto">
                        <div className="w-8 h-8 rounded border border-ink-700 bg-ink-800 overflow-hidden flex-shrink-0">
                          <img
                            src={`https://api.dicebear.com/7.x/notionists/svg?seed=${contractor?.name || 'Marcus'}&backgroundColor=11161d`}
                            className="w-full h-full object-cover grayscale"
                            alt="Contractor Avatar"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono text-ink-500 uppercase tracking-widest leading-none mb-1">
                            Assigned Technician
                          </span>
                          <span className="text-xs font-bold text-warm-50 leading-none">
                            {contractor?.name || `Partner #${t.contractorId}`}
                          </span>
                          {contractor?.specialty && (
                            <span className="text-[9px] font-mono text-warm-200 mt-0.5">{contractor.specialty}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {isAssigned && isAccepted && (
                    <div className="bg-ink-950/50 border-y border-ink-800 py-3 mb-5 px-3 flex flex-col sm:flex-row gap-6">
                      <div>
                        <span className="text-ink-500 font-mono text-[9px] uppercase tracking-widest">Technician Details</span>
                        <br />
                        <span className="text-warm-50 font-mono text-xs">
                          {contractor?.phone && `📞 ${contractor.phone}`}
                          {contractor?.email && `  |  ✉️ ${contractor.email}`}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-auto pl-2">
                    {isAssigned && contractor && (
                      <a
                        href={`tel:${contractor.phone || ''}`}
                        className="bg-ink-800 border border-ink-700 hover:border-ink-600 text-warm-50 text-[10px] font-bold py-2 px-4 rounded-[2px] transition-colors font-mono uppercase tracking-widest flex items-center gap-2"
                      >
                        Contact Technician
                      </a>
                    )}
                    <button
                      onClick={() => addToast('Support canceled (mock action)', 'info')}
                      className="text-ink-500 hover:text-coral-500 text-[10px] font-bold transition-colors font-mono uppercase tracking-widest underline decoration-ink-800 hover:decoration-coral-500/50 underline-offset-4"
                    >
                      Cancel Request
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* History Tab Panel */}
      {maintenanceSubTab === 'history' && (
        <div className="flex flex-col w-full gap-5">
          {historyTicketsList.length === 0 ? (
            <div className="p-8 text-center text-ink-500 font-mono text-xs border border-ink-800 border-dashed rounded-[2px] bg-ink-900/30">
              NO COMPLETED OR CLOSED MAINTENANCE TASKS RECORDED.
            </div>
          ) : (
            historyTicketsList.map((t) => {
              const contractor = contractors.find((c) => c.id === t.contractorId);
              const isRatingOpen = ratingOpenTicketId === t.id;

              return (
                <div key={t.id} className="ops-card bg-ink-900 border border-ink-800 rounded-[2px] p-5 flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-ink-700"></div>

                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4 pl-2">
                    <div>
                      <span className="inline-flex px-1.5 py-0.5 bg-ink-800 text-warm-100 border border-ink-700 rounded-[2px] text-[9px] font-mono font-bold tracking-widest mb-2 uppercase">
                        {t.status.toUpperCase()}
                      </span>
                      <h3 className="font-heading text-lg font-semibold text-warm-50 leading-tight">{t.description}</h3>
                      <div className="text-[10px] font-mono text-ink-500 mt-1.5 uppercase tracking-widest">
                        REQ-{t.id.slice(0, 8).toUpperCase()} • CLOSED
                      </div>
                    </div>
                  </div>

                  <div className="bg-ink-950/50 border-y border-ink-800 py-3 mb-5 px-3 flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded border border-ink-700 bg-ink-800 overflow-hidden flex-shrink-0">
                        <img
                          src={`https://api.dicebear.com/7.x/notionists/svg?seed=${contractor?.name || 'Marcus'}&backgroundColor=11161d`}
                          className="w-full h-full object-cover grayscale"
                          alt="Contractor Avatar"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-mono text-ink-500 uppercase tracking-widest leading-none mb-1">Serviced By</span>
                        <span className="text-xs font-bold text-warm-50 leading-none">
                          {contractor?.name || 'Property Management'}
                        </span>
                      </div>
                    </div>

                    {t.status === 'completed' && t.rating ? (
                      <div className="text-[11px] font-mono text-coral-500">
                        ★ {t.rating} / 5 stars left
                        {t.ratingComment && <span className="text-ink-400 block italic">"{t.ratingComment}"</span>}
                      </div>
                    ) : t.status === 'completed' && !isRatingOpen ? (
                      <button
                        onClick={() => {
                          setRatingOpenTicketId(t.id);
                          setRatingValue(5);
                          setRatingCommentText('');
                        }}
                        className="bg-ink-900 border border-ink-700 hover:border-warm-100 text-warm-100 text-[10px] font-bold py-2 px-4 rounded-[2px] transition-colors font-mono uppercase tracking-widest flex items-center justify-center gap-1.5"
                      >
                        Rate Service
                      </button>
                    ) : null}
                  </div>

                  {/* Rating open block */}
                  {isRatingOpen && (
                    <div className="mt-3 p-4 bg-ink-950 border border-ink-800 rounded-[2px] flex flex-col gap-4">
                      <span className="text-[10px] font-mono text-coral-500 uppercase font-bold tracking-widest">
                        Submit Service Rating
                      </span>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button key={val} type="button" onClick={() => setRatingValue(val)} className="text-lg cursor-pointer">
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill={val <= ratingValue ? '#ff6b6b' : 'none'}
                              stroke="#ff6b6b"
                              strokeWidth="2"
                            >
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </button>
                        ))}
                      </div>

                      <textarea
                        value={ratingCommentText}
                        onChange={(e) => setRatingCommentText(e.target.value)}
                        className="cyber-input w-full rounded-[2px] p-2 text-xs font-body"
                        placeholder="Add comments about speed, quality, or professionalism..."
                        rows={2}
                      />

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setRatingOpenTicketId(null)}
                          className="text-[10px] font-mono font-bold text-ink-500 hover:text-warm-100 transition-colors px-3 py-1.5"
                        >
                          CANCEL
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCompleteAndRate(t.id)}
                          disabled={isSubmittingRating}
                          className="bg-coral-500 hover:bg-coral-600 text-ink-950 font-mono font-bold text-[10px] px-4 py-1.5 rounded-[2px] transition-colors"
                        >
                          {isSubmittingRating ? 'SUBMITTING...' : 'SUBMIT'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
