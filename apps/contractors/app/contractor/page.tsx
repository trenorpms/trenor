'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '../../components/ThemeToggle';
import LoadingOverlay from '../../components/LoadingOverlay';
import { io, Socket } from 'socket.io-client';

interface Ticket {
  id: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  status: 'open' | 'assigned' | 'completed' | 'on_hold';
  propertyName?: string;
  unitNumber?: string;
  contractorId?: number;
  amount?: number;
  contractorAccepted?: boolean;
}

interface ContractorProfile {
  id: number;
  name: string;
  email: string;
  specialty: string;
  phone?: string;
  status: string;
  bio?: string;
  hourlyRate?: number;
  photoUrl?: string;
  latitude?: string;
  longitude?: string;
  locationName?: string;
  onboarded: boolean;
}

const propertyProfessions = [
  'Plumber and Heating Technician',
  'Electrical and Systems Wireman',
  'HVAC Specialist',
  'Roofer and Exterior Expert',
  'Carpenter and Framer',
  'Painter and Finisher',
  'Masonry and Brickwork Specialist',
  'Locksmith and Access Controls',
  'Appliance Repair Specialist',
  'Landscape and Grounds Keeper',
  'Pest Control Specialist',
  'Drywaller and Plasterer',
  'Cleaning and Sanitation Specialist',
  'General Handyman',
  'Flooring Installer',
  'Glass and Window Specialist',
  'Waterproofing Technician',
  'Elevator and Lift Technician'
];

