'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function SophiaFloatingWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationState, setConversationState] = useState<any>({});
  const [user, setUser] = useState<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user details
  useEffect(() => {
    const session = localStorage.getItem('user');
    if (session) {
      try {
        setUser(JSON.parse(session));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Persistence per user
  useEffect(() => {
    if (!user?.id) return;
    const saved = localStorage.getItem(`trenor_floating_chat_${user.id}`);
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch {}
    }
    const stateSaved = localStorage.getItem(`trenor_floating_state_${user.id}`);
    if (stateSaved) {
      try { setConversationState(JSON.parse(stateSaved)); } catch {}
    }
  }, [user]);

  const saveHistory = (newMsgs: AgentMessage[]) => {
    setMessages(newMsgs);
    if (user?.id) {
      localStorage.setItem(`trenor_floating_chat_${user.id}`, JSON.stringify(newMsgs));
    }
  };

  const saveState = (newState: any) => {
    setConversationState(newState);
    if (user?.id) {
      localStorage.setItem(`trenor_floating_state_${user.id}`, JSON.stringify(newState));
    }
  };

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [isOpen, messages, scrollToBottom]);

  // Send request
  const handleSend = async (action: string, textOverride?: string, file?: File, formData?: Record<string, string>) => {
    setLoading(true);
    const msgToSend = textOverride || input.trim();
    if (!msgToSend && !file && !formData) {
      setLoading(false);
      return;
    }

    if (!textOverride && !file && !formData) setInput('');

    // Append user message
    const newMsgs = [...messages];
    if (msgToSend) {
      newMsgs.push({ role: 'user', content: msgToSend, timestamp: new Date().toLocaleTimeString() });
    } else if (file) {
      newMsgs.push({ role: 'user', content: `📎 Attached: ${file.name}`, timestamp: new Date().toLocaleTimeString() });
    }
    saveHistory(newMsgs);

    const payload = new FormData();
    payload.append('action', action);
    if (msgToSend) payload.append('message', msgToSend);
    if (file) payload.append('file', file);
    if (formData) payload.append('formData', JSON.stringify(formData));
    payload.append('conversationState', JSON.stringify(conversationState));
    payload.append('landlordName', user?.name || 'Operator');
    payload.append('landlordEmail', user?.email || '');
    payload.append('temperament', 'balanced');

    try {
      const res = await fetch(`${API}/agent/run`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user?.id || ''}` },
        body: payload
      });

      const agentMsgIndex = newMsgs.length;
      const updatedMsgs = [...newMsgs, {
        role: 'agent' as const,
        blocks: [] as any[],
        timestamp: new Date().toLocaleTimeString()
      }];
      saveHistory(updatedMsgs);

      if (!res.ok) {
        throw new Error('Response error');
      }

      const reader = res.body?.getReader();
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
                  updatedMsgs[agentMsgIndex].blocks = chunk.blocks;
                  saveHistory([...updatedMsgs]);
                }
                if (chunk.conversationState) {
                  saveState(chunk.conversationState);
                }
              } catch (err) {
                console.error('Error parsing stream chunk:', err);
              }
            }
          }
        }
      }
    } catch (e) {
      saveHistory([...newMsgs, {
        role: 'agent',
        blocks: [{ type: 'error', message: 'Failed to run Sophia. Check backend link.' }],
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSend('upload_file', undefined, file);
    }
  };

  const renderBlock = (block: AgentResponseBlock, idx: number) => {
    switch (block.type) {
      case 'text':
        return (
          <p key={idx} className="text-xs text-[var(--text-secondary)] leading-relaxed m-0 my-1 whitespace-pre-wrap">
            {block.content}
          </p>
        );
      case 'error':
        return (
          <div key={idx} className="p-2 bg-red-500/10 border border-red-500/25 my-1 text-[10px] text-red-400">
            {block.message}
          </div>
        );
      case 'step_guide':
        return (
          <div key={idx} className="my-1.5 flex flex-col gap-0.5 font-mono text-[9px]">
            {block.steps.map((s, i) => (
              <div key={i} className="flex gap-1.5 items-center">
                <span className={s.status === 'done' ? 'text-emerald-400' : s.status === 'running' ? 'text-[var(--accent-coral)] animate-pulse' : 'text-[var(--text-tertiary)]'}>
                  {s.status === 'done' ? '✓' : s.status === 'running' ? '●' : '○'}
                </span>
                <span className="text-[var(--text-primary)]">{s.title}</span>
              </div>
            ))}
          </div>
        );
      case 'confirmation':
        return (
          <div key={idx} className="p-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-muted)] my-1.5">
            <span className="text-[10px] font-semibold text-[var(--text-primary)] block mb-1.5">{block.title}</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => handleSend(block.confirmAction)}
                disabled={loading}
                className="px-2.5 py-1 bg-[var(--accent-coral)] text-xs text-[var(--bg-primary)] border-none font-bold cursor-pointer"
              >
                Confirm
              </button>
              {block.cancelAction && (
                <button
                  onClick={() => handleSend(block.cancelAction!)}
                  className="px-2.5 py-1 bg-transparent border border-[var(--border-muted)] text-[var(--text-secondary)] text-xs cursor-pointer hover:bg-[var(--bg-secondary)]"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        );
      default:
        return <div key={idx} className="text-[10px] text-[var(--text-tertiary)] italic">Interactive block - open full Agent Workspace to complete.</div>;
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-8 right-8 z-40">
        <motion.div 
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="relative rounded-full p-[1px] bg-gradient-to-tr from-[var(--accent-coral)]/40 to-[var(--border-strong)] shadow-2xl"
        >
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] px-5 py-3 rounded-full flex items-center gap-2.5 transition-all font-heading text-sm font-semibold cursor-pointer border border-[var(--border-muted)]"
          >
            {/* Glowing Ring */}
            <span className="absolute inset-0 rounded-full border border-[var(--accent-coral)]/20 animate-ping opacity-60 pointer-events-none" />
            
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--accent-coral)]">
              <path d="M12 2v20M17 5v14M22 9v6M7 7v10M2 10v4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sophia
          </button>
        </motion.div>
      </div>

      {/* Floating Chat Drawer Widget */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-8 w-80 h-[420px] bg-[var(--bg-secondary)]/90 border border-[var(--border-strong)] shadow-2xl backdrop-blur-xl flex flex-col z-50 rounded-2xl overflow-hidden select-none"
          >
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-muted)] bg-[var(--bg-tertiary)]/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[10px] font-heading font-bold text-[var(--text-primary)] uppercase tracking-wider">Sophia</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-transparent border-none text-xs cursor-pointer outline-none transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Chat Messages */}
            <div 
              ref={scrollRef} 
              className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-none"
            >
              {messages.length === 0 ? (
                <div className="text-center mt-14 flex flex-col items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent-coral)]/10 border border-[var(--accent-coral)]/20 flex items-center justify-center text-[var(--accent-coral)]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 2v20M17 5v14M22 9v6M7 7v10M2 10v4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-primary)]">Sophia Operative</span>
                  <p className="text-[10px] text-[var(--text-tertiary)] max-w-[200px] leading-relaxed mx-auto">Ask me to list a property, reconcile bills, or audit invoices.</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                    <span className="text-[8px] font-mono font-bold uppercase text-[var(--text-tertiary)]">
                      {msg.role === 'user' ? 'You' : 'Sophia'}
                    </span>
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-[var(--accent-coral)] text-ink-950 font-semibold rounded-tr-none shadow-sm' 
                        : 'bg-[var(--bg-tertiary)] border border-[var(--border-muted)] text-[var(--text-primary)] rounded-tl-none'
                    }`}>
                      {msg.content && <p className="m-0 whitespace-pre-wrap">{msg.content}</p>}
                      {msg.blocks && msg.blocks.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1">
                          {msg.blocks.map((block, bi) => renderBlock(block, bi))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {loading && (
                <div className="flex items-center gap-1.5 pl-1 py-1 mr-auto">
                  <div className="flex gap-1 bg-[var(--bg-tertiary)] border border-[var(--border-muted)] rounded-full px-3 py-2 items-center">
                    <span className="w-1.5 h-1.5 bg-[var(--accent-coral)] rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-[var(--accent-coral)] rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-[var(--accent-coral)] rounded-full animate-bounce" />
                  </div>
                </div>
              )}
            </div>

            {/* Hidden upload */}
            <input 
              ref={fileInputRef} 
              type="file" 
              className="hidden" 
              onChange={handleFileUpload} 
            />

            {/* Input Bar */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend('chat'); }} 
              className="p-3 border-t border-[var(--border-muted)] bg-[var(--bg-primary)]/50 flex items-center gap-2"
            >
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-transparent border-none text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer outline-none transition-colors"
                title="Upload file"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={loading}
                placeholder="Ask Sophia..."
                className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-muted)] text-[11px] text-[var(--text-primary)] px-3.5 py-2 rounded-full outline-none hover:border-[var(--accent-coral)] focus:border-[var(--accent-coral)] transition-colors"
              />
              <button 
                type="submit" 
                disabled={loading || !input.trim()}
                className={`border-none w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                  input.trim() 
                    ? 'bg-[var(--accent-coral)] text-ink-950 hover:scale-105 active:scale-95 shadow-sm' 
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] opacity-50 cursor-not-allowed'
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="translate-x-[0.5px]">
                  <line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
