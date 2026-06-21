'use client';

import React, { useEffect, useState } from 'react';
import { CardSkeleton } from '../Skeleton';

interface Contractor {
  id: string;
  name: string;
  email: string;
  specialty: string;
  phone: string;
  status: 'available' | 'busy';
}

export default function ContractorsPanel() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContractors();
  }, []);

  const fetchContractors = () => {
    setLoading(true);
    fetch('http://localhost:4000/api/tickets/contractors')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setContractors(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching contractors roster', err);
        setLoading(false);
      });
  };

  const handleAddContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !specialty) return;
    setError(null);

    try {
      const response = await fetch('http://localhost:4000/api/tickets/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          specialty,
          phone,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to list contractor in database');
      }

      setName('');
      setEmail('');
      setSpecialty('');
      setPhone('');
      fetchContractors();
    } catch (err: any) {
      setError(err.message || 'Operational error registering contractor');
    }
  };

  return (
    <div className="flex flex-col p-4 md:p-6 lg:p-8 relative z-10 min-h-full w-full">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[var(--text-primary)]">Vendor Network Roster</h1>
          <p className="text-xs font-mono text-[var(--text-tertiary)] mt-1">Manage licensed field contractors registered for dispatches.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Contractors list */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex flex-col gap-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : contractors.length === 0 ? (
            <div className="p-8 border border-dashed border-[var(--border-muted)] text-center text-xs text-[var(--text-tertiary)] font-mono">
              NO LICENSED VENDORS REGISTERED IN CLUSTER
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {contractors.map((c) => (
                <div key={c.id} className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded flex justify-between items-center hover:border-[var(--accent-coral)] transition-all">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">{c.name}</h4>
                    <span className="text-xs text-[var(--accent-coral)] font-mono">{c.specialty}</span>
                    <div className="text-xs text-[var(--text-tertiary)] mt-1">Email: {c.email} | Phone: {c.phone || 'N/A'}</div>
                  </div>
                  <div>
                    <span className={`px-2 py-0.5 border rounded text-[9px] font-mono font-bold uppercase ${c.status === 'available' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                      {c.status || 'available'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form add contractor */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded p-5 h-fit">
          <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)] mb-3">List Contractor Manually</h3>
          
          {error && (
            <div className="p-2 mb-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-mono rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleAddContractor} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">Contractor Name</label>
              <input
                type="text"
                required
                placeholder="Robert Garcia"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[var(--bg-primary)] border border-[var(--border-strong)] hover:border-[var(--accent-coral)] focus:border-[var(--accent-coral)] outline-none rounded p-2 text-xs text-[var(--text-primary)]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">Email Address</label>
              <input
                type="email"
                required
                placeholder="robert@garciaelectrical.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[var(--bg-primary)] border border-[var(--border-strong)] hover:border-[var(--accent-coral)] focus:border-[var(--accent-coral)] outline-none rounded p-2 text-xs text-[var(--text-primary)]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">Specialty</label>
              <input
                type="text"
                required
                placeholder="Electrical Systems & HVAC"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="bg-[var(--bg-primary)] border border-[var(--border-strong)] hover:border-[var(--accent-coral)] focus:border-[var(--accent-coral)] outline-none rounded p-2 text-xs text-[var(--text-primary)]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">Phone Contact</label>
              <input
                type="text"
                placeholder="+1 (555) 341-9982"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-[var(--bg-primary)] border border-[var(--border-strong)] hover:border-[var(--accent-coral)] focus:border-[var(--accent-coral)] outline-none rounded p-2 text-xs text-[var(--text-primary)]"
              />
            </div>

            <button type="submit" className="w-full bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-black font-semibold text-xs py-2 rounded cursor-pointer transition-colors mt-2">
              Add Contractor
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
