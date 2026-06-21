'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../hooks/useToast';

export interface TenantTicket {
  id: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  status: string;
  createdAt: string;
  contractorId?: number;
  amount?: number;
  contractorAccepted?: boolean;
  photoUrl?: string;
  locationName?: string;
  rating?: number;
  ratingComment?: string;
}

export interface TenantProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  unit: string;
  propertyName: string;
  rent: string;
  arrears: number;
  status: string;
}

export interface Invoice {
  invoiceId: string;
  tenantEmail?: string;
  tenantName?: string;
  unitNumber: string;
  amountDue: number;
  propertyName: string;
  status: string;
  description?: string;
}

export interface Contractor {
  id: number;
  name: string;
  email: string;
  specialty: string;
  phone?: string;
}

export function useTenantDashboard() {
  const router = useRouter();
  const { toasts, addToast, removeToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // DB States
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tickets, setTickets] = useState<TenantTicket[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);

  // Sub-tabs
  const [maintenanceSubTab, setMaintenanceSubTab] = useState<'active' | 'history'>('active');
  const [paymentsSubTab, setPaymentsSubTab] = useState<'outstanding' | 'methods' | 'history'>('outstanding');

  // Modals
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Forms
  const [claimCode, setClaimCode] = useState('');
  const [isClaimingCode, setIsClaimingCode] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [ticketDescription, setTicketDescription] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('low');
  const [category, setCategory] = useState('general');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // Ratings
  const [ratingOpenTicketId, setRatingOpenTicketId] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [ratingCommentText, setRatingCommentText] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Auto-Pay & Settings
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [settingsEmail, setSettingsEmail] = useState('');
  const [settingsPhone, setSettingsPhone] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Theme Sync on Mount
  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme-pref') || localStorage.getItem('data-theme') || 'system') as 'light' | 'dark' | 'system';
    
    let resolvedTheme: 'light' | 'dark' = 'dark';
    if (savedTheme === 'system') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } else {
      resolvedTheme = savedTheme;
    }
    
    setTheme(resolvedTheme);
    const html = document.documentElement;
    html.classList.remove('light-theme', 'dark');
    if (resolvedTheme === 'light') {
      html.classList.add('light-theme');
      html.setAttribute('data-theme', 'light');
    } else {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
    }
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme-pref', nextTheme);
    localStorage.setItem('data-theme', nextTheme);
    const html = document.documentElement;
    html.classList.remove('light-theme', 'dark');
    if (nextTheme === 'light') {
      html.classList.add('light-theme');
      html.setAttribute('data-theme', 'light');
    } else {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
    }
  };

  // Auth and Data Fetching
  useEffect(() => {
    try {
      const session = localStorage.getItem('user');
      if (!session) {
        window.location.href = '/login';
        return;
      }

      const parsedUser = JSON.parse(session);
      setUser(parsedUser);

      fetch('http://localhost:4000/api/auth/validate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: parsedUser.email, id: parsedUser.id }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('Session invalid');
          const text = await res.text();
          return text ? JSON.parse(text) : null;
        })
        .then(async (data) => {
          if (!data) throw new Error('Session invalid');
          localStorage.setItem('user', JSON.stringify(data));

          if (data.role?.toLowerCase() !== 'tenant') {
            window.location.href = data.role?.toLowerCase() === 'landlord' ? '/landlord' : '/';
            return;
          }

          // Check Stripe Session Redirection Success
          const urlParams = new URLSearchParams(window.location.search);
          const stripeSessionId = urlParams.get('session_id');
          if (stripeSessionId) {
            try {
              const verifyRes = await fetch(
                'http://localhost:4000/api/properties/tenant/verify-invoice-payment',
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ session_id: stripeSessionId }),
                }
              );
              if (verifyRes.ok) {
                const txt = await verifyRes.text();
                const verifyData = txt ? JSON.parse(txt) : null;
                if (verifyData && verifyData.success) {
                  addToast('Payment successfully processed! Ledger updated.', 'success');
                } else {
                  addToast('Verification incomplete: ' + ((verifyData && verifyData.reason) || 'unverified'), 'error');
                }
              }
            } catch (e) {
              console.error('Error verifying payment:', e);
            }
            window.history.replaceState({}, document.title, window.location.pathname);
          }

          const headers = { Authorization: `Bearer ${data.id}` };
          const safeJson = async (r: Response, fallback: any) => {
            if (!r.ok) return fallback;
            const txt = await r.text();
            return txt ? JSON.parse(txt) : fallback;
          };

          const [profileData, invoicesData, ticketsData, contractorsData] = await Promise.all([
            fetch('http://localhost:4000/api/properties/tenant/profile', { headers }).then((r) => safeJson(r, null)),
            fetch('http://localhost:4000/api/properties/tenant/invoices', { headers }).then((r) => safeJson(r, [])),
            fetch('http://localhost:4000/api/tickets/tenant', { headers }).then((r) => safeJson(r, [])),
            fetch('http://localhost:4000/api/tickets/contractors').then((r) => safeJson(r, [])),
          ]);

          if (profileData) {
            setProfile(profileData);
            setSettingsName(profileData.name || '');
            setSettingsEmail(profileData.email || '');
            setSettingsPhone(profileData.phone || '');
          } else {
            setProfile(null);
          }

          setInvoices(invoicesData || []);
          setTickets(ticketsData || []);
          setContractors(contractorsData || []);
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('user');
          window.location.href = '/login';
        });
    } catch (e) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  }, []);

  // Invite Code Preview Effect
  useEffect(() => {
    if (claimCode.length === 6) {
      setPreviewLoading(true);
      setPreviewError(null);
      fetch('http://localhost:4000/api/auth/invite/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: claimCode }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || 'Invalid connection code');
          }
          return res.json();
        })
        .then((data) => {
          setPreviewData(data);
        })
        .catch((err) => {
          setPreviewError(err.message);
          setPreviewData(null);
        })
        .finally(() => {
          setPreviewLoading(false);
        });
    } else {
      setPreviewData(null);
      setPreviewError(null);
    }
  }, [claimCode]);

  const handlePayInvoice = async (invoiceId: string) => {
    setIsProcessingPayment(true);
    try {
      const response = await fetch('http://localhost:4000/api/properties/tenant/pay-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          successUrl: window.location.origin + `/tenant/billing?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: window.location.href,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate checkout link');
      const { checkoutUrl } = await response.json();
      if (checkoutUrl) window.location.href = checkoutUrl;
    } catch (err: any) {
      addToast(err.message || 'Error processing Stripe redirect', 'error');
    } finally {
      setIsProcessingPayment(false);
      setIsPaymentModalOpen(false);
      setSelectedInvoice(null);
    }
  };

  const handleClaimTenantCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimCode.trim() || !user) return;
    setIsClaimingCode(true);

    try {
      const response = await fetch('http://localhost:4000/api/auth/invite/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: claimCode, userId: user.id }),
      });

      const data = await response.json();
      if (response.ok) {
        addToast('Successfully connected to property unit!', 'success');
        setClaimCode('');
        const headers = { Authorization: `Bearer ${user.id}` };
        const safeJson = async (r: Response, fallback: any) => {
          if (!r.ok) return fallback;
          const txt = await r.text();
          return txt ? JSON.parse(txt) : fallback;
        };

        const [profileData, invoicesData, ticketsData] = await Promise.all([
          fetch('http://localhost:4000/api/properties/tenant/profile', { headers }).then((r) => safeJson(r, null)),
          fetch('http://localhost:4000/api/properties/tenant/invoices', { headers }).then((r) => safeJson(r, [])),
          fetch('http://localhost:4000/api/tickets/tenant', { headers }).then((r) => safeJson(r, [])),
        ]);

        if (profileData) {
          setProfile(profileData);
          setSettingsName(profileData.name || '');
          setSettingsEmail(profileData.email || '');
          setSettingsPhone(profileData.phone || '');
        }
        setInvoices(invoicesData || []);
        setTickets(ticketsData || []);
      } else {
        addToast(data.message || 'Failed to claim connection code', 'error');
      }
    } catch (err: any) {
      addToast(err.message || 'Network error', 'error');
    } finally {
      setIsClaimingCode(false);
    }
  };

  const handleLogTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketDescription.trim()) return;
    setIsSubmittingTicket(true);

    const descriptionWithCategory = category !== 'general' ? `[${category.toUpperCase()}] ${ticketDescription}` : ticketDescription;

    try {
      const response = await fetch('http://localhost:4000/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.id}`,
        },
        body: JSON.stringify({ description: descriptionWithCategory, urgency }),
      });

      if (!response.ok) throw new Error('Failed to submit maintenance request');
      const newTicket = await response.json();
      setTickets((prev) => [newTicket, ...prev]);
      setTicketDescription('');
      setSelectedFile(null);
      setIsRequestModalOpen(false);
      addToast('Maintenance request successfully logged.', 'success');
      router.push('/tenant/maintenance');
    } catch (err: any) {
      addToast(err.message || 'Error logging maintenance request', 'error');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const handleCompleteAndRate = async (ticketId: string) => {
    setIsSubmittingRating(true);
    try {
      const response = await fetch(`http://localhost:4000/api/tickets/${ticketId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.id}`,
        },
        body: JSON.stringify({ rating: ratingValue, ratingComment: ratingCommentText }),
      });

      if (!response.ok) throw new Error('Failed to complete maintenance request');
      const updatedTicket = await response.json();
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updatedTicket : t)));
      setRatingOpenTicketId(null);
      setRatingCommentText('');
      setRatingValue(5);
      addToast('Request completed and contractor rated successfully!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Error completing request', 'error');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      setTimeout(() => {
        if (profile) {
          setProfile({
            ...profile,
            name: settingsName,
            email: settingsEmail,
            phone: settingsPhone,
          });
        }
        addToast('Profile settings saved successfully!', 'success');
        setIsSavingSettings(false);
      }, 1000);
    } catch {
      addToast('Error saving profile settings', 'error');
      setIsSavingSettings(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const activeInvoicesList = invoices.filter((inv) => inv.status !== 'Paid');
  const paidInvoicesList = invoices.filter((inv) => inv.status === 'Paid');
  const outstandingTotal = activeInvoicesList.reduce((sum, inv) => sum + Number(inv.amountDue), 0);
  const activeTicketsList = tickets.filter((t) => t.status !== 'completed' && t.status !== 'rejected');
  const historyTicketsList = tickets.filter((t) => t.status === 'completed' || t.status === 'rejected');

  return {
    toasts,
    addToast,
    removeToast,
    loading,
    theme,
    profile,
    invoices,
    tickets,
    contractors,
    maintenanceSubTab,
    setMaintenanceSubTab,
    paymentsSubTab,
    setPaymentsSubTab,
    isRequestModalOpen,
    setIsRequestModalOpen,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    selectedInvoice,
    setSelectedInvoice,
    isProcessingPayment,
    claimCode,
    setClaimCode,
    isClaimingCode,
    previewData,
    previewLoading,
    previewError,
    ticketDescription,
    setTicketDescription,
    urgency,
    setUrgency,
    category,
    setCategory,
    selectedFile,
    setSelectedFile,
    isSubmittingTicket,
    ratingOpenTicketId,
    setRatingOpenTicketId,
    ratingValue,
    setRatingValue,
    ratingCommentText,
    setRatingCommentText,
    isSubmittingRating,
    autoPayEnabled,
    setAutoPayEnabled,
    settingsName,
    setSettingsName,
    settingsEmail,
    setSettingsEmail,
    settingsPhone,
    setSettingsPhone,
    isSavingSettings,
    handleToggleTheme,
    handlePayInvoice,
    handleClaimTenantCode,
    handleLogTicket,
    handleCompleteAndRate,
    handleSaveSettings,
    handleLogout,
    activeInvoicesList,
    paidInvoicesList,
    outstandingTotal,
    activeTicketsList,
    historyTicketsList,
  };
}
