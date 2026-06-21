'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface Property {
  id: string;
  name: string;
  address: string;
}

interface VacantUnit {
  id: string;
  unit: string;
  rent: string;
  arrears: number;
  status: string;
}

interface AddTenantWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialPropertyId?: string; // Optional: pre-select if opened from property details page
}

export default function AddTenantWizardModal({
  isOpen,
  onClose,
  onSuccess,
  initialPropertyId,
}: AddTenantWizardModalProps) {
  const [step, setStep] = useState(1);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);

  // Form states
  const [selectedPropertyId, setSelectedPropertyId] = useState(initialPropertyId || '');
  const [unitMode, setUnitMode] = useState<'vacant' | 'new'>('vacant');
  const [vacantUnits, setVacantUnits] = useState<VacantUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  
  // Selected vacant unit or new unit details
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [newUnitNumber, setNewUnitNumber] = useState('');
  const [rentAmount, setRentAmount] = useState<number>(0);

  // Resident profile info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [inviteMode, setInviteMode] = useState(false); // false = direct add, true = generate code

  // Move-in cost options
  const [chargeRent, setChargeRent] = useState(true);
  const [securityDeposit, setSecurityDeposit] = useState<number>(0);
  const [utilityFee, setUtilityFee] = useState<number>(25);

  // API Call Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultData, setResultData] = useState<{
    success: boolean;
    tenantId: string;
    code: string | null;
    invoices: Array<{ type: string; id: string; amount: number }>;
  } | null>(null);

  // Get active user token
  const getAuthToken = (): string => {
    if (typeof window === 'undefined') return '';
    const session = localStorage.getItem('user');
    if (!session) return '';
    try {
      return JSON.parse(session).id || '';
    } catch {
      return '';
    }
  };

  // Fetch properties list on load
  useEffect(() => {
    if (!isOpen) return;
    setLoadingProperties(true);
    fetch('http://localhost:4000/api/properties', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setProperties(data || []);
        if (data.length > 0 && !selectedPropertyId) {
          setSelectedPropertyId(data[0].id);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoadingProperties(false));
  }, [isOpen]);

  // Fetch vacant units when property changes
  useEffect(() => {
    if (!selectedPropertyId || !isOpen || unitMode !== 'vacant') {
      setVacantUnits([]);
      setSelectedUnitId('');
      return;
    }
    setLoadingUnits(true);
    fetch(`http://localhost:4000/api/properties/${selectedPropertyId}/vacant-units`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    })
      .then(r => r.ok ? r.json() : { vacantUnits: [] })
      .then(data => {
        const units = data.vacantUnits || [];
        setVacantUnits(units);
        if (units.length > 0) {
          setSelectedUnitId(units[0].id);
          const firstRent = parseFloat(units[0].rent.replace(/[^\d.-]/g, '')) || 0;
          setRentAmount(firstRent);
          setSecurityDeposit(firstRent);
        } else {
          setSelectedUnitId('');
          setRentAmount(0);
          setSecurityDeposit(0);
        }
      })
      .catch(() => setVacantUnits([]))
      .finally(() => setLoadingUnits(false));
  }, [selectedPropertyId, isOpen, unitMode]);

  // Handle selected vacant unit change
  const handleVacantUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId);
    const unit = vacantUnits.find(u => u.id === unitId);
    if (unit) {
      const parsedRent = parseFloat(unit.rent.replace(/[^\d.-]/g, '')) || 0;
      setRentAmount(parsedRent);
      setSecurityDeposit(parsedRent);
    }
  };

  // Reset state on modal close or initial open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setUnitMode('vacant');
      setNewUnitNumber('');
      setName('');
      setEmail('');
      setPhone('');
      setInviteMode(false);
      setChargeRent(true);
      setUtilityFee(25);
      setErrorMsg(null);
      setResultData(null);
      if (initialPropertyId) {
        setSelectedPropertyId(initialPropertyId);
      }
    }
  }, [isOpen, initialPropertyId]);

  // Invoice calculations
  const finalRentCharge = chargeRent ? rentAmount : 0;
  const totalDue = finalRentCharge + (Number(securityDeposit) || 0) + (Number(utilityFee) || 0);

  const activeProperty = useMemo(() => {
    return properties.find(p => p.id === selectedPropertyId);
  }, [selectedPropertyId, properties]);

  const activeUnitLabel = useMemo(() => {
    if (unitMode === 'vacant') {
      return vacantUnits.find(u => u.id === selectedUnitId)?.unit || '';
    }
    return newUnitNumber;
  }, [unitMode, selectedUnitId, vacantUnits, newUnitNumber]);

  const validateStep1 = () => {
    if (!selectedPropertyId) return false;
    if (unitMode === 'vacant' && !selectedUnitId) return false;
    if (unitMode === 'new' && (!newUnitNumber.trim() || rentAmount <= 0)) return false;
    return true;
  };

  const validateStep2 = () => {
    if (!name.trim()) return false;
    if (!email.trim() || !email.includes('@')) return false;
    return true;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      name,
      email,
      phone,
      unit: activeUnitLabel,
      rent: rentAmount.toString(),
      inviteMode,
      securityDeposit: Number(securityDeposit) || 0,
      utilityFee: Number(utilityFee) || 0,
      isNewUnit: unitMode === 'new',
    };

    try {
      const res = await fetch(`http://localhost:4000/api/properties/${selectedPropertyId}/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setResultData(data);
        setStep(4);
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(data.message || 'Failed to register tenant details');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network connection failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 11, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
    >
      <div
        className="card-border shadow-glow-coral"
        style={{
          maxWidth: '520px',
          width: '100%',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-muted)',
          borderRadius: '4px',
          padding: '28px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: '18px',
          }}
        >
          ✕
        </button>

        {/* Steps indicator */}
        {step < 4 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: '3px',
                  backgroundColor: step >= i ? 'var(--accent-coral)' : 'var(--border-muted)',
                  transition: 'background-color 0.2s',
                }}
              />
            ))}
          </div>
        )}

        {/* Title */}
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '0 0 4px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {step === 1 && 'Step 1: Select Chamber Unit'}
          {step === 2 && 'Step 2: Resident Profile'}
          {step === 3 && 'Step 3: Move-In Fees & Invoice'}
          {step === 4 && 'Registration Complete'}
        </h2>
        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 24px 0', fontFamily: 'monospace' }}>
          {step === 1 && 'Assign unit from vacant listings or establish a new unit.'}
          {step === 2 && 'Enter resident identity and connection preferences.'}
          {step === 3 && 'Preview move-in statements before commit.'}
          {step === 4 && 'Resident details logged. Visual verification report generated.'}
        </p>

        {errorMsg && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--accent-coral)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              fontSize: '11px',
              fontFamily: 'monospace',
              marginBottom: '20px',
            }}
          >
            ERROR: {errorMsg.toUpperCase()}
          </div>
        )}

        {/* STEP 1 CONTENT */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Property Selector */}
            {!initialPropertyId && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>CHAMBER PROPERTY</label>
                <select
                  value={selectedPropertyId}
                  onChange={e => {
                    setSelectedPropertyId(e.target.value);
                    setSelectedUnitId('');
                  }}
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-muted)',
                    color: 'var(--text-primary)',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                >
                  <option value="">Select Property...</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Selection Mode Toggle */}
            <div style={{ display: 'flex', border: '1px solid var(--border-muted)', padding: '2px', backgroundColor: 'var(--bg-primary)' }}>
              <button
                type="button"
                onClick={() => setUnitMode('vacant')}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  backgroundColor: unitMode === 'vacant' ? 'var(--bg-secondary)' : 'transparent',
                  border: 'none',
                  color: unitMode === 'vacant' ? 'var(--accent-coral)' : 'var(--text-secondary)',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  fontWeight: unitMode === 'vacant' ? 'bold' : 'normal',
                  cursor: 'pointer',
                }}
              >
                VACANT UNIT
              </button>
              <button
                type="button"
                onClick={() => setUnitMode('new')}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  backgroundColor: unitMode === 'new' ? 'var(--bg-secondary)' : 'transparent',
                  border: 'none',
                  color: unitMode === 'new' ? 'var(--accent-coral)' : 'var(--text-secondary)',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  fontWeight: unitMode === 'new' ? 'bold' : 'normal',
                  cursor: 'pointer',
                }}
              >
                CREATE NEW UNIT
              </button>
            </div>

            {/* vacant selector */}
            {unitMode === 'vacant' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>SELECT VACANT UNIT</label>
                {loadingUnits ? (
                  <div style={{ padding: '8px 12px', color: 'var(--text-tertiary)', fontSize: '12px', fontFamily: 'monospace' }}>Querying vacant logs...</div>
                ) : vacantUnits.length === 0 ? (
                  <div style={{ padding: '10px', border: '1px dashed var(--border-muted)', color: 'var(--accent-coral)', fontSize: '11px', fontFamily: 'monospace', textAlign: 'center' }}>
                    NO VACANT UNITS AVAILABLE IN THIS PROPERTY.
                  </div>
                ) : (
                  <select
                    value={selectedUnitId}
                    onChange={e => handleVacantUnitChange(e.target.value)}
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-muted)',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                  >
                    {vacantUnits.map(u => (
                      <option key={u.id} value={u.id}>Unit {u.unit} (Rent: {u.rent})</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* create new unit */}
            {unitMode === 'new' && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>UNIT NUMBER</label>
                  <input
                    type="text"
                    placeholder="e.g. 4B"
                    value={newUnitNumber}
                    onChange={e => setNewUnitNumber(e.target.value)}
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-muted)',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>MONTHLY RENT (€)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1500"
                    value={rentAmount || ''}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setRentAmount(val);
                      setSecurityDeposit(val);
                    }}
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-muted)',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2 CONTENT */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>FULL NAME</label>
              <input
                type="text"
                placeholder="Jane Doe"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--text-primary)',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>EMAIL ADDRESS</label>
                <input
                  type="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-muted)',
                    color: 'var(--text-primary)',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>PHONE NUMBER</label>
                <input
                  type="text"
                  placeholder="+31 6 12345678"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-muted)',
                    color: 'var(--text-primary)',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-muted)', paddingTop: '16px', marginTop: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>REGISTRATION MODE</label>
              
              <div
                onClick={() => setInviteMode(false)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '10px 12px',
                  backgroundColor: !inviteMode ? 'rgba(255, 107, 107, 0.05)' : 'var(--bg-primary)',
                  border: `1px solid ${!inviteMode ? 'var(--accent-coral)' : 'var(--border-muted)'}`,
                  cursor: 'pointer',
                }}
              >
                <div style={{ marginTop: '2px', width: '10px', height: '10px', border: '1px solid var(--text-secondary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!inviteMode && <div style={{ width: '6px', height: '6px', backgroundColor: 'var(--accent-coral)', borderRadius: '50%' }} />}
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Direct Registration (Active)</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Instantly link this resident. They will immediately show up in active reports.</div>
                </div>
              </div>

              <div
                onClick={() => setInviteMode(true)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '10px 12px',
                  backgroundColor: inviteMode ? 'rgba(255, 107, 107, 0.05)' : 'var(--bg-primary)',
                  border: `1px solid ${inviteMode ? 'var(--accent-coral)' : 'var(--border-muted)'}`,
                  cursor: 'pointer',
                }}
              >
                <div style={{ marginTop: '2px', width: '10px', height: '10px', border: '1px solid var(--text-secondary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {inviteMode && <div style={{ width: '6px', height: '6px', backgroundColor: 'var(--accent-coral)', borderRadius: '50%' }} />}
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Lease Invitation Code (Pending)</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Generate a claim code. The resident must verify themselves through the portal to complete the link.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 CONTENT */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>SECURITY DEPOSIT (€)</label>
                <input
                  type="number"
                  value={securityDeposit || ''}
                  onChange={e => setSecurityDeposit(Number(e.target.value))}
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-muted)',
                    color: 'var(--text-primary)',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>UTILITY FEE/MO (€)</label>
                <input
                  type="number"
                  value={utilityFee || ''}
                  onChange={e => setUtilityFee(Number(e.target.value))}
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-muted)',
                    color: 'var(--text-primary)',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                id="chargeRentCheckbox"
                type="checkbox"
                checked={chargeRent}
                onChange={e => setChargeRent(e.target.checked)}
                style={{ accentColor: 'var(--accent-coral)', cursor: 'pointer' }}
              />
              <label htmlFor="chargeRentCheckbox" style={{ fontSize: '10px', color: 'var(--text-primary)', fontFamily: 'monospace', cursor: 'pointer' }}>
                INVOICE FIRST MONTH RENT IMMEDIATELY (€{rentAmount.toLocaleString()})
              </label>
            </div>

            {/* live invoice breakdown */}
            <div
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-muted)',
                padding: '16px',
                marginTop: '8px',
              }}
            >
              <h4 style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px 0', borderBottom: '1px solid var(--border-muted)', paddingBottom: '6px' }}>
                Move-In Statement Preview
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', fontFamily: 'monospace' }}>
                {chargeRent && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>First Month Rent (Unit {activeUnitLabel})</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>€{rentAmount.toLocaleString()}</span>
                  </div>
                )}
                {securityDeposit > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Security Deposit</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>€{securityDeposit.toLocaleString()}</span>
                  </div>
                )}
                {utilityFee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Amenity & Utility Setup Fee</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>€{utilityFee.toLocaleString()}</span>
                  </div>
                )}
                
                <div style={{ height: '1px', backgroundColor: 'var(--border-muted)', margin: '4px 0' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
                  <span style={{ color: 'var(--text-primary)' }}>Total Move-In Statement</span>
                  <span style={{ color: 'var(--accent-coral)' }}>€{totalDue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS REPORT */}
        {step === 4 && resultData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  margin: '0 auto 12px auto',
                }}
              >
                ✓
              </div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>RESIDENT SUCCESSFULLY LOGGED</div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Unit {activeUnitLabel} is now allocated to {name}.
              </p>
            </div>

            {/* Display code if invite mode was true */}
            {resultData.code && (
              <div
                style={{
                  backgroundColor: 'rgba(5, 8, 11, 0.4)',
                  border: '1px solid var(--border-muted)',
                  padding: '16px',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', letterSpacing: '0.05em' }}>
                  Invitation Claim Code
                </span>
                <span style={{ fontSize: '24px', fontFamily: 'monospace', fontWeight: 'extrabold', color: 'var(--accent-coral)', letterSpacing: '0.15em', display: 'block', margin: '8px 0', selectAll: 'true' } as any}>
                  {resultData.code}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(resultData.code || '');
                  }}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-muted)',
                    color: 'var(--text-primary)',
                    padding: '4px 12px',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                  }}
                >
                  COPY CODE
                </button>
              </div>
            )}

            {/* Move-in Invoices generated */}
            <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-muted)', padding: '12px 14px' }}>
              <span style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Invoices Generated ({resultData.invoices.length})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '10px', fontFamily: 'monospace' }}>
                {resultData.invoices.map((inv, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>• {inv.type} ({inv.id})</span>
                    <span style={{ color: 'var(--text-primary)' }}>€{inv.amount.toLocaleString()}</span>
                  </div>
                ))}
                {resultData.invoices.length === 0 && (
                  <div style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No move-in invoices issued.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Buttons panel */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '28px', borderTop: '1px solid var(--border-muted)', paddingTop: '20px' }}>
          {step > 1 && step < 4 && (
            <button
              type="button"
              onClick={() => setStep(prev => prev - 1)}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--border-muted)',
                color: 'var(--text-primary)',
                padding: '8px 16px',
                fontSize: '12px',
                fontFamily: 'monospace',
                cursor: 'pointer',
              }}
            >
              BACK
            </button>
          )}

          <div style={{ flex: 1 }} />

          {step === 1 && (
            <button
              type="button"
              disabled={!validateStep1()}
              onClick={() => setStep(2)}
              style={{
                backgroundColor: validateStep1() ? 'var(--accent-coral)' : 'transparent',
                border: validateStep1() ? 'none' : '1px solid var(--border-muted)',
                color: validateStep1() ? 'black' : 'var(--text-secondary)',
                padding: '8px 24px',
                fontSize: '12px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                cursor: validateStep1() ? 'pointer' : 'not-allowed',
              }}
            >
              CONTINUE
            </button>
          )}

          {step === 2 && (
            <button
              type="button"
              disabled={!validateStep2()}
              onClick={() => setStep(3)}
              style={{
                backgroundColor: validateStep2() ? 'var(--accent-coral)' : 'transparent',
                border: validateStep2() ? 'none' : '1px solid var(--border-muted)',
                color: validateStep2() ? 'black' : 'var(--text-secondary)',
                padding: '8px 24px',
                fontSize: '12px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                cursor: validateStep2() ? 'pointer' : 'not-allowed',
              }}
            >
              CONTINUE
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              style={{
                backgroundColor: 'var(--accent-coral)',
                border: 'none',
                color: 'black',
                padding: '8px 24px',
                fontSize: '12px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {isSubmitting ? 'SUBMITTING...' : 'CONFIRM & DEPLOY'}
            </button>
          )}

          {step === 4 && (
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: 'var(--accent-coral)',
                border: 'none',
                color: 'black',
                padding: '8px 24px',
                fontSize: '12px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              CLOSE
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
