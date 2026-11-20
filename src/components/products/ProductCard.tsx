'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, Heart, MessageCircle, Sparkles } from 'lucide-react';
import type { Product } from '@/types/database';
import { useApp } from '@/components/providers/AppProvider';
import { formatPrice, getCollectionLabel } from '@/lib/i18n';
import { buildWhatsAppProductUrl } from '@/lib/whatsapp';
import { ProductQuickViewModal } from '@/components/products/ProductQuickViewModal';

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { lang, isFavorite, toggleFavorite, settings, t } = useApp();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
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
          ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300';

  return (
    <>
      <article
        className="glass-card animate-reveal group flex flex-col overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
        style={{ animationDelay: `${Math.min(index * 60, 360)}ms` }}
      >
        {/* Image Container */}
        <div className="relative aspect-[4/4.3] overflow-hidden bg-[var(--bg-subtle)]">
          <Link href={`/products/${product.slug}`} className="block h-full w-full">
            <img
              src={primaryImage}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
              loading="lazy"
            />
          </Link>

          {/* Top Badges & Quick Actions */}
          <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {discountPct && (
                <span className="rounded-full bg-[var(--text-primary)] px-2.5 py-1 text-[10px] font-semibold tracking-wider text-[var(--bg-page)]">
                  -{discountPct}%
                </span>
              )}
              {product.is_new_arrival && (
                <span className="rounded-full border border-[var(--border-glass)] bg-[var(--bg-page)]/90 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-[var(--text-primary)] backdrop-blur-sm">
                  {t.product.newBadge}
                </span>
              )}
              {product.is_featured && (
                <span className="flex items-center gap-1 rounded-full bg-[#141210]/80 px-2.5 py-1 text-[10px] font-medium text-[#C2A273] backdrop-blur-sm">
                  <Sparkles className="h-3 w-3" />
                  {t.product.featuredBadge}
                </span>
              )}
            </div>

            <div className="pointer-events-auto flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => toggleFavorite(product.id)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-page)]/85 text-[var(--text-primary)] shadow-sm backdrop-blur-md transition-transform hover:scale-105"
                aria-label={fav ? t.product.removeFromFavorites : t.product.addToFavorites}
              >
                <Heart className={`h-3.5 w-3.5 ${fav ? 'fill-[#A86F79] text-[#A86F79]' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setQuickViewOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-page)]/85 text-[var(--text-primary)] shadow-sm backdrop-blur-md transition-transform hover:scale-105"
                aria-label={lang === 'ar' ? 'معاينة سريعة' : 'Quick View'}
                title={lang === 'ar' ? 'معاينة سريعة' : 'Quick View'}
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {product.is_demo && (
            <span className="absolute bottom-2.5 start-3 rounded-full bg-[#190D25]/60 px-2.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-md">
              {t.product.demoBadge}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-[var(--accent)]">{catName}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}>
                {t.product.status[product.availability_status]}
              </span>
            </div>

            <Link href={`/products/${product.slug}`} className="block">
              <h3 className="font-display line-clamp-1 text-lg font-bold transition-colors group-hover:text-[var(--accent)]">
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
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white transition-all hover:bg-emerald-700 active:scale-95"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{t.contact.whatsapp}</span>
            </a>
            <button
              type="button"
              onClick={() => setQuickViewOpen(true)}
              className="rounded-2xl border px-3.5 py-2.5 text-xs font-semibold transition-colors hover:bg-[var(--accent-soft)]"
              style={{ borderColor: 'var(--border-glass)' }}
            >
              {lang === 'ar' ? 'معاينة' : 'Quick View'}
            </button>
          </div>
        </div>
      </article>

      <ProductQuickViewModal
        product={product}
        open={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
      />
    </>
  );
}
