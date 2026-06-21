'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CardSkeleton } from '../Skeleton';
import { formatMoney } from '../../app/utils/currency';
import OnboardingWizard from '../OnboardingWizard';
import EditPropertyModal from '../properties/EditPropertyModal';
import PropertyStatsBanner from '../properties/PropertyStatsBanner';

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

export default function PropertiesPanel() {
  const router = useRouter();

  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Selection & Dropdowns
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lifecycleFilter, setLifecycleFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [sizeFilter, setSizeFilter] = useState<'all' | 'small' | 'medium' | 'large'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'revenue_desc' | 'vacant_desc'>('name');
  
  const [activeDropdown, setActiveDropdown] = useState<'health' | 'size' | 'sort' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const glowRef = useRef<HTMLDivElement>(null);

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
    fetchInitialData();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.filter-dropdown-container')) setActiveDropdown(null);
      if (!(e.target as HTMLElement).closest('.card-menu-container')) setActiveMenuId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const fetchInitialData = () => {
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
    const headers = { 'Authorization': `Bearer ${token}` };

    Promise.all([
      fetch('http://localhost:4000/api/properties', { headers }).then(r => r.ok ? r.json() : []),
      fetch('http://localhost:4000/api/properties/tenants', { headers }).then(r => r.ok ? r.json() : []),
      fetch('http://localhost:4000/api/properties/invoices', { headers }).then(r => r.ok ? r.json() : [])
    ])
      .then(([props, tnts, invs]) => {
        setProperties(props || []);
        setTenants(tnts || []);
        setInvoices(Array.isArray(invs) ? invs : (invs?.data || []));
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleUpdateLifecycleStatus = async (id: string, newStatus: 'Active' | 'Draft' | 'Archived') => {
    const session = localStorage.getItem('user');
    if (!session) return;
    let token = '';
    try {
      token = JSON.parse(session).id;
    } catch (e) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:4000/api/properties/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setProperties(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkStatusChange = async (newStatus: 'Active' | 'Draft' | 'Archived') => {
    if (selectedIds.length === 0) return;
    const session = localStorage.getItem('user');
    if (!session) return;
    let token = '';
    try {
      token = JSON.parse(session).id;
    } catch (e) {
      return;
    }

    setBulkActionLoading(true);
    try {
      await Promise.all(
        selectedIds.map(id =>
          fetch(`http://localhost:4000/api/properties/${id}/status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
          })
        )
      );
      setSelectedIds([]);
      fetchInitialData();
    } catch (err) {
      console.error(err);
    } finally {
      setBulkActionLoading(false);
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

  const propertyStats = useMemo(() => {
    const stats: Record<string, any> = {};

    properties.forEach(p => {
      const pTenants = tenants.filter(t => t.propertyId === p.id || t.propertyName === p.name);
      const occupiedUnits = pTenants.filter(t => t.status === 'Active' || t.status === 'Arrears').length;
      const vacantUnits = Math.max(0, p.unitsCount - occupiedUnits);
      const totalArrears = pTenants.reduce((acc, curr) => acc + parseCurrency(curr.arrears), 0);
      const monthlyRevenue = pTenants.reduce((acc, curr) => acc + parseCurrency(curr.rent), 0);

      const windowList: any[] = [];
      pTenants.forEach(t => {
        windowList.push((parseCurrency(t.arrears) > 0 || t.status === 'Arrears') ? 'arrears' : 'paid');
      });
      while (windowList.length < p.unitsCount) {
        windowList.push('vacant');
      }

      stats[p.id] = {
        tenantsCount: pTenants.length,
        occupiedUnits,
        vacantUnits,
        totalArrears,
        monthlyRevenue,
        status: totalArrears > 5000 ? 'AT RISK' : (totalArrears > 0 || vacantUnits > p.unitsCount * 0.3) ? 'ATTENTION' : 'OPTIMAL',
        windowList
      };
    });

    return stats;
  }, [properties, tenants, invoices]);

  const ledgerMetrics = useMemo(() => {
    let totalRevenue = 0, totalArrears = 0, totalUnits = 0, occupiedUnits = 0;
    properties.forEach(p => {
      const stats = propertyStats[p.id];
      if (stats) {
        totalRevenue += stats.monthlyRevenue;
        totalArrears += stats.totalArrears;
        occupiedUnits += stats.occupiedUnits;
      }
      totalUnits += p.unitsCount;
    });
    return {
      totalRevenue,
      totalArrears,
      totalUnits,
      occupiedUnits,
      occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
    };
  }, [properties, propertyStats]);

  const filteredProperties = useMemo(() => {
    let result = properties.filter(p => {
      const stats = propertyStats[p.id];
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || (stats && stats.status.replace(' ', '_').toLowerCase() === statusFilter.toLowerCase());
      const matchesLifecycle = lifecycleFilter === 'all' || (p.status || 'Active').toLowerCase() === lifecycleFilter;
      const matchesSize = sizeFilter === 'all' || (sizeFilter === 'small' ? p.unitsCount <= 10 : sizeFilter === 'medium' ? p.unitsCount > 10 && p.unitsCount <= 50 : p.unitsCount > 50);

      return matchesSearch && matchesStatus && matchesLifecycle && matchesSize;
    });

    return result.sort((a, b) => {
      if (sortBy === 'revenue_desc') return (propertyStats[b.id]?.monthlyRevenue || 0) - (propertyStats[a.id]?.monthlyRevenue || 0);
      if (sortBy === 'vacant_desc') return (propertyStats[b.id]?.vacantUnits || 0) - (propertyStats[a.id]?.vacantUnits || 0);
      return a.name.localeCompare(b.name);
    });
  }, [properties, propertyStats, searchQuery, statusFilter, lifecycleFilter, sizeFilter, sortBy]);

  const paginatedProperties = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProperties.slice(start, start + itemsPerPage);
  }, [filteredProperties, currentPage]);

  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage) || 1;

  const handleToggleSelectAll = () => {
    const currentPageIds = paginatedProperties.map(p => p.id);
    const allSelected = currentPageIds.every(id => selectedIds.includes(id));
    setSelectedIds(prev => allSelected ? prev.filter(id => !currentPageIds.includes(id)) : Array.from(new Set([...prev, ...currentPageIds])));
  };

  return (
    <div className="flex flex-col p-4 md:p-6 lg:p-8 relative min-h-full w-full bg-[var(--bg-primary)] bg-grid text-[var(--text-primary)] overflow-hidden">
      <div ref={glowRef} className="hidden md:block absolute w-[500px] h-[500px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 z-0" style={{ background: 'radial-gradient(circle, rgba(255, 107, 107, 0.035) 0%, transparent 70%)', transition: 'transform 0.05s ease-out' }} />

      <style jsx>{`
        .custom-properties-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 640px) { .custom-properties-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .custom-properties-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 1280px) { .custom-properties-grid { grid-template-columns: repeat(4, 1fr); } }
        .square-property-card { aspect-ratio: 1 / 1; display: flex; flex-direction: column; justify-content: space-between; background-color: var(--bg-secondary); border: 1px solid var(--border-muted); border-radius: var(--radius-md); padding: 12px; transition: border-color 0.2s ease, transform 0.2s ease; cursor: pointer; position: relative; z-index: 10; }
        .square-property-card:hover { border-color: rgba(255, 107, 107, 0.4) !important; transform: translateY(-2px); }
        .square-property-card.selected-card { border-color: var(--accent-coral) !important; box-shadow: 0 0 10px rgba(255, 107, 107, 0.15); }
        .status-badge { font-size: 8px; font-family: monospace; font-weight: bold; letter-spacing: 0.05em; padding: 2px 6px; border-radius: var(--radius-xs); }
        .status-optimal { background-color: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
        .status-attention { background-color: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }
        .status-at-risk { background-color: rgba(239, 68, 68, 0.1); color: var(--accent-coral); border: 1px solid rgba(239, 68, 68, 0.2); }
      `}</style>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative z-10">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--text-primary)]">Properties Directory</h1>
          <p className="text-xs font-mono text-[var(--text-tertiary)] mt-1">Operator portal tracking real estate assets roll-out and occupancy metrics.</p>
        </div>
        <button onClick={() => setWizardOpen(true)} className="bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-black font-semibold text-xs px-4 py-2.5 rounded transition-all cursor-pointer shadow-glow-coral flex-shrink-0">DEPLOY NEW PROPERTY</button>
      </div>

      <PropertyStatsBanner occupancyRate={ledgerMetrics.occupancyRate} totalRevenue={ledgerMetrics.totalRevenue} totalArrears={ledgerMetrics.totalArrears} />

      <div className="flex flex-wrap gap-2 border-b border-[var(--border-muted)] pb-3 mt-6 relative z-10">
        {[
          { id: 'all', label: 'All Assets', count: properties.length },
          { id: 'active', label: 'Active', count: properties.filter(p => (p.status || 'Active').toLowerCase() === 'active').length },
          { id: 'draft', label: 'Drafts', count: properties.filter(p => (p.status || 'Active').toLowerCase() === 'draft').length },
          { id: 'archived', label: 'Archived', count: properties.filter(p => (p.status || 'Active').toLowerCase() === 'archived').length },
        ].map(tab => (
          <button key={tab.id} onClick={() => { setLifecycleFilter(tab.id as any); setCurrentPage(1); }} className={`px-3 py-1.5 rounded text-[11px] font-mono border transition-all flex items-center gap-1.5 cursor-pointer ${lifecycleFilter === tab.id ? 'bg-[var(--accent-coral)] text-black border-[var(--accent-coral)] font-bold' : 'bg-[var(--bg-secondary)] border-[var(--border-muted)] text-[var(--text-secondary)]'}`}>
            <span>{tab.label}</span>
            <span className="bg-[var(--bg-primary)] text-[var(--text-tertiary)] rounded-full px-1.5 py-0.5 text-[8px]">{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-muted)] pb-4 mt-4 relative z-10">
        <div className="flex items-center gap-3">
          <button onClick={handleToggleSelectAll} className="flex items-center gap-2 border border-[var(--border-muted)] hover:border-[var(--accent-coral)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] px-3 py-1.5 rounded text-xs font-mono transition-colors cursor-pointer">
            <input type="checkbox" checked={paginatedProperties.length > 0 && paginatedProperties.every(p => selectedIds.includes(p.id))} onChange={() => {}} className="pointer-events-none cursor-pointer" />
            <span>SELECT PAGE</span>
          </button>
          <div className="relative w-full max-w-[280px]">
            <input type="text" placeholder="Search name/address..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-muted)] text-[var(--text-primary)] rounded px-3 py-1.5 pl-8 text-xs font-mono outline-none focus:border-[var(--accent-coral)]" />
            <svg width="12" height="12" className="absolute left-3 top-3 text-[var(--text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Health selector */}
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] text-[var(--text-primary)] rounded px-2.5 py-1.5 outline-none focus:border-[var(--accent-coral)]">
            <option value="all">All Health</option>
            <option value="optimal">Optimal</option>
            <option value="attention">Needs Attention</option>
            <option value="at_risk">At Risk</option>
          </select>
          {/* Size selector */}
          <select value={sizeFilter} onChange={e => { setSizeFilter(e.target.value as any); setCurrentPage(1); }} className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] text-[var(--text-primary)] rounded px-2.5 py-1.5 outline-none focus:border-[var(--accent-coral)]">
            <option value="all">All Sizes</option>
            <option value="small">Small (1-10 Units)</option>
            <option value="medium">Medium (11-50 Units)</option>
            <option value="large">Large (51+ Units)</option>
          </select>
          {/* Sorting */}
          <select value={sortBy} onChange={e => { setSortBy(e.target.value as any); setCurrentPage(1); }} className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] text-[var(--text-primary)] rounded px-2.5 py-1.5 outline-none focus:border-[var(--accent-coral)]">
            <option value="name">Sort: Name</option>
            <option value="revenue_desc">Sort: Revenue</option>
            <option value="vacant_desc">Sort: Vacancy</option>
          </select>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="mt-4 relative z-10 flex-1">
        {loading ? (
          <div className="custom-properties-grid"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
        ) : filteredProperties.length === 0 ? (
          <div className="p-16 border border-dashed border-[var(--border-muted)] text-center text-xs text-[var(--text-tertiary)] font-mono rounded bg-[var(--bg-secondary)]">NO REAL ESTATE ASSETS FOUND</div>
        ) : (
          <div className="custom-properties-grid">
            {paginatedProperties.map((prop) => {
              const stats = propertyStats[prop.id];
              const propLifecycle = prop.status || 'Active';
              const isSelected = selectedIds.includes(prop.id);
              
              return (
                <div key={prop.id} onClick={() => router.push(`/manager/properties/${prop.id}`)} className={`square-property-card group relative ${isSelected ? 'selected-card' : ''}`}>
                  <div className="flex justify-between items-start w-full relative z-20">
                    <div className="flex items-center gap-2">
                      <div onClick={(e) => { e.stopPropagation(); setSelectedIds(prev => prev.includes(prop.id) ? prev.filter(x => x !== prop.id) : [...prev, prop.id]); }} className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${isSelected ? 'bg-[var(--accent-coral)] border-[var(--accent-coral)] text-black' : 'border-[var(--border-muted)] hover:border-[var(--accent-coral)] bg-[var(--bg-primary)]'}`}>
                        {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                      </div>
                      <span className="text-[8px] font-mono text-[var(--text-tertiary)]">ID: {prop.id.substring(0, 8)}</span>
                      {propLifecycle !== 'Active' && <span className={`px-1 rounded text-[7px] font-bold ${propLifecycle === 'Draft' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>{propLifecycle.toUpperCase()}</span>}
                    </div>

                    <div className="relative card-menu-container flex items-center gap-1.5">
                      <span className={`status-badge ${stats?.status === 'OPTIMAL' ? 'status-optimal' : stats?.status === 'ATTENTION' ? 'status-attention' : 'status-at-risk'}`}>{stats?.status || 'ACTIVE'}</span>
                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === prop.id ? null : prop.id); }} className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg></button>

                      {activeMenuId === prop.id && (
                        <div className="absolute right-0 top-6 z-30 w-36 bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded shadow-2xl py-1 font-mono text-[10px]">
                          <button onClick={(e) => { e.stopPropagation(); setEditingProperty(prop); setActiveMenuId(null); }} className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>Edit Details</button>
                          <button onClick={(e) => { e.stopPropagation(); handleUpdateLifecycleStatus(prop.id, propLifecycle === 'Archived' ? 'Active' : 'Archived'); setActiveMenuId(null); }} className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>{propLifecycle === 'Archived' ? 'Activate' : 'Archive'}</button>
                          <button onClick={(e) => { e.stopPropagation(); router.push(`/manager/properties/${prop.id}`); setActiveMenuId(null); }} className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-t border-[var(--border-muted)] flex items-center gap-1.5"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>View Workspace</button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center min-w-0 py-2">
                    <h3 className="font-heading text-xs font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-coral)] transition-colors">{prop.name}</h3>
                    <p className="text-[9px] font-body text-[var(--text-secondary)] mt-0.5 truncate flex items-center gap-1"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>{formatLocation(prop.address)}</p>

                    {prop.photoUrl ? (
                      <div className="h-16 w-full rounded border border-[var(--border-muted)] overflow-hidden relative mt-2 flex-shrink-0"><img src={prop.photoUrl} alt={prop.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /></div>
                    ) : (
                      <div className="h-16 w-full bg-[var(--bg-primary)] rounded border border-[var(--border-muted)] p-1.5 flex flex-wrap items-end justify-center gap-1 relative overflow-hidden shadow-inner mt-2 flex-shrink-0">
                        {stats?.windowList.slice(0, 16).map((win: string, idx: number) => <div key={idx} className={`w-2 h-3.5 rounded-sm border transition-all ${win === 'paid' ? 'bg-emerald-500/20 border-emerald-500/40 group-hover:bg-emerald-500/40' : win === 'arrears' ? 'bg-red-500/20 border-red-500/40 group-hover:bg-red-500/40' : 'bg-[var(--bg-secondary)] border-[var(--border-strong)]'}`} />)}
                        {stats?.windowList.length > 16 && <span className="text-[6px] font-mono text-[var(--text-tertiary)] ml-1">+{stats.windowList.length - 16}</span>}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 border-t border-[var(--border-muted)] pt-2 text-[9px] w-full mt-auto">
                    <div><span className="text-[7px] font-mono text-[var(--text-tertiary)] uppercase block">Total Units</span><span className="font-semibold text-[var(--text-primary)] font-mono">{prop.unitsCount} Units</span></div>
                    <div><span className="text-[7px] font-mono text-[var(--text-tertiary)] uppercase block">Total Vacant</span><span className="font-semibold text-[var(--text-primary)] font-mono">{stats?.vacantUnits} Units</span></div>
                    <div><span className="text-[7px] font-mono text-[var(--text-tertiary)] uppercase block">Arrears</span><span className={`font-semibold font-mono ${stats?.totalArrears > 0 ? 'text-[var(--accent-coral)]' : 'text-emerald-500'}`}>{formatMoney(stats?.totalArrears || 0)}</span></div>
                    <div><span className="text-[7px] font-mono text-[var(--text-tertiary)] uppercase block">Mo. Revenue</span><span className="font-semibold text-[var(--text-primary)] font-mono">{formatMoney(stats?.monthlyRevenue || 0)}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {filteredProperties.length > itemsPerPage && (
        <div className="mt-6 border-t border-[var(--border-muted)] pt-4 flex items-center justify-between relative z-10 text-[10px] font-mono">
          <span>Page {currentPage} of {totalPages} ({filteredProperties.length} items total)</span>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] disabled:opacity-40 text-xs px-3 py-1 rounded cursor-pointer">Prev</button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] disabled:opacity-40 text-xs px-3 py-1 rounded cursor-pointer">Next</button>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-lg p-3 px-5 flex items-center gap-4 shadow-2xl">
          <div className="text-xs font-mono text-[var(--text-primary)]"><span className="text-[var(--accent-coral)] font-bold">{selectedIds.length}</span> properties selected</div>
          <div className="flex items-center gap-2">
            <button disabled={bulkActionLoading} onClick={() => handleBulkStatusChange('Active')} className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition-colors">Bulk Activate</button>
            <button disabled={bulkActionLoading} onClick={() => handleBulkStatusChange('Archived')} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 disabled:opacity-50 text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition-colors">Bulk Archive</button>
            <button onClick={() => setSelectedIds([])} className="text-[10px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1.5 cursor-pointer">Clear</button>
          </div>
        </div>
      )}

      {wizardOpen && <OnboardingWizard onClose={() => setWizardOpen(false)} onSuccess={() => { setWizardOpen(false); fetchInitialData(); }} />}
      {editingProperty && <EditPropertyModal property={editingProperty} onClose={() => setEditingProperty(null)} onSuccess={() => { setEditingProperty(null); fetchInitialData(); }} />}
    </div>
  );
}
