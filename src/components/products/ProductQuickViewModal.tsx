'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Heart, MessageCircle, Phone } from 'lucide-react';
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
  const description = lang === 'ar' ? product.description_ar : product.description_en;
  const fav = isFavorite(product.id);
  const waUrl = buildWhatsAppProductUrl(settings.whatsapp_number, product, lang);

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      title={name}
      subtitle={getCollectionLabel(product.collections?.slug || 'women', lang)}
    >
      <div className="grid gap-6 sm:grid-cols-12">
        {/* Image Gallery */}
        <div className="space-y-3 sm:col-span-6">
          <div className="aspect-square overflow-hidden rounded-lg bg-[var(--bg-subtle)]">
            <img src={activeImage} alt={name} className="h-full w-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedIdx(idx)}
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border transition-opacity ${
                    selectedIdx === idx ? 'border-[var(--accent)] opacity-100' : 'border-transparent opacity-60'
                  }`}
                >
                  <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col justify-between space-y-5 sm:col-span-6">
          <div className="space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="text-xl font-semibold text-[var(--text-primary)]">
                {formatPrice(Number(product.price), product.currency || settings.currency, lang)}
              </span>
              {product.previous_price && Number(product.previous_price) > Number(product.price) && (
                <span className="text-sm text-[var(--text-muted)] line-through">
                  {formatPrice(Number(product.previous_price), product.currency || settings.currency, lang)}
                </span>
              )}
            </div>

            <span className="inline-block rounded-sm border border-[var(--border-glass)] bg-[var(--bg-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
              {t.product.status[product.availability_status]}
            </span>

            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {description || (lang === 'ar' ? product.description_en : product.description_ar)}
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-luxury flex w-full items-center justify-center gap-2 rounded-md px-5 py-3 text-xs font-semibold tracking-wide"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{t.product.orderWhatsApp}</span>
            </a>

            <div className="grid grid-cols-3 gap-2">
              <a
                href={`tel:${settings.phone_number}`}
                className="flex items-center justify-center gap-1.5 rounded-md border border-[var(--border-glass)] py-2.5 text-xs font-medium hover:bg-[var(--bg-subtle)]"
              >
                <Phone className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>{t.product.callNow}</span>
              </a>

              <button
                type="button"
                onClick={() => toggleFavorite(product.id)}
                className="flex items-center justify-center gap-1.5 rounded-md border border-[var(--border-glass)] py-2.5 text-xs font-medium hover:bg-[var(--bg-subtle)]"
              >
                <Heart className={`h-3.5 w-3.5 ${fav ? 'fill-[#542D3A] text-[#542D3A] dark:fill-[#C4A779] dark:text-[#C4A779]' : ''}`} />
                <span>{lang === 'ar' ? 'المفضلة' : 'Save'}</span>
              </button>

              <Link
                href={`/products/${product.slug}`}
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 rounded-md border border-[var(--border-glass)] py-2.5 text-xs font-medium hover:bg-[var(--bg-subtle)]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>{lang === 'ar' ? 'الصفحة' : 'Full Page'}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
