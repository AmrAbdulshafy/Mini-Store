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
          <div className="aspect-square overflow-hidden rounded-3xl bg-[var(--bg-subtle)]">
            <img src={activeImage} alt={name} className="h-full w-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedIdx(idx)}
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                    selectedIdx === idx ? 'border-[var(--es-fuchsia)] scale-105' : 'border-transparent opacity-65'
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
              <span className="text-2xl font-bold text-[var(--es-fuchsia)]">
                {formatPrice(Number(product.price), product.currency || settings.currency, lang)}
              </span>
              {product.previous_price && Number(product.previous_price) > Number(product.price) && (
                <span className="text-sm line-through opacity-55">
                  {formatPrice(Number(product.previous_price), product.currency || settings.currency, lang)}
                </span>
              )}
            </div>

            <span className="inline-block rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
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
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white shadow-md transition-colors hover:bg-emerald-700"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{t.product.orderWhatsApp}</span>
            </a>

            <div className="grid grid-cols-3 gap-2">
              <a
                href={`tel:${settings.phone_number}`}
                className="flex items-center justify-center gap-1.5 rounded-2xl border py-2.5 text-xs font-semibold hover:bg-[var(--accent-soft)]"
                style={{ borderColor: 'var(--border-glass)' }}
              >
                <Phone className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>{t.product.callNow}</span>
              </a>

              <button
                type="button"
                onClick={() => toggleFavorite(product.id)}
                className={`flex items-center justify-center gap-1.5 rounded-2xl border py-2.5 text-xs font-semibold ${
                  fav ? 'bg-rose-500/15 text-rose-500' : 'hover:bg-[var(--accent-soft)]'
                }`}
                style={{ borderColor: 'var(--border-glass)' }}
              >
                <Heart className={`h-3.5 w-3.5 ${fav ? 'fill-rose-500' : ''}`} />
                <span>{lang === 'ar' ? 'المفضلة' : 'Save'}</span>
              </button>

              <Link
                href={`/products/${product.slug}`}
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 rounded-2xl border py-2.5 text-xs font-semibold hover:bg-[var(--accent-soft)]"
                style={{ borderColor: 'var(--border-glass)' }}
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
