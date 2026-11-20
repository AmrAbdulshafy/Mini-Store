import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/supabase/admin-auth';
import { createClient } from '@/lib/supabase/server';
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient';
import type {
  AdminUser,
  Category,
  Collection,
  Conversation,
  HomepageBanner,
  Inquiry,
  Order,
  Product,
  StoreSettings,
} from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect('/admin/login');
  }

  const supabase = await createClient();

  const [
    { data: products },
    { data: categories },
    { data: collections },
    { data: inquiries },
    { data: conversations },
    { data: banners },
    { data: settings },
    { data: adminUsers },
    { data: orders },
  ] = await Promise.all([
    supabase
      .from('products')
      .select('*, product_images(*), categories(*), collections(*)')
      .order('created_at', { ascending: false }),
    supabase.from('categories').select('*').order('sort_order', { ascending: true }),
    supabase.from('collections').select('*').order('sort_order', { ascending: true }),
    supabase
      .from('inquiries')
      .select('*, products(id, name_ar, name_en, slug)')
      .order('created_at', { ascending: false }),
    supabase.from('conversations').select('*').order('last_message_at', { ascending: false }),
    supabase.from('homepage_banners').select('*').order('sort_order', { ascending: true }),
    supabase.from('store_settings').select('*').eq('id', 1).single(),
    supabase.from('admin_users').select('*').order('created_at', { ascending: true }),
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false }),
  ]);

  return (
    <AdminDashboardClient
      currentAdmin={admin}
      initialProducts={(products || []) as Product[]}
      initialCategories={(categories || []) as Category[]}
      initialCollections={(collections || []) as Collection[]}
      initialInquiries={(inquiries || []) as Inquiry[]}
      initialConversations={(conversations || []) as Conversation[]}
      initialBanners={(banners || []) as HomepageBanner[]}
      initialSettings={settings as StoreSettings}
      initialAdminUsers={(adminUsers || []) as AdminUser[]}
      initialOrders={(orders || []) as Order[]}
    />
  );
}
