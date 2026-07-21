import * as React from "react"
import { cn } from "../../lib/utils"

const Modal = ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#18181A] border border-zinc-800 text-zinc-50 rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800/50 hover:bg-zinc-700 cursor-pointer transition-colors">
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

export { Modal }
