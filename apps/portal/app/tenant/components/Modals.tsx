'use client';

import React from 'react';

interface TenantProfile {
  propertyName: string;
  unit: string;
}

interface Invoice {
  invoiceId: string;
  tenantEmail?: string;
  tenantName?: string;
  unitNumber?: string;
  amountDue: number;
  propertyName?: string;
  status?: string;
}

interface ModalsProps {
  // Request Modal Props
  isRequestModalOpen: boolean;
  setIsRequestModalOpen: (val: boolean) => void;
  category: string;
  setCategory: (val: string) => void;
  urgency: 'low' | 'medium' | 'high';
  setUrgency: (val: 'low' | 'medium' | 'high') => void;
  ticketDescription: string;
  setTicketDescription: (val: string) => void;
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  isSubmittingTicket: boolean;
  handleLogTicket: (e: React.FormEvent) => void;
  profile: TenantProfile | null;

  // Payment Modal Props
  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (val: boolean) => void;
  selectedInvoice: Invoice | null;
  isProcessingPayment: boolean;
  handlePayInvoice: (id: string) => void;
}

export default function Modals({
  isRequestModalOpen,
  setIsRequestModalOpen,
  category,
  setCategory,
  urgency,
  setUrgency,
  ticketDescription,
  setTicketDescription,
  selectedFile,
  onFileSelect,
  isSubmittingTicket,
  handleLogTicket,
  profile,

  isPaymentModalOpen,
  setIsPaymentModalOpen,
  selectedInvoice,
  isProcessingPayment,
  handlePayInvoice,
}: ModalsProps) {
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0] || null);
    } else {
      onFileSelect(null);
    }
  };

  return (
    <>
      {/* ========================================== */}
      {/* MODAL: NEW MAINTENANCE REQUEST             */}
      {/* ========================================== */}
      <div
        className={`modal-backdrop fixed inset-0 bg-ink-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${
          isRequestModalOpen ? 'open' : ''
        }`}
      >
        <div className="modal-content w-full max-w-2xl bg-ink-900 border border-ink-700 rounded-[2px] shadow-[0_30px_60px_-15px_rgba(255,107,107,0.15)] flex flex-col relative overflow-hidden max-h-[90vh]">
          <div className="absolute top-0 left-0 w-full h-1 bg-coral-500"></div>

          {/* Header */}
          <div className="px-6 py-4 border-b border-ink-800 bg-ink-950 flex justify-between items-center flex-shrink-0">
            <div>
              <h2 className="font-heading font-semibold text-warm-50 text-base">Submit Maintenance Request</h2>
              <div className="text-[10px] font-mono text-ink-500 uppercase tracking-widest mt-0.5">
                {profile?.propertyName || 'Property Unit'} — Unit {profile?.unit || '—'}
              </div>
            </div>
            <button
              onClick={() => setIsRequestModalOpen(false)}
              className="text-ink-500 hover:text-warm-100 transition-colors p-1"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleLogTicket} className="flex flex-col flex-1 overflow-hidden">
            {/* Form Body */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-ink-900 flex flex-col gap-6">
              {/* Category */}
              <div>
                <label className="text-[10px] font-mono text-ink-400 uppercase tracking-widest block mb-2">Issue Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="cyber-input cyber-select rounded-[2px] px-3 py-3 text-sm font-body w-full"
                >
                  <option value="general">General Repair / Other</option>
                  <option value="plumbing">Plumbing / Water</option>
                  <option value="hvac">HVAC / Heating & Cooling</option>
                  <option value="electrical">Electrical / Lighting</option>
                  <option value="appliances">Appliances</option>
                </select>
              </div>

              {/* Urgency */}
              <div>
                <label className="text-[10px] font-mono text-ink-400 uppercase tracking-widest block mb-2">Urgency Level</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(['low', 'medium', 'high'] as const).map((level) => {
                    const titles = { low: 'Standard', medium: 'High Priority', high: 'Critical / Emergency' };
                    const desc = {
                      low: 'Addressed within 3-5 business days.',
                      medium: 'Prevents normal use. Addressed within 24-48 hours.',
                      high: 'Active leak, no heat/power. Immediate dispatch.',
                    };
                    const isSelected = urgency === level;

                    return (
                      <label key={level} className="cursor-pointer relative group">
                        <input
                          type="radio"
                          name="modal-urgency"
                          value={level}
                          checked={isSelected}
                          onChange={() => setUrgency(level)}
                          className="sr-only"
                        />
                        <div
                          className={`p-3 border rounded-[2px] transition-colors flex flex-col items-center text-center ${
                            isSelected
                              ? level === 'high'
                                ? 'border-coral-500 bg-coral-500/10 text-coral-500'
                                : 'border-warm-100 bg-ink-800 text-warm-50'
                              : 'border-ink-700 bg-ink-950 text-ink-400 hover:border-ink-600'
                          }`}
                        >
                          <span className="font-mono text-xs font-bold mb-1">{titles[level]}</span>
                          <span className="text-[9px] text-ink-500 leading-tight">{desc[level]}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-mono text-ink-400 uppercase tracking-widest block mb-2">Detailed Description</label>
                <textarea
                  rows={4}
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  className="cyber-input w-full rounded-[2px] p-3 text-sm font-body resize-none"
                  placeholder="Please describe the issue in detail. What is happening, when did it start, and what troubleshooting have you tried?"
                  required
                />
              </div>

              {/* File Upload Dropzone */}
              <div>
                <label className="text-[10px] font-mono text-ink-400 uppercase tracking-widest block mb-2">Attachments / Photos (Optional)</label>
                <input type="file" id="photo-file-modal" accept="image/*" onChange={onFileChange} className="hidden" />
                <label
                  htmlFor="photo-file-modal"
                  className="w-full h-24 border border-ink-700 border-dashed rounded-[2px] bg-ink-950 flex flex-col items-center justify-center text-ink-500 dropzone cursor-pointer hover:border-coral-500 hover:text-coral-400 transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span className="text-xs font-mono">
                    {selectedFile ? `Selected: ${selectedFile.name}` : 'Click to select photo attachment'}
                  </span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-ink-800 bg-ink-950 flex justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="text-xs font-mono font-bold text-ink-400 hover:text-warm-100 bg-ink-900 border border-ink-800 hover:border-ink-700 px-5 py-2.5 rounded-[2px] transition-colors"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={isSubmittingTicket}
                className="text-xs font-mono font-bold text-ink-950 bg-coral-500 hover:bg-coral-600 px-6 py-2.5 rounded-[2px] transition-colors shadow-glow-coral flex items-center gap-2 uppercase tracking-widest"
              >
                {isSubmittingTicket ? 'SUBMITTING...' : 'Submit Request'}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL: PAYMENT AUTHORIZATION               */}
      {/* ========================================== */}
      <div
        className={`modal-backdrop fixed inset-0 bg-ink-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${
          isPaymentModalOpen ? 'open' : ''
        }`}
      >
        <div className="modal-content w-full max-w-md bg-ink-900 border border-ink-700 rounded-[2px] shadow-[0_30px_60px_-15px_rgba(255,107,107,0.15)] flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-coral-500"></div>

          {/* Header */}
          <div className="px-6 py-4 border-b border-ink-800 bg-ink-950 flex justify-between items-center flex-shrink-0">
            <div>
              <h2 className="font-heading font-semibold text-warm-50 text-base">Confirm Payment</h2>
              <div className="text-[10px] font-mono text-ink-500 uppercase tracking-widest mt-0.5">
                {selectedInvoice?.invoiceId || 'INV-2026-06'}
              </div>
            </div>
            <button
              onClick={() => setIsPaymentModalOpen(false)}
              className="text-ink-500 hover:text-warm-100 transition-colors p-1"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="p-6 bg-ink-900 flex flex-col gap-6">
            <div className="flex flex-col items-center justify-center bg-ink-950 border border-ink-800 rounded-[2px] p-6 text-center">
              <div className="text-[10px] font-mono text-ink-500 uppercase tracking-widest mb-2">Total Payment Amount</div>
              <div className="text-4xl font-mono font-bold text-warm-50">
                €{Number(selectedInvoice?.amountDue || 0).toLocaleString()}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-ink-400 uppercase tracking-widest block mb-2">Select Payment Account</label>
              <div className="border border-ink-700 bg-ink-950 rounded-[2px] p-3 flex items-center gap-3 cursor-pointer hover:border-coral-500 transition-colors">
                <div className="w-8 h-8 bg-ink-900 border border-ink-800 flex items-center justify-center rounded-[2px] text-warm-100">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <div className="flex-grow">
                  <div className="text-xs font-bold text-warm-50">Chase Checking</div>
                  <div className="text-[10px] font-mono text-ink-500 tracking-widest mt-0.5 font-bold">•••• 4242</div>
                </div>
                <div className="w-4 h-4 rounded-full border border-coral-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-coral-500"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-ink-800 bg-ink-950 flex flex-col gap-3 flex-shrink-0">
            <button
              onClick={() => handlePayInvoice(selectedInvoice?.invoiceId || '')}
              disabled={isProcessingPayment}
              className="w-full text-xs font-mono font-bold text-ink-950 bg-coral-500 hover:bg-coral-600 py-3.5 rounded-[2px] transition-colors shadow-glow-coral flex items-center justify-center gap-2 uppercase tracking-widest"
            >
              {isProcessingPayment ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10"></circle>
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Pay Now</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
