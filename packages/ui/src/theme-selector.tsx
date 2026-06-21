'use client';

import React, { useEffect, useState } from 'react';
import { SunIcon, MoonIcon, MonitorIcon } from './icons';

type Theme = 'light' | 'dark' | 'system';

export function ThemeSelector() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (t: Theme) => {
      if (t === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', isDark ? 'dark' : 'light');
      } else {
        root.setAttribute('data-theme', t);
      }
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  const getTranslateX = () => {
    if (theme === 'light') return '0%';
    if (theme === 'dark') return '100%';
    return '200%';
  };

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      backgroundColor: 'var(--bg-primary)',
      border: '1px solid var(--border-muted)',
      borderRadius: '4px',
      padding: '2px'
    }}>
      {/* Sliding background indicator pill */}
      <div style={{
        position: 'absolute',
        top: '2px',
        bottom: '2px',
        left: '2px',
        width: 'calc(33.333% - 2.6px)',
        backgroundColor: 'var(--bg-tertiary)',
        border: '1px solid var(--border-strong)',
        borderRadius: '3px',
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: `translateX(${getTranslateX()})`,
        zIndex: 0,
      }} />

      {/* Light Toggle */}
      <button
        onClick={() => setTheme('light')}
        style={{
          position: 'relative',
          zIndex: 10,
          width: '28px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: theme === 'light' ? 'var(--text-primary)' : 'var(--text-tertiary)',
          transition: 'color 0.2s',
          outline: 'none',
        }}
        title="Light Mode"
      >
        <SunIcon width="12" height="12" />
      </button>

      {/* Dark Toggle */}
      <button
        onClick={() => setTheme('dark')}
        style={{
          position: 'relative',
          zIndex: 10,
          width: '28px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: theme === 'dark' ? 'var(--text-primary)' : 'var(--text-tertiary)',
          transition: 'color 0.2s',
          outline: 'none',
        }}
        title="Dark Mode"
      >
        <MoonIcon width="12" height="12" />
      </button>

      {/* System Toggle */}
      <button
        onClick={() => setTheme('system')}
        style={{
          position: 'relative',
          zIndex: 10,
          width: '28px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: theme === 'system' ? 'var(--text-primary)' : 'var(--text-tertiary)',
          transition: 'color 0.2s',
          outline: 'none',
        }}
        title="System Preference"
      >
        <MonitorIcon width="12" height="12" />
      </button>
    </div>
  );
}
