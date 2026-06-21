'use client';

import React, { useState } from 'react';

export default function TerminalPanel() {
  const [command, setCommand] = useState('');
  const [logs, setLogs] = useState<Array<{ time: string; msg: string; type: string }>>([
    { time: '11:20:05 PM', msg: 'Aura AI Command Interface booted.', type: 'SYSTEM' },
    { time: '11:21:12 PM', msg: 'Core engine status checks completed: 100% operational.', type: 'SUCCESS' },
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      { time: timestamp, msg: `User Command: "${command}"`, type: 'USER' },
      { time: timestamp, msg: `Aura evaluating directive... Processing model inputs.`, type: 'PROCESS' },
      { time: timestamp, msg: `SUCCESS: Directives registered. Global sync schedules updated.`, type: 'SUCCESS' },
    ]);
    setCommand('');
  };

  const runQuickAction = (actionName: string, desc: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      { time: timestamp, msg: `Quick Action Triggered: ${actionName}`, type: 'ACTION' },
      { time: timestamp, msg: `Executing: ${desc}`, type: 'PROCESS' },
      { time: timestamp, msg: `SUCCESS: Operational actions complete. Checked 12 relations.`, type: 'SUCCESS' },
    ]);
  };

  return (
    <div className="flex-col p-4 md:p-6 lg:p-8 relative z-10 min-h-full max-w-4xl mx-auto w-full">
      
      {/* Header animation */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-muted)] flex items-center justify-center mx-auto mb-4 relative">
          <div className="absolute inset-0 rounded-full border border-[var(--accent-coral)]/30 animate-ping"></div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-coral)" strokeWidth="2">
            <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
            <path d="M12 12 2.1 7.1"></path>
            <path d="M12 12l9.9 4.9"></path>
          </svg>
        </div>
        <h1 className="font-heading text-3xl font-medium text-[var(--text-primary)] tracking-tight">Aura Orchestrator</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Awaiting operational directives.</p>
      </div>

      {/* Input Console */}
      <form onSubmit={handleSubmit} className="relative w-full mb-8">
        <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-strong)] hover:border-[var(--accent-coral)] rounded flex items-center p-2 transition-all">
          <span className="p-3 text-[var(--text-tertiary)] font-bold font-mono">&gt;</span>
          <input 
            type="text" 
            placeholder="Command Aura to generate invoices or analyze data..." 
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-tertiary)] font-body text-base px-2 py-3"
          />
          <button type="submit" className="bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-black p-2.5 rounded mx-2 font-bold cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </form>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <button 
          onClick={() => runQuickAction('Draft Arrears Invoices', 'Scan ledger database and prep invoice releases.')}
          className="p-4 rounded text-left flex items-start gap-3 bg-[var(--bg-secondary)] border border-[var(--border-muted)] hover:border-[var(--accent-coral)] transition-all cursor-pointer"
        >
          <div className="w-8 h-8 rounded bg-[var(--bg-tertiary)] text-[var(--accent-coral)] flex items-center justify-center flex-shrink-0">
            📚
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--text-primary)]">Draft Arrears Invoices</div>
            <div className="text-[10px] text-[var(--text-secondary)]">Scan ledger and prep invoices.</div>
          </div>
        </button>

        <button 
          onClick={() => runQuickAction('Dispatch Maintenance', 'Create work order tickets for open tasks.')}
          className="p-4 rounded text-left flex items-start gap-3 bg-[var(--bg-secondary)] border border-[var(--border-muted)] hover:border-emerald-500 transition-all cursor-pointer"
        >
          <div className="w-8 h-8 rounded bg-[var(--bg-tertiary)] text-emerald-500 flex items-center justify-center flex-shrink-0">
            🛠️
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--text-primary)]">Dispatch Maintenance</div>
            <div className="text-[10px] text-[var(--text-secondary)]">Create work order for open tickets.</div>
          </div>
        </button>
      </div>

      {/* Terminal Log Output */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border-muted)] rounded overflow-hidden flex flex-col">
        <div className="h-10 border-b border-[var(--border-muted)] flex items-center px-4 justify-between bg-[var(--bg-secondary)]">
          <span className="text-xs font-mono text-[var(--text-primary)]">Aura Telemetry Log Feed</span>
          <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
        </div>
        <div className="p-4 flex flex-col gap-2 font-mono text-xs max-h-[200px] overflow-y-auto">
          {logs.map((log, idx) => (
            <div key={idx} className="flex gap-2">
              <span className="text-[var(--text-tertiary)]">[{log.time}]</span>
              <span className="text-[var(--accent-coral)]">[{log.type}]</span>
              <span className="text-[var(--text-primary)]">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
