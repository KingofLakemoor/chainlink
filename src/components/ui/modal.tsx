import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "../../lib/utils"

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  cardClassName?: string;
}

const Modal = ({ isOpen, onClose, children, className, cardClassName }: ModalProps) => {
  // Close on Escape key press and lock background scroll on mobile / desktop
  React.useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain",
        className
      )}
    >
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer transition-opacity"
        aria-label="Close modal overlay"
      />

      {/* Modal card container */}
      <div
        className={cn(
          "bg-[#18181A] border border-zinc-800 text-zinc-50 rounded-2xl shadow-2xl w-full max-w-md my-auto max-h-[88dvh] sm:max-h-[90vh] flex flex-col overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-150",
          cardClassName
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-3.5 right-3.5 text-zinc-400 hover:text-zinc-100 z-30 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800/80 hover:bg-zinc-700 cursor-pointer transition-colors shadow-md border border-zinc-700/50"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
};

export { Modal }
