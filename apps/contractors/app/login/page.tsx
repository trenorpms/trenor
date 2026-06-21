'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  // Active form state: 'login' | 'signup' | 'select-role'
  const [activeForm, setActiveForm] = useState<'login' | 'signup' | 'select-role'>('login');

  // Input States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  // Role & Invite Selection
  const [selectedRole, setSelectedRole] = useState<'manager' | 'contractor'>('manager');
  const [inviteToken, setInviteToken] = useState('');

  // States for UX
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Invite Modal States
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resolvedLandlord, setResolvedLandlord] = useState<{ name: string; id: string; email: string } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Password visibility
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [showSignupPwd, setShowSignupPwd] = useState(false);

  // User session state
  const [user, setUser] = useState<any>(null);

  // Ambient mouse track position
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (glowRef.current) {
        glowRef.current.style.left = e.clientX + 'px';
        glowRef.current.style.top = e.clientY + 'px';
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Check if they are already logged in on mount
  useEffect(() => {
    let session = localStorage.getItem('user');
    if (!session || session === 'null') {
      const match = document.cookie.match(/(^|;)\s*user\s*=\s*([^;]+)/);
      if (match && match[2]) {
        session = decodeURIComponent(match[2]);
        localStorage.setItem('user', session);
      }
    }

    if (session) {
      try {
        const parsed = JSON.parse(session);
        setUser(parsed);
        if (parsed.role && parsed.role !== 'user') {
          router.replace('/onboarding');
        } else {
          setActiveForm('select-role');
        }
      } catch (e) {
        localStorage.removeItem('user');
      }
    }

    const savedTheme = localStorage.getItem('data-theme') || 'dark';
    setTheme(savedTheme);
  }, [router]);

  // Handle Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      if (email.toLowerCase() === 'landlord@trenor.com' && password === 'password123') {
        const demoUser = { id: 'demo-landlord-id', email: 'landlord@trenor.com', name: 'Sarah Jenkins', role: 'landlord' };
        saveSession(demoUser);
        router.replace('/onboarding');
        return;
      }

      const response = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Incorrect email or password.');

      saveSession(data);
      if (data.role && data.role !== 'user') {
        router.replace('/onboarding');
      } else {
        setActiveForm('select-role');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Signup Form submission
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !firstName || !lastName) return;
    setLoading(true);
    setErrorMsg(null);

    const name = `${firstName} ${lastName}`;

    try {
      // Validate token first if Property Manager is selected
      if (selectedRole === 'manager') {
        const cleanToken = inviteToken.trim().toUpperCase();
        if (cleanToken.length !== 8) {
          throw new Error('Please enter a valid 8-digit invitation token.');
        }

        const checkRes = await fetch('http://localhost:4000/api/auth/validate-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: cleanToken }),
        });

        if (!checkRes.ok) {
          const checkErr = await checkRes.json();
          throw new Error(checkErr.message || 'Invitation token validation failed.');
        }
      }

      // Register new user account
      const response = await fetch('http://localhost:4000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          role: selectedRole === 'contractor' ? 'contractor' : 'user',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create account.');

      // Complete property manager workspace mapping if token is supplied
      if (selectedRole === 'manager') {
        const acceptResponse = await fetch('http://localhost:4000/api/auth/accept-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: inviteToken.toUpperCase(),
            name,
            password,
          }),
        });

        if (!acceptResponse.ok) {
          const acceptErr = await acceptResponse.json();
          throw new Error(acceptErr.message || 'Failed to link property manager workspace.');
        }

        const managerUser = await acceptResponse.json();
        saveSession(managerUser);
      } else {
        saveSession(data);
      }
      
      router.replace('/onboarding');
    } catch (err: any) {
      setErrorMsg(err.message || 'Signup registration error.');
    } finally {
      setLoading(false);
    }
  };

  // Verify Invite Code step in Select Role
  const verifyInviteCode = async () => {
    const cleanToken = inviteToken.trim().toUpperCase();
    if (cleanToken.length !== 8) {
      setInviteError('Please enter a valid 8-digit invite code.');
      return;
    }

    setVerifyingCode(true);
    setInviteError(null);
    setResolvedLandlord(null);

    try {
      const response = await fetch('http://localhost:4000/api/auth/validate-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: cleanToken }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'This invitation code is invalid or has expired.');
      }

      setResolvedLandlord({
        name: data.landlordName,
        id: data.landlordId,
        email: data.email,
      });
    } catch (err: any) {
      setInviteError(err.message || 'Failed to verify invitation.');
    } finally {
      setVerifyingCode(false);
    }
  };

  // Confirm invite accept and assign role
  const confirmManagerRole = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);
    setIsInviteModalOpen(false);

    try {
      const cleanToken = inviteToken.trim().toUpperCase();
      const response = await fetch('http://localhost:4000/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: cleanToken,
          name: user.name,
          password: 'password123',
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to activate property manager role.');
      }

      const updatedUser = await response.json();
      saveSession(updatedUser);
      router.replace('/onboarding');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to map manager profile context.');
    } finally {
      setLoading(false);
    }
  };

  // Direct upgrade to contractor role
  const handleContractorRoleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('http://localhost:4000/api/auth/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role: 'contractor' }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to activate contractor role.');
      }

      const updatedUser = { ...user, role: 'contractor' };
      saveSession(updatedUser);
      router.replace('/onboarding');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to activate contractor role context.');
    } finally {
      setLoading(false);
    }
  };

  const saveSession = (userData: any) => {
    localStorage.setItem('user', JSON.stringify(userData));
    document.cookie = `user=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=86400`;
    setUser(userData);
  };

  const setTheme = (pref: string) => {
    const html = document.documentElement;
    html.classList.remove('light-theme', 'dark');
    
    const btns = ['light', 'dark', 'system'];
    btns.forEach(b => {
      const el = document.getElementById(`btn-theme-${b}`);
      if (el) {
        el.classList.remove('bg-coral-500/20', 'text-coral-500');
        el.classList.add('text-ink-500');
      }
    });

    const activeBtn = document.getElementById(`btn-theme-${pref}`);
    if (activeBtn) {
      activeBtn.classList.remove('text-ink-500');
      activeBtn.classList.add('bg-coral-500/20', 'text-coral-500');
    }

    if (pref === 'light') {
      html.classList.add('light-theme');
      html.setAttribute('data-theme', 'light');
      localStorage.setItem('data-theme', 'light');
    } else if (pref === 'dark') {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
      localStorage.setItem('data-theme', 'dark');
    } else {
      localStorage.setItem('data-theme', 'system');
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        html.classList.add('light-theme');
        html.setAttribute('data-theme', 'light');
      } else {
        html.classList.add('dark');
        html.setAttribute('data-theme', 'dark');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    document.cookie = 'user=; path=/; max-age=0';
    setUser(null);
    setActiveForm('login');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[var(--bg-primary)] transition-colors duration-200">
      <div ref={glowRef} id="interactive-glow" className="hidden md:block"></div>
      <div className="absolute inset-0 bg-grid pointer-events-none z-0"></div>

      <div className="w-full max-w-5xl h-full md:h-[85vh] md:max-h-[700px] bg-[var(--bg-secondary)] md:border md:border-[var(--border-muted)] shadow-2xl relative z-10 flex flex-col md:flex-row overflow-hidden md:rounded-sm">
        
        {/* THEME CONTROLLER & TOGGLE (TOP RIGHT) */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-1 bg-[var(--bg-tertiary)] p-1 border border-[var(--border-muted)] rounded shadow-sm">
          <button id="btn-theme-light" onClick={() => setTheme('light')} title="Light Mode" className="p-1.5 rounded transition-all cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          </button>
          <button id="btn-theme-dark" onClick={() => setTheme('dark')} title="Dark Mode" className="p-1.5 rounded transition-all cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          </button>
          <button id="btn-theme-system" onClick={() => setTheme('system')} title="System Mode" className="p-1.5 rounded transition-all cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
          </button>
        </div>

        {/* VALUE PROPOSITION PANEL (LEFT SIDE) */}
        <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-[var(--border-muted)] flex flex-col relative overflow-hidden hidden md:flex shrink-0">
          <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80" alt="Modern Architecture" className="absolute inset-0 w-full h-full object-cover z-0" />
          <div className="absolute inset-0 bg-[#05080b]/50 mix-blend-multiply z-0"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#05080b] via-[#05080b]/80 to-transparent z-0"></div>

          <div className="p-8 lg:p-10 flex flex-col h-full justify-between relative z-10">
            <div className="flex items-center gap-2.5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[var(--accent-coral)]">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              <span className="font-heading font-bold text-lg tracking-tight text-[var(--text-primary)] leading-none">Nexis</span>
            </div>

            <div className="mt-auto">
              <span className="inline-block px-2 py-0.5 bg-[var(--accent-coral-muted)] text-[var(--accent-coral)] border border-[var(--accent-coral)]/30 text-[9px] font-bold uppercase tracking-wider rounded-sm mb-4 backdrop-blur-md">
                Coordinated Operations
              </span>
              <h1 className="font-heading text-xl lg:text-2xl font-semibold text-[var(--text-primary)] tracking-tight mb-4 leading-snug">
                Connect managers and operators in one workflow.
              </h1>
              <ul className="flex flex-col gap-3 text-xs text-[var(--text-secondary)]">
                <li className="flex items-start gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--accent-coral)] mt-0.5 shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  <span><strong className="text-[var(--text-primary)]">Synced Portfolios.</strong> List apartments, register leases, and oversee ledgers instantly.</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--accent-coral)] mt-0.5 shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  <span><strong className="text-[var(--text-primary)]">Maintenance Dispatch.</strong> Claim work orders, coordinate field repair engineers, and verify job logs.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* FORM PANEL (RIGHT SIDE) */}
        <div className="w-full md:w-7/12 flex flex-col justify-center p-6 md:p-8 lg:p-14 relative overflow-y-auto bg-[var(--bg-secondary)]">
          <div className="md:hidden flex items-center gap-2 mb-8">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[var(--accent-coral)]">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span className="font-heading font-bold text-lg tracking-tight text-[var(--text-primary)] leading-none">Nexis</span>
          </div>

          <div className="relative w-full overflow-hidden max-w-sm mx-auto md:mx-0 md:max-w-md">
            {errorMsg && (
              <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-mono rounded">
                {errorMsg}
              </div>
            )}

            {/* 1. LOGIN STATE */}
            {activeForm === 'login' && (
              <div className="w-full">
                <div className="mb-6">
                  <h2 className="font-heading text-2xl lg:text-3xl font-semibold text-[var(--text-primary)] tracking-tight">Welcome back</h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-2">Sign in to check on your properties and review AI actions.</p>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="auth-label">Email Address</label>
                    <div className="auth-input-wrapper">
                      <div className="auth-input-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                      </div>
                      <input 
                        type="email" 
                        required 
                        placeholder="you@example.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="auth-input-field"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="auth-label">Password</label>
                    <div className="auth-input-wrapper">
                      <div className="auth-input-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      </div>
                      <input 
                        type={showLoginPwd ? 'text' : 'password'} 
                        required 
                        placeholder="••••••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="auth-input-field"
                        style={{ paddingRight: '40px' }}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowLoginPwd(!showLoginPwd)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        style={{ background: 'none', border: 'none', zIndex: 20 }}
                      >
                        {showLoginPwd ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="auth-button-submit mt-2"
                  >
                    {loading ? 'Authenticating...' : 'Sign In'}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-[var(--border-muted)] text-center">
                  <span className="text-xs text-[var(--text-secondary)]">Don't have an account?</span>
                  <button onClick={() => setActiveForm('signup')} className="text-xs text-[var(--accent-coral)] hover:underline font-semibold ml-1 cursor-pointer">Sign up for free</button>
                </div>
              </div>
            )}

            {/* 2. SIGNUP STATE */}
            {activeForm === 'signup' && (
              <div className="w-full">
                <div className="mb-6">
                  <h2 className="font-heading text-2xl lg:text-3xl font-semibold text-[var(--text-primary)] tracking-tight">Create account</h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-2">Activate your workspace in less than 2 minutes.</p>
                </div>

                <form onSubmit={handleSignup} className="flex flex-col gap-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="auth-label">First Name</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Jane" 
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="auth-input-field"
                        style={{ paddingLeft: '14px' }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="auth-label">Last Name</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Doe" 
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="auth-input-field"
                        style={{ paddingLeft: '14px' }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="auth-label">Email Address</label>
                    <input 
                      type="email" 
                      required 
                      placeholder="operator@trenor.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="auth-input-field"
                      style={{ paddingLeft: '14px' }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="auth-label">Password</label>
                    <div className="auth-input-wrapper">
                      <input 
                        type={showSignupPwd ? 'text' : 'password'} 
                        required 
                        placeholder="Minimum 8 characters" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="auth-input-field"
                        style={{ paddingLeft: '14px', paddingRight: '40px' }}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowSignupPwd(!showSignupPwd)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        style={{ background: 'none', border: 'none', zIndex: 20 }}
                      >
                        {showSignupPwd ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  {/* ROLE CHOOSER */}
                  <div className="flex flex-col gap-2 border-t border-[var(--border-muted)] pt-3">
                    <label className="auth-label">Choose Workspace Context</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedRole('manager')}
                        className={`py-2 border text-xs font-semibold rounded-sm transition-all cursor-pointer ${selectedRole === 'manager' ? 'border-[var(--accent-coral)] bg-[var(--accent-coral-muted)] text-[var(--accent-coral)]' : 'border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-secondary)]'}`}
                      >
                        Property Manager
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedRole('contractor')}
                        className={`py-2 border text-xs font-semibold rounded-sm transition-all cursor-pointer ${selectedRole === 'contractor' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-secondary)]'}`}
                      >
                        Field Contractor
                      </button>
                    </div>
                  </div>

                  {/* DYNAMIC TOKEN INPUT (if manager) */}
                  {selectedRole === 'manager' && (
                    <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2">
                      <label className="auth-label text-center">8-Digit Invitation Code</label>
                      <input 
                        type="text" 
                        required 
                        maxLength={8}
                        placeholder="TR38A9B1" 
                        value={inviteToken}
                        onChange={(e) => setInviteToken(e.target.value)}
                        className="auth-input-field text-center font-mono uppercase tracking-widest"
                        style={{ paddingLeft: '14px' }}
                      />
                      <span className="text-[10px] text-[var(--text-tertiary)] font-mono text-center">Found in your dispatch authorization email.</span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="auth-button-submit mt-2"
                  >
                    {loading ? 'Creating workspace...' : 'Register Account'}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-[var(--border-muted)] text-center">
                  <span className="text-xs text-[var(--text-secondary)]">Already have an account?</span>
                  <button onClick={() => setActiveForm('login')} className="text-xs text-[var(--accent-coral)] hover:underline font-semibold ml-1 cursor-pointer">Sign in here</button>
                </div>
              </div>
            )}

            {/* 3. SELECT ROLE STATE (SLEEK AND HUMAN-CENTRIC) */}
            {activeForm === 'select-role' && (
              <div className="w-full">
                <div className="mb-6">
                  <h2 className="font-heading text-xl lg:text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Configure Workspace</h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-2">
                    Logged in as <strong className="text-[var(--text-primary)]">{user?.name || 'Operator'}</strong> ({user?.email})
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Property Manager Card */}
                  <div 
                    onClick={() => {
                      setSelectedRole('manager');
                      setIsInviteModalOpen(true);
                      setInviteError(null);
                      setResolvedLandlord(null);
                      setInviteToken('');
                    }}
                    className="auth-role-card group"
                  >
                    <div className="p-2 border border-[var(--border-strong)] rounded bg-[var(--bg-secondary)] text-[var(--accent-coral)] group-hover:bg-[var(--accent-coral-muted)] transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-heading text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-coral-hover)] transition-colors">Property Manager</h4>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-normal">
                        Verify an invite code to coordinate real estate portfolios, list properties, and dispatches.
                      </p>
                    </div>
                  </div>

                  {/* Contractor Card */}
                  <div 
                    onClick={() => {
                      setSelectedRole('contractor');
                      handleContractorRoleSubmit();
                    }}
                    className="auth-role-card group"
                  >
                    <div className="p-2 border border-[var(--border-strong)] rounded bg-[var(--bg-secondary)] text-emerald-500 group-hover:bg-emerald-500/10 transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-heading text-sm font-semibold text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors">Field Contractor</h4>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-normal">
                        Directly activate your profile to resolve active property maintenance tickets and work dispatches.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[var(--border-muted)] flex justify-between items-center text-xs">
                  <button onClick={handleLogout} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:underline cursor-pointer">
                    Sign Out
                  </button>
                  <span className="text-[var(--text-tertiary)] font-mono text-[10px]">OPERATIONS ROUTER</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SLEEK MODAL FOR PROPERTY MANAGER INVITATION VERIFICATION */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded-sm shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-[var(--border-muted)] flex justify-between items-center bg-[var(--bg-primary)]">
              <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)]">Verify Workspace Association</h3>
              <button 
                onClick={() => setIsInviteModalOpen(false)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-4">
              
              {inviteError && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-mono rounded">
                  {inviteError}
                </div>
              )}

              {!resolvedLandlord ? (
                <div className="flex flex-col gap-3.5">
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Property manager accounts require invitation from a property portfolio owner. Please enter your 8-digit verification code.
                  </p>
                  
                  <div className="flex flex-col gap-1">
                    <label className="auth-label font-mono uppercase tracking-wider">Invitation Code</label>
                    <input 
                      type="text" 
                      maxLength={8}
                      placeholder="TR38A9B1" 
                      value={inviteToken}
                      onChange={(e) => {
                        setInviteToken(e.target.value);
                        if (e.target.value.length === 8) {
                          setInviteError(null);
                        }
                      }}
                      className="auth-input-field text-center font-mono uppercase tracking-widest"
                      style={{ paddingLeft: '14px' }}
                    />
                  </div>

                  <button
                    onClick={verifyInviteCode}
                    disabled={verifyingCode || inviteToken.length !== 8}
                    className="auth-button-submit text-xs"
                    style={{ padding: '8px 16px' }}
                  >
                    {verifyingCode ? 'Validating...' : 'Verify Invitation'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                  <div className="p-4 bg-[var(--bg-primary)] border border-emerald-500/20 rounded flex items-start gap-3">
                    <div className="p-1 bg-emerald-500/10 text-emerald-500 rounded-full mt-0.5">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-[var(--text-primary)]">Verified Invitation</h4>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                        Invite code authorized to join portfolio managed by <strong className="text-[var(--text-primary)]">{resolvedLandlord.name}</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-[var(--text-secondary)] leading-relaxed space-y-2 border-t border-[var(--border-muted)] pt-3.5">
                    <p>
                      <strong>As a coordinator for {resolvedLandlord.name}, you will be permitted to:</strong>
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[11px]">
                      <li>Deploy and view rental listings in their cluster.</li>
                      <li>Review the centralized financial ledger & tenants roster.</li>
                      <li>Coordinate and assign field contractors to work order dispatches.</li>
                      </ul>
                  </div>

                  <div className="flex gap-2.5 mt-2 border-t border-[var(--border-muted)] pt-3.5">
                    <button
                      onClick={() => setResolvedLandlord(null)}
                      className="flex-1 bg-transparent hover:bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-strong)] text-xs py-2 rounded-sm cursor-pointer transition-colors"
                    >
                      Change Code
                    </button>
                    <button
                      onClick={confirmManagerRole}
                      className="auth-button-submit flex-1 text-xs"
                      style={{ padding: '8px 16px' }}
                    >
                      Accept & Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
