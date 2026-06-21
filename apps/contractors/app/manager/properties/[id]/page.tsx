'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '../../../../components/Sidebar';
import Topbar from '../../../../components/Topbar';
import { formatMoney } from '../../../utils/currency';
import LoadingOverlay from '../../../../components/LoadingOverlay';
import AddTenantWizardModal from '../../../../components/AddTenantWizardModal';

interface Property {
  id: string;
  name: string;
  address: string;
  unitsCount: number;
  status: string;
  photoUrl?: string;
}

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
}

export default function PropertyDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params?.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Glow position ref
  const glowRef = useRef<HTMLDivElement>(null);

  // Mouse move tracker for interactive glow
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (glowRef.current) {
        const rect = glowRef.current.parentElement?.getBoundingClientRect();
        if (rect) {
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          glowRef.current.style.left = `${x}px`;
          glowRef.current.style.top = `${y}px`;
        }
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (propertyId) {
      fetchPropertyData();
    }
  }, [propertyId]);

  const fetchPropertyData = () => {
    const session = localStorage.getItem('user');
    if (!session) {
      router.push('/login');
      return;
    }
    let token = '';
    try {
      const parsed = JSON.parse(session);
      token = parsed.id;
    } catch (e) {
      router.push('/login');
      return;
    }

    setLoading(true);
    const headers = { 'Authorization': `Bearer ${token}` };

    Promise.all([
      fetch('http://localhost:4000/api/properties', { headers }).then(r => r.ok ? r.json() : []),
      fetch('http://localhost:4000/api/properties/tenants', { headers }).then(r => r.ok ? r.json() : []),
      fetch('http://localhost:4000/api/properties/invoices', { headers }).then(r => r.ok ? r.json() : [])
    ])
      .then(([props, tnts, invs]) => {
        const found = (props || []).find((p: Property) => p.id === propertyId);
        if (!found) {
          router.push('/manager/properties');
          return;
        }
        setProperty(found);
        setTenants(tnts || []);
        setInvoices(Array.isArray(invs) ? invs : (invs?.data || []));
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching property details', err);
        setLoading(false);
      });
  };

  const handleUpdateLifecycleStatus = async (newStatus: 'Active' | 'Draft' | 'Archived') => {
    if (!property) return;
    const session = localStorage.getItem('user');
    if (!session) return;
    let token = '';
    try {
      const parsed = JSON.parse(session);
      token = parsed.id;
    } catch (e) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:4000/api/properties/${property.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setProperty(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Failed to update property status:', err);
    }
  };

  const parseCurrency = (val: string | number | undefined): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(val.replace(/[^\d.-]/g, '')) || 0;
  };

  const formatLocation = (addr: string) => {
    if (!addr) return 'Unnamed Location';
    const coordRegex = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;
    if (coordRegex.test(addr.trim())) {
      const parts = addr.split(',').map(s => parseFloat(s.trim()));
      const lat = parts[0];
      const lng = parts[1];
      if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
        return `GPS Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      }
    }
    return addr;
  };

  const propertyDetails = useMemo(() => {
    if (!property) return null;

    const propTenants = tenants.filter(t => t.propertyId === property.id || t.propertyName === property.name);
    const propInvoices = invoices.filter(i => i.propertyName === property.name);

    const occupiedUnits = propTenants.filter(t => t.status === 'Active' || t.status === 'Arrears').length;
    const vacantUnits = Math.max(0, property.unitsCount - occupiedUnits);
    const totalArrears = propTenants.reduce((acc, curr) => acc + parseCurrency(curr.arrears), 0);
    const monthlyRevenue = propTenants.reduce((acc, curr) => acc + parseCurrency(curr.rent), 0);

    const windowList: Array<'paid' | 'arrears' | 'vacant'> = [];
    propTenants.forEach(t => {
      const hasArrears = parseCurrency(t.arrears) > 0 || t.status === 'Arrears';
      windowList.push(hasArrears ? 'arrears' : 'paid');
    });
    while (windowList.length < property.unitsCount) {
      windowList.push('vacant');
    }

    let pStatus = 'OPTIMAL';
    if (totalArrears > 5000) {
      pStatus = 'AT RISK';
    } else if (totalArrears > 0 || vacantUnits > property.unitsCount * 0.3) {
      pStatus = 'ATTENTION';
    }

    return {
      tenantsCount: propTenants.length,
      occupiedUnits,
      vacantUnits,
      totalArrears,
      monthlyRevenue,
      status: pStatus,
      windowList,
      tenants: propTenants,
      invoices: propInvoices
    };
  }, [property, tenants, invoices]);

  if (loading || !property) {
    return <LoadingOverlay active={true} message="Accessing Asset Telemetry Ledger..." />;
  }

  return (
    <div className="h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-body flex relative overflow-hidden">
      
      {/* Persisted Collapsible Navigation Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)] relative">
        
        {/* Top Header Navigation Bar */}
        <Topbar onToggleCommandPalette={() => setCmdOpen(true)} />

        {/* Scrollable Panel Area */}
        <main className="flex-1 overflow-y-auto relative w-full smooth-scroll p-4 md:p-6 lg:p-8 bg-grid">
          
          {/* Decorative Interactive Glow */}
          <div 
            ref={glowRef}
            className="hidden md:block absolute w-[500px] h-[500px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 z-0" 
            style={{
              background: 'radial-gradient(circle, rgba(255, 107, 107, 0.035) 0%, transparent 70%)',
              transition: 'transform 0.05s ease-out'
            }}
          />

          <style jsx>{`
            .status-badge {
              font-size: 8px;
              font-family: monospace;
              font-weight: bold;
              letter-spacing: 0.05em;
              padding: 2px 6px;
              border-radius: var(--radius-xs);
            }
            .status-optimal {
              background-color: rgba(16, 185, 129, 0.1);
              color: #10b981;
              border: 1px solid rgba(16, 185, 129, 0.2);
            }
            .status-attention {
              background-color: rgba(245, 158, 11, 0.1);
              color: #f59e0b;
              border: 1px solid rgba(245, 158, 11, 0.2);
            }
            .status-at-risk {
              background-color: rgba(239, 68, 68, 0.1);
              color: var(--accent-coral);
              border: 1px solid rgba(239, 68, 68, 0.2);
            }
          `}</style>

          <div className="flex flex-col gap-6 fade-in relative z-10">
            {/* Back to main properties folder */}
            <div className="flex justify-between items-center border-b border-[var(--border-muted)] pb-4">
              <button 
                onClick={() => router.push('/manager/properties')}
                className="flex items-center gap-2 text-xs font-mono text-[var(--accent-coral)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                BACK TO PROPERTIES DIRECTORY
              </button>
              <span className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">Asset Workspace</span>
            </div>

            {/* Title / Description */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
              <div>
                <div className="text-[9px] font-mono text-[var(--text-tertiary)] flex items-center gap-2">
                  <span>PROPERTY PROFILE: {property.id}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                    (property.status || 'Active') === 'Draft' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 
                    (property.status || 'Active') === 'Archived' ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' : 
                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {(property.status || 'Active').toUpperCase()}
                  </span>
                </div>
                <h1 className="font-heading text-2xl font-bold mt-1 text-[var(--text-primary)]">{property.name}</h1>
                <p className="text-xs font-mono text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  {formatLocation(property.address)}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <span className={`status-badge ${
                  propertyDetails?.status === 'OPTIMAL' ? 'status-optimal' :
                  propertyDetails?.status === 'ATTENTION' ? 'status-attention' : 'status-at-risk'
                }`}>
                  {propertyDetails?.status}
                </span>

                {/* Status operations */}
                <div className="flex gap-2">
                  {(property.status || 'Active') === 'Draft' && (
                    <button
                      onClick={() => handleUpdateLifecycleStatus('Active')}
                      className="bg-emerald-500 hover:bg-emerald-600 text-black text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition-colors"
                    >
                      ACTIVATE PROPERTY
                    </button>
                  )}
                  {(property.status || 'Active') === 'Active' && (
                    <button
                      onClick={() => handleUpdateLifecycleStatus('Archived')}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition-colors"
                    >
                      ARCHIVE PROPERTY
                    </button>
                  )}
                  {(property.status || 'Active') === 'Archived' && (
                    <button
                      onClick={() => handleUpdateLifecycleStatus('Active')}
                      className="bg-emerald-500 hover:bg-emerald-600 text-black text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition-colors"
                    >
                      RESTORE TO ACTIVE
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Layout grids */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 flex flex-col gap-6">
                
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] p-4 rounded flex flex-col justify-between">
                    <span className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">Occupancy</span>
                    <span className="text-lg font-bold text-[var(--text-primary)] mt-1">
                      {propertyDetails?.occupiedUnits} / {property.unitsCount} Units
                    </span>
                    <span className="text-[10px] text-emerald-500 font-mono mt-1">
                      {property.unitsCount > 0 ? Math.round((propertyDetails?.occupiedUnits! / property.unitsCount) * 100) : 0}% Occupied
                    </span>
                  </div>
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] p-4 rounded flex flex-col justify-between">
                    <span className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">Monthly Revenue</span>
                    <span className="text-lg font-bold text-[var(--text-primary)] font-mono mt-1">
                      {formatMoney(propertyDetails?.monthlyRevenue || 0)}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono mt-1">Active Roll</span>
                  </div>
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] p-4 rounded flex flex-col justify-between">
                    <span className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">Outstanding Arrears</span>
                    <span className={`text-lg font-bold font-mono mt-1 ${propertyDetails?.totalArrears! > 0 ? 'text-[var(--accent-coral)]' : 'text-emerald-500'}`}>
                      {formatMoney(propertyDetails?.totalArrears || 0)}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono mt-1">Arrears Dues</span>
                  </div>
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] p-4 rounded flex flex-col justify-between">
                    <span className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">Vacant Chambers</span>
                    <span className="text-lg font-bold text-[var(--text-primary)] mt-1">
                      {propertyDetails?.vacantUnits} Units
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono mt-1">Available</span>
                  </div>
                </div>

                {/* Resident Ledger */}
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded p-5 flex flex-col">
                  <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-muted)] pb-2 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span>RESIDENT LEDGER</span>
                      <button 
                        onClick={() => setWizardOpen(true)}
                        className="bg-[var(--accent-coral)] hover:bg-[var(--accent-coral)]/85 text-black text-[9px] font-mono font-bold px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1"
                      >
                        + Add Resident
                      </button>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{propertyDetails?.tenants.length} Tenants Linked</span>
                  </h3>
                  {propertyDetails?.tenants.length === 0 ? (
                    <div className="p-8 border border-dashed border-[var(--border-muted)] text-center text-xs text-[var(--text-tertiary)] font-mono rounded">
                      NO OCCUPIED UNITS OR REGISTERED TENANTS
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border-muted)] text-[9px] text-[var(--text-tertiary)] uppercase">
                            <th className="pb-2">Name</th>
                            <th className="pb-2">Unit</th>
                            <th className="pb-2">Contact</th>
                            <th className="pb-2 text-right">Rent Roll</th>
                            <th className="pb-2 text-right">Arrears</th>
                            <th className="pb-2 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {propertyDetails?.tenants.map(t => (
                            <tr key={t.id} className="border-b border-[var(--border-muted)]/50 py-2 hover:bg-[var(--bg-tertiary)] transition-colors">
                              <td className="py-2 text-[var(--text-primary)] font-bold">{t.name}</td>
                              <td className="py-2 text-[var(--text-secondary)]">{t.unit}</td>
                              <td className="py-2 text-[var(--text-tertiary)]">
                                <div>{t.email}</div>
                                <div className="text-[10px] opacity-75 mt-0.5">{t.phone}</div>
                              </td>
                              <td className="py-2 text-right text-[var(--text-primary)] font-bold">{formatMoney(parseCurrency(t.rent))}</td>
                              <td className={`py-2 text-right font-bold ${parseCurrency(t.arrears) > 0 ? 'text-[var(--accent-coral)]' : 'text-emerald-500'}`}>
                                {formatMoney(parseCurrency(t.arrears))}
                              </td>
                              <td className="py-2 text-right">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                  t.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                }`}>
                                  {t.status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Billing Outstanding */}
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded p-5 flex flex-col">
                  <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-muted)] pb-2 mb-4 flex items-center justify-between">
                    <span>OUTSTANDING SYSTEM BILLING STATEMENTS</span>
                    <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{propertyDetails?.invoices.length} Bills Tracked</span>
                  </h3>
                  {propertyDetails?.invoices.length === 0 ? (
                    <div className="p-8 border border-dashed border-[var(--border-muted)] text-center text-xs text-[var(--text-tertiary)] font-mono rounded">
                      NO UNPAID BILLING STATEMENTS GENERATED
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border-muted)] text-[9px] text-[var(--text-tertiary)] uppercase">
                            <th className="pb-2">Invoice ID</th>
                            <th className="pb-2">Resident</th>
                            <th className="pb-2">Chamber</th>
                            <th className="pb-2 text-right">Outstanding</th>
                            <th className="pb-2 text-right">State</th>
                          </tr>
                        </thead>
                        <tbody>
                          {propertyDetails?.invoices.map(inv => (
                            <tr key={inv.invoiceId} className="border-b border-[var(--border-muted)]/50 py-2 hover:bg-[var(--bg-tertiary)] transition-colors">
                              <td className="py-2 text-[var(--text-primary)] font-bold">{inv.invoiceId}</td>
                              <td className="py-2 text-[var(--text-secondary)]">{inv.tenantName}</td>
                              <td className="py-2 text-[var(--text-tertiary)]">{inv.unitNumber}</td>
                              <td className="py-2 text-right text-[var(--text-primary)] font-bold">{formatMoney(parseCurrency(inv.amountDue))}</td>
                              <td className="py-2 text-right">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                  inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                }`}>
                                  {inv.status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

              {/* Right schematic card */}
              <div className="flex flex-col gap-6">
                
                {property.photoUrl && (
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded p-4 flex flex-col">
                    <h3 className="font-heading text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-3">Asset Photo Render</h3>
                    <div className="h-48 w-full rounded overflow-hidden relative border border-[var(--border-strong)]">
                      <img src={property.photoUrl} alt={property.name} className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded p-5 flex flex-col">
                  <h3 className="font-heading text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider border-b border-[var(--border-muted)] pb-2 mb-3">
                    CHAMBER MAP BLUEPRINT
                  </h3>
                  <div className="text-[10px] font-mono text-[var(--text-secondary)] mb-4 leading-relaxed">
                    Visualization showing unit grid status mapping. Vacant layout blocks are grey. Unpaid bills are highlighted in red.
                  </div>

                  <div className="bg-[var(--bg-primary)] p-4 rounded border border-[var(--border-muted)] flex flex-wrap gap-2.5 justify-center relative min-h-[140px] items-center">
                    {propertyDetails?.windowList.map((win, idx) => (
                      <div 
                        key={idx}
                        className={`w-8 h-10 rounded border flex flex-col items-center justify-between p-1 transition-all ${
                          win === 'paid' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' :
                          win === 'arrears' ? 'bg-red-500/10 border-red-500/30 text-[var(--accent-coral)]' :
                          'bg-[var(--bg-secondary)] border-[var(--border-strong)] text-[var(--text-tertiary)]'
                        }`}
                      >
                        <span className="text-[8px] font-mono font-bold leading-none">{idx + 1}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          {win === 'vacant' ? (
                            <circle cx="12" cy="12" r="10"></circle>
                          ) : (
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          )}
                        </svg>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2 mt-4 text-[9px] font-mono text-[var(--text-tertiary)] border-t border-[var(--border-muted)] pt-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-emerald-500/15 border border-emerald-500/40" />
                      <span>Occupied Unit (Account Balanced)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-red-500/15 border border-red-500/40" />
                      <span>Occupied Unit (Arrears Outstanding)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-[var(--bg-secondary)] border border-[var(--border-strong)]" />
                      <span>Vacant Chamber Unit Available</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </main>
      </div>

      <AddTenantWizardModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={() => fetchPropertyData()}
        initialPropertyId={propertyId}
      />

    </div>
  );
}
