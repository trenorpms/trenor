'use client';

import React, { useState } from 'react';
import { formatMoney, getCurrencyConfig } from '../../app/utils/currency';
import ReconcileModal from '../tenants/ReconcileModal';
import BatchReconcileModal from '../tenants/BatchReconcileModal';
import CreateInvoiceModal from '../tenants/CreateInvoiceModal';

interface Invoice {
  invoiceId: string;
  tenantEmail: string;
  tenantName: string;
  unitNumber: string;
  amountDue: number;
  propertyName: string;
  status: string;
  created_by?: string;
  description?: string;
}

interface InvoiceTableProps {
  invoices: Invoice[];
  totalInvoices: number;
  totalArrears: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  tenants: any[];
  loading: boolean;
}

export default function InvoiceTable({
  invoices,
  totalInvoices,
  totalArrears,
  currentPage,
  onPageChange,
  onRefresh,
  tenants,
  loading
}: InvoiceTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [newInvoiceModalOpen, setNewInvoiceModalOpen] = useState(false);

  // Reconciliation dialog states
  const [reconcileInvoiceId, setReconcileInvoiceId] = useState<string | null>(null);
  const [reconcileAmountDue, setReconcileAmountDue] = useState<number>(0);
  const [batchReconcileOpen, setBatchReconcileOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNextPage = () => {
    const totalPages = Math.ceil(totalInvoices / 15) || 1;
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  const toggleSelectInvoice = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const unpaidInvs = invoices.filter(inv => inv.status !== 'Paid');
    if (selectedIds.length === unpaidInvs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unpaidInvs.map(x => x.invoiceId));
    }
  };

  // Deterministic billing date helper
  const getInvoiceDate = (invoiceId: string) => {
    let hash = 0;
    for (let i = 0; i < invoiceId.length; i++) {
      hash = invoiceId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const day = Math.abs(hash % 28) + 1;
    const month = Math.abs(hash % 12);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[month]} ${day < 10 ? '0' + day : day}, 2026`;
  };

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = ["Invoice ID", "Tenant Name", "Tenant Email", "Property Name", "Unit Number", "Amount Due", "Status", "Description"];
    const rows = invoices.map(inv => [
      inv.invoiceId,
      inv.tenantName,
      inv.tenantEmail,
      inv.propertyName,
      inv.unitNumber,
      inv.amountDue,
      inv.status,
      inv.description || ''
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `invoices_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV export compiled and downloaded.");
  };

  // Client-side quick search filtering
  const filteredInvoices = invoices.filter(inv => {
    const term = searchTerm.toLowerCase();
    return (
      inv.invoiceId.toLowerCase().includes(term) ||
      inv.tenantName.toLowerCase().includes(term) ||
      inv.propertyName.toLowerCase().includes(term) ||
      (inv.unitNumber && inv.unitNumber.toLowerCase().includes(term))
    );
  });

  const totalPages = Math.ceil(totalInvoices / 15) || 1;

  // Stats calculations
  const totalSentSum = invoices
    .filter(inv => inv.status !== 'Paid')
    .reduce((sum, inv) => sum + Number(inv.amountDue), 0);

  const totalPaidSum = invoices
    .filter(inv => inv.status === 'Paid')
    .reduce((sum, inv) => sum + Number(inv.amountDue), 0);

  const currentCurrency = getCurrencyConfig().code;

  const handleCurrencyChange = (code: string) => {
    localStorage.setItem('currency', code);
    onRefresh();
  };

  return (
    <div className="flex flex-col gap-5 w-full animate-fadeIn font-sans text-xs">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[var(--accent-coral)] text-black px-4 py-2 rounded-none shadow-[0_0_20px_rgba(255,107,107,0.35)] font-sans text-[11px] font-bold">
          {toast}
        </div>
      )}

      {/* Header section with theme elements */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-heading text-lg font-extrabold text-[var(--text-primary)] uppercase tracking-wider">Invoice Management</h2>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-1">Create, track, and manual-reconcile tenant invoice statements.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Dynamic Console Currency Selector */}
          <div className="flex items-center gap-0.5 border border-[var(--border-strong)] bg-ink-950 p-0.5 text-[9px] font-mono font-bold tracking-wider">
            <button 
              onClick={() => handleCurrencyChange('EUR')}
              className={`px-2.5 py-1.5 transition-all cursor-pointer ${
                currentCurrency === 'EUR' 
                  ? 'bg-[var(--accent-coral)] text-black' 
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              EUR (€)
            </button>
            <button 
              onClick={() => handleCurrencyChange('HUF')}
              className={`px-2.5 py-1.5 transition-all cursor-pointer ${
                currentCurrency === 'HUF' 
                  ? 'bg-[var(--accent-coral)] text-black' 
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              HUF (Ft)
            </button>
          </div>

          <button 
            onClick={handleExportCSV}
            className="border border-[var(--border-strong)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-white px-4 py-2.5 rounded-none flex items-center gap-2 cursor-pointer transition-all text-[10px] font-bold tracking-wider"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span>EXPORT</span>
          </button>
          <button 
            onClick={() => setNewInvoiceModalOpen(true)}
            className="bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-black font-extrabold px-4 py-2.5 rounded-none flex items-center gap-1.5 cursor-pointer transition-all text-[10px] tracking-wider"
          >
            <span>+ NEW INVOICE</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] p-4 rounded-none flex flex-col gap-1.5 shadow-inner relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-red-500"></div>
          <span className="text-[9px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider pl-1">OVERDUE (ACTION NEEDED)</span>
          <span className="text-xl font-black text-red-500 pl-1">{formatMoney(totalArrears)}</span>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] p-4 rounded-none flex flex-col gap-1.5 shadow-inner relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-amber-500"></div>
          <span className="text-[9px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider pl-1">OUTSTANDING (CURRENT PAGE)</span>
          <span className="text-xl font-black text-amber-500 pl-1">{formatMoney(totalSentSum)}</span>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] p-4 rounded-none flex flex-col gap-1.5 shadow-inner relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-[var(--border-strong)]"></div>
          <span className="text-[9px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider pl-1">DRAFTS</span>
          <span className="text-xl font-black text-[var(--text-secondary)] pl-1">{formatMoney(0)}</span>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] p-4 rounded-none flex flex-col gap-1.5 shadow-inner relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-emerald-500"></div>
          <span className="text-[9px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider pl-1">COLLECTED (CURRENT PAGE)</span>
          <span className="text-xl font-black text-emerald-500 pl-1">{formatMoney(totalPaidSum)}</span>
        </div>
      </div>

      {/* Search Input bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] flex items-center pointer-events-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </span>
          <input 
            type="text" 
            placeholder="Search by ID, Property, or Client..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-strong)] focus:border-[var(--accent-coral)] focus:ring-1 focus:ring-[var(--accent-coral)]/30 rounded-none pr-4 py-3 text-[var(--text-primary)] outline-none font-sans text-xs transition-all shadow-inner"
            style={{ paddingLeft: '2.75rem' }}
          />
        </div>
      </div>

      {/* Batch actions bar */}
      {selectedIds.length > 0 && (
        <div className="bg-[#0f1520] border border-[var(--accent-coral)]/35 rounded-none p-3.5 flex justify-between items-center gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-red-500 font-extrabold text-[10px] tracking-wider uppercase">{selectedIds.length} SELECTED</span>
          </div>
          <div className="flex gap-2.5">
            <button 
              onClick={() => setBatchReconcileOpen(true)} 
              className="bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-black text-[10px] font-extrabold px-4 py-2 rounded-none cursor-pointer transition-colors uppercase tracking-wider"
            >
              RECONCILE SELECTED ({selectedIds.length})
            </button>
            <button 
              onClick={() => setSelectedIds([])} 
              className="bg-transparent hover:bg-zinc-800/40 text-zinc-400 hover:text-white text-[10px] font-bold px-3 py-2 rounded-none transition-all uppercase tracking-wider"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Table & pagination card container */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded-none flex flex-col w-full overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-[var(--text-tertiary)] animate-pulse text-[11px] font-mono tracking-wider">
            SYNCING STATEMENT LEDGERS...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-tertiary)] text-[11px] tracking-wider">
            NO ISSUED INVOICES FOUND MATCHING FILTERS
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[800px]">
              <thead>
                <tr className="bg-ink-950/80 border-b border-[var(--border-muted)] text-[9px] text-[var(--text-tertiary)] uppercase font-bold tracking-wider">
                  <th className="py-3.5 px-5 w-12 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.length > 0 && selectedIds.length === invoices.filter(i => i.status !== 'Paid').length} 
                      onChange={toggleSelectAll} 
                      className="accent-[var(--accent-coral)] cursor-pointer" 
                    />
                  </th>
                  <th className="py-3.5 px-5">Invoice ID</th>
                  <th className="py-3.5 px-5">Client / Resident</th>
                  <th className="py-3.5 px-5">Purpose</th>
                  <th className="py-3.5 px-5">Billing Date</th>
                  <th className="py-3.5 px-5 text-right">Statement Amount</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-[var(--text-primary)]">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.invoiceId} className="border-b border-[var(--border-muted)] hover:bg-ink-950/30 transition-colors">
                    <td className="py-4 px-5 text-center">
                      {inv.status !== 'Paid' ? (
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(inv.invoiceId)} 
                          onChange={() => toggleSelectInvoice(inv.invoiceId)} 
                          className="accent-[var(--accent-coral)] cursor-pointer" 
                        />
                      ) : (
                        <span className="text-[9px] text-[var(--text-tertiary)]">-</span>
                      )}
                    </td>
                    <td className="py-4 px-5 font-bold font-mono text-[var(--text-primary)] tracking-wider text-[11px]">{inv.invoiceId}</td>
                    <td className="py-4 px-5">
                      <div className="font-extrabold text-[var(--text-primary)] text-[12px]">{inv.tenantName}</div>
                      <div className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5">
                        {inv.propertyName} • Unit {inv.unitNumber}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-[var(--text-secondary)] max-w-xs truncate">{inv.description || 'Rental Rent Statement'}</td>
                    <td className="py-4 px-5 text-[var(--text-secondary)]">{getInvoiceDate(inv.invoiceId)}</td>
                    <td className="py-4 px-5 text-right text-[var(--text-primary)] font-bold text-[12px]">{formatMoney(Number(inv.amountDue))}</td>
                    <td className="py-4 px-5 text-center">
                      {inv.status === 'Paid' ? (
                        <span className="inline-flex px-2 py-0.5 border rounded-none text-[9px] font-extrabold tracking-wider bg-emerald-500/10 text-emerald-400 border-emerald-500/25">PAID</span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 border rounded-none text-[9px] font-extrabold tracking-wider bg-red-500/10 text-red-400 border-red-500/25">OVERDUE</span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-right">
                      {inv.status !== 'Paid' ? (
                        <button 
                          onClick={() => { setReconcileInvoiceId(inv.invoiceId); setReconcileAmountDue(Number(inv.amountDue)); }} 
                          className="bg-[var(--accent-coral)]/10 hover:bg-[var(--accent-coral)] border border-[var(--accent-coral)]/30 text-[var(--accent-coral)] hover:text-black text-[9px] font-extrabold px-3 py-1.5 rounded-none transition-all tracking-wider uppercase cursor-pointer"
                        >
                          RECONCILE
                        </button>
                      ) : (
                        <span className="text-[9px] text-[var(--text-tertiary)] italic font-medium pr-2">Closed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Dynamic Pagination Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t border-[var(--border-muted)] bg-ink-950 text-[10px] text-[var(--text-tertiary)]">
          <div>
            Showing <span className="text-[var(--text-primary)] font-bold">{Math.min((currentPage - 1) * 15 + 1, totalInvoices)}</span> to <span className="text-[var(--text-primary)] font-bold">{Math.min(currentPage * 15, totalInvoices)}</span> of <span className="text-[var(--text-primary)] font-bold">{totalInvoices}</span> records
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={handlePrevPage} 
              disabled={currentPage === 1}
              className="p-2 rounded-none bg-ink-950 hover:bg-[var(--bg-tertiary)] border border-[var(--border-strong)] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-all text-white flex items-center justify-center"
              title="Previous Page"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(p => (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`w-7 h-7 rounded-none flex items-center justify-center font-extrabold text-[10px] transition-all cursor-pointer ${
                    currentPage === p 
                      ? 'bg-[var(--accent-coral)] text-black border border-[var(--accent-coral)] shadow-[0_0_8px_rgba(255,107,107,0.25)]' 
                      : 'bg-ink-950 text-[var(--text-secondary)] border border-[var(--border-strong)] hover:bg-[var(--bg-tertiary)] hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button 
              onClick={handleNextPage} 
              disabled={currentPage === totalPages}
              className="p-2 rounded-none bg-ink-950 hover:bg-[var(--bg-tertiary)] border border-[var(--border-strong)] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-all text-white flex items-center justify-center"
              title="Next Page"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Modals integrated */}
      {reconcileInvoiceId && (
        <ReconcileModal
          isOpen={reconcileInvoiceId !== null}
          onClose={() => setReconcileInvoiceId(null)}
          onSuccess={() => {
            showToast(`Invoice ${reconcileInvoiceId} payment registered successfully.`);
            onRefresh();
            setReconcileInvoiceId(null);
          }}
          invoiceId={reconcileInvoiceId}
          amountDue={reconcileAmountDue}
        />
      )}

      {batchReconcileOpen && (
        <BatchReconcileModal
          isOpen={batchReconcileOpen}
          onClose={() => setBatchReconcileOpen(false)}
          onSuccess={() => {
            showToast(`Reconciled ${selectedIds.length} statements.`);
            onRefresh();
            setSelectedIds([]);
            setBatchReconcileOpen(false);
          }}
          invoiceIds={selectedIds}
          totalDue={invoices
            .filter(inv => selectedIds.includes(inv.invoiceId))
            .reduce((sum, inv) => sum + Number(inv.amountDue), 0)}
        />
      )}

      {newInvoiceModalOpen && (
        <CreateInvoiceModal
          isOpen={newInvoiceModalOpen}
          onClose={() => setNewInvoiceModalOpen(false)}
          onSuccess={() => {
            showToast("New invoice issued successfully.");
            onRefresh();
            setNewInvoiceModalOpen(false);
          }}
          tenants={tenants}
        />
      )}
    </div>
  );
}
