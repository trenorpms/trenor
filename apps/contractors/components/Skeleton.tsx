'use client';

import React from 'react';

export function CardSkeleton() {
  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded p-4 flex flex-col gap-3 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-3 w-16 bg-[var(--border-strong)] rounded"></div>
        <div className="h-4 w-12 bg-[var(--border-strong)] rounded"></div>
      </div>
      <div className="h-5 w-2/3 bg-[var(--border-strong)] rounded"></div>
      <div className="h-3 w-1/2 bg-[var(--border-strong)] rounded mt-2"></div>
      <div className="h-8 w-full bg-[var(--border-strong)] rounded mt-4"></div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="w-full flex items-center justify-between py-4 border-b border-[var(--border-muted)] animate-pulse px-4">
      <div className="flex flex-col gap-2 w-1/4">
        <div className="h-3 w-20 bg-[var(--border-strong)] rounded"></div>
        <div className="h-2 w-12 bg-[var(--border-strong)] rounded"></div>
      </div>
      <div className="h-3 w-24 bg-[var(--border-strong)] rounded"></div>
      <div className="h-3 w-16 bg-[var(--border-strong)] rounded"></div>
      <div className="h-4 w-12 bg-[var(--border-strong)] rounded"></div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="w-full h-full min-h-[200px] flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border-muted)] rounded p-6 animate-pulse">
      <div className="flex flex-col items-center gap-3 w-full">
        <div className="h-3 w-24 bg-[var(--border-strong)] rounded"></div>
        <div className="w-full h-32 bg-[var(--border-strong)]/40 rounded flex items-end justify-between p-2 gap-2">
          <div className="h-1/3 w-6 bg-[var(--border-strong)] rounded-t"></div>
          <div className="h-2/3 w-6 bg-[var(--border-strong)] rounded-t"></div>
          <div className="h-1/2 w-6 bg-[var(--border-strong)] rounded-t"></div>
          <div className="h-3/4 w-6 bg-[var(--border-strong)] rounded-t"></div>
          <div className="h-4/5 w-6 bg-[var(--border-strong)] rounded-t"></div>
        </div>
      </div>
    </div>
  );
}
