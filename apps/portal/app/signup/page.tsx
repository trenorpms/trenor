'use client';

import React, { useEffect, useRef } from 'react';
import ValuePropPanel from './components/ValuePropPanel';
import LoginStep from './components/LoginStep';
import SignupStep from './components/SignupStep';
import RoleStep from './components/RoleStep';
import TenantCodeStep from './components/TenantCodeStep';
import ManagerCodeStep from './components/ManagerCodeStep';
import { useAuthFlow, AuthView } from './hooks/useAuthFlow';

export default function SignupPage() {
  const {
    view,
    setView,
    theme,
    handleSetTheme,
    mousePos,
    error,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    signupEmail,
    setSignupEmail,
    signupPassword,
    setSignupPassword,
    signupConfirmPassword,
    setSignupConfirmPassword,
    inviteCode,
    setInviteCode,
    isLoggingIn,
    isSigningUp,
    isSubmittingCode,
    handleLoginSubmit,
    handleSignupStepSubmit,
    handleRoleSelectAndRegister,
    handleCodeSubmit,
    handleSkip,
  } = useAuthFlow();

  const tenantInputRef = useRef<HTMLInputElement | null>(null);
  const managerInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus connections codes upon sliding into view
  useEffect(() => {
    if (view === 'tenant-code') {
      setTimeout(() => tenantInputRef.current?.focus(), 300);
    } else if (view === 'manager-code') {
      setTimeout(() => managerInputRef.current?.focus(), 300);
    }
  }, [view]);

  const glowStyle: React.CSSProperties = {
    position: 'fixed',
    left: mousePos.x,
    top: mousePos.y,
    width: '600px',
    height: '600px',
    background: 'radial-gradient(circle, rgba(255, 107, 107, var(--glow-opacity, 0.04)) 0%, transparent 70%)',
    pointerEvents: 'none',
    transform: 'translate(-50%, -50%)',
    transition: 'width 0.3s, height 0.3s',
    zIndex: 1,
  };

  const getStateClass = (stateName: AuthView) => {
    const base = 'absolute inset-0 w-full flex flex-col justify-center transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]';
    
    if (stateName === view) {
      return `${base} opacity-100 translate-x-0 z-10`;
    }
    
    let translateX = 'translate-x-12';
    
    if (view === 'login') {
      translateX = 'translate-x-12';
    } else if (view === 'signup') {
      if (stateName === 'login') {
        translateX = '-translate-x-6';
      } else {
        translateX = 'translate-x-12';
      }
    } else if (view === 'role') {
      if (stateName === 'login' || stateName === 'signup') {
        translateX = '-translate-x-6';
      } else {
        translateX = 'translate-x-12';
      }
    } else if (view === 'tenant-code' || view === 'manager-code') {
      if (stateName === 'role' || stateName === 'signup' || stateName === 'login') {
        translateX = '-translate-x-6';
      } else {
        translateX = 'translate-x-12';
      }
    }

    return `${base} opacity-0 pointer-events-none ${translateX} z-0`;
  };

  return (
    <div className="font-body text-warm-100 bg-ink-950 transition-colors duration-300 h-full min-h-screen overflow-hidden flex items-center justify-center relative w-full select-none">
      <div style={glowStyle} className="hidden md:block" />
      <div className="absolute inset-0 bg-grid pointer-events-none z-0" />

      {/* Main compact wrapper card */}
      <div className="w-full max-w-5xl h-full md:h-[85vh] md:max-h-[700px] bg-ink-900 md:border md:border-ink-700/80 shadow-2xl relative z-10 flex flex-col md:flex-row overflow-hidden md:rounded">
        
        {/* Theme Controller (Top Right) */}
        <div className="absolute top-4 right-4 z-50 flex items-center bg-ink-800 p-1 border border-ink-700 rounded shadow-sm">
          <button
            onClick={() => handleSetTheme('light')}
            title="Light Mode"
            className={`p-1.5 rounded transition-all hover:text-coral-500 ${
              theme === 'light' ? 'bg-ink-700 text-warm-100' : 'text-ink-500'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          </button>
          <button
            onClick={() => handleSetTheme('dark')}
            title="Dark Mode"
            className={`p-1.5 rounded transition-all hover:text-coral-500 ${
              theme === 'dark' ? 'bg-ink-700 text-warm-100' : 'text-ink-500'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
          <button
            onClick={() => handleSetTheme('system')}
            title="System Mode"
            className={`p-1.5 rounded transition-all hover:text-coral-500 ${
              theme === 'system' ? 'bg-ink-700 text-warm-100' : 'text-ink-500'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </button>
        </div>

        {/* Value Proposition Panel (Left Side) */}
        <ValuePropPanel />

        {/* Form Panel (Right Side) */}
        <div className="w-full md:w-7/12 flex flex-col justify-center p-6 sm:p-10 lg:p-14 relative overflow-y-auto custom-scrollbar">
          {/* Logo visible on Mobile only */}
          <div className="md:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-coral-500 rounded flex items-center justify-center text-ink-950">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-heading font-bold text-xl tracking-tight text-warm-50 leading-none">Landlord</span>
          </div>

          {/* Dynamic State Container */}
          <div className="relative w-full max-w-sm mx-auto md:mx-0 md:max-w-md min-h-[480px]">
            {/* Common Error Display */}
            {error && (
              <div className="absolute top-0 left-0 right-0 p-3 border border-coral-500/30 bg-coral-500/5 text-coral-400 text-xs font-mono rounded-[2px] text-center z-50">
                {error}
              </div>
            )}

            {/* 1. Login State */}
            <div className={getStateClass('login')}>
              <LoginStep
                onSwitchView={setView}
                onSubmit={handleLoginSubmit}
                email={loginEmail}
                setEmail={setLoginEmail}
                password={loginPassword}
                setPassword={setLoginPassword}
                isLoading={isLoggingIn}
              />
            </div>

            {/* 2. Signup State */}
            <div className={getStateClass('signup')}>
              <SignupStep
                onSwitchView={setView}
                onSubmit={handleSignupStepSubmit}
                firstName={firstName}
                setFirstName={setFirstName}
                lastName={lastName}
                setLastName={setLastName}
                email={signupEmail}
                setEmail={setSignupEmail}
                password={signupPassword}
                setPassword={setSignupPassword}
                confirmPassword={signupConfirmPassword}
                setConfirmPassword={setSignupConfirmPassword}
                isLoading={isSigningUp}
              />
            </div>

            {/* 3. Role Selection State */}
            <div className={getStateClass('role')}>
              <RoleStep
                onSwitchView={setView}
                onSelectRole={handleRoleSelectAndRegister}
              />
            </div>

            {/* 4A. Tenant Connection Stage */}
            <div className={getStateClass('tenant-code')}>
              <TenantCodeStep
                onSwitchView={setView}
                onSubmit={handleCodeSubmit}
                inviteCode={inviteCode}
                setInviteCode={setInviteCode}
                isLoading={isSubmittingCode}
                inputRef={tenantInputRef}
              />
            </div>

            {/* 4B. Manager Connection Stage */}
            <div className={getStateClass('manager-code')}>
              <ManagerCodeStep
                onSwitchView={setView}
                onSubmit={handleCodeSubmit}
                inviteCode={inviteCode}
                setInviteCode={setInviteCode}
                onSkip={handleSkip}
                isLoading={isSubmittingCode}
                inputRef={managerInputRef}
              />
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
