'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';

declare global {
  interface Window {
    mapboxgl: any;
  }
}

interface OnboardingWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function OnboardingWizard({ onClose, onSuccess }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Property Details & Mapbox Location
  const [propertyName, setPropertyName] = useState('');
  const [country, setCountry] = useState('');
  const [coordinates, setCoordinates] = useState<{ lng: number; lat: number }>({ lng: 36.8219, lat: -1.2921 }); // Default Nairobi
  const [address, setAddress] = useState('');
  const [mapboxLoaded, setMapboxLoaded] = useState(false);

  // Step 2: Photo & Excel Upload
  const [photo, setPhoto] = useState<string | null>(null);
  const [tenantsData, setTenantsData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    vacant: 0,
    occupied: 0,
    arrears: 0
  });

  // Step 3: Fees configuration
  const [recurringFees, setRecurringFees] = useState({
    garbage: 300,
    security: 500,
    water: 1000
  });
  const [moveInFees, setMoveInFees] = useState({
    deposit: 25000,
    admin: 1500
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

  // Dynamic Mapbox Loader
  useEffect(() => {
    if (window.mapboxgl) {
      setMapboxLoaded(true);
      return;
    }
    const link = document.createElement('link');
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
    script.async = true;
    script.onload = () => setMapboxLoaded(true);
    document.body.appendChild(script);
  }, []);

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapboxLoaded || !mapContainerRef.current || step !== 1) return;

    window.mapboxgl.accessToken = mapboxToken;
    const map = new window.mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [coordinates.lng, coordinates.lat],
      zoom: 13
    });

    mapRef.current = map;

    // Draggable Marker
    const marker = new window.mapboxgl.Marker({
      draggable: true,
      color: '#ff6b6b'
    })
      .setLngLat([coordinates.lng, coordinates.lat])
      .addTo(map);

    markerRef.current = marker;

    // Handle marker dragend
    const onDragEnd = async () => {
      const lngLat = marker.getLngLat();
      setCoordinates({ lng: lngLat.lng, lat: lngLat.lat });
      await handleReverseGeocode(lngLat.lng, lngLat.lat);
    };

    marker.on('dragend', onDragEnd);

    // Map click handling
    map.on('click', async (e: any) => {
      marker.setLngLat(e.lngLat);
      setCoordinates({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      await handleReverseGeocode(e.lngLat.lng, e.lngLat.lat);
    });

    return () => {
      map.remove();
    };
  }, [mapboxLoaded, step]);

  const handleCountrySearch = async () => {
    if (!country) return;
    setError(null);
    try {
      const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(country)}.json?access_token=${mapboxToken}`);
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const center = data.features[0].center;
        setCoordinates({ lng: center[0], lat: center[1] });
        if (mapRef.current) {
          mapRef.current.flyTo({ center, zoom: 6 });
        }
        if (markerRef.current) {
          markerRef.current.setLngLat(center);
        }
        await handleReverseGeocode(center[0], center[1]);
      } else {
        setError('Country not found on map.');
      }
    } catch (err) {
      console.error(err);
      setError('Geocoding search failed.');
    }
  };

  const handleReverseGeocode = async (lng: number, lat: number) => {
    try {
      const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}`);
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        setAddress(data.features[0].place_name);
      } else {
        setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Step 2: Handle file selections
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0] || '';
        if (!wsname) throw new Error('No worksheets found in spreadsheet.');
        const ws = wb.Sheets[wsname];
        if (!ws) throw new Error('Worksheet could not be loaded.');
        const json: any[] = XLSX.utils.sheet_to_json(ws);

        // Process records
        let vacant = 0;
        let occupied = 0;
        let arrears = 0;

        const cleanData = json.map((row: any) => {
          const tenantName = row['Tenant Name']?.toString().trim() || '';
          const hasArrears = Number(row['Arrears (EUR)']) > 0;

          if (!tenantName) {
            vacant++;
          } else {
            occupied++;
            if (hasArrears) arrears++;
          }

          return {
            unit: row['Unit Name']?.toString() || 'Unnamed',
            type: row['Unit Type']?.toString() || 'Apartment',
            rent: Number(row['Rent (EUR)']) || 0,
            name: tenantName,
            phone: row['Tenant Phone']?.toString() || '',
            email: row['Tenant Email']?.toString() || '',
            arrears: Number(row['Arrears (EUR)']) || 0
          };
        });

        setTenantsData(cleanData);
        setStats({
          total: cleanData.length,
          vacant,
          occupied,
          arrears
        });
      } catch (err) {
        console.error(err);
        setError('Failed to parse Excel file. Please verify structure.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Step 4: Deploy & publish
  const handlePublish = async (targetStatus: 'Active' | 'Draft') => {
    setLoading(true);
    setError(null);

    const session = localStorage.getItem('user');
    if (!session) {
      setError('Please sign in again.');
      setLoading(false);
      return;
    }
    let token = '';
    try {
      const parsed = JSON.parse(session);
      token = parsed.id;
    } catch (e) {
      setError('Session expired.');
      setLoading(false);
      return;
    }

    // Map tenants list for deploy API
    const tenantsList = tenantsData
      .filter((t) => t.name) // Skip vacant units in tenant table
      .map((t) => ({
        name: t.name,
        email: t.email || `tenant_${t.unit.replace(/\s+/g, '_')}@landlord.local`,
        phone: t.phone,
        unit: t.unit,
        rent: t.rent.toString(),
        arrears: t.arrears,
        status: t.arrears > 0 ? 'Arrears' : 'Active'
      }));

    // Generate invoices for all tenants with arrears + add recurring fees
    const invoicesList = tenantsData
      .filter((t) => t.name && t.arrears > 0)
      .map((t) => {
        const totalDue = t.arrears + recurringFees.garbage + recurringFees.security + recurringFees.water;
        return {
          invoiceId: `INV-${Math.random().toString(36).substring(3, 9).toUpperCase()}`,
          tenantName: t.name,
          tenantEmail: t.email || `tenant_${t.unit.replace(/\s+/g, '_')}@landlord.local`,
          unitNumber: t.unit,
          amountDue: totalDue,
          propertyName: propertyName,
          status: 'Unpaid' as const
        };
      });

    const payload = {
      property: {
        name: propertyName,
        location: address || `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`,
        type: 'Apartment',
        unitsCount: stats.total || tenantsData.length,
        status: targetStatus
      },
      tenants: tenantsList,
      invoices: invoicesList
    };

    try {
      const res = await fetch('http://localhost:4000/api/properties/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errObj = await res.json();
        throw new Error(errObj.message || 'Deployment failure.');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error occurred during deployment.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded flex flex-col max-h-[90vh] overflow-hidden shadow-2xl relative">
        
        {/* Shimmer skeleton overlay during backend requests */}
        {loading && (
          <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center gap-4">
            <div className="w-48 h-4 bg-[var(--border-strong)] rounded animate-pulse overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer"></div>
            </div>
            <span className="font-mono text-xs text-[var(--accent-coral)] tracking-widest uppercase animate-pulse">
              Deploying Property Cluster...
            </span>
          </div>
        )}

        {/* Header */}
        <div className="p-5 border-b border-[var(--border-muted)] flex justify-between items-center bg-[var(--bg-primary)]">
          <div>
            <h2 className="font-heading text-lg font-bold text-[var(--text-primary)]">Property Deployment Wizard</h2>
            <p className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5">
              Step {step} of 4 • {step === 1 ? 'Location Mapping' : step === 2 ? 'Data Assets' : step === 3 ? 'Operational Tariffs' : 'Review & Publish'}
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-sm font-mono cursor-pointer">
            [ESC] CANCEL
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-mono rounded">
              [CRITICAL ERROR] {error}
            </div>
          )}

          {/* STEP 1: Country & Mapbox Placement */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">Property Identity Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lumina Heights Towers"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    className="bg-[var(--bg-primary)] border border-[var(--border-strong)] hover:border-[var(--accent-coral)] focus:border-[var(--accent-coral)] outline-none rounded p-2.5 text-xs text-[var(--text-primary)]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">Target Country</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Netherlands or Kenya"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCountrySearch()}
                      className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-strong)] hover:border-[var(--accent-coral)] focus:border-[var(--accent-coral)] outline-none rounded p-2.5 text-xs text-[var(--text-primary)]"
                    />
                    <button 
                      onClick={handleCountrySearch}
                      className="bg-[var(--bg-primary)] border border-[var(--border-strong)] hover:border-[var(--accent-coral)] text-xs px-4 rounded text-[var(--text-primary)] cursor-pointer"
                    >
                      Locate
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">Pinpoint Location (Click or Drag Marker)</label>
                <div 
                  ref={mapContainerRef} 
                  className="w-full h-72 rounded border border-[var(--border-muted)] bg-[var(--bg-primary)] overflow-hidden"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-[var(--bg-primary)] border border-[var(--border-muted)] p-3 rounded">
                <div>
                  <span className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase block">Resolved Address</span>
                  <span className="font-semibold text-[var(--text-primary)] mt-1 block truncate">{address || 'Waiting for map pin...'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase block">Geodetic Coordinates</span>
                  <span className="font-mono text-[var(--text-primary)] mt-1 block">
                    Lat: {coordinates.lat.toFixed(5)} • Lng: {coordinates.lng.toFixed(5)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Photo & Excel Upload & Preview */}
          {step === 2 && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Photo Upload Card */}
                <div className="bg-[var(--bg-primary)] border border-[var(--border-muted)] p-5 rounded flex flex-col gap-4">
                  <h4 className="text-[11px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">Apartment Photo Attachment</h4>
                  
                  {photo ? (
                    <div className="w-full h-32 rounded border border-[var(--border-muted)] overflow-hidden relative group">
                      <img src={photo} alt="Upload preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setPhoto(null)} 
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-red-500 font-mono transition-opacity cursor-pointer"
                      >
                        REMOVE IMAGE
                      </button>
                    </div>
                  ) : (
                    <label className="w-full h-32 border border-dashed border-[var(--border-strong)] hover:border-[var(--accent-coral)] rounded flex flex-col items-center justify-center gap-2 cursor-pointer bg-[var(--bg-secondary)] transition-colors">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-tertiary)]">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                      <span className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">Upload Photo</span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  )}
                </div>

                {/* Excel Upload Card */}
                <div className="bg-[var(--bg-primary)] border border-[var(--border-muted)] p-5 rounded flex flex-col gap-4">
                  <h4 className="text-[11px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">Tenant Directory Spreadsheet</h4>
                  
                  <label className="w-full h-32 border border-dashed border-[var(--border-strong)] hover:border-[var(--accent-coral)] rounded flex flex-col items-center justify-center gap-2 cursor-pointer bg-[var(--bg-secondary)] transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-tertiary)]">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <span className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">
                      {tenantsData.length > 0 ? 'Change Excel Sheet' : 'Upload Spreadsheet (.xlsx)'}
                    </span>
                    <input type="file" accept=".xlsx" onChange={handleExcelUpload} className="hidden" />
                  </label>
                </div>

              </div>

              {/* parsed spreadsheet preview */}
              {tenantsData.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h4 className="text-[11px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">Spreadsheet Summary Matrix</h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[var(--bg-primary)] border border-[var(--border-muted)] p-3 rounded text-center">
                      <span className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase block">Total Units</span>
                      <span className="text-lg font-heading font-semibold text-[var(--text-primary)] mt-1 block">{stats.total}</span>
                    </div>
                    <div className="bg-[var(--bg-primary)] border border-[var(--border-muted)] p-3 rounded text-center">
                      <span className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase block">Occupied Units</span>
                      <span className="text-lg font-heading font-semibold text-emerald-500 mt-1 block">{stats.occupied}</span>
                    </div>
                    <div className="bg-[var(--bg-primary)] border border-[var(--border-muted)] p-3 rounded text-center">
                      <span className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase block">Vacant Units</span>
                      <span className="text-lg font-heading font-semibold text-amber-500 mt-1 block">{stats.vacant}</span>
                    </div>
                    <div className="bg-[var(--bg-primary)] border border-[var(--border-muted)] p-3 rounded text-center">
                      <span className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase block">Units in Arrears</span>
                      <span className="text-lg font-heading font-semibold text-[var(--color-coral-500)] mt-1 block">{stats.arrears}</span>
                    </div>
                  </div>

                  <div className="bg-[var(--bg-primary)] border border-[var(--border-muted)] rounded overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-muted)] font-mono text-[9px] text-[var(--text-tertiary)] uppercase">
                          <th className="p-2">Unit</th>
                          <th className="p-2">Tenant Name</th>
                          <th className="p-2">Rent (EUR)</th>
                          <th className="p-2">Arrears (EUR)</th>
                          <th className="p-2 text-right">Preview State</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tenantsData.slice(0, 15).map((row, i) => (
                          <tr key={i} className="border-b border-[var(--border-muted)] font-mono hover:bg-[var(--bg-secondary)]/40">
                            <td className="p-2 font-bold">{row.unit}</td>
                            <td className="p-2">{row.name || '[Vacant Unit]'}</td>
                            <td className="p-2">€{row.rent.toLocaleString()}</td>
                            <td className="p-2">{row.arrears > 0 ? `€${row.arrears.toLocaleString()}` : '0'}</td>
                            <td className="p-2 text-right">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${!row.name ? 'bg-amber-500/10 text-amber-500' : row.arrears > 0 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                {!row.name ? 'VACANT' : row.arrears > 0 ? 'ARREARS' : 'ACTIVE'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {tenantsData.length > 15 && (
                      <div className="p-2 text-center text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-secondary)] border-t border-[var(--border-muted)] font-mono">
                        Showing first 15 of {tenantsData.length} records.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Recurring & Move-in Fees */}
          {step === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Recurring Fees Card */}
              <div className="bg-[var(--bg-primary)] border border-[var(--border-muted)] p-5 rounded flex flex-col gap-4">
                <h4 className="text-[11px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">Recurring Monthly Tariffs</h4>
                
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">Garbage Levy (EUR)</label>
                    <input
                      type="number"
                      value={recurringFees.garbage}
                      onChange={(e) => setRecurringFees(prev => ({ ...prev, garbage: Number(e.target.value) }))}
                      className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] hover:border-[var(--accent-coral)] outline-none rounded p-2 text-xs text-[var(--text-primary)]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">Security Maintenance (EUR)</label>
                    <input
                      type="number"
                      value={recurringFees.security}
                      onChange={(e) => setRecurringFees(prev => ({ ...prev, security: Number(e.target.value) }))}
                      className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] hover:border-[var(--accent-coral)] outline-none rounded p-2 text-xs text-[var(--text-primary)]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">Water flat fee (EUR)</label>
                    <input
                      type="number"
                      value={recurringFees.water}
                      onChange={(e) => setRecurringFees(prev => ({ ...prev, water: Number(e.target.value) }))}
                      className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] hover:border-[var(--accent-coral)] outline-none rounded p-2 text-xs text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              </div>

              {/* Move In Fees Card */}
              <div className="bg-[var(--bg-primary)] border border-[var(--border-muted)] p-5 rounded flex flex-col gap-4">
                <h4 className="text-[11px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">Move-In Tariff Setup</h4>
                
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">Refundable Deposit (EUR)</label>
                    <input
                      type="number"
                      value={moveInFees.deposit}
                      onChange={(e) => setMoveInFees(prev => ({ ...prev, deposit: Number(e.target.value) }))}
                      className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] hover:border-[var(--accent-coral)] outline-none rounded p-2 text-xs text-[var(--text-primary)]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">One-time Lease Admin Fee (EUR)</label>
                    <input
                      type="number"
                      value={moveInFees.admin}
                      onChange={(e) => setMoveInFees(prev => ({ ...prev, admin: Number(e.target.value) }))}
                      className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] hover:border-[var(--accent-coral)] outline-none rounded p-2 text-xs text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* STEP 4: Review & Final Confirmation */}
          {step === 4 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Asset Identity Info */}
              <div className="md:col-span-1 flex flex-col gap-4">
                <div className="bg-[var(--bg-primary)] border border-[var(--border-muted)] p-4 rounded flex flex-col gap-2">
                  <h4 className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase block">Property Assets</h4>
                  <span className="font-heading text-lg font-bold text-[var(--text-primary)]">{propertyName}</span>
                  {photo && (
                    <div className="w-full h-24 rounded border border-[var(--border-muted)] overflow-hidden mt-2">
                      <img src={photo} alt="Asset photo" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                
                <div className="bg-[var(--bg-primary)] border border-[var(--border-muted)] p-4 rounded flex flex-col gap-2 text-xs">
                  <span className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase block">Location Pinpoint</span>
                  <span className="text-[var(--text-primary)] truncate font-semibold block">{address}</span>
                  <span className="font-mono text-[var(--text-tertiary)] block text-[10px]">
                    Lat: {coordinates.lat.toFixed(4)} • Lng: {coordinates.lng.toFixed(4)}
                  </span>
                </div>
              </div>

              {/* Data asset verification & preview */}
              <div className="md:col-span-2 flex flex-col gap-4">
                <div className="bg-[var(--bg-primary)] border border-[var(--border-muted)] p-5 rounded">
                  <h4 className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider mb-4">Deployment Calculations Summary</h4>
                  
                  <div className="grid grid-cols-3 gap-4 border-b border-[var(--border-muted)] pb-4 mb-4 text-xs font-mono text-center">
                    <div>
                      <span className="text-[var(--text-tertiary)] block">Total Units</span>
                      <strong className="text-sm text-[var(--text-primary)] block mt-0.5">{stats.total}</strong>
                    </div>
                    <div>
                      <span className="text-[var(--text-tertiary)] block">Tenants Parsed</span>
                      <strong className="text-sm text-emerald-500 block mt-0.5">{stats.occupied}</strong>
                    </div>
                    <div>
                      <span className="text-[var(--text-tertiary)] block">Invoices Generated</span>
                      <strong className="text-sm text-[var(--color-coral-500)] block mt-0.5">{stats.arrears}</strong>
                    </div>
                  </div>

                  <div className="text-xs flex flex-col gap-2">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Recurring Garbage Levy:</span>
                      <span className="font-mono text-[var(--text-primary)]">€{recurringFees.garbage.toLocaleString()} / mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Recurring Security Maintenance:</span>
                      <span className="font-mono text-[var(--text-primary)]">€{recurringFees.security.toLocaleString()} / mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Recurring Water Maintenance:</span>
                      <span className="font-mono text-[var(--text-primary)]">€{recurringFees.water.toLocaleString()} / mo</span>
                    </div>
                    <div className="flex justify-between border-t border-[var(--border-muted)] pt-2 mt-1">
                      <span className="text-[var(--text-secondary)]">Total Monthly Operational Fee:</span>
                      <span className="font-mono font-bold text-emerald-500">
                        €{(recurringFees.garbage + recurringFees.security + recurringFees.water).toLocaleString()} / unit
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded text-xs text-emerald-400 font-mono">
                  [SUCCESS] Location Geocode, Property Assets, Tenant Profiles, and invoice reconciliation models successfully prepared. Tap Publish to write database entries.
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-[var(--border-muted)] bg-[var(--bg-primary)] flex justify-between">
          <button
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className="border border-[var(--border-strong)] hover:border-[var(--text-primary)] disabled:opacity-40 disabled:hover:border-[var(--border-strong)] text-[var(--text-primary)] text-xs px-4 py-2 rounded transition-colors cursor-pointer"
          >
            BACK
          </button>
          
          {step < 4 ? (
            <button
              disabled={step === 1 && (!propertyName || !address)}
              onClick={() => setStep(step + 1)}
              className="bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] disabled:opacity-50 text-black font-semibold text-xs px-6 py-2 rounded cursor-pointer transition-colors"
            >
              NEXT STEP
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => handlePublish('Draft')}
                className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] hover:border-[var(--text-primary)] text-[var(--text-primary)] font-semibold text-xs px-5 py-2 rounded cursor-pointer transition-colors"
              >
                SAVE AS DRAFT
              </button>
              <button
                onClick={() => handlePublish('Active')}
                className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs px-8 py-2 rounded cursor-pointer transition-colors"
              >
                DEPLOY & PUBLISH
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
