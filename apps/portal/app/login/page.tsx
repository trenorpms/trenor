'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {

      const response = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store auth session
      localStorage.setItem('user', JSON.stringify(data));
      document.cookie = `user=${encodeURIComponent(JSON.stringify(data))}; path=/; max-age=86400`;

      // Redirect based on role
      if (data.role?.toLowerCase() === 'landlord') {
        window.location.href = '/landlord';
      } else if (data.role?.toLowerCase() === 'tenant') {
        window.location.href = '/tenant';
      } else {
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (role: 'landlord' | 'tenant') => {
    if (role === 'landlord') {
      setEmail('landlord@trenor.com');
      setPassword('password123');
    } else {
      setEmail('tenant@trenor.com');
      setPassword('password123');
    }
  };

  const glowStyle: React.CSSProperties = {
    position: 'fixed',
    left: mousePos.x,
    top: mousePos.y,
    width: '600px',
    height: '600px',
    background: 'radial-gradient(circle, rgba(255, 111, 97, 0.04) 0%, transparent 70%)',
    pointerEvents: 'none',
    transform: 'translate(-50%, -50%)',
    transition: 'width 0.3s, height 0.3s',
    zIndex: 1,
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg-primary, #0c0d12)',
        color: 'var(--text-primary, #f3f4f6)',
        fontFamily: 'var(--font-body, Inter, sans-serif)',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={glowStyle} className="hidden-on-mobile" />
      <div className="bg-grid" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      <div 
        className="auth-card-grid"
        style={{
          maxWidth: '1000px',
          width: '100%',
          background: 'var(--bg-secondary, #13151a)',
          border: '1px solid var(--border-muted, #1f2937)',
          borderRadius: 'var(--radius-md, 8px)',
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Left Side: Value Proposition Panel */}
        <div 
          className="hidden-on-mobile"
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '48px',
            borderRight: '1px solid var(--border-muted, #1f2937)',
            overflow: 'hidden',
          }}
        >
          {/* Background image & overlays */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url("/auth_real_estate.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
          }} />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(10, 10, 12, 0.95) 0%, rgba(10, 10, 12, 0.7) 60%, rgba(10, 10, 12, 0.4) 100%)',
            zIndex: 1,
          }} />

          {/* Wordmark Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 2 }}>
            <img src="/logo.png" alt="Trenor Logo" style={{ width: '28px', height: '28px' }} />
            <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px', color: '#fff' }}>Trenor</span>
          </div>

          {/* Proposition list */}
          <div style={{ position: 'relative', zIndex: 2, marginTop: 'auto' }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 8px',
              background: 'rgba(255, 111, 97, 0.15)',
              border: '1px solid rgba(255, 111, 97, 0.3)',
              color: 'var(--accent-coral)',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              borderRadius: '2px',
              marginBottom: '16px',
            }}>
              Autonomous Rental Systems
            </span>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#fff', letterSpacing: '-0.5px', marginBottom: '16px', lineHeight: 1.3 }}>
              Your properties. Completely autonomous.
            </h1>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#d1d5db' }}>
                <span style={{ color: 'var(--accent-coral)', fontWeight: 'bold' }}>✓</span>
                <span><strong style={{ color: '#fff' }}>Rent ledger automation.</strong> Self-reconciling banking ports.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#d1d5db' }}>
                <span style={{ color: 'var(--accent-coral)', fontWeight: 'bold' }}>✓</span>
                <span><strong style={{ color: '#fff' }}>24/7 Maintenance Support.</strong> Swift handling of maintenance complaints and work orders.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#d1d5db' }}>
                <span style={{ color: 'var(--accent-coral)', fontWeight: 'bold' }}>✓</span>
                <span><strong style={{ color: '#fff' }}>Instant setup.</strong> Import spreadsheet lists or invite tenants directly.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          
          {/* Logo visible on Mobile only */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }} className="mobile-logo-container">
            <style jsx>{`
              @media (min-width: 769px) {
                .mobile-logo-container { display: none !important; }
              }
            `}</style>
            <img src="/logo.png" alt="Trenor Logo" style={{ width: '28px', height: '28px' }} />
            <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px' }}>Trenor</span>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.5px', margin: '0 0 8px 0' }}>Welcome back</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sign in to manage properties and review rental operations.</p>
          </div>

          {error && (
            <div style={{
              background: 'rgba(255, 111, 97, 0.05)',
              border: '1px solid var(--accent-coral)',
              padding: '12px',
              borderRadius: 'var(--radius-sm, 3px)',
              color: 'var(--accent-coral)',
              fontSize: '12px',
              fontWeight: 500,
              lineHeight: 1.4,
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>Email Address</label>
              <input 
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-text"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', flexGrow: 1 }}>Password</label>
                <a href="#" style={{ fontSize: '11px', color: 'var(--accent-coral)', textDecoration: 'none' }}>Forgot?</a>
              </div>
              <input 
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-text"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="button-primary"
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '11px' }}
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Don't have an account?</span>{' '}
            <Link href="/signup" style={{ color: 'var(--accent-coral)', fontWeight: 600, textDecoration: 'underline' }}>
              Sign up
            </Link>
          </div>

          {/* Quick Fills */}
          <div style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-muted, #1f2937)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)', textAlign: 'center', letterSpacing: '0.5px' }}>
              DEVELOPER DEMO QUICK FILL
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => quickFill('landlord')}
                className="button-secondary"
                style={{ flex: 1, fontSize: '11px', padding: '6px' }}
              >
                Sarah (Landlord)
              </button>
              <button
                type="button"
                onClick={() => quickFill('tenant')}
                className="button-secondary"
                style={{ flex: 1, fontSize: '11px', padding: '6px' }}
              >
                Alice (Tenant)
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
