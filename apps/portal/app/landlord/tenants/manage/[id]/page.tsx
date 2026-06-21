'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@repo/ui/dashboard-layout';
import { DashboardIcon, PropertiesIcon, TicketsIcon, SettingsIcon } from '@repo/ui/icons';

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  unit: string;
  property: string;
  rent: string;
  arrears: number;
  status: string;
}

interface Invoice {
  invoiceId: string;
  tenantName: string;
  unitNumber: string;
  amountDue: number;
  propertyName: string;
  status: 'Unpaid' | 'Sent' | 'Paid';
}

interface MaintenanceRequest {
  id: string;
  title: string;
  status: 'Pending' | 'In Progress' | 'Resolved';
  category: string;
  date: string;
  cost?: number;
}

export default function ManageTenantPage() {
  const params = useParams();
  const tenantId = params.id as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tickets, setTickets] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load state
    const savedTenants = localStorage.getItem('tenants');
    const savedInvoices = localStorage.getItem('invoices');
    
    if (savedTenants) {
      const parsedTenants: Tenant[] = JSON.parse(savedTenants);
      const match = parsedTenants.find(t => t.id === tenantId);
      if (match) {
        setTenant(match);
      }
    }

    if (savedInvoices) {
      const parsedInvoices: Invoice[] = JSON.parse(savedInvoices);
      setInvoices(parsedInvoices.filter(i => i.tenantName === tenant?.name || i.unitNumber === tenant?.unit));
    }

    // Mock initial ticket/maintenance requests for demonstration
    setTickets([
      { id: '1', title: 'Sink disposal jammed', status: 'Pending', category: 'Plumbing', date: 'Yesterday' },
      { id: '2', title: 'HVAC filter replacement', status: 'Resolved', category: 'HVAC', date: 'May 14, 2026', cost: 85 }
    ]);

    setLoading(false);
  }, [tenantId, tenant?.name, tenant?.unit]);

  const navLinks = [
    { label: 'Overview', href: '/landlord', icon: <DashboardIcon /> },
    { label: 'Properties', href: '/landlord#properties', icon: <PropertiesIcon /> },
    { label: 'Maintenance', href: '/landlord#tickets', icon: <TicketsIcon /> },
    { label: 'Settings', href: '/landlord#settings', icon: <SettingsIcon /> },
  ];

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('onboarded');
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0c0d12', color: '#fff' }}>
        <span>Loading tenant context ledger...</span>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0c0d12', color: '#fff', gap: '16px' }}>
        <span>Tenant not found.</span>
        <button onClick={() => window.location.href = '/landlord'} className="button-primary" style={{ padding: '8px 16px' }}>Return to Control Center</button>
      </div>
    );
  }

  return (
    <DashboardLayout
      navLinks={navLinks}
      currentPath="/landlord"
      userName="Sarah Jenkins"
      userRole="Landlord"
      onLogout={handleLogout}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 600, margin: 0 }}>
              {tenant.name}
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Occupant Profile | Unit {tenant.unit} at {tenant.property}
            </p>
          </div>
          <button 
            onClick={() => window.location.href = '/landlord'}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-muted)',
              color: 'var(--text-secondary)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            ← Back to Dashboard
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          
          {/* Left panel: Invoices and Tickets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Invoices List */}
            <div className="panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px 0' }}>Financial Invoices</h3>
              {invoices.length === 0 ? (
                <div style={{ padding: '16px', fontStyle: 'italic', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  No active invoices draft.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {invoices.map((inv, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-muted)'
                    }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>Invoice #{inv.invoiceId}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Status: {inv.status}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-coral)' }}>${inv.amountDue}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Maintenance Tickets */}
            <div className="panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px 0' }}>Maintenance History</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tickets.map(ticket => (
                  <div key={ticket.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-muted)'
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>{ticket.title}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Category: {ticket.category} | {ticket.date}</div>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: ticket.status === 'Resolved' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: ticket.status === 'Resolved' ? '#22c55e' : 'var(--accent-coral)',
                      fontWeight: 600
                    }}>{ticket.status}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right panel: Details Card */}
          <div className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Occupancy Details</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>EMAIL ADDRESS</label>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{tenant.email}</span>
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>PRIMARY PHONE</label>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{tenant.phone}</span>
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>LEASED APARTMENT</label>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{tenant.property}</span>
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>UNIT ID</label>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{tenant.unit}</span>
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>MONTHLY RENT</label>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-coral)' }}>{tenant.rent}</span>
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>ACCOUNT ARREARS</label>
                <span style={{ fontSize: '13px', fontWeight: 600, color: tenant.arrears > 0 ? 'var(--accent-coral)' : '#22c55e' }}>
                  ${tenant.arrears}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
