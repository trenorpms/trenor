'use client';

import React from 'react';

interface Invoice {
  invoiceId: string;
  tenantName: string;
  unitNumber: string;
  amountDue: number;
  propertyName: string;
  status: 'Unpaid' | 'Sent' | 'Paid';
}

interface InvoicesTabProps {
  invoices: Invoice[];
  settleInvoice: (invoiceId: string) => void;
}

export default function InvoicesTab({ invoices, settleInvoice }: InvoicesTabProps) {
  return (
    <div className="card-border" style={{ borderRadius: '2px', padding: '24px' }}>
      <div style={{ borderBottom: '1px solid var(--border-muted)', paddingBottom: '16px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Financial Statements</h1>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>Outstanding invoice ledgers and automated collection receipts.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {invoices.map(inv => (
          <div key={inv.invoiceId} style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-muted)', borderRadius: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Invoice #{inv.invoiceId}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Tenant: {inv.tenantName} | Unit {inv.unitNumber} ({inv.propertyName})</div>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--accent-coral)' }}>${inv.amountDue.toLocaleString()}</span>
              <span style={{
                padding: '2px 8px', borderRadius: '2px', fontSize: '10px', fontWeight: 'bold',
                backgroundColor: inv.status === 'Paid' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255, 107, 107, 0.1)',
                color: inv.status === 'Paid' ? '#34d399' : 'var(--accent-coral)',
                border: inv.status === 'Paid' ? '1px solid rgba(52, 211, 153, 0.2)' : '1px solid rgba(255, 107, 107, 0.2)'
              }}>
                {inv.status}
              </span>
              {inv.status !== 'Paid' && (
                <button 
                  onClick={() => settleInvoice(inv.invoiceId)}
                  style={{
                    backgroundColor: '#34d399', border: 'none', color: 'var(--bg-primary)', padding: '4px 12px', borderRadius: '2px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
                  }}
                >
                  Settle
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
