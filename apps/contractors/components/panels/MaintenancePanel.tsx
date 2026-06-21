'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Ticket {
  id: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  status: 'open' | 'assigned' | 'completed' | 'on_hold';
  propertyId?: string;
  propertyName?: string;
  unitNumber?: string;
  tenantId: string; // is tenant email in the tickets table
  contractorId?: number;
  amount?: number;
  contractorAccepted?: boolean;
  photoUrl?: string;
  locationName?: string;
  createdAt: string;
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
  photoUrl?: string;
}

interface Property {
  id: string;
  name: string;
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  propertyName?: string;
  unit?: string;
}

export default function MaintenancePanel() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  // Sub-tab: 'requests' (Triage Inbox) vs 'dispatch' (Work Orders / Assignments)
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'dispatch'>('requests');

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'assigned' | 'completed' | 'on_hold'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  // Batch Selection
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);

  // Modals
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTicketForAssign, setSelectedTicketForAssign] = useState<Ticket | null>(null);
  const [contractorSearch, setContractorSearch] = useState('');
  const [contractorSpecialty, setContractorSpecialty] = useState('all');

  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [newUrgency, setNewUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTenantId, setNewTenantId] = useState('');
  const [newPropertyId, setNewPropertyId] = useState('');

  // Status flags
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();

    const handleSearchEvent = () => {
      const q = localStorage.getItem('maintenance_search');
      if (q !== null) {
        setSearchQuery(q);
        localStorage.removeItem('maintenance_search');
      }
    };
    handleSearchEvent();
    window.addEventListener('maintenance_search_changed', handleSearchEvent);
    return () => window.removeEventListener('maintenance_search_changed', handleSearchEvent);
  }, []);

  const getHeaders = (): Record<string, string> => {
    const session = localStorage.getItem('user');
    if (!session) return {};
    try {
      const token = JSON.parse(session).id;
      return { 'Authorization': `Bearer ${token}` };
    } catch (e) {
      return {};
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const headers = getHeaders();
    try {
      const [ticketsRes, contractorsRes, propsRes, tenantsRes] = await Promise.all([
        fetch('http://localhost:4000/api/tickets', { headers }).then(r => r.ok ? r.json() : []),
        fetch('http://localhost:4000/api/tickets/contractors', { headers }).then(r => r.ok ? r.json() : []),
        fetch('http://localhost:4000/api/properties', { headers }).then(r => r.ok ? r.json() : []),
        fetch('http://localhost:4000/api/properties/tenants', { headers }).then(r => r.ok ? r.json() : [])
      ]);

      setTickets(ticketsRes || []);
      setContractors(contractorsRes || []);
      setProperties(propsRes || []);
      setTenants(tenantsRes || []);
    } catch (e) {
      console.error('Error fetching maintenance data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Ticket Operations
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim() || !newTenantId) return;

    setSubmitting(true);
    const headers = getHeaders();
    try {
      const res = await fetch('http://localhost:4000/api/tickets', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: newDescription,
          urgency: newUrgency,
          tenantId: newTenantId,
          propertyId: newPropertyId || undefined
        })
      });

      if (res.ok) {
        setNewDescription('');
        setNewUrgency('medium');
        setNewTenantId('');
        setNewPropertyId('');
        setNewRequestOpen(false);
        await fetchData();
      } else {
        alert('Failed to log request. Please check connections.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignContractor = async (contractorId: number) => {
    if (!selectedTicketForAssign) return;
    setAssigning(true);

    const headers = getHeaders();
    try {
      const res = await fetch(`http://localhost:4000/api/tickets/${selectedTicketForAssign.id}/assign`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contractorId: contractorId.toString() })
      });

      if (res.ok) {
        setAssignModalOpen(false);
        setSelectedTicketForAssign(null);
        await fetchData();
      } else {
        alert('Failed to assign contractor node.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAssigning(false);
    }
  };

  const handleCompleteTicket = async (ticketId: string) => {
    const headers = getHeaders();
    try {
      const res = await fetch(`http://localhost:4000/api/tickets/${ticketId}/complete`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleHoldTicket = async (ticketId: string) => {
    const headers = getHeaders();
    try {
      const res = await fetch(`http://localhost:4000/api/tickets/${ticketId}/hold`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Batch action handlers
  const handleBatchHold = async () => {
    const headers = getHeaders();
    try {
      await Promise.all(
        selectedTickets.map(id =>
          fetch(`http://localhost:4000/api/tickets/${id}/hold`, { method: 'POST', headers })
        )
      );
      setSelectedTickets([]);
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBatchComplete = async () => {
    const headers = getHeaders();
    try {
      await Promise.all(
        selectedTickets.map(id =>
          fetch(`http://localhost:4000/api/tickets/${id}/complete`, { method: 'POST', headers })
        )
      );
      setSelectedTickets([]);
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const ids = paginatedTickets.map(t => t.id);
      setSelectedTickets(ids);
    } else {
      setSelectedTickets([]);
    }
  };

  const handleToggleSelectTicket = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedTickets(prev => [...prev, id]);
    } else {
      setSelectedTickets(prev => prev.filter(x => x !== id));
    }
  };

  // Filter logic
  const filteredTickets = tickets.filter(t => {
    const matchesSearch =
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.tenantId && t.tenantId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.propertyName && t.propertyName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' ? true : t.status === statusFilter;
    const matchesUrgency = urgencyFilter === 'all' ? true : t.urgency === urgencyFilter;

    // Sub tab segregation:
    // Tab "Requests Inbox" has all requests grouped by status.
    // Tab "Active Dispatch" has accepted/assigned requests AND unassigned requests (open tickets ready for contractor assignment).
    if (activeSubTab === 'dispatch') {
      return matchesSearch && matchesUrgency && (t.status === 'open' || t.status === 'assigned');
    }

    return matchesSearch && matchesStatus && matchesUrgency;
  });

  // Pagination slice
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage) || 1;
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats calculation
  const statsPending = tickets.filter(t => t.status === 'open').length;
  const statsUnassigned = tickets.filter(t => t.status === 'open' && !t.contractorId).length;
  const statsActive = tickets.filter(t => t.status === 'assigned').length;
  const statsCompleted = tickets.filter(t => t.status === 'completed').length;

  // Filtered Contractors List inside Assignment Modal
  const filteredContractors = contractors.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(contractorSearch.toLowerCase()) ||
      c.specialty.toLowerCase().includes(contractorSearch.toLowerCase()) ||
      (c.bio && c.bio.toLowerCase().includes(contractorSearch.toLowerCase()));

    const matchesSpecialty =
      contractorSpecialty === 'all'
        ? true
        : c.specialty.toLowerCase().includes(contractorSpecialty.toLowerCase());

    return matchesSearch && matchesSpecialty;
  });

  return (
    <div className="flex flex-col p-4 md:p-6 lg:p-8 relative z-10 min-h-full max-w-7xl mx-auto w-full bg-[var(--bg-primary)] text-[var(--text-primary)] font-body">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b border-[var(--border-muted)] pb-5">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Maintenance Operations</h1>
          <p className="text-xs font-mono text-[var(--text-secondary)] mt-1.5">Triage tenant requests and dispatch field nodes.</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2 w-full md:w-auto">
          <button 
            onClick={fetchData}
            className="flex-1 md:flex-none bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-muted)] text-[var(--text-primary)] text-xs font-bold px-4 py-2.5 rounded-none transition-colors flex items-center justify-center gap-2 font-mono uppercase tracking-widest"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={loading ? "animate-spin" : ""}>
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            Refresh
          </button>
          <button 
            onClick={() => setNewRequestOpen(true)}
            className="flex-1 md:flex-none bg-[var(--accent-coral)] hover:bg-[rgba(255,107,107,0.85)] text-black text-xs font-bold px-4 py-2.5 rounded-none transition-colors flex items-center justify-center gap-2 font-mono uppercase tracking-widest shadow-[0_0_15px_rgba(255,107,107,0.25)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Request
          </button>
        </div>
      </div>

      {/* KPI Stats Grid Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded-none p-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--accent-coral)]"></div>
          <div className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase tracking-widest mb-1 pl-2">Pending Triage</div>
          <div className="text-xl font-mono font-bold text-[var(--accent-coral)] pl-2">{statsPending}</div>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded-none p-4">
          <div className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Unassigned W.O.</div>
          <div className="text-xl font-mono font-bold text-[var(--text-primary)]">{statsUnassigned}</div>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded-none p-4">
          <div className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Active Dispatch</div>
          <div className="text-xl font-mono font-bold text-[var(--text-primary)]">{statsActive}</div>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded-none p-4">
          <div className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Completed</div>
          <div className="text-xl font-mono font-bold text-[var(--text-secondary)]">{statsCompleted}</div>
        </div>
      </div>

      {/* Sub-tab selections */}
      <div className="flex gap-1 mb-5 border-b border-[var(--border-muted)] font-mono text-xs">
        <button 
          onClick={() => { setActiveSubTab('requests'); setCurrentPage(1); setSelectedTickets([]); }}
          className={`px-4 py-2 border-b-2 font-bold tracking-widest uppercase transition-colors ${
            activeSubTab === 'requests' 
              ? 'border-[var(--accent-coral)] text-[var(--accent-coral)]' 
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Requests Inbox 
          <span className="bg-[var(--accent-coral)]/10 border border-[var(--accent-coral)]/20 text-[var(--accent-coral)] px-1.5 py-0.5 rounded-none text-[9px] ml-1.5 font-bold">
            {tickets.length}
          </span>
        </button>
        <button 
          onClick={() => { setActiveSubTab('dispatch'); setCurrentPage(1); setSelectedTickets([]); }}
          className={`px-4 py-2 border-b-2 font-bold tracking-widest uppercase transition-colors ${
            activeSubTab === 'dispatch' 
              ? 'border-[var(--accent-coral)] text-[var(--accent-coral)]' 
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Active Dispatch 
          <span className="bg-[var(--border-strong)] text-[var(--text-primary)] px-1.5 py-0.5 border border-[var(--border-muted)] rounded-none text-[9px] ml-1.5 font-bold">
            {tickets.filter(t => t.status === 'open' || t.status === 'assigned').length}
          </span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 mb-4 relative z-20">
        <div className="relative flex-grow max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            placeholder="Search by ID, Tenant, or Property..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-muted)] text-[var(--text-primary)] rounded-none pl-9 pr-3 py-2 text-xs font-mono focus:outline-none focus:border-[var(--accent-coral)] focus:ring-1 focus:ring-[var(--accent-coral)]/30"
          />
        </div>

        {activeSubTab === 'requests' && (
          <select 
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
            className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] text-[var(--text-primary)] rounded-none px-3 py-2 text-xs font-mono focus:outline-none focus:border-[var(--accent-coral)]"
          >
            <option value="all">Status: All States</option>
            <option value="open">Pending</option>
            <option value="assigned">Accepted</option>
            <option value="on_hold">Rejected/On Hold</option>
            <option value="completed">Completed</option>
          </select>
        )}

        <select 
          value={urgencyFilter}
          onChange={(e) => { setUrgencyFilter(e.target.value as any); setCurrentPage(1); }}
          className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] text-[var(--text-primary)] rounded-none px-3 py-2 text-xs font-mono focus:outline-none focus:border-[var(--accent-coral)]"
        >
          <option value="all">Urgency: All</option>
          <option value="high">Critical</option>
          <option value="medium">Standard</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Main Table Container */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded-none relative overflow-visible flex flex-col min-h-[300px]">
        
        {/* Batch Action Bar (Framer Motion Slide Down) */}
        <AnimatePresence>
          {selectedTickets.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: '41px', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="absolute top-0 left-0 w-full bg-[var(--bg-tertiary)] border-b border-[var(--accent-coral)]/30 flex items-center justify-between px-4 z-20 overflow-hidden"
            >
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono font-bold text-[var(--accent-coral)]">
                  {selectedTickets.length} Selected
                </span>
                <div className="h-4 w-px bg-[var(--border-muted)]"></div>
                <button 
                  onClick={handleBatchComplete}
                  className="text-[10px] font-mono font-bold text-[var(--text-primary)] hover:text-[var(--accent-coral)] uppercase tracking-widest flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg> 
                  Complete Selected
                </button>
                <button 
                  onClick={handleBatchHold}
                  className="text-[10px] font-mono font-bold text-[var(--text-secondary)] hover:text-[var(--accent-coral)] uppercase tracking-widest flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg> 
                  Hold / Reject
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table Wrapper */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-muted)] h-[41px]">
                <th className="py-2.5 px-4 w-10">
                  <input 
                    type="checkbox"
                    checked={paginatedTickets.length > 0 && paginatedTickets.every(t => selectedTickets.includes(t.id))}
                    onChange={(e) => handleToggleSelectAll(e.target.checked)}
                    className="w-3.5 h-3.5 border-[var(--border-muted)] text-[var(--accent-coral)] focus:ring-0 focus:ring-offset-0 bg-transparent rounded-none cursor-pointer accent-[var(--accent-coral)]"
                  />
                </th>
                <th className="py-2.5 px-4 text-[9px] font-mono font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Request ID</th>
                <th className="py-2.5 px-4 text-[9px] font-mono font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Property / Unit</th>
                <th className="py-2.5 px-4 text-[9px] font-mono font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Issue Description</th>
                <th className="py-2.5 px-4 text-[9px] font-mono font-bold text-[var(--text-tertiary)] uppercase tracking-widest text-center">Urgency</th>
                <th className="py-2.5 px-4 text-[9px] font-mono font-bold text-[var(--text-tertiary)] uppercase tracking-widest text-center">Status</th>
                <th className="py-2.5 px-4 text-[9px] font-mono font-bold text-[var(--text-tertiary)] uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs font-body text-[var(--text-secondary)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center font-mono text-xs text-[var(--text-tertiary)]">
                    Querying Operational Records...
                  </td>
                </tr>
              ) : paginatedTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center font-mono text-xs text-[var(--text-tertiary)]">
                    No matching maintenance tickets found.
                  </td>
                </tr>
              ) : (
                paginatedTickets.map(ticket => {
                  const assignedContractor = contractors.find(c => c.id === ticket.contractorId);
                  return (
                    <tr key={ticket.id} className="border-b border-[var(--border-muted)]/50 hover:bg-[var(--bg-tertiary)]/30 transition-colors group">
                      <td className="py-3 px-4">
                        <input 
                          type="checkbox"
                          checked={selectedTickets.includes(ticket.id)}
                          onChange={(e) => handleToggleSelectTicket(ticket.id, e.target.checked)}
                          className="w-3.5 h-3.5 border-[var(--border-muted)] text-[var(--accent-coral)] focus:ring-0 focus:ring-offset-0 bg-transparent rounded-none cursor-pointer accent-[var(--accent-coral)]"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-[var(--text-primary)] font-bold">
                        {ticket.id.toUpperCase()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[var(--text-primary)]">
                          {ticket.propertyName || 'My Complex'}
                        </div>
                        <div className="text-[9px] font-mono text-[var(--text-tertiary)] mt-0.5 uppercase tracking-wide">
                          Unit {ticket.unitNumber || 'N/A'} • {ticket.tenantId}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-primary)] whitespace-normal max-w-xs break-all">
                        {ticket.description}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[9px] font-mono font-bold tracking-widest border ${
                          ticket.urgency === 'high' 
                            ? 'bg-red-500/10 text-red-500 border-red-500/30' 
                            : ticket.urgency === 'medium'
                            ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                            : 'bg-green-500/10 text-green-500 border-green-500/30'
                        }`}>
                          {ticket.urgency === 'high' && <span className="w-1.5 h-1.5 bg-red-500 rounded-none animate-pulse"></span>}
                          {ticket.urgency.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-1.5 py-0.5 border rounded-none text-[9px] font-mono font-bold tracking-widest ${
                          ticket.status === 'open'
                            ? 'bg-[var(--accent-coral)]/10 border-[var(--accent-coral)] text-[var(--accent-coral)]'
                            : ticket.status === 'assigned'
                            ? 'bg-blue-500/10 border-blue-500 text-blue-400'
                            : ticket.status === 'completed'
                            ? 'bg-green-500/10 border-green-500 text-green-400'
                            : 'bg-gray-500/10 border-gray-600 text-gray-400'
                        }`}>
                          {ticket.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right relative">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* Active Dispatch actions */}
                          {activeSubTab === 'dispatch' && (
                            <>
                              {ticket.status === 'open' && (
                                <button 
                                  onClick={() => {
                                    setSelectedTicketForAssign(ticket);
                                    setAssignModalOpen(true);
                                  }}
                                  className="bg-[var(--accent-coral)] hover:bg-[rgba(255,107,107,0.85)] text-black font-mono font-bold text-[10px] tracking-widest uppercase px-3 py-1.5 rounded-none transition-all shadow-sm cursor-pointer"
                                >
                                  Assign Node
                                </button>
                              )}
                              {ticket.status === 'assigned' && assignedContractor && (
                                <div className="flex items-center gap-2 text-left">
                                  <div className="flex flex-col text-right">
                                    <span className="text-xs font-medium text-[var(--text-primary)] leading-none">
                                      {assignedContractor.name}
                                    </span>
                                    <span className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase tracking-widest mt-0.5">
                                      {assignedContractor.specialty}
                                    </span>
                                  </div>
                                  <div className="w-7 h-7 bg-[var(--bg-tertiary)] border border-[var(--border-muted)] flex items-center justify-center font-mono font-bold text-xs text-[var(--text-primary)]">
                                    {assignedContractor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {/* Quick single row action overlays */}
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 bg-[var(--bg-secondary)] border border-[var(--border-muted)] px-1.5 py-1 z-10 transition-opacity">
                            {ticket.status !== 'completed' && (
                              <button 
                                onClick={() => handleCompleteTicket(ticket.id)}
                                className="p-1 text-[var(--text-secondary)] hover:text-green-500 transition-colors"
                                title="Mark as Completed"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              </button>
                            )}
                            {ticket.status !== 'on_hold' && ticket.status !== 'completed' && (
                              <button 
                                onClick={() => handleHoldTicket(ticket.id)}
                                className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent-coral)] transition-colors"
                                title="Put On Hold / Reject"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                              </button>
                            )}
                          </div>

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="mt-auto border-t border-[var(--border-muted)] bg-[var(--bg-tertiary)] px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[10px] font-mono text-[var(--text-tertiary)]">
            Showing <span className="text-[var(--text-primary)]">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-[var(--text-primary)]">{Math.min(currentPage * itemsPerPage, filteredTickets.length)}</span> of <span className="text-[var(--text-primary)]">{filteredTickets.length}</span> requests
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="w-6 h-6 bg-[var(--bg-secondary)] border border-[var(--border-muted)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <div className="flex items-center gap-1 font-mono text-[10px]">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button 
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-6 h-6 border flex items-center justify-center cursor-pointer transition-all ${
                    currentPage === page 
                      ? 'bg-[var(--bg-secondary)] border-[var(--accent-coral)] text-[var(--accent-coral)] font-bold' 
                      : 'bg-[var(--bg-secondary)] border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="w-6 h-6 bg-[var(--bg-secondary)] border border-[var(--border-muted)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL: ASSIGN CONTRACTOR NODE              */}
      {/* ========================================== */}
      {assignModalOpen && selectedTicketForAssign && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-none shadow-2xl flex flex-col relative max-h-[85vh]">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--accent-coral)]"></div>
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border-muted)] bg-[var(--bg-tertiary)] flex justify-between items-center">
              <div>
                <h2 className="font-heading font-semibold text-[var(--text-primary)] text-base">Assign Field Node</h2>
                <div className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-widest mt-0.5">
                  {selectedTicketForAssign.id.toUpperCase()} • {selectedTicketForAssign.description.substring(0, 50)}...
                </div>
              </div>
              <button 
                onClick={() => setAssignModalOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-[var(--border-muted)] bg-[var(--bg-secondary)] flex gap-3">
              <div className="relative flex-grow">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input 
                  type="text" 
                  placeholder="Search contractors directory..." 
                  value={contractorSearch}
                  onChange={(e) => setContractorSearch(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-muted)] text-[var(--text-primary)] rounded-none pl-9 pr-3 py-2 text-xs font-mono focus:outline-none focus:border-[var(--accent-coral)]"
                />
              </div>
              <select 
                value={contractorSpecialty}
                onChange={(e) => setContractorSpecialty(e.target.value)}
                className="bg-[var(--bg-primary)] border border-[var(--border-muted)] text-[var(--text-primary)] rounded-none px-3 py-2 text-xs font-mono focus:outline-none"
              >
                <option value="all">Specialties: All</option>
                <option value="plumbing">Plumbing</option>
                <option value="hvac">HVAC</option>
                <option value="electrical">Electrical</option>
                <option value="roofing">Roofing</option>
                <option value="painting">Painting</option>
              </select>
            </div>

            {/* Contractor Directory Scroller */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-[var(--bg-primary)]/40">
              {filteredContractors.length === 0 ? (
                <div className="py-10 text-center font-mono text-xs text-[var(--text-tertiary)]">
                  No verified contractors matching query.
                </div>
              ) : (
                filteredContractors.map(contractor => (
                  <div key={contractor.id} className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] hover:border-[var(--border-strong)] p-4 flex items-center justify-between transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 border border-[var(--border-muted)] bg-[var(--bg-tertiary)] flex items-center justify-center font-mono font-bold text-[var(--text-primary)]">
                        {contractor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)]">{contractor.name}</h3>
                          <span className="bg-[var(--bg-tertiary)] border border-[var(--border-muted)] text-[var(--text-primary)] px-1 py-px rounded-none text-[8px] font-mono font-bold tracking-widest uppercase">
                            NODE #{contractor.id}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-[var(--text-tertiary)] mt-0.5">
                          {contractor.specialty} • {contractor.email}
                        </div>
                        {contractor.bio && (
                          <div className="text-[10.5px] text-[var(--text-secondary)] italic mt-1 max-w-sm">
                            {contractor.bio}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase tracking-widest">Rate</div>
                        <div className="text-xs font-mono font-bold text-[var(--text-primary)]">
                          €{contractor.hourlyRate || 45}/hr
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAssignContractor(contractor.id)}
                        disabled={assigning}
                        className="bg-[var(--bg-primary)] border border-[var(--accent-coral)] hover:bg-[var(--accent-coral)] hover:text-black text-[var(--accent-coral)] font-mono font-bold text-[10px] tracking-widest uppercase px-4 py-2 rounded-none transition-all cursor-pointer disabled:opacity-40"
                      >
                        {assigning ? 'Dispatching...' : 'Dispatch'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: LOG NEW MAINTENANCE REQUEST        */}
      {/* ========================================== */}
      {newRequestOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-none shadow-2xl flex flex-col relative">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--accent-coral)]"></div>
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border-muted)] bg-[var(--bg-tertiary)] flex justify-between items-center">
              <div>
                <h2 className="font-heading font-semibold text-[var(--text-primary)] text-sm tracking-tight">Log Maintenance Request</h2>
                <div className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase tracking-widest mt-0.5">
                  Register new tenant support ticket
                </div>
              </div>
              <button 
                onClick={() => setNewRequestOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateRequest} className="p-6 flex flex-col gap-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-tertiary)]">
                  Issue Description
                </label>
                <textarea 
                  rows={3}
                  required
                  placeholder="Describe the leak, break, or maintenance request scope..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-muted)] text-[var(--text-primary)] rounded-none px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent-coral)] resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-tertiary)]">
                  Select Tenant Context
                </label>
                <select 
                  required
                  value={newTenantId}
                  onChange={(e) => {
                    setNewTenantId(e.target.value);
                    const tenant = tenants.find(t => t.email === e.target.value);
                    if (tenant && tenant.propertyName) {
                      // Autoselect matching property
                      const prop = properties.find(p => p.name === tenant.propertyName);
                      if (prop) setNewPropertyId(prop.id);
                    }
                  }}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-muted)] text-[var(--text-primary)] rounded-none px-3 py-2 text-xs font-mono focus:outline-none focus:border-[var(--accent-coral)]"
                >
                  <option value="">Select affected Tenant</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.email}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-tertiary)]">
                  Select Property Location (Optional)
                </label>
                <select 
                  value={newPropertyId}
                  onChange={(e) => setNewPropertyId(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-muted)] text-[var(--text-primary)] rounded-none px-3 py-2 text-xs font-mono focus:outline-none"
                >
                  <option value="">Select Property</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-tertiary)]">
                  Urgency Rating
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map(urg => (
                    <button 
                      key={urg}
                      type="button"
                      onClick={() => setNewUrgency(urg)}
                      className={`py-2 border font-mono text-[10px] uppercase tracking-widest transition-all ${
                        newUrgency === urg 
                          ? 'border-[var(--accent-coral)] bg-[var(--accent-coral)]/10 text-[var(--accent-coral)] font-bold' 
                          : 'border-[var(--border-muted)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {urg}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className="w-full mt-2 bg-[var(--accent-coral)] hover:bg-[rgba(255,107,107,0.85)] text-black font-mono font-bold text-xs tracking-widest uppercase py-3 rounded-none transition-colors shadow-lg cursor-pointer"
              >
                {submitting ? 'LOGGING REQUEST...' : 'DISPATCH TO TRIAGE INBOX'}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
