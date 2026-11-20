'use client';

import React, { useState } from 'react';
import { Check, Heart, MessageCircle, Minus, Phone, Plus, Ruler, Share2, Sparkles } from 'lucide-react';
import type { Product } from '@/types/database';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/components/providers/AppProvider';
import { formatPrice, getCollectionLabel } from '@/lib/i18n';
import { buildWhatsAppProductUrl } from '@/lib/whatsapp';

export function ProductQuickViewModal({
  product,
  open,
  onClose,
  initialColor = null,
  initialSize = null,
  initialQuantity = 1,
}: {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  initialColor?: string | null;
  initialSize?: string | null;
  initialQuantity?: number;
}) {
  const { lang, isFavorite, toggleFavorite, settings, t } = useApp();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const colors = product?.colors && product.colors.length > 0 ? product.colors : [];
  const sizes = product?.sizes && product.sizes.length > 0 ? product.sizes : [];
  const stockCount =
    typeof product?.stock_quantity === 'number'
      ? Math.max(0, product.stock_quantity)
      : product?.availability_status === 'out_of_stock'
        ? 0
        : 10;
  const isOutOfStock = stockCount === 0 || product?.availability_status === 'out_of_stock';

  const [colorOverride, setColorOverride] = useState<string | null>(null);
  const [sizeOverride, setSizeOverride] = useState<string | null>(null);
  const [qtyOverride, setQtyOverride] = useState<number | null>(null);

  const selectedColor = colorOverride ?? initialColor ?? colors[0] ?? null;
  const selectedSize = sizeOverride ?? initialSize ?? sizes[0] ?? null;
  const quantity = Math.min(
    Math.max(1, qtyOverride ?? initialQuantity),
    Math.max(1, stockCount)
  );

  if (!product) return null;

  const images =
    product.product_images && product.product_images.length > 0
      ? product.product_images
      : [
          {
            id: 'fallback',
            image_url: `/images/collection-${product.collections?.slug || 'women'}.svg`,
          },
        ];

  const activeImage = images[selectedIdx]?.image_url || images[0].image_url;
  const name = lang === 'ar' ? product.name_ar : product.name_en;
  const secondaryName = lang === 'ar' ? product.name_en : product.name_ar;
  const description = lang === 'ar' ? product.description_ar : product.description_en;
  const secondaryDescription = lang === 'ar' ? product.description_en : product.description_ar;
  const widthInfo = product.width_cm || product.dimensions;
  const fav = isFavorite(product.id);
  const waUrl = buildWhatsAppProductUrl(settings.whatsapp_number, product, lang, undefined, {
    color: selectedColor,
    size: selectedSize,
    quantity,
  });

  const handleClose = () => {
    setSelectedIdx(0);
    setColorOverride(null);
    setSizeOverride(null);
    setQtyOverride(null);
    onClose();
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/products/${product.slug}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      maxWidthClass="max-w-5xl"
      title={name}
      subtitle={getCollectionLabel(product.collections?.slug || 'women', lang)}
    >
      <div className="grid gap-7 lg:grid-cols-12">
        {/* Image Gallery */}
        <div className="space-y-3 lg:col-span-6">
          <div className="aspect-square overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-subtle)]">
            <img src={activeImage} alt={name} className="h-full w-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedIdx(idx)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border transition-all ${
                    selectedIdx === idx
                      ? 'border-[var(--accent)] opacity-100 ring-2 ring-[var(--accent-soft)]'
                      : 'border-[var(--border-glass)] opacity-60 hover:opacity-90'
                  }`}
                >
                  <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Full Product Details */}
        <div className="flex flex-col justify-between space-y-5 lg:col-span-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {product.collections && (
                <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                  {lang === 'ar' ? product.collections.name_ar : product.collections.name_en}
                </span>
              )}
              {product.categories && (
                <span className="rounded-full border border-[var(--border-glass)] bg-[var(--bg-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                  {lang === 'ar' ? product.categories.name_ar : product.categories.name_en}
                </span>
              )}
              {product.is_featured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
                  <Sparkles className="h-3 w-3" />
                  {t.product.featuredBadge}
                </span>
              )}
            </div>

            {secondaryName && secondaryName !== name && (
              <p className="text-xs tracking-wide text-[var(--text-secondary)] opacity-85">
                {secondaryName}
              </p>
            )}

            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-[var(--accent-strong)]">
                {formatPrice(Number(product.price), product.currency || settings.currency, lang)}
              </span>
              {product.previous_price && Number(product.previous_price) > Number(product.price) && (
                <span className="text-sm text-[var(--text-muted)] line-through">
                  {formatPrice(Number(product.previous_price), product.currency || settings.currency, lang)}
                </span>
              )}
            </div>

            {/* Metadata Grid */}
            <div
              className="grid grid-cols-2 gap-3 rounded-2xl border p-4 text-xs"
              style={{ borderColor: 'var(--border-glass)', background: 'var(--bg-subtle)' }}
            >
              <div>
                <span className="block opacity-65">{t.product.availability}</span>
                <span className="mt-0.5 block font-semibold">
                  {isOutOfStock
                    ? lang === 'ar'
                      ? 'غير متوفر (0)'
                      : 'Out of Stock (0)'
                    : lang === 'ar'
                      ? `${t.product.status[product.availability_status]} (${stockCount})`
                      : `${t.product.status[product.availability_status]} (${stockCount})`}
                </span>
              </div>
              <div>
                <span className="block opacity-65">{t.product.sku}</span>
                <span className="mt-0.5 block font-mono font-semibold">
                  {product.sku || product.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div>
                <span className="block opacity-65">{t.product.collection}</span>
                <span className="mt-0.5 block font-semibold">
                  {getCollectionLabel(product.collections?.slug || 'women', lang)}
                </span>
              </div>
              <div>
                <span className="block opacity-65">{t.product.category}</span>
                <span className="mt-0.5 block font-semibold">
                  {product.categories
                    ? lang === 'ar'
                      ? product.categories.name_ar
                      : product.categories.name_en
                    : '-'}
                </span>
              </div>
            </div>

            {/* Variants & Stock-Validated Quantity */}
            <div
              className="space-y-3 rounded-2xl border p-4 text-xs"
              style={{ borderColor: 'var(--border-glass)', background: 'var(--bg-subtle)' }}
            >
              {colors.length > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--text-muted)]">{lang === 'ar' ? 'اللون:' : 'Color:'}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setColorOverride(c);
                          const matchIdx = images.findIndex(
                            (img) =>
                              'color_hex' in img &&
                              typeof img.color_hex === 'string' &&
                              img.color_hex.toLowerCase() === c.toLowerCase()
                          );
                          if (matchIdx >= 0) setSelectedIdx(matchIdx);
                        }}
                        title={c}
                        aria-label={`Color ${c}`}
                        className={`h-5 w-5 rounded-full border transition-transform ${
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
                  <span className="text-[var(--text-muted)]">{lang === 'ar' ? 'المقاس:' : 'Size:'}</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSizeOverride(s)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                          selectedSize === s
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                            : 'border-[var(--border-glass)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {widthInfo && (
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1 text-[var(--text-muted)]">
                    <Ruler className="h-3.5 w-3.5" />
                    {lang === 'ar' ? 'العرض / الأبعاد:' : 'Width / Dimensions:'}
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">{widthInfo}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--text-muted)]">{lang === 'ar' ? 'الكمية:' : 'Quantity:'}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isOutOfStock || quantity <= 1}
                    onClick={() => setQtyOverride(Math.max(1, quantity - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-glass)] transition-colors hover:bg-[var(--bg-surface)] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-7 text-center text-sm font-bold">
                    {isOutOfStock ? 0 : quantity}
                  </span>
                  <button
                    type="button"
                    disabled={isOutOfStock || quantity >= stockCount}
                    onClick={() => setQtyOverride(Math.min(stockCount, quantity + 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-glass)] transition-colors hover:bg-[var(--bg-surface)] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {!isOutOfStock && quantity >= stockCount && (
                <p className="text-end text-[11px] text-amber-300">
                  {lang === 'ar' ? `الحد الأقصى المتاح (${stockCount})` : `Max stock reached (${stockCount})`}
                </p>
              )}
            </div>

            <div className="space-y-2.5">
              <p className="text-sm leading-relaxed text-[var(--text-primary)]">
                {description || secondaryDescription}
              </p>
              {secondaryDescription && secondaryDescription !== description && (
                <p
                  dir={lang === 'ar' ? 'ltr' : 'rtl'}
                  className="rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-subtle)] p-3.5 text-xs leading-relaxed text-[var(--text-secondary)]"
                >
                  {secondaryDescription}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2.5 border-t pt-4" style={{ borderColor: 'var(--border-glass)' }}>
            {isOutOfStock ? (
              <span className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[var(--border-glass)] bg-[var(--disabled-bg)] px-5 py-3.5 text-xs font-semibold text-[var(--disabled-text)]">
                {lang === 'ar' ? 'غير متوفر حالياً' : 'Out of Stock'}
              </span>
            ) : (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="cta-luxury flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-xs font-semibold tracking-wide shadow-lg"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{t.product.orderWhatsApp}</span>
              </a>
            )}

            <div className="grid grid-cols-3 gap-2">
              <a
                href={`tel:${settings.phone_number}`}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-glass)] py-2.5 text-xs font-medium transition-colors hover:bg-[var(--bg-subtle)]"
              >
                <Phone className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>{t.product.callNow}</span>
              </a>

              <button
                type="button"
                onClick={() => toggleFavorite(product.id)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-glass)] py-2.5 text-xs font-medium transition-colors hover:bg-[var(--bg-subtle)]"
              >
                <Heart className={`h-3.5 w-3.5 ${fav ? 'fill-[var(--accent)] text-[var(--accent)]' : ''}`} />
                <span>{lang === 'ar' ? 'المفضلة' : 'Save'}</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-glass)] py-2.5 text-xs font-medium transition-colors hover:bg-[var(--bg-subtle)]"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5 text-[var(--accent)]" />}
                <span>{copied ? (lang === 'ar' ? 'تم النسخ' : 'Copied') : (lang === 'ar' ? 'مشاركة' : 'Share')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
