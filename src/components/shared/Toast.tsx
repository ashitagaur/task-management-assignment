import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  body?: string;
}

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newToast: ToastMessage = { ...toast, id };
      setToasts((prev) => [...prev, newToast]);

      // Auto dismiss after 4 seconds
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export const ToastContainer: React.FC<{
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0 || typeof document === 'undefined') return null;

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-5 right-5 z-toast flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            role={isError ? 'alert' : 'status'}
            className={`pointer-events-auto p-4 rounded-xl border shadow-fb-toast flex items-start gap-3 transition-all animate-in slide-in-from-bottom-2 duration-200 bg-white ${
              isError
                ? 'border-fb-danger-border'
                : isSuccess
                ? 'border-fb-success/20'
                : 'border-fb-border'
            }`}
          >
            {/* Icon matching Figma 1:973 */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                isError
                  ? 'bg-fb-danger-soft text-fb-danger'
                  : isSuccess
                  ? 'bg-fb-success-soft text-fb-success'
                  : 'bg-blue-50 text-blue-600'
              }`}
            >
              {isError && <X className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />}
              {isSuccess && <CheckCircle2 className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />}
              {!isError && !isSuccess && <Info className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <h4
                className={`text-xs font-semibold leading-tight ${
                  isError ? 'text-fb-danger-toast-title' : 'text-fb-text-primary'
                }`}
              >
                {toast.title}
              </h4>
              {toast.body && (
                <p className="text-[11px] text-fb-text-secondary mt-1 leading-normal">
                  {toast.body}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-fb-text-muted hover:text-fb-text-primary p-1 rounded-md transition-colors"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
};