export default function ContractorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<ContractorProfile | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'wizard' | 'orders' | 'earnings'>('overview');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // First time modal
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [modalName, setModalName] = useState('');
  const [modalSpecialty, setModalSpecialty] = useState<string>('Plumber and Heating Technician');
  const [submittingModal, setSubmittingModal] = useState(false);

  // Wizard Steps & Form States
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [specialty, setSpecialty] = useState<string>('Plumber and Heating Technician');
  const [phone, setPhone] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [hourlyRate, setHourlyRate] = useState<number>(100);
  const [stripeAccount, setStripeAccount] = useState<string>('');
  const [stripeConnected, setStripeConnected] = useState<boolean>(false);
  const [locationName, setLocationName] = useState<string>('');
  const [latitude, setLatitude] = useState<string>('0.3476');
  const [longitude, setLongitude] = useState<string>('32.5825');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Dynamic Title Controller
  useEffect(() => {
    if (activeTab) {
      const tabTitles: Record<string, string> = {
        overview: 'Overview',
        orders: 'Jobs',
        schedule: 'Schedule',
        earnings: 'Earnings',
        wizard: 'Profile',
      };
      const cleanTitle = tabTitles[activeTab.toLowerCase()] || (activeTab.charAt(0).toUpperCase() + activeTab.slice(1));
      document.title = `Trenor | ${cleanTitle}`;
    }
  }, [activeTab]);

  useEffect(() => {
    const session = localStorage.getItem('user');
    if (!session || session === 'null' || session === 'undefined') {
      router.push('/login');
      return;
    }

    try {
      const parsed = JSON.parse(session);
      setUser(parsed);
      
      // Load Theme
      const theme = localStorage.getItem('data-theme') || 'dark';
      document.documentElement.setAttribute('data-theme', theme);
      
      loadData(parsed.email);
      setupSocket(parsed.email);
    } catch (e) {
      router.push('/login');
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [router]);

  const setupSocket = (email: string) => {
    try {
      const socket = io('http://localhost:4000/realtime', {
        transports: ['websocket'],
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('register', {
          identifier: email,
          role: 'tenant', // mapped to same non-landlord socket group
        });
        console.log('Contractor real-time connection initialized.');
      });

      socket.on('notification', (data: any) => {
        showToast(data.message, 'info');
        if (user) {
          loadData(user.email);
        }
      });
    } catch (err) {
      console.error('Socket initialisation failure:', err);
    }
  };

  const loadData = async (email: string) => {
    setLoading(true);
    try {
      const profRes = await fetch(`http://localhost:4000/api/tickets/contractor-profile?email=${email}`);
      let currentProfile: ContractorProfile | null = null;
      if (profRes.ok) {
        currentProfile = await profRes.json();
        setProfile(currentProfile);
        
        if (currentProfile) {
          setSpecialty(currentProfile.specialty || 'Plumber and Heating Technician');
          setPhone(currentProfile.phone || '');
          setBio(currentProfile.bio || '');
          setHourlyRate(currentProfile.hourlyRate || 100);
          setLocationName(currentProfile.locationName || '');
          setLatitude(currentProfile.latitude || '0.3476');
          setLongitude(currentProfile.longitude || '32.5825');
          setPhotoUrl(currentProfile.photoUrl || '');
          
          if (currentProfile.hourlyRate && currentProfile.onboarded) {
            setStripeConnected(true);
            setStripeAccount('acct_1MmockStripe889');
          }

          if (!currentProfile.onboarded && (!currentProfile.phone || currentProfile.phone === '')) {
            setShowFirstTimeModal(true);
            setModalName(currentProfile.name || '');
          }
        }
      }

      const ticketsRes = await fetch('http://localhost:4000/api/tickets');
      if (ticketsRes.ok) {
        const allTickets = await ticketsRes.json();
        if (currentProfile) {
          const filtered = allTickets.filter((t: Ticket) => 
            t.contractorId === currentProfile?.id || (t.status === 'open' && t.description.toLowerCase().includes(currentProfile?.specialty.toLowerCase().split(' ')[0] || ''))
          );
          setTickets(filtered);
        } else {
          setTickets(allTickets);
        }
      }
    } catch (err) {
      showToast('Error syncing ledger stats.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalName.trim() || !modalSpecialty) return;

    setSubmittingModal(true);
    try {
      const res = await fetch('http://localhost:4000/api/tickets/contractor-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: modalName,
          specialty: modalSpecialty,
          phone: 'Pending'
        })
      });

      if (!res.ok) throw new Error('Modal save failed');
      const updatedProf = await res.json();
      setProfile(updatedProf);
      setSpecialty(modalSpecialty);
      setShowFirstTimeModal(false);
      showToast('Initial details saved. Please complete your profile.', 'success');
      setActiveTab('wizard');
    } catch (err) {
      showToast('Failed to save initial setup.', 'error');
    } finally {
      setSubmittingModal(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const res = await fetch('http://localhost:4000/api/tickets/contractors/upload-r2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name })
      });
      if (!res.ok) throw new Error('R2 Upload failed');
      const data = await res.json();
      setPhotoUrl(data.url);
      showToast('Photo uploaded to R2 storage.', 'success');
    } catch (err) {
      showToast('Failed uploading to R2 storage.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveContractorProfile = async () => {
    if (!user || !profile) return;
    setSavingProfile(true);

    try {
      const res = await fetch('http://localhost:4000/api/tickets/contractor-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          specialty,
          phone,
          bio,
          hourlyRate,
          photoUrl,
          latitude,
          longitude,
          locationName,
          onboarded: true
        })
      });

      if (!res.ok) throw new Error('Update failed');
      const updatedProf = await res.json();
      setProfile(updatedProf);
      showToast('Detailed profile setup completed.', 'success');
      setActiveTab('overview');
    } catch (err) {
      showToast('Failed to commit profile updates.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleOnlineOffline = async (online: boolean) => {
    if (!user || !profile) return;
    const newStatus = online ? 'available' : 'offline';
    
    setProfile(prev => prev ? { ...prev, status: newStatus } : null);

    try {
      const res = await fetch('http://localhost:4000/api/tickets/contractor-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          status: newStatus
        })
      });
      if (res.ok) {
        showToast(`Roster state updated to ${online ? 'Online' : 'Offline'}.`, 'success');
      } else {
        throw new Error();
      }
    } catch (err) {
      showToast('Failed to sync network availability.', 'error');
    }
  };

  const handleAcceptOffer = async (ticketId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/tickets/${ticketId}/accept-offer`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Accept failure');
      showToast('Job offer accepted. Status updated to Active.', 'success');
      if (user) loadData(user.email);
    } catch (err) {
      showToast('Failed to accept assignment offer.', 'error');
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/tickets/${ticketId}/complete`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Update state failed');
      showToast('Task resolved. Payment request routed to landlord.', 'success');
      if (user) loadData(user.email);
    } catch (err) {
      showToast('Failed to complete work ticket.', 'error');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('user');
    document.cookie = 'user=; path=/; max-age=0';
    router.push('/login');
  };

  if (!user || !profile) {
    return <LoadingOverlay active={true} message="Loading profile..." />;
  }

  const offersList = tickets.filter(t => t.contractorId === profile.id && !t.contractorAccepted && t.status !== 'completed');
  const activeOrders = tickets.filter(t => t.contractorId === profile.id && t.contractorAccepted && t.status === 'assigned');
  const completedOrders = tickets.filter(t => t.contractorId === profile.id && t.status === 'completed');
  const totalEarnings = completedOrders.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const nextScheduledJob = activeOrders[0] || null;

  // Breadcrumbs helper
  const getTabTitle = () => {
    switch (activeTab) {
      case 'overview': return 'Overview';
      case 'orders': return 'Work Orders';
      case 'schedule': return 'Schedule';
      case 'earnings': return 'Earnings';
      case 'wizard': return 'My Profile';
      default: return 'Ready';
    }
  };

  return (
    <div className="min-h-screen w-screen bg-ink-950 text-warm-100 flex flex-row overflow-hidden relative">
      
      {/* Global Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-coral-500/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink-900 border border-coral-500/50 rounded-lg shadow-glow-coral px-4 py-3 z-50 flex items-center gap-3 animate-fade-in">
          <div className="w-6 h-6 rounded-full bg-coral-500/20 text-coral-500 flex items-center justify-center border border-coral-500/30">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold text-warm-50">System Notification</div>
            <div className="text-[10px] font-mono text-ink-400">{toast.message}</div>
          </div>
        </div>
      )}

      {/* First Time Modal */}
      {showFirstTimeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-ink-900 border border-ink-700 rounded p-6 shadow-2xl">
            <h2 className="text-lg font-semibold font-heading text-warm-50 mb-2">Configure Contractor Account</h2>
            <p className="text-xs text-warm-300 mb-4">Please submit your basic details to register.</p>
            
            <form onSubmit={handleModalSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-mono text-warm-200 mb-1 block">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={modalName}
                  onChange={e => setModalName(e.target.value)}
                  className="cyber-input w-full rounded p-2.5 text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-warm-200 mb-1 block">Profession / Specialty</label>
                <select
                  value={modalSpecialty}
                  onChange={e => setModalSpecialty(e.target.value)}
                  className="cyber-input w-full rounded p-2.5 text-xs outline-none cursor-pointer"
                >
                  {propertyProfessions.map((prof) => (
                    <option key={prof} value={prof}>{prof}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submittingModal || !modalName.trim()}
                className="w-full py-2.5 bg-coral-500 text-ink-950 font-semibold text-xs rounded hover:opacity-90 disabled:opacity-50 mt-2 cursor-pointer shadow-glow-coral"
              >
                {submittingModal ? 'Saving Initial Configuration...' : 'Save and Continue'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* SIDEBAR NAVIGATION                         */}
      {/* ========================================== */}
      <aside id="sidebar" className="w-64 flex-shrink-0 border-r border-ink-800 bg-ink-950 flex flex-col z-20 shadow-2xl relative">
        <div className="h-16 border-b border-ink-800 flex items-center px-5 flex-shrink-0">
          <div className="flex items-center gap-3 w-full">
            <div className="w-8 h-8 rounded bg-coral-500 flex items-center justify-center flex-shrink-0 text-ink-950 shadow-glow-coral">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 9.36l-7.1 7.1a1 1 0 0 1-1.41 0l-1.41-1.41a1 1 0 0 1 0-1.41l7.1-7.1a6 6 0 0 1 9.36-7.94l-3.77 3.77z"></path>
              </svg>
            </div>
            <div className="sidebar-text flex flex-col">
              <span className="font-heading font-semibold text-sm tracking-tight text-warm-50 leading-none">Trenor</span>
              <span className="font-mono text-[9px] text-emerald-400 tracking-widest mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                {profile.status === 'available' ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1 custom-scrollbar">
          <div className="nav-group-title text-[10px] font-semibold text-ink-500 uppercase tracking-widest mb-2 px-3 mt-2">Menu</div>
          
          <button onClick={() => setActiveTab('overview')} className={`nav-link flex items-center px-3 py-2.5 rounded text-warm-200 w-full text-left bg-transparent border-0 outline-none ${activeTab === 'overview' ? 'active' : ''}`} data-tab="overview">
            <svg className="sidebar-icon w-5 h-5 flex-shrink-0 mr-3 text-ink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span className="text-sm font-medium">Overview</span>
          </button>
          
          <button onClick={() => setActiveTab('orders')} className={`nav-link flex items-center px-3 py-2.5 rounded text-warm-200 w-full text-left bg-transparent border-0 outline-none ${activeTab === 'orders' ? 'active' : ''}`} data-tab="workorders">
            <svg className="sidebar-icon w-5 h-5 flex-shrink-0 mr-3 text-ink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span className="text-sm font-medium flex-grow">Work Orders</span>
            {offersList.length > 0 && (
              <span className="text-[10px] bg-coral-500/10 text-coral-500 border border-coral-500/20 px-1.5 py-0.5 rounded font-mono">
                {offersList.length} NEW
              </span>
            )}
          </button>

          <button onClick={() => setActiveTab('schedule')} className={`nav-link flex items-center px-3 py-2.5 rounded text-warm-200 w-full text-left bg-transparent border-0 outline-none ${activeTab === 'schedule' ? 'active' : ''}`} data-tab="schedule">
            <svg className="sidebar-icon w-5 h-5 flex-shrink-0 mr-3 text-ink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span className="text-sm font-medium">Schedule</span>
          </button>

          <div className="nav-group-title text-[10px] font-semibold text-ink-500 uppercase tracking-widest mb-2 px-3 mt-6">Account & Settings</div>
          
          <button onClick={() => setActiveTab('earnings')} className={`nav-link flex items-center px-3 py-2.5 rounded text-warm-200 w-full text-left bg-transparent border-0 outline-none ${activeTab === 'earnings' ? 'active' : ''}`} data-tab="revenue">
            <svg className="sidebar-icon w-5 h-5 flex-shrink-0 mr-3 text-ink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <span className="text-sm font-medium">Earnings</span>
          </button>

          <button onClick={() => setActiveTab('wizard')} className={`nav-link flex items-center px-3 py-2.5 rounded text-warm-200 w-full text-left bg-transparent border-0 outline-none ${activeTab === 'wizard' ? 'active' : ''}`} data-tab="profile">
            <svg className="sidebar-icon w-5 h-5 flex-shrink-0 mr-3 text-ink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span className="text-sm font-medium">My Profile</span>
          </button>
        </nav>

        {/* User Account bottom card */}
        <div className="p-4 border-t border-ink-800 bg-ink-950 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-ink-800 border border-ink-700 overflow-hidden flex items-center justify-center font-semibold text-xs text-warm-50 flex-shrink-0">
              {photoUrl ? (
                <img src={photoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                profile.name ? profile.name.substring(0, 2).toUpperCase() : 'CO'
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold truncate text-warm-50">{profile.name}</span>
              <span className="text-[10px] text-ink-400 font-mono truncate">{profile.email}</span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full py-1.5 text-center text-xs border border-ink-800 hover:border-coral-500 hover:text-coral-500 rounded bg-transparent transition-all cursor-pointer font-mono"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* ========================================== */}
      {/* MAIN CONTENT AREA                          */}
      {/* ========================================== */}
      <main className="flex-1 flex flex-col min-w-0 bg-ink-900 relative h-screen overflow-hidden">
        
        {/* TOPBAR */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-ink-800 bg-ink-950/80 backdrop-blur-md sticky top-0 z-10 flex-shrink-0">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-mono text-[10px] text-ink-500 uppercase tracking-widest select-none">
              <span className="text-ink-500">Trenor</span>
              <svg className="w-3 h-3 text-ink-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              <span className="text-warm-100 font-bold">{getTabTitle()}</span>
            </div>
          </div>

          {/* Right Utilities */}
          <div className="flex items-center gap-5">
            <ThemeToggle />
            <button
              onClick={() => loadData(user.email)}
              className="px-3 py-1.5 border border-ink-700 hover:border-coral-500 text-xs rounded transition-all cursor-pointer font-mono text-warm-200"
            >
              Sync Data
            </button>
          </div>
        </header>

        {/* Global Strips Zone (Dynamic Onboarding Status Flags) */}
        {!profile.onboarded ? (
          <div className="w-full bg-amber-500/10 border-b border-amber-500/20 text-amber-200 text-xs px-6 py-2 flex items-center justify-between z-20 flex-shrink-0 animate-fade-in">
            <span>Your profile is incomplete. Please complete your profile setup.</span>
            <button
              onClick={() => setActiveTab('wizard')}
              className="px-3 py-1 bg-amber-500 text-ink-950 font-semibold text-[10px] rounded hover:opacity-90 transition-all cursor-pointer font-mono"
            >
              Complete Setup
            </button>
          </div>
        ) : !stripeConnected ? (
          <div className="w-full bg-coral-500/10 border-b border-coral-500/20 text-coral-500 text-xs px-6 py-2 flex items-center justify-between z-20 flex-shrink-0 animate-fade-in">
            <span>Stripe account not linked. Go to Earnings tab to connect your payment details.</span>
            <button
              onClick={() => setActiveTab('earnings')}
              className="px-3 py-1 bg-coral-500 text-ink-950 font-semibold text-[10px] rounded hover:opacity-90 transition-all cursor-pointer font-mono"
            >
              Connect Payment
            </button>
          </div>
        ) : null}

        {/* Main Content Area Scroll View */}
        <div className="flex-1 overflow-y-auto relative bg-grid custom-scrollbar w-full p-4 md:p-6 lg:p-8">
          
          {loading ? (
            <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full animate-pulse">
              {/* Skeleton Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="h-28 bg-ink-950/40 border border-ink-800/80 rounded p-5 flex flex-col justify-between">
                  <div className="w-24 h-3 bg-ink-800 rounded"></div>
                  <div className="w-32 h-8 bg-ink-800/80 rounded mt-2"></div>
                  <div className="w-40 h-2.5 bg-ink-800/80 rounded mt-2"></div>
                </div>
                <div className="h-28 bg-ink-950/40 border border-ink-800/80 rounded p-5 flex flex-col justify-between">
                  <div className="w-20 h-3 bg-ink-800 rounded"></div>
                  <div className="w-16 h-8 bg-ink-800/80 rounded mt-2"></div>
                  <div className="w-32 h-2.5 bg-ink-800/80 rounded mt-2"></div>
                </div>
                <div className="h-28 bg-ink-950/40 border border-ink-800/80 rounded p-5 flex flex-col justify-between">
                  <div className="w-24 h-3 bg-ink-800 rounded"></div>
                  <div className="w-28 h-8 bg-ink-800/80 rounded mt-2"></div>
                  <div className="w-36 h-2.5 bg-ink-800/80 rounded mt-2"></div>
                </div>
              </div>

              {/* Skeleton Content Card */}
              <div className="h-64 bg-ink-950/40 border border-ink-800/80 rounded p-6 flex flex-col gap-4">
                <div className="w-36 h-4 bg-ink-800 rounded mb-2"></div>
                <div className="h-32 border border-dashed border-ink-800/50 rounded flex flex-col justify-center items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-ink-800/80 animate-pulse"></div>
                  <div className="w-48 h-3 bg-ink-800/80 rounded animate-pulse"></div>
                  <div className="w-32 h-2 bg-ink-800/80 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ========================================== */}
              {/* TAB: OVERVIEW                              */}
              {/* ========================================== */}
              {activeTab === 'overview' && (
            <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full fade-in-up">
              
              {/* Operations Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4">
                <div>
                  <h1 className="font-heading text-2xl font-semibold text-warm-50">Overview</h1>
                  <p className="text-xs font-mono text-ink-400 mt-1">
                     Specialty: {profile.specialty || 'General Technician'} • Rate: €{profile.hourlyRate || 100}/hr
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('wizard')}
                  className="mt-4 sm:mt-0 bg-coral-500 hover:bg-coral-600 text-ink-950 text-xs font-bold px-4 py-2 rounded transition-colors flex items-center gap-2 shadow-glow-coral"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Edit Profile
                </button>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="ops-card p-5 flex flex-col">
                  <span className="text-[10px] font-mono text-ink-500 uppercase tracking-widest">TOTAL EARNINGS</span>
                  <div className="text-3xl font-mono text-coral-500 font-bold mt-2">
                    €{totalEarnings.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-ink-400 mt-1">From {completedOrders.length} completed jobs</span>
                </div>

                <div className="ops-card p-5 flex flex-col">
                  <span className="text-[10px] font-mono text-ink-500 uppercase tracking-widest">ACTIVE JOBS</span>
                  <div className="text-3xl font-mono text-warm-50 font-bold mt-2">
                    {activeOrders.length}
                  </div>
                  <span className="text-[10px] text-ink-400 mt-1">{offersList.length} new job offers pending</span>
                </div>

                <div className="ops-card p-5 flex flex-col">
                  <span className="text-[10px] font-mono text-ink-500 uppercase tracking-widest">Rating</span>
                  <div className="text-3xl font-mono text-emerald-400 font-bold mt-2">
                    99.8 <span className="text-xs text-ink-400 font-normal">/ 100</span>
                  </div>
                  <span className="text-[10px] text-ink-400 mt-1">Job completion rate</span>
                </div>
              </div>

              {/* Next Scheduled Dispatch Card */}
              <div className="ops-card p-6 mt-2">
                <h3 className="font-heading text-sm font-semibold tracking-tight text-warm-50 mb-4">
                  Next Job
                </h3>
                
                {nextScheduledJob ? (
                  <div className="p-4 bg-ink-950 border border-ink-800 rounded flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-coral-500/10 text-coral-500 rounded border border-coral-500/20">
                          UPCOMING JOB
                        </span>
                        <span className="text-xs text-ink-400">Scheduled</span>
                      </div>
                      <h4 className="text-sm font-semibold text-warm-50">{nextScheduledJob.description}</h4>
                      <p className="text-xs text-ink-400 mt-1">
                        Property Location: {nextScheduledJob.propertyName || 'Lumina Heights'} • Unit: {nextScheduledJob.unitNumber || '4B'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-ink-500 block">Price</span>
                      <span className="text-lg font-mono font-bold text-warm-50">€{nextScheduledJob.amount?.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-ink-400 font-mono border border-dashed border-ink-800 rounded">
                    NO JOBS SCHEDULED. GO ONLINE TO RECEIVE OFFERS.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB: WORK ORDERS                           */}
          {/* ========================================== */}
          {activeTab === 'orders' && (
            <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full fade-in-up">
              
              {/* Offers Queue */}
              <div className="flex flex-col gap-4">
                <h2 className="font-heading text-lg font-semibold text-warm-50">New Job Offers</h2>
                <p className="text-xs text-ink-400 -mt-2">Offers sent to you by property managers.</p>
                
                {offersList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-ink-400 font-mono border border-dashed border-ink-800 rounded bg-ink-900/30">
                    NO PENDING JOB OFFERS.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {offersList.map((t) => (
                      <div key={t.id} className="ops-card p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="px-1.5 py-0.5 border border-coral-500/20 bg-coral-500/10 text-coral-500 text-[9px] font-mono rounded">
                              {t.urgency} Urgency
                            </span>
                            <span className="text-[10px] font-mono text-ink-500">JOB ID: {t.id.substring(0, 8).toUpperCase()}</span>
                          </div>
                          <h4 className="text-sm font-semibold text-warm-50">{t.description}</h4>
                          <p className="text-xs text-ink-400 mt-1">
                            Location: {t.propertyName || 'Lumina Heights'} • Unit: {t.unitNumber || '4B'}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 self-stretch md:self-auto justify-between md:justify-end">
                          <div className="text-right">
                            <span className="text-[10px] text-ink-500 block">Price</span>
                            <span className="text-base font-mono font-bold text-warm-50">€{t.amount?.toLocaleString()}</span>
                          </div>

                          <button
                            onClick={() => handleAcceptOffer(t.id)}
                            className="px-4 py-2 bg-coral-500 text-ink-950 font-semibold text-xs rounded hover:bg-coral-600 transition-colors cursor-pointer shadow-glow-coral"
                          >
                            Accept Offer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Contracts */}
              <div className="flex flex-col gap-4 mt-6">
                <h2 className="font-heading text-lg font-semibold text-warm-50">Current Jobs</h2>
                <p className="text-xs text-ink-400 -mt-2">Jobs you are currently working on.</p>
                
                {activeOrders.length === 0 ? (
                  <div className="py-8 text-center text-xs text-ink-400 font-mono border border-dashed border-ink-800 rounded bg-ink-900/30">
                    NO ACTIVE JOBS.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {activeOrders.map((t) => (
                      <div key={t.id} className="ops-card p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="px-1.5 py-0.5 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[9px] font-mono rounded">
                              In Progress
                            </span>
                            <span className="text-[10px] font-mono text-ink-500">JOB ID: {t.id.substring(0, 8).toUpperCase()}</span>
                          </div>
                          <h4 className="text-sm font-semibold text-warm-50">{t.description}</h4>
                          <p className="text-xs text-ink-400 mt-1">
                            Location: {t.propertyName || 'Lumina Heights'} • Unit: {t.unitNumber || '4B'}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 self-stretch md:self-auto justify-between md:justify-end">
                          <div className="text-right">
                            <span className="text-[10px] text-ink-500 block">Price</span>
                            <span className="text-base font-mono font-bold text-warm-50">€{t.amount?.toLocaleString()}</span>
                          </div>

                          <button
                            onClick={() => handleResolveTicket(t.id)}
                            className="px-4 py-2 bg-coral-500 text-ink-950 font-semibold text-xs rounded hover:bg-coral-600 transition-colors cursor-pointer shadow-glow-coral"
                          >
                            Mark Resolved
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB: SCHEDULE                              */}
          {/* ========================================== */}
          {activeTab === 'schedule' && (
            <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full fade-in-up">
              
              <div className="ops-card p-6">
                <h2 className="font-heading text-lg font-semibold text-warm-50 mb-1">Availability</h2>
                <p className="text-xs text-ink-400 mb-6">Set whether you are available to receive job offers.</p>

                <div className="flex items-center gap-6 p-4 bg-ink-950 border border-ink-800 rounded">
                  <div>
                    <div className="text-xs font-mono text-ink-400 uppercase">Status</div>
                    <div className="text-base font-bold mt-1 text-warm-50">
                      {profile.status === 'available' ? 'Online / Available' : 'Offline'}
                    </div>
                  </div>

                  <div className="ml-auto">
                    {profile.status === 'available' ? (
                      <button
                        onClick={() => toggleOnlineOffline(false)}
                        className="px-4 py-2 bg-red-500 text-white font-semibold text-xs rounded hover:opacity-95 cursor-pointer"
                      >
                        Go Offline
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleOnlineOffline(true)}
                        className="px-4 py-2 bg-coral-500 text-ink-950 font-semibold text-xs rounded hover:bg-coral-600 transition-colors cursor-pointer shadow-glow-coral"
                      >
                        Go Online
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Service Networks */}
              <div className="ops-card p-6">
                <h2 className="font-heading text-lg font-semibold text-warm-50 mb-1">Connected Networks</h2>
                <p className="text-xs text-ink-400 mb-4">Networks that assign you jobs based on your specialty.</p>

                <div className="flex flex-col gap-3">
                  {[
                    { name: 'Preferred Contractors Network', desc: 'Plumbing and heating jobs matching your specialty.', status: 'Active' },
                    { name: 'Rapid Care Network', desc: 'Urgent repair jobs in your area.', status: 'Active' },
                    { name: 'Property Care Network', desc: 'Scheduled maintenance jobs.', status: 'Active' }
                  ].map((net) => (
                    <div key={net.name} className="p-4 bg-ink-950 border border-ink-800 rounded flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-warm-50">{net.name}</div>
                        <div className="text-[10px] text-ink-400 mt-1">{net.desc}</div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {net.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB: PROFILE SETUP (WIZARD)                */}
          {/* ========================================== */}
          {activeTab === 'wizard' && (
            <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full fade-in-up">
              
              <div className="ops-card overflow-hidden flex flex-col md:flex-row min-h-[500px]">
                
                {/* Left timeline menu */}
                <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-ink-800 bg-ink-950/50 p-6 flex flex-row md:flex-col gap-4 overflow-x-auto md:overflow-x-visible">
                  <div className="flex md:flex-col gap-6 pl-2 relative w-full">
                    <button
                      onClick={() => setWizardStep(1)}
                      className={`wiz-nav-item text-xs font-mono text-left bg-transparent border-0 outline-none ${wizardStep === 1 ? 'active' : ''} ${wizardStep > 1 ? 'completed' : ''}`}
                    >
                      01 / Specialty & Contact
                    </button>
                    <button
                      onClick={() => setWizardStep(2)}
                      className={`wiz-nav-item text-xs font-mono text-left bg-transparent border-0 outline-none ${wizardStep === 2 ? 'active' : ''} ${wizardStep > 2 ? 'completed' : ''}`}
                    >
                      02 / Hourly Rate & Payment
                    </button>
                    <button
                      onClick={() => setWizardStep(3)}
                      className={`wiz-nav-item text-xs font-mono text-left bg-transparent border-0 outline-none ${wizardStep === 3 ? 'active' : ''} ${wizardStep > 3 ? 'completed' : ''}`}
                    >
                      03 / Location & Photo
                    </button>
                  </div>
                </div>

                {/* Right form body */}
                <div className="flex-1 p-6 md:p-8 bg-ink-900">
                  
                  {/* Step 1 */}
                  {wizardStep === 1 && (
                    <div className="flex flex-col gap-4 animate-fade-in">
                      <h3 className="font-heading text-lg font-semibold text-warm-50">Specialty & Contact</h3>
                      <p className="text-xs text-ink-400 -mt-2">Specify your specialty and contact information.</p>
                      
                      <div className="mt-4">
                        <label className="text-[10px] font-mono text-ink-400 uppercase tracking-widest block mb-1">Specialty</label>
                        <select
                          value={specialty}
                          onChange={e => setSpecialty(e.target.value)}
                          className="cyber-input w-full rounded p-2.5 text-xs outline-none cursor-pointer"
                        >
                          {propertyProfessions.map((prof) => (
                            <option key={prof} value={prof}>{prof}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-ink-400 uppercase tracking-widest block mb-1">Phone Number</label>
                        <input
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          className="cyber-input w-full rounded p-2.5 text-xs outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-ink-400 uppercase tracking-widest block mb-1">Bio</label>
                        <textarea
                          placeholder="Describe your skills and experience..."
                          value={bio}
                          onChange={e => setBio(e.target.value)}
                          rows={4}
                          className="cyber-input w-full rounded p-2.5 text-xs outline-none resize-none"
                        />
                      </div>

                      <button
                        onClick={() => setWizardStep(2)}
                        disabled={!phone.trim() || !bio.trim()}
                        className="w-full py-2.5 bg-coral-500 text-ink-950 font-bold text-xs rounded hover:opacity-95 disabled:opacity-50 mt-4 cursor-pointer shadow-glow-coral"
                      >
                        Next: Hourly Rate
                      </button>
                    </div>
                  )}

                  {/* Step 2 */}
                  {wizardStep === 2 && (
                    <div className="flex flex-col gap-4 animate-fade-in">
                      <h3 className="font-heading text-lg font-semibold text-warm-50">Hourly Rate & Payment</h3>
                      <p className="text-xs text-ink-400 -mt-2">Set your hourly rate and connect your Stripe account.</p>

                      <div className="mt-4">
                        <label className="text-[10px] font-mono text-ink-400 uppercase tracking-widest block mb-1">Hourly Rate (€)</label>
                        <input
                          type="number"
                          value={hourlyRate}
                          onChange={e => setHourlyRate(parseInt(e.target.value) || 0)}
                          className="cyber-input w-full rounded p-2.5 text-xs font-mono font-bold text-coral-500 outline-none"
                        />
                      </div>

                      <div className="p-4 bg-ink-950 border border-ink-800 rounded flex flex-col gap-3 mt-2">
                        <span className="text-xs font-bold text-warm-50">Stripe Link</span>
                        <p className="text-[10px] text-ink-400 leading-relaxed">
                          Link your Stripe account to receive direct payments.
                        </p>
                        
                        {stripeConnected ? (
                          <div className="flex items-center justify-between text-xs text-emerald-400 font-mono mt-1">
                            <span>Stripe Connected</span>
                            <span className="text-[9px] text-ink-400">{stripeAccount}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setStripeConnected(true);
                              setStripeAccount('acct_1MmockStripe889');
                              showToast('Stripe setup initialized.', 'success');
                            }}
                            className="py-2 bg-coral-500 text-ink-950 font-semibold text-xs rounded hover:bg-coral-600 transition-colors cursor-pointer shadow-glow-coral"
                          >
                            Connect Stripe
                          </button>
                        )}
                      </div>

                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => setWizardStep(1)}
                          className="flex-1 py-2.5 border border-ink-700 text-warm-50 text-xs rounded cursor-pointer font-mono"
                        >
                          Back
                        </button>
                        <button
                          onClick={() => setWizardStep(3)}
                          disabled={!stripeConnected}
                          className="flex-1 py-2.5 bg-coral-500 text-ink-950 font-bold text-xs rounded hover:opacity-95 disabled:opacity-50 cursor-pointer font-mono shadow-glow-coral"
                        >
                          Next: Location & Photo
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3 */}
                  {wizardStep === 3 && (
                    <div className="flex flex-col gap-4 animate-fade-in">
                      <h3 className="font-heading text-lg font-semibold text-warm-50">Location & Photo</h3>
                      <p className="text-xs text-ink-400 -mt-2">Set your service area and upload a profile photo.</p>

                      <div className="mt-4">
                        <label className="text-[10px] font-mono text-ink-400 uppercase tracking-widest block mb-1">Service Location</label>
                        <input
                          type="text"
                          placeholder="e.g. Seattle, WA"
                          value={locationName}
                          onChange={e => setLocationName(e.target.value)}
                          className="cyber-input w-full rounded p-2.5 text-xs outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-mono text-ink-400 block mb-1">Latitude</label>
                          <input
                            type="text"
                            value={latitude}
                            onChange={e => setLatitude(e.target.value)}
                            className="cyber-input w-full rounded p-2 text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-ink-400 block mb-1">Longitude</label>
                          <input
                            type="text"
                            value={longitude}
                            onChange={e => setLongitude(e.target.value)}
                            className="cyber-input w-full rounded p-2 text-xs outline-none"
                          />
                        </div>
                      </div>

                      {/* Photo upload dropzone */}
                      <div className="mt-2">
                        <label className="text-[10px] font-mono text-ink-400 uppercase tracking-widest block mb-1">Profile Photo</label>
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="p-6 border border-dashed border-ink-700 hover:border-coral-500 rounded text-center cursor-pointer flex flex-col items-center justify-center gap-2 photo-upload-zone transition-all"
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                          {photoUrl ? (
                            <div className="flex flex-col items-center gap-2">
                              <img src={photoUrl} alt="Preview" className="w-16 h-16 object-cover rounded border border-ink-800" />
                              <span className="text-[10px] text-emerald-400 font-mono">Photo Upload Complete</span>
                            </div>
                          ) : (
                            <>
                              <span className="text-xs font-semibold text-warm-50">
                                {uploadingPhoto ? 'Uploading...' : 'Upload profile picture'}
                              </span>
                              <span className="text-[9px] text-ink-400 font-mono">Upload profile photo</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={() => setWizardStep(2)}
                          className="flex-1 py-2.5 border border-ink-700 text-warm-50 text-xs rounded cursor-pointer font-mono"
                        >
                          Back
                        </button>
                        <button
                          onClick={saveContractorProfile}
                          disabled={!locationName.trim() || !photoUrl || savingProfile}
                          className="flex-1 py-2.5 bg-coral-500 text-ink-950 font-bold text-xs rounded hover:opacity-95 disabled:opacity-50 cursor-pointer font-mono shadow-glow-coral"
                        >
                          {savingProfile ? 'Saving...' : 'Save Profile'}
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB: EARNINGS / REVENUE                    */}
          {/* ========================================== */}
          {activeTab === 'earnings' && (
            <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full fade-in-up">
              
              <div className="ops-card p-6">
                <h2 className="font-heading text-lg font-semibold text-warm-50 mb-1">Earnings & Payments</h2>
                <p className="text-xs text-ink-400 mb-6">Overview of your completed job payments.</p>
 
                {/* Connect Stripe banner */}
                {!stripeConnected && (
                  <div className="p-4 bg-coral-500/10 border border-coral-500/20 rounded mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <span className="text-xs font-bold text-warm-50">Connect Stripe</span>
                      <p className="text-[10px] text-ink-400 mt-1">Link your bank account to receive direct payments.</p>
                    </div>
                    <button
                      onClick={() => {
                        setStripeConnected(true);
                        setStripeAccount('acct_1MmockStripe889');
                        showToast('Stripe linked successfully!', 'success');
                      }}
                      className="px-4 py-2 bg-coral-500 text-ink-950 font-bold text-xs rounded hover:bg-coral-600 transition-colors cursor-pointer shadow-glow-coral font-mono"
                    >
                      Connect Stripe
                    </button>
                  </div>
                )}
 
                {/* Ledger Balance Card */}
                <div className="p-5 bg-ink-950 border border-ink-800 rounded flex justify-between items-center mb-6">
                  <div>
                    <span className="text-[10px] font-mono text-ink-500 uppercase tracking-widest">TOTAL EARNINGS</span>
                    <div className="text-2xl font-mono text-coral-500 font-bold mt-1">€{totalEarnings.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-ink-500 uppercase tracking-widest">COMPLETED JOBS</span>
                    <div className="text-xl font-bold mt-1 text-warm-100">{completedOrders.length} Completed</div>
                  </div>
                </div>
 
                {/* Ledger Table */}
                <h3 className="text-xs font-mono text-ink-400 uppercase tracking-wider mb-3">Transaction History</h3>
                
                {completedOrders.length === 0 ? (
                  <div className="py-8 text-center text-xs text-ink-400 font-mono border border-dashed border-ink-800 rounded bg-ink-950/30">
                    NO TRANSACTIONS FOUND.
                  </div>
                ) : (
                  <div className="border border-ink-800 rounded overflow-hidden">
                    <table className="w-full border-collapse text-left text-xs bg-ink-950">
                      <thead>
                        <tr className="bg-ink-900 border-b border-ink-800 text-ink-400">
                          <th className="p-3 font-semibold font-mono">JOB ID</th>
                          <th className="p-3 font-semibold">DESCRIPTION</th>
                          <th className="p-3 font-semibold">PROPERTY LOCATION</th>
                          <th className="p-3 font-semibold text-right">AMOUNT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-800">
                        {completedOrders.map((t) => (
                          <tr key={t.id} className="hover:bg-ink-900/50">
                            <td className="p-3 font-mono text-ink-400">{t.id.substring(0, 8).toUpperCase()}</td>
                            <td className="p-3 text-warm-100">{t.description}</td>
                            <td className="p-3 text-ink-400">{t.propertyName || 'Lumina Heights'} ({t.unitNumber || '4B'})</td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-400">€{t.amount?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
            </>
          )}
 
        </div>
 
        {/* Global Footer */}
        <footer className="h-12 border-t border-ink-800 bg-ink-950 flex items-center justify-between px-6 text-[9px] font-mono text-ink-500 uppercase tracking-widest z-20 flex-shrink-0">
          <span>Status: Connected</span>
          <span>2026 Trenor</span>
        </footer>
      </main>

    </div>
  );
}
