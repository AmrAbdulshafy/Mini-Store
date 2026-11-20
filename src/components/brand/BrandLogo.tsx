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
      <rect width="64" height="64" rx="6" fill="#191619" />
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="4"
        stroke="#C4A779"
        strokeWidth="1"
        strokeOpacity="0.65"
      />
      <path
        d="M32 15C25.5 22.5 21.5 28 21.5 34.5C21.5 40.6 26.2 45.5 32 45.5C37.8 45.5 42.5 40.6 42.5 34.5C42.5 28 38.5 22.5 32 15Z"
        stroke="#F5F1EC"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="34.5" r="2" fill="#C4A779" />
    </svg>
  );
}

export function EsraaMonogram({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="14" y="14" width="92" height="92" rx="6" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.2" />
      <text
        x="60"
        y="73"
        textAnchor="middle"
        fontFamily="var(--font-display), Georgia, serif"
        fontSize="40"
        fontWeight="600"
        letterSpacing="4"
        fill="currentColor"
      >
        ES
      </text>
      <circle cx="60" cy="25" r="2" fill="#C4A779" />
    </svg>
  );
}

export function BrandLogo({
  lang,
  compact = false,
}: {
  lang: Language;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 group">
      <EsraaEmblem className="h-9 w-9 shrink-0 transition-opacity duration-200 group-hover:opacity-85" />
      <div className="leading-tight">
        <span className="font-display block text-lg font-semibold tracking-[0.06em] text-[var(--text-primary)] sm:text-xl">
          {lang === 'ar' ? 'إسراء سيكريت' : 'ESRAA SECRET'}
        </span>
        {!compact && (
          <span className="hidden text-[10px] font-medium tracking-[0.18em] text-[var(--text-secondary)] uppercase sm:block">
            {lang === 'ar' ? 'أكثر من مجرد متجر... إنه سر الجمال' : "It's a Secret of Beauty"}
          </span>
        )}
      </div>
    </div>
  );
}
