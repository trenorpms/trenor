'use client';

import React, { useState, useEffect } from 'react';
import { CardSkeleton, ChartSkeleton } from '../Skeleton';
import { motion } from 'framer-motion';
import { formatMoney } from '../../app/utils/currency';

interface Property {
  id: string;
  name: string;
  unitsCount: number;
}

interface Tenant {
  id: string;
  name: string;
  rent: string;
  arrears: number;
}

interface Invoice {
  invoiceId: string;
  tenantName: string;
  amountDue: number;
  status: string;
}

export default function OverviewPanel() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
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
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      const [resProp, resTenants, resInvoices] = await Promise.all([
        fetch('http://localhost:4000/api/properties', { headers }),
        fetch('http://localhost:4000/api/properties/tenants', { headers }),
        fetch('http://localhost:4000/api/properties/invoices', { headers })
      ]);

      const propsData = resProp.ok ? await resProp.json() : [];
      const tenantsData = resTenants.ok ? await resTenants.json() : [];
      const invoicesData = resInvoices.ok ? await resInvoices.json() : { data: [] };

      setProperties(propsData || []);
      setTenants(tenantsData || []);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : (invoicesData.data || []));
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const totalProperties = properties.length;
  const totalUnits = properties.reduce((acc, p) => acc + (p.unitsCount || 0), 0);
  const occupiedUnits = tenants.length;
  const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
  
  const occupancyRate = totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : '0.0';
  const monthlyRevenue = tenants.reduce((acc, t) => acc + (Number(t.rent) || 0), 0);
  const totalArrears = tenants.reduce((acc, t) => acc + (Number(t.arrears) || 0), 0);

  // SVG pie chart parameters
  const vacantPercent = totalUnits > 0 ? (vacantUnits / totalUnits) * 100 : 0;
  const occupiedPercent = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

  if (loading) {
    return (
      <div className="flex flex-col p-4 md:p-6 lg:p-8 gap-6 w-full">
        <div className="h-6 w-48 bg-[var(--border-strong)] rounded animate-pulse"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 md:p-6 lg:p-8 relative z-10 min-h-full w-full">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[var(--text-primary)]">Portfolio Overview</h1>
          <p className="text-xs font-mono text-[var(--text-tertiary)] mt-1">Live synchronized property operations stats.</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* KPI: Monthly Revenue */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded p-5 hover:border-[var(--border-strong)] transition-all">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-widest">Monthly Revenue</div>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
          </div>
          <div className="text-xl font-heading font-semibold text-[var(--text-primary)] mb-1">
            {formatMoney(monthlyRevenue)}
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--text-tertiary)] uppercase">
            <span>Aggregated Active Rent Roll</span>
          </div>
        </div>

        {/* KPI: Occupancy */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded p-5 hover:border-[var(--border-strong)] transition-all">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-widest">Occupancy</div>
            <div className="p-1.5 bg-[var(--accent-coral-muted)] text-[var(--accent-coral)] rounded border border-[var(--accent-coral-muted)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              </svg>
            </div>
          </div>
          <div className="text-xl font-heading font-semibold text-[var(--text-primary)] mb-1">{occupancyRate}%</div>
          <div className="w-full bg-[var(--bg-primary)] h-1.5 rounded-full overflow-hidden mt-2">
            <div className="bg-[var(--accent-coral)] h-full rounded-full shadow-lg" style={{ width: `${occupancyRate}%` }}></div>
          </div>
        </div>

        {/* KPI: Total Arrears */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded p-5 hover:border-[var(--border-strong)] transition-all">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-widest">Total Arrears</div>
            <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded border border-amber-500/20">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
          </div>
          <div className="text-xl font-heading font-semibold text-[var(--text-primary)] mb-1">
            {formatMoney(totalArrears)}
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--text-tertiary)] uppercase">
            <span>Outstanding tenant debt</span>
          </div>
        </div>

        {/* KPI: Asset Clusters */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded p-5 hover:border-[var(--border-strong)] transition-all">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-widest">Properties</div>
            <div className="p-1.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded border border-[var(--border-muted)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="9"></rect>
                <rect x="14" y="3" width="7" height="5"></rect>
                <rect x="14" y="12" width="7" height="9"></rect>
                <rect x="3" y="16" width="7" height="5"></rect>
              </svg>
            </div>
          </div>
          <div className="text-xl font-heading font-semibold text-[var(--text-primary)] mb-1">{totalProperties}</div>
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--text-tertiary)] uppercase">
            <span>Deployments: {totalUnits} Units</span>
          </div>
        </div>

      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Unit Matrix Donut */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded p-5 flex flex-col items-center">
          <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)] self-start mb-4">Unit Status Matrix</h3>
          
          <div className="flex-grow flex items-center justify-center relative min-h-[180px] w-full">
            <svg width="150" height="150" viewBox="0 0 36 36" className="transform -rotate-90">
              <circle cx="18" cy="18" r="15.91" fill="none" stroke="var(--bg-primary)" strokeWidth="3" />
              
              {/* Occupied (Emerald) */}
              <circle 
                cx="18" 
                cy="18" 
                r="15.91" 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="3" 
                strokeDasharray={`${occupiedPercent} ${100 - occupiedPercent}`} 
                strokeDashoffset="0" 
              />
              {/* Vacant (Amber) */}
              <circle 
                cx="18" 
                cy="18" 
                r="15.91" 
                fill="none" 
                stroke="#f59e0b" 
                strokeWidth="3" 
                strokeDasharray={`${vacantPercent} ${100 - vacantPercent}`} 
                strokeDashoffset={-occupiedPercent} 
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-heading text-xl font-bold text-[var(--text-primary)]">{totalUnits}</span>
              <span className="text-[8px] font-mono text-[var(--text-tertiary)] uppercase">Total Units</span>
            </div>
          </div>

          <div className="flex justify-between w-full text-[10px] font-mono text-[var(--text-secondary)] mt-4">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#10b981] rounded-full"></span> Occupied ({occupiedPercent.toFixed(0)}%)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#f59e0b] rounded-full"></span> Vacant ({vacantPercent.toFixed(0)}%)</span>
          </div>
        </div>

        {/* Recent Invoices list */}
        <div className="lg:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded p-5 flex flex-col">
          <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)] mb-4">Recent Arrears Invoices</h3>
          
          <div className="flex-grow overflow-y-auto max-h-[220px]">
            {invoices.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-tertiary)] font-mono">
                NO OUTSTANDING INVOICES RECORDED
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-muted)] text-[9px] text-[var(--text-tertiary)] uppercase">
                    <th className="pb-2">Invoice ID</th>
                    <th className="pb-2">Tenant Name</th>
                    <th className="pb-2 text-right">Amount Due</th>
                    <th className="pb-2 text-right">Reconciliation</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.slice(0, 5).map((inv) => (
                    <tr key={inv.invoiceId} className="border-b border-[var(--border-muted)] py-2 hover:bg-[var(--bg-tertiary)] transition-colors">
                      <td className="py-2 text-[var(--text-primary)] font-bold">{inv.invoiceId}</td>
                      <td className="py-2 text-[var(--text-secondary)]">{inv.tenantName}</td>
                      <td className="py-2 text-right text-[var(--text-primary)] font-bold">{formatMoney(Number(inv.amountDue))}</td>
                      <td className="py-2 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                          {inv.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
