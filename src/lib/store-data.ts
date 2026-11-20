import { createClient } from '@/lib/supabase/server';
import type { Category, Collection, HomepageBanner, Product, StoreSettings } from '@/types/database';

const FALLBACK_SETTINGS: StoreSettings = {
  id: 1,
  store_name_ar: 'إسراء سيكريت',
  store_name_en: 'Esraa Secret',
  tagline_ar: 'أكثر من مجرد متجر... إنه سر الجمال.',
  tagline_en: "More Than a Store… It's a Secret of Beauty.",
  whatsapp_number: '201000000000',
  phone_number: '+20 100 000 0000',
  email: 'hello@esraasecret.com',
  address_ar: 'الزمالك، القاهرة، مصر',
  address_en: 'Zamalek, Cairo, Egypt',
  instagram_url: null,
  facebook_url: null,
  tiktok_url: null,
  default_language: 'ar',
  default_theme: 'light',
  default_collection_theme: 'women',
  currency: 'EGP',
  enable_guest_chat: true,
  updated_at: new Date().toISOString(),
};

export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) return FALLBACK_SETTINGS;
    return data as StoreSettings;
  } catch {
    return FALLBACK_SETTINGS;
  }
}

export async function getActiveCollections(): Promise<Collection[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('collections')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return (data || []) as Collection[];
}

export async function getActiveCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return (data || []) as Category[];
}

export async function getVisibleProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select(`
      *,
      product_images(*),
      categories(*),
      collections(*)
    `)
    .eq('is_visible', true)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  return ((data || []) as Product[]).map((p) => ({
    ...p,
    product_images: (p.product_images || []).sort((a, b) => a.sort_order - b.sort_order),
  }));
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_images(*),
      categories(*),
      collections(*)
    `)
    .eq('slug', slug)
    .eq('is_visible', true)
    .eq('is_archived', false)
    .maybeSingle();

  if (error || !data) return null;
  const prod = data as Product;
  prod.product_images = (prod.product_images || []).sort((a, b) => a.sort_order - b.sort_order);
  return prod;
}

export async function getActiveBanners(): Promise<HomepageBanner[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('homepage_banners')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return (data || []) as HomepageBanner[];
}
