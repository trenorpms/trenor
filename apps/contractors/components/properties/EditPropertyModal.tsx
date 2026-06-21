'use client';

import React, { useState } from 'react';

interface Property {
  id: string;
  name: string;
  address: string;
  unitsCount: number;
  status: string;
}

interface EditPropertyModalProps {
  property: Property;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPropertyModal({ property, onClose, onSuccess }: EditPropertyModalProps) {
  const [name, setName] = useState(property.name);
  const [address, setAddress] = useState(property.address);
  const [units, setUnits] = useState(property.unitsCount);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const res = await fetch(`http://localhost:4000/api/properties/${property.id}/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, address, unitsCount: units })
      });

      if (res.ok) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error updating asset parameter:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-lg p-6 shadow-2xl relative fade-in font-mono text-xs text-[var(--text-primary)]">
        
        <button 
          onClick={onClose} 
          className="absolute right-4 top-4 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors text-sm cursor-pointer"
        >
          ✕
        </button>

        <h3 className="font-heading text-base font-bold text-[var(--text-primary)] border-b border-[var(--border-muted)] pb-2 mb-4">
          Edit Asset Parameters
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] uppercase text-[var(--text-tertiary)] font-bold">Property Name</label>
            <input 
              type="text" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="bg-[var(--bg-primary)] border border-[var(--border-muted)] focus:border-[var(--accent-coral)] p-2 rounded text-[var(--text-primary)] outline-none transition-colors" 
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] uppercase text-[var(--text-tertiary)] font-bold">Address / Coordinates</label>
            <input 
              type="text" 
              required 
              value={address} 
              onChange={e => setAddress(e.target.value)} 
              className="bg-[var(--bg-primary)] border border-[var(--border-muted)] focus:border-[var(--accent-coral)] p-2 rounded text-[var(--text-primary)] outline-none transition-colors" 
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] uppercase text-[var(--text-tertiary)] font-bold">Chamber Units Count</label>
            <input 
              type="number" 
              required 
              min={1} 
              value={units} 
              onChange={e => setUnits(parseInt(e.target.value) || 0)} 
              className="bg-[var(--bg-primary)] border border-[var(--border-muted)] focus:border-[var(--accent-coral)] p-2 rounded text-[var(--text-primary)] outline-none transition-colors" 
            />
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
              type="submit" 
              disabled={loading} 
              className="bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-black font-bold px-4 py-1.5 rounded transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
