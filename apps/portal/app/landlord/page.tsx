'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ToastContainer from '../components/ToastContainer';
import { useToast } from '../hooks/useToast';
import { useRealtime } from '../hooks/useRealtime';
import NotificationCenter from '../components/NotificationCenter';
import { ThemeSelector } from '@repo/ui/theme-selector';

// Modular Tab Components
import AgentWorkspace from './components/AgentWorkspace';
import OverviewLedger from './components/OverviewLedger';
import PropertiesTab from './components/PropertiesTab';
import TenantsTab from './components/TenantsTab';
import InvoicesTab from './components/InvoicesTab';
import SettingsTab from './components/SettingsTab';
import TeamTab from './components/TeamTab';
import CommandPalette from './components/CommandPalette';
import MaintenanceTab from './components/MaintenanceTab';

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

function LandlordDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  
  const { toasts, addToast, removeToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [autoApproveLimit, setAutoApproveLimit] = useState(200);
  const [user, setUser] = useState<any>(null);
  const [financeOpen, setFinanceOpen] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);

  // States loaded from local storage / backend API
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [autopilot, setAutopilot] = useState(true);

  // Mock terminal events
  const [terminalLogs, setTerminalLogs] = useState<any[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setCmdOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Hook up real-time websocket sync notifications
  const { notifications, connected, clearNotifications } = useRealtime(user, (notif) => {
    addToast(notif.title + ': ' + notif.message, notif.type);
    
    // Automatically trigger state reload for key events
    const headers = { 'Authorization': `Bearer ${user?.id}` };
    if (notif.title.includes('Payment') || notif.title.includes('Rent') || notif.title.includes('Ledger')) {
      fetch('http://localhost:4000/api/properties', { headers })
        .then(r => r.ok ? r.json() : [])
        .then(data => setProperties(data));
      fetch('http://localhost:4000/api/properties/invoices', { headers })
        .then(r => r.ok ? r.json() : [])
        .then(data => setInvoices(data));
      fetch('http://localhost:4000/api/properties/tenants', { headers })
        .then(r => r.ok ? r.json() : [])
        .then(data => setTenants(data));
    }
  });

  useEffect(() => {
    const session = localStorage.getItem('user');
    if (!session || session === 'null' || session === 'undefined') {
      window.location.href = '/login';
      return;
    }

    try {
      const parsedUser = JSON.parse(session);
      setUser(parsedUser);

      fetch('http://localhost:4000/api/auth/validate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: parsedUser.email, id: parsedUser.id })
      })
      .then(res => {
        if (!res.ok) throw new Error('Session invalid');
        return res.json();
      })
      .then(data => {
        localStorage.setItem('user', JSON.stringify(data));
        
        if (data.role?.toLowerCase() !== 'landlord') {
          window.location.href = data.role?.toLowerCase() === 'tenant' ? '/tenant' : '/';
          return;
        }

        const onboarded = localStorage.getItem('onboarded');
        if (onboarded !== 'true') {
          window.location.href = '/onboarding';
          return;
        }

        // Load assets from backend DB
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.id}`
        };

        Promise.all([
          fetch('http://localhost:4000/api/properties', { headers }).then(r => r.json()),
          fetch('http://localhost:4000/api/properties/tenants', { headers }).then(r => r.json()),
          fetch('http://localhost:4000/api/properties/invoices', { headers }).then(r => r.json())
        ])
        .then(([props, tnts, invs]) => {
          setProperties(props || []);
          localStorage.setItem('properties', JSON.stringify(props || []));

          setTenants(tnts || []);
          localStorage.setItem('tenants', JSON.stringify(tnts || []));

          setInvoices(invs || []);
          localStorage.setItem('invoices', JSON.stringify(invs || []));

          setLoading(false);
        })
        .catch((err) => {
          console.error("Error loading assets from database:", err);
          const savedProperties = localStorage.getItem('properties');
          const savedTenants = localStorage.getItem('tenants');
          const savedInvoices = localStorage.getItem('invoices');

          if (savedProperties) setProperties(JSON.parse(savedProperties));
          if (savedTenants) setTenants(JSON.parse(savedTenants));
          if (savedInvoices) setInvoices(JSON.parse(savedInvoices));
          setLoading(false);
        });
      })
      .catch(() => {
        localStorage.removeItem('user');
        localStorage.removeItem('onboarded');
        window.location.href = '/login';
      });
    } catch (e) {
      localStorage.removeItem('user');
      localStorage.removeItem('onboarded');
      window.location.href = '/login';
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('onboarded');
    localStorage.removeItem('properties');
    localStorage.removeItem('tenants');
    localStorage.removeItem('invoices');
    window.location.href = '/login';
  };

  const settleInvoice = (invoiceId: string) => {
    const updated = invoices.map(inv => 
      inv.invoiceId === invoiceId ? { ...inv, status: 'Paid' as const } : inv
    );
    setInvoices(updated);
    localStorage.setItem('invoices', JSON.stringify(updated));
    addToast(`Invoice ${invoiceId} settled successfully.`, 'success');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-coral)' }}></span>
          Loading Workspace Dashboard...
        </div>
      </div>
    );
  }

  // Calculated Stats
  const mtdSavedHours = 42.5;
  const occupancyPercentage = 96.4;
  const pendingApprovalsCount = terminalLogs.filter(log => log.status === 'REQ_APPROVAL').length;
  const mrrTotal = properties.reduce((acc, p) => {
    const val = parseInt(p.rent.replace(/[$,]/g, '')) || 0;
    return acc + val;
  }, 0);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
      
      {/* Design System Custom CSS */}
      <style jsx global>{`
        .bg-grid {
          background-size: 24px 24px;
          background-image: linear-gradient(to right, rgba(var(--grid-color), var(--grid-opacity)) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(var(--grid-color), var(--grid-opacity)) 1px, transparent 1px);
        }
        .ai-pulse-dot::after {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          background-color: inherit;
          opacity: 0.4;
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(2); opacity: 0; }
        }
        .card-border {
          border: 1px solid var(--border-muted);
          background-color: var(--bg-secondary);
          backdrop-filter: blur(8px);
          transition: border-color 0.15s ease, background-color 0.15s ease;
        }
        .card-border:hover {
          border-color: var(--border-strong);
          background-color: var(--bg-tertiary);
        }
        .log-line:hover {
          background-color: var(--bg-tertiary);
        }
        .property-row {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .property-row:hover {
          background-color: var(--bg-secondary);
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border-muted); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--border-strong); }

        .processing-sweep {
          position: relative;
          overflow: hidden;
        }
        .processing-sweep::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 107, 107, 0.1), transparent);
          animation: sweep 1.5s infinite linear;
        }
        @keyframes sweep { to { left: 200%; } }

        .log-line {
          opacity: 0;
          transform: translateX(-10px);
          animation: slideInRight 0.3s forwards cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideInRight { to { opacity: 1; transform: translateX(0); } }

        .omnibar-glow {
          transition: all 0.4s ease;
          opacity: 0;
        }
        .omnibar-focus-glow:focus-within .omnibar-glow {
          opacity: 1;
          animation: omniGlow 3s ease-in-out infinite alternate;
        }
        @keyframes omniGlow {
          0% { opacity: 0.5; transform: scale(0.99); }
          100% { opacity: 0.8; transform: scale(1.01); }
        }

        .agent-spin {
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* SIDEBAR */}
      <aside style={{
        width: '240px',
        flexShrink: 0,
        borderRight: '1px solid var(--border-muted)',
        backgroundColor: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
        position: 'relative'
      }}>
        
        {/* Brand Header */}
        <div style={{
          height: '64px',
          borderBottom: '1px solid var(--border-muted)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          flexShrink: 0,
        }}>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '4px',
              backgroundColor: 'var(--accent-coral)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'var(--bg-primary)',
              boxShadow: '0 0 15px rgba(255, 107, 107, 0.3)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '14px', letterSpacing: '-0.2px', color: 'var(--text-primary)', lineHeight: '1.2' }}>Trenor</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '2px', marginTop: '2px' }}>V.2.4.1</span>
            </div>
          </a>
        </div>

        {/* Navigation Links */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '24px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', padding: '0 12px' }}>
            Control Center
          </div>

          <button 
            onClick={() => router.push('/landlord?tab=overview')}
            className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
            style={{
              display: 'flex', alignItems: 'center', width: '100%', border: 'none', gap: '12px', padding: '10px 12px', borderRadius: '2px', cursor: 'pointer', transition: 'background-color 0.15s',
              backgroundColor: activeTab === 'overview' ? 'var(--bg-tertiary)' : 'transparent',
              color: activeTab === 'overview' ? 'var(--text-primary)' : 'var(--text-secondary)',
              textAlign: 'left'
            }}
          >
            <svg className="sidebar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: activeTab === 'overview' ? 'var(--accent-coral)' : 'inherit' }}>
              <rect x="3" y="3" width="7" height="9"></rect>
              <rect x="14" y="3" width="7" height="5"></rect>
              <rect x="14" y="12" width="7" height="9"></rect>
              <rect x="3" y="16" width="7" height="5"></rect>
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 500 }}>Overview</span>
          </button>

          <button 
            onClick={() => router.push('/landlord?tab=agent')}
            className={`nav-link ${activeTab === 'agent' ? 'active' : ''}`}
            style={{
              display: 'flex', alignItems: 'center', width: '100%', border: 'none', gap: '12px', padding: '10px 12px', borderRadius: '2px', cursor: 'pointer', transition: 'background-color 0.15s',
              backgroundColor: activeTab === 'agent' ? 'var(--bg-tertiary)' : 'transparent',
              color: activeTab === 'agent' ? 'var(--text-primary)' : 'var(--text-secondary)',
              textAlign: 'left'
            }}
          >
            <svg className="sidebar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: activeTab === 'agent' ? 'var(--accent-coral)' : 'inherit' }}>
              <polyline points="4 17 10 11 4 5"></polyline>
              <line x1="12" y1="19" x2="20" y2="19"></line>
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 500 }}>Agent Workspace</span>
          </button>

          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '20px', marginBottom: '8px', padding: '0 12px' }}>
            Real Estate
          </div>

          <button 
            onClick={() => router.push('/landlord?tab=properties')}
            className={`nav-link ${activeTab === 'properties' ? 'active' : ''}`}
            style={{
              display: 'flex', alignItems: 'center', width: '100%', border: 'none', gap: '12px', padding: '10px 12px', borderRadius: '2px', cursor: 'pointer', transition: 'background-color 0.15s',
              backgroundColor: activeTab === 'properties' ? 'var(--bg-tertiary)' : 'transparent',
              color: activeTab === 'properties' ? 'var(--text-primary)' : 'var(--text-secondary)',
              textAlign: 'left'
            }}
          >
            <svg className="sidebar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: activeTab === 'properties' ? 'var(--accent-coral)' : 'inherit' }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 500 }}>Properties</span>
          </button>

          <button 
            onClick={() => router.push('/landlord?tab=tenants')}
            className={`nav-link ${activeTab === 'tenants' ? 'active' : ''}`}
            style={{
              display: 'flex', alignItems: 'center', width: '100%', border: 'none', gap: '12px', padding: '10px 12px', borderRadius: '2px', cursor: 'pointer', transition: 'background-color 0.15s',
              backgroundColor: activeTab === 'tenants' ? 'var(--bg-tertiary)' : 'transparent',
              color: activeTab === 'tenants' ? 'var(--text-primary)' : 'var(--text-secondary)',
              textAlign: 'left'
            }}
          >
            <svg className="sidebar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: activeTab === 'tenants' ? 'var(--accent-coral)' : 'inherit' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 500 }}>Tenants</span>
          </button>

          {/* Collapsible Accordion for Finance */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setFinanceOpen(!financeOpen)}
              className="nav-link"
              style={{
                display: 'flex', alignItems: 'center', width: '100%', border: 'none', gap: '12px', padding: '10px 12px', borderRadius: '2px', cursor: 'pointer', transition: 'background-color 0.15s',
                backgroundColor: activeTab === 'finance' ? 'var(--bg-tertiary)' : 'transparent',
                color: activeTab === 'finance' ? 'var(--text-primary)' : 'var(--text-secondary)',
                textAlign: 'left'
              }}
            >
              <svg className="sidebar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: activeTab === 'finance' ? 'var(--accent-coral)' : 'inherit' }}>
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              <span style={{ fontSize: '12px', fontWeight: 500, flexGrow: 1 }}>Finance</span>
              <svg className="chevron-icon" style={{ width: '12px', height: '12px', color: 'var(--text-tertiary)', transform: financeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div style={{
              maxHeight: financeOpen ? '200px' : '0px',
              overflow: 'hidden',
              transition: 'max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              paddingLeft: '32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              marginTop: '4px'
            }}>
              <button 
                onClick={() => router.push('/landlord?tab=overview')}
                style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '11px', padding: '6px 0', transition: 'color 0.2s' }}
              >
                Ledger
              </button>
              <button 
                onClick={() => router.push('/landlord?tab=finance')}
                style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: activeTab === 'finance' ? 'var(--accent-coral)' : 'var(--text-tertiary)', fontSize: '11px', padding: '6px 0', transition: 'color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '12px' }}
              >
                <span>Invoices</span>
                <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--accent-coral)', borderRadius: '50%' }}></span>
              </button>
              <button 
                onClick={() => router.push('/landlord?tab=overview')}
                style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '11px', padding: '6px 0', transition: 'color 0.2s' }}
              >
                Expenses
              </button>
            </div>
          </div>

          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '20px', marginBottom: '8px', padding: '0 12px' }}>
            Organization
          </div>

          <button 
            onClick={() => router.push('/landlord?tab=team')}
            className={`nav-link ${activeTab === 'team' ? 'active' : ''}`}
            style={{
              display: 'flex', alignItems: 'center', width: '100%', border: 'none', gap: '12px', padding: '10px 12px', borderRadius: '2px', cursor: 'pointer', transition: 'background-color 0.15s',
              backgroundColor: activeTab === 'team' ? 'var(--bg-tertiary)' : 'transparent',
              color: activeTab === 'team' ? 'var(--text-primary)' : 'var(--text-secondary)',
              textAlign: 'left'
            }}
          >
            <svg className="sidebar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: activeTab === 'team' ? 'var(--accent-coral)' : 'inherit' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 500 }}>Team & Access</span>
          </button>

          <button 
            onClick={() => router.push('/landlord?tab=settings')}
            className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
            style={{
              display: 'flex', alignItems: 'center', width: '100%', border: 'none', gap: '12px', padding: '10px 12px', borderRadius: '2px', cursor: 'pointer', transition: 'background-color 0.15s',
              backgroundColor: activeTab === 'settings' ? 'var(--bg-tertiary)' : 'transparent',
              color: activeTab === 'settings' ? 'var(--text-primary)' : 'var(--text-secondary)',
              textAlign: 'left'
            }}
          >
            <svg className="sidebar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: activeTab === 'settings' ? 'var(--accent-coral)' : 'inherit' }}>
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1-2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 500 }}>Settings</span>
          </button>
        </nav>

        {/* Telemetry and Profile Card */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid var(--border-muted)',
          backgroundColor: 'var(--bg-primary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Server Ping</span>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="pulse-dot" style={{ width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span> 12ms
            </span>
          </div>
          
          <div style={{ height: '4px', width: '100%', backgroundColor: 'var(--bg-tertiary)', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', backgroundColor: 'var(--accent-coral)', width: '33%' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
            <span>Storage: 4.2GB</span>
            <span>Max: 15GB</span>
          </div>

          {/* Profile Card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid var(--border-muted)', paddingTop: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', border: '1px solid var(--border-muted)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {(user?.name || 'Sarah Jenkins').split(' ').map((n: string) => n[0]).join('')}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Sarah Jenkins'}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || 'Portfolio Owner'}</div>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="bg-grid" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%', position: 'relative', backgroundColor: 'var(--bg-primary)' }}>
        {/* Glow Overlay */}
        <div style={{ position: 'absolute', top: 0, right: '25%', width: '600px', height: '300px', backgroundColor: 'rgba(255, 107, 107, 0.015)', filter: 'blur(120px)', pointerEvents: 'none', borderRadius: '50%' }}></div>

        {/* Header */}
        <header style={{
          height: '64px',
          borderBottom: '1px solid var(--border-muted)',
          backgroundColor: 'var(--bg-primary)',
          opacity: 0.95,
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <span className="breadcrumb-item" style={{ cursor: 'pointer' }} onClick={() => router.push('/landlord?tab=overview')}>Portfolio</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {activeTab} Management
                <span style={{
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10b981',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '2px',
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
                }}>Active</span>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Command Palette Trigger */}
            <div className="hidden-on-mobile" style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => setCmdOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-muted)',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  width: '256px',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none',
                }}
                className="cmd-trigger-btn"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <span style={{ fontSize: '13px', fontFamily: 'sans-serif' }}>Search...</span>
                </div>
                <div style={{
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-tertiary)',
                  backgroundColor: 'var(--bg-primary)',
                  padding: '2px 6px',
                  borderRadius: '2px',
                  border: '1px solid var(--border-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}>
                  <kbd>⌘</kbd><kbd>K</kbd>
                </div>
              </button>
            </div>

            {/* Theme Selector */}
            <ThemeSelector />

            {/* Autopilot Switcher */}
            <div 
              onClick={() => setAutopilot(!autopilot)}
              style={{
                display: 'flex', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-muted)', borderRadius: '2px', padding: '2px 8px', alignItems: 'center', gap: '8px', cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-secondary)' }}>Auto-process</span>
              <div style={{
                width: '24px', height: '14px', borderRadius: '10px', position: 'relative', transition: 'background-color 0.2s',
                backgroundColor: autopilot ? 'var(--accent-coral)' : 'var(--border-muted)'
              }}>
                <div style={{
                  width: '10px', height: '10px', backgroundColor: 'var(--bg-primary)', borderRadius: '50%', position: 'absolute', top: '2px', transition: 'left 0.2s, right 0.2s',
                  left: autopilot ? '12px' : '2px'
                }}></div>
              </div>
            </div>

            {/* Notification Center Dropdown */}
            <NotificationCenter
              notifications={notifications}
              connected={connected}
              onClear={clearNotifications}
            />
          </div>
        </header>

        {/* Scrollable Layout Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* TAB: AGENT WORKSPACE */}
          {activeTab === 'agent' && (
            <AgentWorkspace 
              addToast={addToast}
              router={router}
              user={user}
            />
          )}

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <OverviewLedger
              properties={properties}
              mrrTotal={mrrTotal}
              occupancyPercentage={occupancyPercentage}
              mtdSavedHours={mtdSavedHours}
              pendingApprovalsCount={pendingApprovalsCount}
              terminalLogs={terminalLogs}
              setTerminalLogs={setTerminalLogs}
              addToast={addToast}
              router={router}
            />
          )}

          {/* TAB: PROPERTIES */}
          {activeTab === 'properties' && (
            <PropertiesTab 
              properties={properties}
              router={router}
            />
          )}

          {/* TAB: TENANTS */}
          {activeTab === 'tenants' && (
            <TenantsTab 
              tenants={tenants}
              properties={properties}
              user={user}
              router={router}
            />
          )}

          {/* TAB: FINANCE */}
          {activeTab === 'finance' && (
            <InvoicesTab 
              invoices={invoices}
              settleInvoice={settleInvoice}
            />
          )}

          {/* TAB: MAINTENANCE */}
          {activeTab === 'maintenance' && (
            <MaintenanceTab addToast={addToast} />
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
            <SettingsTab 
              autoApproveLimit={autoApproveLimit}
              setAutoApproveLimit={setAutoApproveLimit}
            />
          )}

          {/* TAB: TEAM */}
          {activeTab === 'team' && (
            <TeamTab 
              user={user}
              addToast={addToast}
            />
          )}

        </div>
      </main>

      {/* FLOATING AI BUTTON */}
      <div style={{ position: 'fixed', bottom: '32px', right: '32px', zIndex: 40 }}>
        <div className="aura-btn-wrapper">
          <button 
            onClick={() => setCmdOpen(true)}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              padding: '12px 20px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid var(--border-muted)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '13px',
              boxShadow: '0 10px 25px rgba(255, 107, 107, 0.2)',
            }}
            className="aura-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-coral)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
              <path d="M12 12 2.1 7.1"></path>
              <path d="M12 12l9.9 4.9"></path>
            </svg>
            Ask Assistant ✨
          </button>
        </div>
      </div>

      {/* COMMAND PALETTE MODAL */}
      {cmdOpen && (
        <CommandPalette 
          setCmdOpen={setCmdOpen}
          router={router}
          handleLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default function LandlordPortal() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <div className="font-mono text-xs">LOADING DASHBOARD COMPONENT WORKSPACE...</div>
      </div>
    }>
      <LandlordDashboardContent />
    </Suspense>
  );
}
