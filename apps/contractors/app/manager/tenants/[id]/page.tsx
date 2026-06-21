'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '../../../../components/Sidebar';
import Topbar from '../../../../components/Topbar';
import LoadingOverlay from '../../../../components/LoadingOverlay';
import MoveModal from '../../../../components/tenants/MoveModal';
import ReconcileModal from '../../../../components/tenants/ReconcileModal';
import { formatMoney } from '../../../utils/currency';

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  unit: string;
  propertyId: string;
  propertyName: string;
  rent: string;
  arrears: string | number;
  status: string;
}

interface Invoice {
  invoiceId: string;
  tenantEmail: string;
  tenantName: string;
  unitNumber: string;
  amountDue: string | number;
  propertyName: string;
  status: string;
  created_by?: string;
  description?: string;
}

interface Ticket {
  id: string;
  description: string;
  urgency: string;
  status: string;
}

interface Property {
  id: string;
  name: string;
  unitsCount: number;
}

export default function TenantDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params?.id as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // States
  const [moveOpen, setMoveOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [invAmount, setInvAmount] = useState('');
  const [invDesc, setInvDesc] = useState('');
  const [isAddingInvoice, setIsAddingInvoice] = useState(false);
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketUrgency, setTicketUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [newNote, setNewNote] = useState('');

  // Reconcile dialog states
  const [reconcileInvoiceId, setReconcileInvoiceId] = useState<string | null>(null);
  const [reconcileAmountDue, setReconcileAmountDue] = useState<number>(0);

  useEffect(() => {
    if (tenantId) {
      fetchTenantData();
      const savedNotes = localStorage.getItem(`tenant_notes_${tenantId}`);
      if (savedNotes) {
        try { setNotes(JSON.parse(savedNotes)); } catch (e) {}
      }
    }
  }, [tenantId]);

  const fetchTenantData = () => {
    const session = localStorage.getItem('user');
    if (!session) { router.push('/login'); return; }
    let token = '';
    try { token = JSON.parse(session).id; } catch (e) { router.push('/login'); return; }

    setLoading(true);
    const headers = { 'Authorization': `Bearer ${token}` };

    Promise.all([
      fetch('http://localhost:4000/api/properties/tenants', { headers }).then(r => r.ok ? r.json() : []),
      fetch('http://localhost:4000/api/properties', { headers }).then(r => r.ok ? r.json() : []),
      fetch('http://localhost:4000/api/properties/invoices', { headers }).then(r => r.ok ? r.json() : []),
      fetch('http://localhost:4000/api/tickets', { headers }).then(r => r.ok ? r.json() : [])
    ])
      .then(([tnts, props, invs, tcks]) => {
        const found = (tnts || []).find((t: Tenant) => t.id === tenantId);
        if (!found) { router.push('/manager/tenants'); return; }
        setTenant(found);
        setProperties(props || []);
        setInvoices(Array.isArray(invs) ? invs : (invs?.data || []));
        setTickets((tcks || []).filter((tc: any) => tc.tenantId === found.email));
        setLoading(false);
      })
      .catch((err) => { console.error(err); setLoading(false); });
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !invDesc.trim()) return;
    const amount = parseFloat(invAmount);
    if (isNaN(amount) || amount <= 0) return;

    const session = localStorage.getItem('user');
    if (!session) return;
    let token = '';
    try { token = JSON.parse(session).id; } catch (e) { return; }

    setIsAddingInvoice(true);
    try {
      const res = await fetch('http://localhost:4000/api/properties/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          tenantEmail: tenant.email,
          tenantName: tenant.name,
          unitNumber: tenant.unit,
          amountDue: amount,
          propertyName: tenant.propertyName,
          description: invDesc.trim()
        })
      });

      if (res.ok) {
        setInvAmount('');
        setInvDesc('');
        showToast('Manual invoice generated successfully!');
        fetchTenantData();
      }
    } catch (err) { console.error(err); } finally { setIsAddingInvoice(false); }
  };

  const handleReconcile = async (invoiceId: string, method: string) => {
    const session = localStorage.getItem('user');
    if (!session) return;
    let token = '';
    try { token = JSON.parse(session).id; } catch (e) { return; }

    try {
      const res = await fetch(`http://localhost:4000/api/properties/invoices/${invoiceId}/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ paymentMethod: method })
      });
      if (res.ok) {
        showToast(`Invoice ${invoiceId} marked paid via ${method}!`);
        fetchTenantData();
      }
    } catch (err) { console.error(err); }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !ticketDesc.trim()) return;

    const session = localStorage.getItem('user');
    if (!session) return;
    let token = '';
    try { token = JSON.parse(session).id; } catch (e) { return; }

    setIsCreatingTicket(true);
    try {
      const res = await fetch('http://localhost:4000/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          description: ticketDesc.trim(),
          urgency: ticketUrgency,
          tenantId: tenant.email,
          propertyId: tenant.propertyId
        })
      });

      if (res.ok) {
        setTicketDesc('');
        showToast('Support ticket logged!');
        fetchTenantData();
      }
    } catch (err) { console.error(err); } finally { setIsCreatingTicket(false); }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    const updated = [...notes, `${new Date().toLocaleDateString()}: ${newNote.trim()}`];
    setNotes(updated);
    localStorage.setItem(`tenant_notes_${tenantId}`, JSON.stringify(updated));
    setNewNote('');
    showToast('Saved note to local log.');
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const tenantInvoices = useMemo(() => {
    if (!tenant) return [];
    return invoices.filter(i => i.tenantEmail === tenant.email || i.tenantName === tenant.name);
  }, [tenant, invoices]);

  if (loading || !tenant) {
    return <LoadingOverlay active={true} message="Reading Resident Registry Ledger..." />;
  }

  return (
    <div className="h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-body flex relative overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)] relative">
        <Topbar onToggleCommandPalette={() => {}} />

        <main className="flex-1 overflow-y-auto relative w-full smooth-scroll p-4 md:p-6 lg:p-8 bg-grid z-10">
          {toast && <div className="fixed top-4 right-4 z-50 bg-[var(--accent-coral)] text-black px-4 py-2 rounded shadow-glow-coral font-mono text-xs font-bold animate-slideUp">{toast}</div>}

          <div className="flex justify-between items-center border-b border-[var(--border-muted)] pb-3 mb-6">
            <button onClick={() => router.push('/manager/tenants')} className="flex items-center gap-1.5 text-xs font-mono text-[var(--accent-coral)] hover:text-[var(--text-primary)] transition-all cursor-pointer">
              ← BACK TO DIRECTORY
            </button>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${tenant.status === 'Active' ? 'bg-emerald-500' : 'bg-yellow-500'}`} />
              <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-widest">{tenant.status} PROFILE</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Profile Card */}
              <div className="ops-card p-5 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <h2 className="font-heading text-xl font-bold tracking-tight text-[var(--text-primary)]">{tenant.name}</h2>
                    <div className="flex flex-col gap-1 mt-3 text-xs font-mono text-[var(--text-secondary)]">
                      <div className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        <span>{tenant.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        <span>{tenant.phone || 'No phone recorded'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-[var(--bg-tertiary)] border border-[var(--border-muted)] rounded p-4 font-mono text-xs w-full sm:w-auto">
                    <div className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold tracking-wider mb-2">CURRENT ASSIGNMENT</div>
                    <div className="text-[var(--text-primary)] font-bold">{tenant.propertyName}</div>
                    <div className="text-[var(--text-secondary)] mt-1 font-semibold">Chamber: {tenant.unit}</div>
                    <button onClick={() => setMoveOpen(true)} className="mt-3 w-full bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-black text-[10px] font-bold py-1 px-3 rounded transition-all cursor-pointer">RELOCATE</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-[var(--border-muted)] pt-4 mt-5 text-xs font-mono">
                  <div><span className="text-[9px] text-[var(--text-tertiary)] uppercase block mb-0.5">Rent Roll</span><span className="font-bold text-[var(--text-primary)]">{formatMoney(Number(tenant.rent))}</span></div>
                  <div><span className="text-[9px] text-[var(--text-tertiary)] uppercase block mb-0.5">Arrears Balance</span><span className={`font-bold ${parseFloat(String(tenant.arrears)) > 0 ? 'text-[var(--accent-coral)]' : 'text-emerald-500'}`}>{formatMoney(Number(tenant.arrears))}</span></div>
                  <div><span className="text-[9px] text-[var(--text-tertiary)] uppercase block mb-0.5">Billing Email</span><span className="font-bold text-[var(--text-secondary)] truncate block">{tenant.email}</span></div>
                </div>
              </div>

              {/* Invoices table */}
              <div className="ops-card p-5">
                <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-muted)] pb-2 mb-4 uppercase tracking-wider">Statement Ledger</h3>
                {tenantInvoices.length === 0 ? (
                  <div className="p-8 border border-dashed border-[var(--border-muted)] text-center text-xs text-[var(--text-tertiary)] font-mono rounded">No transactions logged</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-muted)] text-[9px] text-[var(--text-tertiary)] uppercase pb-2">
                          <th className="pb-2">Invoice ID</th>
                          <th className="pb-2">Description / Reason</th>
                          <th className="pb-2 text-right">Amount</th>
                          <th className="pb-2 text-right">Issuer</th>
                          <th className="pb-2 text-right">Reconciliation Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tenantInvoices.map(inv => (
                          <tr key={inv.invoiceId} className="border-b border-[var(--border-muted)]/50 py-3 hover:bg-[var(--bg-tertiary)]/30 transition-all">
                            <td className="py-3 font-bold text-[var(--text-primary)]">{inv.invoiceId}</td>
                            <td className="py-3 text-[var(--text-secondary)] pr-4 max-w-xs break-words">{inv.description || 'Rental Rent Statement'}</td>
                            <td className="py-3 text-right text-[var(--text-secondary)] font-bold">{formatMoney(Number(inv.amountDue))}</td>
                            <td className="py-3 text-right text-[var(--text-tertiary)]">{inv.created_by || 'System Auto'}</td>
                            <td className="py-3 text-right">
                              {inv.status === 'Paid' ? (
                                <span className="inline-flex px-1.5 py-0.5 border rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border-emerald-500/20">PAID</span>
                              ) : (
                                <button onClick={() => { setReconcileInvoiceId(inv.invoiceId); setReconcileAmountDue(Number(inv.amountDue)); }} className="bg-[var(--accent-coral)]/10 hover:bg-[var(--accent-coral)] border border-[var(--accent-coral)]/30 text-[var(--accent-coral)] hover:text-black text-[9px] font-bold px-2.5 py-0.5 rounded cursor-pointer transition-all">RECONCILE</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Maintenance list */}
              <div className="ops-card p-5">
                <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-muted)] pb-2 mb-4 uppercase tracking-wider">Maintenance Log</h3>
                {tickets.length === 0 ? (
                  <div className="p-8 border border-dashed border-[var(--border-muted)] text-center text-xs text-[var(--text-tertiary)] font-mono rounded">No support tickets logged</div>
                ) : (
                  <div className="flex flex-col gap-2.5 font-mono text-xs">
                    {tickets.map(t => (
                      <div key={t.id} className="border border-[var(--border-muted)] bg-[var(--bg-primary)] p-3 rounded flex justify-between items-center hover:border-[var(--color-ink-500)] transition-all">
                        <div>
                          <div className="font-bold text-[var(--text-primary)]">{t.description}</div>
                          <div className="text-[9px] text-[var(--text-tertiary)] uppercase mt-0.5 font-semibold">ID: {t.id} • Urgency: {t.urgency}</div>
                        </div>
                        <span className={`px-1.5 py-0.5 border rounded text-[8px] font-bold ${t.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>{t.status.toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Sidebar actions */}
            <div className="flex flex-col gap-6">
              
              {/* Create manual invoice */}
              <div className="ops-card p-5">
                <h3 className="font-heading text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-4">Generate Manual Charge</h3>
                <form onSubmit={handleCreateInvoice} className="flex flex-col gap-3.5 font-mono text-xs">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-[var(--text-tertiary)] uppercase font-bold">Charge Amount</label>
                    <input type="number" required min={1} placeholder="e.g. 50" value={invAmount} onChange={e => setInvAmount(e.target.value)} className="cyber-input p-2 rounded text-[var(--text-primary)] outline-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-[var(--text-tertiary)] uppercase font-bold">Billing Reason / Description</label>
                    <textarea required rows={2} placeholder="Explain the charge detail..." value={invDesc} onChange={e => setInvDesc(e.target.value)} className="cyber-input p-2 rounded text-[var(--text-primary)] outline-none resize-none" />
                  </div>
                  <button type="submit" disabled={isAddingInvoice} className="w-full bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg-primary)] font-bold py-2 rounded transition-colors cursor-pointer text-center">{isAddingInvoice ? 'Issuing...' : 'Create Invoice'}</button>
                </form>
              </div>

              {/* Log Maintenance */}
              <div className="ops-card p-5">
                <h3 className="font-heading text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-4">File Maintenance Ticket</h3>
                <form onSubmit={handleCreateTicket} className="flex flex-col gap-3.5 font-mono text-xs">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-[var(--text-tertiary)] uppercase font-bold">Defect Description</label>
                    <textarea required rows={2} placeholder="Describe the defect..." value={ticketDesc} onChange={e => setTicketDesc(e.target.value)} className="cyber-input p-2 rounded text-[var(--text-primary)] outline-none resize-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-[var(--text-tertiary)] uppercase font-bold">Urgency Priority</label>
                    <select value={ticketUrgency} onChange={e => setTicketUrgency(e.target.value as any)} className="cyber-input p-2 rounded text-[var(--text-primary)] outline-none">
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Urgency</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                  <button type="submit" disabled={isCreatingTicket} className="w-full bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-black font-bold py-2 rounded transition-colors cursor-pointer text-center">{isCreatingTicket ? 'Logging...' : 'Create Ticket'}</button>
                </form>
              </div>

              {/* Notebook */}
              <div className="ops-card p-5 flex flex-col gap-3">
                <h3 className="font-heading text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">Staff Notepad</h3>
                <div className="flex flex-col gap-2 max-h-36 overflow-y-auto font-mono text-[10px] border border-[var(--border-muted)] rounded p-2 bg-[var(--bg-primary)]">
                  {notes.length === 0 ? <span className="text-[var(--text-tertiary)] italic">No notebook records found.</span> : notes.map((n, idx) => <div key={idx} className="border-b border-[var(--border-muted)]/50 pb-1 last:border-b-0 text-[var(--text-secondary)]">{n}</div>)}
                </div>
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input type="text" placeholder="Add notes..." value={newNote} onChange={e => setNewNote(e.target.value)} className="flex-1 cyber-input px-2.5 py-1.5 rounded text-xs outline-none font-mono text-[var(--text-primary)]" />
                  <button type="submit" className="bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg-primary)] font-bold px-3 py-1.5 rounded text-[11px] font-mono cursor-pointer">Save</button>
                </form>
              </div>

            </div>
          </div>
        </main>
      </div>

      {moveOpen && (
        <MoveModal 
          isOpen={moveOpen}
          onClose={() => setMoveOpen(false)}
          onSuccess={() => { setMoveOpen(false); fetchTenantData(); showToast('Tenant relocated successfully!'); }}
          tenantId={tenant.id}
          tenantName={tenant.name}
          currentUnit={tenant.unit}
          properties={properties}
        />
      )}

      {reconcileInvoiceId && (
        <ReconcileModal
          isOpen={reconcileInvoiceId !== null}
          onClose={() => setReconcileInvoiceId(null)}
          onSuccess={() => {
            setReconcileInvoiceId(null);
            fetchTenantData();
            showToast(`Invoice ${reconcileInvoiceId} payment manual entry saved.`);
          }}
          invoiceId={reconcileInvoiceId}
          amountDue={reconcileAmountDue}
        />
      )}
    </div>
  );
}
