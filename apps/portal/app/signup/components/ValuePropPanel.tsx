import React from 'react';

export default function ValuePropPanel() {
  return (
    <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-ink-800 flex flex-col relative overflow-hidden hidden md:flex">
      {/* Background Image */}
      <img
        src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80"
        alt="Modern Home"
        className="absolute inset-0 w-full h-full object-cover z-0 grayscale-[30%] opacity-40"
      />
      
      {/* Overlays */}
      <div className="absolute inset-0 bg-ink-950/80 z-0"></div>
      
      {/* Content */}
      <div className="p-8 lg:p-10 flex flex-col h-full justify-between relative z-10">
        
        {/* Branding */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-coral-500 rounded flex items-center justify-center text-ink-950 shadow-glow">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-heading font-bold text-xl tracking-tight text-white leading-none">Landlord</span>
        </div>

        {/* Value Proposition */}
        <div className="mt-auto">
          <h1 className="font-heading text-2xl lg:text-3xl font-semibold text-white tracking-tight mb-4 leading-snug">
            Smart property management.
          </h1>
          
          <ul className="flex flex-col gap-4 text-sm text-warm-200">
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-ink-800/80 border border-ink-700 flex items-center justify-center text-coral-500 shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
              <span>Pay rent and track payments easily.</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-ink-800/80 border border-ink-700 flex items-center justify-center text-coral-500 shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 9.36l-7.1 7.1a1 1 0 0 1-1.41 0l-1.41-1.41a1 1 0 0 1 0-1.41l7.1-7.1a6 6 0 0 1 9.36-7.94l-3.77 3.77z"></path></svg>
              </div>
              <span>Submit maintenance requests in seconds.</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-ink-800/80 border border-ink-700 flex items-center justify-center text-coral-500 shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <span>Secure, private, and always available.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
