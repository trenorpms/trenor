'use client';

import React, { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('data-theme') || 'dark';
    setTheme(savedTheme as 'dark' | 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('data-theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 border border-[var(--border-muted)] hover:border-[var(--accent-coral)] bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-all cursor-pointer text-xs flex items-center gap-1.5 focus:outline-none"
      title="Toggle Dark/Light Mode"
      id="theme-toggle-btn"
    >
      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}
