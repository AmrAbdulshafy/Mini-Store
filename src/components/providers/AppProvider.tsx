'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { CollectionSlug, Language, StoreSettings, ThemeMode } from '@/types/database';
import { translations } from '@/lib/i18n';

interface AppContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  collectionTheme: CollectionSlug;
  setCollectionTheme: (col: CollectionSlug) => void;
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  clearFavorites: () => void;
  settings: StoreSettings;
  t: (typeof translations)['ar'] | (typeof translations)['en'];
  dir: 'rtl' | 'ltr';
}

const AppContext = createContext<AppContextValue | null>(null);

const FAVORITES_KEY = 'lamsa_boutique_favorites';
const LANG_KEY = 'lamsa_boutique_lang';
const THEME_KEY = 'lamsa_boutique_theme';
const COLLECTION_KEY = 'lamsa_boutique_collection';

export function AppProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings: StoreSettings;
}) {
  const [lang, setLangState] = useState<Language>(initialSettings.default_language || 'ar');
  const [theme, setThemeState] = useState<ThemeMode>(initialSettings.default_theme || 'light');
  const [collectionTheme, setCollectionThemeState] = useState<CollectionSlug>(
    initialSettings.default_collection_theme || 'women'
  );
  const [favorites, setFavorites] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        const savedLang = localStorage.getItem(LANG_KEY) as Language | null;
        if (savedLang === 'ar' || savedLang === 'en') setLangState(savedLang);

        const savedTheme = localStorage.getItem(THEME_KEY) as ThemeMode | null;
        if (savedTheme === 'light' || savedTheme === 'dark') setThemeState(savedTheme);

        const savedCol = localStorage.getItem(COLLECTION_KEY) as CollectionSlug | null;
        if (savedCol === 'women' || savedCol === 'men' || savedCol === 'handmade') {
          setCollectionThemeState(savedCol);
        }

        const savedFavs = localStorage.getItem(FAVORITES_KEY);
        if (savedFavs) {
          const parsed = JSON.parse(savedFavs);
          if (Array.isArray(parsed)) setFavorites(parsed.filter((x) => typeof x === 'string'));
        }
      } catch {
        // ignore storage errors
      }
      setMounted(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    if (mounted) localStorage.setItem(LANG_KEY, lang);
  }, [lang, mounted]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    if (mounted) localStorage.setItem(THEME_KEY, theme);
  }, [theme, mounted]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-collection', collectionTheme);
    if (mounted) localStorage.setItem(COLLECTION_KEY, collectionTheme);
  }, [collectionTheme, mounted]);

  const setLang = (next: Language) => setLangState(next);
  const toggleLang = () => setLangState((prev) => (prev === 'ar' ? 'en' : 'ar'));
  const setTheme = (next: ThemeMode) => setThemeState(next);
  const toggleTheme = () => setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  const setCollectionTheme = (col: CollectionSlug) => setCollectionThemeState(col);

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const clearFavorites = () => {
    setFavorites([]);
    try {
      localStorage.removeItem(FAVORITES_KEY);
    } catch {
      // ignore
    }
  };

  const value = useMemo<AppContextValue>(
    () => ({
      lang,
      setLang,
      toggleLang,
      theme,
      setTheme,
      toggleTheme,
      collectionTheme,
      setCollectionTheme,
      favorites,
      toggleFavorite,
      isFavorite: (productId: string) => favorites.includes(productId),
      clearFavorites,
      settings: initialSettings,
      t: translations[lang],
      dir: lang === 'ar' ? 'rtl' : 'ltr',
    }),
    [lang, theme, collectionTheme, favorites, initialSettings]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
