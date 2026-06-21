'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootRedirect() {
  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem('user');
    if (!session || session === 'null') {
      router.replace('/login');
    } else {
      router.replace('/onboarding');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center">
      <div className="font-mono text-xs text-warm-300 animate-pulse">
        Loading...
      </div>
    </div>
  );
}
