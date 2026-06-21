'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  title: string;
  category: string;
  action: () => void;
  subtitle?: string;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch contextual search data when opened
  useEffect(() => {
    if (isOpen) {
      const session = localStorage.getItem('user');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          const headers = { 'Authorization': `Bearer ${parsed.id}` };

          fetch('http://localhost:4000/api/properties', { headers })
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => setProperties(data || []))
            .catch(() => {});

          fetch('http://localhost:4000/api/properties/tenants', { headers })
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => setTenants(data || []))
            .catch(() => {});

          fetch('http://localhost:4000/api/tickets', { headers })
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => setTickets(data || []))
            .catch(() => {});
        } catch (e) {
          // Ignore
        }
      }
    }
  }, [isOpen]);

  const staticCommands: CommandItem[] = [
    { title: 'Go to Overview Dashboard', category: 'Navigation', action: () => router.push('/manager/overview') },
    { title: 'View Property Listings', category: 'Navigation', action: () => router.push('/manager/properties') },
    { title: 'Open Tenants List', category: 'Navigation', action: () => router.push('/manager/tenants') },
    { title: 'Inspect Transaction Ledger', category: 'Finance', action: () => router.push('/manager/ledger') },
    { title: 'Inspect Unpaid Invoices', category: 'Finance', action: () => router.push('/manager/invoices') },
    { title: 'Vendor Roster Network', category: 'Operations', action: () => router.push('/manager/contractors') },
    { title: 'Sophia Agent Console', category: 'Operations', action: () => router.push('/manager/agent') },
  ];

  const propertyCommands: CommandItem[] = properties.map((p) => ({
    title: `Property: ${p.name || p.address}`,
    subtitle: p.address,
    category: 'Property',
    action: () => {
      localStorage.setItem('properties_search', p.name || p.address);
      window.dispatchEvent(new Event('properties_search_changed'));
      router.push('/manager/properties');
    },
  }));

  const tenantCommands: CommandItem[] = tenants.map((t) => ({
    title: `Tenant: ${t.name}`,
    subtitle: `Unit ${t.unit || 'N/A'} • ${t.propertyName || 'Property'}`,
    category: 'Tenant',
    action: () => {
      localStorage.setItem('tenants_search', t.name);
      window.dispatchEvent(new Event('tenants_search_changed'));
      router.push('/manager/tenants');
    },
  }));

  const ticketCommands: CommandItem[] = tickets.map((t) => ({
    title: `Maintenance Request: ${t.description.substring(0, 50)}${t.description.length > 50 ? '...' : ''}`,
    subtitle: `Status: ${t.status.toUpperCase()} • Urgency: ${t.urgency.toUpperCase()}`,
    category: 'Maintenance',
    action: () => {
      localStorage.setItem('maintenance_search', t.description);
      window.dispatchEvent(new Event('maintenance_search_changed'));
      router.push('/manager/maintenance');
    },
  }));

  const allCommands = [
    ...staticCommands,
    ...propertyCommands,
    ...tenantCommands,
    ...ticketCommands,
  ];

  const filtered = allCommands.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase()) ||
      (c.subtitle && c.subtitle.toLowerCase().includes(search.toLowerCase()))
  );

  // Auto-focus and reset search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Keyboard Navigation: Up, Down, Enter, Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filtered, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9999] flex items-start justify-center pt-[15vh]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[60vh]"
      >
        {/* Search Header */}
        <div className="flex items-center border-b border-[var(--border-muted)] px-4 py-3 bg-[var(--bg-primary)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-coral)" strokeWidth="2.5" className="mr-3 flex-shrink-0">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands, tenants, properties, or maintenance tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-tertiary)] py-1.5 text-sm font-sans"
          />
          <kbd className="text-[10px] font-mono text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-2 py-1 rounded border border-[var(--border-muted)] flex-shrink-0 select-none">ESC</kbd>
        </div>

        {/* Command Results */}
        <div className="overflow-y-auto p-2 flex flex-col gap-1 flex-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-tertiary)] font-mono">
              NO MATCHING RESULTS FOUND
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  className={`w-full text-left p-3 rounded flex items-center justify-between text-xs transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-[var(--bg-tertiary)] border-l-2 border-[var(--accent-coral)] text-[var(--text-primary)] pl-3.5'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/40'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="font-semibold text-[13px] leading-snug group-hover:text-[var(--accent-coral)] transition-colors truncate">{cmd.title}</span>
                    {cmd.subtitle && (
                      <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5 truncate">{cmd.subtitle}</span>
                    )}
                  </div>
                  <span className={`font-mono text-[9px] border px-2 py-0.5 rounded transition-colors flex-shrink-0 ${
                    isSelected ? 'border-[var(--accent-coral)] text-[var(--accent-coral)] bg-[var(--accent-coral)]/10' : 'border-[var(--border-muted)] text-[var(--text-tertiary)] bg-[var(--bg-primary)]/50'
                  }`}>
                    {cmd.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="border-t border-[var(--border-muted)] bg-[var(--bg-primary)] px-4 py-2 flex items-center justify-between text-[10px] font-mono text-[var(--text-tertiary)] select-none">
          <div className="flex gap-4">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span>Omni Search</span>
        </div>
      </div>
    </div>
  );
}
