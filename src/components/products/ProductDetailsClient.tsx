'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  MessageCircle,
  Phone,
  Share2,
  Sparkles,
} from 'lucide-react';
import type { CollectionSlug, Product } from '@/types/database';
import { useApp } from '@/components/providers/AppProvider';
import { formatPrice, getCollectionLabel } from '@/lib/i18n';
import { buildWhatsAppProductUrl } from '@/lib/whatsapp';
import { Modal } from '@/components/ui/Modal';

export function ProductDetailsClient({ product }: { product: Product }) {
  const { lang, isFavorite, toggleFavorite, setCollectionTheme, settings, t } = useApp();
  const images =
    product.product_images && product.product_images.length > 0
      ? product.product_images
      : [
          {
            id: 'fallback',
            product_id: product.id,
            image_url: `/images/collection-${product.collections?.slug || 'women'}.svg`,
            storage_path: null,
            alt_ar: product.name_ar,
            alt_en: product.name_en,
            is_primary: true,
            sort_order: 0,
            created_at: product.created_at,
          },
        ];

  const [activeImage, setActiveImage] = useState(images[0].image_url);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const slug = product.collections?.slug;
    if (slug === 'women' || slug === 'men' || slug === 'handmade') {
      setCollectionTheme(slug as CollectionSlug);
    }
  }, [product.collections?.slug, setCollectionTheme]);

  const fav = isFavorite(product.id);
  const name = lang === 'ar' ? product.name_ar : product.name_en;
  const secondaryName = lang === 'ar' ? product.name_en : product.name_ar;
  const description = lang === 'ar' ? product.description_ar : product.description_en;
  const secondaryDescription = lang === 'ar' ? product.description_en : product.description_ar;
  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;

  const waUrl = buildWhatsAppProductUrl(settings.whatsapp_number, product, lang);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const discountPct =
    product.previous_price && product.previous_price > product.price
      ? Math.round(((product.previous_price - product.price) / product.previous_price) * 100)
      : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/catalog"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent)]"
      >
        <BackArrow className="h-4 w-4" />
        <span>{t.product.backToCatalog}</span>
      </Link>

      <div className="glass-card grid gap-8 rounded-lg p-5 sm:p-8 lg:grid-cols-12 lg:p-10">
        {/* Image Gallery */}
        <div className="space-y-4 lg:col-span-6">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="relative block w-full aspect-square overflow-hidden rounded-lg bg-[var(--bg-subtle)] cursor-zoom-in group"
          >
            <img src={activeImage} alt={name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            {discountPct && (
              <span className="absolute top-4 start-4 rounded-sm bg-[#542D3A] px-3 py-1 text-xs font-medium text-[#F5F1EC]">
                -{discountPct}%
              </span>
            )}
            {product.is_demo && (
              <span className="absolute bottom-4 start-4 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur-md">
                {t.product.demoBadge}
              </span>
            )}
          </button>

          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {images.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImage(img.image_url)}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition-all ${
                    activeImage === img.image_url
                      ? 'border-[var(--accent)] scale-105'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img.image_url} alt={name} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col justify-between space-y-6 lg:col-span-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {product.collections && (
                <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                  {lang === 'ar'
                    ? product.collections.name_ar
                    : product.collections.name_en}
                </span>
              )}
              {product.categories && (
                <span className="rounded-full bg-[var(--bg-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                  {lang === 'ar' ? product.categories.name_ar : product.categories.name_en}
                </span>
              )}
              {product.is_featured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  <Sparkles className="h-3 w-3" />
                  {t.product.featuredBadge}
                </span>
              )}
            </div>

            <div>
              <h1 className="font-display text-3xl font-bold sm:text-4xl">{name}</h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)] opacity-80">{secondaryName}</p>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-[var(--accent-strong)]">
                {formatPrice(Number(product.price), product.currency || settings.currency, lang)}
              </span>
              {product.previous_price && Number(product.previous_price) > Number(product.price) && (
                <span className="text-lg line-through opacity-55">
                  {formatPrice(Number(product.previous_price), product.currency || settings.currency, lang)}
                </span>
              )}
            </div>

            {/* Metadata grid */}
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

            {/* Bilingual Descriptions */}
            <div className="space-y-3 pt-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider opacity-75">
                {t.product.description}
              </h2>
              <p className="text-sm leading-relaxed text-[var(--text-primary)]">{description}</p>
              {secondaryDescription && (
                <p
                  dir={lang === 'ar' ? 'ltr' : 'rtl'}
                  className="rounded-2xl bg-[var(--bg-subtle)] p-3.5 text-xs leading-relaxed text-[var(--text-secondary)]"
                >
                  {secondaryDescription}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--border-glass)' }}>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-luxury flex w-full items-center justify-center gap-2.5 rounded-md px-6 py-3.5 text-sm font-semibold tracking-wide"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{t.product.orderWhatsApp}</span>
            </a>

            <div className="grid grid-cols-3 gap-2.5">
              <a
                href={`tel:${settings.phone_number}`}
                className="flex items-center justify-center gap-2 rounded-md border border-[var(--border-glass)] py-3 text-xs font-medium transition-colors hover:bg-[var(--bg-subtle)]"
              >
                <Phone className="h-4 w-4 text-[var(--accent)]" />
                <span>{t.product.callNow}</span>
              </a>

              <button
                type="button"
                onClick={() => toggleFavorite(product.id)}
                className="flex items-center justify-center gap-2 rounded-md border border-[var(--border-glass)] py-3 text-xs font-medium transition-colors hover:bg-[var(--bg-subtle)]"
              >
                <Heart className={`h-4 w-4 ${fav ? 'fill-[#542D3A] text-[#542D3A] dark:fill-[#C4A779] dark:text-[#C4A779]' : ''}`} />
                <span className="truncate">
                  {fav ? t.product.removeFromFavorites : t.product.addToFavorites}
                </span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center justify-center gap-2 rounded-md border border-[var(--border-glass)] py-3 text-xs font-medium transition-colors hover:bg-[var(--bg-subtle)]"
              >
                {copied ? <Check className="h-4 w-4 text-[var(--status-success)]" /> : <Share2 className="h-4 w-4" />}
                <span>{copied ? t.product.copied : t.product.share}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal open={lightboxOpen} onClose={() => setLightboxOpen(false)} maxWidthClass="max-w-3xl" title={name}>
        <div className="overflow-hidden rounded-2xl bg-[var(--bg-subtle)]">
          <img src={activeImage} alt={name} className="max-h-[75vh] w-full object-contain" />
        </div>
      </Modal>
    </div>
  );
}
