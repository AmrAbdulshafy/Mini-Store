import React from 'react';
import { notFound } from 'next/navigation';
import { getProductBySlug } from '@/lib/store-data';
import { ProductDetailsClient } from '@/components/products/ProductDetailsClient';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return <ProductDetailsClient product={product} />;
}
