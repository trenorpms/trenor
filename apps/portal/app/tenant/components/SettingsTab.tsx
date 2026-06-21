'use client';

import React from 'react';

interface SettingsTabProps {
  settingsName: string;
  setSettingsName: (val: string) => void;
  settingsEmail: string;
  setSettingsEmail: (val: string) => void;
  settingsPhone: string;
  setSettingsPhone: (val: string) => void;
  isSavingSettings: boolean;
  handleSaveSettings: (e: React.FormEvent) => void;
}

export default function SettingsTab({
  settingsName,
  setSettingsName,
  settingsEmail,
  setSettingsEmail,
  settingsPhone,
  setSettingsPhone,
  isSavingSettings,
  handleSaveSettings,
}: SettingsTabProps) {
  return (
    <div className="flex flex-col p-4 md:p-6 lg:p-8 relative z-10 min-h-full max-w-2xl mx-auto w-full">
      <div className="mb-6 border-b border-ink-800 pb-5">
        <h1 className="font-heading text-2xl font-semibold text-warm-50 tracking-tight">
          Profile Settings
        </h1>
        <p className="text-xs font-mono text-ink-400 mt-1.5">
          Update contact information, emergency phone, and notification limits.
        </p>
      </div>

      <form
        onSubmit={handleSaveSettings}
        className="ops-card bg-ink-900 border border-ink-800 rounded-[2px] p-6 flex flex-col gap-5"
      >
        <div>
          <label className="text-[10px] font-mono text-ink-400 uppercase tracking-widest block mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={settingsName}
            onChange={(e) => setSettingsName(e.target.value)}
            className="cyber-input rounded-[2px] px-3 py-2.5 text-sm w-full"
            required
          />
        </div>

        <div>
          <label className="text-[10px] font-mono text-ink-400 uppercase tracking-widest block mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={settingsEmail}
            onChange={(e) => setSettingsEmail(e.target.value)}
            className="cyber-input rounded-[2px] px-3 py-2.5 text-sm w-full"
            required
          />
        </div>

        <div>
          <label className="text-[10px] font-mono text-ink-400 uppercase tracking-widest block mb-2">
            Contact Phone
          </label>
          <input
            type="text"
            value={settingsPhone}
            onChange={(e) => setSettingsPhone(e.target.value)}
            className="cyber-input rounded-[2px] px-3 py-2.5 text-sm w-full"
          />
        </div>

        <div className="border-t border-ink-800 pt-4 mt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSavingSettings}
            className="bg-coral-500 hover:bg-coral-600 text-ink-950 font-mono font-bold text-xs px-6 py-2.5 rounded-[2px] transition-colors uppercase tracking-widest"
          >
            {isSavingSettings ? 'SAVING...' : 'SAVE SETTINGS'}
          </button>
        </div>
      </form>
    </div>
  );
}
