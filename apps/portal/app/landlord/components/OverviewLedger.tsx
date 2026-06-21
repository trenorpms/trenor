'use client';

import React from 'react';

interface Property {
  id: string;
  address: string;
  name?: string;
  tenantName: string;
  status: string;
  rent: string;
  unitsCount?: number;
  arrears?: number;
}

interface TerminalLog {
  time: string;
  status: string;
  details: string;
}

interface OverviewLedgerProps {
  properties: Property[];
  mrrTotal: number;
  occupancyPercentage: number;
  mtdSavedHours: number;
  pendingApprovalsCount: number;
  terminalLogs: TerminalLog[];
  setTerminalLogs: React.Dispatch<React.SetStateAction<TerminalLog[]>>;
  addToast: (msg: string, type: 'success' | 'info' | 'error') => void;
  router: any;
}

export default function OverviewLedger({
  properties,
  mrrTotal,
  occupancyPercentage,
  mtdSavedHours,
  pendingApprovalsCount,
  terminalLogs,
  setTerminalLogs,
  addToast,
  router,
}: OverviewLedgerProps) {
  return (
    <>
      {/* Portfolio Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', zIndex: 10 }}>
        
        <div className="card-border" style={{ padding: '20px', borderRadius: '2px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Portfolio MRR</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              KES {mrrTotal.toLocaleString()}
            </span>
          </div>
          <span style={{ fontSize: '10px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            +12.4% MoM growth
          </span>
        </div>

        <div className="card-border" style={{ padding: '20px', borderRadius: '2px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Occupancy Rate</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {occupancyPercentage}%
            </span>
          </div>
          <span style={{ fontSize: '10px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
            Optimal capacity threshold
          </span>
        </div>

        <div className="card-border" style={{ padding: '20px', borderRadius: '2px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>MTD Hours Saved</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {mtdSavedHours} hrs
            </span>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--accent-coral)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            Via automated scheduling
          </span>
        </div>

        <div className="card-border" style={{ padding: '20px', borderRadius: '2px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: pendingApprovalsCount > 0 ? '2px solid var(--accent-coral)' : '1px solid var(--border-muted)' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Pending Approvals</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '20px', fontWeight: 600, color: pendingApprovalsCount > 0 ? 'var(--accent-coral)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {pendingApprovalsCount}
            </span>
          </div>
          <button 
            onClick={() => router.push('/landlord?tab=agent')}
            style={{ 
              border: 'none', background: 'none', padding: 0, margin: 0, textAlign: 'left', 
              fontSize: '10px', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' 
            }}
          >
            Review active tasks
          </button>
        </div>
      </div>

      {/* Lower Details Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px', minHeight: '420px' }}>
        
        {/* Ledger Panel */}
        <div className="card-border" style={{ borderRadius: '2px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-secondary)' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Property Ledger</h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>Property & Address</th>
                  <th style={{ padding: '12px 16px' }}>Status / Occ.</th>
                  <th style={{ padding: '12px 16px' }}>Cash Flow (MRR)</th>
                  <th style={{ padding: '12px 16px' }}>Units</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {properties.map(prop => (
                  <tr key={prop.id} className="property-row" style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-muted)' }} onClick={() => router.push('/landlord?tab=properties')}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{prop.name || 'Pine Street Residences'}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{prop.address}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 6px', borderRadius: '2px', fontSize: '9px', fontWeight: 500, backgroundColor: 'rgba(52, 211, 153, 0.1)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#34d399' }}></span> Active
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{prop.rent}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{prop.unitsCount || 1} units</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Operations Terminal */}
        <div className="card-border" style={{ borderRadius: '2px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ height: '40px', borderBottom: '1px solid var(--border-muted)', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-coral)' }} className="ai-pulse-dot relative"></div>
              <span style={{ fontSize: '10px', color: 'var(--accent-coral)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.5px' }}>AI_AGENT_AURA_LIVE</span>
            </div>
          </div>

          <div style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontSize: '10px', lineHeight: '1.6', flexGrow: 1, overflowY: 'auto', backgroundColor: 'var(--bg-tertiary)' }}>
            {terminalLogs.map((log, index) => (
              <div key={index} className="log-line" style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '2px', borderRadius: '2px', transition: 'background-color 0.15s', borderLeft: '2px solid var(--border-muted)', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)' }}>
                  <span>{log.time}</span>
                  <span style={{ color: log.status === 'SUCCESS' ? '#34d399' : log.status === 'REQ_APPROVAL' ? 'var(--accent-coral)' : 'var(--text-primary)', fontWeight: log.status === 'REQ_APPROVAL' ? 'bold' : 'normal' }}>{log.status}</span>
                </div>
                <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{log.details}</span>

                {log.status === 'REQ_APPROVAL' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setTerminalLogs(prev => prev.filter((_, i) => i !== index));
                        addToast('HVAC contractor dispatch approved.', 'success');
                      }}
                      style={{ backgroundColor: 'var(--accent-coral)', border: 'none', color: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '2px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Approve
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setTerminalLogs(prev => prev.filter((_, i) => i !== index));
                        addToast('Bid rejected.', 'info');
                      }}
                      style={{ backgroundColor: 'transparent', border: '1px solid var(--border-muted)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '2px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
            
            <div style={{ padding: '8px', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ width: '6px', height: '12px', backgroundColor: 'var(--accent-coral)' }}></span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Awaiting events...</span>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
