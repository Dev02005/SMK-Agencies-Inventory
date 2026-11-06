"use client";

import { Check } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ShowToast = (message: string) => void;

const ToastContext = createContext<ShowToast>(() => {});

/** One small white toast at the bottom of the screen, above the tab bar and any fixed save bar. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback<ShowToast>((message) => {
    setToast({ id: Date.now(), message });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 5000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          key={toast.id}
          role="status"
          className="surface animate-fade-up fixed inset-x-4 bottom-[calc(150px+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-start gap-3 p-4 md:bottom-28 lg:bottom-8"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-good-soft text-good">
            <Check size={16} strokeWidth={2.25} aria-hidden />
          </span>
          <p className="text-[15px] leading-[21px] text-ink">{toast.message}</p>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  return useContext(ToastContext);
}

/** Success message for forms. */
export function sampleSaveMessage(thing: string) {
  const title = thing.trim();
  const capitalized = title.charAt(0).toUpperCase() + title.slice(1);
  return `${capitalized} saved successfully.`;
}
