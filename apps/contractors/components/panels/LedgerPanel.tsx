'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import InvoiceTable from './InvoiceTable';
import ExpenseTable from './ExpenseTable';
import AuditLogsPanel from './AuditLogsPanel';

interface Invoice {
  invoiceId: string;
  tenantEmail: string;
  tenantName: string;
  unitNumber: string;
  amountDue: number;
  propertyName: string;
  status: string;
  created_by?: string;
  description?: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  propertyId: string;
  propertyName: string;
  createdAt: string;
}

interface Property {
  id: string;
  name: string;
}

export default function LedgerPanel() {
  const params = useParams();
  const tabname = params?.tabname as string;

  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'expenses' | 'audit'>('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalInvoices, setTotalInvoices] = useState<number>(0);
  const [totalArrears, setTotalArrears] = useState<number>(0);

  // Sync sub tab when route param shifts
  useEffect(() => {
    if (tabname === 'audit') {
      setActiveSubTab('audit');
    } else if (tabname === 'reconciliation' || tabname === 'invoices') {
      setActiveSubTab('invoices');
    }
  }, [tabname]);

  // Load static dependencies on client mount
  useEffect(() => {
    fetchStaticData();
  }, []);

  // Fetch paginated invoices when currentPage changes
  useEffect(() => {
    fetchInvoices();
  }, [currentPage]);

  const fetchStaticData = () => {
    const session = localStorage.getItem('user');
    if (!session) return;
    let token = '';
    try { token = JSON.parse(session).id; } catch (e) { return; }

    const headers = { 'Authorization': `Bearer ${token}` };
    Promise.all([
      fetch('http://localhost:4000/api/properties/expenses', { headers }).then(res => res.ok ? res.json() : []),
      fetch('http://localhost:4000/api/properties', { headers }).then(res => res.ok ? res.json() : []),
      fetch('http://localhost:4000/api/properties/tenants', { headers }).then(res => res.ok ? res.json() : [])
    ])
      .then(([exps, props, tnts]) => {
        setExpenses(exps || []);
        setProperties(props || []);
        setTenants(tnts || []);
      })
      .catch(err => console.error('Error fetching dependencies:', err));
  };

  const fetchInvoices = () => {
    const session = localStorage.getItem('user');
    if (!session) { setLoading(false); return; }
    let token = '';
    try { token = JSON.parse(session).id; } catch (e) { setLoading(false); return; }

    setLoadingInvoices(true);
    const headers = { 'Authorization': `Bearer ${token}` };

    fetch(`http://localhost:4000/api/properties/invoices?page=${currentPage}&limit=15`, { headers })
      .then(res => res.ok ? res.json() : { data: [], total: 0, totalArrears: 0 })
      .then(resData => {
        setInvoices(resData.data || []);
        setTotalInvoices(resData.total || 0);
        setTotalArrears(resData.totalArrears || 0);
        setLoading(false);
        setLoadingInvoices(false);
      })
      .catch((err) => {
        console.error('Error querying invoices:', err);
        setLoading(false);
        setLoadingInvoices(false);
      });
  };

  return (
    <div className="flex flex-col p-4 md:p-6 lg:p-8 relative z-10 min-h-full w-full bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Tab selectors */}
      <div className="flex border-b border-[var(--border-muted)] mb-5 text-xs font-mono">
        <button 
          onClick={() => setActiveSubTab('invoices')} 
          className={`pb-2.5 px-4 cursor-pointer border-b-2 font-bold transition-all ${
            activeSubTab === 'invoices' 
              ? 'border-[var(--accent-coral)] text-[var(--accent-coral)]' 
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Invoices Ledger
        </button>
        <button 
          onClick={() => setActiveSubTab('expenses')} 
          className={`pb-2.5 px-4 cursor-pointer border-b-2 font-bold transition-all ${
            activeSubTab === 'expenses' 
              ? 'border-[var(--accent-coral)] text-[var(--accent-coral)]' 
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Operational Expenses
        </button>
        <button 
          onClick={() => setActiveSubTab('audit')} 
          className={`pb-2.5 px-4 cursor-pointer border-b-2 font-bold transition-all ${
            activeSubTab === 'audit' 
              ? 'border-[var(--accent-coral)] text-[var(--accent-coral)]' 
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Security & Audit
        </button>
      </div>

      {activeSubTab === 'invoices' ? (
        <InvoiceTable
          invoices={invoices}
          totalInvoices={totalInvoices}
          totalArrears={totalArrears}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onRefresh={fetchInvoices}
          tenants={tenants}
          loading={loading || loadingInvoices}
        />
      ) : activeSubTab === 'expenses' ? (
        <ExpenseTable
          expenses={expenses}
          properties={properties}
          onRefresh={fetchStaticData}
        />
      ) : (
        <AuditLogsPanel />
      )}
    </div>
  );
}
