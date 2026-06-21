'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRealtime } from '../../hooks/useRealtime';

interface TextBlock { type: 'text'; content: string; }
interface DataTableBlock {
  type: 'data_table';
  title?: string;
  columns: { key: string; label: string }[];
  rows: Record<string, any>[];
  editable: boolean;
}
interface ErrorBlock { type: 'error'; message: string; suggestion?: string; }
type AgentResponseBlock = TextBlock | DataTableBlock | ErrorBlock;

interface AgentMessage {
  role: 'user' | 'agent';
  blocks?: AgentResponseBlock[];
  content?: string;
  timestamp: string;
}

interface TenantAgentWorkspaceProps {
  user: any;
  profile: any;
  addToast: (msg: string, type: 'success' | 'info' | 'error') => void;
  onRefreshData?: () => void;
  theme?: 'light' | 'dark';
  onPayInvoice?: (invoiceId: string) => Promise<void>;
}

export default function TenantAgentWorkspace({
  user,
  profile,
  addToast,
  onRefreshData,
  theme = 'dark',
  onPayInvoice
}: TenantAgentWorkspaceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
  }, []);

  const isLight = theme === 'light';

  // ─── DYNAMIC THEME COLOR PALETTE ───
  const colors = {
    bgPanel: isLight ? 'rgba(255, 255, 255, 0.92)' : 'rgba(17, 18, 23, 0.82)',
    borderPanel: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
    bgHeader: isLight ? 'rgba(243, 244, 246, 0.8)' : 'rgba(10, 11, 14, 0.5)',
    textMain: isLight ? '#1f2937' : '#fedaec',
    textSub: isLight ? 'rgba(31, 41, 55, 0.6)' : 'rgba(255, 255, 255, 0.4)',
    textBody: isLight ? '#2d3748' : 'rgba(255, 255, 255, 0.9)',
    bgBubbleUser: isLight ? 'rgba(255, 107, 107, 0.06)' : 'rgba(255, 107, 107, 0.12)',
    borderBubbleUser: isLight ? 'rgba(255, 107, 107, 0.15)' : 'rgba(255, 107, 107, 0.2)',
    bgBubbleAgent: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)',
    borderBubbleAgent: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
    bgCard: isLight ? '#ffffff' : 'rgba(0, 0, 0, 0.25)',
    borderCard: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.06)',
    textHighlight: isLight ? '#000000' : '#ffffff',
    bgInput: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.04)',
    borderInput: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
    textInput: isLight ? '#000000' : '#ffffff',
    shadow: isLight ? '0 12px 40px rgba(0,0,0,0.1)' : '0 24px 70px rgba(0,0,0,0.6)',
  };

  // ─── RICH TEXT FORMATTER ───
  const renderFormattedText = useCallback((text: string) => {
    if (!text) return null;
    const paragraphs = text.split('\n');

    return paragraphs.map((para, pIdx) => {
      let parts: React.ReactNode[] = [para];

      const replacePattern = (regex: RegExp, replacer: (match: string, p1: string) => React.ReactNode) => {
        const newParts: React.ReactNode[] = [];
        for (const part of parts) {
          if (typeof part !== 'string') {
            newParts.push(part);
            continue;
          }

          let lastIndex = 0;
          let match;
          regex.lastIndex = 0;

          while ((match = regex.exec(part)) !== null) {
            const index = match.index;
            if (index > lastIndex) {
              newParts.push(part.substring(lastIndex, index));
            }
            newParts.push(replacer(match[0], match[1] || ''));
            lastIndex = regex.lastIndex;
          }

          if (lastIndex < part.length) {
            newParts.push(part.substring(lastIndex));
          }
        }
        parts = newParts;
      };

      // 1. Triple asterisks (bold italic)
      replacePattern(/\*\*\*([^*]+)\*\*\*/g, (_, p1) => (
        <strong key={p1} style={{ fontStyle: 'italic', fontWeight: 'bold', color: colors.textHighlight }}>{p1}</strong>
      ));

      // 2. Double asterisks (bold)
      replacePattern(/\*\*([^*]+)\*\*/g, (_, p1) => (
        <strong key={p1} style={{ fontWeight: 'bold', color: colors.textHighlight }}>{p1}</strong>
      ));

      // 3. Single asterisks (italic)
      replacePattern(/\*([^*]+)\*/g, (_, p1) => (
        <em key={p1} style={{ fontStyle: 'italic' }}>{p1}</em>
      ));

      // 4. Custom colors
      replacePattern(/\[coral\](.*?)\[\/coral\]/g, (_, p1) => (
        <span key={p1} style={{ color: 'var(--accent-coral, #ff6b6b)', fontWeight: 600 }}>{p1}</span>
      ));

      replacePattern(/\[green\](.*?)\[\/green\]/g, (_, p1) => (
        <span key={p1} style={{ color: '#10b981', fontWeight: 600 }}>{p1}</span>
      ));

      replacePattern(/\[blue\](.*?)\[\/blue\]/g, (_, p1) => (
        <span key={p1} style={{ color: '#3b82f6', fontWeight: 600 }}>{p1}</span>
      ));

      replacePattern(/\[gold\](.*?)\[\/gold\]/g, (_, p1) => (
        <span key={p1} style={{ color: '#f59e0b', fontWeight: 600 }}>{p1}</span>
      ));

      replacePattern(/\[gray\](.*?)\[\/gray\]/g, (_, p1) => (
        <span key={p1} style={{ color: colors.textSub, opacity: 0.85 }}>{p1}</span>
      ));

      return (
        <p key={pIdx} style={{ margin: '0 0 8px 0', minHeight: '1.2em' }}>
          {parts}
        </p>
      );
    });
  }, [colors.textHighlight, colors.textSub]);

  // ─── PERSISTENCE (LocalStorage) ───
  const getWelcomeMessage = useCallback(() => ([
    {
      role: 'agent',
      blocks: [{
        type: 'text',
        content: `Hi ${profile?.name || 'there'}! I'm Sophia, your personal assistant. \n\nYou can ask me to: \n• *Issue a high urgency ticket for a leaking roof*\n• *Check how much you owe*\n• *Show your last invoices*\n• *Check status of a maintenance request*\n• *Give you a summary of everything*`
      }],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ] as AgentMessage[]), [profile?.name]);

  useEffect(() => {
    if (!user?.id) return;
    const saved = localStorage.getItem(`trenor_tenant_chat_${user.id}`);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch {
        setMessages(getWelcomeMessage());
      }
    } else {
      setMessages(getWelcomeMessage());
    }
  }, [user?.id, getWelcomeMessage]);

  const saveMessages = (msgs: AgentMessage[]) => {
    setMessages(msgs);
    if (user?.id) {
      localStorage.setItem(`trenor_tenant_chat_${user.id}`, JSON.stringify(msgs));
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Subscribe to Sophia's real-time events
  useRealtime(user, useCallback((notif: any) => {
    if (notif.title === 'Sophia') {
      setCurrentStatus(notif.message);
    }
  }, []));

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setCurrentStatus('');
    setLoading(true);

    const updatedMsgs: AgentMessage[] = [...messages, {
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }];
    saveMessages(updatedMsgs);

    try {
      const response = await fetch(`${API}/agent/run-tenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id || ''}`
        },
        body: JSON.stringify({
          message: userText,
          chatHistory: updatedMsgs
        })
      });

      const agentMsgIndex = updatedMsgs.length;
      const finalMsgs: AgentMessage[] = [...updatedMsgs, {
        role: 'agent',
        blocks: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }];
      saveMessages(finalMsgs);

      if (!response.ok) throw new Error('Response error');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const chunk = JSON.parse(line);
                if (chunk.blocks) {
                  finalMsgs[agentMsgIndex].blocks = chunk.blocks;
                  saveMessages([...finalMsgs]);
                }
              } catch (e) {
                console.error("Error parsing NDJSON chunk", e);
              }
            }
          }
        }
      }

      if (onRefreshData) {
        onRefreshData();
      }
    } catch (err: any) {
      console.error("runTenant stream parsing error:", err);
      const finalMsgs: AgentMessage[] = [...updatedMsgs, {
        role: 'agent',
        blocks: [{ type: 'error', message: 'Connection error. Make sure the backend is running.' }],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }];
      saveMessages(finalMsgs);
    } finally {
      setLoading(false);
      setCurrentStatus('');
    }
  };

  const handleNewChat = () => {
    if (window.confirm('Start a new conversation with Sophia?')) {
      const newMsgs = getWelcomeMessage();
      saveMessages(newMsgs);
    }
  };

  return (
    <>
      {/* Floating Orb trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '28px',
          backgroundColor: 'var(--accent-coral, #ff6b6b)',
          border: 'none',
          boxShadow: '0 8px 32px rgba(255, 107, 107, 0.4), 0 0 0 1px rgba(255, 107, 107, 0.2)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          outline: 'none',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(255, 107, 107, 0.5), 0 0 15px rgba(255, 107, 107, 0.3)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 107, 107, 0.4), 0 0 0 1px rgba(255, 107, 107, 0.2)';
        }}
      >
        {isOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <div style={{ position: 'relative' }}>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white animate-pulse" />
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
        )}
      </button>

      {/* Floating Glassmorphic Workspace Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '96px',
            right: '24px',
            width: '400px',
            height: '600px',
            borderRadius: '16px',
            backgroundColor: colors.bgPanel,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${colors.borderPanel}`,
            boxShadow: colors.shadow,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9998,
            overflow: 'hidden',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${colors.borderPanel}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.bgHeader,
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-coral, #ff6b6b)" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                </svg>
                <div style={{ position: 'absolute', bottom: '0', right: '0', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', border: isLight ? '1.5px solid #ffffff' : '1.5px solid #0b0c10' }}></div>
              </div>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: colors.textMain, margin: 0 }}>Sophia</h4>
                <p style={{ fontSize: '10px', color: colors.textSub, margin: 0 }}>Connected</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              {/* New Chat Plus Button */}
              <button
                onClick={handleNewChat}
                title="New Chat"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: colors.textSub,
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-coral, #ff6b6b)'}
                onMouseLeave={e => e.currentTarget.style.color = colors.textSub}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>

              {/* Trash Clear History Button */}
              <button
                onClick={() => {
                  if (window.confirm('Clear all conversation history?')) {
                    saveMessages(getWelcomeMessage());
                  }
                }}
                title="Clear Conversation"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: colors.textSub,
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-coral, #ff6b6b)'}
                onMouseLeave={e => e.currentTarget.style.color = colors.textSub}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {msg.role === 'user' ? (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px 12px 0 12px',
                      backgroundColor: colors.bgBubbleUser,
                      border: colors.borderBubbleUser,
                      color: colors.textMain,
                      fontSize: '12px',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {msg.content}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    {msg.blocks?.map((block, bIndex) => {
                      if (block.type === 'text') {
                        return (
                          <div
                            key={bIndex}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '12px 12px 12px 0',
                              backgroundColor: colors.bgBubbleAgent,
                              border: colors.borderBubbleAgent,
                              color: colors.textBody,
                              fontSize: '12px',
                              lineHeight: 1.5,
                            }}
                          >
                            {renderFormattedText(block.content)}
                          </div>
                        );
                      }
                      
                      if (block.type === 'data_table') {
                        const isInvoiceTable = block.columns.some(c => c.key === 'amount') || block.title?.toLowerCase()?.includes('invoice');

                        if (isInvoiceTable) {
                          return (
                            <div key={bIndex} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {block.title && (
                                <div style={{ fontWeight: 600, color: 'var(--accent-coral, #ff6b6b)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  {block.title}
                                </div>
                              )}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                                {block.rows.map((row, rIdx) => {
                                  const isPaid = row.status?.toLowerCase() === 'paid' || row.status === '✓';
                                  const amt = Number(row.amount || row.amountDue || 0);
                                  return (
                                    <div
                                      key={rIdx}
                                      style={{
                                        background: colors.bgCard,
                                        border: colors.borderCard,
                                        borderRadius: '10px',
                                        padding: '12px 14px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '12px',
                                        width: '100%',
                                        boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.02)' : 'none'
                                      }}
                                    >
                                      <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <span style={{ fontWeight: 700, fontSize: '14px', color: colors.textHighlight }}>
                                            €{amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </span>
                                          <span
                                            style={{
                                              fontSize: '9px',
                                              padding: '2px 6px',
                                              borderRadius: '12px',
                                              fontWeight: 600,
                                              backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 107, 107, 0.1)',
                                              color: isPaid ? '#10b981' : 'var(--accent-coral, #ff6b6b)'
                                            }}
                                          >
                                            {isPaid ? 'Paid' : 'Unpaid'}
                                          </span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: colors.textSub, marginTop: '4px' }}>
                                          {row.description || 'Rental invoice / utility fee'}
                                        </div>
                                        {row.createdAt && (
                                          <div style={{ fontSize: '9px', color: colors.textSub, opacity: 0.6, marginTop: '2px' }}>
                                            Issued on {new Date(row.createdAt).toLocaleDateString()}
                                          </div>
                                        )}
                                      </div>

                                      {!isPaid && onPayInvoice && (
                                        <button
                                          onClick={() => onPayInvoice(row.id || row.invoiceId)}
                                          style={{
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            backgroundColor: 'var(--accent-coral, #ff6b6b)',
                                            color: '#ffffff',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            border: 'none',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(255, 107, 107, 0.2)',
                                            transition: 'all 0.2s',
                                            whiteSpace: 'nowrap'
                                          }}
                                        >
                                          Pay
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }

                        // Fallback general table rendering
                        return (
                          <div
                            key={bIndex}
                            style={{
                              backgroundColor: colors.bgCard,
                              border: colors.borderCard,
                              borderRadius: '8px',
                              padding: '10px',
                              width: '100%',
                              overflowX: 'auto',
                              fontSize: '11px'
                            }}
                          >
                            {block.title && (
                              <div style={{ fontWeight: 600, color: 'var(--accent-coral, #ff6b6b)', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {block.title}
                              </div>
                            )}
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                              <thead>
                                <tr style={{ borderBottom: `1px solid ${colors.borderPanel}` }}>
                                  {block.columns.map((col, cIdx) => (
                                    <th key={cIdx} style={{ padding: '6px 4px', color: colors.textSub, fontWeight: 500 }}>
                                      {col.label}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {block.rows.map((row, rIdx) => (
                                  <tr key={rIdx} style={{ borderBottom: rIdx < block.rows.length - 1 ? `1px solid ${colors.borderPanel}` : 'none' }}>
                                    {block.columns.map((col, cIdx) => (
                                      <td key={cIdx} style={{ padding: '6px 4px', color: col.key === 'status' && (row[col.key] === '✓' || row[col.key]?.toLowerCase() === 'completed') ? '#10b981' : colors.textBody }}>
                                        {row[col.key]}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      }

                      if (block.type === 'error') {
                        return (
                          <div
                            key={bIndex}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              color: '#ef4444',
                              fontSize: '11px',
                              lineHeight: 1.5
                            }}
                          >
                            <strong>Error:</strong> {block.message}
                            {block.suggestion && <div style={{ marginTop: '4px', opacity: 0.8 }}>{block.suggestion}</div>}
                          </div>
                        );
                      }
                      
                      return null;
                    })}
                  </div>
                )}
                <span style={{ fontSize: '9px', color: colors.textSub, marginTop: '4px', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Loading / Status bubbles */}
            {loading && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '85%' }}>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px 12px 12px 0',
                    backgroundColor: colors.bgBubbleAgent,
                    border: colors.borderBubbleAgent,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-coral, #ff6b6b)] animate-pulse" />
                  <span style={{ fontSize: '11px', color: colors.textSub, fontFamily: 'monospace' }}>
                    {currentStatus || 'Sophia is writing...'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Input */}
          <form
            onSubmit={handleSendMessage}
            style={{
              padding: '16px',
              borderTop: `1px solid ${colors.borderPanel}`,
              backgroundColor: colors.bgHeader,
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              placeholder="Ask Sophia anything..."
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: colors.bgInput,
                border: `1px solid ${colors.borderInput}`,
                color: colors.textInput,
                fontSize: '12px',
                outline: 'none',
                transition: 'all 0.2s',
              }}
              onFocus={e => {
                e.currentTarget.style.border = '1px solid rgba(255, 107, 107, 0.3)';
                e.currentTarget.style.backgroundColor = isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.06)';
              }}
              onBlur={e => {
                e.currentTarget.style.border = `1px solid ${colors.borderInput}`;
                e.currentTarget.style.backgroundColor = colors.bgInput;
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: input.trim() && !loading ? 'var(--accent-coral, #ff6b6b)' : 'rgba(255,255,255,0.04)',
                border: 'none',
                color: input.trim() && !loading ? '#ffffff' : 'rgba(255,255,255,0.2)',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                outline: 'none'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>

          {/* Custom style tags for slideUp animation */}
          <style jsx>{`
            @keyframes slideUp {
              from {
                transform: translateY(20px);
                opacity: 0;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
