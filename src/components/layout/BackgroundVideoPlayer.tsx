'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export function BackgroundVideoPlayer() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) return null;

  return (
    <div className="pointer-events-none fixed inset-0 -z-20 h-[100dvh] w-full overflow-hidden bg-[var(--bg-page)]">
      <video
        src="/videos/esraa-luxury-ad.mp4"
        poster="/images/hero-boutique.png"
        autoPlay
        muted
        loop
        playsInline
        className="h-full w-full object-cover object-center opacity-90 brightness-115 contrast-105"
      />
      <div
        className="absolute inset-0 backdrop-blur-[6px]"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
        }}
      />
    </div>
  );
}
