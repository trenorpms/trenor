'use client';

import React, { useEffect } from 'react';

export default function EntryPage() {
  useEffect(() => {
    const session = localStorage.getItem('user');
    if (!session || session === 'null' || session === 'undefined') {
      window.location.href = '/login';
      return;
    }

    const user = JSON.parse(session);
    const onboarded = localStorage.getItem('onboarded');

    if (onboarded !== 'true') {
      window.location.href = '/onboarding';
    } else {
      window.location.href = user.role === 'tenant' ? '/tenant' : '/landlord';
    }
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-primary, #0c0d12)',
      color: 'var(--text-primary, #f3f4f6)',
      fontFamily: 'var(--font-body, Inter, sans-serif)',
    }}>
      <span>Resolving credentials...</span>
    </div>
  );
}
