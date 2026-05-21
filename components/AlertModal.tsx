"use client";

import { useEffect, useRef } from "react";

export type AlertVariant = "warning" | "danger" | "info" | "success";

interface AlertModalProps {
  open: boolean;
  variant?: AlertVariant;
  title: string;
  message: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onClose: () => void;
}

const variantStyles: Record<AlertVariant, { ring: string; iconBg: string; iconColor: string; primary: string }> = {
  warning: { ring: "ring-amber-200", iconBg: "bg-amber-100", iconColor: "text-amber-600", primary: "bg-amber-500 hover:bg-amber-600" },
  danger:  { ring: "ring-red-200",   iconBg: "bg-red-100",   iconColor: "text-red-600",   primary: "bg-red-600 hover:bg-red-700" },
  info:    { ring: "ring-indigo-200", iconBg: "bg-indigo-100", iconColor: "text-indigo-600", primary: "bg-indigo-600 hover:bg-indigo-700" },
  success: { ring: "ring-green-200",  iconBg: "bg-green-100",  iconColor: "text-green-600",  primary: "bg-green-600 hover:bg-green-700" },
};

function VariantIcon({ variant, className }: { variant: AlertVariant; className?: string }) {
  if (variant === "success") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  if (variant === "info") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    );
  }
  // warning / danger — triangle with !
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export default function AlertModal({
  open,
  variant = "warning",
  title,
  message,
  primaryLabel = "OK",
  onPrimary,
  secondaryLabel,
  onSecondary,
  onClose,
}: AlertModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const styles = variantStyles[variant];

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alert-modal-title"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
    >
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-sm ring-1 ${styles.ring} animate-[fadeIn_120ms_ease-out]`}>
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <div className={`h-12 w-12 rounded-full ${styles.iconBg} flex items-center justify-center mb-3`}>
            <VariantIcon variant={variant} className={`h-6 w-6 ${styles.iconColor}`} />
          </div>
          <h3 id="alert-modal-title" className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1.5 whitespace-pre-line">{message}</p>
        </div>
        <div className="px-6 pb-5 pt-1 flex gap-2 justify-end">
          {secondaryLabel && (
            <button
              type="button"
              onClick={() => { onSecondary?.(); onClose(); }}
              className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {secondaryLabel}
            </button>
          )}
          <button
            type="button"
            autoFocus
            onClick={() => { onPrimary?.(); onClose(); }}
            className={`px-4 py-2 rounded-md text-sm font-medium text-white ${styles.primary} transition-colors`}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}