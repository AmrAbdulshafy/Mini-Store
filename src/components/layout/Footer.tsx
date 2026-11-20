'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, MapPin, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { BrandLogo, EsraaMonogram } from '@/components/brand/BrandLogo';
import { buildWhatsAppGeneralUrl } from '@/lib/whatsapp';

export function Footer() {
  const { lang, settings, t } = useApp();
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const storeName = lang === 'ar' ? settings.store_name_ar : settings.store_name_en;
  const tagline = lang === 'ar' ? settings.tagline_ar : settings.tagline_en;
  const address = lang === 'ar' ? settings.address_ar : settings.address_en;

  const waUrl = buildWhatsAppGeneralUrl(
    settings.whatsapp_number,
    lang === 'ar'
      ? `مرحباً ${settings.store_name_ar}، أود الاستفسار عن منتجاتكم.`
      : `Hello ${settings.store_name_en}, I would like to inquire about your products.`
  );

  return (
    <footer
      className="mt-20 border-t"
      style={{ borderColor: 'var(--border-glass)', background: 'var(--bg-subtle)' }}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-4">
              <BrandLogo lang={lang} />
              <EsraaMonogram className="h-10 w-10 text-[var(--es-burgundy)] opacity-80 dark:text-[var(--es-champagne)]" />
            </div>
            <p className="max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
              {tagline}
            </p>
            <p className="text-xs font-medium text-[var(--accent)]">
              {t.footer.noCheckout}
            </p>
          </div>

          {/* Collections */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider opacity-80">
              {t.footer.collections}
            </h3>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li>
                <Link href="/catalog?collection=women" className="hover:text-[var(--accent)]">
                  {t.collections.women.name}
                </Link>
              </li>
              <li>
                <Link href="/catalog?collection=men" className="hover:text-[var(--accent)]">
                  {t.collections.men.name}
                </Link>
              </li>
              <li>
                <Link href="/catalog?collection=handmade" className="hover:text-[var(--accent)]">
                  {t.collections.handmade.name}
                </Link>
              </li>
              <li>
                <Link href="/favorites" className="hover:text-[var(--accent)]">
                  {t.nav.favorites}
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider opacity-80">
              {t.footer.connect}
            </h3>
            <ul className="space-y-2.5 text-sm text-[var(--text-secondary)]">
              <li>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>{t.contact.whatsapp}</span>
                </a>
              </li>
              <li>
                <a href={`tel:${settings.phone_number}`} className="flex items-center gap-2 hover:text-[var(--accent)]">
                  <Phone className="h-4 w-4" />
                  <span dir="ltr">{settings.phone_number}</span>
                </a>
              </li>
              <li>
                <a href={`mailto:${settings.email}`} className="flex items-center gap-2 hover:text-[var(--accent)]">
                  <Mail className="h-4 w-4" />
                  <span>{settings.email}</span>
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{address}</span>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 text-xs text-[var(--text-secondary)] sm:flex-row"
          style={{ borderColor: 'var(--border-glass)' }}
        >
          <p>
            © {new Date().getFullYear()} {storeName}. {t.footer.rights}.
          </p>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 opacity-70 transition-opacity hover:opacity-100"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{t.nav.admin}</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
