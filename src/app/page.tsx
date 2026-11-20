import React from 'react';
import { getActiveBanners, getActiveCollections, getVisibleProducts } from '@/lib/store-data';
import { HomepageClient } from '@/components/home/HomepageClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [collections, products, banners] = await Promise.all([
    getActiveCollections(),
    getVisibleProducts(),
    getActiveBanners(),
  ]);

  return (
    <HomepageClient
      collections={collections}
      products={products}
      banners={banners}
    />
  );
}
