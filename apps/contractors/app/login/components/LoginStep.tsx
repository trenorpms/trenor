import React, { useState } from 'react';

interface LoginStepProps {
  onSwitchView: (target: 'login' | 'signup' | 'select-role' | 'manager-code') => void;
  onSubmit: (e: React.FormEvent) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  isLoading: boolean;
}

export default function LoginStep({
  onSwitchView,
  onSubmit,
  email,
  setEmail,
  password,
  setPassword,
  isLoading,
}: LoginStepProps) {
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  return (
    <div className="w-full animate-in fade-in duration-200">
      <div className="mb-8">
        <h2 className="font-heading text-2xl lg:text-3xl font-semibold text-warm-50 tracking-tight">Welcome back</h2>
        <p className="text-sm text-warm-300 mt-2">Sign in to check on your properties and review operations.</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-warm-200">Email Address</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </div>
            <input 
              type="email" 
              required 
              placeholder="you@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-ink-950 border border-ink-700 rounded pl-10 pr-3 py-2.5 text-sm text-warm-100 placeholder-ink-600 focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500/30 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-warm-200">Password</label>
            <a href="#" className="text-xs text-coral-500 hover:text-coral-400 hover:underline">Forgot password?</a>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <input 
              type={showLoginPwd ? 'text' : 'password'} 
              required 
              placeholder="••••••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-ink-950 border border-ink-700 rounded pl-10 pr-10 py-2.5 text-sm text-warm-100 placeholder-ink-600 focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500/30 transition-all"
            />
            <button 
              type="button" 
              onClick={() => setShowLoginPwd(!showLoginPwd)} 
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-500 hover:text-warm-100 transition-colors cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {showLoginPwd ? (
                  <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </>
                ) : (
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-coral-500 hover:bg-coral-600 text-ink-950 font-semibold text-sm py-3 rounded transition-all active:scale-[0.99] shadow-glow hover:shadow-glow-strong flex items-center justify-center gap-2 mt-4 cursor-pointer"
        >
          <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
          {!isLoading && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-ink-800/80 text-center">
        <span className="text-sm text-warm-300">Don't have an account?</span>
        <button 
          onClick={() => onSwitchView('signup')} 
          className="text-sm text-coral-500 hover:underline font-semibold ml-1 cursor-pointer"
        >
          Sign up
        </button>
      </div>
    </div>
  );
}
