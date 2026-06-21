'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// Shared Components
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
import CommandPalette from '../../../components/CommandPalette';
import LoadingOverlay from '../../../components/LoadingOverlay';

// Tab Panels
import OverviewPanel from '../../../components/panels/OverviewPanel';
import PropertiesPanel from '../../../components/panels/PropertiesPanel';
import TenantsPanel from '../../../components/panels/TenantsPanel';
import LedgerPanel from '../../../components/panels/LedgerPanel';
import ContractorsPanel from '../../../components/panels/ContractorsPanel';
import AuditLogsPanel from '../../../components/panels/AuditLogsPanel';
import MaintenancePanel from '../../../components/panels/MaintenancePanel';
import EmptyPanel from '../../../components/panels/EmptyPanel';
import ConnectionsPanel from '../../../components/panels/ConnectionsPanel';
import AgentWorkspacePanel from '../../../components/panels/AgentWorkspacePanel';
import SettingsPanel from '../../../components/panels/SettingsPanel';
import SophiaFloatingWidget from '../../../components/SophiaFloatingWidget';

export default function ManagerDashboard() {
  const router = useRouter();
  const params = useParams();
  const tabname = (params?.tabname as string) || 'overview';

  const [cmdOpen, setCmdOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // Global shortcut Ctrl+K / Cmd+K to trigger command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Dynamic Title Controller
  useEffect(() => {
    if (tabname) {
      const tabTitles: Record<string, string> = {
        overview: 'Overview',
        agent: 'Sophia Agent Workspace',
        properties: 'Properties',
        tenants: 'Tenants',
        maintenance: 'Maintenance Jobs',
        ledger: 'Financial Ledger',
        invoices: 'Invoices',
        reconciliation: 'Ledger Reconciliation',
        audit: 'Audit Log',
        contractors: 'Contractors List',
        connections: 'Connected Services',
        settings: 'System Configuration',
      };
      const cleanTitle = tabTitles[tabname.toLowerCase()] || (tabname.charAt(0).toUpperCase() + tabname.slice(1));
      document.title = `Trenor | ${cleanTitle}`;
    }
  }, [tabname]);

  // Authenticate user & sync theme on load
  useEffect(() => {
    const session = localStorage.getItem('user');
    if (!session) {
      router.push('/login');
      return;
    }

    try {
      const parsed = JSON.parse(session);
      if (parsed.role !== 'manager' && parsed.role !== 'landlord') {
        router.push('/login');
        return;
      }
    } catch (e) {
      router.push('/login');
      return;
    }

    // Load theme
    const theme = localStorage.getItem('theme') || localStorage.getItem('data-theme') || 'dark';
    const root = document.documentElement;
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }

    setAuthChecking(false);
  }, [router]);

  if (authChecking) {
    return <LoadingOverlay active={true} message="Verifying credentials..." />;
  }

  // Determine active panel content
  const renderPanel = () => {
    switch (tabname) {
      case 'overview':
        return <OverviewPanel />;
      case 'agent':
        return <AgentWorkspacePanel />;
      case 'properties':
        return <PropertiesPanel />;
      case 'tenants':
        return <TenantsPanel />;
      case 'maintenance':
        return <MaintenancePanel />;
      case 'ledger':
      case 'invoices':
      case 'reconciliation':
      case 'audit':
        return <LedgerPanel />;
      case 'contractors':
        return <ContractorsPanel />;
      case 'connections':
        return <ConnectionsPanel />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <EmptyPanel tabname={tabname} />;
    }
  };

  return (
    <div className="h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-body flex relative overflow-hidden">
      
      {/* Collapsible Navigation Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)] relative">
        
        {/* Top Header Navigation Bar */}
        <Topbar onToggleCommandPalette={() => setCmdOpen(true)} />

        {/* Scrollable Tab Panel Body */}
        <main className="flex-1 overflow-y-auto relative w-full smooth-scroll">
          
          {/* Subtle Ambient Background Grid glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[var(--accent-coral)]/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

          {/* Render Active Tab Content with Framer Motion Page Transition */}
          <AnimatePresence mode="wait">
            <motion.div 
              key={tabname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="relative z-10 w-full h-full"
            >
              {renderPanel()}
            </motion.div>
          </AnimatePresence>

        </main>
      </div>

      {/* Floating Sophia AI Assistant widget */}
      <SophiaFloatingWidget />

      {/* Command Palette search modal */}
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />

    </div>
  );
}
