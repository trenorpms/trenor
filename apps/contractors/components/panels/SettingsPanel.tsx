'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToolConfig {
  name: string;
  description: string;
  enabled: boolean;
  requiresApproval: boolean;
}

interface ActivityLog {
  id: number;
  toolName: string;
  actionSummary: string;
  inputArgs: string;
  outputResult: string;
  status: 'success' | 'error';
  errorMessage?: string | null;
  durationMs: number;
  createdAt: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function SettingsPanel() {
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'tools' | 'activity'>('general');
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');

  // Tools State
  const [tools, setTools] = useState<ToolConfig[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);

  // Activity Logs State
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const addToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const session = localStorage.getItem('user');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        setUser(parsed);
        setToken(parsed.id || '');
      } catch (e) {
        console.error('Failed to parse user session', e);
      }
    }
  }, []);

  // Fetch Tools
  const fetchTools = async (authToken: string) => {
    if (!authToken) return;
    setLoadingTools(true);
    try {
      const res = await fetch(`${API}/agent/tools`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTools(data || []);
      } else {
        addToast('Failed to load tool configurations.', 'error');
      }
    } catch (e) {
      console.error(e);
      addToast('Network error loading tools.', 'error');
    } finally {
      setLoadingTools(false);
    }
  };

  // Fetch Activity Logs
  const fetchLogs = async (authToken: string) => {
    if (!authToken) return;
    setLoadingLogs(true);
    try {
      const res = await fetch(`${API}/agent/activity`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data || []);
      } else {
        addToast('Failed to load activity logs.', 'error');
      }
    } catch (e) {
      console.error(e);
      addToast('Network error loading activity logs.', 'error');
    } finally {
      setLoadingLogs(false);
    }
  };

  // Trigger fetches on tab change
  useEffect(() => {
    if (!token) return;
    if (activeSubTab === 'tools') {
      fetchTools(token);
    } else if (activeSubTab === 'activity') {
      fetchLogs(token);
    }
  }, [activeSubTab, token]);

  // Update Tool Config
  const handleUpdateTool = async (name: string, updatedFields: Partial<ToolConfig>) => {
    const originalTools = [...tools];
    
    // Optimistic Update
    setTools(prev => prev.map(t => t.name === name ? { ...t, ...updatedFields } : t));

    try {
      const toolToPatch = originalTools.find(t => t.name === name);
      if (!toolToPatch) return;

      const body = {
        enabled: updatedFields.enabled !== undefined ? updatedFields.enabled : toolToPatch.enabled,
        requiresApproval: updatedFields.requiresApproval !== undefined ? updatedFields.requiresApproval : toolToPatch.requiresApproval
      };

      const res = await fetch(`${API}/agent/tools/${name}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        addToast(`Successfully updated tool: ${name}`);
      } else {
        // Revert on error
        setTools(originalTools);
        addToast('Failed to update tool config.', 'error');
      }
    } catch (e) {
      console.error(e);
      setTools(originalTools);
      addToast('Network error saving tool config.', 'error');
    }
  };

  return (
    <div className="flex flex-col p-4 md:p-6 lg:p-8 relative z-10 min-h-full w-full max-w-5xl mx-auto">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 border shadow-2xl transition-all animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400' : 'bg-red-500/15 border-red-500/30 text-red-400'
        }`}>
          <span className="text-xs font-medium font-mono">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[var(--text-primary)]">System Configuration</h1>
          <p className="text-xs font-mono text-[var(--text-tertiary)] mt-1">Configure dashboard settings, Sophia AI tools, and check agent activity.</p>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex gap-1 border-b border-[var(--border-muted)] mb-6">
        {[
          { id: 'general', label: 'General Settings' },
          { id: 'tools', label: 'Sophia AI Tools' },
          { id: 'activity', label: 'Agent Activity Log' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-all ${
              activeSubTab === tab.id 
                ? 'border-[var(--accent-coral)] text-[var(--text-primary)]' 
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Panels */}
      <div className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-muted)] p-6">
        <AnimatePresence mode="wait">
          {activeSubTab === 'general' && (
            <motion.div
              key="general"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-6"
            >
              <div>
                <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)] mb-3">Operator Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
                  <div>
                    <label className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">Operator Name</label>
                    <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-muted)] text-xs text-[var(--text-primary)]">
                      {user?.name || 'Loading...'}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">Email Address</label>
                    <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-muted)] text-xs text-[var(--text-primary)]">
                      {user?.email || 'Loading...'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border-muted)] pt-6">
                <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)] mb-3">Preferences</h3>
                <div className="max-w-xl">
                  <div className="flex items-center justify-between p-3 bg-[var(--bg-primary)] border border-[var(--border-muted)]">
                    <div>
                      <span className="text-xs font-semibold text-[var(--text-primary)] block">Visual Dark Theme</span>
                      <span className="text-[10px] text-[var(--text-tertiary)] block">Toggle between light mode and dark mode across the platform.</span>
                    </div>
                    <button
                      onClick={() => {
                        const current = document.documentElement.getAttribute('data-theme') || 'dark';
                        const next = current === 'dark' ? 'light' : 'dark';
                        document.documentElement.setAttribute('data-theme', next);
                        localStorage.setItem('theme', next);
                        localStorage.setItem('data-theme', next);
                        addToast(`Switched to visual ${next} theme.`);
                      }}
                      className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-strong)] text-[var(--text-primary)] text-xs font-semibold cursor-pointer hover:border-[var(--accent-coral)] transition-colors"
                    >
                      Toggle Theme
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSubTab === 'tools' && (
            <motion.div
              key="tools"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-4"
            >
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)]">Sophia Action Tools</h3>
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Toggle which tools Sophia can execute and dictate whether they require explicit human approval.</p>
                </div>
                <button
                  onClick={() => fetchTools(token)}
                  disabled={loadingTools}
                  className="p-1 bg-transparent border border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer text-xs transition-colors"
                  title="Refresh Tools"
                >
                  <svg className={`w-3.5 h-3.5 ${loadingTools ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
                  </svg>
                </button>
              </div>

              {loadingTools ? (
                <div className="p-12 text-center text-xs text-[var(--text-tertiary)] font-mono">LOADING TOOL MANIFEST...</div>
              ) : tools.length === 0 ? (
                <div className="p-12 text-center text-xs text-[var(--text-tertiary)] font-mono">NO AI TOOLS INSTALLED ON THIS PLATFORM ENVIRONMENT</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tools.map(tool => (
                    <div key={tool.name} className="p-4 bg-[var(--bg-primary)] border border-[var(--border-muted)] hover:border-[var(--border-strong)] transition-all flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-[var(--accent-coral)]">{tool.name}</span>
                          <span className={`px-1.5 py-0.5 text-[8px] font-bold ${tool.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {tool.enabled ? 'ACTIVE' : 'DISABLED'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{tool.description}</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-[var(--border-muted)] pt-3.5 mt-2">
                        {/* Enabled Switch */}
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={tool.enabled}
                            onChange={(e) => handleUpdateTool(tool.name, { enabled: e.target.checked })}
                            id={`enabled-${tool.name}`}
                            className="cursor-pointer accent-[var(--accent-coral)]"
                          />
                          <label htmlFor={`enabled-${tool.name}`} className="text-[10px] font-semibold text-[var(--text-primary)] cursor-pointer select-none uppercase tracking-wider">Enable Tool</label>
                        </div>

                        {/* Requires Approval Switch */}
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={tool.requiresApproval}
                            onChange={(e) => handleUpdateTool(tool.name, { requiresApproval: e.target.checked })}
                            id={`approval-${tool.name}`}
                            className="cursor-pointer accent-[var(--accent-coral)]"
                          />
                          <label htmlFor={`approval-${tool.name}`} className="text-[10px] font-semibold text-[var(--text-secondary)] cursor-pointer select-none uppercase tracking-wider">Approval Required</label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeSubTab === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-4"
            >
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)]">Telemetry Activity Logs</h3>
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Chronological audit stream of Sophia AI tool executions.</p>
                </div>
                <button
                  onClick={() => fetchLogs(token)}
                  disabled={loadingLogs}
                  className="p-1 bg-transparent border border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer text-xs transition-colors"
                  title="Refresh Audit Logs"
                >
                  <svg className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
                  </svg>
                </button>
              </div>

              {loadingLogs ? (
                <div className="p-12 text-center text-xs text-[var(--text-tertiary)] font-mono">LOADING AUDIT STREAM telemetry...</div>
              ) : logs.length === 0 ? (
                <div className="p-12 text-center text-xs text-[var(--text-tertiary)] font-mono">NO TOOL EXECUTION LOGS RECORDED YET</div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1">
                  {logs.map(log => (
                    <div key={log.id} className="border border-[var(--border-muted)] bg-[var(--bg-primary)] overflow-hidden">
                      {/* Accordion Header */}
                      <div 
                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                        className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 text-[9px] font-bold ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {log.status.toUpperCase()}
                          </span>
                          <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{log.toolName}</span>
                          <span className="text-[11px] text-[var(--text-secondary)] truncate max-w-sm hidden sm:inline">{log.actionSummary}</span>
                        </div>

                        <div className="flex items-center gap-3 text-[10px] font-mono text-[var(--text-tertiary)]">
                          <span>{log.durationMs}ms</span>
                          <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                          <span>{expandedLogId === log.id ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {/* Accordion Body */}
                      {expandedLogId === log.id && (
                        <div className="p-4 border-t border-[var(--border-muted)] bg-[var(--bg-secondary)]/40 flex flex-col gap-3 font-mono text-[11px]">
                          <div>
                            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">Description</span>
                            <span className="text-[var(--text-secondary)] font-body">{log.actionSummary}</span>
                          </div>
                          
                          {log.errorMessage && (
                            <div className="p-2 bg-red-500/15 border border-red-500/30 text-red-400">
                              <span className="text-[10px] font-bold block mb-1">ERROR DETAILS</span>
                              <span>{log.errorMessage}</span>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                            <div>
                              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">Input Arguments</span>
                              <pre className="p-2.5 bg-[var(--bg-primary)] border border-[var(--border-muted)] overflow-x-auto text-[10.5px] leading-relaxed max-h-[160px] text-[var(--text-secondary)] scrollbar-thin">
                                {(() => {
                                  try {
                                    return JSON.stringify(JSON.parse(log.inputArgs), null, 2);
                                  } catch (e) {
                                    return log.inputArgs;
                                  }
                                })()}
                              </pre>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">Output Result</span>
                              <pre className="p-2.5 bg-[var(--bg-primary)] border border-[var(--border-muted)] overflow-x-auto text-[10.5px] leading-relaxed max-h-[160px] text-[var(--text-secondary)] scrollbar-thin">
                                {(() => {
                                  try {
                                    return JSON.stringify(JSON.parse(log.outputResult), null, 2);
                                  } catch (e) {
                                    return log.outputResult;
                                  }
                                })()}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
