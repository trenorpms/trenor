'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ThemeSelector } from '@repo/ui/theme-selector';
import { useRealtime } from '../app/hooks/useRealtime';
import { motion, AnimatePresence } from 'framer-motion';

interface TopbarProps {
  onToggleCommandPalette: () => void;
}

export default function Topbar({ onToggleCommandPalette }: TopbarProps) {
  const router = useRouter();
  const params = useParams();
  const activeTab = params?.tabname as string || 'Overview';
  const [user, setUser] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, clearNotifications } = useRealtime(user);

  useEffect(() => {
    const session = localStorage.getItem('user');
    if (session) {
      try {
        setUser(JSON.parse(session));
      } catch (e) {
        // Ignore
      }
    }
  }, []);

  const handleDisconnect = () => {
    localStorage.removeItem('user');
    document.cookie = 'user=; path=/; max-age=0';
    router.push('/');
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-[var(--border-muted)] bg-[var(--bg-secondary)] sticky top-0 z-10 flex-shrink-0">
      
      {/* Breadcrumbs */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--text-tertiary)] uppercase tracking-widest select-none">
          <span>landlord OS</span>
          <svg className="w-3 h-3 text-[var(--text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
          <span className="text-[var(--text-primary)] font-bold">{activeTab}</span>
        </div>
      </div>

      {/* Command Palette Trigger */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onToggleCommandPalette} 
          className="flex items-center justify-between bg-[var(--bg-primary)] border border-[var(--border-muted)] hover:border-[var(--accent-coral)] rounded px-3 py-1.5 w-64 text-[var(--text-tertiary)] transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:text-[var(--accent-coral)] transition-colors">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span className="text-sm group-hover:text-[var(--text-primary)] transition-colors font-body">Search menu (Ctrl+K)...</span>
          </div>
          <div className="text-[10px] font-mono text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded border border-[var(--border-muted)]">
            ⌘K
          </div>
        </motion.button>
      </div>

      {/* Utilities */}
      <div className="flex items-center gap-5">
        <select 
          value={typeof window !== 'undefined' ? (localStorage.getItem('currency') || 'EUR') : 'EUR'} 
          onChange={(e) => {
            localStorage.setItem('currency', e.target.value);
            window.dispatchEvent(new Event('currencyChange'));
            // Trigger a full route re-render
            router.refresh();
          }}
          className="bg-[var(--bg-primary)] border border-[var(--border-strong)] text-[var(--text-primary)] text-[10px] font-mono rounded px-2 py-1 outline-none cursor-pointer hover:border-[var(--accent-coral)] transition-colors"
        >
          <option value="EUR">EUR (€)</option>
          <option value="HUF">HUF (Ft)</option>
          <option value="USD">USD ($)</option>
        </select>

        <ThemeSelector />

        <div className="relative">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[var(--accent-coral)] text-black font-bold text-[8px] w-4 h-4 flex items-center justify-center rounded-full border border-[var(--bg-primary)]">
                {notifications.length}
              </span>
            )}
          </motion.button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div 
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 mt-3 w-80 bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded shadow-2xl z-50 p-3 flex flex-col gap-2"
              >
                <div className="flex justify-between items-center border-b border-[var(--border-muted)] pb-2 mb-1">
                  <span className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase font-bold tracking-wider">Alert Feed</span>
                  {notifications.length > 0 && (
                    <button onClick={clearNotifications} className="text-[8px] font-mono text-[var(--accent-coral)] hover:underline cursor-pointer">
                      CLEAR ALL
                    </button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto flex flex-col gap-2">
                  {notifications.length === 0 ? (
                    <div className="text-center font-mono text-[10px] text-[var(--text-tertiary)] py-4">
                      NO ACTIVE SYSTEM NOTIFICATIONS
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-2 bg-[var(--bg-primary)] border border-[var(--border-muted)] rounded flex flex-col gap-1 text-[11px] hover:border-[var(--accent-coral)] transition-colors">
                        <div className="font-semibold text-[var(--text-primary)]">{n.title}</div>
                        <div className="text-[var(--text-secondary)]">{n.message}</div>
                        <div className="text-[8px] font-mono text-[var(--text-tertiary)] self-end">
                          {new Date(n.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {user && (
          <div className="flex items-center gap-3 select-none">
            <div className="w-8 h-8 rounded bg-[var(--bg-tertiary)] border border-[var(--border-strong)] flex items-center justify-center overflow-hidden">
              <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.name || 'operator'}&backgroundColor=ff6b6b`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col hidden sm:flex">
              <span className="text-xs font-semibold text-[var(--text-primary)] leading-tight">{user.name}</span>
              <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider font-mono mt-0.5">{user.role}</span>
            </div>
          </div>
        )}

        <motion.button 
          whileHover={{ scale: 1.02, borderColor: 'var(--accent-coral)' }}
          whileTap={{ scale: 0.98 }}
          onClick={handleDisconnect} 
          className="border border-[var(--border-strong)] bg-transparent text-[var(--accent-coral)] px-3 py-1.5 text-xs rounded transition-colors cursor-pointer"
        >
          Disconnect
        </motion.button>
      </div>

    </header>
  );
}
