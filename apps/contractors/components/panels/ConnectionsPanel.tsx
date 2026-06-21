'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AddTenantWizardModal from '../AddTenantWizardModal';

interface User { id: string; email: string; name: string; role: string; }
interface Connection { id: string; email: string; name: string; role: string; }
interface PendingCode { id: string; email?: string; expiresAt: string; targetRole: string; propertyId?: string; unit?: string; }
interface Property { id: string; name: string; }
interface VacantUnit { id: string; unit: string; rent: string; arrears: number; status: string; }

export default function ConnectionsPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingCodes, setPendingCodes] = useState<PendingCode[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Generate form
  const [targetRole, setTargetRole] = useState<'tenant' | 'landlord'>('tenant');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [vacantUnits, setVacantUnits] = useState<VacantUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Move-in fee inputs
  const [securityDeposit, setSecurityDeposit] = useState<number>(0);
  const [utilityFee, setUtilityFee] = useState<number>(25);

  // Claim form
  const [claimCode, setClaimCode] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Derived: selected unit details + invoice preview
  const selectedUnit = useMemo(() => vacantUnits.find(u => u.id === selectedUnitId), [selectedUnitId, vacantUnits]);
  const rentAmount = useMemo(() => {
    if (!selectedUnit) return 0;
    return parseFloat((selectedUnit.rent || '0').replace(/[^0-9.]/g, '')) || 0;
  }, [selectedUnit]);

  // Auto-set security deposit = rent when unit changes
  useEffect(() => { if (rentAmount > 0) setSecurityDeposit(rentAmount); }, [rentAmount]);

  const totalDue = rentAmount + (Number(securityDeposit) || 0) + (Number(utilityFee) || 0);

  useEffect(() => {
    const session = localStorage.getItem('user');
    if (!session) return;
    try {
      const parsed = JSON.parse(session);
      setUser(parsed);
      fetchConnectionsData(parsed);
    } catch (e) { console.error(e); }
  }, []);

  // Fetch vacant units when property changes
  useEffect(() => {
    if (!selectedPropertyId || !user || targetRole !== 'tenant') {
      setVacantUnits([]);
      setSelectedUnitId('');
      return;
    }
    setLoadingUnits(true);
    fetch(`http://localhost:4000/api/properties/${selectedPropertyId}/vacant-units`, {
      headers: { 'Authorization': `Bearer ${user.id}` }
    })
      .then(r => r.ok ? r.json() : { vacantUnits: [] })
      .then(data => {
        setVacantUnits(data.vacantUnits || []);
        setSelectedUnitId('');
      })
      .catch(() => setVacantUnits([]))
      .finally(() => setLoadingUnits(false));
  }, [selectedPropertyId, user, targetRole]);

  const fetchConnectionsData = async (currentUser: User) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/auth/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, role: currentUser.role })
      });
      if (res.ok) {
        const data = await res.json();
        setConnections(currentUser.role === 'landlord' ? (data.managers || []) : (data.landlords || []));
        setPendingCodes(data.pendingCodes || []);
      }
      const propRes = await fetch('http://localhost:4000/api/properties', {
        headers: { 'Authorization': `Bearer ${currentUser.id}` }
      });
      if (propRes.ok) {
        const props = await propRes.json();
        setProperties(props || []);
        if (props.length > 0) setSelectedPropertyId(props[0].id);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (targetRole === 'tenant' && !selectedUnitId) return;
    setIsGenerating(true);
    setGeneratedCode(null);

    try {
      const unitLabel = selectedUnit?.unit || '';
      const res = await fetch('http://localhost:4000/api/auth/invite/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landlordId: user.role === 'landlord' ? user.id : 'demo-landlord-id',
          targetRole,
          propertyId: targetRole === 'tenant' ? selectedPropertyId : undefined,
          unit: targetRole === 'tenant' ? unitLabel : undefined,
          createdById: user.id
        })
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedCode(data.code);
        fetchConnectionsData(user);
      } else {
        alert('Failed to generate code');
      }
    } catch (err) { console.error(err); }
    finally { setIsGenerating(false); }
  };

  const handleClaimCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !claimCode.trim()) return;
    setIsClaiming(true);
    setStatusMessage(null);
    try {
      const res = await fetch('http://localhost:4000/api/auth/invite/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: claimCode, userId: user.id })
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ text: `Successfully linked as ${data.targetRole || 'connection'}!`, type: 'success' });
        setClaimCode('');
        fetchConnectionsData(user);
      } else {
        setStatusMessage({ text: data.message || 'Failed to claim code', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Connection error', type: 'error' });
    } finally { setIsClaiming(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-xs font-mono text-[var(--text-tertiary)]">
        LOADING...
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 md:p-6 lg:p-8 relative z-10 min-h-full w-full bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[var(--text-primary)]">Connections & Team</h1>
          <p className="text-xs font-mono text-[var(--text-tertiary)] mt-1">Manage links between portfolio owners, operators, and residents.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1 & 2: Lists */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Connected Partners */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] p-6 rounded-none">
            <h2 className="text-sm font-semibold font-heading mb-4 border-b border-[var(--border-muted)] pb-2 uppercase tracking-wider text-[var(--text-primary)]">
              Connected {user?.role === 'landlord' ? 'Managers' : 'Portfolio Owners'}
            </h2>
            {connections.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-[var(--text-tertiary)] border border-dashed border-[var(--border-muted)]">
                NO ACTIVE PARTNERS FOUND.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {connections.map(c => (
                  <div key={c.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)] border border-[var(--border-muted)]">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{c.name}</span>
                      <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{c.email}</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold bg-[var(--accent-coral)]/10 text-[var(--accent-coral)] border border-[var(--accent-coral)]/20 px-2 py-0.5 capitalize">{c.role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Codes */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] p-6 rounded-none">
            <h2 className="text-sm font-semibold font-heading mb-4 border-b border-[var(--border-muted)] pb-2 uppercase tracking-wider text-[var(--text-primary)]">
              Pending Codes
            </h2>
            {pendingCodes.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-[var(--text-tertiary)] border border-dashed border-[var(--border-muted)]">
                NO PENDING CODES.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {pendingCodes.map(code => {
                  const pName = properties.find(p => p.id === code.propertyId)?.name || 'Property';
                  return (
                    <div key={code.id} className="flex justify-between items-center p-3 bg-[var(--bg-primary)] border border-[var(--border-muted)]">
                      <div className="flex flex-col">
                        <span className="text-sm font-mono font-extrabold text-[var(--accent-coral)]">{code.id}</span>
                        <span className="text-[10px] text-[var(--text-tertiary)] mt-1">
                          Target: <strong className="text-[var(--text-primary)] capitalize">{code.targetRole}</strong>
                          {code.targetRole === 'tenant' && ` · ${pName} (Unit ${code.unit})`}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-[var(--text-tertiary)]">
                        Expires: {new Date(code.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Col 3: Actions */}
        <div className="flex flex-col gap-6">

          {/* Claim Code (landlord only) */}
          {user?.role === 'landlord' && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] p-6 rounded-none">
              <h2 className="text-sm font-semibold font-heading mb-3 uppercase tracking-wider text-[var(--text-primary)]">Link Existing Operator</h2>
              <p className="text-[11px] text-[var(--text-tertiary)] mb-4">Enter the manager's code to connect them to your account.</p>
              <form onSubmit={handleClaimCode} className="flex flex-col gap-3">
                <input type="text" placeholder="E.G. ABCD12" value={claimCode} onChange={e => setClaimCode(e.target.value)}
                  className="bg-[var(--bg-primary)] border border-[var(--border-muted)] text-[var(--text-primary)] text-xs rounded-none p-2 font-mono outline-none focus:border-[var(--accent-coral)]" required />
                {statusMessage && (
                  <div className={`p-2 font-mono text-[10px] ${statusMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {statusMessage.text.toUpperCase()}
                  </div>
                )}
                <button type="submit" disabled={isClaiming}
                  className="bg-[var(--accent-coral)] hover:bg-[var(--accent-coral)]/90 text-black font-heading text-xs font-bold py-2 rounded-none cursor-pointer transition-colors">
                  {isClaiming ? 'LINKING...' : 'CONNECT OPERATOR'}
                </button>
              </form>
            </div>
          )}

          {/* Generate Code replaced by Wizard trigger */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] p-6 rounded-none">
            <h2 className="text-sm font-semibold font-heading mb-3 uppercase tracking-wider text-[var(--text-primary)]">
              Register Resident
            </h2>
            <p className="text-[11px] text-[var(--text-tertiary)] mb-4">
              Use our interactive registration wizard to assign a vacant unit (or establish a new one), preview/generate move-in statements, and choose between direct activation or issuing a claim code.
            </p>
            <button 
              onClick={() => setWizardOpen(true)}
              className="w-full bg-[var(--accent-coral)] hover:bg-[var(--accent-coral)]/90 text-black font-heading text-xs font-bold py-3 rounded-none cursor-pointer transition-colors"
            >
              LAUNCH REGISTRATION WIZARD
            </button>
          </div>
        </div>
      </div>

      <AddTenantWizardModal
        isOpen={wizardOpen}
        onClose={() => {
          setWizardOpen(false);
          if (user) {
            fetchConnectionsData(user);
          }
        }}
        onSuccess={() => {
          if (user) {
            fetchConnectionsData(user);
          }
        }}
      />
    </div>
  );
}
