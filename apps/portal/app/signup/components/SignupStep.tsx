import React, { useState } from 'react';
import { AuthView } from '../hooks/useAuthFlow';

interface SignupStepProps {
  onSwitchView: (target: AuthView) => void;
  onSubmit: (e: React.FormEvent) => void;
  firstName: string;
  setFirstName: (val: string) => void;
  lastName: string;
  setLastName: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  isLoading: boolean;
}

export default function SignupStep({
  onSwitchView,
  onSubmit,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  isLoading,
}: SignupStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <>
      <div className="mb-6">
        <h2 className="font-heading text-2xl lg:text-3xl font-semibold text-warm-50 tracking-tight">Create your account</h2>
        <p className="text-sm text-warm-300 mt-2">Enter your details to get started.</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-warm-200">First Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First"
                style={{ paddingLeft: '38px' }}
                className="w-full bg-ink-950 border border-ink-700 rounded pr-3 py-2.5 text-sm text-warm-100 placeholder-ink-600 focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500/30 transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-warm-200">Last Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last"
                style={{ paddingLeft: '38px' }}
                className="w-full bg-ink-950 border border-ink-700 rounded pr-3 py-2.5 text-sm text-warm-100 placeholder-ink-600 focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500/30 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-warm-200">Email Address</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ paddingLeft: '40px' }}
              className="w-full bg-ink-950 border border-ink-700 rounded pr-3 py-2.5 text-sm text-warm-100 placeholder-ink-600 focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500/30 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-warm-200">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                style={{ paddingLeft: '40px', paddingRight: '40px' }}
                className="w-full bg-ink-950 border border-ink-700 rounded py-2.5 text-sm text-warm-100 placeholder-ink-600 focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-500 hover:text-warm-100 transition-colors"
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-warm-200">Confirm Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                style={{ paddingLeft: '40px', paddingRight: '40px' }}
                className="w-full bg-ink-950 border border-ink-700 rounded py-2.5 text-sm text-warm-100 placeholder-ink-600 focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-500 hover:text-warm-100 transition-colors"
              >
                {showConfirmPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className={`w-full bg-coral-500 hover:bg-coral-600 text-ink-950 font-semibold text-sm py-3 rounded transition-all active:scale-[0.99] shadow-glow hover:shadow-glow-strong flex items-center justify-center gap-2 mt-4 ${
            isLoading ? 'loading-sweep opacity-80 cursor-wait' : ''
          }`}
        >
          <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
          {!isLoading && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-ink-800/80 text-center">
        <span className="text-sm text-warm-300">Already have an account?</span>
        <button onClick={() => onSwitchView('login')} className="text-sm text-coral-500 hover:underline font-semibold ml-1">
          Sign in here
        </button>
      </div>
    </>
  );
}
