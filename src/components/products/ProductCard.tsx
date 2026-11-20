'use client';

import React, { useState } from 'react';
import { Eye, Heart, MessageCircle } from 'lucide-react';
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

  return (
    <>
      <article
        className="glass-card animate-reveal group flex flex-col overflow-hidden rounded-lg transition-colors duration-200 hover:border-[var(--border-strong)]"
        style={{ animationDelay: `${Math.min(index * 45, 240)}ms` }}
      >
        {/* Image Container — opens Product Modal on current page */}
        <div className="relative aspect-[4/4.5] overflow-hidden bg-[var(--bg-subtle)]">
          <button
            type="button"
            onClick={() => setQuickViewOpen(true)}
            className="block h-full w-full cursor-pointer text-start"
            aria-label={name}
          >
            <img
              src={primaryImage}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              loading="lazy"
            />
          </button>

          {/* Restrained Editorial Badges */}
          <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {discountPct && (
                <span className="rounded-sm bg-[#542D3A] px-2 py-0.5 text-[10px] font-medium tracking-wider text-[#F5F1EC]">
                  -{discountPct}%
                </span>
              )}
              {product.is_new_arrival && (
                <span className="rounded-sm border border-[var(--border-glass)] bg-[var(--bg-surface)]/95 px-2 py-0.5 text-[10px] font-medium tracking-wider text-[var(--text-primary)]">
                  {t.product.newBadge}
                </span>
              )}
            </div>

            <div className="pointer-events-auto flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => toggleFavorite(product.id)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-glass)] bg-[var(--bg-surface)]/90 text-[var(--text-primary)] backdrop-blur-sm transition-colors hover:bg-[var(--bg-subtle)]"
                aria-label={fav ? t.product.removeFromFavorites : t.product.addToFavorites}
              >
                <Heart className={`h-3.5 w-3.5 ${fav ? 'fill-[#542D3A] text-[#542D3A] dark:fill-[#C4A779] dark:text-[#C4A779]' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setQuickViewOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-glass)] bg-[var(--bg-surface)]/90 text-[var(--text-primary)] backdrop-blur-sm transition-colors hover:bg-[var(--bg-subtle)]"
                aria-label={lang === 'ar' ? 'معاينة سريعة' : 'Quick View'}
                title={lang === 'ar' ? 'معاينة سريعة' : 'Quick View'}
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {product.is_demo && (
            <span className="absolute bottom-2.5 start-3 rounded-sm bg-[#191619]/75 px-2 py-0.5 text-[10px] tracking-wide text-[#F5F1EC]">
              {t.product.demoBadge}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-[11px] tracking-wide">
              <span className="font-medium text-[var(--text-secondary)] uppercase">{catName}</span>
              <span className="text-[11px] text-[var(--text-muted)]">
                {t.product.status[product.availability_status]}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setQuickViewOpen(true)}
              className="block w-full text-start"
            >
              <h3 className="font-display line-clamp-1 text-base font-semibold tracking-wide transition-colors group-hover:text-[var(--accent)] sm:text-lg">
                {name}
              </h3>
            </button>

            <div className="flex items-baseline gap-2 pt-0.5">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {formatPrice(Number(product.price), product.currency || settings.currency, lang)}
              </span>
              {product.previous_price && Number(product.previous_price) > Number(product.price) && (
                <span className="text-xs text-[var(--text-muted)] line-through">
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
              className="cta-luxury flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-xs font-medium tracking-wide"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{t.contact.whatsapp}</span>
            </a>
            <button
              type="button"
              onClick={() => setQuickViewOpen(true)}
              className="rounded-md border border-[var(--border-glass)] px-3.5 py-2.5 text-xs font-medium transition-colors hover:bg-[var(--bg-subtle)]"
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
