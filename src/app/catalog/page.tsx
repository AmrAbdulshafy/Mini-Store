import React, { Suspense } from 'react';
import { getActiveCategories, getActiveCollections, getVisibleProducts } from '@/lib/store-data';
import { CatalogClient } from '@/components/catalog/CatalogClient';

export const dynamic = 'force-dynamic';

export default async function CatalogPage() {
  const [products, collections, categories] = await Promise.all([
    getVisibleProducts(),
    getActiveCollections(),
    getActiveCategories(),
  ]);

  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm opacity-70">Loading...</div>}>
      <CatalogClient
        products={products}
        collections={collections}
        categories={categories}
      />
    </Suspense>
  );
}
