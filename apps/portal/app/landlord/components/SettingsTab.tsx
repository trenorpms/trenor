'use client';

import React from 'react';

interface SettingsTabProps {
  autoApproveLimit: number;
  setAutoApproveLimit: (limit: number) => void;
}

export default function SettingsTab({ autoApproveLimit, setAutoApproveLimit }: SettingsTabProps) {
  return (
    <div className="card-border" style={{ borderRadius: '2px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Autonomy Threshold Limits</h2>
      <div>
        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Maximum Auto-Approve Contractor Spend Limit</label>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <input
            type="range"
            min="0"
            max="1000"
            step="50"
            value={autoApproveLimit}
            onChange={e => setAutoApproveLimit(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent-coral)' }}
          />
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-coral)', fontFamily: 'var(--font-mono)' }}>${autoApproveLimit}</span>
        </div>
      </div>
    </div>
  );
}
