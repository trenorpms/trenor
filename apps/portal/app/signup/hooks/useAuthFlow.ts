'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type AuthView = 'login' | 'signup' | 'role' | 'tenant-code' | 'manager-code';

export function useAuthFlow() {
  const router = useRouter();
  
  const [view, setView] = useState<AuthView>('signup');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);

  // Form inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [role, setRole] = useState<'landlord' | 'tenant'>('tenant');
  
  const [inviteCode, setInviteCode] = useState('');
  const [user, setUser] = useState<any>(null);

  // Loading flags
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

  // Track Mouse movement for glow effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Theme support
  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme-pref') || localStorage.getItem('data-theme') || 'system') as 'light' | 'dark' | 'system';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (targetTheme: 'light' | 'dark' | 'system') => {
    const html = document.documentElement;
    html.classList.remove('light-theme', 'dark');
    
    let resolvedTheme: 'light' | 'dark' = 'dark';
    if (targetTheme === 'system') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } else {
      resolvedTheme = targetTheme;
    }

    if (resolvedTheme === 'light') {
      html.classList.add('light-theme');
      html.setAttribute('data-theme', 'light');
    } else {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
    }
  };

  const handleSetTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('theme-pref', newTheme);
    localStorage.setItem('data-theme', newTheme);
    applyTheme(newTheme);
  };

  // Actions
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoggingIn(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('user', JSON.stringify(data));
      document.cookie = `user=${encodeURIComponent(JSON.stringify(data))}; path=/; max-age=86400`;

      if (data.role === 'landlord') {
        router.push('/landlord');
      } else {
        router.push('/tenant');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong during sign in');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 1. Initial Step: validates inputs and slides to role selection
  const handleSignupStepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (signupPassword !== signupConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (signupPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    // Slide to selection
    setView('role');
  };

  // 2. Second Step: Actually registers user on backend with the selected role
  const handleRoleSelectAndRegister = async (selectedRole: 'landlord' | 'tenant') => {
    setError(null);
    setIsSigningUp(true);
    setRole(selectedRole);

    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${firstName} ${lastName}`,
          email: signupEmail,
          password: signupPassword,
          role: selectedRole,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      localStorage.setItem('user', JSON.stringify(data));
      document.cookie = `user=${encodeURIComponent(JSON.stringify(data))}; path=/; max-age=86400`;
      setUser(data);

      // Successfully registered. Go to invite/connection code
      setView(selectedRole === 'tenant' ? 'tenant-code' : 'manager-code');
    } catch (err: any) {
      setError(err.message || 'Something went wrong during registration');
      // Go back to signup step so user can review details/email
      setView('signup');
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || inviteCode.length < 6) return;
    setError(null);
    setIsSubmittingCode(true);

    const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');

    try {
      const response = await fetch(`${API_URL}/auth/invite/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode, userId: currentUser.id }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to claim connection code');
      }

      if (currentUser.role === 'landlord') {
        router.push('/landlord');
      } else {
        router.push('/tenant');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong claiming connection code');
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const handleSkip = () => {
    const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');
    if (currentUser.role === 'tenant') {
      setError('Connection code is mandatory for tenants');
      return;
    }
    router.push('/landlord');
  };

  return {
    view,
    setView,
    theme,
    handleSetTheme,
    mousePos,
    error,
    setError,
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
    role,
    setRole,
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
  };
}
