'use client';

import React, { useState, useEffect, useRef } from 'react';

// Define the interface for the simulated console log lines
interface LogLine {
  id: string;
  time: string;
  type: 'success' | 'info' | 'alert';
  badge: string;
  text: string;
}

export default function LandingPage() {
  const [autopilot, setAutopilot] = useState(true);
  const [activeShowcase, setActiveShowcase] = useState<'chat' | 'triage' | 'ledger'>('chat');
  const [logs, setLogs] = useState<LogLine[]>([
    { id: '1', time: '20:30:02', type: 'info', badge: 'INIT', text: 'Trenor Property Agent Console initialized.' },
    { id: '2', time: '20:30:05', type: 'success', badge: 'STANDBY', text: 'Listening for property tenant messages & events...' }
  ]);
  const [stats, setStats] = useState({
    hoursSaved: 42.5,
    resolvedRequests: 148,
    activeTickets: 1
  });

  // Manual override approval state
  const [pendingApproval, setPendingApproval] = useState<boolean>(false);
  const [hasApprovedManual, setHasApprovedManual] = useState<boolean>(false);

  // FAQ interactive state
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Chat message simulator states
  const [chatScenario, setChatScenario] = useState<'rent' | 'lease'>('rent');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'tenant' | 'agent'; text: string }>>([
    { sender: 'tenant', text: 'Hi, I received the invoice for next month. Is there any way I can pay via M-Pesa or split it?' },
    { sender: 'agent', text: 'Hi! Yes, you can pay rent directly using Stripe, card, or local mobile channels. In your tenant console, you can select "Pay Rent" and select your preferred payment mode. If you need a payment extension, I can request approval from Sarah (property manager).' }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Ref for auto scrolling the console body
  const consoleBodyRef = useRef<HTMLDivElement>(null);

  // Glow cursor tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty('--glow-x', `${x}px`);
    containerRef.current.style.setProperty('--glow-y', `${y}px`);
  };

  // Scroll console to bottom when logs update
  useEffect(() => {
    if (consoleBodyRef.current) {
      consoleBodyRef.current.scrollTop = consoleBodyRef.current.scrollHeight;
    }
  }, [logs]);

  // Slowly increment saved hours on autopilot to show activity
  useEffect(() => {
    if (!autopilot) return;
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        hoursSaved: parseFloat((prev.hoursSaved + 0.1).toFixed(1))
      }));
    }, 8000);
    return () => clearInterval(interval);
  }, [autopilot]);

  // Simulation Sequence Engine
  useEffect(() => {
    if (!autopilot) {
      // Trigger a manual intervention request immediately when autopilot is turned off
      const timer = setTimeout(() => {
        const now = new Date().toLocaleTimeString();
        setLogs(prev => [
          ...prev,
          { id: Math.random().toString(), time: now, type: 'alert', badge: 'OVERRIDE', text: '🚨 Alert: HVAC cooling failed in Unit 12. Estimated repair: KES 3,500.' },
          { id: Math.random().toString(), time: now, type: 'info', badge: 'PENDING', text: 'Budget exceeds KES 2,400 auto-limit. Awaiting Landlord override approval...' }
        ]);
        setPendingApproval(true);
        setHasApprovedManual(false);
      }, 1000);
      return () => clearTimeout(timer);
    }

    // If autopilot is turned back on, clear the manual flag and run automated script
    setPendingApproval(false);
    setHasApprovedManual(false);

    // Automated loop of messages
    const script = [
      { type: 'info' as const, badge: 'MESSAGE', text: '💬 Tenant message (Unit 4B): "Water dripping from kitchen cabinet. Might be faucet."' },
      { type: 'info' as const, badge: 'TRIAGE', text: '🔍 AI Diagnosis: Faucet leak detected. Triaged as minor plumbing repair.' },
      { type: 'info' as const, badge: 'DISPATCH', text: '🔧 Selecting Plumber: Match found "John Smith Plumbing" (Specialty: Plumbing & Heating).' },
      { type: 'success' as const, badge: 'APPROVED', text: '✅ Auto-Approved: Estimated KES 1,800 is below the KES 2,400 threshold.' },
      { type: 'success' as const, badge: 'RESOLVED', text: '📦 Contractor dispatched. Scheduled tenant site entry for 2:00 PM.' },
      { type: 'success' as const, badge: 'LEDGER', text: '💳 Rent tracking: Invoice INV-8812 paid via card (KES 2,400). Ledger synced.' }
    ];

    let step = 0;
    const runStep = () => {
      let currentStep = step;
      if (currentStep >= script.length) {
        currentStep = 0;
        step = 0;
      }
      const item = script[currentStep];
      if (!item) return;

      const now = new Date().toLocaleTimeString();
      setLogs(prev => [
        ...prev,
        { id: Math.random().toString(), time: now, type: item.type, badge: item.badge, text: item.text }
      ]);

      if (item.badge === 'RESOLVED') {
        setStats(prev => ({
          ...prev,
          resolvedRequests: prev.resolvedRequests + 1,
          activeTickets: Math.max(0, prev.activeTickets - 1)
        }));
      } else if (item.badge === 'MESSAGE') {
        setStats(prev => ({
          ...prev,
          activeTickets: prev.activeTickets + 1
        }));
      }

      step++;
    };

    const interval = setInterval(runStep, 5000);
    return () => clearInterval(interval);
  }, [autopilot]);

  // Handle manual approval click
  const handleManualApprove = () => {
    const now = new Date().toLocaleTimeString();
    setLogs(prev => [
      ...prev,
      { id: Math.random().toString(), time: now, type: 'success', badge: 'APPROVED', text: '✅ Budget KES 3,500 manual override granted by property manager.' },
      { id: Math.random().toString(), time: now, type: 'success', badge: 'RESOLVED', text: '📦 Plumber Robert Garcia dispatched to Unit 12. Repair scheduled.' }
    ]);
    setPendingApproval(false);
    setHasApprovedManual(true);
    setStats(prev => ({
      ...prev,
      resolvedRequests: prev.resolvedRequests + 1,
      activeTickets: Math.max(0, prev.activeTickets - 1)
    }));
  };

  // Chat сценарио switcher
  const handleChatScenarioChange = (scenario: 'rent' | 'lease') => {
    setChatScenario(scenario);
    setIsTyping(true);
    if (scenario === 'rent') {
      setChatMessages([
        { sender: 'tenant', text: 'Hi, I received the invoice for next month. Is there any way I can pay via M-Pesa or split it?' }
      ]);
      setTimeout(() => {
        setChatMessages(prev => [
          ...prev,
          { sender: 'agent', text: 'Hi! Yes, you can pay rent directly using Stripe, card, or local mobile channels. In your tenant console, you can select "Pay Rent" and select your preferred payment mode. If you need a payment extension, I can request approval from Sarah (property manager).' }
        ]);
        setIsTyping(false);
      }, 1500);
    } else {
      setChatMessages([
        { sender: 'tenant', text: 'Hi, my lease expires in 2 months. What are the terms for renewal? Are there any rent changes?' }
      ]);
      setTimeout(() => {
        setChatMessages(prev => [
          ...prev,
          { sender: 'agent', text: 'Let me look that up for you. For Unit 4B, your lease is eligible for a 12-month renewal at KES 2,400/month (no increase). I have generated the draft lease agreement in your console. Would you like me to send it to your email for e-signing?' }
        ]);
        setIsTyping(false);
      }, 1500);
    }
  };

  return (
    <div 
      ref={containerRef} 
      onMouseMove={handleMouseMove} 
      style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}
    >
      <div className="landing-grid"></div>
      <div className="landing-radial-glow"></div>
      <div className="hero-glow"></div>

      {/* HEADER NAVBAR */}
      <header className="nav-header">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <a href="#" className="nav-logo">
            <div className="logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', letterSpacing: '-0.3px', color: 'var(--color-warm-text)', lineHeight: '1.2' }}>Trenor</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-warm-text-quiet)', letterSpacing: '1.5px', marginTop: '1px' }}>PROPERTY AI</span>
            </div>
          </a>

          <nav className="nav-links">
            <a href="#features" className="nav-link-item">Features</a>
            <a href="#demo" className="nav-link-item">Console</a>
            <a href="#pricing" className="nav-link-item">Pricing</a>
            <a href="#faq" className="nav-link-item">FAQ</a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a 
              href="http://localhost:3001/login" 
              style={{
                fontSize: '13px',
                color: 'var(--color-warm-text-muted)',
                textDecoration: 'none',
                fontWeight: 500,
                padding: '6px 12px',
                transition: 'color var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-warm-text)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-warm-text-muted)'}
            >
              Sign In
            </a>
            <a 
              href="http://localhost:3001/signup" 
              className="button-primary"
              style={{ textDecoration: 'none', fontSize: '13px', padding: '6px 14px' }}
            >
              Start Free
            </a>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section style={{ paddingTop: '80px', paddingBottom: '60px', position: 'relative', zIndex: 10 }}>
        <div className="container">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {/* Top Micro-badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(255, 107, 107, 0.08)',
              border: '1px solid rgba(255, 107, 107, 0.15)',
              borderRadius: '20px',
              padding: '4px 12px',
              marginBottom: '24px'
            }}>
              <span className="pulse-circle"></span>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-coral)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Next-Gen Property Operations
              </span>
            </div>

            <h1 className="hero-title">
              Autonomous Property Management.<br /><span>Autopilot mode enabled.</span>
            </h1>

            <p className="hero-subtitle">
              Trenor resolves tenant requests, dispatches local vendors, handles rent collection, and reconciles ledgers automatically. Stay in control without taking the late-night calls.
            </p>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '64px' }}>
              <a 
                href="http://localhost:3001/signup" 
                className="button-primary"
                style={{ 
                  textDecoration: 'none', 
                  fontSize: '14.5px', 
                  padding: '10px 24px', 
                  boxShadow: '0 0 20px rgba(255, 107, 107, 0.2)' 
                }}
              >
                Sign Up Portfolio
              </a>
              <a 
                href="#demo" 
                className="button-secondary"
                style={{ textDecoration: 'none', fontSize: '14.5px', padding: '10px 24px' }}
              >
                Watch Simulator
              </a>
            </div>

            {/* INTERACTIVE SIMULATOR WIDGET */}
            <div id="demo" style={{ width: '100%', maxWidth: '850px', margin: '0 auto' }}>
              <div className="glass-panel">
                
                {/* Simulated Header */}
                <div className="console-header">
                  <div className="console-dots">
                    <span className="console-dot red"></span>
                    <span className="console-dot yellow"></span>
                    <span className="console-dot green"></span>
                  </div>
                  <div className="console-title">TRENOR AGENT CORE ENGINE v2.4</div>
                  
                  {/* Autopilot toggle */}
                  <div 
                    className="switch-container" 
                    onClick={() => setAutopilot(!autopilot)}
                  >
                    <span className="switch-label" style={{ color: autopilot ? 'var(--color-coral)' : 'var(--color-warm-text-quiet)' }}>
                      {autopilot ? 'Autopilot Active' : 'Autopilot Off'}
                    </span>
                    <div className={`switch-bg ${autopilot ? 'active' : ''}`}>
                      <span className="switch-knob"></span>
                    </div>
                  </div>
                </div>

                {/* Console Log Area */}
                <div className="console-body" ref={consoleBodyRef}>
                  {logs.map((log) => (
                    <div key={log.id} className="console-log-row">
                      <span className="log-time">[{log.time}]</span>
                      <span className={`log-badge ${log.type}`}>{log.badge}</span>
                      <span style={{ color: log.type === 'alert' ? 'var(--color-amber)' : 'inherit' }}>
                        {log.text}
                      </span>
                    </div>
                  ))}

                  {/* Manual Approval Trigger */}
                  {pendingApproval && !autopilot && (
                    <div style={{
                      marginTop: '16px',
                      padding: '12px',
                      backgroundColor: 'rgba(245, 158, 11, 0.05)',
                      border: '1px dashed rgba(245, 158, 11, 0.25)',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      animation: 'float-up 0.3s ease'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="pulse-circle" style={{ backgroundColor: 'var(--color-amber)' }}></span>
                        <span style={{ fontSize: '12px', color: 'var(--color-warm-text)' }}>
                          Approve budget limit KES 3,500 for Plumber dispatch?
                        </span>
                      </div>
                      <button 
                        onClick={handleManualApprove}
                        className="button-primary"
                        style={{
                          backgroundColor: 'var(--color-amber)',
                          color: '#05080b',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '4px 10px'
                        }}
                      >
                        Approve Budget
                      </button>
                    </div>
                  )}
                </div>

                {/* Live Stats Bar */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  borderTop: '1px solid var(--color-ink-border)',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)'
                }}>
                  <div style={{ padding: '16px', textAlign: 'center', borderRight: '1px solid var(--color-ink-border)' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-warm-text-quiet)', letterSpacing: '0.5px', marginBottom: '4px' }}>Hours Saved Today</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--color-coral)' }}>{stats.hoursSaved}h</div>
                  </div>
                  <div style={{ padding: '16px', textAlign: 'center', borderRight: '1px solid var(--color-ink-border)' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-warm-text-quiet)', letterSpacing: '0.5px', marginBottom: '4px' }}>Resolved Operations</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--color-warm-text)' }}>{stats.resolvedRequests}</div>
                  </div>
                  <div style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-warm-text-quiet)', letterSpacing: '0.5px', marginBottom: '4px' }}>Active Issues</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: stats.activeTickets > 0 ? 'var(--color-amber)' : 'var(--color-emerald)' }}>
                      {stats.activeTickets}
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CORE FEATURES SHOWCASE */}
      <section id="features" style={{ padding: '80px 0', borderTop: '1px solid var(--color-ink-border)' }}>
        <div className="container">
          
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', marginBottom: '12px' }}>
              How Trenor Operates
            </h2>
            <p style={{ color: 'var(--color-warm-text-muted)', maxWidth: '550px', margin: '0 auto', fontSize: '14.5px' }}>
              Click on each dashboard control feature below to view a real-time layout preview of the automated workflow.
            </p>
          </div>

          <div className="showcase-grid">
            
            {/* Control Sidebar Tabs */}
            <div className="showcase-menu">
              <button 
                className={`showcase-btn ${activeShowcase === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveShowcase('chat')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Tenant Communication</span>
                  <span style={{ fontSize: '10px', color: 'var(--color-warm-text-quiet)', marginTop: '2px' }}>AI answering questions politely</span>
                </div>
              </button>

              <button 
                className={`showcase-btn ${activeShowcase === 'triage' ? 'active' : ''}`}
                onClick={() => setActiveShowcase('triage')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Maintenance Dispatch</span>
                  <span style={{ fontSize: '10px', color: 'var(--color-warm-text-quiet)', marginTop: '2px' }}>Vendor matching & limit caps</span>
                </div>
              </button>

              <button 
                className={`showcase-btn ${activeShowcase === 'ledger' ? 'active' : ''}`}
                onClick={() => setActiveShowcase('ledger')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Rent & Ledgers</span>
                  <span style={{ fontSize: '10px', color: 'var(--color-warm-text-quiet)', marginTop: '2px' }}>Stripe payments & reconciliation</span>
                </div>
              </button>
            </div>

            {/* Interactive Preview Canvas */}
            <div className="glass-panel showcase-preview">
              
              {activeShowcase === 'chat' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-ink-border)', paddingBottom: '12px', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="pulse-circle"></span>
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-coral)' }}>LIVE CONVERSATION THREAD</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleChatScenarioChange('rent')}
                        className="button-secondary"
                        style={{ fontSize: '10px', padding: '3px 8px', borderColor: chatScenario === 'rent' ? 'var(--color-coral)' : 'inherit' }}
                      >
                        Rent Extensions
                      </button>
                      <button 
                        onClick={() => handleChatScenarioChange('lease')}
                        className="button-secondary"
                        style={{ fontSize: '10px', padding: '3px 8px', borderColor: chatScenario === 'lease' ? 'var(--color-coral)' : 'inherit' }}
                      >
                        Lease Renewals
                      </button>
                    </div>
                  </div>

                  <div className="chat-container" style={{ width: '100%', margin: '24px 0' }}>
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`chat-bubble ${msg.sender}`}>
                        <div style={{ fontSize: '9px', color: 'var(--color-warm-text-quiet)', marginBottom: '4px', textTransform: 'uppercase' }}>
                          {msg.sender === 'tenant' ? 'Alice Johnson (Tenant)' : 'Trenor AI Agent'}
                        </div>
                        <div>{msg.text}</div>
                      </div>
                    ))}
                    {isTyping && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-warm-text-quiet)', paddingLeft: '12px' }}>
                        Agent typing...
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--color-warm-text-quiet)', borderTop: '1px solid var(--color-ink-border)', paddingTop: '12px', width: '100%' }}>
                    🔒 Conversation is fully archived. Syncs automatically to your owner ledger logs.
                  </div>
                </>
              )}

              {activeShowcase === 'triage' && (
                <>
                  <div style={{ borderBottom: '1px solid var(--color-ink-border)', paddingBottom: '12px', width: '100%' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-coral)' }}>VENDOR MANAGEMENT PANEL</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px', width: '100%', margin: '20px 0' }}>
                    
                    {/* Triage Steps */}
                    <div className="triage-card" style={{ width: '100%' }}>
                      <div className="triage-step completed">
                        <span className="step-number">1</span>
                        <span>Triage Details Logged</span>
                      </div>
                      <div className="triage-step completed">
                        <span className="step-number">2</span>
                        <span>Plumbing specialty mapped</span>
                      </div>
                      <div className="triage-step active">
                        <span className="step-number">3</span>
                        <span>Selecting local contractor</span>
                      </div>
                      <div className="triage-step">
                        <span className="step-number">4</span>
                        <span>Contractor site dispatch</span>
                      </div>
                    </div>

                    {/* Contractor details mock */}
                    <div style={{
                      backgroundColor: 'var(--color-ink-panel)',
                      border: '1px solid var(--color-ink-border)',
                      borderRadius: '4px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-warm-text)' }}>John Smith Plumbing</span>
                        <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: 'rgba(16,185,129,0.12)', color: 'var(--color-emerald)', borderRadius: '2px' }}>Available</span>
                      </div>
                      
                      <div style={{ fontSize: '11px', color: 'var(--color-warm-text-muted)' }}>
                        "Expert residential plumbing, boiler service, and emergency drain repairs."
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-ink-border)', paddingTop: '10px', fontSize: '11px' }}>
                        <span>Hourly Rate: <strong>KES 1,800/hr</strong></span>
                        <span>Trust Score: <strong>98%</strong></span>
                      </div>
                    </div>

                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--color-warm-text-quiet)', borderTop: '1px solid var(--color-ink-border)', paddingTop: '12px', width: '100%' }}>
                    💡 Autopilot mode selects only licensed, top-rated contractors from your trusted local network.
                  </div>
                </>
              )}

              {activeShowcase === 'ledger' && (
                <>
                  <div style={{ borderBottom: '1px solid var(--color-ink-border)', paddingBottom: '12px', width: '100%' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-coral)' }}>LEDGER LOG RECONCILIATION</span>
                  </div>

                  <table className="ledger-table" style={{ width: '100%', margin: '20px 0' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Tenant</th>
                        <th>Unit</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Jun 18, 2026</td>
                        <td>Alice Johnson</td>
                        <td>Lumina 4B</td>
                        <td>KES 2,400</td>
                        <td><span className="ledger-status settled">Reconciled</span></td>
                      </tr>
                      <tr>
                        <td>Jun 15, 2026</td>
                        <td>Robert Carter</td>
                        <td>Lumina 1A</td>
                        <td>KES 1,950</td>
                        <td><span className="ledger-status settled">Reconciled</span></td>
                      </tr>
                      <tr>
                        <td>Jun 12, 2026</td>
                        <td>David Miller</td>
                        <td>Lumina 12C</td>
                        <td>KES 3,100</td>
                        <td><span className="ledger-status pending">Pending</span></td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ fontSize: '11px', color: 'var(--color-warm-text-quiet)', borderTop: '1px solid var(--color-ink-border)', paddingTop: '12px', width: '100%' }}>
                    ⚡ Payments clear directly to your bank account using safe Stripe integrations.
                  </div>
                </>
              )}

            </div>

          </div>

        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" style={{ padding: '80px 0', borderTop: '1px solid var(--color-ink-border)', backgroundColor: 'rgba(0,0,0,0.1)' }}>
        <div className="container">
          
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', marginBottom: '12px' }}>
              Transparent pricing, built to scale.
            </h2>
            <p style={{ color: 'var(--color-warm-text-muted)', maxWidth: '550px', margin: '0 auto', fontSize: '14.5px' }}>
              Choose a plan that fits your property portfolio size. Cancel or adjust anytime.
            </p>
          </div>

          <div className="pricing-grid">
            
            {/* Card 1 */}
            <div className="glass-panel pricing-card">
              <div className="pricing-title">Starter</div>
              <div className="pricing-price">Free</div>
              <p style={{ color: 'var(--color-warm-text-quiet)', fontSize: '13px', marginBottom: '24px' }}>
                For landlords managing a small portfolio.
              </p>
              <ul className="pricing-features">
                <li className="pricing-feature-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Up to 3 properties
                </li>
                <li className="pricing-feature-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Tenant message portal
                </li>
                <li className="pricing-feature-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Basic invoice generation
                </li>
              </ul>
              <a href="http://localhost:3001/signup" className="button-secondary" style={{ textDecoration: 'none', textAlign: 'center', fontSize: '13px' }}>
                Get Started
              </a>
            </div>

            {/* Card 2 */}
            <div className="glass-panel pricing-card featured">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div className="pricing-title" style={{ color: 'var(--color-coral)', fontWeight: 600 }}>Growth</div>
                <span style={{ fontSize: '9px', padding: '2px 8px', backgroundColor: 'var(--color-coral-glow)', color: 'var(--color-coral)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: '10px', textTransform: 'uppercase', fontWeight: 600 }}>Most Popular</span>
              </div>
              <div className="pricing-price">$49<span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-warm-text-quiet)' }}>/mo</span></div>
              <p style={{ color: 'var(--color-warm-text-quiet)', fontSize: '13px', marginBottom: '24px' }}>
                Enable Autopilot to completely manage operations.
              </p>
              <ul className="pricing-features">
                <li className="pricing-feature-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Up to 15 properties
                </li>
                <li className="pricing-feature-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Full AI Autopilot mode enabled
                </li>
                <li className="pricing-feature-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Stripe automated ledger sync
                </li>
                <li className="pricing-feature-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Emergency contractor network
                </li>
              </ul>
              <a href="http://localhost:3001/signup" className="button-primary" style={{ textDecoration: 'none', textAlign: 'center', fontSize: '13px' }}>
                Start 14-Day Trial
              </a>
            </div>

            {/* Card 3 */}
            <div className="glass-panel pricing-card">
              <div className="pricing-title">Portfolio</div>
              <div className="pricing-price">$149<span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-warm-text-quiet)' }}>/mo</span></div>
              <p style={{ color: 'var(--color-warm-text-quiet)', fontSize: '13px', marginBottom: '24px' }}>
                For professional managers with large real estate groups.
              </p>
              <ul className="pricing-features">
                <li className="pricing-feature-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Unlimited properties
                </li>
                <li className="pricing-feature-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Custom budget caps per property
                </li>
                <li className="pricing-feature-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Multi-user manager roles
                </li>
                <li className="pricing-feature-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Dedicated accounts manager
                </li>
              </ul>
              <a href="http://localhost:3001/signup" className="button-secondary" style={{ textDecoration: 'none', textAlign: 'center', fontSize: '13px' }}>
                Contact Portfolio Sales
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* FAQs SECTION */}
      <section id="faq" style={{ padding: '80px 0', borderTop: '1px solid var(--color-ink-border)' }}>
        <div className="container">
          
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', marginBottom: '12px' }}>
              Common Questions
            </h2>
            <p style={{ color: 'var(--color-warm-text-muted)', maxWidth: '500px', margin: '0 auto', fontSize: '14.5px' }}>
              Clear answers on how the agent processes requests and handles funds.
            </p>
          </div>

          <div className="faq-list">
            
            {/* FAQ Item 1 */}
            <div 
              className={`faq-item ${activeFaq === 0 ? 'active' : ''}`}
              onClick={() => setActiveFaq(activeFaq === 0 ? null : 0)}
            >
              <div className="faq-question">
                <span>How does Autopilot dispatch contractors?</span>
                <span className="faq-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transition: 'transform 0.2s' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </span>
              </div>
              <div className="faq-answer">
                When a tenant reports a maintenance issue, Trenor categorizes the severity and checks your local contact list first. If you haven't assigned a preferred contractor, the system queries nearby verified service professionals matching the trade. It secures an estimate and checks it against your auto-approval threshold.
              </div>
            </div>

            {/* FAQ Item 2 */}
            <div 
              className={`faq-item ${activeFaq === 1 ? 'active' : ''}`}
              onClick={() => setActiveFaq(activeFaq === 1 ? null : 1)}
            >
              <div className="faq-question">
                <span>What are budget caps and approval rules?</span>
                <span className="faq-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </span>
              </div>
              <div className="faq-answer">
                You control the maximum spending limit. Any quote below your cap (e.g. $200) is scheduled automatically. Any quote exceeding this cap is flagged, and the platform holds dispatch until you tap "Approve" in your management ledger or dashboard.
              </div>
            </div>

            {/* FAQ Item 3 */}
            <div 
              className={`faq-item ${activeFaq === 2 ? 'active' : ''}`}
              onClick={() => setActiveFaq(activeFaq === 2 ? null : 2)}
            >
              <div className="faq-question">
                <span>Where does the collected rent go?</span>
                <span className="faq-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </span>
              </div>
              <div className="faq-answer">
                All rent invoices are processed via secure payment integrations (Stripe). Tenant payments clear straight into your connected merchant bank account. Trenor logs the transaction, updates the tenant invoice state to "Reconciled", and updates your dashboard statistics in real time.
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid var(--color-ink-border)',
        padding: '40px 0',
        backgroundColor: 'var(--color-ink-bg)',
        fontSize: '13px',
        color: 'var(--color-warm-text-quiet)'
      }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="nav-logo">
                <div className="logo-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: 'var(--color-warm-text)' }}>Trenor</span>
              </div>
              <p style={{ maxWidth: '280px', lineHeight: '1.5' }}>
                Autonomous property operations console. Built for modern portfolios.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '64px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ color: 'var(--color-warm-text)', fontWeight: 600 }}>Products</span>
                <a href="#demo" style={{ color: 'inherit', textDecoration: 'none' }}>Live Simulator</a>
                <a href="#features" style={{ color: 'inherit', textDecoration: 'none' }}>Autopilot Mode</a>
                <a href="http://localhost:3001/login" style={{ color: 'inherit', textDecoration: 'none' }}>Owner Console</a>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ color: 'var(--color-warm-text)', fontWeight: 600 }}>Support</span>
                <a href="#faq" style={{ color: 'inherit', textDecoration: 'none' }}>System FAQ</a>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span className="pulse-circle" style={{ backgroundColor: 'var(--color-emerald)' }}></span>
                  All Systems Operational
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-ink-border)', paddingTop: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <span>© 2026 Trenor. All rights reserved.</span>
            <div style={{ display: 'flex', gap: '16px' }}>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</a>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</a>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
