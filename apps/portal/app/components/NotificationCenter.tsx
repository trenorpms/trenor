import React, { useState } from 'react';
import { RealtimeNotification } from '../hooks/useRealtime';

interface NotificationCenterProps {
  notifications: RealtimeNotification[];
  connected: boolean;
  onClear: () => void;
}

export default function NotificationCenter({ notifications, connected, onClear }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block', fontFamily: 'monospace' }}>
      
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isOpen ? '#ff6b6b' : '#a39c92',
          transition: 'color 0.2s',
          position: 'relative',
          outline: 'none'
        }}
        title="Real-time Notifications"
      >
        {/* Bell SVG Icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>

        {/* Live Indicator Dot */}
        {notifications.length > 0 && (
          <span style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '6px',
            height: '6px',
            backgroundColor: '#ff6b6b',
            borderRadius: '50%',
            boxShadow: '0 0 6px #ff6b6b'
          }} />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Click outside backdrop */}
          <div 
            onClick={() => setIsOpen(false)} 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
          />

          <div style={{
            position: 'absolute',
            top: '32px',
            right: 0,
            width: '280px',
            backgroundColor: 'rgba(17, 22, 29, 0.95)',
            border: '1px solid #1a2027',
            borderRadius: '2px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(16px)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '360px'
          }}>
            
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              borderBottom: '1px solid #1a2027',
              backgroundColor: 'rgba(5, 8, 11, 0.5)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: connected ? '#10b981' : '#a39c92',
                  display: 'inline-block'
                }} />
                <span style={{ fontSize: '10px', color: '#f8f5ef', fontWeight: 'bold' }}>
                  {connected ? 'LIVE DISPATCH' : 'DISCONNECTED'}
                </span>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={() => {
                    onClear();
                    setIsOpen(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ff6b6b',
                    fontSize: '9px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    padding: 0
                  }}
                >
                  CLEAR
                </button>
              )}
            </div>

            {/* Notification List */}
            <div style={{
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column'
            }}>
              {notifications.length === 0 ? (
                <div style={{
                  padding: '24px 12px',
                  textAlign: 'center',
                  color: '#a39c92',
                  fontSize: '10px'
                }}>
                  NO ACTIVE EVENTS IN CURRENT SESSION
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid #1a2027',
                      transition: 'background-color 0.2s',
                      backgroundColor: 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: notif.type === 'success' ? '#10b981' : notif.type === 'warning' ? '#ff9f43' : notif.type === 'error' ? '#ff6b6b' : '#3498db'
                      }}>
                        {notif.title}
                      </span>
                      <span style={{ fontSize: '8px', color: '#a39c92' }}>
                        {notif.timestamp}
                      </span>
                    </div>
                    <p style={{
                      fontSize: '10px',
                      color: '#a39c92',
                      margin: '4px 0 0 0',
                      lineHeight: '1.4',
                      fontFamily: 'sans-serif'
                    }}>
                      {notif.message}
                    </p>
                  </div>
                ))
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
}
