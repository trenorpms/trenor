'use client';

import React, { useState, useEffect } from 'react';
import { TableRowSkeleton } from '../Skeleton';

interface AuditLog {
  id: string;
  landlordId: string;
  action: string;
  description: string;
  createdAt: string;
}

export default function AuditLogsPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = () => {
    const session = localStorage.getItem('user');
    if (!session) {
      setLoading(false);
      return;
    }
    let token = '';
    try {
      token = JSON.parse(session).id;
    } catch (e) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let url = 'http://localhost:4000/api/properties/audit-logs';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setLogs(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching audit logs:', err);
        setLoading(false);
      });
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'Evict Tenant':
        return 'bg-red-500/10 text-red-500 border-red-500/25';
      case 'Move Tenant':
      case 'Swap Residents':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/25';
      case 'Reconcile Invoice':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
      case 'Create Invoice':
        return 'bg-[var(--accent-coral)]/10 text-[var(--accent-coral)] border-[var(--accent-coral)]/25';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/25';
    }
  };

  return (
    <div className="flex flex-col w-full font-sans text-xs gap-5">
      {/* Date Filter Bar */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] p-4 rounded-none flex flex-wrap items-end gap-4 shadow-inner">
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] text-[var(--text-tertiary)] uppercase font-bold tracking-wider font-mono">Start Date</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
            className="w-48 bg-ink-950 border border-[var(--border-strong)] focus:border-[var(--accent-coral)] text-[var(--text-primary)] rounded-none outline-none p-2.5 font-mono text-xs transition-all shadow-inner" 
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] text-[var(--text-tertiary)] uppercase font-bold tracking-wider font-mono">End Date</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)} 
            className="w-48 bg-ink-950 border border-[var(--border-strong)] focus:border-[var(--accent-coral)] text-[var(--text-primary)] rounded-none outline-none p-2.5 font-mono text-xs transition-all shadow-inner" 
          />
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <button 
            onClick={fetchLogs} 
            className="bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-black px-5 py-2.5 font-extrabold rounded-none cursor-pointer transition-all text-[10px] tracking-wider uppercase"
          >
            FILTER LOGS
          </button>
          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); setTimeout(fetchLogs, 0); }} 
              className="bg-transparent hover:text-white text-[var(--text-secondary)] px-4 py-2.5 rounded-none font-bold cursor-pointer transition-all text-[10px] tracking-wider uppercase"
            >
              CLEAR
            </button>
          )}
        </div>
      </div>

      {/* Logs Table Container */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded-none flex flex-col w-full overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex flex-col">
            <div className="h-10 bg-ink-950 border-b border-[var(--border-muted)] animate-pulse w-full"></div>
            <TableRowSkeleton /><TableRowSkeleton /><TableRowSkeleton />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-tertiary)] font-mono text-[11px] tracking-wider uppercase">
            NO COMPATIBLE SECURITY EVENTS LOGGED
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px] text-xs">
              <thead>
                <tr className="bg-ink-950/80 border-b border-[var(--border-muted)] text-[9px] text-[var(--text-tertiary)] uppercase font-bold tracking-wider font-mono">
                  <th className="py-3.5 px-5 w-44">Timestamp</th>
                  <th className="py-3.5 px-5 w-44">Log ID</th>
                  <th className="py-3.5 px-5 w-40">Action Category</th>
                  <th className="py-3.5 px-5">Description Log Statement</th>
                </tr>
              </thead>
              <tbody className="text-[var(--text-primary)]">
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-[var(--border-muted)] hover:bg-ink-950/30 transition-colors">
                    <td className="py-4 px-5 text-[var(--text-tertiary)] font-mono text-[11px]">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="py-4 px-5 text-[var(--text-primary)] font-bold font-mono text-[11px]">{log.id}</td>
                    <td className="py-4 px-5">
                      <span className={`px-2 py-0.5 border rounded-none text-[9px] font-extrabold tracking-wider uppercase ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-[var(--text-secondary)] font-mono max-w-lg break-words text-[11px]">{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
