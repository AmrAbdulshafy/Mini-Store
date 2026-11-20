'use client';

import React, { useState } from 'react';
import { Eye, Heart, MessageCircle, Minus, Plus, Ruler } from 'lucide-react';
import type { Product } from '@/types/database';
import { useApp } from '@/components/providers/AppProvider';
import { formatPrice, getCollectionLabel } from '@/lib/i18n';
import { buildWhatsAppProductUrl } from '@/lib/whatsapp';
import { ProductQuickViewModal } from '@/components/products/ProductQuickViewModal';

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { lang, isFavorite, toggleFavorite, settings, t } = useApp();
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const colors = product.colors && product.colors.length > 0 ? product.colors : [];
  const sizes = product.sizes && product.sizes.length > 0 ? product.sizes : [];
  const widthInfo = product.width_cm || product.dimensions || null;
  const stockCount =
    typeof product.stock_quantity === 'number'
      ? product.stock_quantity
      : product.availability_status === 'out_of_stock'
        ? 0
        : 10;
  const isOutOfStock = product.availability_status === 'out_of_stock' || stockCount <= 0;

  const [selectedColor, setSelectedColor] = useState<string | null>(colors[0] || null);
  const [selectedSize, setSelectedSize] = useState<string | null>(sizes[0] || null);
  const [quantity, setQuantity] = useState<number>(1);

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

  const waUrl = buildWhatsAppProductUrl(settings.whatsapp_number, product, lang, undefined, {
    color: selectedColor,
    size: selectedSize,
    quantity,
  });

  const handleDecrement = () => setQuantity((q) => Math.max(1, q - 1));
  const handleIncrement = () => setQuantity((q) => Math.min(stockCount, q + 1));

  return (
    <>
      <article
        className="glass-card card-modern animate-reveal group flex flex-col overflow-hidden rounded-2xl"
        style={{ animationDelay: `${Math.min(index * 45, 240)}ms` }}
      >
        {/* Image Container — opens Full-Detail Product Modal */}
        <div className="relative aspect-[4/4.2] overflow-hidden bg-[var(--bg-subtle)]">
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

          {/* Editorial Badges */}
          <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {discountPct && (
                <span className="rounded-md bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[var(--btn-primary-text)]">
                  -{discountPct}%
                </span>
              )}
              {product.is_new_arrival && (
                <span className="rounded-md border border-[var(--border-glass)] bg-[var(--bg-surface)]/95 px-2 py-0.5 text-[10px] font-medium tracking-wider text-[var(--text-primary)]">
                  {t.product.newBadge}
                </span>
              )}
            </div>

            <div className="pointer-events-auto flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => toggleFavorite(product.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-glass)] bg-[var(--bg-surface)]/90 text-[var(--text-primary)] backdrop-blur-sm transition-colors hover:bg-[var(--bg-subtle)]"
                aria-label={fav ? t.product.removeFromFavorites : t.product.addToFavorites}
              >
                <Heart className={`h-3.5 w-3.5 ${fav ? 'fill-[var(--accent)] text-[var(--accent)]' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setQuickViewOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-glass)] bg-[var(--bg-surface)]/90 text-[var(--text-primary)] backdrop-blur-sm transition-colors hover:bg-[var(--bg-subtle)]"
                aria-label={lang === 'ar' ? 'التفاصيل' : 'Details'}
                title={lang === 'ar' ? 'التفاصيل' : 'Details'}
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {product.is_demo && (
            <span className="absolute bottom-2.5 start-3 rounded-md bg-black/75 px-2 py-0.5 text-[10px] tracking-wide text-white">
              {t.product.demoBadge}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-[11px] tracking-wide">
              <span className="font-medium uppercase text-[var(--text-secondary)]">{catName}</span>
              <span
                className={`text-[11px] font-medium ${
                  isOutOfStock ? 'text-rose-400' : stockCount <= 3 ? 'text-amber-300' : 'text-[var(--text-muted)]'
                }`}
              >
                {isOutOfStock
                  ? lang === 'ar'
                    ? 'غير متوفر (0)'
                    : 'Out of Stock (0)'
                  : lang === 'ar'
                    ? `المتاح: ${stockCount}`
                    : `Stock: ${stockCount}`}
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

            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-[var(--accent-strong)]">
                {formatPrice(Number(product.price), product.currency || settings.currency, lang)}
              </span>
              {product.previous_price && Number(product.previous_price) > Number(product.price) && (
                <span className="text-xs text-[var(--text-muted)] line-through">
                  {formatPrice(Number(product.previous_price), product.currency || settings.currency, lang)}
                </span>
              )}
            </div>

            {/* Variants: Colors, Sizes, Width/Dimensions */}
            {(colors.length > 0 || sizes.length > 0 || widthInfo) && (
              <div className="space-y-2 border-t pt-2.5" style={{ borderColor: 'var(--border-glass)' }}>
                {colors.length > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {lang === 'ar' ? 'اللون:' : 'Color:'}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {colors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSelectedColor(c)}
                          title={c}
                          aria-label={`Color ${c}`}
                          className={`h-4 w-4 rounded-full border transition-transform ${
                            selectedColor === c
                              ? 'scale-115 border-white ring-2 ring-[var(--accent)]'
                              : 'border-white/25 opacity-80 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {sizes.length > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {lang === 'ar' ? 'المقاس:' : 'Size:'}
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      {sizes.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSelectedSize(s)}
                          className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                            selectedSize === s
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                              : 'border-[var(--border-glass)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {widthInfo && (
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-1 text-[var(--text-muted)]">
                      <Ruler className="h-3 w-3" />
                      {lang === 'ar' ? 'العرض / الأبعاد:' : 'Width:'}
                    </span>
                    <span className="font-medium text-[var(--text-secondary)]">{widthInfo}</span>
                  </div>
                )}
              </div>
            )}

            {/* Quantity Counter with Stock Validation */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-[var(--text-muted)]">
                {lang === 'ar' ? 'الكمية:' : 'Qty:'}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isOutOfStock || quantity <= 1}
                  onClick={handleDecrement}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border-glass)] text-xs transition-colors hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="min-w-6 text-center text-xs font-semibold">
                  {isOutOfStock ? 0 : quantity}
                </span>
                <button
                  type="button"
                  disabled={isOutOfStock || quantity >= stockCount}
                  onClick={handleIncrement}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border-glass)] text-xs transition-colors hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
            {!isOutOfStock && quantity >= stockCount && (
              <p className="text-end text-[10px] text-amber-300">
                {lang === 'ar' ? `الحد الأقصى المتاح (${stockCount})` : `Max stock reached (${stockCount})`}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center gap-2">
            {isOutOfStock ? (
              <span className="flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-[var(--border-glass)] bg-[var(--disabled-bg)] px-3 py-2.5 text-xs font-medium text-[var(--disabled-text)]">
                {lang === 'ar' ? 'غير متوفر حالياً' : 'Out of Stock'}
              </span>
            ) : (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="cta-luxury flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold tracking-wide"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{t.contact.whatsapp}</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => setQuickViewOpen(true)}
              className="rounded-xl border border-[var(--border-glass)] px-3.5 py-2.5 text-xs font-medium transition-colors hover:bg-[var(--bg-subtle)]"
            >
              {lang === 'ar' ? 'التفاصيل' : 'Details'}
            </button>
          </div>
        </div>
      </article>

      <ProductQuickViewModal
        product={product}
        open={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
        initialColor={selectedColor}
        initialSize={selectedSize}
        initialQuantity={quantity}
      />
    </>
  );
}
