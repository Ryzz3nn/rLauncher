import { useEffect } from 'react';
import type { Toast as ToastType } from '../types';

interface ToastContainerProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastType; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className={`toast toast-${toast.type}`} onClick={() => onDismiss(toast.id)}>
      <span className="toast-icon">
        {toast.type === 'success' && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="7" cy="7" r="6"/><path d="M4 7l2 2 4-4"/>
          </svg>
        )}
        {toast.type === 'error' && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="7" cy="7" r="6"/><line x1="4.5" y1="4.5" x2="9.5" y2="9.5"/><line x1="9.5" y1="4.5" x2="4.5" y2="9.5"/>
          </svg>
        )}
        {toast.type === 'info' && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="7" cy="7" r="6"/><line x1="7" y1="6" x2="7" y2="10"/><circle cx="7" cy="4" r="0.5" fill="currentColor"/>
          </svg>
        )}
      </span>
      <span className="toast-message">{toast.message}</span>
    </div>
  );
}
