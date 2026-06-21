'use client';

import { useEffect } from 'react';

export default function FetchInterceptor() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch;
      window.fetch = function (input, init) {
        if (typeof input === 'string' && input.includes('localhost:4000')) {
          const apiBase = process.env.NEXT_PUBLIC_API_URL;
          if (apiBase && !apiBase.includes('localhost:4000')) {
            let targetUrl = input;
            const normalizedApiBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
            
            if (input.startsWith('http://localhost:4000/api')) {
              targetUrl = input.replace('http://localhost:4000/api', normalizedApiBase);
            } else if (input.startsWith('http://localhost:4000')) {
              const apiOrigin = normalizedApiBase.endsWith('/api') ? normalizedApiBase.slice(0, -4) : normalizedApiBase;
              targetUrl = input.replace('http://localhost:4000', apiOrigin);
            }
            console.log(`[FetchInterceptor] Redirecting ${input} -> ${targetUrl}`);
            return originalFetch(targetUrl, init);
          }
        }
        return originalFetch(input, init);
      };
    }
  }, []);

  return null;
}
