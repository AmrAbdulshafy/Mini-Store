'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
  Tag,
} from 'lucide-react';
import type { Collection, CollectionSlug, HomepageBanner, Product } from '@/types/database';
import { useApp } from '@/components/providers/AppProvider';
import { ProductCard } from '@/components/products/ProductCard';
import { buildWhatsAppGeneralUrl } from '@/lib/whatsapp';

export function HomepageClient({
  collections,
  products,
  banners,
}: {
  collections: Collection[];
  products: Product[];
  banners: HomepageBanner[];
}) {
  const { lang, setCollectionTheme, settings, t } = useApp();
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  const heroBanner = banners.find((b) => b.placement === 'hero');
  const promoBanner = banners.find((b) => b.placement === 'promo');

  const featuredProducts = products.filter((p) => p.is_featured).slice(0, 4);
  const newArrivals = products.filter((p) => p.is_new_arrival).slice(0, 4);
  const specialOffers = products.filter((p) => p.is_special_offer || (p.previous_price && p.previous_price > p.price)).slice(0, 4);

  // Quick Contact Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'success' | 'error'>('idle');

  const getOrCreateIdempotencyKey = () => {
    const storageKey = 'esraa_inquiry_idempotency_key';
    if (typeof window !== 'undefined') {
      const existing = window.sessionStorage.getItem(storageKey);
      if (existing && /^[0-9a-f-]{36}$/i.test(existing)) {
        return existing;
      }
      const fresh = window.crypto.randomUUID();
      window.sessionStorage.setItem(storageKey, fresh);
      return fresh;
    }
    return '';
  };

  const rotateIdempotencyKey = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('esraa_inquiry_idempotency_key', window.crypto.randomUUID());
    }
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || submitting) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSubmitState('error');
      return;
    }
    setSubmitting(true);
    setSubmitState('idle');
    try {
      const idempotencyKey = getOrCreateIdempotencyKey();
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          message,
          channel: 'contact_form',
          idempotencyKey,
          website,
        }),
      });
      if (!res.ok) throw new Error('failed');
      rotateIdempotencyKey();
      setSubmitState('success');
      setCustomerName('');
      setCustomerPhone('');
      setMessage('');
    } catch {
      setSubmitState('error');
    } finally {
      setSubmitting(false);
    }
  };

  const waGeneral = buildWhatsAppGeneralUrl(
    settings.whatsapp_number,
    lang === 'ar'
      ? `مرحباً ${settings.store_name_ar}، أود الاستفسار عن المنتجات المتوفرة.`
      : `Hello ${settings.store_name_en}, I would like to inquire about your available products.`
  );

  return (
    <div className="space-y-20 pb-12">
      {/* HERO SECTION */}
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 lg:pt-10">
        <div className="glass-card animate-reveal relative overflow-hidden rounded-3xl p-6 sm:p-10 lg:p-14">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-glass)] bg-[var(--accent-soft)] px-3.5 py-1 text-[11px] font-semibold tracking-[0.2em] text-[var(--accent-strong)] uppercase">
                <Sparkles className="h-3 w-3 text-[var(--champagne)]" />
                {t.hero.badge}
              </span>

              <h1 className="font-display text-gradient-luxury text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
                {heroBanner
                  ? lang === 'ar'
                    ? heroBanner.title_ar
                    : heroBanner.title_en
                  : lang === 'ar'
                    ? settings.store_name_ar
                    : settings.store_name_en}
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-[var(--text-secondary)]">
                {heroBanner
                  ? lang === 'ar'
                    ? heroBanner.subtitle_ar
                    : heroBanner.subtitle_en
                  : lang === 'ar'
                    ? settings.tagline_ar
                    : settings.tagline_en}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href={heroBanner?.cta_link || '/catalog'}
                  className="cta-luxury inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-xs font-semibold tracking-wider uppercase"
                >
                  <span>
                    {heroBanner
                      ? lang === 'ar'
                        ? heroBanner.cta_text_ar || t.hero.explore
                        : heroBanner.cta_text_en || t.hero.explore
                      : t.hero.explore}
                  </span>
                  <ArrowIcon className="h-4 w-4" />
                </Link>

                <a
                  href={waGeneral}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-glass)] bg-[var(--bg-subtle)] px-6 py-3.5 text-xs font-semibold tracking-wider uppercase transition-all hover:-translate-y-0.5 hover:border-[var(--border-strong)]"
                >
                  <MessageCircle className="h-4 w-4 text-[var(--accent)]" />
                  <span>{t.hero.contactUs}</span>
                </a>
              </div>

              <p className="text-xs text-[var(--text-muted)]">
                {t.hero.noCheckoutNote}
              </p>
            </div>

            <div className="lg:col-span-6">
              <div className="animate-float-slow relative aspect-[16/11] overflow-hidden rounded-2xl border border-[var(--border-glass)] shadow-2xl">
                <img
                  src={heroBanner?.image_url || '/images/hero-boutique.png'}
                  alt={lang === 'ar' ? settings.store_name_ar : settings.store_name_en}
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THREE MAIN SHOPPING CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              href: '/catalog?category=women-makeup',
              num: '01',
              titleAr: 'الجمال والمكياج',
              titleEn: 'Beauty & Makeup',
              descAr: 'أحمر شفاه مخملي، إضاءات لؤلؤية، ومستحضرات عناية تبرز إشراقتكِ الطبيعية.',
              descEn: 'Velvet lip elixirs, pearl illuminators, and refined daily beauty essentials.',
            },
            {
              href: '/catalog?category=women-perfumes',
              num: '02',
              titleAr: 'العطور النسائية والرجالية',
              titleEn: 'Perfumes',
              descAr: 'عطور زهرية وشرقية وعود فاخر بتركيبات ثابتة تناسب كل مناسبة.',
              descEn: 'Signature floral, oud, and amber fragrances crafted for lasting presence.',
            },
            {
              href: '/catalog?collection=handmade',
              num: '03',
              titleAr: 'المجموعة اليدوية',
              titleEn: 'Handmade Collection',
              descAr: 'حقائب كتان مطرزة، أوشحة حريرية، وقطع خياطة وتطريز مصنوعة يدوياً.',
              descEn: 'Hand-embroidered linens, rolled silk scarves, and artisanal textile pieces.',
            },
          ].map((pillar) => (
            <Link
              key={pillar.num}
              href={pillar.href}
              className="glass-card group flex flex-col justify-between rounded-2xl p-6 transition-colors duration-200 hover:bg-[var(--bg-subtle)]/50"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-display text-xs font-semibold tracking-[0.2em] text-[var(--champagne)]">
                    {pillar.num}
                  </span>
                </div>
                <h2 className="font-display text-xl font-bold">
                  {lang === 'ar' ? pillar.titleAr : pillar.titleEn}
                </h2>
                <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  {lang === 'ar' ? pillar.descAr : pillar.descEn}
                </p>
              </div>
              <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
                <span>{t.collections.exploreCollection}</span>
                <ArrowIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* THREE COLLECTION IDENTITIES */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">{t.collections.title}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{t.collections.subtitle}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {collections.map((col) => {
            const name = lang === 'ar' ? col.name_ar : col.name_en;
            const desc = lang === 'ar' ? col.description_ar : col.description_en;
            const slug = col.slug as CollectionSlug;

            return (
              <Link
                key={col.id}
                href={`/catalog?collection=${col.slug}`}
                onMouseEnter={() => setCollectionTheme(slug)}
                onClick={() => setCollectionTheme(slug)}
                className="glass-card group relative overflow-hidden rounded-lg p-5 transition-colors duration-200 hover:border-[var(--border-strong)]"
              >
                <div className="aspect-[16/10] overflow-hidden rounded-md bg-[var(--bg-subtle)]">
                  <img
                    src={col.hero_image_url || `/images/collection-${col.slug}.svg`}
                    alt={name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl font-semibold">{name}</h3>
                  </div>
                  <p className="line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                    {desc}
                  </p>
                  <span className="inline-flex items-center gap-1.5 pt-1 text-xs font-semibold text-[var(--accent)]">
                    <span>{t.collections.exploreCollection}</span>
                    <ArrowIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      {featuredProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">{t.sections.featured}</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{t.sections.featuredSub}</p>
            </div>
            <Link
              href="/catalog?sort=featured"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] hover:underline"
            >
              <span>{t.sections.viewAll}</span>
              <ArrowIcon className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* PROMOTIONAL CAMPAIGN AD BANNER */}
      {promoBanner && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="glass-card card-modern editorial-sheen animate-reveal group overflow-hidden rounded-2xl bg-[var(--bg-subtle)]">
            <div className="grid items-center gap-0 lg:grid-cols-12">
              <div className="space-y-4 p-7 sm:p-10 lg:col-span-7 lg:p-12">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-[var(--accent)] uppercase">
                    <Tag className="h-3.5 w-3.5 text-[var(--champagne)]" />
                    {t.product.offerBadge}
                  </span>
                  <span className="h-px flex-1 max-w-16 bg-[var(--champagne)]/50" />
                </div>

                <h2 className="font-display text-2xl font-semibold leading-snug sm:text-3xl lg:text-4xl">
                  {lang === 'ar' ? promoBanner.title_ar : promoBanner.title_en}
                </h2>

                <p className="max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
                  {lang === 'ar' ? promoBanner.subtitle_ar : promoBanner.subtitle_en}
                </p>

                <div className="pt-2">
                  <Link
                    href={promoBanner.cta_link || '/catalog?offer=true'}
                    className="cta-luxury inline-flex items-center gap-2 rounded-md px-7 py-3.5 text-xs font-semibold tracking-wider uppercase"
                  >
                    <span>
                      {lang === 'ar'
                        ? promoBanner.cta_text_ar || t.sections.viewAll
                        : promoBanner.cta_text_en || t.sections.viewAll}
                    </span>
                    <ArrowIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                  </Link>
                </div>
              </div>

              <div className="relative aspect-[16/10] h-full overflow-hidden lg:col-span-5 lg:aspect-auto lg:min-h-[300px]">
                <img
                  src={promoBanner.image_url || '/images/hero-boutique.png'}
                  alt={lang === 'ar' ? promoBanner.title_ar : promoBanner.title_en}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#191619]/35 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* NEW ARRIVALS */}
      {newArrivals.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">{t.sections.newArrivals}</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{t.sections.newArrivalsSub}</p>
            </div>
            <Link
              href="/catalog?sort=newest"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] hover:underline"
            >
              <span>{t.sections.viewAll}</span>
              <ArrowIcon className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {newArrivals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* SPECIAL OFFERS */}
      {specialOffers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">{t.sections.specialOffers}</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{t.sections.specialOffersSub}</p>
            </div>
            <Link
              href="/catalog?offer=true"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] hover:underline"
            >
              <span>{t.sections.viewAll}</span>
              <ArrowIcon className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {specialOffers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* BRAND INTRODUCTION & CONTACT SECTION */}
      <section id="contact" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Brand Intro + Direct Channels */}
          <div className="glass-card flex flex-col justify-between rounded-lg p-7 sm:p-9 lg:col-span-6">
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                {t.sections.aboutTitle}
              </h2>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
                {t.sections.aboutBody}
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <a
                href={waGeneral}
                target="_blank"
                rel="noopener noreferrer"
                className="cta-luxury flex items-center justify-center gap-2.5 rounded-md px-4 py-3.5 text-xs font-semibold tracking-wider uppercase"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{t.contact.whatsapp}</span>
              </a>
              <a
                href={`tel:${settings.phone_number}`}
                className="flex items-center justify-center gap-2.5 rounded-md border border-[var(--border-glass)] px-4 py-3.5 text-xs font-semibold transition-colors hover:bg-[var(--bg-subtle)]"
              >
                <Phone className="h-4 w-4 text-[var(--accent)]" />
                <span dir="ltr">{settings.phone_number}</span>
              </a>
              <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] pt-2">
                <Mail className="h-4 w-4 text-[var(--accent)]" />
                <span>{settings.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] pt-2">
                <MapPin className="h-4 w-4 text-[var(--accent)]" />
                <span>{lang === 'ar' ? settings.address_ar : settings.address_en}</span>
              </div>
            </div>
          </div>

          {/* Quick Inquiry Form */}
          <div className="glass-card rounded-lg p-7 sm:p-9 lg:col-span-6">
            <h2 className="font-display text-2xl font-bold">{t.contact.formTitle}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{t.sections.contactSub}</p>

            <form onSubmit={handleInquirySubmit} className="mt-6 space-y-4">
              <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t.contact.name}
                  maxLength={80}
                  className="rounded-2xl border bg-transparent px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
                  style={{ borderColor: 'var(--border-glass)' }}
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder={t.contact.phoneInput}
                  maxLength={40}
                  className="rounded-2xl border bg-transparent px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
                  style={{ borderColor: 'var(--border-glass)' }}
                />
              </div>
              <textarea
                rows={3}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.contact.message}
                maxLength={1500}
                className="w-full rounded-2xl border bg-transparent px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
                style={{ borderColor: 'var(--border-glass)' }}
              />

              {submitState === 'success' && (
                <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/15 px-4 py-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{t.contact.success}</span>
                </div>
              )}
              {submitState === 'error' && (
                <div className="rounded-2xl bg-rose-500/15 px-4 py-3 text-xs font-medium text-rose-700 dark:text-rose-300">
                  {t.contact.error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !message.trim()}
                className="cta-luxury inline-flex items-center gap-2 rounded-md px-7 py-3 text-xs font-semibold tracking-wider uppercase"
              >
                <Send className="h-4 w-4" />
                <span>{submitting ? t.contact.sending : t.contact.submit}</span>
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
