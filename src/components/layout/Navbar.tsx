'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, Download, Heart, LogIn, Menu, Palette, X, Languages } from 'lucide-react';
import { DARK_PALETTES, useApp } from '@/components/providers/AppProvider';
import { BrandLogo } from '@/components/brand/BrandLogo';
import type { CollectionSlug } from '@/types/database';

export function Navbar() {
  const {
    lang,
    toggleLang,
    palette,
    setPalette,
    collectionTheme,
    setCollectionTheme,
    favorites,
    t,
  } = useApp();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const navLinks = [
    { href: '/', label: t.nav.home },
    { href: '/catalog', label: t.nav.catalog },
    { href: '/catalog?collection=women', label: t.nav.women, col: 'women' as CollectionSlug },
    { href: '/catalog?collection=men', label: t.nav.men, col: 'men' as CollectionSlug },
    { href: '/catalog?collection=handmade', label: t.nav.handmade, col: 'handmade' as CollectionSlug },
  ];

  return (
    <header className="glass-nav sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/">
          <BrandLogo lang={lang} />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (item.col) setCollectionTheme(item.col);
                }}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-all ${
                  active
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Favorites */}
          <Link
            href="/favorites"
            className="relative flex h-8 w-8 items-center justify-center gap-1.5 rounded-full border text-sm transition-colors hover:bg-[var(--accent-soft)] sm:h-9 sm:w-auto sm:px-3"
            style={{ borderColor: 'var(--border-glass)' }}
            aria-label={t.nav.favorites}
          >
            <Heart className="h-4 w-4 text-[var(--accent)]" />
            <span className="hidden text-xs font-medium sm:inline">{t.nav.favorites}</span>
            {favorites.length > 0 && (
              <span
                className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                {favorites.length}
              </span>
            )}
          </Link>

          {/* Language Toggle */}
          <button
            type="button"
            onClick={toggleLang}
            className="flex h-8 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold transition-colors hover:bg-[var(--accent-soft)] sm:h-9 sm:gap-1.5 sm:px-3 sm:text-xs"
            style={{ borderColor: 'var(--border-glass)' }}
            aria-label="Toggle language"
          >
            <Languages className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          {/* Dark Palette Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPaletteOpen((prev) => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-full border transition-colors hover:bg-[var(--accent-soft)] sm:h-9 sm:w-9"
              style={{ borderColor: 'var(--border-glass)' }}
              aria-label={lang === 'ar' ? 'تغيير لون المظهر' : 'Switch Color Theme'}
              title={lang === 'ar' ? 'تغيير لون المظهر' : 'Switch Color Theme'}
            >
              <Palette className="h-4 w-4 text-[var(--accent)]" />
            </button>

            {paletteOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setPaletteOpen(false)}
                />
                <div
                  className="glass-card animate-modal-in absolute end-0 top-11 z-50 w-52 rounded-2xl p-2 shadow-2xl"
                >
                  <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {lang === 'ar' ? 'الألوان الداكنة' : 'Dark Palettes'}
                  </p>
                  <div className="space-y-1">
                    {DARK_PALETTES.map((p) => {
                      const active = palette === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPalette(p.id);
                            setPaletteOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-colors ${
                            active ? 'bg-[var(--accent-soft)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <span
                              className="h-4 w-4 rounded-full border border-white/25 shadow-sm"
                              style={{ background: `linear-gradient(135deg, ${p.bg} 45%, ${p.swatch} 100%)` }}
                            />
                            <span>{lang === 'ar' ? p.labelAr : p.labelEn}</span>
                          </span>
                          {active && <Check className="h-3.5 w-3.5 text-[var(--accent)]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Install App */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('esraa:install-app'))}
            className="flex h-8 w-8 items-center justify-center gap-1.5 rounded-full border text-xs font-medium transition-colors hover:bg-[var(--accent-soft)] sm:h-9 sm:w-9 xl:w-auto xl:px-3"
            style={{ borderColor: 'var(--border-glass)' }}
            aria-label={lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}
            title={lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}
          >
            <Download className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span className="hidden xl:inline">{lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}</span>
          </button>

          {/* Login Modal Trigger */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('esraa:open-login'))}
            className="flex h-8 w-8 items-center justify-center gap-1.5 rounded-full border text-xs font-medium transition-colors hover:bg-[var(--accent-soft)] sm:h-9 sm:w-9 xl:w-auto xl:px-3"
            style={{ borderColor: 'var(--border-glass)' }}
            aria-label={lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
            title={lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
          >
            <LogIn className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span className="hidden xl:inline">{lang === 'ar' ? 'تسجيل الدخول' : 'Login'}</span>
          </button>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex h-8 w-8 items-center justify-center rounded-full border sm:h-9 sm:w-9 lg:hidden"
            style={{ borderColor: 'var(--border-glass)' }}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="border-t px-4 py-4 lg:hidden"
          style={{ borderColor: 'var(--border-glass)', background: 'var(--bg-page)' }}
        >
          <div className="flex flex-col gap-2">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (item.col) setCollectionTheme(item.col);
                  setMobileOpen(false);
                }}
                className="rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--accent-soft)]"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-glass)' }}>
              <span className="text-xs text-[var(--text-secondary)]">{t.collections.switchTheme}:</span>
              {(['women', 'men', 'handmade'] as CollectionSlug[]).map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setCollectionTheme(col)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    collectionTheme === col
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  {col === 'women' ? t.nav.women : col === 'men' ? t.nav.men : t.nav.handmade}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
