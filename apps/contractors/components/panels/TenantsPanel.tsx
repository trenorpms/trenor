'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CardSkeleton } from '../Skeleton';
import { formatMoney } from '../../app/utils/currency';
import AddTenantWizardModal from '../AddTenantWizardModal';

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  unit: string;
  propertyId?: string;
  propertyName: string;
  rent: string;
  arrears: string | number;
  status: string;
}

interface Property {
  id: string;
  name: string;
}

export default function TenantsPanel() {
  const router = useRouter();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'good' | 'arrears'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'ledger'>('grid');
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = () => {
    const session = localStorage.getItem('user');
    if (!session) {
      setLoading(false);
      return;
    }
    let token = '';
    try {
      const parsed = JSON.parse(session);
      token = parsed.id;
    } catch (e) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const headers = { 'Authorization': `Bearer ${token}` };

    Promise.all([
      fetch('http://localhost:4000/api/properties/tenants', { headers }).then(r => r.ok ? r.json() : []),
      fetch('http://localhost:4000/api/properties', { headers }).then(r => r.ok ? r.json() : [])
    ])
      .then(([tnts, props]) => {
        setTenants(tnts || []);
        setProperties(props || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching tenants list', err);
        setLoading(false);
      });
  };

  const parseCurrency = (val: string | number | undefined): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(val.replace(/[^\d.-]/g, '')) || 0;
  };

  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        t.name.toLowerCase().includes(query) ||
        t.email.toLowerCase().includes(query) ||
        t.phone.toLowerCase().includes(query) ||
        t.unit.toLowerCase().includes(query);

      const matchesProperty = propertyFilter === 'all' || t.propertyName === propertyFilter || t.propertyId === propertyFilter;

      const unpaid = parseCurrency(t.arrears);
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'good' && unpaid === 0) ||
        (statusFilter === 'arrears' && unpaid > 0);

      return matchesSearch && matchesProperty && matchesStatus;
    });
  }, [tenants, searchQuery, propertyFilter, statusFilter]);

  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Property', 'Chamber Unit', 'Rent', 'Arrears', 'Status'];
    const rows = filteredTenants.map(t => [
      t.id,
      t.name,
      t.email,
      t.phone,
      t.propertyName,
      t.unit,
      parseCurrency(t.rent),
      parseCurrency(t.arrears),
      parseCurrency(t.arrears) > 0 ? 'Arrears' : 'Good Standing'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Tenant_Ledger_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col p-4 md:p-6 lg:p-8 relative z-10 min-h-full w-full bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[var(--text-primary)]">Tenant Registry</h1>
          <p className="text-xs font-mono text-[var(--text-tertiary)] mt-1">Tenant profile listings and automated ledger tracking.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setWizardOpen(true)}
            className="bg-[var(--accent-coral)] hover:bg-[var(--accent-coral)]/85 text-black font-mono text-xs px-3.5 py-2 rounded transition-all cursor-pointer flex items-center gap-1.5 font-bold"
          >
            + Add Resident
          </button>
          <button 
            onClick={handleExportCSV}
            className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] hover:border-[var(--accent-coral)] text-[var(--text-primary)] font-mono text-xs px-3 py-2 rounded transition-all cursor-pointer flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export Ledger
          </button>
        </div>
      </div>

      {/* Filter and View Toggles Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border-muted)] pb-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Quick status tabs */}
          <div className="flex bg-[var(--bg-secondary)] border border-[var(--border-muted)] p-0.5 rounded text-xs font-mono">
            {(['all', 'good', 'arrears'] as const).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1 rounded transition-colors capitalize cursor-pointer ${
                  statusFilter === f ? 'bg-[var(--accent-coral)] text-black font-bold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {f === 'good' ? 'Good Standing' : f}
              </button>
            ))}
          </div>

          {/* Property Selector filter */}
          <select 
            value={propertyFilter}
            onChange={e => setPropertyFilter(e.target.value)}
            className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] text-[var(--text-primary)] text-xs rounded p-1.5 font-mono outline-none focus:border-[var(--accent-coral)]"
          >
            <option value="all">All Properties</option>
            {properties.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search tenant name, phone, unit..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 md:w-64 bg-[var(--bg-secondary)] border border-[var(--border-muted)] text-[var(--text-primary)] text-xs rounded px-3 py-1.5 font-mono outline-none focus:border-[var(--accent-coral)]"
          />

          {/* Grid vs Table View Mode */}
          <div className="flex border border-[var(--border-muted)] rounded p-0.5 bg-[var(--bg-secondary)]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded cursor-pointer ${viewMode === 'grid' ? 'bg-[var(--bg-primary)] text-[var(--accent-coral)]' : 'text-[var(--text-tertiary)]'}`}
              title="Grid View"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            </button>
            <button
              onClick={() => setViewMode('ledger')}
              className={`p-1.5 rounded cursor-pointer ${viewMode === 'ledger' ? 'bg-[var(--bg-primary)] text-[var(--accent-coral)]' : 'text-[var(--text-tertiary)]'}`}
              title="Ledger Table View"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="p-12 border border-dashed border-[var(--border-muted)] text-center text-xs text-[var(--text-tertiary)] font-mono rounded">
          NO MATCHING RESIDENT ENTRIES DETECTED
        </div>
      ) : viewMode === 'grid' ? (
        /* Card Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTenants.map((t) => (
            <div 
              key={t.id} 
              onClick={() => router.push(`/manager/tenants/${t.id}`)}
              className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded p-5 flex flex-col hover:border-[var(--accent-coral)] transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded border border-[var(--border-muted)] bg-[var(--bg-primary)] flex items-center justify-center font-bold text-[var(--accent-coral)] text-sm">
                    {t.name ? t.name.charAt(0).toUpperCase() : 'T'}
                  </div>
                  <div>
                    <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-coral)] transition-colors">{t.name}</h3>
                    <div className="text-[10px] font-mono text-[var(--text-tertiary)]">ID: {t.id.substring(0, 8)}</div>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${parseCurrency(t.arrears) > 0 ? 'bg-red-500 shadow-pulse-red' : 'bg-emerald-500'}`} />
              </div>

              <div className="bg-[var(--bg-primary)] border border-[var(--border-muted)] rounded p-3 mb-4 flex flex-col gap-1.5 text-xs font-mono">
                <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Property:</span><span className="text-[var(--text-primary)] truncate font-semibold ml-2">{t.propertyName}</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Chamber:</span><span className="text-[var(--text-primary)] font-semibold">{t.unit}</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Rent Roll:</span><span className="text-[var(--text-primary)] font-semibold">{formatMoney(parseCurrency(t.rent))}</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Contact:</span><span className="text-[var(--text-primary)] font-semibold truncate ml-2">{t.phone || t.email}</span></div>
              </div>

              <div className="mt-auto flex justify-between items-center text-[9px] font-mono border-t border-[var(--border-muted)]/50 pt-3">
                <span className="text-[var(--text-tertiary)] uppercase">Dues Health</span>
                <span className={`px-1.5 py-0.5 border rounded text-[8px] font-bold ${
                  parseCurrency(t.arrears) > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                }`}>
                  {parseCurrency(t.arrears) > 0 ? `ARREARS: ${formatMoney(parseCurrency(t.arrears))}` : 'GOOD STANDING'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Ledger Table Layout */
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-muted)] text-[10px] text-[var(--text-tertiary)] uppercase bg-[var(--bg-primary)]/40">
                  <th className="p-3">Name</th>
                  <th className="p-3">Property</th>
                  <th className="p-3">Chamber</th>
                  <th className="p-3 text-right">Monthly Rent</th>
                  <th className="p-3 text-right">Outstanding Arrears</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3 text-right">State</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((t) => (
                  <tr 
                    key={t.id} 
                    onClick={() => router.push(`/manager/tenants/${t.id}`)}
                    className="border-b border-[var(--border-muted)]/50 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                  >
                    <td className="p-3 text-[var(--text-primary)] font-bold">{t.name}</td>
                    <td className="p-3 text-[var(--text-secondary)]">{t.propertyName}</td>
                    <td className="p-3 text-[var(--text-tertiary)]">{t.unit}</td>
                    <td className="p-3 text-right text-[var(--text-primary)] font-bold">{formatMoney(parseCurrency(t.rent))}</td>
                    <td className={`p-3 text-right font-bold ${parseCurrency(t.arrears) > 0 ? 'text-[var(--accent-coral)]' : 'text-emerald-500'}`}>
                      {formatMoney(parseCurrency(t.arrears))}
                    </td>
                    <td className="p-3 text-[var(--text-tertiary)] text-[10px]">
                      <div>{t.email}</div>
                      <div className="opacity-75">{t.phone}</div>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                        parseCurrency(t.arrears) > 0 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {parseCurrency(t.arrears) > 0 ? 'ARREARS' : 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <AddTenantWizardModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={() => fetchInitialData()}
      />
    </div>
  );
}
