'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
}

interface ToastContextValue {
  showToast: (text: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const KIND_STYLES: Record<ToastKind, string> = {
  success: 'bg-accent-900 text-bg',
  error: 'bg-accent-900 text-bg',
  info: 'border border-line bg-surface text-ink',
};

const KIND_ICON: Record<ToastKind, string> = {
  success: 'M20 6 9 17l-5-5',
  error: 'M12 9v4M12 17h.01',
  info: 'M12 8v4M12 16h.01',
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, kind: ToastKind = 'info') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, kind, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex max-w-sm items-center gap-3 rounded px-4 py-2.5 text-sm shadow-lg ${KIND_STYLES[t.kind]}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
              {t.kind === 'success' ? <path d={KIND_ICON[t.kind]} /> : <circle cx="12" cy="12" r="9" />}
              {t.kind !== 'success' && <path d={KIND_ICON[t.kind]} />}
            </svg>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
