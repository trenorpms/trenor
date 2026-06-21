'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRealtime } from '../../app/hooks/useRealtime';

// ─── Types (mirroring backend) ───
interface TextBlock { type: 'text'; content: string; }
interface FormField { key: string; label: string; fieldType: 'text' | 'email' | 'tel' | 'number' | 'select'; placeholder?: string; required?: boolean; options?: string[]; value?: string; }
interface FormBlock { type: 'form'; fields: FormField[]; submitLabel: string; onSubmitAction: string; }
interface FileUploadBlock { type: 'file_upload'; accept: string; label: string; description?: string; onUploadAction: string; }
interface ImageUploadBlock { type: 'image_upload'; label: string; description?: string; onUploadAction: string; }
interface DataTableBlock { type: 'data_table'; title?: string; columns: { key: string; label: string }[]; rows: Record<string, any>[]; editable: boolean; }
interface ConfirmationBlock { type: 'confirmation'; title: string; summary: Record<string, any>; confirmAction: string; cancelAction?: string; }
interface StepGuideBlock { type: 'step_guide'; steps: { title: string; description?: string; status: 'pending' | 'running' | 'done' | 'error' }[]; }
interface ErrorBlock { type: 'error'; message: string; suggestion?: string; }
type AgentResponseBlock = TextBlock | FormBlock | FileUploadBlock | ImageUploadBlock | DataTableBlock | ConfirmationBlock | StepGuideBlock | ErrorBlock;

interface AgentMessage {
  role: 'user' | 'agent';
  content?: string;
  blocks?: AgentResponseBlock[];
  timestamp: string;
}

interface AgentWorkspacePanelProps {
  user?: any;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// ─── UTILITIES FOR TEXT FORMATTING ───
function formatMessageText(text: string) {
  if (!text) return '';
  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold (**text**)
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-primary); font-weight: 600;">$1</strong>');
  
  // Italic (*text*)
  formatted = formatted.replace(/\*(.*?)\*/g, '<em style="color: var(--text-secondary); font-style: italic;">$1</em>');
  
  // Inline Code (`code`)
  formatted = formatted.replace(/`(.*?)`/g, '<code style="font-family: monospace; background: rgba(255,255,255,0.08); padding: 2px 4px; border-radius: 3px; font-size: 11.5px; color: var(--accent-coral);">$1</code>');

  // Custom Multicolor Tags
  formatted = formatted.replace(/\[green\](.*?)\[\/green\]/g, '<span style="color: #34d399; font-weight: 600; text-shadow: 0 0 10px rgba(52,211,153,0.15);">$1</span>');
  formatted = formatted.replace(/\[red\](.*?)\[\/red\]/g, '<span style="color: #f87171; font-weight: 600; text-shadow: 0 0 10px rgba(248,113,113,0.15);">$1</span>');
  formatted = formatted.replace(/\[blue\](.*?)\[\/blue\]/g, '<span style="color: #60a5fa; font-weight: 600; text-shadow: 0 0 10px rgba(96,165,250,0.15);">$1</span>');
  formatted = formatted.replace(/\[yellow\](.*?)\[\/yellow\]/g, '<span style="color: #fbbf24; font-weight: 600; text-shadow: 0 0 10px rgba(251,191,36,0.15);">$1</span>');

  return formatted;
}

// ─── COLLAPSIBLE TEXT CONTAINER ───
function CollapsibleText({ content, viewMode }: { content: string; viewMode: 'standard' | 'compact' }) {
  const [expanded, setExpanded] = useState(false);
  const wordLimit = viewMode === 'compact' ? 180 : 350;
  const shouldCollapse = content.length > wordLimit;

  const displayText = shouldCollapse && !expanded 
    ? content.substring(0, wordLimit) + '...'
    : content;

  return (
    <div className="my-1.5">
      <p 
        className="text-sm text-[var(--text-secondary)] leading-relaxed m-0 whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: formatMessageText(displayText) }}
      />
      {shouldCollapse && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="bg-transparent border-none text-[var(--accent-coral)] text-xs font-semibold cursor-pointer p-0 mt-1 inline-flex items-center gap-1 transition-colors hover:text-[var(--text-primary)] outline-none"
        >
          {expanded ? 'Collapse ↑' : 'Read More ↓'}
        </button>
      )}
    </div>
  );
}

