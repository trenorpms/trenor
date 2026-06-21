'use client';

import React, { useState } from 'react';
import { formatMoney } from '../../app/utils/currency';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  propertyId: string;
  propertyName: string;
  createdAt: string;
}

interface Property {
  id: string;
  name: string;
}

interface ExpenseTableProps {
  expenses: Expense[];
  properties: Property[];
  onRefresh: () => void;
}

export default function ExpenseTable({ expenses, properties, onRefresh }: ExpenseTableProps) {
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expDescription, setExpDescription] = useState('');
  const [expCategory, setExpCategory] = useState('Maintenance');
  const [expPropertyId, setExpPropertyId] = useState(properties[0]?.id || '');
  const [expAmount, setExpAmount] = useState('');
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expAmount);
    if (!expDescription.trim() || isNaN(amount) || amount <= 0 || !expPropertyId) return;

    const session = localStorage.getItem('user');
    if (!session) return;
    let token = '';
    try { token = JSON.parse(session).id; } catch (err) { return; }

    const selectedProp = properties.find(p => p.id === expPropertyId);
    const propName = selectedProp ? selectedProp.name : 'Unknown';

    setSubmittingExpense(true);
    try {
      const res = await fetch('http://localhost:4000/api/properties/expenses', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          description: expDescription.trim(),
          amount,
          category: expCategory,
          propertyId: expPropertyId,
          propertyName: propName
        })
      });

      if (res.ok) {
        setExpDescription('');
        setExpAmount('');
        setExpenseModalOpen(false);
        showToast('Operational expense recorded successfully.');
        onRefresh();
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      setSubmittingExpense(false); 
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full animate-fadeIn font-mono text-xs">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[var(--accent-coral)] text-black px-4 py-2 rounded shadow-glow-coral font-mono text-xs font-bold animate-slideUp">
          {toast}
        </div>
      )}

      <div className="flex justify-between items-center mb-1">
        <div>
          <h2 className="font-heading text-lg font-bold text-[var(--text-primary)]">Operational Expenses</h2>
          <p className="text-[10px] text-[var(--text-tertiary)]">Log and audit maintenance or utility expense records.</p>
        </div>
        <button 
          onClick={() => {
            if (properties.length > 0 && !expPropertyId) {
              const firstProp = properties[0];
              if (firstProp) {
                setExpPropertyId(firstProp.id);
              }
            }
            setExpenseModalOpen(true);
          }} 
          className="bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-black font-bold px-3.5 py-2 rounded transition-all cursor-pointer"
        >
          RECORD EXPENSE
        </button>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded-xl flex flex-col w-full overflow-hidden shadow-xl">
        {expenses.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-tertiary)]">
            NO RECORDED EXPENSES REGISTERED IN SYSTEM
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[700px]">
              <thead>
                <tr className="bg-[var(--bg-primary)] border-b border-[var(--border-muted)] text-[9px] text-[var(--text-tertiary)] uppercase font-bold">
                  <th className="py-3 px-5">Expense ID</th>
                  <th className="py-3 px-5">Description</th>
                  <th className="py-3 px-5">Category</th>
                  <th className="py-3 px-5">Property Name</th>
                  <th className="py-3 px-5 text-right">Amount Paid</th>
                  <th className="py-3 px-5 text-right">Logged At</th>
                </tr>
              </thead>
              <tbody className="text-[var(--text-secondary)]">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-[var(--border-muted)]/50 hover:bg-[var(--bg-tertiary)] transition-colors">
                    <td className="py-4 px-5 text-[var(--text-primary)] font-bold">{exp.id}</td>
                    <td className="py-4 px-5 text-[var(--text-primary)]">{exp.description}</td>
                    <td className="py-4 px-5">
                      <span className="px-1.5 py-0.5 border border-[var(--border-muted)] bg-[var(--bg-primary)] rounded text-[9px] font-bold uppercase">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-4 px-5">{exp.propertyName}</td>
                    <td className="py-4 px-5 text-right text-[var(--accent-coral)] font-bold">{formatMoney(Number(exp.amount))}</td>
                    <td className="py-4 px-5 text-right text-[var(--text-tertiary)]">
                      {new Date(exp.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {expenseModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] w-full max-w-md rounded p-6 shadow-2xl font-mono text-xs">
            <h3 className="font-heading text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-4 border-b border-[var(--border-muted)] pb-2">
              Record Operational Expense
            </h3>
            <form onSubmit={handleRecordExpense} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-[var(--text-tertiary)] uppercase font-bold">Expense Description</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Cleared sewage blockages in Unit A" 
                  value={expDescription} 
                  onChange={e => setExpDescription(e.target.value)} 
                  className="cyber-input p-2.5 rounded text-[var(--text-primary)] outline-none" 
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-[var(--text-tertiary)] uppercase font-bold">Amount Payout (€)</label>
                <input 
                  type="number" 
                  required 
                  min={0.01} 
                  step="any"
                  placeholder="e.g. 150" 
                  value={expAmount} 
                  onChange={e => setExpAmount(e.target.value)} 
                  className="cyber-input p-2.5 rounded text-[var(--text-primary)] outline-none" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-[var(--text-tertiary)] uppercase font-bold">Category</label>
                  <select 
                    value={expCategory} 
                    onChange={e => setExpCategory(e.target.value)} 
                    className="cyber-input p-2.5 rounded text-[var(--text-primary)] outline-none bg-[var(--bg-primary)]"
                  >
                    <option value="Maintenance">Maintenance</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Tax">Taxation</option>
                    <option value="Legal">Legal Fees</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-[var(--text-tertiary)] uppercase font-bold">Property</label>
                  <select 
                    value={expPropertyId} 
                    onChange={e => setExpPropertyId(e.target.value)} 
                    className="cyber-input p-2.5 rounded text-[var(--text-primary)] outline-none bg-[var(--bg-primary)]"
                  >
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2 border-t border-[var(--border-muted)] pt-3">
                <button 
                  type="button" 
                  onClick={() => setExpenseModalOpen(false)} 
                  className="bg-transparent hover:text-[var(--text-primary)] text-[var(--text-secondary)] px-4 py-2"
                >
                  CANCEL
                </button>
                <button 
                  type="submit" 
                  disabled={submittingExpense || properties.length === 0} 
                  className="bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-black font-bold px-4 py-2 rounded"
                >
                  {submittingExpense ? 'Logging...' : 'RECORD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
