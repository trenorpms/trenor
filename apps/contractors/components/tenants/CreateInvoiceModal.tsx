'use client';

import React, { useState } from 'react';

interface Tenant {
  id: string;
  name: string;
  email: string;
  unit?: string;
  propertyName?: string;
  propertyId?: string;
}

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenants: Tenant[];
}

export default function CreateInvoiceModal({ isOpen, onClose, onSuccess, tenants }: CreateInvoiceModalProps) {
  const [selectedTenantId, setSelectedTenantId] = useState<string>(tenants[0]?.id || '');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('Statement balance invoice');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid positive invoice amount.');
      return;
    }

    const session = localStorage.getItem('user');
    if (!session) return;
    let token = '';
    try { token = JSON.parse(session).id; } catch (err) { return; }

    const tenant = tenants.find(t => t.id === selectedTenantId);
    if (!tenant) {
      setError('Please select a valid tenant.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:4000/api/properties/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tenantEmail: tenant.email,
          tenantName: tenant.name,
          unitNumber: tenant.unit || 'A1',
          amountDue: parsedAmount,
          propertyName: tenant.propertyName || 'Unknown Property',
          description: description.trim()
        })
      });

      if (res.ok) {
        setAmount('');
        setDescription('Statement balance invoice');
        onSuccess();
      } else {
        setError('Failed to issue invoice statement.');
      }
    } catch (err) {
      console.error(err);
      setError('Network communication error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-ink-900 border border-[var(--border-muted)] w-full max-w-md rounded-none p-7 shadow-[0_0_50px_0_rgba(0,0,0,0.85)] font-mono text-xs relative overflow-hidden">
        {/* Neon top highlight */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent-coral)] to-transparent opacity-60"></div>

        <h3 className="font-heading text-sm font-extrabold text-[var(--text-primary)] uppercase tracking-widest mb-5 border-b border-[var(--border-muted)] pb-3">
          Issue New Invoice
        </h3>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-3 rounded-none mb-4 font-mono text-[10px]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold tracking-wider">Select Tenant</label>
            <div className="relative">
              <select
                value={selectedTenantId}
                onChange={e => setSelectedTenantId(e.target.value)}
                className="w-full appearance-none bg-ink-950 border border-[var(--border-strong)] focus:border-[var(--accent-coral)] focus:ring-1 focus:ring-[var(--accent-coral)]/30 rounded-none px-3.5 py-3 text-[var(--text-primary)] outline-none font-mono text-xs pr-10 transition-all cursor-pointer shadow-inner"
                required
              >
                <option value="" disabled>Choose a tenant...</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id} className="bg-ink-950 text-[var(--text-primary)]">
                    {t.name} ({t.propertyName || 'Property'} - Unit {t.unit || 'N/A'})
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold tracking-wider">Invoice Amount (€)</label>
            <input 
              type="number" 
              required 
              min={0.01} 
              step="any"
              placeholder="e.g. 550" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              className="w-full bg-ink-950 border border-[var(--border-strong)] focus:border-[var(--accent-coral)] focus:ring-1 focus:ring-[var(--accent-coral)]/30 rounded-none px-3.5 py-3 text-[var(--text-primary)] outline-none font-mono text-xs transition-all shadow-inner" 
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold tracking-wider">Description / Billing Purpose</label>
            <textarea 
              required 
              rows={3} 
              placeholder="Provide invoice description (e.g., Monthly Rent payment or utility adjustments)" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="w-full bg-ink-950 border border-[var(--border-strong)] focus:border-[var(--accent-coral)] focus:ring-1 focus:ring-[var(--accent-coral)]/30 rounded-none px-3.5 py-3 text-[var(--text-primary)] outline-none font-mono text-xs transition-all resize-none shadow-inner" 
            />
          </div>

          <div className="flex justify-end gap-3.5 mt-3 border-t border-[var(--border-muted)] pt-4.5">
            <button 
              type="button" 
              onClick={onClose} 
              className="bg-transparent hover:bg-[var(--bg-secondary)] border border-transparent hover:border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-white px-5 py-2.5 rounded-none font-bold uppercase transition-all tracking-wider text-[10px]"
            >
              CANCEL
            </button>
            <button 
              type="submit" 
              disabled={submitting || tenants.length === 0} 
              className="bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-black font-extrabold px-5 py-2.5 rounded-none transition-all shadow-md hover:shadow-glow-coral text-[10px] tracking-wider uppercase"
            >
              {submitting ? 'ISSUING...' : 'ISSUE INVOICE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
