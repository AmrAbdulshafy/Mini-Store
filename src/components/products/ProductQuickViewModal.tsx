'use client';

import React, { useState } from 'react';
import { Check, Heart, MessageCircle, Phone, Share2, Sparkles } from 'lucide-react';
import type { Product } from '@/types/database';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/components/providers/AppProvider';
import { formatPrice, getCollectionLabel } from '@/lib/i18n';
import { buildWhatsAppProductUrl } from '@/lib/whatsapp';

export function ProductQuickViewModal({
  product,
  open,
  onClose,
}: {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}) {
  const { lang, isFavorite, toggleFavorite, settings, t } = useApp();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copied, setCopied] = useState(false);

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
  const fav = isFavorite(product.id);
  const waUrl = buildWhatsAppProductUrl(settings.whatsapp_number, product, lang);

  const handleClose = () => {
    setSelectedIdx(0);
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
                  {t.product.status[product.availability_status]}
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
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-luxury flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-xs font-semibold tracking-wide shadow-lg"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{t.product.orderWhatsApp}</span>
            </a>

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
