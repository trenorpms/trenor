'use client';

import React, { useState } from 'react';

interface UnitDetails {
  id: string;
  unit: string;
  occupant: string;
  rent: number;
  arrears: number;
  email: string;
  emergency: string;
}

interface PropertyOnboardingProps {
  onFinish: (address: string, tenant: string, rent: string, additionalUnits: any[]) => void;
}

export default function PropertyOnboarding({ onFinish }: PropertyOnboardingProps) {
  const [importMethod, setImportMethod] = useState<'upload' | 'manual'>('upload');
  
  // Parsing states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentSubagent, setCurrentSubagent] = useState('');
  const [analysisStep, setAnalysisStep] = useState(0);

  // Property data
  const [propertyName, setPropertyName] = useState('');
  const [units, setUnits] = useState<UnitDetails[]>([]);
  const [securityDeposit, setSecurityDeposit] = useState(0);
  const [recurringTrash, setRecurringTrash] = useState(25);

  // Chat agent states
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'agent' | 'user'; text: string }>>([
    {
      sender: 'agent',
      text: 'Hi Sarah! I am your agent companion. I will coordinate parsing your lease schedules or property documents. If you have an Excel or text log, drop it here. Otherwise, you can enter details manually!',
    },
  ]);

  // Download Sample Excel Format
  const downloadSampleExcel = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Property Name,Unit,Occupant,Rent,Arrears,Email,Emergency Contact\n"
      + "Oakridge Heights,Unit 1A,Bob Smith,1800,0,bob@smith.com,+1 (555) 123-4567\n"
      + "Oakridge Heights,Unit 1B,,1950,0,,";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sample_properties.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simulate file upload parsing with subagent steps
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisStep(1);
    setCurrentSubagent('FileParser Subagent: Decompressing and validating Excel schema...');

    setTimeout(() => {
      setAnalysisStep(2);
      setCurrentSubagent('DataExtractor Subagent: Indexing unit columns and occupant records...');
    }, 1500);

    setTimeout(() => {
      setAnalysisStep(3);
      setCurrentSubagent('ComplianceGuard Subagent: Validating tenant emails and emergency references...');
    }, 3000);

    setTimeout(() => {
      setAnalysisStep(4);
      setCurrentSubagent('LedgerClerk Subagent: Auditing rent schedules and arrears profiles...');
    }, 4500);

    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisStep(0);
      
      // Seed parsed results (simulate extraction)
      setPropertyName(''); // Keep empty to trigger the "missing property name" prompt!
      setUnits([
        { id: 'u1', unit: 'Unit 1A', occupant: 'Bob Smith', rent: 1800, arrears: 350, email: 'bob@smith.com', emergency: 'Jane Smith (+1 555-9012)' },
        { id: 'u2', unit: 'Unit 1B', occupant: '', rent: 1950, arrears: 0, email: '', emergency: '' }
      ]);

      setChatMessages(prev => [
        ...prev,
        { sender: 'user', text: `Uploaded ${file.name}` },
        { sender: 'agent', text: `I parsed the file successfully! I found 2 units. However, the Property Name was missing in the document. Could you specify the property name above, or tell me here in chat?` }
      ]);
    }, 6000);
  };

  // Conversational edits
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');

    setTimeout(() => {
      const lower = userText.toLowerCase();
      if (lower.includes('name') || lower.includes('call it') || lower.includes('property')) {
        const words = userText.split(' ');
        const lastWord = words[words.length - 1];
        if (lastWord) {
          const nameGuess = lastWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
          setPropertyName(nameGuess);
          setChatMessages(prev => [
            ...prev,
            { sender: 'agent', text: `Understood! I've set the property name to "${nameGuess}". I have validated the ledger records.` }
          ]);
        }
      } else if (lower.includes('rent') || lower.includes('price')) {
        // Mock edit rent
        setUnits(prev => prev.map(u => u.unit.toLowerCase().includes('1a') ? { ...u, rent: 2000 } : u));
        setChatMessages(prev => [
          ...prev,
          { sender: 'agent', text: `Done! I've updated the monthly rent for Unit 1A to $2,000. The invoice templates are now updated.` }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          { sender: 'agent', text: `I've noted that instruction. Running the correction subagents to apply the update now.` }
        ]);
      }
    }, 1000);
  };

  const handleManualUnitAdd = () => {
    const nextId = `m-${Date.now()}`;
    setUnits(prev => [
      ...prev,
      { id: nextId, unit: `Unit ${prev.length + 1}`, occupant: '', rent: 1200, arrears: 0, email: '', emergency: '' }
    ]);
  };

  const handleFieldChange = (id: string, field: keyof UnitDetails, val: any) => {
    setUnits(prev => prev.map(u => u.id === id ? { ...u, [field]: val } : u));
  };

  const isSaveDisabled = !propertyName.trim() || units.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
          Let's set up your property
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Empathetically parsed by autonomous subagents. Excel sheets, PDF leases, or raw logs are all accepted.
        </p>
      </div>

      {importMethod === 'upload' && units.length === 0 && !isAnalyzing && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <img 
            src="/property_setup.png" 
            alt="Property Setup" 
            style={{ width: '120px', height: 'auto', borderRadius: '6px' }} 
          />
        </div>
      )}

      {/* Selector */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-muted, #1f2937)' }}>
        <button
          onClick={() => setImportMethod('upload')}
          style={{
            flex: 1,
            padding: '10px',
            background: 'transparent',
            border: 'none',
            borderBottom: importMethod === 'upload' ? '2px solid var(--accent-coral)' : 'none',
            color: importMethod === 'upload' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Dynamic Document Scan
        </button>
        <button
          onClick={() => setImportMethod('manual')}
          style={{
            flex: 1,
            padding: '10px',
            background: 'transparent',
            border: 'none',
            borderBottom: importMethod === 'manual' ? '2px solid var(--accent-coral)' : 'none',
            color: importMethod === 'manual' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Manual Data Input
        </button>
      </div>

      {/* Upload layout */}
      {importMethod === 'upload' && !isAnalyzing && units.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Don't have a format?</span>
            <button
              onClick={downloadSampleExcel}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-coral)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Download Excel Sample CSV
            </button>
          </div>

          <div style={{
            border: '2px dashed var(--border-strong, #374151)',
            borderRadius: 'var(--radius-sm, 4px)',
            padding: '36px 16px',
            textAlign: 'center',
            background: 'var(--bg-tertiary, #1a1c23)',
            cursor: 'pointer',
            position: 'relative',
          }}>
            <input
              type="file"
              onChange={handleFileUpload}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0,
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>📊</span>
            <span style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Drag & Drop Property Lists Here
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary, #6b7280)' }}>
              Supports XLS, CSV, TXT, or PDF documents
            </span>
          </div>
        </div>
      )}

      {/* Animated Subagent Status Loader */}
      {isAnalyzing && (
        <div style={{
          padding: '24px',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-muted)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid var(--border-muted)',
            borderTopColor: 'var(--accent-coral)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {currentSubagent}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
              Step {analysisStep} of 4: Evaluating properties
            </span>
          </div>
        </div>
      )}

      {/* Parsed / Manual Data Form */}
      {(units.length > 0 || importMethod === 'manual') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Missing Property Name Prompt */}
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Property Name {!propertyName && <span style={{ color: 'var(--accent-coral)', fontWeight: 700 }}>(Missing - Please Specify)</span>}
            </label>
            <input
              type="text"
              placeholder="e.g. Oakridge Heights Apartments"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-tertiary)',
                border: !propertyName ? '1px solid var(--accent-coral)' : '1px solid var(--border-muted)',
                padding: '10px',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          {/* Unit Listing */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Units & Occupants</span>
              <button
                onClick={handleManualUnitAdd}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-coral)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                + Add Unit
              </button>
            </div>

            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {units.map((u) => (
                <div key={u.id} style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-muted)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px',
                  display: 'grid',
                  gridTemplateColumns: '80px 100px 1fr',
                  gap: '8px',
                  alignItems: 'center',
                }}>
                  <input
                    type="text"
                    value={u.unit}
                    onChange={(e) => handleFieldChange(u.id, 'unit', e.target.value)}
                    placeholder="Unit"
                    style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '12px', outline: 'none' }}
                  />
                  <input
                    type="text"
                    value={u.occupant}
                    onChange={(e) => handleFieldChange(u.id, 'occupant', e.target.value)}
                    placeholder="Vacant"
                    style={{ background: 'transparent', border: 'none', color: u.occupant ? '#fff' : 'var(--text-tertiary)', fontSize: '12px', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Rent:</span>
                    <input
                      type="number"
                      value={u.rent}
                      onChange={(e) => handleFieldChange(u.id, 'rent', Number(e.target.value))}
                      style={{ width: '60px', background: 'transparent', border: 'none', color: 'var(--accent-coral)', fontSize: '12px', textAlign: 'right', outline: 'none' }}
                    />
                    {u.arrears > 0 && (
                      <span style={{ fontSize: '10px', background: 'rgba(255,111,97,0.1)', color: 'var(--accent-coral)', padding: '2px 4px', borderRadius: '4px' }}>
                        Arrears: ${u.arrears}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Move-in & Recurring Fees */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Security Deposit ($)</label>
              <input
                type="number"
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(Number(e.target.value))}
                style={{
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-muted)',
                  padding: '8px',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Trash/Utility Fee ($/mo)</label>
              <input
                type="number"
                value={recurringTrash}
                onChange={(e) => setRecurringTrash(Number(e.target.value))}
                style={{
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-muted)',
                  padding: '8px',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Chat correction console */}
          <div style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-muted)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-coral)' }}>Agent Correction Chat</span>
            <div style={{ maxHeight: '100px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {chatMessages.slice(-2).map((m, idx) => (
                <div key={idx} style={{ fontSize: '11px', lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 700, color: m.sender === 'agent' ? 'var(--accent-coral)' : 'var(--text-secondary)' }}>
                    {m.sender === 'agent' ? 'Agent: ' : 'You: '}
                  </span>
                  <span>{m.text}</span>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              <input
                type="text"
                placeholder="Ask agent: 'set property name to Oakridge'..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                style={{
                  flex: 1,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-muted)',
                  padding: '6px 10px',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'var(--accent-coral)',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Send
              </button>
            </form>
          </div>

          {/* Confirm */}
          <button
            onClick={() => onFinish(propertyName, units[0]?.occupant || 'Bob Smith', `$${units[0]?.rent || 1800}`, units)}
            disabled={isSaveDisabled}
            style={{
              background: 'var(--accent-coral, #ff6f61)',
              color: '#fff',
              border: 'none',
              padding: '11px',
              borderRadius: 'var(--radius-sm, 4px)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: isSaveDisabled ? 0.6 : 1,
              textAlign: 'center',
            }}
          >
            Confirm & Save Property
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
