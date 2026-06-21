'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [bootingRole, setBootingRole] = useState<string | null>(null);
  const [bootLogs, setBootLogs] = useState<string[]>([]);
  const [bootFinished, setBootFinished] = useState(false);

  useEffect(() => {
    // 1. Verify user is logged in
    const session = localStorage.getItem('user');
    if (!session || session === 'null') {
      router.replace('/login');
      return;
    }

    try {
      const parsed = JSON.parse(session);
      const role = parsed.role;

      if (!role || role === 'user') {
        // Logged in but context not configured yet, redirect back to login select-role
        router.replace('/login');
        return;
      }

      // Start boot loader based on role
      const actualRole = (role === 'manager' || role === 'landlord') ? 'manager' : 'contractor';
      setBootingRole(actualRole);

      const logSteps = actualRole === 'manager'
        ? [
            'Connecting...',
            'Verified.',
            'Loading dashboard...',
            'Ready.',
          ]
        : [
            'Connecting...',
            'Profile loaded.',
            'Setting up payments...',
            'Ready.',
          ];

      let stepIdx = 0;
      const interval = setInterval(() => {
        if (stepIdx < logSteps.length) {
          const nextLog = logSteps[stepIdx];
          if (nextLog) {
            setBootLogs((prev) => [...prev, nextLog]);
          }
          stepIdx++;
        } else {
          clearInterval(interval);
          setBootFinished(true);
        }
      }, 600);

    } catch (e) {
      localStorage.removeItem('user');
      router.replace('/login');
    }
  }, [router]);

  const completeBoot = () => {
    if (bootingRole === 'manager') {
      router.push('/manager/overview');
    } else {
      router.push('/contractor');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950 p-6 relative">
      <div className="absolute inset-0 bg-grid pointer-events-none z-0"></div>
      
      <div className="max-w-xl w-full bg-ink-900 border border-ink-700/80 rounded overflow-hidden shadow-2xl z-10">
        <div className="h-10 border-b border-ink-700/80 flex items-center px-4 justify-between bg-ink-950">
          <span className="font-mono text-[10px] text-coral-500 font-bold uppercase tracking-wider">Setting Up Your Session</span>
          <span className="font-mono text-[10px] text-warm-300">Trenor</span>
        </div>
        <div className="p-5 font-mono text-xs text-warm-100 min-h-[180px] space-y-2 leading-relaxed">
          {bootLogs.map((log, idx) => (
            <div key={idx} className={(log === 'Ready.' || log === 'Verified.' || log === 'Profile loaded.') ? 'text-emerald-400' : 'text-warm-100'}>
              &gt; {log}
            </div>
          ))}
          {!bootFinished && <div className="text-coral-500 animate-pulse">_ loading...</div>}
        </div>
        {bootFinished && (
          <div className="p-4 border-t border-ink-700/80 flex justify-end bg-ink-900">
            <button 
              onClick={completeBoot} 
              className="bg-coral-500 hover:bg-coral-600 text-ink-950 font-bold px-4 py-2 rounded text-xs cursor-pointer transition-colors shadow-glow"
            >
              Open Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
