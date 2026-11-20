'use client';

import React from 'react';
import type { Language } from '@/types/database';

export function EsraaEmblem({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="esPlumGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7026D9" />
          <stop offset="55%" stopColor="#190D25" />
          <stop offset="100%" stopColor="#F01878" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#esPlumGrad)" />
      <rect
        x="3"
        y="3"
        width="58"
        height="58"
        rx="15"
        stroke="#FFC247"
        strokeWidth="1.4"
        strokeOpacity="0.7"
      />
      <path
        d="M32 13C24.5 21.5 20 27.5 20 34.5C20 41.4 25.4 47 32 47C38.6 47 44 41.4 44 34.5C44 27.5 39.5 21.5 32 13Z"
        stroke="#FFC247"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 21C28.2 26 26 29.8 26 34C26 37.9 28.7 41 32 41C35.3 41 38 37.9 38 34C38 29.8 35.8 26 32 21Z"
        fill="#F01878"
        fillOpacity="0.35"
        stroke="#FFF5F8"
        strokeWidth="1.4"
      />
      <circle cx="32" cy="34" r="2.4" fill="#FFC247" />
    </svg>
  );
}

export function EsraaMonogram({ className = 'h-11 w-11' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <ellipse cx="60" cy="60" rx="50" ry="54" stroke="#FFC247" strokeWidth="2.2" />
      <ellipse
        cx="60"
        cy="60"
        rx="44"
        ry="48"
        stroke="#F01878"
        strokeOpacity="0.45"
        strokeWidth="1.1"
      />
      <text
        x="60"
        y="73"
        textAnchor="middle"
        fontFamily="var(--font-display), Georgia, serif"
        fontSize="42"
        fontWeight="700"
        letterSpacing="3"
        fill="currentColor"
      >
        ES
      </text>
      <circle cx="60" cy="20" r="3" fill="#FFC247" />
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
      <EsraaEmblem className="h-10 w-10 shrink-0 shadow-md transition-transform duration-300 group-hover:scale-105" />
      <div className="leading-tight">
        <span className="font-display block text-lg font-bold tracking-tight text-[var(--es-plum)] dark:text-[var(--es-warm-white)] sm:text-xl">
          {lang === 'ar' ? 'إسراء سيكريت' : 'Esraa Secret'}
        </span>
        {!compact && (
          <span className="hidden text-[10px] font-semibold tracking-[0.14em] text-[var(--es-fuchsia)] uppercase sm:block">
            {lang === 'ar' ? 'أكثر من مجرد متجر... إنه سر الجمال' : "It's a Secret of Beauty"}
          </span>
        )}
      </div>
    </div>
  );
}
