'use client';

import React from 'react';
import { downloadReceiptAsPNG, downloadReceiptAsPDF } from './ReceiptExporter';

interface TenantProfile {
  rent: string;
}

interface Invoice {
  invoiceId: string;
  propertyName: string;
  unitNumber: string;
  amountDue: number;
  status: string;
  tenantEmail?: string;
  tenantName?: string;
  description?: string;
}

interface PaymentsTabProps {
  profile: TenantProfile | null;
  activeInvoicesList: Invoice[];
  paidInvoicesList: Invoice[];
  outstandingTotal: number;
  autoPayEnabled: boolean;
  setAutoPayEnabled: (val: boolean) => void;
  paymentsSubTab: 'outstanding' | 'methods' | 'history';
  setPaymentsSubTab: (val: 'outstanding' | 'methods' | 'history') => void;
  onPayInvoice: (inv: Invoice) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function PaymentsTab({
  profile,
  activeInvoicesList,
  paidInvoicesList,
  outstandingTotal,
  autoPayEnabled,
  setAutoPayEnabled,
  paymentsSubTab,
  setPaymentsSubTab,
  onPayInvoice,
  addToast,
}: PaymentsTabProps) {
  return (
    <div className="flex flex-col p-4 md:p-6 lg:p-8 relative z-10 min-h-full max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b border-ink-800 pb-5">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-warm-50 tracking-tight">
            Billing & Payments
          </h1>
          <p className="text-xs font-mono text-ink-400 mt-1.5">
            Manage outstanding balances, auto-pay settings, and transaction history.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <button
            onClick={() => addToast('Statement download initialized (Mock)', 'success')}
            className="bg-ink-950 hover:bg-ink-900 border border-ink-800 text-warm-200 text-xs font-bold px-5 py-2.5 rounded-[2px] transition-colors flex items-center gap-2 font-mono uppercase tracking-widest shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Statement
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-ink-950 border border-coral-500/40 rounded-[2px] p-4 relative overflow-hidden shadow-[0_0_15px_rgba(255,107,107,0.05)]">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-coral-500"></div>
          <div className="text-[9px] font-mono text-ink-500 uppercase tracking-widest mb-1 pl-2">
            Total Amount Due
          </div>
          <div className="text-2xl font-mono font-bold text-coral-500 pl-2">
            ${outstandingTotal.toLocaleString()}
          </div>
        </div>
        <div className="bg-ink-950 border border-ink-800 rounded-[2px] p-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-ink-600"></div>
          <div className="text-[9px] font-mono text-ink-500 uppercase tracking-widest mb-1 pl-2">
            Next Rent Cycle
          </div>
          <div className="text-2xl font-mono font-bold text-warm-50 pl-2">
            Next Month 1st
          </div>
          <div className="text-[10px] font-mono text-ink-400 mt-1 pl-2 uppercase tracking-widest">
            Base: {profile?.rent ? `$${Number(profile.rent).toLocaleString()}` : '$0'}
          </div>
        </div>
        <div className="bg-ink-950 border border-ink-800 rounded-[2px] p-4 flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[9px] font-mono text-ink-500 uppercase tracking-widest mb-1">
                Auto-Pay Status
              </div>
              <div className="text-sm font-mono font-bold text-ink-500">
                {autoPayEnabled ? <span className="text-coral-500">ACTIVE</span> : 'DISABLED'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setAutoPayEnabled(!autoPayEnabled);
                addToast(`Auto-Pay has been ${!autoPayEnabled ? 'enabled' : 'disabled'}.`, 'success');
              }}
              className={`w-12 h-6 border rounded-[2px] relative transition-all duration-300 shadow-inner group overflow-hidden ${
                autoPayEnabled ? 'bg-coral-500/20 border-coral-500/50 shadow-glow-coral' : 'bg-ink-900 border-ink-700'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-4.5 rounded-[2px] transition-all duration-300 shadow-md ${
                  autoPayEnabled ? 'bg-coral-500 right-0.5' : 'bg-ink-600 left-0.5 group-hover:bg-ink-500'
                }`}
              ></div>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-tab Nav */}
      <div className="flex gap-2 mb-6 border-b border-ink-800/80 pb-0.5">
        <button
          onClick={() => setPaymentsSubTab('outstanding')}
          className={`px-4 py-2.5 text-xs font-mono tracking-widest uppercase transition-all duration-200 relative ${
            paymentsSubTab === 'outstanding'
              ? 'text-coral-500 font-bold'
              : 'text-ink-500 hover:text-warm-100'
          }`}
        >
          Outstanding
          <span className="bg-coral-500/10 border border-coral-500/20 text-coral-500 px-1.5 py-0.5 rounded-[2px] text-[9px] ml-1.5 font-bold">
            {activeInvoicesList.length}
          </span>
          {paymentsSubTab === 'outstanding' && (
            <div className="absolute bottom-[-1.5px] left-0 right-0 h-[2px] bg-coral-500 shadow-[0_0_8px_rgba(255,107,107,0.5)]"></div>
          )}
        </button>
        <button
          onClick={() => setPaymentsSubTab('methods')}
          className={`px-4 py-2.5 text-xs font-mono tracking-widest uppercase transition-all duration-200 relative ${
            paymentsSubTab === 'methods'
              ? 'text-coral-500 font-bold'
              : 'text-ink-500 hover:text-warm-100'
          }`}
        >
          Payment Methods
          {paymentsSubTab === 'methods' && (
            <div className="absolute bottom-[-1.5px] left-0 right-0 h-[2px] bg-coral-500 shadow-[0_0_8px_rgba(255,107,107,0.5)]"></div>
          )}
        </button>
        <button
          onClick={() => setPaymentsSubTab('history')}
          className={`px-4 py-2.5 text-xs font-mono tracking-widest uppercase transition-all duration-200 relative ${
            paymentsSubTab === 'history'
              ? 'text-coral-500 font-bold'
              : 'text-ink-500 hover:text-warm-100'
          }`}
        >
          Ledger History
          {paymentsSubTab === 'history' && (
            <div className="absolute bottom-[-1.5px] left-0 right-0 h-[2px] bg-coral-500 shadow-[0_0_8px_rgba(255,107,107,0.5)]"></div>
          )}
        </button>
      </div>

