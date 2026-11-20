'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = true,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} maxWidthClass="max-w-md" title={title}>
      <div className="space-y-5">
        <div className="flex items-start gap-3.5">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
              danger ? 'bg-rose-500/15 text-rose-500' : 'bg-[var(--accent-soft)] text-[var(--accent)]'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{message}</p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-full border px-5 py-2.5 text-xs font-semibold transition-colors hover:bg-[var(--accent-soft)]"
            style={{ borderColor: 'var(--border-glass)' }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-full px-6 py-2.5 text-xs font-semibold text-white transition-opacity disabled:opacity-50 ${
              danger ? 'bg-rose-600 hover:bg-rose-700' : 'cta-luxury'
            }`}
          >
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
