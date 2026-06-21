'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import ToastContainer from '../../components/ToastContainer';
import Sidebar from '../components/Sidebar';
import OverviewTab from '../components/OverviewTab';
import PaymentsTab from '../components/PaymentsTab';
import MaintenanceTab from '../components/MaintenanceTab';
import DocumentsTab from '../components/DocumentsTab';
import SettingsTab from '../components/SettingsTab';
import Modals from '../components/Modals';
import OnboardingModal from '../components/OnboardingModal';
import TenantLoadingSkeleton from '../components/TenantLoadingSkeleton';
import { useTenantDashboard, Invoice } from '../hooks/useTenantDashboard';

export default function TenantPortalTabbed() {
  const router = useRouter();
  const params = useParams();
  const currentTab = (params?.tabname as string) || 'overview';

  const {
    toasts,
    addToast,
    removeToast,
    loading,
    theme,
    profile,
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
    tickets,
    contractors,
  } = useTenantDashboard();

  return (
    <div className="flex h-screen overflow-hidden bg-ink-950 text-warm-100 font-body selection:bg-coral-500/30 selection:text-coral-500 relative w-full">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div className={`flex flex-1 overflow-hidden h-full ${profile === null ? 'blur-sm pointer-events-none select-none' : ''}`}>
        <Sidebar
          profile={profile}
          currentTab={currentTab}
          activeInvoicesCount={activeInvoicesList.length}
          activeTicketsCount={activeTicketsList.length}
          onTabChange={(tab) => router.push(`/tenant/${tab}`)}
          onLogout={handleLogout}
        />

        <main className="flex-1 flex flex-col min-w-0 bg-ink-900 relative h-screen overflow-hidden">
          {/* Header toolbar */}
          <header className="h-12 flex items-center justify-between px-5 border-b border-ink-800 bg-ink-950/80 backdrop-blur-md sticky top-0 z-10 flex-shrink-0">
            <div className="flex items-center gap-2 font-mono text-[9px] text-ink-500 uppercase tracking-widest select-none">
              <span>Resident Portal</span>
              <svg className="w-3 h-3 text-ink-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span className="text-warm-100 font-bold">
                {currentTab === 'overview'
                  ? 'Dashboard'
                  : currentTab === 'payments'
                  ? 'Billing & Payments'
                  : currentTab === 'maintenance'
                  ? 'Maintenance'
                  : currentTab === 'documents'
                  ? 'Documents & Lease'
                  : 'Profile Settings'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={handleToggleTheme} className="text-ink-400 hover:text-warm-50 transition-colors p-1" title="Toggle theme">
                {theme === 'dark' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>
              <button className="relative text-ink-400 hover:text-warm-50 transition-colors p-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto relative bg-grid custom-scrollbar w-full pb-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-coral-500/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

            {loading ? (
              <TenantLoadingSkeleton tab={currentTab} />
            ) : (
              <>
                {currentTab === 'overview' && (
                  <OverviewTab
                    profile={profile}
                    activeInvoices={activeInvoicesList}
                    activeTickets={activeTicketsList}
                    outstandingTotal={outstandingTotal}
                    onTabChange={(tab) => router.push(`/tenant/${tab}`)}
                  />
                )}

                {currentTab === 'payments' && (
                  <PaymentsTab
                    profile={profile}
                    activeInvoicesList={activeInvoicesList}
                    paidInvoicesList={paidInvoicesList}
                    outstandingTotal={outstandingTotal}
                    paymentsSubTab={paymentsSubTab}
                    setPaymentsSubTab={setPaymentsSubTab}
                    autoPayEnabled={autoPayEnabled}
                    setAutoPayEnabled={setAutoPayEnabled}
                    onPayInvoice={(inv: Invoice) => {
                      setSelectedInvoice(inv);
                      setIsPaymentModalOpen(true);
                    }}
                    addToast={addToast}
                  />
                )}

                {currentTab === 'maintenance' && (
                  <MaintenanceTab
                    activeTicketsList={activeTicketsList}
                    historyTicketsList={historyTicketsList}
                    contractors={contractors}
                    maintenanceSubTab={maintenanceSubTab}
                    setMaintenanceSubTab={setMaintenanceSubTab}
                    ratingOpenTicketId={ratingOpenTicketId}
                    setRatingOpenTicketId={setRatingOpenTicketId}
                    ratingValue={ratingValue}
                    setRatingValue={setRatingValue}
                    ratingCommentText={ratingCommentText}
                    setRatingCommentText={setRatingCommentText}
                    isSubmittingRating={isSubmittingRating}
                    handleCompleteAndRate={handleCompleteAndRate}
                    setIsRequestModalOpen={setIsRequestModalOpen}
                    addToast={addToast}
                  />
                )}

                {currentTab === 'documents' && (
                  <DocumentsTab
                    profile={profile}
                    addToast={addToast}
                  />
                )}

                {currentTab === 'settings' && (
                  <SettingsTab
                    settingsName={settingsName}
                    setSettingsName={setSettingsName}
                    settingsEmail={settingsEmail}
                    setSettingsEmail={setSettingsEmail}
                    settingsPhone={settingsPhone}
                    setSettingsPhone={setSettingsPhone}
                    isSavingSettings={isSavingSettings}
                    handleSaveSettings={handleSaveSettings}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <Modals
        isRequestModalOpen={isRequestModalOpen}
        setIsRequestModalOpen={setIsRequestModalOpen}
        category={category}
        setCategory={setCategory}
        urgency={urgency}
        setUrgency={setUrgency}
        ticketDescription={ticketDescription}
        setTicketDescription={setTicketDescription}
        selectedFile={selectedFile}
        onFileSelect={setSelectedFile}
        isSubmittingTicket={isSubmittingTicket}
        handleLogTicket={handleLogTicket}
        profile={profile}
        isPaymentModalOpen={isPaymentModalOpen}
        setIsPaymentModalOpen={setIsPaymentModalOpen}
        selectedInvoice={selectedInvoice}
        isProcessingPayment={isProcessingPayment}
        handlePayInvoice={handlePayInvoice}
      />

      {profile === null && !loading && (
        <OnboardingModal
          claimCode={claimCode}
          setClaimCode={setClaimCode}
          isClaimingCode={isClaimingCode}
          handleClaimCode={handleClaimTenantCode}
          previewLoading={previewLoading}
          previewError={previewError}
          previewData={previewData}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
