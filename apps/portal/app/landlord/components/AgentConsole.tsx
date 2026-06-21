'use client';

import React from 'react';

interface AgentActivity {
  id: number;
  message: string;
  type: string;
  time: string;
}

interface AgentConsoleProps {
  activities: AgentActivity[];
  autoApproveLimit: number;
  setAutoApproveLimit: (limit: number) => void;
}

export default function AgentConsole({
  activities,
  autoApproveLimit,
  setAutoApproveLimit,
}: AgentConsoleProps) {
  return (
    <div className="panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--accent-coral, #ff6f61)',
            boxShadow: '0 0 8px var(--accent-coral)',
            animation: 'pulse 2s infinite',
          }} />
          Live Agent Console
        </h2>
        <span style={{ fontSize: '10px', background: 'var(--bg-tertiary, #1a1c23)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-muted, #1f2937)' }}>
          Active Session
        </span>
      </div>

      <div style={{
        flex: 1,
        background: 'var(--bg-tertiary, #1a1c23)',
        borderRadius: 'var(--radius-sm, 4px)',
        padding: '12px',
        minHeight: '220px',
        maxHeight: '280px',
        overflowY: 'auto',
        border: '1px solid var(--border-muted, #1f2937)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: 'monospace',
        fontSize: '11px',
      }}>
        {activities.map((act) => (
          <div key={act.id} style={{
            borderBottom: '1px solid var(--border-muted, #1f2937)',
            paddingBottom: '8px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary, #6b7280)', marginBottom: '4px' }}>
              <span>[AGENT TASK ENGINE]</span>
              <span>{act.time}</span>
            </div>
            <p style={{ margin: 0, color: 'var(--text-primary, #f3f4f6)', lineHeight: 1.4 }}>{act.message}</p>
          </div>
        ))}
      </div>

      {/* Adjustments */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
          <span>Auto-Approve Threshold limit</span>
          <span style={{ color: 'var(--accent-coral, #ff6f61)', fontWeight: 600 }}>${autoApproveLimit}</span>
        </div>
        <input
          type="range"
          min="0"
          max="1000"
          step="50"
          value={autoApproveLimit}
          onChange={(e) => setAutoApproveLimit(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--accent-coral, #ff6f61)' }}
        />
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 0.6; box-shadow: 0 0 0 0 rgba(255, 111, 97, 0.4); }
          70% { opacity: 1; box-shadow: 0 0 0 8px rgba(255, 111, 97, 0); }
          100% { opacity: 0.6; box-shadow: 0 0 0 0 rgba(255, 111, 97, 0); }
        }
      `}</style>
    </div>
  );
}
