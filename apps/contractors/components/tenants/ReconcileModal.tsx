'use client';

import React, { useState, useEffect } from 'react';
import { formatMoney } from '../../app/utils/currency';

interface ReconcileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoiceId: string;
  amountDue: number;
}

export default function ReconcileModal({ isOpen, onClose, onSuccess, invoiceId, amountDue }: ReconcileModalProps) {
  const [amountPaid, setAmountPaid] = useState<string>(String(amountDue));
  const [description, setDescription] = useState<string>('Statement balance payment reconciliation');
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAmountPaid(String(amountDue));
    setDescription('Statement balance payment reconciliation');
    setReceiptUrl('');
    setError(null);
  }, [invoiceId, amountDue, isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:4000/api/properties/invoices/upload-receipt', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setReceiptUrl(data.url);
      } else {
        setError('Failed to upload receipt file.');
      }
    } catch (err) {
      console.error(err);
      setError('Upload server connection error.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountPaid);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Provide a valid reconciliation amount.');
      return;
    }

    const session = localStorage.getItem('user');
    if (!session) return;
    let token = '';
    try { token = JSON.parse(session).id; } catch (err) { return; }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`http://localhost:4000/api/properties/invoices/${invoiceId}/reconcile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amountPaid: parsedAmount,
          description: description.trim(),
          receiptUrl
        })
      });

      if (res.ok) {
        onSuccess();
      } else {
        setError('Failed to log reconciliation details.');
      }
    } catch (err) {
      console.error(err);
      setError('Network communication error.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-[#080c10] border border-zinc-800 w-full max-w-md rounded-xl p-6 shadow-2xl relative overflow-hidden font-sans text-xs">
        
        {/* Glow neon top line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--accent-coral)] via-orange-400 to-[var(--accent-coral)] shadow-[0_0_12px_rgba(255,107,107,0.5)]"></div>
        
        <h3 className="font-heading text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-zinc-850 pb-3">
          Reconcile Invoice {invoiceId}
        </h3>

        {error && (
          <div className="bg-red-500/10 border border-red-500/25 text-red-400 p-3 rounded-lg mb-4 font-mono text-[10px] tracking-wide">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] text-zinc-400 uppercase font-extrabold tracking-wider">Outstanding Statement</label>
            <div className="p-3 bg-[#0a0f14] border border-zinc-850 text-white font-extrabold rounded-lg text-sm shadow-inner">
              {formatMoney(amountDue)}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] text-zinc-400 uppercase font-extrabold tracking-wider">Reconciled Amount Paid</label>
            <input 
              type="number" 
              required 
              min={0.01} 
              step="any"
              placeholder="e.g. 500" 
              value={amountPaid} 
              onChange={e => setAmountPaid(e.target.value)} 
              className="w-full bg-[#0a0f14]/85 border border-zinc-850 focus:border-[var(--accent-coral)] focus:ring-1 focus:ring-[var(--accent-coral)]/30 rounded-lg p-3 text-white outline-none font-sans text-xs transition-all shadow-inner" 
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] text-zinc-400 uppercase font-extrabold tracking-wider">Audit Description / Note</label>
            <textarea 
              required 
              rows={2} 
              placeholder="Provide a payment reference or note..." 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="w-full bg-[#0a0f14]/85 border border-zinc-850 focus:border-[var(--accent-coral)] focus:ring-1 focus:ring-[var(--accent-coral)]/30 rounded-lg p-3 text-white outline-none font-sans text-xs transition-all shadow-inner resize-none" 
            />
          </div>

          {/* Premium upload zone */}
          <div className="flex flex-col gap-2">
            <label className="text-[9px] text-zinc-400 uppercase font-extrabold tracking-wider">Upload Receipt</label>
            <div className="relative">
              <input 
                type="file" 
                accept="image/*,application/pdf"
                onChange={handleFileUpload} 
                className="hidden" 
                id="receipt-file-picker"
              />
              <label 
                htmlFor="receipt-file-picker" 
                className={`flex flex-col items-center justify-center border border-dashed rounded-lg p-4 cursor-pointer transition-all ${
                  receiptUrl 
                    ? 'border-emerald-500/50 bg-emerald-500/5' 
                    : 'border-zinc-800 hover:border-[var(--accent-coral)]/50 bg-[#0a0f14]/85 hover:bg-[#0a0f14]'
                }`}
              >
                <svg className={`w-6 h-6 mb-1.5 ${receiptUrl ? 'text-emerald-400' : 'text-zinc-500'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  {receiptUrl ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  )}
                </svg>
                <span className="text-[10px] font-bold text-white">
                  {uploading ? 'Uploading file...' : receiptUrl ? 'Receipt attached successfully' : 'Choose receipt file...'}
                </span>
                <span className="text-[9px] text-zinc-500 mt-0.5">PDF or image formats accepted</span>
              </label>
            </div>
            {receiptUrl && (
              <a 
                href={receiptUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="text-[9px] text-[var(--accent-coral)] hover:underline mt-0.5 block truncate text-center"
              >
                View uploaded receipt asset ↗
              </a>
            )}
          </div>

          <div className="flex justify-end gap-2.5 mt-2 border-t border-zinc-850 pt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="bg-transparent hover:bg-zinc-900/60 border border-transparent hover:border-zinc-800 text-zinc-400 hover:text-white px-4 py-2 rounded-lg transition-all text-[10px] font-bold tracking-wider"
            >
              CANCEL
            </button>
            <button 
              type="submit" 
              disabled={submitting || uploading} 
              className="bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-black font-extrabold px-4 py-2 rounded-lg transition-all text-[10px] tracking-wider cursor-pointer"
            >
              {submitting ? 'RECONCILING...' : 'RECONCILE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
