import React from 'react';
import { getVisibleProducts } from '@/lib/store-data';
import { FavoritesClient } from '@/components/favorites/FavoritesClient';

export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  const products = await getVisibleProducts();
  return <FavoritesClient allProducts={products} />;
}
