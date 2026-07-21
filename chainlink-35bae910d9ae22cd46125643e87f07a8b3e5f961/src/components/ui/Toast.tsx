import React, { createContext, useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  body: string;
  url?: string;
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="bg-[#18181B] border border-zinc-800 shadow-xl rounded-lg p-4 w-80 relative cursor-pointer"
      onClick={() => {
        if (toast.url) window.location.href = toast.url;
      }}
    >
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onRemove(toast.id);
        }}
        className="absolute top-2 right-2 text-zinc-400 hover:text-white"
      >
        <X size={16} />
      </button>
      <div className="flex items-start gap-3">
        {/* Simple app icon representation */}
        <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-sm font-bold text-white shrink-0">
          CL
        </div>
        <div className="flex-1 pr-4">
          <h4 className="font-medium text-white text-sm mb-1 leading-tight">{toast.title}</h4>
          <p className="text-zinc-400 text-xs leading-snug">{toast.body}</p>
        </div>
      </div>
    </motion.div>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