// ─── REUSABLE CONFIRMATION MODAL ───
function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onClose
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] p-6 max-w-md w-[90%] shadow-2xl scale-95 animate-scale-up">
        <h3 className="text-base font-semibold text-[var(--text-primary)] m-0 mb-2.5 tracking-tight">{title}</h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed m-0 mb-5">{message}</p>
        
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-transparent border border-[var(--border-muted)] text-[var(--text-secondary)] text-xs font-medium cursor-pointer outline-none hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="px-4 py-2 bg-[var(--accent-coral)] border-none text-[var(--bg-primary)] text-xs font-semibold cursor-pointer outline-none hover:bg-[var(--accent-coral-hover)] shadow-lg shadow-coral-500/10 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AgentWorkspacePanel({ user: propUser }: AgentWorkspacePanelProps) {
  const [user, setUser] = useState<any>(propUser || null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('');

  useRealtime(user, useCallback((notif: any) => {
    if (notif.title === 'Sophia') {
      setCurrentStatus(notif.message);
    }
  }, []));
  
  // Settings Panel State
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    viewMode: 'standard' as 'standard' | 'compact',
    agentTemperament: 'balanced' as 'balanced' | 'precise' | 'fast',
  });

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const addToast = (msg: string, type: 'success' | 'info' | 'error') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [pendingAction, setPendingAction] = useState<string>('');

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
  }, []);

  // Fetch local user if not passed in props
  useEffect(() => {
    if (!user) {
      const session = localStorage.getItem('user');
      if (session) {
        try {
          setUser(JSON.parse(session));
        } catch (e) {
          // ignore
        }
      }
    }
  }, [user]);

  // ─── PERSISTENCE (LocalStorage) ───
  useEffect(() => {
    if (!user?.id) return;
    
    // Load sessions
    const savedSessions = localStorage.getItem(`trenor_sessions_${user.id}`);
    let loadedSessions: any[] = [];
    if (savedSessions) {
      try { loadedSessions = JSON.parse(savedSessions); } catch {}
    }
    
    // Fallback if no sessions
    if (loadedSessions.length === 0) {
      const defaultSession = {
        id: `session-${Date.now()}`,
        title: 'New Chat',
        messages: [],
        conversationState: { step: 'idle', history: [] },
        createdAt: new Date().toISOString(),
      };
      loadedSessions = [defaultSession];
    }
    
    setSessions(loadedSessions);
    
    // Load activeSessionId
    const savedActiveId = localStorage.getItem(`trenor_active_session_id_${user.id}`);
    if (savedActiveId && loadedSessions.some((s: any) => s.id === savedActiveId)) {
      setActiveSessionId(savedActiveId);
    } else {
      setActiveSessionId(loadedSessions[0].id);
    }

    const savedSettings = localStorage.getItem(`trenor_chat_settings_${user.id}`);
    if (savedSettings) {
      try { setSettings(JSON.parse(savedSettings)); } catch {}
    }
  }, [user]);

  const saveSessionsToStorage = (updatedSessions: any[], activeId: string) => {
    setSessions(updatedSessions);
    setActiveSessionId(activeId);
    if (user?.id) {
      localStorage.setItem(`trenor_sessions_${user.id}`, JSON.stringify(updatedSessions));
      localStorage.setItem(`trenor_active_session_id_${user.id}`, activeId);
    }
  };

  const currentSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || {
    id: 'temp',
    title: 'New Chat',
    messages: [],
    conversationState: { step: 'idle', history: [] },
  };

  const messages = currentSession.messages || [];
  const conversationState = currentSession.conversationState || { step: 'idle', history: [] };

  const updateCurrentSession = (updatedMessages: AgentMessage[], updatedState?: any) => {
    const nextState = updatedState !== undefined ? updatedState : currentSession.conversationState;
    
    // Compute title dynamically based on the first user message
    let title = currentSession.title;
    if (currentSession.title === 'New Chat' || currentSession.title === 'Empty Chat' || currentSession.title === 'Assistant Session') {
      const firstUserMsg = updatedMessages.find(m => m.role === 'user');
      if (firstUserMsg) {
        title = firstUserMsg.content && firstUserMsg.content.length > 30 
          ? firstUserMsg.content.substring(0, 30) + '...' 
          : (firstUserMsg.content || 'New Chat');
      }
    }

    const updatedSessions = sessions.map(s => {
      if (s.id === currentSession.id) {
        return {
          ...s,
          title,
          messages: updatedMessages,
          conversationState: nextState,
        };
      }
      return s;
    });
    
    saveSessionsToStorage(updatedSessions, currentSession.id);
  };

  const handleStartNewChat = () => {
    const newSession = {
      id: `session-${Date.now()}`,
      title: 'New Chat',
      messages: [],
      conversationState: { step: 'idle', history: [] },
      createdAt: new Date().toISOString(),
    };
    
    const updatedSessions = [newSession, ...sessions];
    saveSessionsToStorage(updatedSessions, newSession.id);
    addToast('Started a new conversation.', 'info');
    setShowHistory(false);
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent selecting the session
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    
    let nextActiveId = activeSessionId;
    if (sessionId === activeSessionId) {
      if (updatedSessions.length > 0) {
        nextActiveId = updatedSessions[0].id;
      } else {
        const defaultSession = {
          id: `session-${Date.now()}`,
          title: 'New Chat',
          messages: [],
          conversationState: { step: 'idle', history: [] },
          createdAt: new Date().toISOString(),
        };
        updatedSessions.push(defaultSession);
        nextActiveId = defaultSession.id;
      }
    }
    
    saveSessionsToStorage(updatedSessions, nextActiveId);
    addToast('Conversation deleted.', 'info');
  };

  const saveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    if (user?.id) {
      localStorage.setItem(`trenor_chat_settings_${user.id}`, JSON.stringify(newSettings));
    }
  };

  const triggerClearChat = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear Chat History',
      message: 'Are you sure you want to delete all messages and reset the agent state? This action is permanent.',
      onConfirm: () => {
        updateCurrentSession([], { step: 'idle', history: [] });
        addToast('Conversation cleared.', 'info');
        setShowSettings(false);
      }
    });
  };

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // ─── SEND TO BACKEND ───
  const sendToAgent = useCallback(async (action: string, extra?: { message?: string; file?: File; formData?: Record<string, string>; currentHistory?: AgentMessage[] }) => {
    setLoading(true);
    setCurrentStatus('');

    const currentHistory = extra?.currentHistory || messages;

    const formPayload = new FormData();
    formPayload.append('action', action);
    if (extra?.message) formPayload.append('message', extra.message);
    if (extra?.file) formPayload.append('file', extra.file);
    if (extra?.formData) formPayload.append('formData', JSON.stringify(extra.formData));
    formPayload.append('conversationState', JSON.stringify(conversationState));
    formPayload.append('landlordName', user?.name || 'Operator');
    formPayload.append('landlordEmail', user?.email || '');
    formPayload.append('temperament', settings.agentTemperament);

    try {
      const res = await fetch(`${API}/agent/run`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user?.id || ''}` },
        body: formPayload,
      });

      const data = await res.json();

      const newMsgs: AgentMessage[] = [...currentHistory, {
        role: 'agent',
        blocks: data.blocks || [],
        timestamp: new Date().toLocaleTimeString(),
      }];
      updateCurrentSession(newMsgs, data.conversationState || {});
    } catch (err: any) {
      const newMsgs: AgentMessage[] = [...currentHistory, {
        role: 'agent',
        blocks: [{ type: 'error', message: 'Connection error. Make sure the backend is running.' }],
        timestamp: new Date().toLocaleTimeString(),
      }];
      updateCurrentSession(newMsgs);
    } finally {
      setLoading(false);
      setCurrentStatus('');
    }
  }, [conversationState, user, messages, settings]);

  // ─── HANDLERS ───
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');

    const newMsgs: AgentMessage[] = [...messages, { role: 'user', content: msg, timestamp: new Date().toLocaleTimeString() }];
    updateCurrentSession(newMsgs);

    if (conversationState?.step === 'awaiting_photo' || conversationState?.step === 'awaiting_confirmation') {
      await sendToAgent('edit_data', { message: msg, currentHistory: newMsgs });
    } else {
      await sendToAgent('chat', { message: msg, currentHistory: newMsgs });
    }
  };

  const handleFileUpload = async (file: File, action: string) => {
    const newMsgs: AgentMessage[] = [...messages, { role: 'user', content: `Uploaded: ${file.name}`, timestamp: new Date().toLocaleTimeString() }];
    updateCurrentSession(newMsgs);
    await sendToAgent(action, { file, currentHistory: newMsgs });
  };

  const handleFormSubmit = async (formData: Record<string, string>, action: string) => {
    const newMsgs: AgentMessage[] = [...messages, { role: 'user', content: 'Submitted form data', timestamp: new Date().toLocaleTimeString() }];
    updateCurrentSession(newMsgs);
    await sendToAgent(action, { formData, currentHistory: newMsgs });
  };

  const handleConfirm = async (action: string) => {
    await sendToAgent(action);
  };

  // ─── RENDER BLOCK ───
  const renderBlock = (block: AgentResponseBlock, idx: number) => {
    switch (block.type) {
      case 'text':
        return <CollapsibleText key={idx} content={block.content} viewMode={settings.viewMode} />;

      case 'error':
        return (
          <div key={idx} className="p-3 bg-red-500/10 border border-red-500/25 my-2">
            <div className="text-xs font-semibold text-red-400 mb-1">Error: {block.message}</div>
            {block.suggestion && <div className="text-[11px] text-[var(--text-tertiary)]">{block.suggestion}</div>}
          </div>
        );

      case 'file_upload':
        return (
          <div key={idx}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent-coral)'; }}
            onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border-muted)'; }}
            onDrop={e => {
              e.preventDefault();
              e.currentTarget.style.borderColor = 'var(--border-muted)';
              const f = e.dataTransfer.files[0];
              if (f) handleFileUpload(f, block.onUploadAction);
            }}
            onClick={() => { setPendingAction(block.onUploadAction); fileInputRef.current?.click(); }}
            className="p-6 border border-dashed border-[var(--border-muted)] text-center cursor-pointer my-2 transition-all hover:border-[var(--accent-coral)]"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-coral)" strokeWidth="2" className="mx-auto mb-2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            <div className="text-xs font-semibold text-[var(--text-primary)]">{block.label}</div>
            {block.description && <div className="text-[10px] text-[var(--text-tertiary)] mt-1">{block.description}</div>}
            <div className="text-[9px] text-[var(--text-tertiary)] mt-2">Accepts: {block.accept}</div>
          </div>
        );

      case 'image_upload':
        return (
          <div key={idx}
            onClick={() => { setPendingAction(block.onUploadAction); photoInputRef.current?.click(); }}
            className="p-4 border border-dashed border-[var(--border-muted)] text-center cursor-pointer my-2 flex items-center gap-3 transition-all hover:border-[var(--accent-coral)]"
          >
            <div className="w-10 h-10 bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-coral)" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2 2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold text-[var(--text-primary)]">{block.label}</div>
              {block.description && <div className="text-[10px] text-[var(--text-tertiary)]">{block.description}</div>}
            </div>
          </div>
        );

      case 'form':
        return <AgentFormBlock key={idx} block={block} onSubmit={handleFormSubmit} />;

      case 'data_table':
        return (
          <div key={idx} className="my-2 border border-[var(--border-muted)] overflow-hidden">
            {block.title && <div className="p-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-primary)] bg-[var(--bg-tertiary)] border-b border-[var(--border-muted)]">{block.title}</div>}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr>
                    {block.columns.map(col => (
                      <th key={col.key} className="p-2 text-left text-[10px] uppercase font-semibold text-[var(--text-tertiary)] tracking-wider border-b border-[var(--border-muted)]">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-[var(--border-muted)] hover:bg-white/5 transition-colors">
                      {block.columns.map(col => (
                        <td key={col.key} className="p-2 text-[var(--text-secondary)]">
                          {typeof row[col.key] === 'number' ? row[col.key].toLocaleString() : String(row[col.key] || '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'step_guide':
        return (
          <div key={idx} className="my-3 flex flex-col gap-0">
            {block.steps.map((step, si) => (
              <div key={si} className="flex gap-3 position-relative">
                <div className="flex flex-col items-center w-5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 border ${
                    step.status === 'done' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' :
                    step.status === 'running' ? 'bg-[var(--accent-coral-muted)] border-[var(--accent-coral)] text-[var(--accent-coral)]' :
                    step.status === 'error' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-[var(--bg-tertiary)] border-[var(--border-muted)] text-[var(--text-tertiary)]'
                  }`}>
                    {step.status === 'done' ? '✓' : step.status === 'running' ? <span className="w-1.5 h-1.5 rounded-full border border-current border-t-transparent animate-spin inline-block" /> : step.status === 'error' ? '✕' : '○'}
                  </div>
                  {si < block.steps.length - 1 && <div className={`flex-1 w-[1px] min-h-[16px] ${step.status === 'done' ? 'bg-emerald-500' : 'bg-[var(--border-muted)]'}`} />}
                </div>
                <div className="pb-3">
                  <div className={`text-xs font-semibold ${step.status === 'pending' ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>{step.title}</div>
                  {step.description && <div className="text-[10px] text-[var(--text-tertiary)]">{step.description}</div>}
                </div>
              </div>
            ))}
          </div>
        );

      case 'confirmation':
        return (
          <div key={idx} className="my-3 p-4 border border-[var(--border-muted)] bg-[var(--bg-tertiary)] shadow-inner">
            <div className="text-xs font-semibold text-[var(--text-primary)] mb-2.5">{block.title}</div>
            <div className="flex flex-wrap gap-3 mb-4">
              {Object.entries(block.summary).map(([k, v]) => (
                <div key={k} className="text-xs">
                  <span className="text-[var(--text-tertiary)] capitalize">{k}: </span>
                  <span className="text-[var(--text-primary)] font-semibold">{String(v)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleConfirm(block.confirmAction)}
                disabled={loading}
                className="px-4 py-2 bg-[var(--accent-coral)] border-none text-[var(--bg-primary)] text-xs font-semibold cursor-pointer hover:bg-[var(--accent-coral-hover)] shadow-lg shadow-coral-500/10 transition-colors"
              >
                {loading ? 'Processing...' : 'Confirm & Deploy'}
              </button>
              {block.cancelAction && (
                <button
                  onClick={() => handleConfirm(block.cancelAction!)}
                  className="px-4 py-2 bg-transparent border border-[var(--border-muted)] text-[var(--text-secondary)] text-xs font-medium cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  Go Back
                </button>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto px-4 md:px-6 py-4">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 border shadow-2xl transition-all animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400' :
          toast.type === 'error' ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-[var(--bg-secondary)] border-[var(--border-muted)] text-[var(--text-primary)]'
        }`}>
          <span className="text-xs font-medium font-mono">{toast.message}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
      
      {/* Header and Controls */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-muted)] relative z-20">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-[var(--accent-coral)] animate-ping' : 'bg-emerald-500'}`} />
          <span className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-widest">
            {loading ? 'System processing...' : 'Agent link synchronized'}
          </span>
        </div>
        
        <div className="flex items-center gap-2 relative">
          {/* New Chat Button */}
          <button
            onClick={handleStartNewChat}
            className="bg-transparent border border-[var(--border-muted)] p-1.5 rounded cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-coral)] flex items-center justify-center transition-all bg-transparent outline-none"
            title="New Chat"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>

          {/* History Button */}
          <button
            onClick={() => { setShowHistory(!showHistory); setShowSettings(false); }}
            className={`bg-transparent border border-[var(--border-muted)] p-1.5 rounded cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-coral)] flex items-center justify-center transition-all outline-none ${
              showHistory ? 'bg-[var(--bg-tertiary)]' : ''
            }`}
            title="Chat History"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <polyline points="3 3 3 8 8 8"/>
              <line x1="12" y1="7" x2="12" y2="12"/>
              <line x1="12" y1="12" x2="16" y2="14"/>
            </svg>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => { setShowSettings(!showSettings); setShowHistory(false); }}
            className={`bg-transparent border border-[var(--border-muted)] p-1.5 rounded cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-coral)] flex items-center justify-center transition-all outline-none ${
              showSettings ? 'bg-[var(--bg-tertiary)]' : ''
            }`}
            title="Settings"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>

          {/* History Dropdown */}
          {showHistory && (
            <div className="absolute top-[110%] right-0 w-72 bg-[var(--bg-secondary)] border border-[var(--border-strong)] shadow-2xl p-3 flex flex-col gap-2 z-30 max-h-[350px] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[var(--border-muted)] pb-1.5 mb-1">
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Chats History</span>
                <button
                  onClick={handleStartNewChat}
                  className="bg-transparent border-none text-[var(--accent-coral)] text-[10px] font-semibold cursor-pointer outline-none p-1 hover:text-[var(--text-primary)]"
                >
                  New Chat
                </button>
              </div>
              {sessions.map((s: any) => (
                <div
                  key={s.id}
                  onClick={() => { setActiveSessionId(s.id); setShowHistory(false); }}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all ${
                    s.id === activeSessionId ? 'bg-[var(--bg-tertiary)] border border-[var(--border-muted)]' : 'bg-transparent border border-transparent hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 overflow-hidden flex-1 pr-2">
                    <span className={`text-xs truncate ${s.id === activeSessionId ? 'text-[var(--accent-coral)] font-semibold' : 'text-[var(--text-primary)]'}`}>
                      {s.title}
                    </span>
                    <span className="text-[9px] text-[var(--text-tertiary)]">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="bg-transparent border-none text-[var(--text-tertiary)] hover:text-red-400 p-1 cursor-pointer outline-none"
                    title="Delete Chat"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Settings Dropdown */}
          {showSettings && (
            <div className="absolute top-[110%] right-0 w-60 bg-[var(--bg-secondary)] border border-[var(--border-strong)] shadow-2xl p-4 flex flex-col gap-3.5 z-30">
              <div>
                <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1.5">View Mode</label>
                <div className="grid grid-cols-2 gap-1 bg-[var(--bg-tertiary)] p-0.5">
                  <button
                    onClick={() => saveSettings({ ...settings, viewMode: 'standard' })}
                    className={`border-none py-1 px-2 text-[10px] font-semibold cursor-pointer ${
                      settings.viewMode === 'standard' ? 'bg-[var(--accent-coral)] text-[var(--bg-primary)]' : 'bg-transparent text-[var(--text-secondary)]'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => saveSettings({ ...settings, viewMode: 'compact' })}
                    className={`border-none py-1 px-2 text-[10px] font-semibold cursor-pointer ${
                      settings.viewMode === 'compact' ? 'bg-[var(--accent-coral)] text-[var(--bg-primary)]' : 'bg-transparent text-[var(--text-secondary)]'
                    }`}
                  >
                    Compact
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1.5">Temperament</label>
                <select
                  value={settings.agentTemperament}
                  onChange={e => saveSettings({ ...settings, agentTemperament: e.target.value as any })}
                  className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-muted)] text-[var(--text-primary)] text-[11px] outline-none"
                >
                  <option value="balanced">Balanced Mode</option>
                  <option value="precise">Deep Reasoning</option>
                  <option value="fast">High-Speed Mode</option>
                </select>
              </div>

              <button
                onClick={triggerClearChat}
                className="w-full py-2 border border-red-500/20 bg-red-500/5 text-red-400 text-[10px] font-semibold cursor-pointer transition-colors hover:bg-red-500/10"
              >
                Clear History & State
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.pdf,image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, pendingAction || 'upload_file'); e.target.value = ''; }} />
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, pendingAction || 'upload_photo'); e.target.value = ''; }} />

      {/* Messages Output */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 flex flex-col gap-5 scrollbar-thin">
        {messages.length === 0 && (
          <div className="text-center mt-12 flex flex-col items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-muted)] flex items-center justify-center relative shadow-xl">
              <div className="absolute inset-[-3px] rounded-full border-2 border-[var(--accent-coral)]/30 animate-ping" />
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-coral)" strokeWidth="2.5"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] m-0 mb-1.5 tracking-tight font-heading">Sophia AI Workspace</h2>
              <p className="text-xs text-[var(--text-tertiary)] max-w-sm mx-auto leading-relaxed">I am your automated property operative. Ask me to reconcile files, list properties, assign contractors, or verify tenants.</p>
            </div>

            {/* Quick action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full max-w-2xl mt-4">
              {[
                {
                  label: 'List a new property',
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  ),
                  msg: 'Create a new property list',
                },
                {
                  label: 'Generate invoices',
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                  ),
                  msg: 'Generate arrears invoices',
                },
                {
                  label: 'Recent activity',
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  ),
                  msg: 'What did you do recently?',
                },
              ].map((card, i) => (
                <button key={i} onClick={() => { setInput(card.msg); }} className="p-3.5 bg-[var(--bg-secondary)] border border-[var(--border-muted)] hover:border-[var(--accent-coral)] text-left cursor-pointer flex items-center gap-3 transition-colors outline-none">
                  <span className="text-[var(--accent-coral)] flex items-center">{card.icon}</span>
                  <span className="text-[11px] font-medium text-[var(--text-primary)] leading-tight">{card.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Log */}
        {messages.map((msg: AgentMessage, i: number) => (
          <div key={i} className="flex flex-col gap-1.5 animate-slide-up">
            <div className="flex items-center gap-2 mb-0.5">
              {msg.role === 'user' ? (
                <div className="w-5.5 h-5.5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-muted)] flex items-center justify-center text-[10px] font-bold text-[var(--text-primary)]">
                  {(user?.name || 'U')[0]}
                </div>
              ) : (
                <div className="w-5.5 h-5.5 rounded-full bg-[var(--accent-coral-muted)] border border-[var(--accent-coral)]/30 flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent-coral)" strokeWidth="2.5"><polyline points="4 17 10 11 4 5"/></svg>
                </div>
              )}
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                {msg.role === 'user' ? (user?.name || 'You') : 'Sophia'}
              </span>
              <span className="text-[8px] font-mono text-[var(--text-tertiary)]">{msg.timestamp}</span>
            </div>

            <div className="pl-7">
              {msg.content && <p className="text-sm text-[var(--text-primary)] m-0 leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
              {msg.blocks?.map((block: AgentResponseBlock, bi: number) => renderBlock(block, bi))}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 pl-7 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-coral)] animate-ping" />
            <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
              {currentStatus || 'Sophia is writing...'}
            </span>
          </div>
        )}
      </div>

      {/* Input Form Bar */}
      <form onSubmit={handleSubmit} className="border-t border-[var(--border-muted)] py-3 bg-[var(--bg-primary)] flex items-center gap-2 sticky bottom-0 z-20">
        <div className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-strong)] hover:border-[var(--accent-coral)] px-3 py-1 flex items-center transition-colors">
          <span className="text-[var(--text-tertiary)] font-mono font-bold text-xs select-none mr-2">&gt;</span>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
            placeholder={conversationState?.step === 'awaiting_photo' ? 'Describe corrections or click confirm above...' : 'Prompt Sophia (e.g. list property, dispatch contractor, audit invoices)...'}
            className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-xs py-2.5 px-0"
          />
        </div>
        <button type="submit" disabled={loading || !input.trim()} className={`border-none p-3 cursor-pointer flex items-center justify-center transition-all ${
          input.trim() ? 'bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)]' : 'bg-[var(--bg-tertiary)] opacity-40 cursor-default'
        }`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bg-primary)" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>

    </div>
  );
}

// ─── FORM BLOCK SUB-COMPONENT ───
function AgentFormBlock({ block, onSubmit }: { block: FormBlock; onSubmit: (data: Record<string, string>, action: string) => void }) {
  const [values, setValues] = useState<Record<string, string>>({});

  return (
    <div className="my-2.5 p-4 border border-[var(--border-muted)] bg-[var(--bg-tertiary)]">
      <div className="flex flex-col gap-3">
        {block.fields.map(field => (
          <div key={field.key}>
            <label className="text-[10px] font-semibold text-[var(--text-secondary)] block mb-1">
              {field.label} {field.required && <span className="text-[var(--accent-coral)]">*</span>}
            </label>
            {field.fieldType === 'select' ? (
              <select
                value={values[field.key] || ''}
                onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                className="w-full p-2 bg-[var(--bg-secondary)] border border-[var(--border-muted)] text-[var(--text-primary)] text-xs outline-none"
              >
                <option value="">Select option...</option>
                {field.options?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                type={field.fieldType}
                placeholder={field.placeholder}
                value={values[field.key] || ''}
                onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                className="w-full p-2 bg-[var(--bg-secondary)] border border-[var(--border-muted)] text-[var(--text-primary)] text-xs outline-none"
              />
            )}
          </div>
        ))}
      </div>
      <button
        onClick={() => onSubmit(values, block.onSubmitAction)}
        className="mt-4 px-5 py-2.5 bg-[var(--accent-coral)] border-none text-[var(--bg-primary)] text-xs font-semibold cursor-pointer hover:bg-[var(--accent-coral-hover)] shadow-lg shadow-coral-500/10 transition-colors"
      >
        {block.submitLabel}
      </button>
    </div>
  );
}
