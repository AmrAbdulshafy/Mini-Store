'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Sparkles } from 'lucide-react';
import type { Product } from '@/types/database';
import { useApp } from '@/components/providers/AppProvider';
import { formatPrice, getCollectionLabel } from '@/lib/i18n';
import { buildWhatsAppProductUrl } from '@/lib/whatsapp';

export function ProductCard({ product }: { product: Product }) {
  const { lang, isFavorite, toggleFavorite, settings, t } = useApp();
  const fav = isFavorite(product.id);

  const primaryImage =
    product.product_images?.find((img) => img.is_primary)?.image_url ||
    product.product_images?.[0]?.image_url ||
    '/images/collection-women.svg';

  const name = lang === 'ar' ? product.name_ar : product.name_en;
  const colSlug = product.collections?.slug || 'women';
  const catName = product.categories
    ? lang === 'ar'
      ? product.categories.name_ar
      : product.categories.name_en
    : getCollectionLabel(colSlug, lang);

  const discountPct =
    product.previous_price && product.previous_price > product.price
      ? Math.round(((product.previous_price - product.price) / product.previous_price) * 100)
      : null;

  const waUrl = buildWhatsAppProductUrl(settings.whatsapp_number, product, lang);

  const statusColor =
    product.availability_status === 'in_stock'
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
      : product.availability_status === 'low_stock'
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
        : product.availability_status === 'made_to_order'
          ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300';

  return (
    <article className="glass-card group flex flex-col overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1">
      {/* Image Container */}
      <div className="relative aspect-[4/4.3] overflow-hidden bg-[var(--bg-subtle)]">
        <Link href={`/products/${product.slug}`} className="block h-full w-full">
          <img
            src={primaryImage}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </Link>

        {/* Top Badges */}
        <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {discountPct && (
              <span className="rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                -{discountPct}%
              </span>
            )}
            {product.is_new_arrival && (
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                {t.product.newBadge}
              </span>
            )}
            {product.is_featured && (
              <span className="flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-amber-200 backdrop-blur-md">
                <Sparkles className="h-3 w-3" />
                {t.product.featuredBadge}
              </span>
            )}
          </div>

          {/* Favorite Button */}
          <button
            type="button"
            onClick={() => toggleFavorite(product.id)}
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-rose-600 shadow-sm backdrop-blur-md transition-transform hover:scale-110 dark:bg-black/60"
            aria-label={fav ? t.product.removeFromFavorites : t.product.addToFavorites}
          >
            <Heart className={`h-4 w-4 ${fav ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>

        {/* Demo label if sample */}
        {product.is_demo && (
          <span className="absolute bottom-2.5 start-3 rounded-full bg-black/45 px-2.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-md">
            {t.product.demoBadge}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-[var(--accent)]">{catName}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}>
              {t.product.status[product.availability_status]}
            </span>
          </div>

          <Link href={`/products/${product.slug}`} className="block">
            <h3 className="font-display line-clamp-1 text-lg font-semibold transition-colors group-hover:text-[var(--accent)]">
              {name}
            </h3>
          </Link>

          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-lg font-bold text-[var(--text-primary)]">
              {formatPrice(Number(product.price), product.currency || settings.currency, lang)}
            </span>
            {product.previous_price && Number(product.previous_price) > Number(product.price) && (
              <span className="text-xs line-through opacity-55">
                {formatPrice(Number(product.previous_price), product.currency || settings.currency, lang)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{t.contact.whatsapp}</span>
          </a>
          <Link
            href={`/products/${product.slug}`}
            className="rounded-2xl border px-3.5 py-2.5 text-xs font-semibold transition-colors hover:bg-[var(--accent-soft)]"
            style={{ borderColor: 'var(--border-glass)' }}
          >
            {lang === 'ar' ? 'التفاصيل' : 'Details'}
          </Link>
        </div>
      </div>
    </article>
  );
}
