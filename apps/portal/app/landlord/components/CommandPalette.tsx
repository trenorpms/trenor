'use client';

import React from 'react';

interface CommandPaletteProps {
  setCmdOpen: (open: boolean) => void;
  router: any;
  handleLogout: () => void;
}

export default function CommandPalette({
  setCmdOpen,
  router,
  handleLogout,
}: CommandPaletteProps) {
  return (
    <>
      <div 
        onClick={() => setCmdOpen(false)} 
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(var(--backdrop-color, 5, 8, 11), 0.8)',
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
            boxShadow: 'var(--shadow-lg, 0 30px 60px -15px rgba(0,0,0,0.8))',
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
              autoFocus
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
            <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', border: '1px solid var(--border-muted)', padding: '2px 6px', borderRadius: '2px', backgroundColor: 'var(--bg-secondary)' }}>ESC</div>
          </div>

          {/* Options list */}
          <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: 'var(--bg-secondary)' }}>
            <div style={{ padding: '6px 12px', fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Actions</div>

            <button 
              onClick={() => {
                setCmdOpen(false);
                router.push('/landlord?tab=agent');
              }}
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>Draft Arrears Invoices</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Agent Workspace Action</div>
                </div>
              </div>
            </button>

            <button 
              onClick={() => {
                setCmdOpen(false);
                router.push('/landlord?tab=tenants');
              }}
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>Go to Tenants Directory</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Navigation</div>
                </div>
              </div>
            </button>

            <button 
              onClick={() => {
                setCmdOpen(false);
                handleLogout();
              }}
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>Sign Out</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Session Manager</div>
                </div>
              </div>
            </button>
          </div>

          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-muted)', backgroundColor: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span><kbd style={{ border: '1px solid var(--border-muted)', padding: '1px 3px', borderRadius: '2px' }}>↑</kbd> <kbd style={{ border: '1px solid var(--border-muted)', padding: '1px 3px', borderRadius: '2px' }}>↓</kbd> to navigate</span>
              <span><kbd style={{ border: '1px solid var(--border-muted)', padding: '1px 3px', borderRadius: '2px' }}>↵</kbd> to select</span>
            </div>
            <span>Manager Dashboard v2.4</span>
          </div>
        </div>
      </div>
    </>
  );
}
