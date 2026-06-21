'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import * as XLSX from 'xlsx';
import ToastContainer from '../../components/ToastContainer';
import { useToast } from '../../hooks/useToast';

interface UnitDetails {
  unitNumber: string;
  occupant: string;
  rentAmount: number;
  arrears: number;
  email: string;
  emergency: string;
}

interface PropertyDetails {
  name: string;
  location: string;
  type: string;
  units: UnitDetails[];
}

interface FeeDetails {
  name: string;
  amount: number;
}

interface InvoiceDetails {
  invoiceId: string;
  tenantName: string;
  unitNumber: string;
  amountDue: number;
  propertyName: string;
  status: 'Unpaid' | 'Sent' | 'Paid';
}

function NewPropertyOrchestratorContent() {
  const { toasts, addToast, removeToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'upload' | 'preview' | 'billing' | 'invoices'>('upload');
  
  // App state corresponding to the orchestrator control
  const [property, setProperty] = useState<PropertyDetails>({
    name: '',
    location: '',
    type: 'Residential',
    units: []
  });
  const [fees, setFees] = useState<FeeDetails[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDetails[]>([]);
  const [csvData, setCsvData] = useState<string>('');
  const [hasFile, setHasFile] = useState(false);

  // Manual Unit Entry form states
  const [manualFloor, setManualFloor] = useState('1');
  const [manualUnitName, setManualUnitName] = useState('');
  const [manualUnitType, setManualUnitType] = useState('2 Bedroom');
  const [manualRent, setManualRent] = useState('25000');
  const [manualTenantName, setManualTenantName] = useState('');
  const [manualTenantPhone, setManualTenantPhone] = useState('');
  const [manualTenantEmail, setManualTenantEmail] = useState('');
  const [manualMoveInDate, setManualMoveInDate] = useState('2023-05-26');
  const [manualArrears, setManualArrears] = useState('0');

  // Chat/Orchestration States
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [subagents, setSubagents] = useState<Array<{ name: string; taskDescription: string; actionId: string; status: 'PROCESSING' | 'COMPLETE' }>>([]);
  
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  // Load user session
  useEffect(() => {
    const session = localStorage.getItem('user');
    if (!session || session === 'null' || session === 'undefined') {
      window.location.href = '/login';
      return;
    }

    try {
      const parsed = JSON.parse(session);
      setUser(parsed);
      
      const landlordName = parsed.name || 'Landlord';
      setChatHistory([
        {
          role: 'model',
          parts: [{
            text: `Hi ${landlordName}! I am your AI assistant. Drop your property ledger (.xlsx) or lease details here, and I'll deploy your automated tenant structures.`
          }]
        }
      ]);
      setLoading(false);
    } catch (e) {
      window.location.href = '/login';
    }
  }, []);

  // Scroll chat to bottom on updates
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory, isTyping]);

  // Excel parsing and verification mapping
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setChatHistory(prev => [
      ...prev,
      { role: 'user', parts: [{ text: `[Attached File: ${file.name}]` }] }
    ]);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('No sheets found in workbook');
        }
        
        // Strict Sheet Name Check
        if (firstSheetName !== 'Property Setup') {
          throw new Error("Invalid spreadsheet format. Template sheet name must be 'Property Setup'.");
        }
        
        const worksheet = workbook.Sheets[firstSheetName];
        if (!worksheet) {
          throw new Error("Worksheet 'Property Setup' not found.");
        }
        
        // Read rows JSON to validate column structure
        const rows = XLSX.utils.sheet_to_json<any>(worksheet);
        if (rows.length === 0) {
          throw new Error("Spreadsheet contains no data rows.");
        }
        
        // Validate required headers match sample format exactly
        const firstRowKeys = Object.keys(rows[0]);
        const requiredKeys = ['Floor', 'Unit Name', 'Rent (KES)', 'Tenant Name', 'Arrears (KES)'];
        const missing = requiredKeys.filter(k => !firstRowKeys.includes(k));
        if (missing.length > 0) {
          throw new Error(`Invalid template format. Missing column(s): ${missing.join(', ')}`);
        }
        
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        setCsvData(csv);
        setHasFile(true);
        
        // Extract and map row content
        const mappedUnits: UnitDetails[] = rows.map((row: any) => ({
          unitNumber: String(row['Unit Name'] || ''),
          occupant: String(row['Tenant Name'] || ''),
          rentAmount: Number(row['Rent (KES)'] || 0),
          arrears: Number(row['Arrears (KES)'] || 0),
          email: String(row['Tenant Email'] || ''),
          emergency: String(row['Kin 1 Name'] ? `${row['Kin 1 Name']} (${row['Kin 1 Relation'] || ''}): ${row['Kin 1 Phone'] || ''}` : '')
        }));
        
        setProperty(prev => ({
          ...prev,
          units: mappedUnits
        }));
        
        const systemPrompt = `[SYSTEM EVENT: Landlord ${user?.name || 'User'} uploaded Excel file "${file.name}". It is parsed and has ${mappedUnits.length} units. Here is a preview of the data: \n${csv.substring(0, 1000)}...\n\nCRITICAL INSTRUCTION: You are the AI Orchestrator. Analyze the data. Tell the user what you found. Set action to "generate_grid" and view to "preview".]`;
        await processAIRequest(systemPrompt, true);
        addToast('Excel ledger validated and parsed successfully', 'success');
      } catch (err: any) {
        const errMsg = err.message || "Error reading spreadsheet file.";
        setChatHistory(prev => [
          ...prev,
          { role: 'model', parts: [{ text: `Error: ${errMsg} Please verify it matches the required format template.` }] }
        ]);
        addToast(errMsg, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Manual Unit Entry Handler
  const handleAddUnitManually = () => {
    if (!manualUnitName.trim()) {
      addToast('Please enter a Unit Name.', 'error');
      return;
    }
    
    const newUnit: UnitDetails = {
      unitNumber: manualUnitName,
      occupant: manualTenantName,
      rentAmount: Number(manualRent) || 0,
      arrears: Number(manualArrears) || 0,
      email: manualTenantEmail,
      emergency: manualTenantPhone ? `${manualTenantPhone}` : ''
    };

    setProperty(prev => ({
      ...prev,
      units: [...prev.units, newUnit]
    }));

    // Clear inputs
    setManualUnitName('');
    setManualTenantName('');
    setManualTenantPhone('');
    setManualTenantEmail('');
    setManualArrears('0');
    
    addToast(`Unit ${manualUnitName} added to the setup grid.`, 'success');
  };

  // Mutate local state from updates
  const applyUnitUpdates = (updates: Array<{ unitNumber: string; status: 'paid' | 'arrears' | 'vacant' }>) => {
    if (!csvData) return;
    const lines = csvData.split('\n');
    if (lines.length < 2) return;

    const firstLine = lines[0];
    if (!firstLine) return;
    const headers = firstLine.split(',');
    const unitIdx = headers.findIndex(h => h.toLowerCase().includes('unit'));
    const statusIdx = headers.findIndex(h => h.toLowerCase().includes('status'));

    if (unitIdx === -1 || statusIdx === -1) return;

    let wasModified = false;
    const newLines = lines.map((line, idx) => {
      if (idx === 0) return line;
      const cols = line.split(',');
      const match = updates.find(u => u.unitNumber === cols[unitIdx]?.trim());
      if (match) {
        cols[statusIdx] = match.status;
        wasModified = true;
        return cols.join(',');
      }
      return line;
    });

    if (wasModified) {
      const updatedCsv = newLines.join('\n');
      setCsvData(updatedCsv);
      if (view === 'preview') {
        executeGridGeneration(updatedCsv);
      }
    }
  };

  // Primary AI request processor
  const processAIRequest = async (userInput: string, isSystem = false) => {
    setIsTyping(true);

    const tempState = {
      view,
      property: { name: property.name, location: property.location, type: property.type },
      fees,
      hasFile
    };

    const cleanInput = isSystem ? userInput : `User says: "${userInput}"\n\nCurrent State:\n${JSON.stringify(tempState)}`;
    
    const newHistory = [...chatHistory, { role: 'user' as const, parts: [{ text: cleanInput }] }];
    setChatHistory(newHistory);

    const systemInstruction = `You are the property portal AI assistant.
RULES:
1. Control the dashboard view by setting the 'view' field.
2. In 'upload' view: If details about the property name/location/type are provided, populate the 'property' field.
3. If 'hasFile' is true AND you have the property name and location, set action to "generate_grid" and view to "preview". Spawn a named subagent (e.g. "Atlas") with actionId "generate_grid".
4. If asked to generate invoices for arrears, set view to "invoices", action to "generate_invoices", and spawn a subagent with actionId "generate_invoices".
5. To reset data/upload a new file, set 'resetFile' to true and view to "upload".
6. To change a unit's status, add it to 'unitUpdates' and spawn a subagent with actionId "mutate_data".
7. Keep 'aiMessage' concise, human-centric, and empathetic.`;

    const responseSchema = {
      type: "OBJECT",
      properties: {
        aiMessage: { type: "STRING" },
        view: { type: "STRING", enum: ["upload", "preview", "billing", "invoices"] },
        action: { type: "STRING", enum: ["none", "generate_grid", "generate_invoices", "complete"] },
        resetFile: { type: "BOOLEAN" },
        property: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            location: { type: "STRING" },
            type: { type: "STRING" }
          }
        },
        fees: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              amount: { type: "NUMBER" }
            }
          }
        },
        unitUpdates: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              unitNumber: { type: "STRING" },
              status: { type: "STRING", enum: ["paid", "arrears", "vacant"] }
            }
          }
        },
        subagents: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              taskDescription: { type: "STRING" },
              actionId: { type: "STRING", enum: ["analyze_csv", "generate_grid", "generate_invoices", "mutate_data"] }
            }
          }
        }
      },
      required: ["aiMessage", "view", "action", "property", "fees", "resetFile"]
    };

    try {
      const response = await fetch('/api/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory,
          systemInstruction,
          responseSchema
        })
      });

      if (!response.ok) throw new Error('Failed to retrieve AI completion');

      const data = await response.json();
      
      setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: data.aiMessage }] }]);
      setIsTyping(false);

      if (data.resetFile) {
        setCsvData('');
        setHasFile(false);
        setProperty({ name: '', location: '', type: 'Residential', units: [] });
        setFees([]);
        setInvoices([]);
        setSubagents([]);
      } else {
        if (data.property) {
          setProperty(prev => ({
            ...prev,
            name: data.property.name || prev.name,
            location: data.property.location || prev.location,
            type: data.property.type || prev.type
          }));
        }
        if (data.fees) setFees(data.fees);
      }

      if (data.view) setView(data.view);

      if (data.unitUpdates && data.unitUpdates.length > 0) {
        applyUnitUpdates(data.unitUpdates);
      }

      if (data.subagents && data.subagents.length > 0) {
        const newAgents = data.subagents.map((sa: any) => ({
          ...sa,
          status: 'PROCESSING' as const
        }));
        setSubagents(prev => [...prev, ...newAgents]);

        newAgents.forEach((agent: any) => {
          setTimeout(() => {
            setSubagents(current => 
              current.map(a => a.actionId === agent.actionId ? { ...a, status: 'COMPLETE' } : a)
            );
          }, 2500);
        });
      }

      if (data.action === "generate_grid" && csvData) {
        await executeGridGeneration(csvData);
      }
      if (data.action === "generate_invoices" && csvData) {
        await executeInvoiceGeneration(csvData);
      }

    } catch (error) {
      console.error(error);
      setIsTyping(false);
      setChatHistory(prev => [
        ...prev,
        { role: 'model', parts: [{ text: "Communication node offline. Please retry your input." }] }
      ]);
    }
  };

  const executeGridGeneration = async (csv: string) => {
    try {
      const response = await fetch('/api/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              parts: [{ text: `Convert this CSV into building architecture JSON. Group by floor level descending. Include occupant names and arrears in the units array. CSV: \n${csv}` }]
            }
          ],
          responseSchema: {
            type: "OBJECT",
            properties: {
              units: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    unitNumber: { type: "STRING" },
                    occupant: { type: "STRING" },
                    rentAmount: { type: "NUMBER" },
                    arrears: { type: "NUMBER" },
                    email: { type: "STRING" },
                    emergency: { type: "STRING" }
                  }
                }
              }
            },
            required: ["units"]
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setProperty(prev => ({
          ...prev,
          units: data.units || []
        }));
      }
    } catch (err) {
      console.error('Grid generation error:', err);
    }
  };

  const executeInvoiceGeneration = async (csv: string) => {
    try {
      const response = await fetch('/api/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              parts: [{ text: `Extract all tenants in arrears (outstanding balance > 0) and generate list of invoice records. CSV:\n${csv}` }]
            }
          ],
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                invoiceId: { type: "STRING" },
                tenantName: { type: "STRING" },
                unitNumber: { type: "STRING" },
                amountDue: { type: "NUMBER" }
              }
            }
          }
        })
      });

      if (response.ok) {
        const invoicesList = await response.json();
        const fullInvoices = invoicesList.map((inv: any) => ({
          ...inv,
          propertyName: property.name || 'My Complex',
          status: 'Unpaid' as const
        }));
        setInvoices(fullInvoices);
      }
    } catch (err) {
      console.error('Invoice generation error:', err);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput('');
    processAIRequest(msg);
  };

  const handleDeployAssets = async () => {
    const currentTenants = property.units
      .filter(u => u.occupant.trim().length > 0)
      .map(u => ({
        id: `tenant-${Math.random().toString(36).substring(7)}`,
        name: u.occupant,
        email: u.email || `${u.occupant.toLowerCase().replace(/\s+/g, '')}@example.com`,
        phone: u.emergency || '+1 (555) 901-2345',
        unit: u.unitNumber,
        property: property.name,
        rent: `$${u.rentAmount.toLocaleString()}`,
        arrears: u.arrears,
        status: u.arrears > 0 ? 'Arrears' : 'Active'
      }));

    const currentInvoices = invoices.length > 0 ? invoices : property.units
      .filter(u => u.arrears > 0)
      .map(u => ({
        invoiceId: `INV-${Math.random().toString(36).substring(3, 9).toUpperCase()}`,
        tenantName: u.occupant,
        unitNumber: u.unitNumber,
        amountDue: u.arrears,
        propertyName: property.name,
        status: 'Unpaid' as const
      }));

    try {
      const response = await fetch('http://localhost:4000/api/properties/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify({
          property: {
            name: property.name,
            location: property.location,
            type: property.type,
            unitsCount: property.units.length
          },
          tenants: currentTenants,
          invoices: currentInvoices
        })
      });

      if (!response.ok) {
        throw new Error('Failed to deploy ledger configuration to backend database');
      }

      const resData = await response.json();

      localStorage.setItem('properties', JSON.stringify(resData.properties));
      localStorage.setItem('tenants', JSON.stringify(resData.tenants));
      localStorage.setItem('invoices', JSON.stringify(resData.invoices));
      localStorage.setItem('onboarded', 'true');

      alert('Ledger configuration successfully deployed to workspace dashboard.');
      window.location.href = '/landlord';
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Error deploying configuration to database', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#05080b', color: '#e6e1d8' }}>
        <span>Loading AI Environment...</span>
      </div>
    );
  }

  const getGroupedFloors = () => {
    const floorMap: { [key: string]: typeof property.units } = {};
    property.units.forEach(u => {
      const matches = u.unitNumber.match(/\d+/);
      const floorNum = (matches && matches[0] && matches[0][0]) || '1';
      if (!floorMap[floorNum]) floorMap[floorNum] = [];
      floorMap[floorNum].push(u);
    });
    return Object.entries(floorMap).sort((a, b) => b[0].localeCompare(a[0]));
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#05080b', color: '#e6e1d8', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      
      {/* Global Style Tokens */}
      <style jsx global>{`
        .bg-dots {
          background-image: radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .card-border {
          border: 1px solid #1a2027;
          background-color: rgba(17, 22, 29, 0.6);
          backdrop-filter: blur(8px);
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1a2027; border-radius: 2px; }
      `}</style>

      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* LEFT AREA: Visual Workspace */}
      <main className="bg-dots" style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #1a2027', position: 'relative', minWidth: 0 }}>
        
        {/* Workspace Header */}
        <header style={{ height: '56px', borderBottom: '1px solid #1a2027', backgroundColor: 'rgba(5, 8, 11, 0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8f5ef' }}>Property Ledger Deployer</span>
          </div>

          {/* Navigation Controls */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'upload', label: 'WORKSPACE' },
              { id: 'preview', label: 'PREVIEW' },
              { id: 'billing', label: 'BILLING' },
              { id: 'invoices', label: 'INVOICES' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id as any)}
                style={{
                  padding: '4px 12px', border: 'none', borderRadius: '2px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace', transition: 'background-color 0.15s',
                  backgroundColor: view === tab.id ? '#ff6b6b' : '#11161d',
                  color: view === tab.id ? '#0a0f14' : '#a39c92'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {/* Workspace content wrapper */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          
          {/* UPLOAD & MANUAL WORKSPACE VIEW */}
          {view === 'upload' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
              
              {/* Left Column: Properties Metadata Config & File Drag */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Intro Card */}
                <div className="card-border" style={{ borderRadius: '2px', padding: '24px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#11161d', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: '#ff6b6b', border: '1px solid #1a2027' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#f8f5ef', margin: 0 }}>Deploy Property Ledger</h1>
                  <p style={{ fontSize: '12px', color: '#a39c92', marginTop: '6px', lineHeight: '1.4', margin: 0 }}>
                    Upload your landlord property spreadsheet (.xlsx) via the chat terminal attachment panel. Note: Excel sheet name and headers must match the template configuration.
                  </p>
                </div>

                {/* Metadata Settings Card */}
                <div className="card-border" style={{ borderRadius: '2px', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #11161d', paddingBottom: '12px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#343f4c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Extracted Metadata</span>
                    {hasFile && (
                      <span style={{ fontSize: '9px', color: '#34d399', fontFamily: 'monospace', fontWeight: 'bold' }}>● LEDGER ATTACHED</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '10px', fontFamily: 'monospace', color: '#343f4c', display: 'block', marginBottom: '4px' }}>PROPERTY NAME</label>
                      <input
                        type="text"
                        value={property.name}
                        onChange={e => setProperty({ ...property, name: e.target.value })}
                        placeholder="e.g. Oakridge Heights Complex"
                        style={{ width: '100%', backgroundColor: '#11161d', border: '1px solid #1a2027', borderRadius: '2px', padding: '8px 12px', fontSize: '12px', color: '#f8f5ef', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', fontFamily: 'monospace', color: '#343f4c', display: 'block', marginBottom: '4px' }}>LOCATION / ADDRESS</label>
                      <input
                        type="text"
                        value={property.location}
                        onChange={e => setProperty({ ...property, location: e.target.value })}
                        placeholder="e.g. 123 Pine St, Dallas TX"
                        style={{ width: '100%', backgroundColor: '#11161d', border: '1px solid #1a2027', borderRadius: '2px', padding: '8px 12px', fontSize: '12px', color: '#f8f5ef', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', fontFamily: 'monospace', color: '#343f4c', display: 'block', marginBottom: '4px' }}>ASSET TYPE</label>
                      <select
                        value={property.type}
                        onChange={e => setProperty({ ...property, type: e.target.value })}
                        style={{ width: '100%', backgroundColor: '#11161d', border: '1px solid #1a2027', borderRadius: '2px', padding: '8px 12px', fontSize: '12px', color: '#f8f5ef', outline: 'none' }}
                      >
                        <option value="Residential">Residential</option>
                        <option value="Commercial">Commercial</option>
                      </select>
                    </div>
                  </div>

                  {property.units.length > 0 && (
                    <button
                      onClick={handleDeployAssets}
                      style={{
                        marginTop: '20px', width: '100%', padding: '10px 0', backgroundColor: '#ff6b6b', border: 'none', borderRadius: '2px', color: '#0a0f14', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
                      }}
                    >
                      Deploy Assets to Live Ledger ({property.units.length} units)
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: Manual Unit Entry Form */}
              <div className="card-border" style={{ borderRadius: '2px', padding: '24px', display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
                <div style={{ borderBottom: '1px solid #11161d', paddingBottom: '12px', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#f8f5ef', margin: 0 }}>Manually Add Unit</h2>
                  <p style={{ fontSize: '11px', color: '#a39c92', margin: '4px 0 0 0' }}>Manually register unit nodes into ledger structure.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '9px', fontFamily: 'monospace', color: '#343f4c', display: 'block', marginBottom: '2px' }}>FLOOR</label>
                      <input
                        type="text"
                        value={manualFloor}
                        onChange={e => setManualFloor(e.target.value)}
                        placeholder="e.g. 1"
                        style={{ width: '100%', backgroundColor: '#11161d', border: '1px solid #1a2027', borderRadius: '2px', padding: '6px 8px', fontSize: '11px', color: '#f8f5ef', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '9px', fontFamily: 'monospace', color: '#343f4c', display: 'block', marginBottom: '2px' }}>UNIT NAME / NO</label>
                      <input
                        type="text"
                        value={manualUnitName}
                        onChange={e => setManualUnitName(e.target.value)}
                        placeholder="e.g. 101"
                        style={{ width: '100%', backgroundColor: '#11161d', border: '1px solid #1a2027', borderRadius: '2px', padding: '6px 8px', fontSize: '11px', color: '#f8f5ef', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '9px', fontFamily: 'monospace', color: '#343f4c', display: 'block', marginBottom: '2px' }}>UNIT CONFIG TYPE</label>
                      <input
                        type="text"
                        value={manualUnitType}
                        onChange={e => setManualUnitType(e.target.value)}
                        placeholder="e.g. 2 Bedroom"
                        style={{ width: '100%', backgroundColor: '#11161d', border: '1px solid #1a2027', borderRadius: '2px', padding: '6px 8px', fontSize: '11px', color: '#f8f5ef', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '9px', fontFamily: 'monospace', color: '#343f4c', display: 'block', marginBottom: '2px' }}>RENT AMOUNT (KES)</label>
                      <input
                        type="number"
                        value={manualRent}
                        onChange={e => setManualRent(e.target.value)}
                        style={{ width: '100%', backgroundColor: '#11161d', border: '1px solid #1a2027', borderRadius: '2px', padding: '6px 8px', fontSize: '11px', color: '#f8f5ef', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(17,22,29,0.5)', marginTop: '8px', paddingTop: '8px' }}>
                    <label style={{ fontSize: '9px', fontFamily: 'monospace', color: '#343f4c', display: 'block', marginBottom: '2px' }}>TENANT NAME</label>
                    <input
                      type="text"
                      value={manualTenantName}
                      onChange={e => setManualTenantName(e.target.value)}
                      placeholder="Full Name"
                      style={{ width: '100%', backgroundColor: '#11161d', border: '1px solid #1a2027', borderRadius: '2px', padding: '6px 8px', fontSize: '11px', color: '#f8f5ef', outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '9px', fontFamily: 'monospace', color: '#343f4c', display: 'block', marginBottom: '2px' }}>TENANT PHONE</label>
                      <input
                        type="text"
                        value={manualTenantPhone}
                        onChange={e => setManualTenantPhone(e.target.value)}
                        placeholder="Phone No"
                        style={{ width: '100%', backgroundColor: '#11161d', border: '1px solid #1a2027', borderRadius: '2px', padding: '6px 8px', fontSize: '11px', color: '#f8f5ef', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '9px', fontFamily: 'monospace', color: '#343f4c', display: 'block', marginBottom: '2px' }}>TENANT EMAIL</label>
                      <input
                        type="email"
                        value={manualTenantEmail}
                        onChange={e => setManualTenantEmail(e.target.value)}
                        placeholder="Email Address"
                        style={{ width: '100%', backgroundColor: '#11161d', border: '1px solid #1a2027', borderRadius: '2px', padding: '6px 8px', fontSize: '11px', color: '#f8f5ef', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '9px', fontFamily: 'monospace', color: '#343f4c', display: 'block', marginBottom: '2px' }}>MOVE IN DATE</label>
                      <input
                        type="date"
                        value={manualMoveInDate}
                        onChange={e => setManualMoveInDate(e.target.value)}
                        style={{ width: '100%', backgroundColor: '#11161d', border: '1px solid #1a2027', borderRadius: '2px', padding: '5px 8px', fontSize: '11px', color: '#f8f5ef', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '9px', fontFamily: 'monospace', color: '#343f4c', display: 'block', marginBottom: '2px' }}>ARREARS (KES)</label>
                      <input
                        type="number"
                        value={manualArrears}
                        onChange={e => setManualArrears(e.target.value)}
                        style={{ width: '100%', backgroundColor: '#11161d', border: '1px solid #1a2027', borderRadius: '2px', padding: '6px 8px', fontSize: '11px', color: '#f8f5ef', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleAddUnitManually}
                    style={{
                      marginTop: '12px', width: '100%', padding: '8px 0', backgroundColor: 'transparent', border: '1px solid #ff6b6b', borderRadius: '2px', color: '#ff6b6b', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,107,107,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    + Add Unit to Setup Grid
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* DYNAMIC UNITS PREVIEW GRID */}
          {view === 'preview' && (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#f8f5ef', margin: 0 }}>Building Architecture Grid</h1>
                  <p style={{ fontSize: '12px', color: '#a39c92', marginTop: '4px', margin: 0 }}>Real-time verification layout of units mapped from imports.</p>
                </div>

                <div style={{ display: 'flex', gap: '16px', fontSize: '11px', fontWeight: 600, fontFamily: 'monospace' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                    Paid: {property.units.filter(u => u.arrears === 0 && u.occupant).length}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
                    Arrears: {property.units.filter(u => u.arrears > 0).length}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
                    Vacant: {property.units.filter(u => !u.occupant).length}
                  </div>
                </div>
              </div>

              {property.units.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#343f4c', fontFamily: 'monospace', fontSize: '12px' }}>
                  NO LEDGER NODES MAP DETECTED. CHAT WITH ASSISTANT OR ADD MANUALLY.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {getGroupedFloors().map(([floorNum, units]) => (
                    <div key={floorNum} style={{ borderTop: '1px solid rgba(26, 32, 39, 0.5)', paddingTop: '16px' }}>
                      <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#343f4c', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                        Floor {floorNum}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {units.map(u => {
                          let statusColor = 'border-yellow-600/30 bg-yellow-500/5 text-yellow-500';
                          if (u.occupant) {
                            statusColor = u.arrears > 0 
                              ? 'border-red-600/30 bg-red-500/5 text-red-500' 
                              : 'border-green-600/30 bg-green-500/5 text-green-400';
                          }
                          return (
                            <div 
                              key={u.unitNumber}
                              className="card-border"
                              style={{
                                width: '64px', height: '64px', borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'transform 0.15s'
                              }}
                              title={`Tenant: ${u.occupant || 'Vacant'}\nRent: KES ${u.rentAmount}\nArrears: KES ${u.arrears}`}
                            >
                              <div style={{ color: u.occupant ? (u.arrears > 0 ? '#f87171' : '#34d399') : '#fbbf24' }}>{u.unitNumber}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ACTIVE FEES VIEW */}
          {view === 'billing' && (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#f8f5ef', marginBottom: '6px', margin: 0 }}>Automated Ledger Fees</h1>
              <p style={{ fontSize: '12px', color: '#a39c92', marginBottom: '24px', margin: 0 }}>Configure monthly utility and service charges.</p>
              
              {fees.length === 0 ? (
                <div className="card-border" style={{ padding: '32px', borderRadius: '2px', textAlign: 'center', color: '#343f4c', fontFamily: 'monospace', fontSize: '11px' }}>
                  NO LEDGER FEES DEFINED YET.<br/>Ask the AI Assistant to attach billing rules.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {fees.map((f, i) => (
                    <div key={i} style={{ padding: '16px', backgroundColor: 'rgba(17, 22, 29, 0.6)', border: '1px solid #1a2027', borderRadius: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#f8f5ef', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{f.name}</span>
                      <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#ff6b6b', fontWeight: 'bold' }}>KES {f.amount.toLocaleString()} / mo</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ARREARS INVOICES VIEW */}
          {view === 'invoices' && (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#f8f5ef', marginBottom: '6px', margin: 0 }}>Generated Invoices</h1>
              <p style={{ fontSize: '12px', color: '#a39c92', marginBottom: '24px', margin: 0 }}>Outstanding tenant balances processed for automated collection.</p>

              {invoices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#343f4c', fontFamily: 'monospace', fontSize: '12px' }}>
                  No outstanding arrears invoice balances found.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  {invoices.map((inv, idx) => (
                    <div className="card-border" key={idx} style={{ padding: '20px', borderRadius: '2px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', backgroundColor: '#ff6b6b' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#343f4c', display: 'block', marginBottom: '4px' }}>INVOICE #{inv.invoiceId}</span>
                          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#f8f5ef' }}>{inv.tenantName}</span>
                          <span style={{ fontSize: '11px', color: '#343f4c', display: 'block', marginTop: '2px' }}>Unit {inv.unitNumber}</span>
                        </div>
                        <span style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 'bold', color: '#ff6b6b' }}>KES {inv.amountDue.toLocaleString()}</span>
                      </div>

                      <button
                        onClick={() => {
                          setInvoices(prev => prev.map((item, i) => 
                            i === idx ? { ...item, status: 'Sent' as const } : item
                          ));
                        }}
                        style={{
                          width: '100%', padding: '6px 0', border: '1px solid', borderRadius: '2px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.15s',
                          backgroundColor: inv.status === 'Sent' ? 'rgba(52, 211, 153, 0.1)' : '#11161d',
                          borderColor: inv.status === 'Sent' ? '#34d399' : '#1a2027',
                          color: inv.status === 'Sent' ? '#34d399' : '#f8f5ef'
                        }}
                      >
                        {inv.status === 'Sent' ? 'SENT' : 'SEND NOTICE'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* RIGHT AREA: Persistent AI Chat Controller */}
      <aside style={{ width: '360px', height: '100%', backgroundColor: '#0a0f14', borderLeft: '1px solid #1a2027', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'relative', zIndex: 20 }}>
        
        {/* Terminal Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #1a2027', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(17, 22, 29, 0.5)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff6b6b' }}></div>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, color: '#f8f5ef', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Terminal Active</span>
        </div>

        {/* Sub-routines Logs */}
        {subagents.length > 0 && (
          <div style={{ padding: '16px', borderBottom: '1px solid #1a2027', backgroundColor: '#05080b' }}>
            <span style={{ fontSize: '9px', fontFamily: 'monospace', fontWeight: 600, color: '#ff8585', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>Active Sub-Routines</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {subagents.map((agent, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#11161d', border: '1px solid #1a2027', padding: '8px', borderRadius: '2px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {agent.status === 'PROCESSING' ? (
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ff6b6b' }} className="animate-ping"></span>
                    ) : (
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                    )}
                    <div>
                      <span style={{ fontWeight: 'bold', color: '#f8f5ef', display: 'block' }}>{agent.name}</span>
                      <span style={{ fontSize: '9px', color: '#343f4c', fontFamily: 'monospace' }}>{agent.taskDescription}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', fontWeight: 'bold', color: agent.status === 'COMPLETE' ? '#34d399' : '#ff6b6b' }}>
                    {agent.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message Thread */}
        <div ref={chatHistoryRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {chatHistory.map((m, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '12px', maxWidth: '85%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid', flexShrink: 0, fontSize: '12px',
                backgroundColor: m.role === 'model' ? 'rgba(255, 107, 107, 0.1)' : '#11161d',
                borderColor: m.role === 'model' ? 'rgba(255, 107, 107, 0.3)' : '#1a2027',
                color: m.role === 'model' ? '#ff6b6b' : '#f8f5ef'
              }}>
                {m.role === 'model' ? '🤖' : '👤'}
              </div>
              <div style={{
                padding: '10px 12px', borderRadius: '4px', fontSize: '12px', lineHeight: '1.5', border: '1px solid',
                backgroundColor: m.role === 'model' ? 'rgba(17, 22, 29, 0.8)' : '#1a2027',
                borderColor: m.role === 'model' ? '#1a2027' : '#374151',
                color: '#f8f5ef'
              }}>
                {m.parts[0]?.text || ''}
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', gap: '12px', maxWidth: '80%', alignSelf: 'flex-start' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                🤖
              </div>
              <div style={{ backgroundColor: '#11161d', border: '1px solid #1a2027', padding: '10px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', backgroundColor: '#ff6b6b', borderRadius: '50%' }} className="animate-bounce"></span>
                <span style={{ width: '6px', height: '6px', backgroundColor: '#ff6b6b', borderRadius: '50%' }} className="animate-bounce [animation-delay:0.2s]"></span>
                <span style={{ width: '6px', height: '6px', backgroundColor: '#ff6b6b', borderRadius: '50%' }} className="animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}
        </div>

        {/* Input Panel */}
        <div style={{ padding: '16px', backgroundColor: '#11161d', borderTop: '1px solid #1a2027' }}>
          <form onSubmit={handleChatSubmit} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="file"
              id="excel-attach"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => document.getElementById('excel-attach')?.click()}
              style={{ position: 'absolute', left: '10px', background: 'none', border: 'none', color: '#343f4c', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Attach spreadsheet"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask AI or attach spreadsheet..."
              style={{ width: '100%', backgroundColor: '#05080b', border: '1px solid #1a2027', borderRadius: '4px', padding: '10px 40px', fontSize: '12px', color: '#f8f5ef', outline: 'none' }}
            />
            <button
              type="submit"
              style={{ position: 'absolute', right: '10px', backgroundColor: '#ff6b6b', border: 'none', borderRadius: '2px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a0f14" strokeWidth="3">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>
        </div>

      </aside>
    </div>
  );
}

export default function NewPropertyOrchestrator() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#05080b] text-[#e6e1d8]">
        <div className="font-mono text-xs">LOADING LEDGER SETUP CONTROLLER...</div>
      </div>
    }>
      <NewPropertyOrchestratorContent />
    </Suspense>
  );
}
