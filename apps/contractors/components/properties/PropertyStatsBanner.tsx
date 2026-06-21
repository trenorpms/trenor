'use client';

import React from 'react';
import { formatMoney } from '../../app/utils/currency';

interface StatsBannerProps {
  occupancyRate: number;
  totalRevenue: number;
  totalArrears: number;
}

export default function PropertyStatsBanner({ occupancyRate, totalRevenue, totalArrears }: StatsBannerProps) {
  return (
    <div className="stat-banner-grid mt-6 relative z-10">
      <style jsx>{`
        .stat-banner-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 12px;
        }
        @media (min-width: 640px) {
          .stat-banner-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] p-5 rounded relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
        <span className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider block">Average Occupancy</span>
        <span className="text-xl font-semibold text-[var(--text-primary)] mt-1 block">{occupancyRate}%</span>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] p-5 rounded relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
        <span className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider block">Gross Monthly Income</span>
        <span className="text-xl font-semibold text-[var(--text-primary)] font-mono mt-1 block">{formatMoney(totalRevenue)}</span>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-muted)] p-5 rounded relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent-coral)]" />
        <span className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider block">Portfolio Arrears</span>
        <span className={`text-xl font-semibold font-mono mt-1 block ${totalArrears > 0 ? 'text-[var(--accent-coral)] font-bold' : 'text-emerald-500'}`}>
          {formatMoney(totalArrears)}
        </span>
      </div>
    </div>
  );
}
