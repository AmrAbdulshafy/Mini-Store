'use client';

import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, Tag, X } from 'lucide-react';
import type { Category, Collection, CollectionSlug, Product } from '@/types/database';
import { useApp } from '@/components/providers/AppProvider';
import { ProductCard } from '@/components/products/ProductCard';

type SortOption = 'featured' | 'newest' | 'price_asc' | 'price_desc';

export function CatalogClient({
  products,
  collections,
  categories,
}: {
  products: Product[];
  collections: Collection[];
  categories: Category[];
}) {
  const { lang, setCollectionTheme, t } = useApp();
  const searchParams = useSearchParams();

  const initialCollection = searchParams.get('collection') || 'all';
  const initialCategory = searchParams.get('category') || 'all';
  const initialOffer = searchParams.get('offer') === 'true';
  const initialSort = (searchParams.get('sort') as SortOption) || 'featured';

  const [selectedCollection, setSelectedCollection] = useState<string>(initialCollection);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [offerOnly, setOfferOnly] = useState<boolean>(initialOffer);
  const [search, setSearch] = useState<string>('');
  const [sort, setSort] = useState<SortOption>(initialSort);

  const availableCategories = useMemo(() => {
    if (selectedCollection === 'all') return categories;
    const col = collections.find((c) => c.slug === selectedCollection);
    if (!col) return categories;
    return categories.filter((cat) => cat.collection_id === col.id);
  }, [categories, collections, selectedCollection]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) => {
      if (selectedCollection !== 'all' && p.collections?.slug !== selectedCollection) {
        return false;
      }
      if (selectedCategory !== 'all' && p.categories?.slug !== selectedCategory) {
        return false;
      }
      if (offerOnly && !p.is_special_offer && !(p.previous_price && p.previous_price > p.price)) {
        return false;
      }
      if (q) {
        const hay = `${p.name_ar} ${p.name_en} ${p.description_ar} ${p.description_en} ${p.sku || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sort === 'featured') {
        if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sort === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sort === 'price_asc') return Number(a.price) - Number(b.price);
      return Number(b.price) - Number(a.price);
    });
  }, [products, selectedCollection, selectedCategory, offerOnly, search, sort]);

  const handleCollectionSelect = (slug: string) => {
    setSelectedCollection(slug);
    setSelectedCategory('all');
    if (slug === 'women' || slug === 'men' || slug === 'handmade') {
      setCollectionTheme(slug as CollectionSlug);
    }
  };

  const resetFilters = () => {
    setSelectedCollection('all');
    setSelectedCategory('all');
    setOfferOnly(false);
    setSearch('');
    setSort('featured');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 space-y-2">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{t.catalog.title}</h1>
        <p className="text-sm text-[var(--text-secondary)]">{t.catalog.subtitle}</p>
      </div>

      {/* Filter Bar */}
      <div className="glass-card mb-8 space-y-4 rounded-lg p-4 sm:p-6">
        <div className="grid gap-3 md:grid-cols-12">
          {/* Search */}
          <div className="relative md:col-span-5">
            <Search className="pointer-events-none absolute top-1/2 start-3.5 h-4 w-4 -translate-y-1/2 opacity-55" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.catalog.searchPlaceholder}
              className="w-full rounded-2xl border bg-transparent py-2.5 pe-9 ps-10 text-sm outline-none focus:border-[var(--accent)]"
              style={{ borderColor: 'var(--border-glass)' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute top-1/2 end-3 -translate-y-1/2 opacity-60 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Select */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-2xl border bg-[var(--bg-page)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
              style={{ borderColor: 'var(--border-glass)' }}
            >
              <option value="all">{t.catalog.allCategories}</option>
              {availableCategories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {lang === 'ar' ? cat.name_ar : cat.name_en}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Select */}
          <div className="md:col-span-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="w-full rounded-2xl border bg-[var(--bg-page)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
              style={{ borderColor: 'var(--border-glass)' }}
            >
              <option value="featured">{t.catalog.sortFeatured}</option>
              <option value="newest">{t.catalog.sortNewest}</option>
              <option value="price_asc">{t.catalog.sortPriceAsc}</option>
              <option value="price_desc">{t.catalog.sortPriceDesc}</option>
            </select>
          </div>

          {/* Special Offers Toggle */}
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() => setOfferOnly((prev) => !prev)}
              className={`flex w-full items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
                offerOnly
                  ? 'border-transparent bg-rose-600 text-white'
                  : 'hover:bg-[var(--accent-soft)]'
              }`}
              style={!offerOnly ? { borderColor: 'var(--border-glass)' } : undefined}
            >
              <Tag className="h-3.5 w-3.5" />
              <span>{t.catalog.offersOnly}</span>
            </button>
          </div>
        </div>

        {/* Collection Pills + Count */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleCollectionSelect('all')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                selectedCollection === 'all'
                  ? 'text-white shadow-sm'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              style={selectedCollection === 'all' ? { backgroundColor: 'var(--accent)' } : undefined}
            >
              {t.catalog.allCollections}
            </button>
            {collections.map((col) => {
              const active = selectedCollection === col.slug;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => handleCollectionSelect(col.slug)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? 'text-white shadow-sm'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  style={active ? { backgroundColor: 'var(--accent)' } : undefined}
                >
                  {lang === 'ar' ? col.name_ar : col.name_en}
                </button>
              );
            })}
          </div>

          <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {filteredProducts.length} {t.catalog.resultsCount}
          </span>
        </div>
      </div>

      {/* Product Grid or Empty State */}
      {filteredProducts.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <h2 className="font-display text-2xl font-bold">{t.catalog.emptyTitle}</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{t.catalog.emptyDesc}</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-6 rounded-full px-6 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {t.catalog.resetFilters}
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
