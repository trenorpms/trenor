'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = [
    { title: 'Go to Overview Dashboard', category: 'Navigation', action: () => router.push('/manager/overview') },
    { title: 'View Property Listings', category: 'Navigation', action: () => router.push('/manager/properties') },
    { title: 'Open Tenants List', category: 'Navigation', action: () => router.push('/manager/tenants') },
    { title: 'Inspect Transaction Ledger', category: 'Finance', action: () => router.push('/manager/ledger') },
    { title: 'Inspect Unpaid Invoices', category: 'Finance', action: () => router.push('/manager/invoices') },
    { title: 'Vendor Roster Network', category: 'Operations', action: () => router.push('/manager/contractors') },
  ];

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-start justify-center pt-[15vh]"
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Search Header */}
        <div className="flex items-center border-b border-[var(--border-muted)] px-3 py-2 bg-[var(--bg-primary)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-tertiary)] mr-2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or directory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-tertiary)] py-2 text-sm"
          />
          <button onClick={onClose} className="text-xs text-[var(--accent-coral)] font-bold cursor-pointer px-1">ESC</button>
        </div>

        {/* Command Results */}
        <div className="max-h-[300px] overflow-y-auto p-2 flex flex-col gap-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--text-tertiary)] font-mono">
              NO MATCHING COMMANDS FOUND
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
                  className={`w-full text-left p-2.5 rounded flex items-center justify-between text-xs transition-all cursor-pointer group ${
                    isSelected 
                      ? 'bg-[var(--bg-tertiary)] border-l-2 border-[var(--accent-coral)] text-[var(--text-primary)] pl-3' 
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/50'
                  }`}
                >
                  <span className="font-semibold">{cmd.title}</span>
                  <span className={`font-mono text-[9px] border px-1.5 py-0.5 rounded transition-colors ${
                    isSelected ? 'border-[var(--accent-coral)] text-[var(--accent-coral)]' : 'border-[var(--border-muted)] text-[var(--text-tertiary)]'
                  }`}>
                    {cmd.category}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
