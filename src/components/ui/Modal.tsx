'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  maxWidthClass?: string;
  closeOnBackdrop?: boolean;
  children: React.ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  maxWidthClass = 'max-w-2xl',
  closeOnBackdrop = true,
  children,
}: ModalProps) {
  const titleId = useId();
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      const frame = requestAnimationFrame(() => {
        setRendered(true);
        setClosing(false);
      });
      return () => cancelAnimationFrame(frame);
    } else if (rendered) {
      const frame = requestAnimationFrame(() => {
        setClosing(true);
      });
      const timer = setTimeout(() => {
        setRendered(false);
        setClosing(false);
        previousFocusRef.current?.focus();
      }, 180);
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }
  }, [open, rendered]);

  useEffect(() => {
    if (!rendered) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [rendered, onClose]);

  useEffect(() => {
    if (rendered && !closing) {
      panelRef.current?.focus();
    }
  }, [rendered, closing]);

  if (!rendered || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 transition-opacity duration-200 ${
        closing ? 'opacity-0' : 'opacity-100'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#190D25]/65 backdrop-blur-md"
        onClick={() => {
          if (closeOnBackdrop) onClose();
        }}
        aria-hidden="true"
      />

      {/* Panel: Bottom Sheet on mobile, centered Modal on sm+ */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`glass-card relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] sm:rounded-[2rem] outline-none ${maxWidthClass} ${
          closing ? 'animate-modal-out' : 'animate-modal-in'
        }`}
      >
        {/* Mobile sheet drag handle */}
        <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-[var(--text-secondary)]/25 sm:hidden" />

        {/* Header */}
        {(title || subtitle) && (
          <div
            className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-7 sm:py-5"
            style={{ borderColor: 'var(--border-glass)' }}
          >
            <div>
              {title && (
                <h2 id={titleId} className="font-display text-xl font-bold sm:text-2xl">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-[var(--accent-soft)]"
              style={{ borderColor: 'var(--border-glass)' }}
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
