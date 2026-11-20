'use client';

import React from 'react';
import type { Language } from '@/types/database';

export function EsraaEmblem({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* 3-Petal Crown Top */}
      <path
        d="M32 6L36.5 13.5L32 21L27.5 13.5Z"
        stroke="#C9A24D"
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      <path
        d="M19 10.5L26 13L32 21L22 18.5Z"
        stroke="#C9A24D"
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      <path
        d="M45 10.5L42 18.5L32 21L38 13Z"
        stroke="#C9A24D"
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      {/* Faceted Diamond */}
      <path
        d="M19 21H45L55 32L32 58L9 32Z"
        stroke="#C9A24D"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M9 32H55"
        stroke="#C9A24D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M19 21L24 32L32 21L40 32L45 21"
        stroke="#C9A24D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 32L32 58L40 32"
        stroke="#C9A24D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EsraaMonogram({ className = 'h-10 w-10' }: { className?: string }) {
  return <EsraaEmblem className={className} />;
}

export function BrandLogo({
  lang,
  compact = false,
}: {
  lang: Language;
  compact?: boolean;
}) {
  return (
    <div className="group flex items-center gap-2.5">
      <EsraaEmblem className="h-9 w-9 shrink-0 transition-transform duration-200 group-hover:scale-105" />
      <div className="leading-tight">
        <span className="font-display block text-lg font-semibold tracking-[0.04em] text-[var(--text-primary)] sm:text-xl">
          {lang === 'ar' ? 'إسراء بوتيك' : 'Esraa Boutique'}
        </span>
        {!compact && (
          <span className="hidden text-[10px] font-medium tracking-[0.16em] text-[var(--champagne)] uppercase sm:block">
            {lang === 'ar' ? 'أناقة أنثوية وجمال لا ينتهي' : 'Feminine Elegance & Beauty'}
          </span>
        )}
      </div>
    </div>
  );
}
