'use client';

import React, { useEffect } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

export default function Toast({ toast, onClose }: ToastProps) {
  const { id, message, type, duration = 4000 } = toast;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getTheme = () => {
    switch (type) {
      case 'success':
        return {
          border: '1px solid rgba(16, 185, 129, 0.3)',
          background: 'rgba(16, 185, 129, 0.1)',
          color: '#10b981',
          icon: '✓',
        };
      case 'error':
        return {
          border: '1px solid rgba(239, 68, 68, 0.3)',
          background: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--accent-coral, #ff6f61)',
          icon: '✕',
        };
      case 'warning':
        return {
          border: '1px solid rgba(245, 158, 11, 0.3)',
          background: 'rgba(245, 158, 11, 0.1)',
          color: '#f59e0b',
          icon: '⚠',
        };
      case 'info':
      default:
        return {
          border: '1px solid rgba(59, 130, 246, 0.3)',
          background: 'rgba(59, 130, 246, 0.1)',
          color: '#3b82f6',
          icon: 'ℹ',
        };
    }
  };

  const theme = getTheme();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      borderRadius: 'var(--radius-sm, 4px)',
      background: 'var(--bg-secondary, #13151a)',
      border: theme.border,
      boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
      backdropFilter: 'blur(8px)',
      animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      maxWidth: '320px',
      width: '100%',
      pointerEvents: 'auto',
    }}>
      <span style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: theme.background,
        color: theme.color,
        fontSize: '11px',
        fontWeight: 700,
        flexShrink: 0,
      }}>
        {theme.icon}
      </span>
      <span style={{
        fontSize: '12px',
        color: 'var(--text-primary, #f3f4f6)',
        lineHeight: 1.4,
        flexGrow: 1,
      }}>
        {message}
      </span>
      <button
        onClick={() => onClose(id)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-tertiary, #6b7280)',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 600,
          padding: '0 4px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        ×
      </button>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
