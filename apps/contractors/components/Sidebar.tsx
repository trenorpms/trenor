'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtime } from '../app/hooks/useRealtime';

export default function Sidebar() {
  const router = useRouter();
  const params = paramsHook();
  const activeTab = params?.tabname as string || 'overview';
  
  const [collapsed, setCollapsed] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Connection status states
  const [backendStatus, setBackendStatus] = useState<'disconnected' | 'connecting' | 'connected'>('connecting');
  const [realtimeStatus, setRealtimeStatus] = useState<'disconnected' | 'connecting' | 'connected'>('connecting');
  const [databaseStatus, setDatabaseStatus] = useState<'disconnected' | 'connecting' | 'connected'>('connecting');
  const [isChecking, setIsChecking] = useState(false);

  const checkConnections = async () => {
    if (isChecking) return;
    setIsChecking(true);
    setBackendStatus('connecting');
    setRealtimeStatus('connecting');
    setDatabaseStatus('connecting');

    let apiOk = false;
    let dbOk = false;

    try {
      const session = localStorage.getItem('user');
      let token = '';
      if (session) {
        token = JSON.parse(session).id;
      }
      // Pinging a global api route. Resolving means the API backend server is running.
      const res = await fetch('http://localhost:4000/api/properties', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      apiOk = true;
      if (res.ok || res.status === 401) {
        dbOk = true;
      }
    } catch (e) {
      // fetch threw a network error, backend is down.
    }

    setTimeout(() => {
      setBackendStatus(apiOk ? 'connected' : 'disconnected');
      setDatabaseStatus(dbOk ? 'connected' : 'disconnected');
      setIsChecking(false);
    }, 600);
  };

  // Load collapse state and sub-menu open states on client mount
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed');
    if (savedCollapsed !== null) {
      setCollapsed(savedCollapsed === 'true');
    }
    const savedFinance = localStorage.getItem('sidebar-finance-open');
    if (savedFinance !== null) {
      setFinanceOpen(savedFinance === 'true');
    }
    
    checkConnections();
    const interval = setInterval(checkConnections, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleCollapse = () => {
    const nextVal = !collapsed;
    setCollapsed(nextVal);
    localStorage.setItem('sidebar-collapsed', String(nextVal));
  };

  const handleToggleFinance = () => {
    const nextVal = !financeOpen;
    setFinanceOpen(nextVal);
    localStorage.setItem('sidebar-finance-open', String(nextVal));
  };
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  
  // Real user data state
  const [user, setUser] = useState<{ name: string; email: string; role?: string; id?: string } | null>(null);

  // Hook up actual WebSocket connection state
  const { connected: wsConnected } = useRealtime(user);

  useEffect(() => {
    setRealtimeStatus(wsConnected ? 'connected' : 'disconnected');
  }, [wsConnected]);

  // Sync route param hook safely
  function paramsHook() {
    try {
      return useParams();
    } catch (e) {
      return null;
    }
  }

  useEffect(() => {
    const session = localStorage.getItem('user');
    if (session) {
      try {
        setUser(JSON.parse(session));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const navigateTo = (tab: string) => {
    router.push(`/manager/${tab}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    document.cookie = 'user=; path=/; max-age=0';
    router.replace('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const menuVariants = {
    collapsed: { 
      width: '76px',
      margin: '12px 6px 12px 12px',
      transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }
    },
    expanded: { 
      width: '260px',
      margin: '12px 0px 12px 12px',
      transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }
    }
  };

  // Sidebar navigation options
  const navItems = [
    {
      id: 'agent',
      label: 'Agent Workspace',
      icon: (
        <svg className="w-4 h-4 mr-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 17 10 11 4 5"></polyline>
          <line x1="12" y1="19" x2="20" y2="19"></line>
        </svg>
      )
    },
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg className="w-4 h-4 mr-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      )
    },
    {
      id: 'properties',
      label: 'Properties',
      icon: (
        <svg className="w-4 h-4 mr-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18"></path>
          <path d="M5 21V7l8-4v18"></path>
          <path d="M19 21V11l-6-3"></path>
        </svg>
      )
    },
    {
      id: 'tenants',
      label: 'Tenants',
      icon: (
        <svg className="w-4 h-4 mr-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
        </svg>
      )
    }
  ];

  const operationsItems = [
    {
      id: 'maintenance',
      label: 'Maintenance',
      icon: (
        <svg className="w-4 h-4 mr-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 9.36l-7.1 7.1a1 1 0 0 1-1.41 0l-1.41-1.41a1 1 0 0 1 0-1.41l7.1-7.1a6 6 0 0 1 9.36-7.94l-3.77 3.77z"></path>
        </svg>
      )
    },
    {
      id: 'contractors',
      label: 'Contractors',
      icon: (
        <svg className="w-4 h-4 mr-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <polyline points="17 11 19 13 23 9" />
        </svg>
      )
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: (
        <svg className="w-4 h-4 mr-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
      )
    }
  ];

  const configItems = [
    {
      id: 'analytics',
      label: 'Analytics',
      icon: (
        <svg className="w-4 h-4 mr-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
      )
    },
    {
      id: 'audit',
      label: 'Security & Audit',
      icon: (
        <svg className="w-4 h-4 mr-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      )
    },
    {
      id: 'connections',
      label: 'Team & Connections',
      icon: (
        <svg className="w-4 h-4 mr-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-4 h-4 mr-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1-2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      )
    }
  ];

  return (
    <motion.aside 
      initial={collapsed ? 'collapsed' : 'expanded'}
      animate={collapsed ? 'collapsed' : 'expanded'}
      variants={menuVariants}
      className="flex-shrink-0 bg-[var(--bg-secondary)] border border-[var(--border-muted)] flex flex-col z-20 shadow-2xl relative select-none rounded-[16px]"
    >
      <style jsx>{`
        /* Smooth scrolling inside navigation menu */
        .sidebar-nav-container::-webkit-scrollbar {
          width: 3px;
        }
        .sidebar-nav-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-nav-container::-webkit-scrollbar-thumb {
          background: var(--border-muted);
          border-radius: 9px;
        }

        /* Tree Structure Connector Styles matching reference design */
        .tree-line-wrapper {
          position: relative;
          margin-left: 21px;
          padding-left: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 4px;
          margin-bottom: 4px;
        }

        /* Continuous tree thread */
        .tree-vertical-thread {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 16px; /* stops at vertical center of last item */
          width: 1.5px;
          background: var(--border-muted);
          border-radius: 99px;
        }

        .tree-branch-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        /* Left extending branch */
        .tree-horizontal-branch {
          position: absolute;
          left: -16px;
          top: 50%;
          width: 12px;
          height: 1.5px;
          background: var(--border-muted);
        }

        .sub-nav-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 8px 12px;
          color: var(--text-secondary);
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 500;
          border-radius: 8px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
          background: transparent;
          border: 1px solid transparent;
        }

        .sub-nav-item:hover {
          color: var(--text-primary);
          background-color: rgba(255, 255, 255, 0.03);
          transform: translateX(2px);
        }

        /* High Fidelity active state matching overview bubble mockup */
        .sub-nav-item.active {
          color: var(--text-primary) !important;
          background-color: var(--bg-primary) !important;
          border: 1px solid var(--border-muted) !important;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        /* Notification Badges styling */
        .badge-coral {
          font-family: monospace;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 6px;
          background-color: var(--accent-coral-muted);
          color: var(--accent-coral);
          border: 1px solid rgba(255, 107, 107, 0.2);
          box-shadow: 0 2px 6px rgba(255, 107, 107, 0.1);
        }

        /* Glass Floating Tooltips */
        .floating-tooltip {
          position: absolute;
          left: 80px;
          background-color: rgba(10, 15, 20, 0.95);
          border: 1px solid var(--border-strong);
          color: var(--text-primary);
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 10.5px;
          font-family: monospace;
          font-weight: 700;
          letter-spacing: 0.08em;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transform: translateX(-12px);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          z-index: 999;
        }

        .nav-btn-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .nav-btn-wrapper:hover .floating-tooltip {
          opacity: 1;
          transform: translateX(0);
        }

        /* Glass Panel dividers */
        .glass-panel-divider {
          height: 1px;
          background: linear-gradient(to right, transparent, var(--border-muted) 20%, var(--border-muted) 80%, transparent);
          margin: 8px 12px;
        }
      `}</style>

      {/* Collapse Action Button */}
      <button 
        onClick={handleToggleCollapse} 
        className="absolute -right-3 top-7 w-6 h-6 bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-coral)] z-50 transition-all shadow-md focus:outline-none cursor-pointer"
      >
        <motion.svg 
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6"></polyline>
        </motion.svg>
      </button>

      {/* Brand area with glowing identity logo */}
      <div className="h-20 flex items-center justify-between px-5 flex-shrink-0 overflow-hidden">
        <div className="flex items-center gap-3.5 w-full">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--accent-coral)] to-[#ff9e9e] flex items-center justify-center flex-shrink-0 text-black shadow-lg shadow-coral-500/10 cursor-pointer"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </motion.div>
          
          {!collapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              <span className="font-heading font-extrabold text-sm tracking-tight text-[var(--text-primary)] leading-none">manager</span>
              <span className="font-mono text-[8px] text-[var(--text-tertiary)] tracking-widest mt-1.5 uppercase font-bold">Operative Core</span>
            </motion.div>
          )}
        </div>
      </div>

      <div className="glass-panel-divider" />

      {/* Main navigation scroller */}
      <nav className="flex-1 overflow-y-auto py-2 px-3 flex flex-col gap-1 select-none sidebar-nav-container">
        
        {/* PORTFOLIO SECTION */}
        {!collapsed && (
          <div className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-1.5 px-3 mt-2">
            Portfolio
          </div>
        )}
        
        {/* Loop standard items */}
        {navItems.map(item => (
          <div key={item.id} className="nav-btn-wrapper">
            <motion.button 
              onHoverStart={() => setHoveredTab(item.id)}
              onHoverEnd={() => setHoveredTab(null)}
              onClick={() => navigateTo(item.id)} 
              className={`w-full flex items-center px-3.5 py-2.5 rounded-lg text-left cursor-pointer transition-all relative overflow-hidden ${
                activeTab === item.id 
                  ? 'text-[var(--text-primary)] font-bold shadow-md bg-[var(--bg-tertiary)] border border-[var(--border-muted)]' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {/* Sliding dynamic background overlay */}
              {hoveredTab === item.id && activeTab !== item.id && (
                <motion.div 
                  layoutId="sidebar-hover-highlight"
                  className="absolute inset-0 bg-white/5 backdrop-blur-md rounded-lg -z-10"
                  transition={{ duration: 0.18 }}
                />
              )}

              {/* Glowing active indicator */}
              {activeTab === item.id && (
                <motion.div 
                  layoutId="sidebar-active-glow"
                  className="absolute left-0 w-[3px] h-[16px] bg-[var(--accent-coral)] rounded-full shadow-[0_0_8px_var(--accent-coral)]"
                />
              )}

              <div className={`transition-transform duration-250 ${activeTab === item.id ? 'scale-105 text-[var(--accent-coral)]' : ''}`}>
                {item.icon}
              </div>
              
              {!collapsed && <span className="text-xs font-body">{item.label}</span>}
            </motion.button>

            {collapsed && <span className="floating-tooltip">{item.label.toUpperCase()}</span>}
          </div>
        ))}

        {/* Finance Dropdown Group with Nested Line Trees */}
        <div className="nav-btn-wrapper flex-col items-stretch">
          <motion.button 
            onHoverStart={() => setHoveredTab('finance')}
            onHoverEnd={() => setHoveredTab(null)}
            onClick={handleToggleFinance} 
            className={`w-full flex items-center px-3.5 py-2.5 rounded-lg text-left cursor-pointer transition-all relative overflow-hidden ${
              ['ledger', 'invoices', 'reconciliation'].includes(activeTab)
                ? 'text-[var(--text-primary)] font-bold bg-[var(--bg-tertiary)] border border-[var(--border-muted)] shadow-md' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {hoveredTab === 'finance' && !['ledger', 'invoices', 'reconciliation'].includes(activeTab) && (
              <motion.div 
                layoutId="sidebar-hover-highlight"
                className="absolute inset-0 bg-white/5 backdrop-blur-md rounded-lg -z-10"
                transition={{ duration: 0.18 }}
              />
            )}

            {['ledger', 'invoices', 'reconciliation'].includes(activeTab) && (
              <motion.div 
                layoutId="sidebar-active-glow"
                className="absolute left-0 w-[3px] h-[16px] bg-[var(--accent-coral)] rounded-full shadow-[0_0_8px_var(--accent-coral)]"
              />
            )}

            <div className={`transition-transform duration-250 ${['ledger', 'invoices', 'reconciliation'].includes(activeTab) ? 'scale-105 text-[var(--accent-coral)]' : ''}`}>
              <svg className="w-4 h-4 mr-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            
            {!collapsed && (
              <div className="flex-grow flex justify-between items-center">
                <span className="text-xs font-body">Finance</span>
                <motion.svg 
                  animate={{ rotate: financeOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-3.5 h-3.5 text-[var(--text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </motion.svg>
              </div>
            )}
          </motion.button>
          
          {collapsed && <span className="floating-tooltip">FINANCIAL OPERATIONS</span>}

          <AnimatePresence>
            {financeOpen && !collapsed && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="tree-line-wrapper">
                  <div className="tree-vertical-thread" />
                  
                  {/* Ledger branch */}
                  <div className="tree-branch-wrapper">
                    <span className="tree-horizontal-branch" />
                    <button 
                      onClick={() => navigateTo('ledger')} 
                      className={`sub-nav-item ${activeTab === 'ledger' ? 'active' : ''}`}
                    >
                      <span>Ledger</span>
                    </button>
                  </div>

                  {/* Invoices branch */}
                  <div className="tree-branch-wrapper">
                    <span className="tree-horizontal-branch" />
                    <button 
                      onClick={() => navigateTo('invoices')} 
                      className={`sub-nav-item ${activeTab === 'invoices' ? 'active' : ''}`}
                    >
                      <span>Invoices</span>
                      <span className="badge-coral">3</span>
                    </button>
                  </div>

                  {/* Reconciliation branch */}
                  <div className="tree-branch-wrapper">
                    <span className="tree-horizontal-branch" />
                    <button 
                      onClick={() => navigateTo('reconciliation')} 
                      className={`sub-nav-item ${activeTab === 'reconciliation' ? 'active' : ''}`}
                    >
                      <span>Reconciliation</span>
                    </button>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* OPERATIONS SECTION */}
        {!collapsed && (
          <div className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-1.5 px-3 mt-4">
            Operations
          </div>
        )}

        {operationsItems.map(item => (
          <div key={item.id} className="nav-btn-wrapper">
            <motion.button 
              onHoverStart={() => setHoveredTab(item.id)}
              onHoverEnd={() => setHoveredTab(null)}
              onClick={() => navigateTo(item.id)} 
              className={`w-full flex items-center px-3.5 py-2.5 rounded-lg text-left cursor-pointer transition-all relative overflow-hidden ${
                activeTab === item.id 
                  ? 'text-[var(--text-primary)] font-bold shadow-md bg-[var(--bg-tertiary)] border border-[var(--border-muted)]' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {hoveredTab === item.id && activeTab !== item.id && (
                <motion.div 
                  layoutId="sidebar-hover-highlight"
                  className="absolute inset-0 bg-white/5 backdrop-blur-md rounded-lg -z-10"
                  transition={{ duration: 0.18 }}
                />
              )}

              {activeTab === item.id && (
                <motion.div 
                  layoutId="sidebar-active-glow"
                  className="absolute left-0 w-[3px] h-[16px] bg-[var(--accent-coral)] rounded-full shadow-[0_0_8px_var(--accent-coral)]"
                />
              )}

              <div className={`transition-transform duration-250 ${activeTab === item.id ? 'scale-105 text-[var(--accent-coral)]' : ''}`}>
                {item.icon}
              </div>
              
              {!collapsed && <span className="text-xs font-body">{item.label}</span>}
            </motion.button>

            {collapsed && <span className="floating-tooltip">{item.label.toUpperCase()}</span>}
          </div>
        ))}

        {/* INSIGHTS & CONFIG */}
        {!collapsed && (
          <div className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-1.5 px-3 mt-4">
            Insights & Config
          </div>
        )}

        {configItems.map(item => (
          <div key={item.id} className="nav-btn-wrapper">
            <motion.button 
              onHoverStart={() => setHoveredTab(item.id)}
              onHoverEnd={() => setHoveredTab(null)}
              onClick={() => navigateTo(item.id)} 
              className={`w-full flex items-center px-3.5 py-2.5 rounded-lg text-left cursor-pointer transition-all relative overflow-hidden ${
                activeTab === item.id 
                  ? 'text-[var(--text-primary)] font-bold shadow-md bg-[var(--bg-tertiary)] border border-[var(--border-muted)]' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {hoveredTab === item.id && activeTab !== item.id && (
                <motion.div 
                  layoutId="sidebar-hover-highlight"
                  className="absolute inset-0 bg-white/5 backdrop-blur-md rounded-lg -z-10"
                  transition={{ duration: 0.18 }}
                />
              )}

              {activeTab === item.id && (
                <motion.div 
                  layoutId="sidebar-active-glow"
                  className="absolute left-0 w-[3px] h-[16px] bg-[var(--accent-coral)] rounded-full shadow-[0_0_8px_var(--accent-coral)]"
                />
              )}

              <div className={`transition-transform duration-250 ${activeTab === item.id ? 'scale-105 text-[var(--accent-coral)]' : ''}`}>
                {item.icon}
              </div>
              
              {!collapsed && <span className="text-xs font-body">{item.label}</span>}
            </motion.button>

            {collapsed && <span className="floating-tooltip">{item.label.toUpperCase()}</span>}
          </div>
        ))}

      </nav>

      {/* Live System Telemetry Pulse Widget */}
      {!collapsed && (
        <div className="mx-4 mb-3.5 p-2 bg-zinc-950/45 border border-[var(--border-muted)] rounded-lg flex items-center justify-between shadow-inner font-mono text-[9px]">
          <div className="flex items-center gap-3">
            {/* Backend API Icon */}
            <div 
              className={`transition-colors duration-300 ${
                backendStatus === 'connected' ? 'text-emerald-500' :
                backendStatus === 'connecting' ? 'text-yellow-500 animate-pulse' : 'text-red-500'
              }`}
              style={backendStatus === 'connected' ? { filter: 'drop-shadow(0 0 3px rgba(16,185,129,0.75))' } : undefined}
              title={`API Link: ${backendStatus}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </div>

            {/* Database Link Icon */}
            <div 
              className={`transition-colors duration-300 ${
                databaseStatus === 'connected' ? 'text-emerald-500' :
                databaseStatus === 'connecting' ? 'text-yellow-500 animate-pulse' : 'text-red-500'
              }`}
              style={databaseStatus === 'connected' ? { filter: 'drop-shadow(0 0 3px rgba(16,185,129,0.75))' } : undefined}
              title={`Database: ${databaseStatus}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>

            {/* Realtime WS Icon */}
            <div 
              className={`transition-colors duration-300 ${
                realtimeStatus === 'connected' ? 'text-emerald-500' :
                realtimeStatus === 'connecting' ? 'text-yellow-500 animate-pulse' : 'text-red-500'
              }`}
              style={realtimeStatus === 'connected' ? { filter: 'drop-shadow(0 0 3px rgba(16,185,129,0.75))' } : undefined}
              title={`Realtime WS: ${realtimeStatus}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>

          {/* Refresh Action */}
          <button 
            onClick={checkConnections}
            disabled={isChecking}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-0.5 rounded focus:outline-none cursor-pointer"
            title="Refresh Connections"
          >
            <svg 
              className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-[var(--accent-coral)]' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth="3"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
            </svg>
          </button>
        </div>
      )}

      <div className="glass-panel-divider" />

      {/* Footer User Profile widget card */}
      <div className="p-3 border-t border-[var(--border-muted)] bg-zinc-950/15 flex flex-col gap-2 flex-shrink-0 relative rounded-b-[16px]">
        
        {!collapsed ? (
          <div className="flex flex-col gap-2.5">
            
            {/* Profile layout */}
            <div className="flex items-center gap-3 p-1.5 rounded-xl bg-zinc-950/20 border border-white/5 shadow-inner min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[var(--accent-coral)] to-[#ff9e9e] flex items-center justify-center text-black font-extrabold text-xs shadow-md">
                  {getInitials(user?.name)}
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[var(--bg-secondary)] rounded-full animate-pulse" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                  {user?.name || 'Sarah Jenkins'}
                </span>
                <span className="text-[9px] font-mono text-[var(--text-tertiary)] truncate leading-none mt-1">
                  {user?.email || 'landlord@trenor.com'}
                </span>
              </div>
            </div>

            {/* Sub footer commands */}
            <div className="flex items-center justify-between px-1.5">
              <button 
                onClick={() => alert('Coordinated dispatch system active. Support operational.')}
                className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] font-mono flex items-center gap-1 transition-colors cursor-pointer"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                <span>Support Desk</span>
              </button>

              <button 
                onClick={handleLogout}
                className="text-[10px] text-[var(--accent-coral)] hover:text-red-400 font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                <span>Logout</span>
              </button>
            </div>

          </div>
        ) : (
          /* Mini avatar in Collapsed view */
          <div className="relative flex justify-center py-1.5">
            <button 
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="relative focus:outline-none cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[var(--accent-coral)] to-[#ff9e9e] flex items-center justify-center text-black font-extrabold text-xs shadow-md group-hover:scale-105 transition-transform duration-250">
                {getInitials(user?.name)}
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[var(--bg-secondary)] rounded-full animate-pulse" />
            </button>
            
            {/* Quick Profile Dropup Menu in Collapsed Sidebar */}
            {userMenuOpen && (
              <div className="absolute bottom-14 left-2 z-50 w-52 bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded shadow-2xl p-3 flex flex-col gap-2.5 font-mono text-[10px] animate-in fade-in slide-in-from-bottom-2">
                <div className="border-b border-[var(--border-muted)] pb-2">
                  <div className="font-bold text-[var(--text-primary)] text-xs truncate">
                    {user?.name || 'Sarah Jenkins'}
                  </div>
                  <div className="text-[var(--text-tertiary)] truncate mt-0.5">
                    {user?.email || 'landlord@trenor.com'}
                  </div>
                </div>
                <button 
                  onClick={() => { setUserMenuOpen(false); alert('Help desk active.'); }}
                  className="text-left hover:text-[var(--text-primary)] transition-colors cursor-pointer py-0.5"
                >
                  ⚙ SUPPORT DESK
                </button>
                <button 
                  onClick={handleLogout}
                  className="text-left text-[var(--accent-coral)] font-bold transition-colors cursor-pointer py-0.5"
                >
                  ↪ LOGOUT ACCOUNT
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </motion.aside>
  );
}
