"use client";
import { createContext, ReactNode, useCallback, useContext, useState } from "react";

type Kind = "success" | "error" | "info";
interface ToastItem { id: number; kind: Kind; message: string }

const ToastContext = createContext<{ push: (kind: Kind, message: string) => void }>({ push: () => {} });
export const useToast = () => useContext(ToastContext);

const colors: Record<Kind, string> = {
  success: "bg-green-600",
  error: "bg-red-600",
  info: "bg-gray-800",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((kind: Kind, message: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, kind, message }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] space-y-2" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`${colors[t.kind]} text-white text-sm px-4 py-2.5 rounded-lg shadow-lg max-w-sm`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
