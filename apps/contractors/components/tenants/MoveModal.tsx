'use client';

import React, { useState, useMemo } from 'react';

interface Property {
  id: string;
  name: string;
  unitsCount: number;
}

interface Tenant {
  id: string;
  name: string;
  unit: string;
  propertyId: string;
  propertyName: string;
}

interface MoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  tenantName: string;
  currentUnit: string;
  properties: Property[];
}

export default function MoveModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  tenantName,
  currentUnit,
  properties
}: MoveModalProps) {
  const [targetPropId, setTargetPropId] = useState(properties[0]?.id || '');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [loading, setLoading] = useState(false);
  const [warningState, setWarningState] = useState<{ occupantId: string; occupantName: string } | null>(null);
  
  // All tenants list for local occupancy checks
  const [tenants, setTenants] = useState<Tenant[]>([]);

  // Fetch tenants on open to calculate occupancy
  React.useEffect(() => {
    if (!isOpen) return;
    const session = localStorage.getItem('user');
    if (!session) return;
    let token = '';
    try {
      token = JSON.parse(session).id;
    } catch (e) {
      return;
    }
    fetch('http://localhost:4000/api/properties/tenants', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setTenants(data || []))
      .catch(err => console.error(err));
  }, [isOpen]);

  const selectedProp = useMemo(() => {
    return properties.find(p => p.id === targetPropId);
  }, [properties, targetPropId]);

  // Generate units list with occupancy state
  const unitsList = useMemo(() => {
    if (!selectedProp) return [];
    const list = [];
    const count = selectedProp.unitsCount || 1;
    for (let i = 1; i <= count; i++) {
      const uName = `Unit ${i}`;
      // Find active occupant
      const occupant = tenants.find(t => 
        (t.propertyId === selectedProp.id || t.propertyName === selectedProp.name) && 
        t.unit === uName
      );
      list.push({
        name: uName,
        occupied: !!occupant,
        occupantName: occupant ? occupant.name : null,
        occupantId: occupant ? occupant.id : null
      });
    }
    return list;
  }, [selectedProp, tenants]);

  if (!isOpen) return null;

  const handleMoveSubmit = async (e?: React.FormEvent, forceAction?: 'archive' | 'interchange') => {
    if (e) e.preventDefault();
    if (!targetPropId || !selectedUnit) return;

    const session = localStorage.getItem('user');
    if (!session) return;
    let token = '';
    try {
      token = JSON.parse(session).id;
    } catch (e) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:4000/api/properties/tenants/${tenantId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetPropertyId: targetPropId,
          targetPropertyName: selectedProp?.name || '',
          targetUnit: selectedUnit,
          action: forceAction
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.warning && data.occupant) {
          setWarningState({
            occupantId: data.occupant.id,
            occupantName: data.occupant.name
          });
        } else {
          setWarningState(null);
          onSuccess();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-lg p-6 shadow-2xl relative fade-in font-mono text-xs text-[var(--text-primary)]">
        
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors text-sm cursor-pointer"
        >
          ✕
        </button>

        {!warningState ? (
          <div className="flex flex-col gap-4">
            <h3 className="font-heading text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-muted)] pb-2 uppercase tracking-wide">
              Reassign Room Unit
            </h3>
            
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase text-[var(--text-tertiary)] font-bold">Target Property</label>
              <select 
                value={targetPropId}
                onChange={e => { setTargetPropId(e.target.value); setSelectedUnit(''); }}
                className="bg-[var(--bg-primary)] border border-[var(--border-muted)] focus:border-[var(--accent-coral)] p-2 rounded text-[var(--text-primary)] outline-none"
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Units Grid Visualizer */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] uppercase text-[var(--text-tertiary)] font-bold">Select Unit (Visualizer)</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 border border-[var(--border-muted)] rounded bg-[var(--bg-primary)]">
                {unitsList.map((u) => {
                  const isSelected = selectedUnit === u.name;
                  return (
                    <button
                      key={u.name}
                      type="button"
                      onClick={() => setSelectedUnit(u.name)}
                      className={`p-2 rounded text-center border text-[10px] flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-[var(--accent-coral)] bg-[var(--accent-coral)]/10 text-[var(--accent-coral)] font-bold'
                          : u.occupied
                            ? 'border-red-500/20 bg-red-500/5 text-red-400 hover:border-red-500'
                            : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:border-emerald-500'
                      }`}
                    >
                      <span className="font-bold">{u.name}</span>
                      <span className="text-[7px] uppercase mt-0.5 opacity-80">
                        {u.occupied ? 'Occupied' : 'Vacant'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[var(--border-muted)] pt-4 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="border border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading || !selectedUnit}
                onClick={() => handleMoveSubmit()}
                className="bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-black font-bold px-4 py-1.5 rounded transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Reassigning...' : 'Reassign Unit'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <h3 className="font-heading text-sm font-bold text-[var(--accent-coral)] border-b border-[var(--border-muted)] pb-2 uppercase tracking-wide flex items-center gap-1.5">
              ⚠️ Room Conflict Detected
            </h3>
            
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Chamber <span className="font-bold text-[var(--text-primary)]">{selectedUnit}</span> is currently occupied by <span className="font-bold text-[var(--text-primary)]">{warningState.occupantName}</span>.
            </p>
            
            <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed">
              Please choose how you wish to resolve this space collision:
            </p>

            <div className="flex flex-col gap-2.5 mt-2">
              <button
                onClick={() => handleMoveSubmit(undefined, 'archive')}
                disabled={loading}
                className="w-full text-left bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500 p-3 rounded transition-colors cursor-pointer"
              >
                <div className="font-bold text-[10px] uppercase">Option 1: Archive & Evict Occupant</div>
                <div className="text-[9px] opacity-75 mt-0.5">Archive {warningState.occupantName} and reassign unit to {tenantName}.</div>
              </button>

              <button
                onClick={() => handleMoveSubmit(undefined, 'interchange')}
                disabled={loading}
                className="w-full text-left bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-500 p-3 rounded transition-colors cursor-pointer"
              >
                <div className="font-bold text-[10px] uppercase">Option 2: Interchange Residents</div>
                <div className="text-[9px] opacity-75 mt-0.5">Swap rooms. {warningState.occupantName} will move to {tenantName}&apos;s previous unit ({currentUnit}).</div>
              </button>
            </div>

            <div className="flex justify-end gap-2 border-t border-[var(--border-muted)] pt-4 mt-2">
              <button
                onClick={() => setWarningState(null)}
                className="border border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={onClose}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] px-2 py-1.5 transition-colors cursor-pointer"
              >
                Cancel Move
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
