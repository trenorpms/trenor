'use client';

import React from 'react';

interface AgentSelectionProps {
  tier: 'free' | 'pro' | 'partner';
  setTier: (tier: 'free' | 'pro' | 'partner') => void;
  autoApproveLimit: number;
  setAutoApproveLimit: (limit: number) => void;
  onNext: () => void;
}

export default function AgentSelection({
  tier,
  setTier,
  autoApproveLimit,
  setAutoApproveLimit,
  onNext,
}: AgentSelectionProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
          Choose your companion
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Select the AI agent tier that will look after your property, tenants, and workflows.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
        <img 
          src="/agent_selection.png" 
          alt="Agent Selection" 
          style={{ width: '120px', height: 'auto', borderRadius: '6px' }} 
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Free Tier */}
        <div
          onClick={() => setTier('free')}
          style={{
            padding: '12px',
            borderRadius: 'var(--radius-sm, 4px)',
            background: tier === 'free' ? 'rgba(255, 111, 97, 0.04)' : 'var(--bg-tertiary, #1a1c23)',
            border: tier === 'free' ? '1px solid var(--accent-coral, #ff6f61)' : '1px solid var(--border-muted, #1f2937)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
            <span>Standard Assistant</span>
            <span>Free</span>
          </div>
          <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
            Drafts maintenance and tenant alerts. Requires your explicit manual authorization for every message sent.
          </p>
        </div>

        {/* Pro Tier */}
        <div
          onClick={() => setTier('pro')}
          style={{
            padding: '12px',
            borderRadius: 'var(--radius-sm, 4px)',
            background: tier === 'pro' ? 'rgba(255, 111, 97, 0.04)' : 'var(--bg-tertiary, #1a1c23)',
            border: tier === 'pro' ? '1px solid var(--accent-coral, #ff6f61)' : '1px solid var(--border-muted, #1f2937)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
            <span>Professional Agent</span>
            <span>$29/mo</span>
          </div>
          <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
            Directly reviews tenant tickets, automatically coordinates plumber rates, and handles standard reminders.
          </p>
        </div>

        {/* Partner Tier */}
        <div
          onClick={() => setTier('partner')}
          style={{
            padding: '12px',
            borderRadius: 'var(--radius-sm, 4px)',
            background: tier === 'partner' ? 'rgba(255, 111, 97, 0.04)' : 'var(--bg-tertiary, #1a1c23)',
            border: tier === 'partner' ? '1px solid var(--accent-coral, #ff6f61)' : '1px solid var(--border-muted, #1f2937)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
            <span>Fully Autonomous Partner</span>
            <span>$79/mo</span>
          </div>
          <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
            Operates independently. Manages service providers up to approval limits, processes payouts, parses leases, and handles automated ledgers.
          </p>
        </div>
      </div>

      {/* Auto Approve Limit Slider */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <span>Auto-Approval Threshold</span>
          <span style={{ fontWeight: 600, color: 'var(--accent-coral, #ff6f61)' }}>${autoApproveLimit}</span>
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
        <span style={{ fontSize: '10px', color: 'var(--text-tertiary, #6b7280)' }}>
          The agent will auto-book repairs under this value. Requests above this require your click.
        </span>
      </div>

      <button
        onClick={onNext}
        style={{
          background: 'var(--accent-coral, #ff6f61)',
          color: '#fff',
          border: 'none',
          padding: '11px',
          borderRadius: 'var(--radius-sm, 4px)',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          width: '100%',
          textAlign: 'center',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#ff8577'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent-coral)'}
      >
        Set Up Billing & Continue
      </button>
    </div>
  );
}
