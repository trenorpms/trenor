'use client';

import React, { useState, useEffect } from 'react';

interface Ticket {
  id: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  status: string;
  tenantId: string;
  propertyName?: string;
  unitNumber?: string;
  createdAt: string;
  contractorId?: number;
  amount?: number;
  contractorAccepted?: boolean;
  rejectReason?: string;
}

interface Contractor {
  id: number;
  name: string;
  email: string;
  specialty: string;
  phone?: string;
  status: string;
  bio?: string;
  hourlyRate?: number;
}

interface MaintenanceTabProps {
  addToast: (msg: string, type: 'success' | 'info' | 'error') => void;
}

export default function MaintenanceTab({ addToast }: MaintenanceTabProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);

  // Hiring Form States
  const [hiringTicketId, setHiringTicketId] = useState<string | null>(null);
  const [selectedContractorId, setSelectedContractorId] = useState<string>('');
  const [hireAmount, setHireAmount] = useState<string>('');
  const [submittingHire, setSubmittingHire] = useState(false);

  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchData();
  }, [showHistory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ticketsRes, contractorsRes] = await Promise.all([
        fetch(`http://localhost:4000/api/tickets?showHistory=${showHistory}`),
        fetch('http://localhost:4000/api/tickets/contractors')
      ]);

      if (ticketsRes.ok) {
        const tData = await ticketsRes.json();
        setTickets(tData);
      }
      if (contractorsRes.ok) {
        const cData = await contractorsRes.json();
        setContractors(cData);
      }
    } catch (err) {
      console.error('Error fetching maintenance data:', err);
      addToast('Failed to sync maintenance data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectTicket = async (ticketId: string) => {
    const reason = prompt('Please enter the reason for rejecting this maintenance request:');
    if (!reason || !reason.trim()) {
      return;
    }
    
    try {
      const res = await fetch(`http://localhost:4000/api/tickets/${ticketId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() })
      });
      
      if (!res.ok) throw new Error('Rejection failed');
      
      addToast('Maintenance request rejected successfully.', 'info');
      fetchData();
    } catch (err) {
      addToast('Failed to reject maintenance request.', 'error');
    }
  };

  const handleHireSubmit = async (e: React.FormEvent, ticketId: string) => {
    e.preventDefault();
    if (!selectedContractorId || !hireAmount) {
      addToast('Please select a technician and input rate.', 'error');
      return;
    }

    setSubmittingHire(true);
    try {
      const res = await fetch(`http://localhost:4000/api/tickets/${ticketId}/hire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorId: parseInt(selectedContractorId),
          amount: parseFloat(hireAmount)
        })
      });

      if (!res.ok) throw new Error('Hiring assignment failed');
      
      addToast('Sending hire offer to contractor...', 'success');
      setHiringTicketId(null);
      setSelectedContractorId('');
      setHireAmount('');
      fetchData();
    } catch (err) {
      addToast('Failed to assign contractor.', 'error');
    } finally {
      setSubmittingHire(false);
    }
  };

  const getContractorName = (id?: number) => {
    if (!id) return 'Unknown';
    const c = contractors.find(item => item.id === id);
    return c ? c.name : `Contractor #${id}`;
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-xs font-mono text-[var(--text-secondary)]">
        LOADING ACTIVE SUPPORT TICKETS & ROSTER...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Overview stats header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-muted)', borderRadius: '2px' }}>
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>Awaiting Contractor</span>
          <div style={{ fontSize: '24px', fontWeight: 600, marginTop: '4px', color: '#ff6b6b' }}>
            {tickets.filter(t => t.status === 'open').length}
          </div>
        </div>
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-muted)', borderRadius: '2px' }}>
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>Active Jobs</span>
          <div style={{ fontSize: '24px', fontWeight: 600, marginTop: '4px', color: 'var(--text-primary)' }}>
            {tickets.filter(t => t.status === 'assigned').length}
          </div>
        </div>
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-muted)', borderRadius: '2px' }}>
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>Contractor Network</span>
          <div style={{ fontSize: '24px', fontWeight: 600, marginTop: '4px', color: '#34d399' }}>
            {contractors.length} online
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Ticket list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ borderBottom: '1px solid var(--border-muted)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Incident Queue</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>Assign tickets to contractors and set proposed payouts.</p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer', color: 'var(--text-secondary)', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={showHistory}
                onChange={(e) => setShowHistory(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Show History
            </label>
          </div>

          {tickets.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
              NO MAINTENANCE REQUESTS CURRENTLY LOGGED
            </div>
          ) : (
            tickets.map((t) => (
              <div 
                key={t.id} 
                className="card-border" 
                style={{ 
                  borderRadius: '2px', 
                  padding: '16px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  borderLeft: t.urgency === 'high' ? '3px solid #ff6b6b' : '1px solid var(--border-muted)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>TICKET ID: {t.id.substring(0, 8).toUpperCase()}</span>
                      <span style={{
                        fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '2px',
                        backgroundColor: t.urgency === 'high' ? 'rgba(239,68,68,0.1)' : 'rgba(163,156,146,0.1)',
                        color: t.urgency === 'high' ? '#ef4444' : '#a39c92'
                      }}>
                        {t.urgency.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '6px' }}>{t.description}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                      Resident: {t.tenantId} • Property: {t.propertyName || 'N/A'} • Unit: {t.unitNumber || 'N/A'}
                    </div>
                    {t.status === 'rejected' && t.rejectReason && (
                      <div style={{ fontSize: '11px', color: '#ff6b6b', marginTop: '8px', backgroundColor: 'rgba(239,68,68,0.05)', padding: '6px 10px', borderRadius: '2px', borderLeft: '3px solid #ff6b6b' }}>
                        <strong>Rejection Reason:</strong> {t.rejectReason}
                      </div>
                    )}
                  </div>

                  <span style={{
                    fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 'bold', textTransform: 'uppercase',
                    color: t.status === 'completed' ? '#34d399' : t.status === 'assigned' ? '#fbbf24' : 'var(--text-secondary)'
                  }}>
                    ● {t.status}
                  </span>
                </div>

                {/* Dispatch Details / Actions */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  {t.status === 'open' && hiringTicketId !== t.id && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setHiringTicketId(t.id);
                          setSelectedContractorId('');
                          setHireAmount('');
                        }}
                        style={{ padding: '6px 14px', backgroundColor: 'var(--accent-coral)', border: 'none', borderRadius: '2px', color: 'var(--bg-primary)', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        HIRE CONTRACTOR
                      </button>
                      <button
                        onClick={() => handleRejectTicket(t.id)}
                        style={{ padding: '6px 14px', backgroundColor: 'transparent', border: '1px solid var(--border-muted)', borderRadius: '2px', color: '#ff6b6b', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        REJECT REQUEST
                      </button>
                    </div>
                  )}

                  {hiringTicketId === t.id && (
                    <form onSubmit={(e) => handleHireSubmit(e, t.id)} style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
                      <select
                        value={selectedContractorId}
                        onChange={e => setSelectedContractorId(e.target.value)}
                        required
                        style={{ padding: '6px 10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-muted)', color: 'var(--text-primary)', fontSize: '11.5px', borderRadius: '2px', outline: 'none' }}
                      >
                        <option value="">Select Technician...</option>
                        {contractors.filter(c => c.status === 'available').map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.specialty})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Offer Amount (KES)"
                        value={hireAmount}
                        onChange={e => setHireAmount(e.target.value)}
                        required
                        style={{ padding: '6px 10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-muted)', color: 'var(--text-primary)', fontSize: '11.5px', borderRadius: '2px', outline: 'none', width: '150px' }}
                      />
                      <button
                        type="submit"
                        disabled={submittingHire}
                        style={{ padding: '6px 14px', backgroundColor: '#34d399', border: 'none', borderRadius: '2px', color: 'var(--bg-primary)', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        {submittingHire ? 'ASSIGNING...' : 'ASSIGN'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setHiringTicketId(null)}
                        style={{ padding: '6px 10px', backgroundColor: 'transparent', border: '1px solid var(--border-muted)', borderRadius: '2px', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer' }}
                      >
                        CANCEL
                      </button>
                    </form>
                  )}

                  {t.status === 'assigned' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', fontSize: '11.5px' }}>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        Assigned to: <strong style={{ color: 'var(--text-primary)' }}>{getContractorName(t.contractorId)}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Rate: <strong style={{ color: 'var(--text-primary)' }}>KES {t.amount?.toLocaleString()}</strong></span>
                        <span style={{
                          fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 'bold', padding: '2px 6px', borderRadius: '2px',
                          backgroundColor: t.contractorAccepted ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)',
                          color: t.contractorAccepted ? '#34d399' : '#fbbf24'
                        }}>
                          {t.contractorAccepted ? 'ACCEPTED' : 'PENDING ACCEPTANCE'}
                        </span>
                      </div>
                    </div>
                  )}

                  {t.status === 'completed' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', fontSize: '11.5px' }}>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        Resolved by: <strong style={{ color: 'var(--text-primary)' }}>{getContractorName(t.contractorId)}</strong>
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        Paid out: <strong style={{ color: 'var(--text-primary)' }}>KES {t.amount?.toLocaleString()}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Contractor Directory Roster */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ borderBottom: '1px solid var(--border-muted)', paddingBottom: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Contractor Roster</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>Verified technicians and active status.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {contractors.map((c) => (
              <div 
                key={c.id} 
                style={{ 
                  padding: '12px', 
                  backgroundColor: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-muted)', 
                  borderRadius: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                  <span style={{
                    fontSize: '9px', fontWeight: 'bold', padding: '1px 5px', borderRadius: '2px',
                    backgroundColor: c.status === 'available' ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
                    color: c.status === 'available' ? '#34d399' : '#ef4444'
                  }}>
                    {c.status.toUpperCase()}
                  </span>
                </div>
                
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {c.specialty} • KES {c.hourlyRate || 100}/hr
                </div>

                {c.bio && (
                  <p style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                    {c.bio}
                  </p>
                )}

                {c.phone && (
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                    Phone: {c.phone}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
