'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  ExternalLink,
  FolderTree,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Palette,
  Pencil,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DARK_PALETTES, useApp } from '@/components/providers/AppProvider';
import { EsraaEmblem } from '@/components/brand/BrandLogo';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AdminProductsPanel } from '@/components/admin/AdminProductsPanel';
import { AdminChatInbox } from '@/components/admin/AdminChatInbox';
import { AdminMediaPanel } from '@/components/admin/AdminMediaPanel';
import { useAdminChatNotifications } from '@/hooks/useAdminChatNotifications';
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
  const { lang, toggleLang, palette, setPalette } = useApp();

  const [section, setSection] = useState<Section>('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [collections, setCollections] = useState(initialCollections);
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialConversations[0]?.id || null);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const [banners, setBanners] = useState(initialBanners);
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(initialSettings);
  const [adminUsers, setAdminUsers] = useState(initialAdminUsers);
  const [toast, setToast] = useState<{ msg: string; isError?: boolean } | null>(null);

  const openConversationFromNotification = useCallback((conversationId: string) => {
    setSection('chat');
    setSelectedChatId(conversationId);
    setBellOpen(false);
  }, []);

  const {
    notifications: chatNotifications,
    latestGuestMessage,
    browserPermission,
    requestBrowserPermission,
    dismissConversationNotifications,
    clearAllNotifications,
  } = useAdminChatNotifications({
    lang,
    conversations,
    setConversations,
    isChatSectionOpen: section === 'chat',
    activeConversationId: selectedChatId,
    onOpenConversation: (convId) => {
      openConversationFromNotification(convId);
    },
  });

  const handleSelectChat = useCallback(
    (convId: string | null) => {
      setSelectedChatId(convId);
      if (convId) {
        dismissConversationNotifications(convId);
      }
    },
    [dismissConversationNotifications]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const chatParam = new URLSearchParams(window.location.search).get('chat');
    if (chatParam && /^[0-9a-f-]{36}$/i.test(chatParam)) {
      const timer = setTimeout(() => {
        openConversationFromNotification(chatParam);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [openConversationFromNotification]);

  useEffect(() => {
    if (!bellOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [bellOpen]);

  // Category modal state
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({ name_ar: '', name_en: '', slug: '', collection_id: collections[0]?.id || '' });
  const [deleteCatTarget, setDeleteCatTarget] = useState<Category | null>(null);

  // Banner modal state
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState({
    placement: 'hero' as 'hero' | 'promo' | 'offer' | 'video_ad',
    media_type: 'image' as 'image' | 'video',
    title_ar: '',
    title_en: '',
    subtitle_ar: '',
    subtitle_en: '',
    cta_text_ar: 'تصفح الآن',
    cta_text_en: 'Explore Now',
    cta_link: '/catalog',
    image_url: '/images/hero-boutique.png',
    video_url: '',
  });
  const [deleteBannerTarget, setDeleteBannerTarget] = useState<HomepageBanner | null>(null);

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

  const openCreateCategory = () => {
    setEditingCatId(null);
    setCatForm({ name_ar: '', name_en: '', slug: '', collection_id: collections[0]?.id || '' });
    setCatModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setCatForm({
      name_ar: cat.name_ar,
      name_en: cat.name_en,
      slug: cat.slug,
      collection_id: cat.collection_id || '',
    });
    setCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    const slug =
      catForm.slug.trim() ||
      catForm.name_en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
      `cat-${Date.now()}`;

    if (editingCatId) {
      const { data, error } = await supabase
        .from('categories')
        .update({
          name_ar: catForm.name_ar.trim(),
          name_en: catForm.name_en.trim(),
          slug,
          collection_id: catForm.collection_id || null,
        })
        .eq('id', editingCatId)
        .select('*')
        .single();
      if (error || !data) {
        notify(error?.message || 'Failed', true);
        return;
      }
      setCategories((prev) => prev.map((c) => (c.id === editingCatId ? (data as Category) : c)));
      setCatModalOpen(false);
      notify(lang === 'ar' ? 'تم تحديث الفئة' : 'Category updated');
    } else {
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
      setCatModalOpen(false);
      notify(lang === 'ar' ? 'تمت إضافة الفئة' : 'Category added');
    }
  };

  const confirmDeleteCategory = async () => {
    if (!deleteCatTarget) return;
    const supabase = createClient();
    const { error } = await supabase.from('categories').delete().eq('id', deleteCatTarget.id);
    if (error) {
      notify(error.message, true);
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== deleteCatTarget.id));
    setDeleteCatTarget(null);
    notify(lang === 'ar' ? 'تم حذف الفئة' : 'Category deleted');
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

  const openCreateBanner = () => {
    setEditingBannerId(null);
    setBannerForm({
      placement: 'hero',
      media_type: 'image',
      title_ar: '',
      title_en: '',
      subtitle_ar: '',
      subtitle_en: '',
      cta_text_ar: 'تصفح الآن',
      cta_text_en: 'Explore Now',
      cta_link: '/catalog',
      image_url: '/images/hero-boutique.png',
      video_url: '',
    });
    setBannerModalOpen(true);
  };

  const openEditBanner = (b: HomepageBanner) => {
    setEditingBannerId(b.id);
    setBannerForm({
      placement: b.placement,
      media_type: b.media_type || (b.placement === 'video_ad' ? 'video' : 'image'),
      title_ar: b.title_ar,
      title_en: b.title_en,
      subtitle_ar: b.subtitle_ar || '',
      subtitle_en: b.subtitle_en || '',
      cta_text_ar: b.cta_text_ar || '',
      cta_text_en: b.cta_text_en || '',
      cta_link: b.cta_link || '/catalog',
      image_url: b.image_url || '/images/hero-boutique.png',
      video_url: b.video_url || '',
    });
    setBannerModalOpen(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    if (editingBannerId) {
      const { data, error } = await supabase
        .from('homepage_banners')
        .update(bannerForm)
        .eq('id', editingBannerId)
        .select('*')
        .single();
      if (error || !data) {
        notify(error?.message || 'Failed', true);
        return;
      }
      setBanners((prev) => prev.map((b) => (b.id === editingBannerId ? (data as HomepageBanner) : b)));
      setBannerModalOpen(false);
      notify(lang === 'ar' ? 'تم تحديث البانر' : 'Banner updated');
    } else {
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
      setBannerModalOpen(false);
      notify(lang === 'ar' ? 'تمت إضافة البانر' : 'Banner added');
    }
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

  const confirmDeleteBanner = async () => {
    if (!deleteBannerTarget) return;
    const supabase = createClient();
    await supabase.from('homepage_banners').delete().eq('id', deleteBannerTarget.id);
    setBanners((prev) => prev.filter((x) => x.id !== deleteBannerTarget.id));
    setDeleteBannerTarget(null);
    notify(lang === 'ar' ? 'تم حذف البانر' : 'Banner deleted');
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
      <header className="glass-nav sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border lg:hidden"
              style={{ borderColor: 'var(--border-glass)' }}
              aria-label={lang === 'ar' ? 'فتح القائمة' : 'Open menu'}
            >
              <Menu className="h-4 w-4" />
            </button>
            <EsraaEmblem className="h-8 w-8 shrink-0" />
            <span className="font-display truncate text-sm font-bold sm:text-lg">
              {lang === 'ar' ? 'لوحة تحكم إسراء بوتيك' : 'Esraa Boutique Admin'}
            </span>
            <span className="hidden rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent-strong)] md:inline">
              {currentAdmin.email}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Admin Guest Chat Notification Bell */}
            <div ref={bellRef} className="relative">
              <button
                type="button"
                onClick={() => setBellOpen((prev) => !prev)}
                className="relative flex h-8 w-8 items-center justify-center rounded-full border transition-colors hover:bg-[var(--accent-soft)]"
                style={{ borderColor: 'var(--border-glass)' }}
                aria-label={lang === 'ar' ? 'إشعارات رسائل العملاء' : 'Customer message notifications'}
              >
                <Bell className="h-4 w-4" />
                {(unreadChats > 0 || chatNotifications.length > 0) && (
                  <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                    {Math.max(unreadChats, chatNotifications.length)}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div
                  className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+3.75rem)] z-50 overflow-hidden rounded-2xl border bg-[#FAF7F2]/98 shadow-2xl backdrop-blur-2xl sm:absolute sm:inset-x-auto sm:end-0 sm:top-auto sm:mt-2 sm:w-80 dark:bg-[#171315]/98"
                  style={{ borderColor: 'var(--border-glass)' }}
                >
                  <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border-glass)' }}>
                    <span className="text-xs font-bold">
                      {lang === 'ar' ? 'إشعارات المحادثات' : 'Chat Notifications'}
                    </span>
                    {chatNotifications.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllNotifications}
                        className="text-[11px] font-medium text-[var(--accent-strong)] hover:underline"
                      >
                        {lang === 'ar' ? 'مسح الكل' : 'Clear'}
                      </button>
                    )}
                  </div>

                  {browserPermission === 'default' && (
                    <div className="border-b bg-[var(--accent-soft)] px-4 py-2.5" style={{ borderColor: 'var(--border-glass)' }}>
                      <button
                        type="button"
                        onClick={() => void requestBrowserPermission()}
                        className="w-full text-start text-[11px] font-semibold text-[var(--accent-strong)] hover:underline"
                      >
                        {lang === 'ar'
                          ? 'تفعيل إشعارات المتصفح عند العمل في الخلفية'
                          : 'Enable browser notifications in background'}
                      </button>
                    </div>
                  )}

                  <div className="max-h-72 overflow-y-auto divide-y" style={{ borderColor: 'var(--border-glass)' }}>
                    {chatNotifications.length === 0 ? (
                      <p className="px-4 py-6 text-center text-xs opacity-65">
                        {unreadChats > 0
                          ? lang === 'ar'
                            ? `لديك ${unreadChats} رسالة غير مقروءة — اضغط لفتح المحادثات`
                            : `${unreadChats} unread message(s) — click to open chat`
                          : lang === 'ar'
                            ? 'لا توجد إشعارات جديدة'
                            : 'No new notifications'}
                      </p>
                    ) : (
                      chatNotifications.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            openConversationFromNotification(item.conversationId);
                            dismissConversationNotifications(item.conversationId);
                          }}
                          className="flex w-full flex-col gap-1 px-4 py-3 text-start transition-colors hover:bg-[var(--accent-soft)]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold">
                              {item.guestName || (lang === 'ar' ? 'زائر' : 'Guest')}
                            </span>
                            <span className="text-[10px] opacity-60">
                              {new Date(item.createdAt).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="line-clamp-2 text-[11px] opacity-80">{item.preview}</p>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="border-t px-4 py-2.5" style={{ borderColor: 'var(--border-glass)' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSection('chat');
                        setBellOpen(false);
                      }}
                      className="w-full text-center text-xs font-semibold text-[var(--accent-strong)] hover:underline"
                    >
                      {lang === 'ar' ? 'فتح صندوق المحادثات' : 'Open Chat Inbox'}
                    </button>
                  </div>
                </div>
              )}
            </div>

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
              onClick={() => {
                const idx = DARK_PALETTES.findIndex((p) => p.id === palette);
                setPalette(DARK_PALETTES[(idx + 1) % DARK_PALETTES.length].id);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
              style={{ borderColor: 'var(--border-glass)' }}
              title={lang === 'ar' ? 'تبديل لون المظهر' : 'Cycle Dark Palette'}
            >
              <span
                className="h-3 w-3 rounded-full border border-white/30"
                style={{ backgroundColor: DARK_PALETTES.find((p) => p.id === palette)?.swatch }}
              />
              <span className="hidden sm:inline">
                {lang === 'ar'
                  ? DARK_PALETTES.find((p) => p.id === palette)?.labelAr
                  : DARK_PALETTES.find((p) => p.id === palette)?.labelEn}
              </span>
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

      {/* Mobile Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-[#191619]/60 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="glass-card relative z-10 flex h-full w-72 max-w-[82vw] flex-col border-e p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-glass)' }}>
              <div className="flex items-center gap-2.5">
                <EsraaEmblem className="h-7 w-7 shrink-0" />
                <span className="font-display text-sm font-bold">
                  {lang === 'ar' ? 'القائمة' : 'Dashboard Menu'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md border"
                style={{ borderColor: 'var(--border-glass)' }}
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
              {navItems.map((item) => {
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSection(item.id);
                      setMobileSidebarOpen(false);
                    }}
                    className={`flex items-center justify-between gap-2 rounded-md px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                      active ? 'cta-luxury' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      {item.icon}
                      <span>{lang === 'ar' ? item.labelAr : item.labelEn}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span className="rounded-sm bg-[var(--bg-page)]/20 px-2 py-0.5 text-[10px]">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12">
        {/* Desktop Sidebar */}
        <aside className="glass-card hidden h-fit rounded-lg p-3 lg:sticky lg:top-20 lg:block lg:col-span-3">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`flex items-center justify-between gap-2 rounded-md px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                    active ? 'cta-luxury' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{lang === 'ar' ? item.labelAr : item.labelEn}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`rounded-sm px-2 py-0.5 text-[10px] ${
                        active ? 'bg-[var(--bg-page)]/20' : 'bg-[var(--bg-subtle)]'
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
        <section className="min-w-0 lg:col-span-9">
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
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={openCreateCategory}
                  className="cta-luxury inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-semibold"
                >
                  <Plus className="h-4 w-4" />
                  <span>{lang === 'ar' ? 'إضافة فئة' : 'Add Category'}</span>
                </button>
              </div>

              <div className="glass-card divide-y rounded-3xl" style={{ borderColor: 'var(--border-glass)' }}>
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-4 text-xs sm:text-sm">
                    <div>
                      <p className="font-semibold">{c.name_ar} / {c.name_en}</p>
                      <p className="text-[11px] opacity-60">{c.slug}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => openEditCategory(c)} className="rounded-xl p-2 hover:bg-[var(--accent-soft)]" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setDeleteCatTarget(c)} className="rounded-xl p-2 text-rose-500 hover:bg-rose-500/10" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <Modal
                open={catModalOpen}
                onClose={() => setCatModalOpen(false)}
                maxWidthClass="max-w-lg"
                title={editingCatId ? (lang === 'ar' ? 'تعديل الفئة' : 'Edit Category') : (lang === 'ar' ? 'إضافة فئة جديدة' : 'New Category')}
              >
                <form onSubmit={handleSaveCategory} className="space-y-4 text-xs sm:text-sm">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Name AR *</label>
                    <input
                      required
                      value={catForm.name_ar}
                      onChange={(e) => setCatForm({ ...catForm, name_ar: e.target.value })}
                      className="w-full rounded-xl border bg-transparent px-3 py-2"
                      style={{ borderColor: 'var(--border-glass)' }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Name EN *</label>
                    <input
                      required
                      value={catForm.name_en}
                      onChange={(e) => setCatForm({ ...catForm, name_en: e.target.value })}
                      className="w-full rounded-xl border bg-transparent px-3 py-2"
                      style={{ borderColor: 'var(--border-glass)' }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Slug</label>
                    <input
                      value={catForm.slug}
                      onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
                      className="w-full rounded-xl border bg-transparent px-3 py-2"
                      style={{ borderColor: 'var(--border-glass)' }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Collection</label>
                    <select
                      value={catForm.collection_id}
                      onChange={(e) => setCatForm({ ...catForm, collection_id: e.target.value })}
                      className="w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2"
                      style={{ borderColor: 'var(--border-glass)' }}
                    >
                      {collections.map((c) => (
                        <option key={c.id} value={c.id}>{lang === 'ar' ? c.name_ar : c.name_en}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:justify-end sm:gap-3">
                    <button type="button" onClick={() => setCatModalOpen(false)} className="w-full rounded-md border px-5 py-2.5 text-xs font-semibold sm:w-auto" style={{ borderColor: 'var(--border-glass)' }}>
                      {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button type="submit" className="cta-luxury w-full rounded-md px-6 py-2.5 text-xs font-semibold sm:w-auto">
                      {lang === 'ar' ? 'حفظ' : 'Save'}
                    </button>
                  </div>
                </form>
              </Modal>

              <ConfirmDialog
                open={Boolean(deleteCatTarget)}
                onClose={() => setDeleteCatTarget(null)}
                onConfirm={confirmDeleteCategory}
                title={lang === 'ar' ? 'حذف الفئة' : 'Delete Category'}
                message={lang === 'ar' ? `حذف الفئة "${deleteCatTarget?.name_ar || ''}"؟` : `Delete category "${deleteCatTarget?.name_en || ''}"?`}
                confirmLabel={lang === 'ar' ? 'حذف' : 'Delete'}
                cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
              />
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
              selectedId={selectedChatId}
              onSelectId={handleSelectChat}
              latestIncomingMessage={latestGuestMessage}
            />
          )}

          {section === 'media' && <AdminMediaPanel lang={lang} onNotify={notify} />}

          {section === 'homepage' && (
            <div className="space-y-5">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={openCreateBanner}
                  className="cta-luxury inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-semibold"
                >
                  <Plus className="h-4 w-4" />
                  <span>{lang === 'ar' ? 'إضافة بانر' : 'Add Banner'}</span>
                </button>
              </div>

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
                      <button type="button" onClick={() => openEditBanner(b)} className="rounded-xl p-2 hover:bg-[var(--accent-soft)]" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setDeleteBannerTarget(b)} className="rounded-xl p-2 text-rose-500 hover:bg-rose-500/10" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <Modal
                open={bannerModalOpen}
                onClose={() => setBannerModalOpen(false)}
                maxWidthClass="max-w-xl"
                title={editingBannerId ? (lang === 'ar' ? 'تعديل البانر' : 'Edit Banner') : (lang === 'ar' ? 'إضافة بانر رئيسي' : 'Add Homepage Banner')}
              >
                <form onSubmit={handleSaveBanner} className="space-y-4 text-xs sm:text-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Placement</label>
                      <select
                        value={bannerForm.placement}
                        onChange={(e) => {
                          const nextPlacement = e.target.value as 'hero' | 'promo' | 'offer' | 'video_ad';
                          setBannerForm({
                            ...bannerForm,
                            placement: nextPlacement,
                            media_type: nextPlacement === 'video_ad' ? 'video' : bannerForm.media_type,
                          });
                        }}
                        className="w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2"
                        style={{ borderColor: 'var(--border-glass)' }}
                      >
                        <option value="hero">Hero</option>
                        <option value="promo">Promo</option>
                        <option value="offer">Offer</option>
                        <option value="video_ad">Video Ad (Animated Section)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Media Type</label>
                      <select
                        value={bannerForm.media_type}
                        onChange={(e) => setBannerForm({ ...bannerForm, media_type: e.target.value as 'image' | 'video' })}
                        className="w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2"
                        style={{ borderColor: 'var(--border-glass)' }}
                      >
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Image / Poster URL</label>
                      <input
                        value={bannerForm.image_url}
                        onChange={(e) => setBannerForm({ ...bannerForm, image_url: e.target.value })}
                        className="w-full rounded-xl border bg-transparent px-3 py-2"
                        style={{ borderColor: 'var(--border-glass)' }}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Video URL (.mp4 / .webm)</label>
                      <input
                        value={bannerForm.video_url}
                        onChange={(e) => setBannerForm({ ...bannerForm, video_url: e.target.value })}
                        placeholder="https://.../ad-video.mp4"
                        className="w-full rounded-xl border bg-transparent px-3 py-2"
                        style={{ borderColor: 'var(--border-glass)' }}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Title AR *</label>
                      <input
                        required
                        value={bannerForm.title_ar}
                        onChange={(e) => setBannerForm({ ...bannerForm, title_ar: e.target.value })}
                        className="w-full rounded-xl border bg-transparent px-3 py-2"
                        style={{ borderColor: 'var(--border-glass)' }}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Title EN *</label>
                      <input
                        required
                        value={bannerForm.title_en}
                        onChange={(e) => setBannerForm({ ...bannerForm, title_en: e.target.value })}
                        className="w-full rounded-xl border bg-transparent px-3 py-2"
                        style={{ borderColor: 'var(--border-glass)' }}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Subtitle AR</label>
                      <input
                        value={bannerForm.subtitle_ar}
                        onChange={(e) => setBannerForm({ ...bannerForm, subtitle_ar: e.target.value })}
                        className="w-full rounded-xl border bg-transparent px-3 py-2"
                        style={{ borderColor: 'var(--border-glass)' }}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Subtitle EN</label>
                      <input
                        value={bannerForm.subtitle_en}
                        onChange={(e) => setBannerForm({ ...bannerForm, subtitle_en: e.target.value })}
                        className="w-full rounded-xl border bg-transparent px-3 py-2"
                        style={{ borderColor: 'var(--border-glass)' }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:justify-end sm:gap-3">
                    <button type="button" onClick={() => setBannerModalOpen(false)} className="w-full rounded-md border px-5 py-2.5 text-xs font-semibold sm:w-auto" style={{ borderColor: 'var(--border-glass)' }}>
                      {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button type="submit" className="cta-luxury w-full rounded-md px-6 py-2.5 text-xs font-semibold sm:w-auto">
                      {lang === 'ar' ? 'حفظ' : 'Save'}
                    </button>
                  </div>
                </form>
              </Modal>

              <ConfirmDialog
                open={Boolean(deleteBannerTarget)}
                onClose={() => setDeleteBannerTarget(null)}
                onConfirm={confirmDeleteBanner}
                title={lang === 'ar' ? 'حذف البانر' : 'Delete Banner'}
                message={lang === 'ar' ? `حذف البانر "${deleteBannerTarget?.title_ar || ''}"؟` : `Delete banner "${deleteBannerTarget?.title_en || ''}"?`}
                confirmLabel={lang === 'ar' ? 'حذف' : 'Delete'}
                cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
              />
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
