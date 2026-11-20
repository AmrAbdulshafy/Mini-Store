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
      <rect width="64" height="64" rx="14" fill="#8E3A59" />
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="11"
        stroke="#E4C79B"
        strokeWidth="1.1"
        strokeOpacity="0.65"
      />
      {/* Delicate four-petal floral blossom */}
      <path
        d="M32 14C36 20 36 26 32 30C28 26 28 20 32 14Z"
        stroke="#FDF7F8"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M32 50C28 44 28 38 32 34C36 38 36 44 32 50Z"
        stroke="#FDF7F8"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M14 32C20 28 26 28 30 32C26 36 20 36 14 32Z"
        stroke="#FDF7F8"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M50 32C44 36 38 36 34 32C38 28 44 28 50 32Z"
        stroke="#FDF7F8"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="2.8" fill="#E4C79B" />
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
      <ellipse cx="60" cy="60" rx="48" ry="52" stroke="#C8A26E" strokeOpacity="0.55" strokeWidth="1.4" />
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
        EB
      </text>
      <circle cx="60" cy="20" r="2.4" fill="#C87A8D" />
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
      <EsraaEmblem className="h-9 w-9 shrink-0 transition-transform duration-200 group-hover:scale-105" />
      <div className="leading-tight">
        <span className="font-display block text-lg font-semibold tracking-[0.04em] text-[var(--text-primary)] sm:text-xl">
          {lang === 'ar' ? 'إسراء بوتيك' : 'Esraa Boutique'}
        </span>
        {!compact && (
          <span className="hidden text-[10px] font-medium tracking-[0.16em] text-[var(--accent)] uppercase sm:block">
            {lang === 'ar' ? 'أناقة أنثوية وجمال لا ينتهي' : 'Feminine Elegance & Beauty'}
          </span>
        )}
      </div>
    </div>
  );
}
