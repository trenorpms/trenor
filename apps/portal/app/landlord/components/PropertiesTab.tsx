'use client';

import React, { useState, useMemo } from 'react';

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

interface PropertiesTabProps {
  properties: Property[];
  router: any;
}

export default function PropertiesTab({ properties, router }: PropertiesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);

  // 1. Core Mock Properties (from User's design specs)
  const mockItems = useMemo(() => [
    {
      id: 'AUR-001',
      name: 'The Aurora Tower',
      address: 'Downtown Metro',
      status: 'OPTIMAL',
      occupancy: 98,
      revenue: '$45.2k',
      totalUnits: 120,
      arrears: '$1.2k',
      type: 'residential',
      visualStyle: 'aurora'
    },
    {
      id: 'SIL-042',
      name: 'Silica Lofts',
      address: 'West End Tech Park',
      status: 'ATTENTION',
      occupancy: 85,
      revenue: '$32.1k',
      totalUnits: 64,
      arrears: '$4.8k',
      type: 'mixed',
      visualStyle: 'silica'
    },
    {
      id: 'FND-202',
      name: 'The Foundry Commercial',
      address: 'Industrial District',
      status: 'AT RISK',
      occupancy: 72,
      revenue: '$18.2k',
      totalUnits: 12,
      arrears: '$8.4k',
      type: 'commercial',
      visualStyle: 'foundry'
    },
    {
      id: 'CRM-109',
      name: 'Crimson Residences',
      address: 'North Hills',
      status: 'OPTIMAL',
      occupancy: 94,
      revenue: '$28.9k',
      totalUnits: 48,
      arrears: '$0.8k',
      type: 'residential',
      visualStyle: 'crimson'
    }
  ], []);

  // 2. Map deployed/real properties dynamically to matches in the same design language
  const deployedItems = useMemo(() => {
    return properties.map((p, idx) => {
      const rentStr = p.rent || '0';
      const parsedRentVal = parseFloat(rentStr.replace(/[$,€]/g, '')) || 0;
      const formattedRevenue = parsedRentVal >= 1000 
        ? `€${(parsedRentVal / 1000).toFixed(1)}k` 
        : `€${parsedRentVal.toLocaleString()}`;

      // Analyze status and arrears based on database property fields
      const arrearsAmount = typeof p.arrears !== 'undefined' 
        ? Number(p.arrears) 
        : (p.status?.includes('Arrears') ? 1200 : 0);
      const statusText = arrearsAmount > 2000 ? 'AT RISK' : arrearsAmount > 0 ? 'ATTENTION' : 'OPTIMAL';

      return {
        id: p.id || `DEP-${100 + idx}`,
        name: p.name || 'Pine Street Residences',
        address: p.address,
        status: statusText,
        occupancy: arrearsAmount > 0 ? 82 : 100,
        revenue: formattedRevenue,
        totalUnits: p.unitsCount || 8,
        arrears: arrearsAmount > 0 ? `€${arrearsAmount.toLocaleString()}` : '€0',
        type: 'residential',
        visualStyle: p.id === 'prop-1' ? 'aurora' : 'deployed' // Map prop-1 to aurora block style, others to deployed
      };
    });
  }, [properties]);

  // Combine both mock data and active deployed data
  const allItems = useMemo(() => [...mockItems, ...deployedItems], [mockItems, deployedItems]);

  // Apply search/filters
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = statusFilter === 'all' || 
                          (statusFilter === 'optimal' && item.status === 'OPTIMAL') ||
                          (statusFilter === 'attention' && item.status === 'ATTENTION') ||
                          (statusFilter === 'risk' && item.status === 'AT RISK');

      const matchType = typeFilter === 'all' || item.type === typeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [allItems, searchQuery, statusFilter, typeFilter]);

  const itemsPerPage = 8;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));

  // Render Visual Architectural Blocks dynamically
  const renderVisual = (style: string, status: string) => {
    switch (style) {
      case 'aurora':
        return (
          <>
            {/* Tower Block 1 */}
            <div className="w-8 h-[80%] border border-ink-700 bg-ink-900 rounded-t-sm flex flex-col justify-end p-0.5 gap-0.5 relative z-10 group-hover:border-ink-600 transition-colors">
              <div className="w-full h-1.5 bg-ink-800 rounded-[1px] arch-window paid"></div>
              <div className="w-full h-1.5 bg-ink-800 rounded-[1px] arch-window paid"></div>
              <div className="w-full h-1.5 bg-ink-800 rounded-[1px] arch-window paid"></div>
              <div className="w-full h-1.5 bg-ink-800 rounded-[1px] arch-window paid"></div>
              <div className="w-full h-1.5 bg-ink-800 rounded-[1px] arch-window vacant"></div>
            </div>
            {/* Tower Block 2 */}
            <div className="w-10 h-[95%] border border-ink-700 bg-ink-900 rounded-t-sm flex flex-col justify-end p-1 gap-1 relative z-10 group-hover:border-ink-600 transition-colors shadow-2xl">
              <div className="flex gap-0.5 h-1.5 w-full"><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div></div>
              <div className="flex gap-0.5 h-1.5 w-full"><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div><div className="flex-1 bg-ink-800 rounded-[1px] arch-window arrears"></div></div>
              <div className="flex gap-0.5 h-1.5 w-full"><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div></div>
              <div className="flex gap-0.5 h-1.5 w-full"><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div></div>
              <div className="flex gap-0.5 h-1.5 w-full"><div className="flex-1 bg-ink-800 rounded-[1px] arch-window vacant"></div><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div></div>
            </div>
            {/* Tower Block 3 */}
            <div className="w-8 h-[60%] border border-ink-700 bg-ink-900 rounded-t-sm flex flex-col justify-end p-0.5 gap-0.5 relative z-10 group-hover:border-ink-600 transition-colors">
              <div className="w-full h-1.5 bg-ink-800 rounded-[1px] arch-window paid"></div>
              <div className="w-full h-1.5 bg-ink-800 rounded-[1px] arch-window paid"></div>
              <div className="w-full h-1.5 bg-ink-800 rounded-[1px] arch-window paid"></div>
              <div className="w-full h-1.5 bg-ink-800 rounded-[1px] arch-window paid"></div>
            </div>
          </>
        );
      case 'silica':
        return (
          <>
            {/* Block 1 */}
            <div className="w-16 h-[60%] border border-ink-700 bg-ink-900 rounded-t-sm flex flex-col justify-end p-1 gap-1 relative z-10 group-hover:border-ink-600 transition-colors shadow-2xl">
              <div className="flex gap-1 h-2 w-full"><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div><div className="flex-1 bg-ink-800 rounded-[1px] arch-window vacant"></div></div>
              <div className="flex gap-1 h-2 w-full"><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div><div className="flex-1 bg-ink-800 rounded-[1px] arch-window arrears"></div><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div></div>
              <div className="flex gap-1 h-2 w-full"><div className="flex-1 bg-ink-800 rounded-[1px] arch-window vacant"></div><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div></div>
            </div>
            {/* Block 2 */}
            <div className="w-10 h-[75%] border border-ink-700 bg-ink-900 rounded-t-sm flex flex-col justify-end p-1 gap-1 relative z-10 group-hover:border-ink-600 transition-colors">
              <div className="flex gap-0.5 h-1.5 w-full"><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div></div>
              <div className="flex gap-0.5 h-1.5 w-full"><div className="flex-1 bg-ink-800 rounded-[1px] arch-window vacant"></div><div className="flex-1 bg-ink-800 rounded-[1px] arch-window arrears"></div></div>
              <div className="flex gap-0.5 h-1.5 w-full"><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div></div>
              <div className="flex gap-0.5 h-1.5 w-full"><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div></div>
            </div>
          </>
        );
      case 'foundry':
        return (
          <div className="w-[80%] h-[50%] border border-ink-700 bg-ink-900 rounded-t-sm flex flex-col p-2 gap-2 relative z-10 group-hover:border-ink-600 transition-colors shadow-2xl">
            <div className="flex gap-2 h-3 w-full"><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div><div className="flex-1 bg-ink-800 rounded-[1px] arch-window vacant"></div><div className="flex-1 bg-ink-800 rounded-[1px] arch-window vacant"></div><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div></div>
            <div className="flex gap-2 h-3 w-full"><div className="flex-1 bg-ink-800 rounded-[1px] arch-window arrears"></div><div className="flex-1 bg-ink-800 rounded-[1px] arch-window arrears"></div><div className="flex-1 bg-ink-800 rounded-[1px] arch-window vacant"></div><div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div></div>
          </div>
        );
      case 'crimson':
        return (
          <>
            <div className="w-8 h-[40%] border border-ink-700 bg-ink-900 rounded-t-sm flex flex-col p-1 gap-1 relative z-10 group-hover:border-ink-600 transition-colors"><div className="h-1.5 w-full bg-ink-800 rounded-[1px] arch-window paid"></div><div className="h-1.5 w-full bg-ink-800 rounded-[1px] arch-window paid"></div></div>
            <div className="w-8 h-[45%] border border-ink-700 bg-ink-900 rounded-t-sm flex flex-col p-1 gap-1 relative z-10 group-hover:border-ink-600 transition-colors"><div className="h-1.5 w-full bg-ink-800 rounded-[1px] arch-window vacant"></div><div className="h-1.5 w-full bg-ink-800 rounded-[1px] arch-window paid"></div></div>
            <div className="w-8 h-[40%] border border-ink-700 bg-ink-900 rounded-t-sm flex flex-col p-1 gap-1 relative z-10 group-hover:border-ink-600 transition-colors"><div className="h-1.5 w-full bg-ink-800 rounded-[1px] arch-window paid"></div><div className="h-1.5 w-full bg-ink-800 rounded-[1px] arch-window paid"></div></div>
            <div className="w-8 h-[45%] border border-ink-700 bg-ink-900 rounded-t-sm flex flex-col p-1 gap-1 relative z-10 group-hover:border-ink-600 transition-colors"><div className="h-1.5 w-full bg-ink-800 rounded-[1px] arch-window paid"></div><div className="h-1.5 w-full bg-ink-800 rounded-[1px] arch-window arrears"></div></div>
          </>
        );
      default:
        // Deployed/Real properties dynamic architectural visualization
        const hasArrears = status === 'ATTENTION' || status === 'AT RISK';
        return (
          <div className="w-20 h-[75%] border border-ink-700 bg-ink-900 rounded-t-sm flex flex-col p-1.5 gap-1.5 relative z-10 group-hover:border-ink-600 transition-colors shadow-2xl">
            <div className="flex gap-1 h-2.5 w-full">
              <div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div>
              <div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div>
            </div>
            <div className="flex gap-1 h-2.5 w-full">
              <div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div>
              <div className={`flex-1 bg-ink-800 rounded-[1px] arch-window ${hasArrears ? 'arrears' : 'paid'}`}></div>
            </div>
            <div className="flex gap-1 h-2.5 w-full">
              <div className="flex-1 bg-ink-800 rounded-[1px] arch-window vacant"></div>
              <div className="flex-1 bg-ink-800 rounded-[1px] arch-window paid"></div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-ink-950 relative" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Dynamic Style injection to guarantee visual rendering on any system theme configuration */}
      <style jsx global>{`
        :root {
          --ink-950: var(--bg-primary, #05080b);
          --ink-900: var(--bg-secondary, #0a0f14);
          --ink-800: var(--border-muted, #11161d);
          --ink-700: var(--border-muted, #1a2027);
          --ink-600: var(--border-strong, #252d37);
          --ink-500: var(--border-strong, #343f4c);
          --ink-400: var(--text-tertiary, #52637a);
          
          --coral-400: #ff8585;
          --coral-500: var(--accent-coral, #ff6b6b);
          --coral-600: #f25c5c;
          
          --warm-50: var(--text-primary, #f8f5ef);
          --warm-100: var(--text-primary, #e6e1d8);
          --warm-200: var(--text-secondary, #c5bfb5);
          --warm-300: var(--text-secondary, #a39c92);
          
          --emerald-400: #34d399;
          --emerald-500: #10b981;
          
          --amber-400: #fbbf24;
          --amber-500: #f59e0b;
        }

        /* Basic Layout & Flexbox */
        .flex { display: flex !important; }
        .flex-col { flex-direction: column !important; }
        .flex-row { flex-direction: row !important; }
        .flex-1 { flex: 1 1 0% !important; }
        .flex-grow { flex-grow: 1 !important; }
        .flex-shrink-0 { flex-shrink: 0 !important; }
        .justify-between { justify-content: space-between !important; }
        .justify-end { justify-content: flex-end !important; }
        .justify-center { justify-content: center !important; }
        .items-center { align-items: center !important; }
        .items-start { align-items: flex-start !important; }
        .items-end { align-items: flex-end !important; }
        
        .gap-0\.5 { gap: 2px !important; }
        .gap-1 { gap: 4px !important; }
        .gap-1\.5 { gap: 6px !important; }
        .gap-2 { gap: 8px !important; }
        .gap-3 { gap: 12px !important; }
        .gap-4 { gap: 16px !important; }
        .gap-5 { gap: 20px !important; }
        .ml-auto { margin-left: auto !important; }
        .mt-auto { margin-top: auto !important; }
        
        /* Grid */
        .grid { display: grid !important; }
        .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
        .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        .gap-y-3 { row-gap: 12px !important; }
        .gap-x-4 { column-gap: 16px !important; }

        @media (min-width: 640px) {
          .sm\:flex-row { flex-direction: row !important; }
          .sm\:w-64 { width: 256px !important; }
          .sm\:w-auto { width: auto !important; }
        }
        @media (min-width: 768px) {
          .md\:flex-row { flex-direction: row !important; }
          .md\:items-end { align-items: flex-end !important; }
          .md\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (min-width: 1024px) {
          .lg\:flex-row { flex-direction: row !important; }
          .lg\:items-center { align-items: center !important; }
          .lg\:w-auto { width: auto !important; }
          .lg\:ml-0 { margin-left: 0 !important; }
        }
        @media (min-width: 1280px) {
          .xl\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
        }
        @media (min-width: 1536px) {
          .2xl\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
        }

        /* Width & Height & Sizing */
        .w-full { width: 100% !important; }
        .w-8 { width: 32px !important; }
        .w-9 { width: 36px !important; }
        .w-10 { width: 40px !important; }
        .w-16 { width: 64px !important; }
        .w-20 { width: 80px !important; }
        .w-7 { width: 28px !important; }
        .h-1\.5 { height: 6px !important; }
        .h-2 { height: 8px !important; }
        .h-2\.5 { height: 10px !important; }
        .h-3 { height: 12px !important; }
        .h-7 { height: 28px !important; }
        .h-28 { height: 112px !important; }
        .h-\[80\%\] { height: 80% !important; }
        .h-\[95\%\] { height: 95% !important; }
        .h-\[60\%\] { height: 60% !important; }
        .h-\[75\%\] { height: 75% !important; }
        .h-\[50\%\] { height: 50% !important; }
        .h-\[40\%\] { height: 40% !important; }
        .h-\[45\%\] { height: 45% !important; }
        .h-\[34px\] { height: 34px !important; }
        .min-w-0 { min-width: 0 !important; }
        .max-w-\[150px\] { max-width: 150px !important; }

        /* Padding & Margin */
        .p-0\.5 { padding: 2px !important; }
        .p-1 { padding: 4px !important; }
        .p-1\.5 { padding: 6px !important; }
        .p-2 { padding: 8px !important; }
        .p-3 { padding: 12px !important; }
        .p-4 { padding: 16px !important; }
        .p-5 { padding: 20px !important; }
        .p-6 { padding: 24px !important; }
        .px-2 { padding-left: 8px !important; padding-right: 8px !important; }
        .px-3 { padding-left: 12px !important; padding-right: 12px !important; }
        .px-4 { padding-left: 16px !important; padding-right: 16px !important; }
        .py-0\.5 { padding-top: 2px !important; padding-bottom: 2px !important; }
        .py-1\.5 { padding-top: 6px !important; padding-bottom: 6px !important; }
        .py-2 { padding-top: 8px !important; padding-bottom: 8px !important; }
        .pl-9 { padding-left: 36px !important; }
        .pr-3 { padding-right: 12px !important; }
        .mb-0\.5 { margin-bottom: 2px !important; }
        .mb-4 { margin-bottom: 16px !important; }
        .mb-5 { margin-bottom: 20px !important; }
        .mb-6 { margin-bottom: 24px !important; }
        .mt-1 { margin-top: 4px !important; }
        .mt-4 { margin-top: 16px !important; }
        .pb-4 { padding-bottom: 16px !important; }
        .pb-2 { padding-bottom: 8px !important; }
        .pt-4 { padding-top: 16px !important; }
        .pb-10 { padding-bottom: 40px !important; }

        /* Color definitions */
        .bg-ink-950 { background-color: var(--ink-950) !important; }
        .bg-ink-900 { background-color: var(--ink-900) !important; }
        .bg-ink-800 { background-color: var(--ink-800) !important; }
        .bg-ink-950\/50 { background-color: rgba(5, 8, 11, 0.5) !important; }
        .bg-ink-950\/20 { background-color: rgba(5, 8, 11, 0.2) !important; }
        .bg-coral-500 { background-color: var(--coral-500) !important; }
        .bg-coral-500\/10 { background-color: rgba(255, 107, 107, 0.1) !important; }
        .bg-emerald-500\/10 { background-color: rgba(16, 185, 129, 0.1) !important; }
        .bg-amber-500\/10 { background-color: rgba(245, 158, 11, 0.1) !important; }

        /* Border colors */
        .border { border: 1px solid transparent !important; }
        .border-b { border-bottom: 1px solid transparent !important; }
        .border-t { border-top: 1px solid transparent !important; }
        .border-ink-800 { border-color: var(--ink-800) !important; }
        .border-ink-700 { border-color: var(--ink-700) !important; }
        .border-ink-800\/80 { border-color: rgba(17, 22, 29, 0.8) !important; }
        .border-ink-800\/50 { border-color: rgba(17, 22, 29, 0.5) !important; }
        .border-ink-800\/60 { border-color: rgba(17, 22, 29, 0.6) !important; }
        .border-coral-500\/30 { border-color: rgba(255, 107, 107, 0.3) !important; }
        .border-emerald-500\/20 { border-color: rgba(16, 185, 129, 0.2) !important; }
        .border-amber-500\/20 { border-color: rgba(245, 158, 11, 0.2) !important; }

        /* Typography & Layout details */
        .text-warm-50 { color: var(--warm-50) !important; }
        .text-warm-100 { color: var(--warm-100) !important; }
        .text-warm-200 { color: var(--warm-200) !important; }
        .text-warm-300 { color: var(--warm-300) !important; }
        .text-ink-400 { color: var(--ink-400) !important; }
        .text-ink-500 { color: var(--ink-500) !important; }
        .text-ink-600 { color: var(--ink-600) !important; }
        .text-coral-500 { color: var(--coral-500) !important; }
        .text-emerald-400 { color: var(--emerald-400) !important; }
        .text-amber-500 { color: var(--amber-500) !important; }
        .text-ink-950 { color: var(--ink-950) !important; }

        .font-heading { font-family: Geist, var(--font-geist-sans), sans-serif !important; }
        .font-mono { font-family: 'JetBrains Mono', var(--font-geist-mono), monospace !important; }
        .font-body { font-family: Inter, sans-serif !important; }
        .font-semibold { font-weight: 600 !important; }
        .font-medium { font-weight: 500 !important; }
        .font-bold { font-weight: 700 !important; }

        .text-xs { font-size: 12px !important; }
        .text-sm { font-size: 14px !important; }
        .text-\[9px\] { font-size: 9px !important; }
        .text-\[10px\] { font-size: 10px !important; }
        .text-\[11px\] { font-size: 11px !important; }
        .text-2xl { font-size: 24px !important; }
        .text-base { font-size: 16px !important; }
        .text-right { text-align: right !important; }

        .uppercase { text-transform: uppercase !important; }
        .tracking-wider { letter-spacing: 0.05em !important; }
        .tracking-widest { letter-spacing: 0.1em !important; }
        .truncate { overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }

        .rounded { border-radius: 4px !important; }
        .rounded-t-sm { border-top-left-radius: 2px !important; border-top-right-radius: 2px !important; }
        .rounded-lg { border-radius: 8px !important; }
        .rounded-md { border-radius: 6px !important; }
        .rounded-\[1px\] { border-radius: 1px !important; }

        .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important; }
        .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important; }
        .shadow-inner { box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06) !important; }
        .backdrop-blur-sm { backdrop-filter: blur(4px) !important; }
        .z-10 { z-index: 10 !important; }
        .relative { position: relative !important; }
        .absolute { position: absolute !important; }
        .inset-0 { top: 0 !important; right: 0 !important; bottom: 0 !important; left: 0 !important; }
        .pointer-events-none { pointer-events: none !important; }
        .opacity-20 { opacity: 0.2 !important; }
        .overflow-hidden { overflow: hidden !important; }
        
        .transition-colors { transition-property: color, background-color, border-color !important; transition-duration: 150ms !important; transition-timing-function: ease !important; }
        .transition-all { transition-property: all !important; transition-duration: 150ms !important; transition-timing-function: ease !important; }

        /* Form elements & custom select styling */
        select, input {
          background-color: var(--ink-900) !important;
          border: 1px solid var(--ink-800) !important;
          color: var(--warm-200) !important;
          font-size: 12px !important;
          outline: none !important;
          border-radius: 4px !important;
          transition: border-color 0.15s ease !important;
        }
        select:focus, input:focus {
          border-color: var(--coral-500) !important;
        }
        
        /* Table overrides */
        table {
          width: 100% !important;
          border-collapse: collapse !important;
          text-align: left !important;
        }
        th, td {
          padding: 16px !important;
          border-bottom: 1px solid var(--ink-800) !important;
        }
        tr:hover td {
          background-color: rgba(5, 8, 11, 0.2) !important;
        }

        .ops-card {
          background-color: var(--ink-900);
          border: 1px solid var(--ink-800);
          transition: border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
        }
        .ops-card:hover {
          border-color: var(--ink-500) !important;
          transform: translateY(-4px);
          box-shadow: 0 15px 35px -10px rgba(0,0,0,0.6);
        }

        .hover\:bg-ink-800:hover { background-color: var(--ink-800) !important; }
        .hover\:bg-coral-600:hover { background-color: var(--coral-600) !important; }
        .hover\:border-ink-700:hover { border-color: var(--ink-700) !important; }
        .hover\:border-ink-500:hover { border-color: var(--ink-500) !important; }

        /* Architectural Visual Hover Effect */
        .arch-window { 
          transition: fill 0.4s ease, background-color 0.4s ease; 
        }
        .arch-window.vacant { background-color: var(--ink-800); }
        .ops-card:hover .arch-window.vacant { background-color: var(--ink-500); }

        .arch-window.arrears { background-color: var(--coral-500); box-shadow: 0 0 4px var(--coral-500); }
        .ops-card:hover .arch-window.arrears { background-color: var(--coral-400); }

        .arch-window.paid { background-color: var(--emerald-500); }
        .ops-card:hover .arch-window.paid { background-color: var(--emerald-400); }
      `}</style>

      {/* Page Sub-Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 fade-in-up">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-warm-50">Properties Directory</h1>
          <p className="text-xs font-mono text-ink-400 mt-1">Manage global portfolio architecture and state.</p>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <button className="bg-ink-950 border border-ink-800 hover:bg-ink-800 text-warm-200 text-xs font-medium px-3 py-2 rounded transition-colors flex items-center gap-2 shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export CSV
          </button>
          {/* Note: manual list logic removed per rules. Clicking this points user to Agent workspace instead */}
          <button 
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('tab', 'agent');
              window.history.pushState({}, '', url.toString());
              // Dispatch event to force update tabs in parent page
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="bg-coral-500 hover:bg-coral-600 text-ink-950 text-xs font-bold px-4 py-2 rounded transition-colors flex items-center gap-2 shadow-glow-coral"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            List with Agent Workspace
          </button>
        </div>
      </div>

      {/* Filters & Toolbar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 p-1 bg-ink-950/50 border border-ink-800 rounded-md fade-in-up delay-50 backdrop-blur-sm z-10 relative">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <svg width="14" height="14" style={{ width: '14px', height: '14px' }} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-ink-900 border border-ink-800 rounded pl-9 pr-3 py-1.5 text-xs text-warm-50 placeholder-ink-600 focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500/50 transition-all font-body"
            />
          </div>
          
          {/* Filters */}
          <select 
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="filter-select w-full sm:w-auto bg-ink-900 border border-ink-800 rounded px-3 py-1.5 text-xs text-warm-200 focus:outline-none focus:border-coral-500 transition-all font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="optimal">Optimal</option>
            <option value="attention">Needs Attention</option>
            <option value="risk">At Risk</option>
          </select>
          
          <select 
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className="filter-select w-full sm:w-auto bg-ink-900 border border-ink-800 rounded px-3 py-1.5 text-xs text-warm-200 focus:outline-none focus:border-coral-500 transition-all font-medium"
          >
            <option value="all">All Types</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="mixed">Mixed Use</option>
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-ink-900 border border-ink-800 rounded p-0.5 ml-auto lg:ml-0">
          <button 
            onClick={() => setViewMode('grid')}
            className={`rounded px-2.5 py-1 text-xs font-medium flex items-center gap-1.5 transition-all ${viewMode === 'grid' ? 'bg-ink-800 text-warm-100 shadow-sm' : 'text-ink-500 hover:text-warm-100'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            Grid
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`rounded px-2.5 py-1 text-xs font-medium flex items-center gap-1.5 transition-all ${viewMode === 'list' ? 'bg-ink-800 text-warm-100 shadow-sm' : 'text-ink-500 hover:text-warm-100'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            List
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 flex-grow pb-10">
          {paginatedItems.map((item, idx) => (
            <div key={item.id} className="ops-card rounded-lg p-5 flex flex-col justify-between fade-in-up delay-100 group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-[10px] font-mono text-ink-500 mb-0.5">ID: {item.id}</div>
                  <h3 className="font-heading text-base font-semibold text-warm-50 truncate max-w-[150px]" title={item.name}>{item.name}</h3>
                  <div className="text-[10px] font-body text-warm-300 mt-0.5 flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    {item.address}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-widest flex-shrink-0 ${
                  item.status === 'OPTIMAL' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  item.status === 'ATTENTION' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                  'bg-coral-500/10 text-coral-500 border border-coral-500/20'
                }`}>
                  {item.status}
                </span>
              </div>

              {/* Abstract Architectural Visualizer */}
              <div className="h-28 bg-ink-950 rounded border border-ink-800/80 mb-5 p-3 flex items-end justify-center gap-1.5 overflow-hidden relative shadow-inner">
                <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMGEwZjE0Ij48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDBMODAgMCIgc3Ryb2tlPSIjMWEyMDI3IiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPHBhdGggZD0iTTAgMEwwIDgwIiBzdHJva2UPSIjMWEyMDI3IiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPC9zdmc+')] pointer-events-none" />
                {renderVisual(item.visualStyle, item.status)}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-5 border-b border-ink-800/50 pb-4">
                <div>
                  <div className="text-[9px] font-mono text-ink-500 uppercase tracking-wider mb-0.5">Occupancy</div>
                  <div className="text-sm font-semibold text-warm-50 flex items-center gap-1.5">
                    {item.occupancy}% 
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      item.status === 'OPTIMAL' ? 'bg-emerald-500 shadow-glow-emerald' :
                      item.status === 'ATTENTION' ? 'bg-amber-500' :
                      'bg-coral-500 shadow-glow-coral'
                    }`} />
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-mono text-ink-500 uppercase tracking-wider mb-0.5">Mo. Revenue</div>
                  <div className="text-sm font-semibold text-warm-50 font-mono">{item.revenue}</div>
                </div>
                <div>
                  <div className="text-[9px] font-mono text-ink-500 uppercase tracking-wider mb-0.5">Total Units</div>
                  <div className="text-sm font-semibold text-warm-50 font-mono">{item.totalUnits}</div>
                </div>
                <div>
                  <div className="text-[9px] font-mono text-ink-500 uppercase tracking-wider mb-0.5">Arrears</div>
                  <div className={`text-sm font-semibold font-mono ${parseFloat(item.arrears.replace(/[$,k]/g, '')) > 0 ? 'text-coral-500' : 'text-warm-200'}`}>{item.arrears}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button className="flex-grow bg-ink-950 border border-ink-800 hover:bg-ink-800 hover:border-ink-700 text-warm-100 text-[11px] font-medium py-2 rounded transition-colors text-center">
                  Manage Asset
                </button>
                <button 
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('tab', 'agent');
                    window.history.pushState({}, '', url.toString());
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="w-9 h-[34px] bg-coral-500/10 border border-coral-500/30 text-coral-500 hover:bg-coral-500 hover:text-ink-950 rounded flex items-center justify-center transition-colors shadow-sm focus:outline-none focus:ring-1 focus:ring-coral-500" 
                  title="Ask Aura about this asset"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"></path><path d="M12 12 2.1 7.1"></path><path d="M12 12l9.9 4.9"></path></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="flex flex-col gap-2 flex-grow pb-10 bg-ink-950/20 border border-ink-800 rounded-md overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-ink-950 border-b border-ink-800 text-ink-500 font-mono uppercase tracking-wider">
                <th className="p-4">ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Location</th>
                <th className="p-4">Status</th>
                <th className="p-4">Occupancy</th>
                <th className="p-4">Mo. Revenue</th>
                <th className="p-4">Arrears</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map(item => (
                <tr key={item.id} className="border-b border-ink-800/60 hover:bg-ink-950/40 transition-colors text-warm-200">
                  <td className="p-4 font-mono text-ink-500">{item.id}</td>
                  <td className="p-4 font-semibold text-warm-50">{item.name}</td>
                  <td className="p-4">{item.address}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-widest ${
                      item.status === 'OPTIMAL' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      item.status === 'ATTENTION' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                      'bg-coral-500/10 text-coral-500 border border-coral-500/20'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 font-mono">{item.occupancy}%</td>
                  <td className="p-4 font-mono text-warm-50">{item.revenue}</td>
                  <td className={`p-4 font-mono ${parseFloat(item.arrears.replace(/[$,k]/g, '')) > 0 ? 'text-coral-500' : 'text-warm-200'}`}>{item.arrears}</td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    <button className="bg-ink-950 border border-ink-800 hover:bg-ink-800 px-3 py-1.5 rounded transition-colors text-[10px] font-medium text-warm-100">Manage</button>
                    <button 
                      onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set('tab', 'agent');
                        window.history.pushState({}, '', url.toString());
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }}
                      className="bg-coral-500/10 hover:bg-coral-500 hover:text-ink-950 border border-coral-500/30 text-coral-500 p-1.5 rounded transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"></path><path d="M12 12 2.1 7.1"></path><path d="M12 12l9.9 4.9"></path></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="mt-auto border-t border-ink-800 pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between gap-4 fade-in-up delay-300">
        <div className="text-[10px] font-mono text-ink-500">
          Showing <span className="text-warm-100">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-warm-100">{Math.min(currentPage * itemsPerPage, filteredItems.length)}</span> of <span className="text-warm-100">{filteredItems.length}</span> entries
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-7 h-7 bg-ink-950 border border-ink-800 rounded flex items-center justify-center text-ink-500 hover:text-warm-100 hover:border-ink-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          
          <div className="flex items-center gap-1 font-mono text-[10px]">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button 
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${currentPage === i + 1 ? 'bg-ink-800 border border-coral-500 text-warm-50' : 'bg-ink-950 border border-ink-800 text-ink-400 hover:bg-ink-800 hover:text-warm-50'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="w-7 h-7 bg-ink-950 border border-ink-800 rounded flex items-center justify-center text-ink-400 hover:text-warm-100 hover:border-ink-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
