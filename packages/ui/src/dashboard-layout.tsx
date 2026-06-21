'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ThemeSelector } from './theme-selector';
import { MenuIcon, ChevronLeftIcon, ChevronRightIcon, BellIcon, SearchIcon, LogOutIcon } from './icons';

export interface NavLink {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  navLinks: NavLink[];
  currentPath: string;
  userName: string;
  userRole: 'Landlord' | 'Tenant' | 'Contractor' | 'Moderator';
  onLogout?: () => void;
  notificationCenter?: React.ReactNode;
}

export function DashboardLayout({
  children,
  navLinks,
  currentPath,
  userName,
  userRole,
  onLogout,
  notificationCenter,
}: DashboardLayoutProps) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdSearch, setCmdSearch] = useState('');
  const cmdInputRef = useRef<HTMLInputElement>(null);

  // Command palette keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setCmdOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (cmdOpen && cmdInputRef.current) {
      setTimeout(() => cmdInputRef.current?.focus(), 100);
    }
  }, [cmdOpen]);

  const handleCommandSelect = (action: string) => {
    setCmdOpen(false);
    if (action === 'logout' && onLogout) {
      onLogout();
    } else if (action === 'theme') {
      const stored = localStorage.getItem('theme');
      const nextTheme = stored === 'light' ? 'dark' : stored === 'dark' ? 'system' : 'light';
      localStorage.setItem('theme', nextTheme);
      window.dispatchEvent(new Event('storage'));
    } else if (action.startsWith('nav:')) {
      const path = action.replace('nav:', '');
      window.location.href = path;
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-body)',
    }}>
      
      {/* SIDEBAR */}
      <aside style={{
        width: '240px',
        flexShrink: 0,
        borderRight: '1px solid var(--border-muted)',
        backgroundColor: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
      }} className="desktop-only">
        
        {/* Brand Header */}
        <div style={{
          height: '64px',
          borderBottom: '1px solid var(--border-muted)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          flexShrink: 0,
        }}>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '4px',
              backgroundColor: 'var(--accent-coral)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'var(--bg-primary)',
              boxShadow: '0 0 15px rgba(255, 107, 107, 0.3)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '14px', letterSpacing: '-0.2px', color: 'var(--text-primary)', lineHeight: '1.2' }}>Trenor</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '2px', marginTop: '2px' }}>V.2.4.1</span>
            </div>
          </a>
        </div>

        {/* Navigation Items */}
        <nav style={{
          flex: 1,
          padding: '24px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', padding: '0 12px' }}>
            Workspace
          </div>

          {navLinks.map((link) => {
            const isActive = currentPath === link.href;
            return (
              <a
                key={link.href}
                href={link.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '2px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  textDecoration: 'none',
                  transition: 'background 0.2s, color 0.2s',
                  marginBottom: '2px',
                }}
              >
                <span className="sidebar-icon" style={{
                  color: isActive ? 'var(--accent-coral)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'transform 0.2s, color 0.2s',
                }}>{link.icon}</span>
                <span>{link.label}</span>
              </a>
            );
          })}
        </nav>

        {/* Sidebar Telemetry Footer */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid var(--border-muted)',
          backgroundColor: 'var(--bg-primary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Network Edge</span>
            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="pulse-dot" style={{ width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span> 12ms
            </span>
          </div>
          
          <div style={{ height: '4px', width: '100%', backgroundColor: 'var(--bg-tertiary)', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', backgroundColor: 'var(--accent-coral)', width: '33%' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>
            <span>Storage: 4.2GB</span>
            <span>Max: 15GB</span>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '8px 12px',
                borderRadius: '2px',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-tertiary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.2s, color 0.2s',
                marginTop: '8px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(26, 32, 39, 0.5)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }}
            >
              <LogOutIcon width="14" height="14" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        paddingBottom: '60px',
      }}>
        {/* Desktop Topbar */}
        <header style={{
          height: '64px',
          borderBottom: '1px solid var(--border-muted)',
          background: 'var(--bg-primary)',
          opacity: 0.95,
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}>
          {/* Left: Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', userSelect: 'none' }}>
              <span className="breadcrumb-item" style={{ cursor: 'pointer', transition: 'color 0.2s' }}>Workspace</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              <span className="breadcrumb-item" style={{ cursor: 'pointer', transition: 'color 0.2s' }}>Portal</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {userRole === 'Tenant' ? 'Resident Console' : 'Portfolio'}
                <span style={{
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10b981',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '2px',
                  fontSize: '9px',
                  fontFamily: 'monospace',
                  boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
                }}>PROD</span>
              </span>
            </div>
          </div>

          {/* Middle: Command Palette Trigger */}
          <div className="hidden-on-mobile" style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => setCmdOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-muted)',
                borderRadius: '4px',
                padding: '6px 12px',
                width: '256px',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none',
              }}
              className="cmd-trigger-btn"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <span style={{ fontSize: '13px', fontFamily: 'sans-serif' }}>Omni Command...</span>
              </div>
              <div style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                color: 'var(--text-tertiary)',
                backgroundColor: 'var(--bg-tertiary)',
                padding: '2px 6px',
                borderRadius: '2px',
                border: '1px solid var(--border-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}>
                <kbd>⌘</kbd><kbd>K</kbd>
              </div>
            </button>
          </div>

          {/* Right: Theme, Notifications, Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Theme Selector */}
            <ThemeSelector />

            {/* Notifications slot */}
            {notificationCenter ? notificationCenter : (
              <button style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', position: 'relative' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              </button>
            )}

            {/* Avatar */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${userName}&backgroundColor=ff6b6b`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </header>

        {/* Dashboard Pages Main Slot */}
        <main className="bg-grid" style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
          position: 'relative',
        }}>
          {/* Ambient Glow */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            backgroundColor: 'rgba(255, 107, 107, 0.015)',
            filter: 'blur(120px)',
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 0
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            {children}
          </div>
        </main>
      </div>

      {/* COMMAND PALETTE MODAL */}
      {cmdOpen && (
        <>
          <div 
            onClick={() => setCmdOpen(false)} 
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(5, 8, 11, 0.8)',
              backdropFilter: 'blur(8px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingTop: '15vh'
            }}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '600px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-muted)',
                borderRadius: '6px',
                boxShadow: '0 30px 60px -15px rgba(0,0,0,0.8)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Input Area */}
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                borderBottom: '1px solid var(--border-muted)',
                backgroundColor: 'var(--bg-primary)'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-coral)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
                  <path d="M12 12 2.1 7.1"></path>
                  <path d="M12 12l9.9 4.9"></path>
                </svg>
                <input 
                  type="text" 
                  ref={cmdInputRef}
                  value={cmdSearch}
                  onChange={(e) => setCmdSearch(e.target.value)}
                  placeholder="Ask assistant to search tenants, navigate or perform tasks..." 
                  style={{
                    width: '100%',
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    padding: '16px 12px'
                  }}
                  autoComplete="off"
                />
                <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-tertiary)', border: '1px solid var(--border-muted)', padding: '2px 6px', borderRadius: '2px', backgroundColor: 'var(--bg-secondary)' }}>ESC</div>
              </div>

              {/* Options list */}
              <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: 'var(--bg-secondary)' }}>
                <div style={{ padding: '6px 12px', fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Navigation</div>

                <button 
                  onClick={() => handleCommandSelect('nav:/tenant')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                  className="cmd-item"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-muted)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>Go to Overview</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Navigation</div>
                    </div>
                  </div>
                </button>

                <button 
                  onClick={() => handleCommandSelect('theme')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                  className="cmd-item"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-muted)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>Cycle Theme</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>System Preference</div>
                    </div>
                  </div>
                </button>

                <button 
                  onClick={() => handleCommandSelect('logout')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                  className="cmd-item"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-muted)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                      <LogOutIcon width="12" height="12" />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>Sign Out</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Session Manager</div>
                    </div>
                  </div>
                </button>
              </div>

              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-muted)', backgroundColor: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <span><kbd style={{ border: '1px solid var(--border-muted)', padding: '1px 3px', borderRadius: '2px' }}>↑</kbd> <kbd style={{ border: '1px solid var(--border-muted)', padding: '1px 3px', borderRadius: '2px' }}>↓</kbd> to navigate</span>
                  <span><kbd style={{ border: '1px solid var(--border-muted)', padding: '1px 3px', borderRadius: '2px' }}>↵</kbd> to select</span>
                </div>
                <span>Workspace console v2.4</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Embedded CSS for hover transitions and dynamic layouts */}
      {/* @ts-ignore */}
      <style jsx global>{`
        .desktop-only {
          display: flex !important;
        }
        .mobile-only {
          display: none !important;
        }
        @media (max-width: 768px) {
          .desktop-only {
            display: none !important;
          }
          .mobile-only {
            display: flex !important;
          }
        }
        .hidden-on-mobile {
          display: flex !important;
        }
        @media (max-width: 992px) {
          .hidden-on-mobile {
            display: none !important;
          }
        }

        .pulse-dot {
          position: relative;
        }
        .pulse-dot::after {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          background-color: inherit;
          opacity: 0.4;
          animation: pulse-kf 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse-kf {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(2); opacity: 0; }
        }

        /* Nav Link Hover & Active Effects */
        .nav-link { position: relative; transition: all 0.2s ease; }
        .nav-link::before {
          content: ''; position: absolute; left: 0; top: 10%; bottom: 10%; width: 2px;
          background-color: #ff6b6b; border-radius: 0 4px 4px 0;
          transform: scaleY(0); transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .nav-link:hover { background-color: rgba(26, 32, 39, 0.5); color: #f8f5ef !important; }
        .nav-link:hover .sidebar-icon { transform: scale(1.1); color: #ff6b6b !important; }
        
        .nav-link.active { background-color: rgba(26, 32, 39, 0.8); color: #f8f5ef !important; }
        .nav-link.active::before { transform: scaleY(1); }
        .nav-link.active .sidebar-icon { color: #ff6b6b !important; }

        /* Command trigger button hover style */
        .cmd-trigger-btn:hover {
          border-color: rgba(255, 107, 107, 0.4) !important;
          box-shadow: 0 0 15px rgba(255, 107, 107, 0.15);
        }
        .cmd-trigger-btn:hover span {
          color: #f8f5ef;
        }

        /* Command list item hover style */
        .cmd-item:hover, .cmd-item:focus {
          background-color: #11161d !important;
        }

        /* Breadcrumb Hover */
        .breadcrumb-item:hover {
          color: #f8f5ef !important;
        }
      `}</style>
    </div>
  );
}
