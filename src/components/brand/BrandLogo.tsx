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
      <rect width="64" height="64" rx="18" fill="#64152F" />
      <rect
        x="3"
        y="3"
        width="58"
        height="58"
        rx="15"
        stroke="#D9A65A"
        strokeWidth="1.2"
        strokeOpacity="0.6"
      />
      <path
        d="M32 13C24.5 21.5 20 27.5 20 34.5C20 41.4 25.4 47 32 47C38.6 47 44 41.4 44 34.5C44 27.5 39.5 21.5 32 13Z"
        stroke="#D9A65A"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 21C28.2 26 26 29.8 26 34C26 37.9 28.7 41 32 41C35.3 41 38 37.9 38 34C38 29.8 35.8 26 32 21Z"
        fill="#D9829A"
        fillOpacity="0.35"
        stroke="#FFF9F5"
        strokeWidth="1.4"
      />
      <circle cx="32" cy="34" r="2.2" fill="#D9A65A" />
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
      <ellipse cx="60" cy="60" rx="50" ry="54" stroke="#D9A65A" strokeWidth="2" />
      <ellipse
        cx="60"
        cy="60"
        rx="44"
        ry="48"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="1"
      />
      <text
        x="60"
        y="73"
        textAnchor="middle"
        fontFamily="var(--font-display), Georgia, serif"
        fontSize="42"
        fontWeight="600"
        letterSpacing="3"
        fill="currentColor"
      >
        ES
      </text>
      <circle cx="60" cy="20" r="2.8" fill="#D9A65A" />
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
      <EsraaEmblem className="h-10 w-10 shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-105" />
      <div className="leading-tight">
        <span className="font-display block text-lg font-bold tracking-tight text-[var(--es-burgundy)] dark:text-[var(--es-cream)] sm:text-xl">
          {lang === 'ar' ? 'إسراء سيكريت' : 'Esraa Secret'}
        </span>
        {!compact && (
          <span className="hidden text-[10px] font-medium tracking-[0.14em] text-[var(--es-rose)] uppercase sm:block">
            {lang === 'ar' ? 'أكثر من مجرد متجر... إنه سر الجمال' : "It's a Secret of Beauty"}
          </span>
        )}
      </div>
    </div>
  );
}
