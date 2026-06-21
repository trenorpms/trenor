'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [landlordId, setLandlordId] = useState('');
  
  // Registration form state
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Missing token parameter in the invitation URL.');
      setLoading(false);
      return;
    }

    // Validate invite token
    fetch('http://localhost:4000/api/auth/validate-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error(data.message || 'Invitation is invalid or has expired.');
          });
        }
        return res.json();
      })
      .then((data) => {
        setEmail(data.email);
        setLandlordId(data.landlordId);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !password) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:4000/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name,
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Save user session
      localStorage.setItem('user', JSON.stringify(data));
      // Write user to cookies for cross-port single-sign-on
      document.cookie = `user=${encodeURIComponent(JSON.stringify(data))}; path=/; max-age=86400`;

      setSuccess(true);
      
      // Redirect to dashboard after a delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to complete registration');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.loadingText}>VERIFYING INVITATION PASSKEY...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.card}>
        <div style={styles.errorHeader}>Access Denied</div>
        <p style={styles.errorBody}>{error}</p>
        <button onClick={() => window.location.href = '/'} style={styles.btnSecondary}>
          Return to Portal
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div style={styles.card}>
        <div style={styles.successHeader}>Invitation Accepted!</div>
        <p style={styles.successBody}>Your property manager account has been activated. Entering dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h2 style={styles.title}>Activate Manager Account</h2>
        <p style={styles.subtitle}>You have been authorized to manage properties. Complete your credentials to join.</p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Email Address</label>
          <input
            type="email"
            disabled
            value={email}
            style={{ ...styles.input, opacity: 0.6, cursor: 'not-allowed' }}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Your Name</label>
          <input
            type="text"
            required
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Choose Password</label>
          <input
            type="password"
            required
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
        </div>

        <button type="submit" disabled={submitting} style={styles.btnPrimary}>
          {submitting ? 'Activating Account...' : 'Join Portfolio Team'}
        </button>
      </form>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div style={styles.container}>
      <Suspense fallback={
        <div style={styles.card}>
          <div style={styles.loadingText}>LOADING PASSPORT VERIFICATION...</div>
        </div>
      }>
        <AcceptInviteForm />
      </Suspense>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#05080b',
    fontFamily: 'Inter, -apple-system, sans-serif',
    padding: '24px',
  },
  card: {
    maxWidth: '450px',
    width: '100%',
    backgroundColor: '#0a0f14',
    border: '1px solid #1a2027',
    borderRadius: '4px',
    padding: '40px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  loadingText: {
    color: '#a39c92',
    fontSize: '12px',
    fontFamily: 'monospace',
    textAlign: 'center' as const,
  },
  errorHeader: {
    color: '#ff6b6b',
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '12px',
  },
  errorBody: {
    color: '#c5bfb5',
    fontSize: '13px',
    lineHeight: 1.5,
    marginBottom: '24px',
  },
  successHeader: {
    color: '#10b981',
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '12px',
    textAlign: 'center' as const,
  },
  successBody: {
    color: '#c5bfb5',
    fontSize: '13px',
    textAlign: 'center' as const,
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#f8f5ef',
    margin: '0 0 6px 0',
  },
  subtitle: {
    fontSize: '12px',
    color: '#c5bfb5',
    margin: 0,
    lineHeight: 1.4,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '18px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#a39c92',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  input: {
    backgroundColor: '#05080b',
    border: '1px solid #1a2027',
    color: '#f8f5ef',
    padding: '10px 14px',
    borderRadius: '4px',
    fontSize: '13px',
    outline: 'none',
  },
  btnPrimary: {
    backgroundColor: '#ff6b6b',
    color: '#05080b',
    border: 'none',
    padding: '12px',
    borderRadius: '4px',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    marginTop: '6px',
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    border: '1px solid #1a2027',
    color: '#f8f5ef',
    padding: '10px 16px',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer',
    width: '100%',
  },
};