      {/* Sub-tab Panels */}
      {paymentsSubTab === 'outstanding' && (
        <div className="flex flex-col w-full gap-5">
          {activeInvoicesList.length === 0 ? (
            <div className="p-8 text-center text-ink-500 font-mono text-xs border border-ink-800 border-dashed rounded-[2px] bg-ink-900/30">
              ALL INVOICES SETTLED. NO OUTSTANDING BALANCES.
            </div>
          ) : (
            activeInvoicesList.map((inv) => (
              <div
                key={inv.invoiceId}
                className="ops-card bg-ink-900 border border-coral-500/40 rounded-[2px] p-5 lg:p-6 flex flex-col relative overflow-hidden shadow-[0_0_15px_rgba(255,107,107,0.05)]"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-coral-500"></div>

                <div className="flex flex-col md:flex-row justify-between items-start gap-6 pl-2 w-full">
                  <div className="flex-grow w-full md:w-auto">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex px-1.5 py-0.5 bg-coral-500/10 text-coral-500 border border-coral-500/30 rounded-[2px] text-[9px] font-mono font-bold tracking-widest">
                        OUTSTANDING
                      </span>
                      <span className="text-[10px] font-mono text-ink-500 uppercase tracking-widest">
                        {inv.invoiceId}
                      </span>
                    </div>
                    <h3 className="font-heading text-xl font-semibold text-warm-50 leading-tight mb-4">
                      {inv.propertyName || 'Property Invoice'}
                    </h3>

                    <div className="bg-ink-950/50 border border-ink-800 rounded-[2px] p-4 font-mono text-xs w-full max-w-lg">
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-ink-800/50">
                        <span className="text-ink-400">Description</span>
                        <span className="text-warm-100">{inv.description || 'Rental Charges'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-ink-400">Unit Number</span>
                        <span className="text-warm-100">Unit {inv.unitNumber || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end w-full md:w-auto min-w-[200px]">
                    <div className="text-[10px] font-mono text-ink-500 uppercase tracking-widest mb-1">
                      Total Due
                    </div>
                    <div className="text-3xl font-mono font-bold text-coral-500 mb-2">
                      ${Number(inv.amountDue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <button
                      onClick={() => onPayInvoice(inv)}
                      className="w-full bg-coral-500 hover:bg-coral-600 text-ink-950 text-xs font-bold py-3 px-6 rounded-[2px] transition-colors shadow-glow-coral font-mono tracking-widest uppercase flex justify-center items-center gap-2"
                    >
                      Settle Balance
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {paymentsSubTab === 'methods' && (
        <div className="flex flex-col w-full gap-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg font-semibold text-warm-50">
              Saved Payment Methods
            </h3>
          </div>

          <div className="p-8 text-center text-ink-500 font-mono text-xs border border-ink-800 border-dashed rounded-[2px] bg-ink-900/30">
            NO SAVED CARDS REQUIRED. ALL TRANSACTIONS ARE SECURELY ROUTED DIRECTLY VIA STRIPE CHECKOUT.
          </div>
        </div>
      )}

      {paymentsSubTab === 'history' && (
        <div className="flex flex-col w-full">
          <div className="bg-ink-900 border border-ink-800 rounded-[2px] overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-ink-950 border-b border-ink-800">
                  <th className="py-3 px-4 text-[9px] font-mono font-bold text-ink-500 uppercase tracking-widest">Date Settled</th>
                  <th className="py-3 px-4 text-[9px] font-mono font-bold text-ink-500 uppercase tracking-widest">Transaction ID</th>
                  <th className="py-3 px-4 text-[9px] font-mono font-bold text-ink-500 uppercase tracking-widest">Description</th>
                  <th className="py-3 px-4 text-[9px] font-mono font-bold text-ink-500 uppercase tracking-widest text-right">Amount</th>
                  <th className="py-3 px-4 text-[9px] font-mono font-bold text-ink-500 uppercase tracking-widest text-center">Status</th>
                  <th className="py-3 px-4 text-[9px] font-mono font-bold text-ink-500 uppercase tracking-widest text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="text-xs font-body text-warm-200">
                {paidInvoicesList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-ink-500 font-mono">
                      NO PAST TRANSACTIONS RECORDED IN LEDGER.
                    </td>
                  </tr>
                ) : (
                  paidInvoicesList.map((inv) => (
                    <tr key={inv.invoiceId} className="border-b border-ink-800/50 hover:bg-ink-800/50 transition-colors">
                      <td className="py-4 px-4 font-mono text-warm-300 text-[10px]">Succeeded</td>
                      <td className="py-4 px-4 font-mono text-ink-500 text-[10px]">{inv.invoiceId}</td>
                      <td className="py-4 px-4 text-warm-50 font-medium">{inv.description || inv.propertyName || 'Settled Invoice'}</td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-warm-50">${Number(inv.amountDue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex px-1.5 py-0.5 bg-ink-800 text-warm-100 border border-ink-700 rounded-[2px] text-[9px] font-mono font-bold tracking-widest">
                          CLEARED
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right flex justify-end gap-3">
                        <button
                          onClick={() => {
                            downloadReceiptAsPNG(inv);
                            addToast('PNG receipt downloaded successfully.', 'success');
                          }}
                          className="text-ink-500 hover:text-coral-500 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Download receipt as PNG image"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                          <span className="text-[10px] font-mono font-bold tracking-wider">PNG</span>
                        </button>
                        <button
                          onClick={() => {
                            downloadReceiptAsPDF(inv);
                            addToast('PDF receipt generation triggered.', 'success');
                          }}
                          className="text-ink-500 hover:text-coral-500 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Save receipt as PDF file"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                          </svg>
                          <span className="text-[10px] font-mono font-bold tracking-wider">PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
