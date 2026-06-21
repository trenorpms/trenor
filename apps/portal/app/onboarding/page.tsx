'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AgentSelection from '../landlord/components/AgentSelection';
import PropertyOnboarding from '../landlord/components/PropertyOnboarding';
import ToastContainer from '../components/ToastContainer';
import { useToast } from '../hooks/useToast';

export default function OnboardingPage() {
  const { toasts, addToast, removeToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Landlord wizard state
  const [landlordStep, setLandlordStep] = useState<'agent_select' | 'agent_intro' | 'property_setup'>('agent_select');
  const [tier, setTier] = useState<'free' | 'pro' | 'partner'>('partner');
  const [autoApproveLimit, setAutoApproveLimit] = useState(200);
  const [paymentSimulating, setPaymentSimulating] = useState(false);

  // Tenant wizard state
  const [tenantStep, setTenantStep] = useState<'invite_code' | 'billing_setup' | 'tenant_intro'>('invite_code');
  const [inviteCode, setInviteCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [linkingBank, setLinkingBank] = useState(false);
  const [verifiedInvite, setVerifiedInvite] = useState<{ propertyName: string; unit: string; totalAmount: number; managerName: string } | null>(null);

  // Load and validate user session
  useEffect(() => {
    const session = localStorage.getItem('user');
    if (!session || session === 'null' || session === 'undefined') {
      window.location.href = '/login';
      return;
    }

    try {
      const parsed = JSON.parse(session);
      
      fetch('http://localhost:4000/api/auth/validate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: parsed.email, id: parsed.id })
      })
      .then(res => {
        if (!res.ok) throw new Error('Session invalid');
        return res.json();
      })
      .then(data => {
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);

        // Check if already onboarded
        const onboarded = localStorage.getItem('onboarded');
        if (onboarded === 'true') {
          window.location.href = data.role?.toLowerCase() === 'tenant' ? '/tenant' : '/landlord';
          return;
        }

        setLoading(false);

        // Parse returning Stripe Session for Landlords
        const params = new URLSearchParams(window.location.search);
        if (params.get('stripe_success') === 'true') {
          setLandlordStep('agent_intro');
          const t = params.get('tier') as 'pro' | 'partner';
          if (t) setTier(t);
          addToast('Stripe billing linked successfully!', 'success');
        } else if (params.get('stripe_cancel') === 'true') {
          addToast('Billing link cancelled. Please retry.', 'warning');
        }
      })
      .catch(() => {
        localStorage.removeItem('user');
        localStorage.removeItem('onboarded');
        window.location.href = '/login';
      });
    } catch (e) {
      localStorage.removeItem('user');
      localStorage.removeItem('onboarded');
      window.location.href = '/login';
    }
  }, []);

  // Landlord payment redirect
  const handleSimulatePayment = async () => {
    setPaymentSimulating(true);
    addToast('Connecting to Stripe...', 'info');
    try {
      const response = await fetch('http://localhost:4000/api/onboarding/billing-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email || 'landlord@trenor.com',
          tier: tier,
          successUrl: `${window.location.origin}/onboarding?stripe_success=true&tier=${tier}`,
          cancelUrl: `${window.location.origin}/onboarding?stripe_cancel=true`,
        }),
      });
      const data = await response.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error(data.message || 'Billing failed');
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to initialize payment', 'error');
      setPaymentSimulating(false);
    }
  };

  // Landlord finish onboarding
  const handleFinishLandlord = (address: string, tenant: string, rentVal: string, additionalUnits: any[]) => {
    const newProperty = {
      id: Math.random().toString(36).substring(7),
      address,
      tenantName: tenant || 'Vacant',
      status: 'Due in 3 days',
      rent: rentVal,
      units: additionalUnits,
    };

    localStorage.setItem('properties', JSON.stringify([newProperty]));
    localStorage.setItem('onboarded', 'true');
    
    addToast('Property and autonomous agent set up successfully!', 'success');
    setTimeout(() => {
      window.location.href = '/landlord';
    }, 1500);
  };

  // Tenant invite verify
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode) return;

    setIsVerifying(true);
    addToast('Connecting to lease record...', 'info');
    try {
      const res = await fetch('http://localhost:4000/api/auth/invite/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Invalid invite code.');
      }

      setVerifiedInvite(data);
      setTenantStep('billing_setup');
      addToast('Lease node loaded!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Invalid code or connection failed.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Tenant Plaid/Bank link
  const handleLinkBank = (bankName: string) => {
    setSelectedBank(bankName);
    setLinkingBank(true);
    addToast(`Contacting ${bankName} verification port...`, 'info');
    setTimeout(() => {
      setLinkingBank(false);
      setTenantStep('tenant_intro');
      addToast('Primary payment portal linked!', 'success');
    }, 2000);
  };

  // Tenant finish onboarding
  const handleFinishTenant = async () => {
    setLoading(true);
    try {
      const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');
      const cleanCode = inviteCode.trim().toUpperCase();
      
      const res = await fetch('http://localhost:4000/api/auth/invite/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, userId: currentUser.id })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to link account to property.');
      }

      localStorage.setItem('onboarded', 'true');
      addToast('Resident account configured successfully!', 'success');
      setTimeout(() => {
        window.location.href = '/tenant';
      }, 1500);
    } catch (err: any) {
      addToast(err.message || 'Claim failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0c0d12', color: '#fff' }}>
        <span>Checking platform session...</span>
      </div>
    );
  }

  const isLandlord = user?.role?.toLowerCase() === 'landlord';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-primary, #0c0d12)',
      color: 'var(--text-primary, #f3f4f6)',
      fontFamily: 'var(--font-body, Inter, sans-serif)',
      padding: '24px',
    }}>
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div className="panel" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '32px',
        background: 'var(--bg-secondary, #13151a)',
        border: '1px solid var(--border-muted, #1f2937)',
        borderRadius: 'var(--radius-md, 8px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
      }}>
        {/* Step Indicators */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          {(isLandlord
            ? (['agent_select', 'agent_intro', 'property_setup'] as const)
            : (['invite_code', 'billing_setup', 'tenant_intro'] as const)
          ).map((s) => {
            const active = isLandlord ? landlordStep === s : tenantStep === s;
            return (
              <div
                key={s}
                style={{
                  height: '4px',
                  flex: 1,
                  borderRadius: '2px',
                  background: active ? 'var(--accent-coral)' : 'var(--border-muted)',
                  transition: 'background 0.3s',
                }}
              />
            );
          })}
        </div>

        {/* --- LANDLORD ONBOARDING FLOW --- */}
        {isLandlord && (
          <>
            {paymentSimulating && (
              <div style={{ textAlign: 'center', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid var(--border-muted)',
                  borderTopColor: 'var(--accent-coral)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Securing Stripe Billing Channel...</span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Redirecting to Stripe Sandbox checkout...</span>
              </div>
            )}

            {!paymentSimulating && landlordStep === 'agent_select' && (
              <AgentSelection
                tier={tier}
                setTier={setTier}
                autoApproveLimit={autoApproveLimit}
                setAutoApproveLimit={setAutoApproveLimit}
                onNext={async () => {
                  if (tier === 'free') {
                    setLandlordStep('agent_intro');
                  } else {
                    await handleSimulatePayment();
                  }
                }}
              />
            )}

            {landlordStep === 'agent_intro' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 700, margin: '0 0 4px 0', color: '#10b981' }}>
                    Companion Online
                  </h1>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Your autonomous property manager is now sandboxed and operational.
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <img 
                    src="/agent_intro.png" 
                    alt="Agent Online" 
                    style={{ width: '120px', height: 'auto', borderRadius: '6px' }} 
                  />
                </div>

                <div style={{
                  display: 'flex',
                  gap: '12px',
                  background: 'var(--bg-tertiary, #1a1c23)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: '1px solid var(--border-muted, #1f2937)',
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--accent-coral)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '14px',
                    flexShrink: 0,
                  }}>
                    🤖
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-coral)' }}>Partner Agent</span>
                    <p style={{ fontSize: '12px', margin: 0, lineHeight: 1.4, color: 'var(--text-primary)' }}>
                      "Hi! I will manage tenant communication, direct contractor orders below your auto-approval threshold of ${autoApproveLimit}, and maintain move-in ledgers. Let's record your properties!"
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setLandlordStep('property_setup')}
                  style={{
                    background: 'var(--accent-coral, #ff6f61)',
                    color: '#fff',
                    border: 'none',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm, 4px)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'center',
                  }}
                >
                  Configure My Properties
                </button>
              </div>
            )}

            {landlordStep === 'property_setup' && (
              <PropertyOnboarding onFinish={handleFinishLandlord} />
            )}
          </>
        )}

        {/* --- TENANT ONBOARDING FLOW --- */}
        {!isLandlord && (
          <>
            {tenantStep === 'invite_code' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0' }}>
                    Connect to My Rental
                  </h1>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Enter the lease invite code provided by your landlord.
                  </p>
                </div>

                <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                      Invite Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TR-9912"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        background: 'var(--bg-tertiary, #1a1c23)',
                        border: '1px solid var(--border-muted, #1f2937)',
                        padding: '10px 12px',
                        color: 'var(--text-primary)',
                        borderRadius: 'var(--radius-sm, 4px)',
                        fontSize: '14px',
                        fontWeight: 600,
                        textAlign: 'center',
                        letterSpacing: '1px',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifying}
                    style={{
                      background: 'var(--accent-coral, #ff6f61)',
                      color: '#fff',
                      border: 'none',
                      padding: '10px',
                      borderRadius: 'var(--radius-sm, 4px)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    {isVerifying ? 'Verifying Invite Code...' : 'Connect'}
                  </button>
                </form>
              </div>
            )}

            {tenantStep === 'billing_setup' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>
                    Configure Rent Payments
                  </h1>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Link a banking portal for automated monthly rent routing.
                  </p>
                </div>

                {linkingBank ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      border: '3px solid var(--border-muted)',
                      borderTopColor: 'var(--accent-coral)',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }} />
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>Connecting to {selectedBank}...</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {['Chase Bank', 'Bank of America', 'Wells Fargo', 'Capital One'].map((bank) => (
                      <button
                        key={bank}
                        onClick={() => handleLinkBank(bank)}
                        style={{
                          background: 'var(--bg-tertiary, #1a1c23)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-muted, #1f2937)',
                          padding: '12px',
                          borderRadius: 'var(--radius-sm, 4px)',
                          fontSize: '13px',
                          fontWeight: 600,
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        {bank}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tenantStep === 'tenant_intro' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700, color: '#10b981', margin: '0 0 4px 0' }}>
                    Connection Successful
                  </h1>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Your resident profile is active at {verifiedInvite?.propertyName || '123 Pine St'}, Unit {verifiedInvite?.unit || '4B'}.
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '12px',
                  background: 'var(--bg-tertiary, #1a1c23)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: '1px solid var(--border-muted, #1f2937)',
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '14px',
                    flexShrink: 0,
                  }}>
                    🤖
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>Trenor Assistant</span>
                    <p style={{ fontSize: '12px', margin: 0, lineHeight: 1.4, color: 'var(--text-primary)' }}>
                      "Hi! I am the automated manager for Unit {verifiedInvite?.unit || '4B'}. Your rent is ${verifiedInvite?.totalAmount || '2,400'} due on the 1st of each month. I can help you file maintenance requests and answer household questions anytime."
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleFinishTenant}
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm, 4px)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'center',
                  }}
                >
                  Enter Resident Portal
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
