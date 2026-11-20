'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Download, RefreshCw, Share, WifiOff, X } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Modal } from '@/components/ui/Modal';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'esraa_pwa_install_dismissed_at';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function PwaManager() {
  const { lang } = useApp();
  const pathname = usePathname();

  const [isOffline, setIsOffline] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

    const initFrame = requestAnimationFrame(() => {
      setIsStandalone(standalone);
      setIsIos(ios);
      setIsOffline(!window.navigator.onLine);
    });

    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          if (reg.waiting) {
            setWaitingWorker(reg.waiting);
          }
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
              }
            });
          });
        })
        .catch(() => {
          // ignore SW registration failure in unsupported environments
        });
    }

    // Listen for Chromium beforeinstallprompt
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      if (standalone) return;
      try {
        const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || '0');
        if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) {
          return;
        }
      } catch {
        // ignore
      }

      // Discreetly show after 20s of engagement (not immediately on load)
      setTimeout(() => {
        setShowBanner(true);
      }, 20000);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    const onAppInstalled = () => {
      setIsStandalone(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', onAppInstalled);

    // Manual trigger from Footer "Install App" button
    const onManualInstall = () => {
      if (standalone) return;
      if (deferredPrompt) {
        void deferredPrompt.prompt();
      } else if (ios) {
        setShowIosGuide(true);
      } else {
        setShowBanner(true);
      }
    };
    window.addEventListener('esraa:install-app', onManualInstall);

    return () => {
      cancelAnimationFrame(initFrame);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
      window.removeEventListener('esraa:install-app', onManualInstall);
    };
  }, [deferredPrompt]);

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowBanner(false);
      } else {
        handleDismiss();
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowBanner(false);
      setShowIosGuide(true);
    }
  };

  const handleApplyUpdate = () => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        window.location.reload();
      },
      { once: true }
    );
  };

  const isAdmin = pathname?.startsWith('/admin');

  return (
    <>
      {/* Offline Status Bar */}
      {isOffline && (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-[#191619] px-4 py-2 text-xs font-medium text-[#F5F1EC] shadow-md"
        >
          <WifiOff className="h-3.5 w-3.5 text-[#C4A779]" />
          <span>
            {lang === 'ar'
              ? 'أنت غير متصل بالإنترنت حالياً — قد لا تتوفر بعض الميزات المباشرة.'
              : 'You are currently offline — live requests will resume when reconnected.'}
          </span>
        </div>
      )}

      {/* Discreet Service Worker Update Bar */}
      {waitingWorker && (
        <div className="fixed bottom-5 start-5 z-50 max-w-xs rounded-lg border border-[var(--border-glass)] bg-[var(--bg-surface)] p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold">
                {lang === 'ar' ? 'تحديث جديد متاح' : 'New Version Available'}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {lang === 'ar'
                  ? 'أعد التحميل للحصول على أحدث تجربة من إسراء سيكريت.'
                  : 'Reload to apply the latest Esraa Secret update.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setWaitingWorker(null)}
              className="rounded p-1 opacity-60 hover:opacity-100"
              aria-label="Dismiss update"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleApplyUpdate}
            className="cta-luxury mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{lang === 'ar' ? 'تحديث الآن' : 'Reload & Update'}</span>
          </button>
        </div>
      )}

      {/* Discreet Install Prompt (never on /admin, never if already standalone) */}
      {!isAdmin && !isStandalone && showBanner && (deferredPrompt || isIos) && (
        <div className="fixed bottom-5 start-5 z-40 max-w-sm rounded-lg border border-[var(--border-glass)] bg-[var(--bg-surface)] p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="font-display text-sm font-semibold">
                {lang === 'ar' ? 'تثبيت تطبيق إسراء سيكريت' : 'Install Esraa Secret'}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {lang === 'ar'
                  ? 'أضيفي المتجر إلى شاشتك الرئيسية لتصفح أسرع وتجربة تطبيق متكاملة.'
                  : 'Add Esraa Secret to your home screen for faster, app-like browsing.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded p-1 opacity-60 hover:opacity-100"
              aria-label="Dismiss install prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="cta-luxury inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-md border border-[var(--border-glass)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            >
              {lang === 'ar' ? 'لاحقاً' : 'Not now'}
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Add-to-Home-Screen Instructions Modal */}
      <Modal
        open={showIosGuide}
        onClose={() => setShowIosGuide(false)}
        maxWidthClass="max-w-md"
        title={lang === 'ar' ? 'التثبيت على الآيفون والآيباد' : 'Install on iOS Safari'}
      >
        <div className="space-y-4 text-sm text-[var(--text-secondary)]">
          <p>
            {lang === 'ar'
              ? 'لتثبيت إسراء سيكريت على شاشتك الرئيسية في متصفح Safari:'
              : 'To install Esraa Secret on your iPhone or iPad home screen:'}
          </p>
          <ol className="space-y-3 text-xs leading-relaxed">
            <li className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--border-glass)] font-semibold">
                1
              </span>
              <span className="flex items-center gap-1.5">
                {lang === 'ar' ? 'اضغط على أيقونة المشاركة' : 'Tap the Share button'}
                <Share className="inline h-4 w-4 text-[var(--accent)]" />
                {lang === 'ar' ? 'في شريط المتصفح.' : 'in Safari’s toolbar.'}
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--border-glass)] font-semibold">
                2
              </span>
              <span>
                {lang === 'ar'
                  ? 'اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).'
                  : 'Scroll down and tap "Add to Home Screen".'}
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--border-glass)] font-semibold">
                3
              </span>
              <span>
                {lang === 'ar' ? 'اضغط "إضافة" في الزاوية العلوية.' : 'Tap "Add" in the top corner.'}
              </span>
            </li>
          </ol>
        </div>
      </Modal>
    </>
  );
}
