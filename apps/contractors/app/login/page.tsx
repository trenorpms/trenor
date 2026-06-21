'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import ValuePropPanel from './components/ValuePropPanel';
import LoginStep from './components/LoginStep';
import SignupStep from './components/SignupStep';
import RoleStep from './components/RoleStep';
import ManagerCodeStep from './components/ManagerCodeStep';

export default function LoginPage() {
  const router = useRouter();

  // Active form state: 'login' | 'signup' | 'select-role' | 'manager-code'
  const [activeForm, setActiveForm] = useState<'login' | 'signup' | 'select-role' | 'manager-code'>('login');

  // Input States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [inviteToken, setInviteToken] = useState('');

  // States for UX
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // User session state
  const [user, setUser] = useState<any>(null);
  const [currentTheme, setCurrentTheme] = useState('system');

  // Ambient mouse track position
  const glowRef = useRef<HTMLDivElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

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

  // Check session state on mount
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

    const savedTheme = localStorage.getItem('data-theme') || 'system';
    applyTheme(savedTheme);
  }, [router]);

  // Apply Theme Helper
  const applyTheme = (themeName: string) => {
    setCurrentTheme(themeName);
    if (typeof window === 'undefined') return;
    const html = document.documentElement;
    html.classList.remove('light-theme', 'dark');

    if (themeName === 'light') {
      html.classList.add('light-theme');
      html.setAttribute('data-theme', 'light');
      localStorage.setItem('data-theme', 'light');
    } else if (themeName === 'dark') {
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

      const response = await fetch(`${API_URL}/auth/login`, {
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
    if (!email || !password || !firstName || !lastName || !confirmPassword) return;
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    const name = `${firstName} ${lastName}`;

    try {
      // Register new user account with initial temporary 'user' role
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          role: 'user',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create account.');

      saveSession(data);
      setActiveForm('select-role');
    } catch (err: any) {
      setErrorMsg(err.message || 'Signup registration error.');
    } finally {
      setLoading(false);
    }
  };

  // direct upgrade to contractor role (No invite code requested)
  const handleContractorRoleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`${API_URL}/auth/update-role`, {
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

  // Verify and activate Property Manager invite code
  const confirmManagerRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const cleanToken = inviteToken.trim().toUpperCase();
    if (!cleanToken) {
      handleManagerSkip();
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Validate the invite token
      const checkRes = await fetch(`${API_URL}/auth/validate-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: cleanToken }),
      });

      if (!checkRes.ok) {
        const checkErr = await checkRes.json();
        throw new Error(checkErr.message || 'This invitation code is invalid or has expired.');
      }

      // 2. Accept and link property manager to the team workspace
      const response = await fetch(`${API_URL}/auth/accept-invite`, {
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
        throw new Error(errData.message || 'Failed to link property manager workspace.');
      }

      const managerUser = await response.json();
      saveSession(managerUser);
      router.replace('/onboarding');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to activate property manager role.');
    } finally {
      setLoading(false);
    }
  };

  // Skip Invite Code for Property Manager (Optional Path)
  const handleManagerSkip = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`${API_URL}/auth/update-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role: 'manager' }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to activate manager role.');
      }

      const updatedUser = { ...user, role: 'manager' };
      saveSession(updatedUser);
      router.replace('/onboarding');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to activate property manager role context.');
    } finally {
      setLoading(false);
    }
  };

  const saveSession = (userData: any) => {
    localStorage.setItem('user', JSON.stringify(userData));
    document.cookie = `user=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=86400`;
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    document.cookie = 'user=; path=/; max-age=0';
    setUser(null);
    setActiveForm('login');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-ink-950 transition-colors duration-300">
      <div ref={glowRef} id="interactive-glow" className="hidden md:block"></div>
      <div className="absolute inset-0 bg-grid pointer-events-none z-0"></div>

      {/* MAIN COMPACT WRAPPER */}
      <div className="w-full max-w-5xl h-full md:h-[85vh] md:max-h-[700px] bg-ink-900 md:border md:border-ink-700/80 shadow-2xl relative z-10 flex flex-col md:flex-row overflow-hidden md:rounded">
        
        {/* THEME CONTROLLER & TOGGLE (TOP RIGHT) */}
        <div className="absolute top-4 right-4 z-50 flex items-center bg-ink-800 p-1 border border-ink-700 rounded shadow-sm">
          <button 
            onClick={() => applyTheme('light')} 
            title="Light Mode" 
            className={`p-1.5 rounded transition-all cursor-pointer ${currentTheme === 'light' ? 'bg-ink-700 text-warm-100' : 'text-ink-500 hover:text-coral-500'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          </button>
          <button 
            onClick={() => applyTheme('dark')} 
            title="Dark Mode" 
            className={`p-1.5 rounded transition-all cursor-pointer ${currentTheme === 'dark' ? 'bg-ink-700 text-warm-100' : 'text-ink-500 hover:text-coral-500'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          </button>
          <button 
            onClick={() => applyTheme('system')} 
            title="System Mode" 
            className={`p-1.5 rounded transition-all cursor-pointer ${currentTheme === 'system' ? 'bg-ink-700 text-warm-100' : 'text-ink-500 hover:text-coral-500'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
          </button>
        </div>

        {/* VALUE PROPOSITION PANEL (LEFT SIDE) */}
        <ValuePropPanel />

        {/* FORM PANEL (RIGHT SIDE) */}
        <div className="auth-right-panel flex flex-col justify-center p-6 sm:p-10 lg:p-14 relative overflow-y-auto shrink-0 w-full md:w-7/12">
          {/* Logo only shown on mobile */}
          <div className="md:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-coral-500 rounded flex items-center justify-center text-ink-950 animate-glow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-heading font-bold text-xl tracking-tight text-warm-50 leading-none">Nexis</span>
          </div>

          <div className="relative w-full max-w-sm mx-auto md:mx-0 md:max-w-md min-h-[440px] flex flex-col justify-center">
            {errorMsg && (
              <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-mono rounded">
                {errorMsg}
              </div>
            )}

            {/* 1. LOGIN STATE */}
            {activeForm === 'login' && (
              <LoginStep
                onSwitchView={setActiveForm}
                onSubmit={handleLogin}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                isLoading={loading}
              />
            )}

            {/* 2. SIGNUP STATE */}
            {activeForm === 'signup' && (
              <SignupStep
                onSwitchView={setActiveForm}
                onSubmit={handleSignup}
                firstName={firstName}
                setFirstName={setFirstName}
                lastName={lastName}
                setLastName={setLastName}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                isLoading={loading}
              />
            )}

            {/* 3. ROLE SELECTION STATE */}
            {activeForm === 'select-role' && (
              <RoleStep
                onSelectRole={(role) => {
                  if (role === 'contractor') {
                    handleContractorRoleSubmit();
                  } else {
                    setActiveForm('manager-code');
                  }
                }}
                userName={user?.name || ''}
                userEmail={user?.email || ''}
                onLogout={handleLogout}
                isLoading={loading}
              />
            )}

            {/* 4. MANAGER CODE STATE (OPTIONAL) */}
            {activeForm === 'manager-code' && (
              <ManagerCodeStep
                onSubmitCode={confirmManagerRole}
                onSkipCode={handleManagerSkip}
                onBack={() => setActiveForm('select-role')}
                inviteToken={inviteToken}
                setInviteToken={setInviteToken}
                isLoading={loading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
