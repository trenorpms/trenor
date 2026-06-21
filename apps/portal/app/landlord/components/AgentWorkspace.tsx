'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

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

interface AgentWorkspaceProps {
  addToast: (msg: string, type: 'success' | 'info' | 'error') => void;
  router: any;
  user: any;
}

const API = 'http://localhost:4000/api';

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
  formatted = formatted.replace(/`(.*?)`/g, '<code style="font-family: var(--font-mono); background: rgba(255,255,255,0.08); padding: 2px 4px; border-radius: 3px; font-size: 11.5px; color: var(--accent-coral);">$1</code>');

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
    <div style={{ margin: '4px 0' }}>
      <p 
        style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}
        dangerouslySetInnerHTML={{ __html: formatMessageText(displayText) }}
      />
      {shouldCollapse && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-coral)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '4px 0 0 0',
            outline: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--accent-coral)'}
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
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(10, 11, 14, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeIn 0.2s ease forwards'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-muted)',
        borderRadius: '6px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        transform: 'scale(0.95)',
        animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 10px 0', letterSpacing: '-0.3px' }}>{title}</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 20px 0' }}>{message}</p>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-muted)',
              borderRadius: '4px',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--accent-coral)',
              border: 'none',
              borderRadius: '4px',
              color: 'var(--bg-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              boxShadow: '0 4px 12px rgba(255, 107, 107, 0.2)'
            }}
          >
            Confirm
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function AgentWorkspace({ addToast, router, user }: AgentWorkspaceProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Settings Panel State
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    viewMode: 'standard' as 'standard' | 'compact',
    agentTemperament: 'balanced' as 'balanced' | 'precise' | 'fast',
  });

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

    const currentHistory = extra?.currentHistory || messages;

    const formPayload = new FormData();
    formPayload.append('action', action);
    if (extra?.message) formPayload.append('message', extra.message);
    if (extra?.file) formPayload.append('file', extra.file);
    if (extra?.formData) formPayload.append('formData', JSON.stringify(extra.formData));
    formPayload.append('conversationState', JSON.stringify(conversationState));
    formPayload.append('landlordName', user?.name || 'Landlord');
    formPayload.append('landlordEmail', user?.email || '');
    formPayload.append('temperament', settings.agentTemperament);
    formPayload.append('chatHistory', JSON.stringify(currentHistory));

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
      updateCurrentSession(newMsgs, conversationState);
    } finally {
      setLoading(false);
    }
  }, [conversationState, user, messages, settings, sessions, activeSessionId]);

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
    await sendToAgent(action, { currentHistory: messages });
  };

  // ─── RENDER BLOCK ───
  const renderBlock = (block: AgentResponseBlock, idx: number) => {
    switch (block.type) {
      case 'text':
        return <CollapsibleText key={idx} content={block.content} viewMode={settings.viewMode} />;

      case 'error':
        return (
          <div key={idx} style={{ padding: '12px 16px', backgroundColor: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: '4px', margin: '8px 0' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-coral)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              {block.message}
            </div>
            {block.suggestion && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{block.suggestion}</div>}
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
            style={{ padding: '24px', border: '2px dashed var(--border-muted)', borderRadius: '4px', textAlign: 'center', cursor: 'pointer', margin: '8px 0', transition: 'border-color 0.2s' }}
          >
            <div style={{ marginBottom: '8px', color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{block.label}</div>
            {block.description && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{block.description}</div>}
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '8px' }}>Accepts: {block.accept}</div>
          </div>
        );

      case 'image_upload':
        return (
          <div key={idx}
            onClick={() => { setPendingAction(block.onUploadAction); photoInputRef.current?.click(); }}
            style={{ padding: '16px', border: '2px dashed var(--border-muted)', borderRadius: '4px', textAlign: 'center', cursor: 'pointer', margin: '8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{block.label}</div>
              {block.description && <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{block.description}</div>}
            </div>
          </div>
        );

      case 'form':
        return <AgentFormBlock key={idx} block={block} onSubmit={handleFormSubmit} />;

      case 'data_table':
        return (
          <div key={idx} style={{ margin: '8px 0', borderRadius: '4px', border: '1px solid var(--border-muted)', overflow: 'hidden' }}>
            {block.title && <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-muted)' }}>{block.title}</div>}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr>
                    {block.columns.map(col => (
                      <th key={col.key} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-tertiary)', fontWeight: 600, borderBottom: '1px solid var(--border-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, ri) => (
                    <tr key={ri} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                      {block.columns.map(col => (
                        <td key={col.key} style={{ padding: '6px 12px', color: 'var(--text-secondary)' }}>
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
          <div key={idx} style={{ margin: '12px 0', display: 'flex', flexDirection: 'column', gap: '0' }}>
            {block.steps.map((step, si) => (
              <div key={si} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px' }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0,
                    backgroundColor: step.status === 'done' ? 'rgba(52,211,153,0.15)' : step.status === 'running' ? 'rgba(255,107,107,0.15)' : step.status === 'error' ? 'rgba(255,107,107,0.3)' : 'var(--bg-tertiary)',
                    border: step.status === 'done' ? '1px solid #34d399' : step.status === 'running' ? '1px solid var(--accent-coral)' : '1px solid var(--border-muted)',
                    color: step.status === 'done' ? '#34d399' : step.status === 'running' ? 'var(--accent-coral)' : 'var(--text-tertiary)',
                  }}>
                    {step.status === 'done' ? '✓' : step.status === 'running' ? <span style={{ width: '6px', height: '6px', borderRadius: '50%', border: '1.5px solid currentColor', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', display: 'inline-block' }} /> : step.status === 'error' ? '✕' : '○'}
                  </div>
                  {si < block.steps.length - 1 && <div style={{ flex: 1, width: '1px', minHeight: '16px', backgroundColor: step.status === 'done' ? '#34d399' : 'var(--border-muted)' }} />}
                </div>
                <div style={{ paddingBottom: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: step.status === 'pending' ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>{step.title}</div>
                  {step.description && <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{step.description}</div>}
                </div>
              </div>
            ))}
          </div>
        );

      case 'confirmation':
        return (
          <div key={idx} style={{ margin: '12px 0', padding: '16px', border: '1px solid var(--border-muted)', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>{block.title}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              {Object.entries(block.summary).map(([k, v]) => (
                <div key={k} style={{ fontSize: '11px' }}>
                  <span style={{ color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{k}: </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{String(v)}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleConfirm(block.confirmAction)}
                disabled={loading}
                style={{ padding: '8px 20px', backgroundColor: 'var(--accent-coral)', border: 'none', borderRadius: '4px', color: 'var(--bg-primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                {loading ? 'Processing...' : 'Confirm & Deploy'}
              </button>
              {block.cancelAction && (
                <button
                  onClick={() => handleConfirm(block.cancelAction!)}
                  style={{ padding: '8px 20px', backgroundColor: 'transparent', border: '1px solid var(--border-muted)', borderRadius: '4px', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}
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
    <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 150px)', position: 'relative' }}>
      
      {/* Reusable confirmation modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Header Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 0 12px 0',
        borderBottom: '1px solid var(--border-muted)',
        position: 'relative',
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="pulse-dot" style={{ width: '6px', height: '6px', backgroundColor: loading ? 'var(--accent-coral)' : '#10b981', borderRadius: '50%' }} />
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {loading ? 'System processing...' : 'Agent link synchronized'}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          {/* New Chat Button */}
          <button
            onClick={handleStartNewChat}
            style={{
              background: 'none',
              border: '1px solid var(--border-muted)',
              borderRadius: '4px',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              transition: 'background-color 0.2s',
            }}
            title="New Chat"
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>

          {/* History Button */}
          <button
            onClick={() => { setShowHistory(!showHistory); setShowSettings(false); }}
            style={{
              background: 'none',
              border: '1px solid var(--border-muted)',
              borderRadius: '4px',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: showHistory ? 'var(--bg-tertiary)' : 'transparent',
              transition: 'background-color 0.2s',
            }}
            title="Chat History"
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = showHistory ? 'var(--bg-tertiary)' : 'transparent'}
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
            style={{
              background: 'none',
              border: '1px solid var(--border-muted)',
              borderRadius: '4px',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: showSettings ? 'var(--bg-tertiary)' : 'transparent',
              transition: 'background-color 0.2s',
            }}
            title="Settings"
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = showSettings ? 'var(--bg-tertiary)' : 'transparent'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>

          {/* History Dropdown */}
          {showHistory && (
            <div style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              width: '280px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-muted)',
              borderRadius: '4px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              zIndex: 100,
              maxHeight: '350px',
              overflowY: 'auto',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-muted)', paddingBottom: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chats History</span>
                <button
                  onClick={handleStartNewChat}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-coral)',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                    padding: '2px 4px',
                  }}
                >
                  New Chat
                </button>
              </div>
              {sessions.map((s: any) => (
                <div
                  key={s.id}
                  onClick={() => { setActiveSessionId(s.id); setShowHistory(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '4px',
                    backgroundColor: s.id === activeSessionId ? 'var(--bg-tertiary)' : 'transparent',
                    border: s.id === activeSessionId ? '1px solid var(--border-muted)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    if (s.id !== activeSessionId) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (s.id !== activeSessionId) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', flex: 1, paddingRight: '8px' }}>
                    <span style={{
                      fontSize: '12px',
                      color: s.id === activeSessionId ? 'var(--accent-coral)' : 'var(--text-primary)',
                      fontWeight: s.id === activeSessionId ? 600 : 400,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {s.title}
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>
                      {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-tertiary)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Delete Chat"
                    onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Settings Dropdown */}
          {showSettings && (
            <div style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              width: '240px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-muted)',
              borderRadius: '4px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              zIndex: 100,
            }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>View Mode</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', backgroundColor: 'var(--bg-tertiary)', padding: '2px', borderRadius: '3px' }}>
                  <button
                    onClick={() => saveSettings({ ...settings, viewMode: 'standard' })}
                    style={{
                      border: 'none', padding: '4px 8px', fontSize: '11px', borderRadius: '2px', cursor: 'pointer',
                      backgroundColor: settings.viewMode === 'standard' ? 'var(--accent-coral)' : 'transparent',
                      color: settings.viewMode === 'standard' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                      fontWeight: settings.viewMode === 'standard' ? 600 : 400,
                    }}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => saveSettings({ ...settings, viewMode: 'compact' })}
                    style={{
                      border: 'none', padding: '4px 8px', fontSize: '11px', borderRadius: '2px', cursor: 'pointer',
                      backgroundColor: settings.viewMode === 'compact' ? 'var(--accent-coral)' : 'transparent',
                      color: settings.viewMode === 'compact' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                      fontWeight: settings.viewMode === 'compact' ? 600 : 400,
                    }}
                  >
                    Compact
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Agent Model Speed</label>
                <select
                  value={settings.agentTemperament}
                  onChange={e => saveSettings({ ...settings, agentTemperament: e.target.value as any })}
                  style={{
                    width: '100%', padding: '6px 8px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-muted)',
                    color: 'var(--text-primary)', fontSize: '11.5px', borderRadius: '3px', outline: 'none'
                  }}
                >
                  <option value="balanced">Balanced Mode</option>
                  <option value="precise">Deep Reasoning</option>
                  <option value="fast">High-Speed Mode</option>
                </select>
              </div>

              <button
                onClick={triggerClearChat}
                style={{
                  width: '100%', padding: '8px', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '3px',
                  backgroundColor: 'rgba(248,113,113,0.05)', color: '#f87171', fontSize: '11px', fontWeight: 600,
                  cursor: 'pointer', transition: 'background-color 0.2s', marginTop: '4px'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.1)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.05)'}
              >
                Clear History & State
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.pdf,image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, pendingAction || 'upload_file'); e.target.value = ''; }} />
      <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, pendingAction || 'upload_photo'); e.target.value = ''; }} />

      {/* Messages Area */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Welcome state */}
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-muted)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: '-3px', borderRadius: '50%', border: '1.5px solid var(--accent-coral)', opacity: 0.3, animation: 'pulse 2s ease infinite' }} />
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-coral)" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>AI Operation Terminal</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>Ask me to list a property, generate invoices, or check recent activity.</p>
            </div>

            {/* Quick action cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', width: '100%', maxWidth: '600px', marginTop: '16px' }}>
              {[
                {
                  label: 'List a new property',
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  ),
                  msg: 'I want to list a new property'
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
                  msg: 'Generate arrears invoices'
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
                  msg: 'What did you do recently?'
                },
              ].map((card, i) => (
                <button key={i} onClick={() => { setInput(card.msg); }} className="card-border" style={{ padding: '14px', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', outline: 'none' }}>
                  <span style={{ display: 'flex', alignItems: 'center', color: 'var(--accent-coral)' }}>{card.icon}</span>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{card.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg: AgentMessage, i: number) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', animation: 'slideInRight 0.3s ease forwards' }}>
            {/* Role label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              {msg.role === 'user' ? (
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-muted)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {(user?.name || 'U')[0]}
                </div>
              ) : (
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent-coral)" strokeWidth="2.5"><polyline points="4 17 10 11 4 5"/></svg>
                </div>
              )}
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {msg.role === 'user' ? (user?.name || 'You') : 'Agent'}
              </span>
              <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{msg.timestamp}</span>
            </div>

            {/* Content */}
            <div style={{ marginLeft: '30px' }}>
              {msg.content && <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, lineHeight: '1.5' }}>{msg.content}</p>}
              {msg.blocks?.map((block, bi) => renderBlock(block, bi))}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '30px', padding: '8px 0' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-coral)', animation: 'pulse 1s ease infinite' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>Processing request...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} style={{
        borderTop: '1px solid var(--border-muted)',
        padding: '12px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        position: 'sticky',
        bottom: 0,
        backgroundColor: 'var(--bg-primary)',
      }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-muted)', borderRadius: '4px', padding: '4px 12px',
        }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
            placeholder={conversationState?.step === 'awaiting_photo' ? 'Describe corrections, or deploy above...' : 'Ask me anything — list property, check activity, generate invoices...'}
            style={{ flex: 1, backgroundColor: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '13px', padding: '8px 4px' }}
          />
        </div>
        <button type="submit" disabled={loading || !input.trim()} style={{
          backgroundColor: input.trim() ? 'var(--accent-coral)' : 'var(--bg-tertiary)',
          border: 'none', borderRadius: '4px', padding: '10px 14px', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center',
          opacity: input.trim() ? 1 : 0.5,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bg-primary)" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>

      <style jsx global>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── FORM BLOCK SUB-COMPONENT ───
function AgentFormBlock({ block, onSubmit }: { block: FormBlock; onSubmit: (data: Record<string, string>, action: string) => void }) {
  const [values, setValues] = useState<Record<string, string>>({});

  return (
    <div style={{ margin: '8px 0', padding: '16px', border: '1px solid var(--border-muted)', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {block.fields.map(field => (
          <div key={field.key}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              {field.label} {field.required && <span style={{ color: 'var(--accent-coral)' }}>*</span>}
            </label>
            <input
              type={field.fieldType === 'select' ? 'text' : field.fieldType}
              placeholder={field.placeholder}
              value={values[field.key] || ''}
              onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
              style={{
                width: '100%', padding: '6px 10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-muted)',
                borderRadius: '3px', color: 'var(--text-primary)', fontSize: '12px', outline: 'none',
              }}
            />
          </div>
        ))}
      </div>
      <button
        onClick={() => onSubmit(values, block.onSubmitAction)}
        style={{
          marginTop: '16px', padding: '8px 20px', backgroundColor: 'var(--accent-coral)', border: 'none',
          borderRadius: '4px', color: 'var(--bg-primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
        }}
      >
        {block.submitLabel}
      </button>
    </div>
  );
}
