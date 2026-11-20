'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Menu, Moon, ShieldCheck, Sun, X, Languages } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { BrandLogo } from '@/components/brand/BrandLogo';
import type { CollectionSlug } from '@/types/database';

export function Navbar() {
  const {
    lang,
    toggleLang,
    theme,
    toggleTheme,
    collectionTheme,
    setCollectionTheme,
    favorites,
    t,
  } = useApp();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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
    <header className="glass-nav sticky top-0 z-40">
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
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Favorites */}
          <Link
            href="/favorites"
            className="relative flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors hover:bg-[var(--accent-soft)]"
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
            className="flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors hover:bg-[var(--accent-soft)]"
            style={{ borderColor: 'var(--border-glass)' }}
            aria-label="Toggle language"
          >
            <Languages className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:bg-[var(--accent-soft)]"
            style={{ borderColor: 'var(--border-glass)' }}
            aria-label={theme === 'dark' ? t.common.lightMode : t.common.darkMode}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-300" />
            ) : (
              <Moon className="h-4 w-4 text-[var(--accent)]" />
            )}
          </button>

          {/* Admin Link */}
          <Link
            href="/admin"
            className="hidden h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors hover:bg-[var(--accent-soft)] sm:flex"
            style={{ borderColor: 'var(--border-glass)' }}
            aria-label={t.nav.admin}
            title={t.nav.admin}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span className="hidden xl:inline">{t.nav.admin}</span>
          </Link>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-full border lg:hidden"
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
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-soft)]"
            >
              <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
              <span>{t.nav.admin}</span>
            </Link>
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
