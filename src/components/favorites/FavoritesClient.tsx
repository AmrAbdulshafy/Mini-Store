'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, Trash2 } from 'lucide-react';
import type { Product } from '@/types/database';
import { useApp } from '@/components/providers/AppProvider';
import { ProductCard } from '@/components/products/ProductCard';

export function FavoritesClient({ allProducts }: { allProducts: Product[] }) {
  const { favorites, clearFavorites, t } = useApp();
  const favProducts = allProducts.filter((p) => favorites.includes(p.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{t.favorites.title}</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{t.favorites.subtitle}</p>
        </div>

        {favProducts.length > 0 && (
          <button
            type="button"
            onClick={clearFavorites}
            className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-500/10"
            style={{ borderColor: 'var(--border-glass)' }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{t.favorites.clearAll}</span>
          </button>
        )}
      </div>

      {favProducts.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <Heart className="mx-auto mb-4 h-10 w-10 text-[var(--accent)] opacity-70" />
          <h2 className="font-display text-2xl font-bold">{t.favorites.emptyTitle}</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{t.favorites.emptyDesc}</p>
          <Link
            href="/catalog"
            className="mt-6 inline-block rounded-full px-7 py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {t.favorites.browseCatalog}
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {favProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
