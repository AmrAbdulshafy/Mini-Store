'use client';

import React from 'react';
import Link from 'next/link';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { EsraaEmblem } from '@/components/brand/BrandLogo';

export default function OfflinePage() {
  const { lang } = useApp();

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="glass-card w-full space-y-6 rounded-lg p-8 sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-[var(--border-glass)] bg-[var(--bg-subtle)]">
          <WifiOff className="h-6 w-6 text-[var(--accent)]" />
        </div>

        <EsraaEmblem className="mx-auto h-10 w-10" />

        <div className="space-y-2">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">
            {lang === 'ar' ? 'أنت غير متصل بالإنترنت' : 'You Are Currently Offline'}
          </h1>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {lang === 'ar'
              ? 'تعذر الاتصال بالشبكة حالياً. يمكنك تصفح الصفحات المحفوظة مسبقاً أو إعادة المحاولة عند عودة الاتصال.'
              : 'It looks like your connection dropped. You can revisit cached pages or retry once your connection is restored.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="cta-luxury inline-flex items-center gap-2 rounded-md px-6 py-3 text-xs font-semibold tracking-wider uppercase"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{lang === 'ar' ? 'إعادة المحاولة' : 'Retry Connection'}</span>
          </button>

          <Link
            href="/favorites"
            className="rounded-md border border-[var(--border-glass)] px-6 py-3 text-xs font-semibold tracking-wider uppercase transition-colors hover:bg-[var(--bg-subtle)]"
          >
            {lang === 'ar' ? 'المفضلة' : 'Favorites'}
          </Link>
        </div>
      </div>
    </div>
  );
}
