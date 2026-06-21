'use client';

import React from 'react';

interface TenantLoadingSkeletonProps {
  tab: string;
}

export default function TenantLoadingSkeleton({ tab }: TenantLoadingSkeletonProps) {
  return (
    <div className="flex flex-col p-4 md:p-6 lg:p-8 relative z-10 min-h-full max-w-5xl mx-auto w-full animate-pulse">
      {tab === 'overview' && (
        <div className="flex flex-col gap-6 w-full">
          {/* Welcome Banner Skeleton */}
          <div className="flex justify-between items-end mb-4 border-b border-ink-800/80 pb-5">
            <div className="flex flex-col gap-2">
              <div className="h-7 w-64 bg-ink-800 rounded-md"></div>
              <div className="h-4 w-48 bg-ink-900 rounded-md"></div>
            </div>
          </div>

          {/* KPI Cards Row Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-ink-900/60 border border-ink-800 rounded-md p-5 h-24 flex flex-col justify-between">
                <div className="h-3 w-20 bg-ink-800 rounded"></div>
                <div className="h-7 w-28 bg-ink-800 rounded"></div>
              </div>
            ))}
          </div>

          {/* Bottom Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-ink-900/60 border border-ink-800 rounded-md p-5 h-64 flex flex-col gap-4">
              <div className="h-4 w-32 bg-ink-800 rounded"></div>
              <div className="h-px bg-ink-800 w-full"></div>
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="flex flex-col gap-2">
                      <div className="h-3.5 w-24 bg-ink-800 rounded"></div>
                      <div className="h-2.5 w-16 bg-ink-900 rounded"></div>
                    </div>
                    <div className="h-6 w-16 bg-ink-800 rounded"></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-ink-900/60 border border-ink-800 rounded-md p-5 h-64 flex flex-col gap-4">
              <div className="h-4 w-32 bg-ink-800 rounded"></div>
              <div className="h-px bg-ink-800 w-full"></div>
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="flex flex-col gap-2">
                      <div className="h-3.5 w-36 bg-ink-800 rounded"></div>
                      <div className="h-2.5 w-20 bg-ink-900 rounded"></div>
                    </div>
                    <div className="h-6 w-12 bg-ink-800 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="flex flex-col gap-6 w-full">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center border-b border-ink-800/80 pb-5">
            <div className="h-6 w-40 bg-ink-800 rounded"></div>
            <div className="h-8 w-44 bg-ink-800 rounded"></div>
          </div>

          {/* Invoices List Skeleton */}
          <div className="flex flex-col gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-ink-900/60 border border-ink-800 rounded-md p-5 flex justify-between items-center h-28">
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-28 bg-ink-800 rounded"></div>
                  <div className="h-3.5 w-40 bg-ink-900 rounded"></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-6 w-16 bg-ink-850 rounded"></div>
                  <div className="h-10 w-28 bg-ink-800 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'maintenance' && (
        <div className="flex flex-col gap-6 w-full">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center border-b border-ink-800/80 pb-5">
            <div className="h-6 w-40 bg-ink-800 rounded"></div>
            <div className="h-9 w-32 bg-ink-800 rounded"></div>
          </div>

          {/* Tickets List Skeleton */}
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-ink-900/60 border border-ink-800 rounded-md p-5 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <div className="h-4 w-20 bg-ink-800 rounded"></div>
                      <div className="h-4 w-12 bg-ink-800 rounded"></div>
                    </div>
                    <div className="h-5 w-72 bg-ink-800 rounded"></div>
                  </div>
                  <div className="h-4 w-16 bg-ink-850 rounded"></div>
                </div>
                <div className="h-px bg-ink-850 w-full my-1"></div>
                <div className="flex justify-between items-center">
                  <div className="h-3 w-32 bg-ink-900 rounded"></div>
                  <div className="h-8 w-24 bg-ink-800 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab !== 'overview' && tab !== 'payments' && tab !== 'maintenance' && (
        <div className="flex flex-col gap-6 w-full">
          {/* Generic Skeleton */}
          <div className="h-6 w-32 bg-ink-800 rounded mb-4"></div>
          <div className="bg-ink-900/60 border border-ink-800 rounded-md p-6 h-80 flex flex-col gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-3 w-24 bg-ink-800 rounded"></div>
                <div className="h-10 w-full bg-ink-900 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
