'use client';

import React from 'react';
import Toast, { ToastMessage } from './Toast';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export default function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div style={{
      position: 'fixed',
      top: '24px',
      right: '24px',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      pointerEvents: 'none',
      width: '320px',
    }}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}
