'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Volume2, VolumeX } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';

const USER_MUTED_KEY = 'esraa_bg_music_user_muted';

export function BackgroundVideoPlayer() {
  const pathname = usePathname();
  const { lang } = useApp();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(false);
  const userExplicitlyMutedRef = useRef(false);

  const isAdmin = pathname?.startsWith('/admin');

  useEffect(() => {
    if (isAdmin) return;
    try {
      if (sessionStorage.getItem(USER_MUTED_KEY) === 'true') {
        userExplicitlyMutedRef.current = true;
        if (videoRef.current) videoRef.current.muted = true;
        return;
      }
    } catch {
      // ignore
    }

    const vid = videoRef.current;
    if (!vid) return;

    const tryAutoplayUnmuted = () => {
      if (userExplicitlyMutedRef.current) return;
      vid.volume = 0.25;
      vid.muted = false;
      const p = vid.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          setMuted(false);
          cleanup();
        }).catch(() => {
          // Browser autoplay policy blocked unmuted playback before user gesture;
          // start muted video immediately and unmute on first interaction.
          vid.muted = true;
          setMuted(true);
          vid.play().catch(() => {});
        });
      }
    };

    const events = [
      'pointerdown',
      'pointermove',
      'mousemove',
      'scroll',
      'touchstart',
      'touchmove',
      'keydown',
      'wheel',
      'click',
    ] as const;

    const cleanup = () => {
      events.forEach((ev) => window.removeEventListener(ev, tryAutoplayUnmuted));
      vid.removeEventListener('canplay', tryAutoplayUnmuted);
    };

    tryAutoplayUnmuted();
    vid.addEventListener('canplay', tryAutoplayUnmuted, { once: true });
    events.forEach((ev) => window.addEventListener(ev, tryAutoplayUnmuted, { passive: true }));

    return cleanup;
  }, [isAdmin]);

  if (isAdmin) return null;

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.muted || muted) {
      userExplicitlyMutedRef.current = false;
      try {
        sessionStorage.removeItem(USER_MUTED_KEY);
      } catch {
        // ignore
      }
      vid.volume = 0.25;
      vid.muted = false;
      vid.play().catch(() => {});
      setMuted(false);
    } else {
      userExplicitlyMutedRef.current = true;
      try {
        sessionStorage.setItem(USER_MUTED_KEY, 'true');
      } catch {
        // ignore
      }
      vid.muted = true;
      setMuted(true);
    }
  };

  return (
    <>
      {/* Full-Website Background Video Layer */}
      <div className="pointer-events-none fixed inset-0 -z-20 h-[100dvh] w-full overflow-hidden bg-[var(--bg-page)]">
        <video
          ref={videoRef}
          src="/videos/esraa-luxury-ad.mp4"
          poster="/images/hero-boutique.png"
          autoPlay
          loop
          playsInline
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
          className="h-full w-full object-cover object-center opacity-90 brightness-115 contrast-105"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--bg-page) 20%, transparent) 0%, color-mix(in srgb, var(--bg-page) 36%, transparent) 100%)',
          }}
        />
      </div>

      {/* Persistent Mute / Unmute Floating Control */}
      <button
        type="button"
        onClick={toggleMute}
        aria-label={
          muted
            ? lang === 'ar'
              ? 'تشغيل موسيقى الخلفية'
              : 'Unmute Background Music'
            : lang === 'ar'
              ? 'كتم موسيقى الخلفية'
              : 'Mute Background Music'
        }
        title={
          muted
            ? lang === 'ar'
              ? 'تشغيل موسيقى الخلفية'
              : 'Unmute Background Music'
            : lang === 'ar'
              ? 'كتم موسيقى الخلفية'
              : 'Mute Background Music'
        }
        className="glass-card fixed bottom-5 start-5 z-40 flex h-11 items-center gap-2 rounded-full px-3.5 text-xs font-semibold text-[var(--text-primary)] shadow-2xl transition-transform hover:scale-105"
      >
        {muted ? (
          <>
            <VolumeX className="h-4 w-4 text-[var(--accent)]" />
            <span className="hidden sm:inline">{lang === 'ar' ? 'الصوت مكتوم' : 'Sound Off'}</span>
          </>
        ) : (
          <>
            <Volume2 className="h-4 w-4 animate-pulse text-[var(--accent)]" />
            <span className="hidden sm:inline">{lang === 'ar' ? 'الموسيقى تعمل' : 'Music On'}</span>
          </>
        )}
      </button>
    </>
  );
}
