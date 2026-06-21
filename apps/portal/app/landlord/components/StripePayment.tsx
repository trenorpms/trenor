'use client';

import React from 'react';

interface StripePaymentProps {
  tier: 'free' | 'pro' | 'partner';
  paymentSimulating: boolean;
  onSimulatePayment: () => void;
}

export default function StripePayment({
  tier,
  paymentSimulating,
  onSimulatePayment,
}: StripePaymentProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
          Secure Payment Setup
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Complete setup to activate the agent. This links a card in Stripe's sandbox environment.
        </p>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, var(--bg-tertiary, #1a1c23) 0%, #15171e 100%)',
        borderRadius: 'var(--radius-md, 8px)',
        padding: '24px',
        border: '1px solid var(--border-strong, #374151)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, color: 'var(--accent-coral, #ff6f61)' }}>
          <span>TRENOR AGENT CARD</span>
          <span style={{
            fontSize: '9px',
            background: 'rgba(255,111,97,0.1)',
            padding: '2px 8px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            color: 'var(--accent-coral)',
          }}>
            {tier} Tier
          </span>
        </div>
        <div style={{ fontSize: '18px', letterSpacing: '2px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
          ••••  ••••  ••••  4242
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
          <span>SARAH JENKINS</span>
          <span>12/28</span>
        </div>
      </div>

      <button
        onClick={onSimulatePayment}
        disabled={paymentSimulating}
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
          opacity: paymentSimulating ? 0.7 : 1,
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#ff8577'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent-coral)'}
      >
        {paymentSimulating ? 'Redirecting to Stripe...' : 'Link Card via Stripe Checkout'}
      </button>
    </div>
  );
}
