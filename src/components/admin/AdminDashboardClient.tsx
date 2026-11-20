'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ExternalLink,
  FolderTree,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  Layers,
  LogOut,
  MessageSquare,
  Package,
  Palette,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/components/providers/AppProvider';
import { EsraaEmblem } from '@/components/brand/BrandLogo';
import { AdminProductsPanel } from '@/components/admin/AdminProductsPanel';
import { AdminChatInbox } from '@/components/admin/AdminChatInbox';
import { AdminMediaPanel } from '@/components/admin/AdminMediaPanel';
import type {
  AdminUser,
  Category,
  Collection,
  CollectionSlug,
  Conversation,
  HomepageBanner,
  Inquiry,
  Language,
  Product,
  StoreSettings,
  ThemeMode,
} from '@/types/database';

type Section =
  | 'overview'
  | 'products'
  | 'categories'
  | 'collections'
  | 'inquiries'
  | 'chat'
  | 'media'
  | 'homepage'
  | 'appearance'
  | 'settings'
  | 'users';

export function AdminDashboardClient({
  currentAdmin,
  initialProducts,
  initialCategories,
  initialCollections,
  initialInquiries,
  initialConversations,
  initialBanners,
  initialSettings,
  initialAdminUsers,
}: {
  currentAdmin: AdminUser;
  initialProducts: Product[];
  initialCategories: Category[];
  initialCollections: Collection[];
  initialInquiries: Inquiry[];
  initialConversations: Conversation[];
  initialBanners: HomepageBanner[];
  initialSettings: StoreSettings;
  initialAdminUsers: AdminUser[];
}) {
  const router = useRouter();
  const { lang, toggleLang, theme, toggleTheme } = useApp();

  const [section, setSection] = useState<Section>('overview');
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [collections, setCollections] = useState(initialCollections);
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [conversations, setConversations] = useState(initialConversations);
  const [banners, setBanners] = useState(initialBanners);
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(initialSettings);
  const [adminUsers, setAdminUsers] = useState(initialAdminUsers);
  const [toast, setToast] = useState<{ msg: string; isError?: boolean } | null>(null);

  // Category quick form
  const [catForm, setCatForm] = useState({ name_ar: '', name_en: '', slug: '', collection_id: collections[0]?.id || '' });
  // Banner quick form
  const [bannerForm, setBannerForm] = useState({
    placement: 'hero' as 'hero' | 'promo' | 'offer',
    title_ar: '',
    title_en: '',
    subtitle_ar: '',
    subtitle_en: '',
    cta_text_ar: 'تصفح الآن',
    cta_text_en: 'Explore Now',
    cta_link: '/catalog',
    image_url: '/images/hero-boutique.png',
  });

  const notify = (msg: string, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3500);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  const saveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase
      .from('store_settings')
      .update({
        store_name_ar: settingsForm.store_name_ar,
        store_name_en: settingsForm.store_name_en,
        tagline_ar: settingsForm.tagline_ar,
        tagline_en: settingsForm.tagline_en,
        whatsapp_number: settingsForm.whatsapp_number,
        phone_number: settingsForm.phone_number,
        email: settingsForm.email,
        address_ar: settingsForm.address_ar,
        address_en: settingsForm.address_en,
        instagram_url: settingsForm.instagram_url,
        facebook_url: settingsForm.facebook_url,
        tiktok_url: settingsForm.tiktok_url,
        default_language: settingsForm.default_language,
        default_theme: settingsForm.default_theme,
        default_collection_theme: settingsForm.default_collection_theme,
        currency: settingsForm.currency,
        enable_guest_chat: settingsForm.enable_guest_chat,
      })
      .eq('id', 1);

    if (error) {
      notify(error.message, true);
      return;
    }
    notify(lang === 'ar' ? 'تم حفظ الإعدادات' : 'Settings saved');
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    const slug =
      catForm.slug.trim() ||
      catForm.name_en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
      `cat-${Date.now()}`;
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name_ar: catForm.name_ar.trim(),
        name_en: catForm.name_en.trim(),
        slug,
        collection_id: catForm.collection_id || null,
        is_active: true,
      })
      .select('*')
      .single();
    if (error || !data) {
      notify(error?.message || 'Failed', true);
      return;
    }
    setCategories((prev) => [...prev, data as Category]);
    setCatForm({ name_ar: '', name_en: '', slug: '', collection_id: collections[0]?.id || '' });
    notify(lang === 'ar' ? 'تمت إضافة الفئة' : 'Category added');
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'حذف هذه الفئة؟' : 'Delete this category?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      notify(error.message, true);
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdateCollection = async (col: Collection) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('collections')
      .update({
        name_ar: col.name_ar,
        name_en: col.name_en,
        description_ar: col.description_ar,
        description_en: col.description_en,
        is_active: col.is_active,
      })
      .eq('id', col.id);
    if (error) {
      notify(error.message, true);
      return;
    }
    notify(lang === 'ar' ? 'تم تحديث التشكيلة' : 'Collection updated');
  };

  const handleUpdateInquiryStatus = async (id: string, status: Inquiry['status']) => {
    const supabase = createClient();
    const { error } = await supabase.from('inquiries').update({ status }).eq('id', id);
    if (error) {
      notify(error.message, true);
      return;
    }
    setInquiries((prev) => prev.map((inq) => (inq.id === id ? { ...inq, status } : inq)));
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    const { data, error } = await supabase
      .from('homepage_banners')
      .insert({ ...bannerForm, is_active: true })
      .select('*')
      .single();
    if (error || !data) {
      notify(error?.message || 'Failed', true);
      return;
    }
    setBanners((prev) => [...prev, data as HomepageBanner]);
    setBannerForm({ ...bannerForm, title_ar: '', title_en: '', subtitle_ar: '', subtitle_en: '' });
    notify(lang === 'ar' ? 'تمت إضافة البانر' : 'Banner added');
  };

  const handleToggleBanner = async (b: HomepageBanner) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('homepage_banners')
      .update({ is_active: !b.is_active })
      .eq('id', b.id);
    if (!error) {
      setBanners((prev) => prev.map((x) => (x.id === b.id ? { ...x, is_active: !b.is_active } : x)));
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'حذف هذا البانر؟' : 'Delete banner?')) return;
    const supabase = createClient();
    await supabase.from('homepage_banners').delete().eq('id', id);
    setBanners((prev) => prev.filter((x) => x.id !== id));
  };

  const unreadChats = conversations.reduce((sum, c) => sum + (c.unread_by_admin || 0), 0);
  const newInquiries = inquiries.filter((i) => i.status === 'new').length;

  const navItems: { id: Section; labelAr: string; labelEn: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', labelAr: 'نظرة عامة', labelEn: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'products', labelAr: 'المنتجات', labelEn: 'Products', icon: <Package className="h-4 w-4" />, badge: products.length },
    { id: 'categories', labelAr: 'الفئات', labelEn: 'Categories', icon: <FolderTree className="h-4 w-4" /> },
    { id: 'collections', labelAr: 'التشكيلات', labelEn: 'Collections', icon: <Layers className="h-4 w-4" /> },
    { id: 'inquiries', labelAr: 'الاستفسارات', labelEn: 'Orders / Inquiries', icon: <Inbox className="h-4 w-4" />, badge: newInquiries || undefined },
    { id: 'chat', labelAr: 'محادثات العملاء', labelEn: 'Customer Chat', icon: <MessageSquare className="h-4 w-4" />, badge: unreadChats || undefined },
    { id: 'media', labelAr: 'الوسائط', labelEn: 'Media', icon: <ImageIcon className="h-4 w-4" /> },
    { id: 'homepage', labelAr: 'محتوى الرئيسية', labelEn: 'Homepage Content', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'appearance', labelAr: 'المظهر', labelEn: 'Appearance', icon: <Palette className="h-4 w-4" /> },
    { id: 'settings', labelAr: 'إعدادات المتجر', labelEn: 'Store Settings', icon: <Settings className="h-4 w-4" /> },
    { id: 'users', labelAr: 'المسؤولون', labelEn: 'Admin Users', icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen">
      {/* Top Bar */}
      <header className="glass-nav sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <EsraaEmblem className="h-8 w-8 shrink-0" />
            <span className="font-display text-lg font-bold">
              {lang === 'ar' ? 'لوحة تحكم إسراء سيكريت' : 'Esraa Secret Admin'}
            </span>
            <span className="hidden rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent-strong)] sm:inline">
              {currentAdmin.email}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-[var(--accent-soft)]"
              style={{ borderColor: 'var(--border-glass)' }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{lang === 'ar' ? 'عرض المتجر' : 'Storefront'}</span>
            </Link>
            <button
              type="button"
              onClick={toggleLang}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold"
              style={{ borderColor: 'var(--border-glass)' }}
            >
              {lang === 'ar' ? 'EN' : 'عربي'}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold"
              style={{ borderColor: 'var(--border-glass)' }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{lang === 'ar' ? 'خروج' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 end-5 z-50 rounded-2xl px-5 py-3 text-xs font-semibold text-white shadow-xl ${
            toast.isError ? 'bg-rose-600' : 'bg-emerald-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12">
        {/* Sidebar */}
        <aside className="glass-card h-fit rounded-3xl p-3 lg:col-span-3">
          <nav className="flex gap-1 overflow-x-auto lg:flex-col">
            {navItems.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`flex shrink-0 items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                    active ? 'text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]'
                  }`}
                  style={active ? { backgroundColor: 'var(--accent)' } : undefined}
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{lang === 'ar' ? item.labelAr : item.labelEn}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        active ? 'bg-white/25 text-white' : 'bg-[var(--bg-subtle)]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <section className="lg:col-span-9">
          {section === 'overview' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: lang === 'ar' ? 'إجمالي المنتجات' : 'Total Products', val: products.length },
                { label: lang === 'ar' ? 'المنتجات الظاهرة' : 'Visible Products', val: products.filter((p) => p.is_visible && !p.is_archived).length },
                { label: lang === 'ar' ? 'رسائل غير مقروءة' : 'Unread Chats', val: unreadChats },
                { label: lang === 'ar' ? 'استفسارات جديدة' : 'New Inquiries', val: newInquiries },
              ].map((stat) => (
                <div key={stat.label} className="glass-card rounded-3xl p-5">
                  <p className="text-xs text-[var(--text-secondary)]">{stat.label}</p>
                  <p className="mt-2 font-display text-3xl font-bold">{stat.val}</p>
                </div>
              ))}
            </div>
          )}

          {section === 'products' && (
            <AdminProductsPanel
              lang={lang}
              products={products}
              setProducts={setProducts}
              categories={categories}
              collections={collections}
              onNotify={notify}
            />
          )}

          {section === 'categories' && (
            <div className="space-y-5">
              <form onSubmit={handleCreateCategory} className="glass-card grid gap-3 rounded-3xl p-5 sm:grid-cols-4">
                <input
                  required
                  placeholder="Name AR"
                  value={catForm.name_ar}
                  onChange={(e) => setCatForm({ ...catForm, name_ar: e.target.value })}
                  className="rounded-xl border bg-transparent px-3 py-2 text-xs"
                  style={{ borderColor: 'var(--border-glass)' }}
                />
                <input
                  required
                  placeholder="Name EN"
                  value={catForm.name_en}
                  onChange={(e) => setCatForm({ ...catForm, name_en: e.target.value })}
                  className="rounded-xl border bg-transparent px-3 py-2 text-xs"
                  style={{ borderColor: 'var(--border-glass)' }}
                />
                <select
                  value={catForm.collection_id}
                  onChange={(e) => setCatForm({ ...catForm, collection_id: e.target.value })}
                  className="rounded-xl border bg-[var(--bg-page)] px-3 py-2 text-xs"
                  style={{ borderColor: 'var(--border-glass)' }}
                >
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>{lang === 'ar' ? c.name_ar : c.name_en}</option>
                  ))}
                </select>
                <button type="submit" className="inline-flex items-center justify-center gap-1 rounded-xl px-4 py-2 text-xs font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }}>
                  <Plus className="h-3.5 w-3.5" />
                  {lang === 'ar' ? 'إضافة فئة' : 'Add'}
                </button>
              </form>

              <div className="glass-card divide-y rounded-3xl" style={{ borderColor: 'var(--border-glass)' }}>
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-4 text-xs sm:text-sm">
                    <div>
                      <p className="font-semibold">{c.name_ar} / {c.name_en}</p>
                      <p className="text-[11px] opacity-60">{c.slug}</p>
                    </div>
                    <button type="button" onClick={() => handleDeleteCategory(c.id)} className="rounded-xl p-2 text-rose-500 hover:bg-rose-500/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'collections' && (
            <div className="space-y-4">
              {collections.map((col) => (
                <div key={col.id} className="glass-card space-y-3 rounded-3xl p-5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-[var(--accent)]">{col.slug}</span>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={col.is_active}
                        onChange={(e) =>
                          setCollections((prev) =>
                            prev.map((x) => (x.id === col.id ? { ...x, is_active: e.target.checked } : x))
                          )
                        }
                      />
                      Active
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={col.name_ar}
                      onChange={(e) =>
                        setCollections((prev) =>
                          prev.map((x) => (x.id === col.id ? { ...x, name_ar: e.target.value } : x))
                        )
                      }
                      className="rounded-xl border bg-transparent px-3 py-2"
                      style={{ borderColor: 'var(--border-glass)' }}
                    />
                    <input
                      value={col.name_en}
                      onChange={(e) =>
                        setCollections((prev) =>
                          prev.map((x) => (x.id === col.id ? { ...x, name_en: e.target.value } : x))
                        )
                      }
                      className="rounded-xl border bg-transparent px-3 py-2"
                      style={{ borderColor: 'var(--border-glass)' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpdateCollection(col)}
                    className="rounded-xl px-4 py-2 font-semibold text-white"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    {lang === 'ar' ? 'حفظ التشكيلة' : 'Save Collection'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {section === 'inquiries' && (
            <div className="glass-card divide-y rounded-3xl" style={{ borderColor: 'var(--border-glass)' }}>
              {inquiries.length === 0 ? (
                <p className="p-8 text-center text-xs opacity-65">No inquiries yet.</p>
              ) : (
                inquiries.map((inq) => (
                  <div key={inq.id} className="flex flex-wrap items-center justify-between gap-4 p-4 text-xs">
                    <div className="space-y-1">
                      <p className="font-semibold">
                        {inq.customer_name || 'Guest'} {inq.customer_phone ? `• ${inq.customer_phone}` : ''}
                      </p>
                      <p className="opacity-80">{inq.message}</p>
                      <p className="text-[10px] opacity-55">{new Date(inq.created_at).toLocaleString()}</p>
                    </div>
                    <select
                      value={inq.status}
                      onChange={(e) => handleUpdateInquiryStatus(inq.id, e.target.value as Inquiry['status'])}
                      className="rounded-xl border bg-[var(--bg-page)] px-3 py-1.5"
                      style={{ borderColor: 'var(--border-glass)' }}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="resolved">Resolved</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                ))
              )}
            </div>
          )}

          {section === 'chat' && (
            <AdminChatInbox
              lang={lang}
              adminId={currentAdmin.id}
              conversations={conversations}
              setConversations={setConversations}
              onNotify={notify}
            />
          )}

          {section === 'media' && <AdminMediaPanel lang={lang} onNotify={notify} />}

          {section === 'homepage' && (
            <div className="space-y-5">
              <form onSubmit={handleCreateBanner} className="glass-card space-y-3 rounded-3xl p-5 text-xs">
                <h3 className="font-bold">{lang === 'ar' ? 'إضافة بانر رئيسي' : 'Add Homepage Banner'}</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <select
                    value={bannerForm.placement}
                    onChange={(e) => setBannerForm({ ...bannerForm, placement: e.target.value as 'hero' | 'promo' | 'offer' })}
                    className="rounded-xl border bg-[var(--bg-page)] px-3 py-2"
                    style={{ borderColor: 'var(--border-glass)' }}
                  >
                    <option value="hero">Hero</option>
                    <option value="promo">Promo</option>
                    <option value="offer">Offer</option>
                  </select>
                  <input
                    required
                    placeholder="Title AR"
                    value={bannerForm.title_ar}
                    onChange={(e) => setBannerForm({ ...bannerForm, title_ar: e.target.value })}
                    className="rounded-xl border bg-transparent px-3 py-2"
                    style={{ borderColor: 'var(--border-glass)' }}
                  />
                  <input
                    required
                    placeholder="Title EN"
                    value={bannerForm.title_en}
                    onChange={(e) => setBannerForm({ ...bannerForm, title_en: e.target.value })}
                    className="rounded-xl border bg-transparent px-3 py-2"
                    style={{ borderColor: 'var(--border-glass)' }}
                  />
                </div>
                <button type="submit" className="rounded-xl px-5 py-2 font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }}>
                  {lang === 'ar' ? 'إضافة' : 'Add Banner'}
                </button>
              </form>

              <div className="glass-card divide-y rounded-3xl" style={{ borderColor: 'var(--border-glass)' }}>
                {banners.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-4 text-xs">
                    <div>
                      <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-bold uppercase">{b.placement}</span>
                      <p className="mt-1 font-semibold">{b.title_ar} / {b.title_en}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => handleToggleBanner(b)} className="rounded-xl border px-3 py-1" style={{ borderColor: 'var(--border-glass)' }}>
                        {b.is_active ? 'Active' : 'Inactive'}
                      </button>
                      <button type="button" onClick={() => handleDeleteBanner(b.id)} className="rounded-xl p-2 text-rose-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(section === 'appearance' || section === 'settings') && (
            <form onSubmit={saveStoreSettings} className="glass-card space-y-4 rounded-3xl p-6 text-xs sm:text-sm">
              {section === 'appearance' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Default Language</label>
                    <select
                      value={settingsForm.default_language}
                      onChange={(e) => setSettingsForm({ ...settingsForm, default_language: e.target.value as Language })}
                      className="w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2"
                      style={{ borderColor: 'var(--border-glass)' }}
                    >
                      <option value="ar">Arabic (RTL)</option>
                      <option value="en">English (LTR)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Default Theme</label>
                    <select
                      value={settingsForm.default_theme}
                      onChange={(e) => setSettingsForm({ ...settingsForm, default_theme: e.target.value as ThemeMode })}
                      className="w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2"
                      style={{ borderColor: 'var(--border-glass)' }}
                    >
                      <option value="light">Light Mode</option>
                      <option value="dark">Dark Mode</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Default Collection Identity</label>
                    <select
                      value={settingsForm.default_collection_theme}
                      onChange={(e) => setSettingsForm({ ...settingsForm, default_collection_theme: e.target.value as CollectionSlug })}
                      className="w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2"
                      style={{ borderColor: 'var(--border-glass)' }}
                    >
                      <option value="women">Women</option>
                      <option value="men">Men</option>
                      <option value="handmade">Handmade</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 pt-6 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={settingsForm.enable_guest_chat}
                      onChange={(e) => setSettingsForm({ ...settingsForm, enable_guest_chat: e.target.checked })}
                    />
                    Enable Floating Guest Chat
                  </label>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Store Name AR</label>
                    <input value={settingsForm.store_name_ar} onChange={(e) => setSettingsForm({ ...settingsForm, store_name_ar: e.target.value })} className="w-full rounded-xl border bg-transparent px-3 py-2" style={{ borderColor: 'var(--border-glass)' }} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Store Name EN</label>
                    <input value={settingsForm.store_name_en} onChange={(e) => setSettingsForm({ ...settingsForm, store_name_en: e.target.value })} className="w-full rounded-xl border bg-transparent px-3 py-2" style={{ borderColor: 'var(--border-glass)' }} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">WhatsApp Number (digits with country code)</label>
                    <input value={settingsForm.whatsapp_number} onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp_number: e.target.value })} className="w-full rounded-xl border bg-transparent px-3 py-2" style={{ borderColor: 'var(--border-glass)' }} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Phone Number</label>
                    <input value={settingsForm.phone_number} onChange={(e) => setSettingsForm({ ...settingsForm, phone_number: e.target.value })} className="w-full rounded-xl border bg-transparent px-3 py-2" style={{ borderColor: 'var(--border-glass)' }} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Email</label>
                    <input value={settingsForm.email} onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })} className="w-full rounded-xl border bg-transparent px-3 py-2" style={{ borderColor: 'var(--border-glass)' }} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Currency</label>
                    <input value={settingsForm.currency} onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })} className="w-full rounded-xl border bg-transparent px-3 py-2" style={{ borderColor: 'var(--border-glass)' }} />
                  </div>
                </div>
              )}

              <button type="submit" className="rounded-2xl px-6 py-2.5 text-xs font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }}>
                {lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
              </button>
            </form>
          )}

          {section === 'users' && (
            <div className="glass-card space-y-4 rounded-3xl p-6 text-xs">
              <h3 className="text-sm font-bold">{lang === 'ar' ? 'المسؤولون المصرح لهم' : 'Authorized Admin Users'}</h3>
              <div className="divide-y" style={{ borderColor: 'var(--border-glass)' }}>
                {adminUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-semibold">{u.email}</p>
                      <p className="opacity-65">{u.role} • {u.is_active ? 'Active' : 'Inactive'}</p>
                    </div>
                    {currentAdmin.role === 'super_admin' && u.id !== currentAdmin.id && (
                      <button
                        type="button"
                        onClick={async () => {
                          const supabase = createClient();
                          await supabase.from('admin_users').update({ is_active: !u.is_active }).eq('id', u.id);
                          setAdminUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: !u.is_active } : x)));
                        }}
                        className="rounded-xl border px-3 py-1"
                        style={{ borderColor: 'var(--border-glass)' }}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
