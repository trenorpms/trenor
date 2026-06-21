'use client';

import React, { useState, useMemo } from 'react';

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  unit: string;
  propertyId?: string;
  propertyName?: string;
  property: string;
  rent: string;
  arrears: number;
  status: string;
}

interface Property {
  id: string;
  address: string;
  name?: string;
  tenantName?: string;
  status: string;
  rent?: string;
  unitsCount?: number;
  arrears?: number;
}

interface TenantsTabProps {
  tenants: Tenant[];
  properties: Property[];
  user: any;
  router: any;
}

export default function TenantsTab({ tenants, properties = [], user, router }: TenantsTabProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  
  // Input fields
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState<number>(0);
  const [utilityFee, setUtilityFee] = useState<number>(25);

  // Result state
  const [generatedCode, setGeneratedCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Get properties list
  const propertyOptions = useMemo(() => {
    return properties;
  }, [properties]);

  // 2. Get vacant units for selected property
  const vacantUnits = useMemo(() => {
    if (!selectedPropertyId) return [];
    
    // Find vacant unit records for this property.
    // Vacant unit has empty/null occupant name OR status is Vacant.
    return tenants.filter(t => {
      const propIdMatch = t.propertyId === selectedPropertyId || t.property === properties.find(p => p.id === selectedPropertyId)?.name;
      const isVacant = !t.name || t.name.trim() === '' || t.status?.toLowerCase() === 'vacant';
      return propIdMatch && isVacant;
    });
  }, [selectedPropertyId, tenants, properties]);

  // 3. Find selected unit rent and calculate invoice preview
  const selectedUnit = useMemo(() => {
    return vacantUnits.find(u => u.id === selectedUnitId);
  }, [selectedUnitId, vacantUnits]);

  const rentAmount = useMemo(() => {
    if (!selectedUnit) return 0;
    const cleaned = selectedUnit.rent.replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  }, [selectedUnit]);

  // Auto-set security deposit when rent changes
  React.useEffect(() => {
    if (rentAmount > 0) {
      setSecurityDeposit(rentAmount);
    }
  }, [rentAmount]);

  const totalDue = useMemo(() => {
    return rentAmount + (Number(securityDeposit) || 0) + (Number(utilityFee) || 0);
  }, [rentAmount, securityDeposit, utilityFee]);

  // Handle invitation generation
  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyId || !selectedUnitId || !tenantName.trim() || !tenantEmail.trim()) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const selectedProp = properties.find(p => p.id === selectedPropertyId);
      const propName = selectedProp ? selectedProp.name : 'Property';
      const unitNumber = selectedUnit ? selectedUnit.unit : '';

      // 1. Generate connection code
      const response = await fetch('http://localhost:4000/api/auth/invite/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landlordId: user.id.toString(),
          targetRole: 'tenant',
          propertyId: selectedPropertyId,
          unit: unitNumber,
          createdById: user.id.toString(),
          email: tenantEmail,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate connection code');
      }

      const inviteResult = await response.json();
      const code = inviteResult.code;

      // 2. Automatically generate the invoices
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.id}`,
      };

      // Create Rent Invoice
      await fetch('http://localhost:4000/api/properties/invoices', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tenantEmail,
          tenantName,
          unitNumber,
          amountDue: rentAmount,
          propertyName: propName,
          description: 'First Month Rent',
        }),
      });

      // Create Security Deposit Invoice if > 0
      if (securityDeposit > 0) {
        await fetch('http://localhost:4000/api/properties/invoices', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            tenantEmail,
            tenantName,
            unitNumber,
            amountDue: securityDeposit,
            propertyName: propName,
            description: 'Security Deposit (Move-in Fee)',
          }),
        });
      }

      // Create Utility Fee Invoice if > 0
      if (utilityFee > 0) {
        await fetch('http://localhost:4000/api/properties/invoices', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            tenantEmail,
            tenantName,
            unitNumber,
            amountDue: utilityFee,
            propertyName: propName,
            description: 'Move-in Utility Fee',
          }),
        });
      }

      // Update unit occupant name and email locally temporarily
      // In a real system, the invite claiming flow binds it, but we can set it now to make the UI look active
      try {
        await fetch(`http://localhost:4000/api/properties/tenants/${selectedUnitId}/move`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            targetPropertyId: selectedPropertyId,
            targetPropertyName: propName,
            targetUnit: unitNumber,
          }),
        });
      } catch (err) {
        console.warn('Silent non-blocking updates:', err);
      }

      setGeneratedCode(code);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred during invite setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsInviteModalOpen(false);
    setGeneratedCode('');
    setSelectedPropertyId('');
    setSelectedUnitId('');
    setTenantName('');
    setTenantEmail('');
    setErrorMsg('');
    // Refresh to reload data
    window.location.reload();
  };

  const activeTenants = tenants.filter(t => t.name && t.name.trim() !== '' && t.status?.toLowerCase() !== 'vacant');

  return (
    <div className="card-border" style={{ borderRadius: '2px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Active Residents</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>Manage invoices, invite new residents, and view support tickets.</p>
        </div>
        
        <button
          onClick={() => setIsInviteModalOpen(true)}
          style={{
            backgroundColor: 'var(--accent-coral)',
            color: 'var(--bg-primary)',
            border: 'none',
            borderRadius: '2px',
            padding: '8px 16px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 'bold',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            boxShadow: '0 4px 12px rgba(255, 107, 107, 0.15)',
          }}
        >
          Invite Resident
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {activeTenants.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '12px', border: '1px dashed var(--border-muted)' }}>
            NO ACTIVE RESIDENTS REGISTERED
          </div>
        ) : (
          activeTenants.map(ten => (
            <div 
              key={ten.id} 
              onClick={() => router.push(`/landlord/tenants/manage/${ten.id}`)}
              style={{
                padding: '16px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-muted)', borderRadius: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'border-color 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-coral)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-muted)'}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{ten.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Unit {ten.unit} | {ten.property}</div>
              </div>
              
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block' }}>RENT</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{ten.rent}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block' }}>ARREARS</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: ten.arrears > 0 ? 'var(--accent-coral)' : '#34d399' }}>
                    KES {ten.arrears.toLocaleString()}
                  </span>
                </div>
                <span style={{
                  padding: '2px 8px', borderRadius: '2px', fontSize: '10px', fontWeight: 'bold',
                  backgroundColor: ten.status?.toLowerCase() === 'active' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255, 107, 107, 0.1)',
                  color: ten.status?.toLowerCase() === 'active' ? '#34d399' : 'var(--accent-coral)',
                  border: ten.status?.toLowerCase() === 'active' ? '1px solid rgba(52, 211, 153, 0.2)' : '1px solid rgba(255, 107, 107, 0.2)'
                }}>
                  {ten.status || 'Active'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Invite Resident Modal */}
      {isInviteModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(5, 8, 11, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div className="card-border" style={{
            maxWidth: '560px',
            width: '100%',
            backgroundColor: 'var(--bg-secondary)',
            padding: '32px',
            borderRadius: '4px',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Invite Resident</h2>
              {!generatedCode && (
                <button 
                  onClick={handleCloseModal}
                  style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '18px' }}
                >
                  &times;
                </button>
              )}
            </div>

            {errorMsg && (
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.2)', color: 'var(--accent-coral)', fontSize: '12px', borderRadius: '2px', marginBottom: '16px' }}>
                {errorMsg}
              </div>
            )}

            {generatedCode ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#34d399', fontSize: '20px'
                }}>
                  ✓
                </div>
                <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '8px' }}>Invitation Created</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                  Share this connection code with your resident. They will enter it in their dashboard to link their account.
                </p>

                <div style={{
                  backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-muted)', borderRadius: '2px', padding: '16px',
                  fontFamily: 'monospace', fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-coral)', letterSpacing: '2px',
                  marginBottom: '24px', display: 'inline-block', width: '200px'
                }}>
                  {generatedCode}
                </div>

                <div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCode);
                      alert('Connection code copied to clipboard!');
                    }}
                    style={{
                      backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-muted)',
                      borderRadius: '2px', padding: '8px 16px', fontSize: '11px', fontFamily: 'monospace', cursor: 'pointer', marginRight: '8px'
                    }}
                  >
                    Copy Code
                  </button>
                  <button
                    onClick={handleCloseModal}
                    style={{
                      backgroundColor: 'var(--accent-coral)', color: 'var(--bg-primary)', border: 'none',
                      borderRadius: '2px', padding: '8px 16px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold', cursor: 'pointer'
                    }}
                  >
                    Finish
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateInvite} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Property</label>
                    <select
                      value={selectedPropertyId}
                      onChange={(e) => {
                        setSelectedPropertyId(e.target.value);
                        setSelectedUnitId('');
                      }}
                      className="cyber-input cyber-select"
                      style={{ width: '100%', padding: '8px 12px', fontSize: '12px', borderRadius: '2px' }}
                      required
                    >
                      <option value="">Choose property...</option>
                      {propertyOptions.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Vacant Unit</label>
                    <select
                      value={selectedUnitId}
                      onChange={(e) => setSelectedUnitId(e.target.value)}
                      disabled={!selectedPropertyId}
                      className="cyber-input cyber-select"
                      style={{ width: '100%', padding: '8px 12px', fontSize: '12px', borderRadius: '2px' }}
                      required
                    >
                      <option value="">Choose unit...</option>
                      {vacantUnits.map(u => (
                        <option key={u.id} value={u.id}>{u.unit} (Rent: {u.rent})</option>
                      ))}
                    </select>
                    {selectedPropertyId && vacantUnits.length === 0 && (
                      <span style={{ fontSize: '10px', color: 'var(--accent-coral)', marginTop: '4px', display: 'block' }}>
                        No vacant units in this property.
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Resident Name</label>
                    <input
                      type="text"
                      placeholder="Jane Doe"
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      className="cyber-input"
                      style={{ width: '100%', padding: '8px 12px', fontSize: '12px', borderRadius: '2px' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Resident Email</label>
                    <input
                      type="email"
                      placeholder="jane@doe.com"
                      value={tenantEmail}
                      onChange={(e) => setTenantEmail(e.target.value)}
                      className="cyber-input"
                      style={{ width: '100%', padding: '8px 12px', fontSize: '12px', borderRadius: '2px' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '16px', marginTop: '8px' }}>
                  <h4 style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px 0' }}>Move-In Costs & Preview</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Security Deposit (€)</label>
                      <input
                        type="number"
                        value={securityDeposit}
                        onChange={(e) => setSecurityDeposit(Number(e.target.value))}
                        className="cyber-input"
                        style={{ width: '100%', padding: '8px 12px', fontSize: '12px', borderRadius: '2px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Utility Fee (€/mo)</label>
                      <input
                        type="number"
                        value={utilityFee}
                        onChange={(e) => setUtilityFee(Number(e.target.value))}
                        className="cyber-input"
                        style={{ width: '100%', padding: '8px 12px', fontSize: '12px', borderRadius: '2px' }}
                      />
                    </div>
                  </div>

                  {/* Invoice Breakdown Preview */}
                  <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-muted)', padding: '16px', borderRadius: '2px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      <span>First Month Rent:</span>
                      <span style={{ fontFamily: 'monospace' }}>€{rentAmount.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      <span>Security Deposit (Move-in Fee):</span>
                      <span style={{ fontFamily: 'monospace' }}>€{(Number(securityDeposit) || 0).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-muted)' }}>
                      <span>Trash/Utility Fee:</span>
                      <span style={{ fontFamily: 'monospace' }}>€{(Number(utilityFee) || 0).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      <span>Total Due at Move-in:</span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--accent-coral)' }}>€{totalDue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    style={{
                      backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-muted)',
                      borderRadius: '2px', padding: '8px 16px', fontSize: '11px', fontFamily: 'monospace', cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedUnitId}
                    style={{
                      backgroundColor: 'var(--accent-coral)', color: 'var(--bg-primary)', border: 'none',
                      borderRadius: '2px', padding: '8px 16px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold', cursor: 'pointer'
                    }}
                  >
                    {isSubmitting ? 'Generating...' : 'Create Invite'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
