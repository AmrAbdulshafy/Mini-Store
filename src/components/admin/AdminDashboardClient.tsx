'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  ExternalLink,
  Eye,
  FileSpreadsheet,
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
  PanelLeftClose,
  PanelLeftOpen,
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
import { AdminOrdersPanel } from '@/components/admin/AdminOrdersPanel';
import { AdminReportsOverview } from '@/components/admin/AdminReportsOverview';
import { AdminChatInbox } from '@/components/admin/AdminChatInbox';
import { AdminChatBubble } from '@/components/admin/AdminChatBubble';
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
  Order,
  Product,
  StoreSettings,
  ThemeMode,
} from '@/types/database';

type Section =
  | 'overview'
  | 'products'
  | 'categories'
  | 'collections'
  | 'orders'
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
  initialOrders = [],
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
  initialOrders?: Order[];
}) {
  const router = useRouter();
  const { lang, toggleLang, palette, setPalette } = useApp();

  const [section, setSection] = useState<Section>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [collections, setCollections] = useState(initialCollections);
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [prefillInquiry, setPrefillInquiry] = useState<Inquiry | null>(null);
  const [inqModalOpen, setInqModalOpen] = useState(false);
  const [viewInq, setViewInq] = useState<Inquiry | null>(null);
  const [deleteInqTarget, setDeleteInqTarget] = useState<Inquiry | null>(null);
  const [inqForm, setInqForm] = useState({
    customer_name: '',
    customer_phone: '',
    channel: 'whatsapp' as Inquiry['channel'],
    message: '',
    admin_notes: '',
  });
  const [uploadingBannerMedia, setUploadingBannerMedia] = useState(false);
  const [previewBanner, setPreviewBanner] = useState<HomepageBanner | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    email: '',
    full_name: '',
    role: 'editor' as AdminUser['role'],
  });
  const [deleteUserTarget, setDeleteUserTarget] = useState<AdminUser | null>(null);
  const [colModalOpen, setColModalOpen] = useState(false);
  const [colForm, setColForm] = useState({
    name_ar: '',
    name_en: '',
    slug: '',
    description_ar: '',
    description_en: '',
    theme_key: 'women' as CollectionSlug,
    sort_order: '0',
    is_active: true,
  });
  const [savingCol, setSavingCol] = useState(false);
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialConversations[0]?.id || null);
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [bubbleMinimized, setBubbleMinimized] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const [banners, setBanners] = useState(initialBanners);
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(initialSettings);
  const [adminUsers, setAdminUsers] = useState(initialAdminUsers);
  const [toast, setToast] = useState<{ msg: string; isError?: boolean } | null>(null);

  const openConversationFromNotification = useCallback((conversationId: string) => {
    setSelectedChatId(conversationId);
    setBubbleOpen(true);
    setBubbleMinimized(false);
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
    isBubbleOpen: bubbleOpen,
    isBubbleMinimized: bubbleMinimized,
    activeConversationId: selectedChatId,
    onOpenConversation: (convId) => {
      openConversationFromNotification(convId);
    },
  });

  const handleSelectChat = useCallback(
    (convId: string) => {
      setSelectedChatId(convId);
      setBubbleOpen(true);
      setBubbleMinimized(false);
      dismissConversationNotifications(convId);
    },
    [dismissConversationNotifications]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const chatParam = url.searchParams.get('chat');
    if (chatParam && /^[0-9a-f-]{36}$/i.test(chatParam)) {
      url.searchParams.delete('chat');
      const cleanUrl = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, '', cleanUrl || '/admin');
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

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCol(true);
    try {
      const supabase = createClient();
      const cleanSlug =
        colForm.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-') ||
        `${colForm.name_en.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
      const { data, error } = await supabase
        .from('collections')
        .insert({
          slug: cleanSlug,
          name_ar: colForm.name_ar.trim(),
          name_en: colForm.name_en.trim(),
          description_ar: colForm.description_ar.trim() || null,
          description_en: colForm.description_en.trim() || null,
          theme_key: colForm.theme_key,
          sort_order: parseInt(colForm.sort_order, 10) || collections.length,
          is_active: colForm.is_active,
        })
        .select('*')
        .single();
      if (error || !data) throw error;
      setCollections((prev) => [...prev, data as Collection]);
      setColModalOpen(false);
      setColForm({
        name_ar: '',
        name_en: '',
        slug: '',
        description_ar: '',
        description_en: '',
        theme_key: 'women',
        sort_order: '0',
        is_active: true,
      });
      notify(lang === 'ar' ? 'تمت إضافة التشكيلة بنجاح' : 'Collection added');
    } catch (err) {
      notify(err instanceof Error ? err.message : lang === 'ar' ? 'تعذر إضافة التشكيلة' : 'Failed to add collection', true);
    } finally {
      setSavingCol(false);
    }
  };

  const handleDeleteCollection = async (colId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('collections').delete().eq('id', colId);
    if (error) {
      notify(error.message, true);
      return;
    }
    setCollections((prev) => prev.filter((c) => c.id !== colId));
    notify(lang === 'ar' ? 'تم حذف التشكيلة' : 'Collection deleted');
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

  const handleCreateInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    const { data, error } = await supabase
      .from('inquiries')
      .insert({
        customer_name: inqForm.customer_name.trim() || null,
        customer_phone: inqForm.customer_phone.trim() || null,
        channel: inqForm.channel,
        message: inqForm.message.trim() || null,
        admin_notes: inqForm.admin_notes.trim() || null,
        status: 'new',
      })
      .select('*, products(id, name_ar, name_en, slug)')
      .single();
    if (error || !data) {
      notify(error?.message || 'Failed', true);
      return;
    }
    setInquiries((prev) => [data as Inquiry, ...prev]);
    setInqModalOpen(false);
    setInqForm({ customer_name: '', customer_phone: '', channel: 'whatsapp', message: '', admin_notes: '' });
    notify(lang === 'ar' ? 'تمت إضافة الاستفسار' : 'Inquiry added');
  };

  const handleSaveInquiryNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewInq) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('inquiries')
      .update({ admin_notes: viewInq.admin_notes || null, status: viewInq.status })
      .eq('id', viewInq.id);
    if (error) {
      notify(error.message, true);
      return;
    }
    setInquiries((prev) =>
      prev.map((x) => (x.id === viewInq.id ? { ...x, admin_notes: viewInq.admin_notes, status: viewInq.status } : x))
    );
    setViewInq(null);
    notify(lang === 'ar' ? 'تم تحديث الاستفسار' : 'Inquiry updated');
  };

  const confirmDeleteInquiry = async () => {
    if (!deleteInqTarget) return;
    const supabase = createClient();
    const { error } = await supabase.from('inquiries').delete().eq('id', deleteInqTarget.id);
    if (error) {
      notify(error.message, true);
      return;
    }
    setInquiries((prev) => prev.filter((x) => x.id !== deleteInqTarget.id));
    setDeleteInqTarget(null);
    notify(lang === 'ar' ? 'تم حذف الاستفسار' : 'Inquiry deleted');
  };

  const uploadBannerMedia = async (file: File, kind: 'image' | 'video') => {
    setUploadingBannerMedia(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() || (kind === 'video' ? 'mp4' : 'jpg');
      const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error } = await supabase.storage.from('boutique-media').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('boutique-media').getPublicUrl(path);
      if (kind === 'video') {
        setBannerForm((prev) => ({ ...prev, video_url: pub.publicUrl, media_type: 'video' }));
      } else {
        setBannerForm((prev) => ({ ...prev, image_url: pub.publicUrl }));
      }
      notify(lang === 'ar' ? 'تم رفع الملف بنجاح' : 'Media uploaded');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Upload failed', true);
    } finally {
      setUploadingBannerMedia(false);
    }
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
    { id: 'overview', labelAr: 'التقارير ونظرة عامة', labelEn: 'Reports & Overview', icon: <LayoutDashboard className="h-4 w-4 shrink-0" /> },
    { id: 'orders', labelAr: 'الفواتير والحسابات', labelEn: 'Invoices & Finance', icon: <FileSpreadsheet className="h-4 w-4 shrink-0" />, badge: orders.length || undefined },
    { id: 'products', labelAr: 'المنتجات', labelEn: 'Products', icon: <Package className="h-4 w-4 shrink-0" />, badge: products.length },
    { id: 'categories', labelAr: 'الفئات', labelEn: 'Categories', icon: <FolderTree className="h-4 w-4 shrink-0" /> },
    { id: 'collections', labelAr: 'التشكيلات', labelEn: 'Collections', icon: <Layers className="h-4 w-4 shrink-0" />, badge: collections.length },
    { id: 'inquiries', labelAr: 'الاستفسارات', labelEn: 'Inquiries', icon: <Inbox className="h-4 w-4 shrink-0" />, badge: newInquiries || undefined },
    { id: 'chat', labelAr: 'محادثات العملاء', labelEn: 'Customer Chat', icon: <MessageSquare className="h-4 w-4 shrink-0" />, badge: unreadChats || undefined },
    { id: 'media', labelAr: 'الوسائط', labelEn: 'Media', icon: <ImageIcon className="h-4 w-4 shrink-0" /> },
    { id: 'homepage', labelAr: 'محتوى الرئيسية', labelEn: 'Homepage Content', icon: <Sparkles className="h-4 w-4 shrink-0" /> },
    { id: 'appearance', labelAr: 'المظهر', labelEn: 'Appearance', icon: <Palette className="h-4 w-4 shrink-0" /> },
    { id: 'settings', labelAr: 'إعدادات المتجر', labelEn: 'Store Settings', icon: <Settings className="h-4 w-4 shrink-0" /> },
    { id: 'users', labelAr: 'المسؤولون', labelEn: 'Admin Users', icon: <Users className="h-4 w-4 shrink-0" /> },
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
                aria-label={lang === 'ar' ? 'إغلاق القائمة' : 'Close menu'}
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

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:items-start">
        {/* Desktop Collapsible Sidebar with Hover Expand Effect */}
        <aside
          className={`glass-card group hidden h-fit shrink-0 rounded-2xl p-2.5 transition-all duration-300 ease-out lg:sticky lg:top-20 lg:block ${
            sidebarCollapsed ? 'lg:w-[74px] lg:hover:w-64' : 'lg:w-64'
          }`}
        >
          <div className="mb-2 flex items-center justify-between px-1.5">
            <span
              className={`truncate text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] transition-all duration-200 ${
                sidebarCollapsed ? 'max-w-0 opacity-0 group-hover:max-w-[140px] group-hover:opacity-100' : 'opacity-100'
              }`}
            >
              {lang === 'ar' ? 'القائمة' : 'Menu'}
            </span>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
              style={{ borderColor: 'var(--border-glass)' }}
              title={
                sidebarCollapsed
                  ? lang === 'ar'
                    ? 'تثبيت القائمة موسعة'
                    : 'Expand & pin sidebar'
                  : lang === 'ar'
                    ? 'طي القائمة'
                    : 'Collapse sidebar'
              }
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 ${
                    active
                      ? 'cta-luxury shadow-md'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] ltr:hover:translate-x-0.5 rtl:hover:-translate-x-0.5'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    {item.icon}
                    <span
                      className={`truncate transition-all duration-200 ${
                        sidebarCollapsed
                          ? 'max-w-0 overflow-hidden opacity-0 group-hover:max-w-[160px] group-hover:opacity-100'
                          : 'opacity-100'
                      }`}
                    >
                      {lang === 'ar' ? item.labelAr : item.labelEn}
                    </span>
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`shrink-0 rounded-sm px-2 py-0.5 text-[10px] transition-opacity duration-200 ${
                        active ? 'bg-[var(--bg-page)]/20' : 'bg-[var(--bg-subtle)]'
                      } ${sidebarCollapsed ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}
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
        <section className="min-w-0 flex-1">
          {section === 'overview' && (
            <AdminReportsOverview
              lang={lang}
              currency={settingsForm.currency || 'EGP'}
              products={products}
              categories={categories}
              collections={collections}
              inquiries={inquiries}
              conversations={conversations}
              orders={orders}
              onNavigate={(target) => setSection(target)}
            />
          )}

          {section === 'orders' && (
            <AdminOrdersPanel
              lang={lang}
              currency={settingsForm.currency || 'EGP'}
              orders={orders}
              setOrders={setOrders}
              products={products}
              prefillInquiry={prefillInquiry}
              onClearPrefill={() => setPrefillInquiry(null)}
              onNotify={notify}
            />
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
                    <label className="mb-1 block text-xs font-semibold">{lang === 'ar' ? 'المعرف (Slug)' : 'Slug'}</label>
                    <input
                      value={catForm.slug}
                      onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
                      className="w-full rounded-xl border bg-transparent px-3 py-2"
                      style={{ borderColor: 'var(--border-glass)' }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">{lang === 'ar' ? 'التشكيلة' : 'Collection'}</label>
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
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setColModalOpen(true)}
                  className="cta-luxury flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold"
                >
                  <Plus className="h-4 w-4" />
                  <span>{lang === 'ar' ? 'إضافة تشكيلة' : 'Add Collection'}</span>
                </button>
              </div>
              {collections.map((col) => (
                <div key={col.id} className="glass-card space-y-3 rounded-3xl p-5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-[var(--accent)]">{col.slug}</span>
                    <div className="flex items-center gap-3">
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
                        {lang === 'ar' ? 'مفعل' : 'Active'}
                      </label>
                      {!['women', 'men', 'handmade'].includes(col.slug) && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteCollection(col.id)}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10"
                          title={lang === 'ar' ? 'حذف التشكيلة' : 'Delete Collection'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={col.name_ar}
                      onChange={(e) =>
                        setCollections((prev) =>
                          prev.map((x) => (x.id === col.id ? { ...x, name_ar: e.target.value } : x))
                        )
                      }
                      placeholder={lang === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'}
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
                      placeholder={lang === 'ar' ? 'الاسم بالإنجليزية' : 'English Name'}
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

              <Modal
                open={colModalOpen}
                onClose={() => setColModalOpen(false)}
                title={lang === 'ar' ? 'إضافة تشكيلة جديدة' : 'Add New Collection'}
              >
                <form onSubmit={handleCreateCollection} className="space-y-3 text-xs">
                  <input
                    value={colForm.name_ar}
                    onChange={(e) => setColForm({ ...colForm, name_ar: e.target.value })}
                    placeholder={lang === 'ar' ? 'اسم التشكيلة (عربي) *' : 'Arabic Name *'}
                    required
                    className="w-full rounded-xl border bg-transparent px-3 py-2.5"
                    style={{ borderColor: 'var(--border-glass)' }}
                  />
                  <input
                    value={colForm.name_en}
                    onChange={(e) => setColForm({ ...colForm, name_en: e.target.value })}
                    placeholder={lang === 'ar' ? 'اسم التشكيلة (إنجليزي) *' : 'English Name *'}
                    required
                    className="w-full rounded-xl border bg-transparent px-3 py-2.5"
                    style={{ borderColor: 'var(--border-glass)' }}
                  />
                  <input
                    value={colForm.slug}
                    onChange={(e) => setColForm({ ...colForm, slug: e.target.value })}
                    placeholder={lang === 'ar' ? 'المعرف (اختياري، مثال: kids)' : 'Slug (optional, e.g. kids)'}
                    className="w-full rounded-xl border bg-transparent px-3 py-2.5"
                    style={{ borderColor: 'var(--border-glass)' }}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      value={colForm.theme_key}
                      onChange={(e) =>
                        setColForm({ ...colForm, theme_key: e.target.value as CollectionSlug })
                      }
                      className="rounded-xl border bg-[var(--bg-page)] px-3 py-2.5"
                      style={{ borderColor: 'var(--border-glass)' }}
                    >
                      <option value="women">{lang === 'ar' ? 'ثيم نسائي' : 'Women Theme'}</option>
                      <option value="men">{lang === 'ar' ? 'ثيم رجالي' : 'Men Theme'}</option>
                      <option value="handmade">{lang === 'ar' ? 'ثيم هاند ميد' : 'Handmade Theme'}</option>
                    </select>
                    <input
                      type="number"
                      value={colForm.sort_order}
                      onChange={(e) => setColForm({ ...colForm, sort_order: e.target.value })}
                      placeholder={lang === 'ar' ? 'الترتيب' : 'Sort Order'}
                      className="rounded-xl border bg-transparent px-3 py-2.5"
                      style={{ borderColor: 'var(--border-glass)' }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingCol}
                    className="cta-luxury w-full rounded-2xl py-2.5 font-semibold"
                  >
                    {savingCol
                      ? '...'
                      : lang === 'ar'
                        ? 'إضافة التشكيلة'
                        : 'Create Collection'}
                  </button>
                </form>
              </Modal>
            </div>
          )}

          {section === 'inquiries' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setInqModalOpen(true)}
                  className="cta-luxury inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold"
                >
                  <Plus className="h-4 w-4" />
                  <span>{lang === 'ar' ? 'إضافة استفسار' : 'Add Inquiry'}</span>
                </button>
              </div>
              <div className="glass-card divide-y rounded-3xl" style={{ borderColor: 'var(--border-glass)' }}>
                {inquiries.length === 0 ? (
                  <p className="p-8 text-center text-xs opacity-65">
                    {lang === 'ar' ? 'لا توجد استفسارات بعد.' : 'No inquiries yet.'}
                  </p>
                ) : (
                  inquiries.map((inq) => (
                    <div key={inq.id} className="flex flex-wrap items-center justify-between gap-4 p-4 text-xs">
                      <div className="space-y-1">
                        <p className="font-semibold">
                          {inq.customer_name || (lang === 'ar' ? 'زائر' : 'Guest')}{' '}
                          {inq.customer_phone ? `• ${inq.customer_phone}` : ''}
                        </p>
                        <p className="opacity-80">{inq.message}</p>
                        <p className="text-[10px] opacity-55">{new Date(inq.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewInq(inq)}
                          className="rounded-xl border p-2 hover:bg-[var(--bg-subtle)]"
                          style={{ borderColor: 'var(--border-glass)' }}
                          title={lang === 'ar' ? 'عرض / تعديل الملاحظات' : 'View / Edit Notes'}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPrefillInquiry(inq);
                            setSection('orders');
                          }}
                          className="inline-flex items-center gap-1 rounded-xl bg-[var(--accent-soft)] px-3 py-1.5 font-semibold text-[var(--accent-strong)]"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          <span>{lang === 'ar' ? 'تحويل لفاتورة' : 'Create Invoice'}</span>
                        </button>
                        <select
                          value={inq.status}
                          onChange={(e) => handleUpdateInquiryStatus(inq.id, e.target.value as Inquiry['status'])}
                          className="rounded-xl border bg-[var(--bg-page)] px-3 py-1.5"
                          style={{ borderColor: 'var(--border-glass)' }}
                        >
                          <option value="new">{lang === 'ar' ? 'جديد' : 'New'}</option>
                          <option value="contacted">{lang === 'ar' ? 'تم التواصل' : 'Contacted'}</option>
                          <option value="resolved">{lang === 'ar' ? 'تم الحل' : 'Resolved'}</option>
                          <option value="archived">{lang === 'ar' ? 'مؤرشف' : 'Archived'}</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setDeleteInqTarget(inq)}
                          className="rounded-xl p-2 text-rose-500 hover:bg-rose-500/10"
                          title={lang === 'ar' ? 'حذف' : 'Delete'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Modal
                open={inqModalOpen}
                onClose={() => setInqModalOpen(false)}
                title={lang === 'ar' ? 'إضافة استفسار جديد' : 'Add Inquiry'}
              >
                <form onSubmit={handleCreateInquiry} className="space-y-3 text-xs">
                  <input
                    value={inqForm.customer_name}
                    onChange={(e) => setInqForm({ ...inqForm, customer_name: e.target.value })}
                    placeholder={lang === 'ar' ? 'اسم العميل' : 'Customer Name'}
                    className="w-full rounded-xl border bg-transparent px-3 py-2.5"
                    style={{ borderColor: 'var(--border-glass)' }}
                  />
                  <input
                    value={inqForm.customer_phone}
                    onChange={(e) => setInqForm({ ...inqForm, customer_phone: e.target.value })}
                    placeholder={lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                    className="w-full rounded-xl border bg-transparent px-3 py-2.5"
                    style={{ borderColor: 'var(--border-glass)' }}
                  />
                  <select
                    value={inqForm.channel}
                    onChange={(e) => setInqForm({ ...inqForm, channel: e.target.value as Inquiry['channel'] })}
                    className="w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2.5"
                    style={{ borderColor: 'var(--border-glass)' }}
                  >
                    <option value="whatsapp">{lang === 'ar' ? 'واتساب' : 'WhatsApp'}</option>
                    <option value="phone">{lang === 'ar' ? 'هاتف' : 'Phone'}</option>
                    <option value="contact_form">{lang === 'ar' ? 'نموذج الموقع' : 'Contact Form'}</option>
                  </select>
                  <textarea
                    rows={3}
                    value={inqForm.message}
                    onChange={(e) => setInqForm({ ...inqForm, message: e.target.value })}
                    placeholder={lang === 'ar' ? 'تفاصيل الاستفسار...' : 'Inquiry message...'}
                    className="w-full rounded-xl border bg-transparent px-3 py-2.5"
                    style={{ borderColor: 'var(--border-glass)' }}
                  />
                  <button type="submit" className="cta-luxury w-full rounded-2xl py-2.5 font-semibold">
                    {lang === 'ar' ? 'حفظ الاستفسار' : 'Save Inquiry'}
                  </button>
                </form>
              </Modal>

              <Modal
                open={Boolean(viewInq)}
                onClose={() => setViewInq(null)}
                title={lang === 'ar' ? 'تفاصيل الاستفسار' : 'Inquiry Details'}
              >
                {viewInq && (
                  <form onSubmit={handleSaveInquiryNotes} className="space-y-3 text-xs">
                    <p><strong>{lang === 'ar' ? 'العميل:' : 'Customer:'}</strong> {viewInq.customer_name || (lang === 'ar' ? 'زائر' : 'Guest')}</p>
                    {viewInq.customer_phone && <p><strong>{lang === 'ar' ? 'الهاتف:' : 'Phone:'}</strong> {viewInq.customer_phone}</p>}
                    <p className="rounded-xl bg-[var(--bg-subtle)] p-3">{viewInq.message}</p>
                    <select
                      value={viewInq.status}
                      onChange={(e) => setViewInq({ ...viewInq, status: e.target.value as Inquiry['status'] })}
                      className="w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2"
                      style={{ borderColor: 'var(--border-glass)' }}
                    >
                      <option value="new">{lang === 'ar' ? 'جديد' : 'New'}</option>
                      <option value="contacted">{lang === 'ar' ? 'تم التواصل' : 'Contacted'}</option>
                      <option value="resolved">{lang === 'ar' ? 'تم الحل' : 'Resolved'}</option>
                      <option value="archived">{lang === 'ar' ? 'مؤرشف' : 'Archived'}</option>
                    </select>
                    <textarea
                      rows={3}
                      value={viewInq.admin_notes || ''}
                      onChange={(e) => setViewInq({ ...viewInq, admin_notes: e.target.value })}
                      placeholder={lang === 'ar' ? 'ملاحظات الإدارة...' : 'Admin notes...'}
                      className="w-full rounded-xl border bg-transparent px-3 py-2.5"
                      style={{ borderColor: 'var(--border-glass)' }}
                    />
                    <button type="submit" className="cta-luxury w-full rounded-2xl py-2.5 font-semibold">
                      {lang === 'ar' ? 'حفظ التعديلات' : 'Save Updates'}
                    </button>
                  </form>
                )}
              </Modal>

              <ConfirmDialog
                open={Boolean(deleteInqTarget)}
                onClose={() => setDeleteInqTarget(null)}
                onConfirm={confirmDeleteInquiry}
                title={lang === 'ar' ? 'حذف الاستفسار' : 'Delete Inquiry'}
                message={lang === 'ar' ? 'هل أنت متأكد من حذف هذا الاستفسار؟' : 'Delete this inquiry?'}
                confirmLabel={lang === 'ar' ? 'حذف' : 'Delete'}
                cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
                danger
              />
            </div>
          )}

          {section === 'chat' && (
            <AdminChatInbox
              lang={lang}
              conversations={conversations}
              selectedId={selectedChatId}
              onSelectId={handleSelectChat}
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
                      <button
                        type="button"
                        onClick={() => setPreviewBanner(b)}
                        className="rounded-xl p-2 hover:bg-[var(--bg-subtle)]"
                        title={lang === 'ar' ? 'معاينة الإعلان' : 'Preview Ad'}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleToggleBanner(b)} className="rounded-xl border px-3 py-1" style={{ borderColor: 'var(--border-glass)' }}>
                        {b.is_active ? (lang === 'ar' ? 'مفعل' : 'Active') : (lang === 'ar' ? 'معطل' : 'Inactive')}
                      </button>
                      <button type="button" onClick={() => openEditBanner(b)} className="rounded-xl p-2 hover:bg-[var(--accent-soft)]" title={lang === 'ar' ? 'تعديل' : 'Edit'}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setDeleteBannerTarget(b)} className="rounded-xl p-2 text-rose-500 hover:bg-rose-500/10" title={lang === 'ar' ? 'حذف' : 'Delete'}>
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
                      <label className="mb-1 block text-xs font-semibold">{lang === 'ar' ? 'الموقع' : 'Placement'}</label>
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
                        <option value="hero">{lang === 'ar' ? 'رئيسي (Hero)' : 'Hero'}</option>
                        <option value="promo">{lang === 'ar' ? 'ترويجي (Promo)' : 'Promo'}</option>
                        <option value="offer">{lang === 'ar' ? 'عرض (Offer)' : 'Offer'}</option>
                        <option value="video_ad">{lang === 'ar' ? 'إعلان فيديو متحرك' : 'Video Ad (Animated Section)'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">{lang === 'ar' ? 'نوع الوسائط' : 'Media Type'}</label>
                      <select
                        value={bannerForm.media_type}
                        onChange={(e) => setBannerForm({ ...bannerForm, media_type: e.target.value as 'image' | 'video' })}
                        className="w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2"
                        style={{ borderColor: 'var(--border-glass)' }}
                      >
                        <option value="image">{lang === 'ar' ? 'صورة' : 'Image'}</option>
                        <option value="video">{lang === 'ar' ? 'فيديو' : 'Video'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">{lang === 'ar' ? 'رابط الصورة / الملصق أو رفع ملف' : 'Image / Poster URL or Upload'}</label>
                      <input
                        value={bannerForm.image_url}
                        onChange={(e) => setBannerForm({ ...bannerForm, image_url: e.target.value })}
                        className="w-full rounded-xl border bg-transparent px-3 py-2"
                        style={{ borderColor: 'var(--border-glass)' }}
                      />
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingBannerMedia}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadBannerMedia(f, 'image');
                        }}
                        className="mt-1.5 block w-full text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">{lang === 'ar' ? 'رابط الفيديو (.mp4 / .webm) أو رفع ملف' : 'Video URL (.mp4 / .webm) or Upload'}</label>
                      <input
                        value={bannerForm.video_url}
                        onChange={(e) => setBannerForm({ ...bannerForm, video_url: e.target.value })}
                        placeholder="https://.../ad-video.mp4"
                        className="w-full rounded-xl border bg-transparent px-3 py-2"
                        style={{ borderColor: 'var(--border-glass)' }}
                      />
                      <input
                        type="file"
                        accept="video/mp4,video/webm"
                        disabled={uploadingBannerMedia}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadBannerMedia(f, 'video');
                        }}
                        className="mt-1.5 block w-full text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">{lang === 'ar' ? 'العنوان (عربي) *' : 'Title AR *'}</label>
                      <input
                        required
                        value={bannerForm.title_ar}
                        onChange={(e) => setBannerForm({ ...bannerForm, title_ar: e.target.value })}
                        className="w-full rounded-xl border bg-transparent px-3 py-2"
                        style={{ borderColor: 'var(--border-glass)' }}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">{lang === 'ar' ? 'العنوان (إنجليزي) *' : 'Title EN *'}</label>
                      <input
                        required
                        value={bannerForm.title_en}
                        onChange={(e) => setBannerForm({ ...bannerForm, title_en: e.target.value })}
                        className="w-full rounded-xl border bg-transparent px-3 py-2"
                        style={{ borderColor: 'var(--border-glass)' }}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">{lang === 'ar' ? 'العنوان الفرعي (عربي)' : 'Subtitle AR'}</label>
                      <input
                        value={bannerForm.subtitle_ar}
                        onChange={(e) => setBannerForm({ ...bannerForm, subtitle_ar: e.target.value })}
                        className="w-full rounded-xl border bg-transparent px-3 py-2"
                        style={{ borderColor: 'var(--border-glass)' }}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">{lang === 'ar' ? 'العنوان الفرعي (إنجليزي)' : 'Subtitle EN'}</label>
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
                    <label className="mb-1 block text-xs font-semibold">{lang === 'ar' ? 'اللغة الافتراضية' : 'Default Language'}</label>
                    <select
                      value={settingsForm.default_language}
                      onChange={(e) => setSettingsForm({ ...settingsForm, default_language: e.target.value as Language })}
                      className="w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2"
                      style={{ borderColor: 'var(--border-glass)' }}
                    >
                      <option value="ar">{lang === 'ar' ? 'العربية (RTL)' : 'Arabic (RTL)'}</option>
                      <option value="en">{lang === 'ar' ? 'الإنجليزية (LTR)' : 'English (LTR)'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">{lang === 'ar' ? 'المظهر الافتراضي' : 'Default Theme'}</label>
                    <select
                      value={settingsForm.default_theme}
                      onChange={(e) => setSettingsForm({ ...settingsForm, default_theme: e.target.value as ThemeMode })}
                      className="w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2"
                      style={{ borderColor: 'var(--border-glass)' }}
                    >
                      <option value="light">{lang === 'ar' ? 'الوضع النهاري' : 'Light Mode'}</option>
                      <option value="dark">{lang === 'ar' ? 'الوضع الداكن' : 'Dark Mode'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">{lang === 'ar' ? 'هوية التشكيلة الافتراضية' : 'Default Collection Identity'}</label>
                    <select
                      value={settingsForm.default_collection_theme}
                      onChange={(e) => setSettingsForm({ ...settingsForm, default_collection_theme: e.target.value as CollectionSlug })}
                      className="w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2"
                      style={{ borderColor: 'var(--border-glass)' }}
                    >
                      <option value="women">{lang === 'ar' ? 'نسائي' : 'Women'}</option>
                      <option value="men">{lang === 'ar' ? 'رجالي' : 'Men'}</option>
                      <option value="handmade">{lang === 'ar' ? 'هاند ميد' : 'Handmade'}</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 pt-6 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={settingsForm.enable_guest_chat}
                      onChange={(e) => setSettingsForm({ ...settingsForm, enable_guest_chat: e.target.checked })}
                    />
                    {lang === 'ar' ? 'تفعيل نافذة المحادثة المباشرة للزوار' : 'Enable Floating Guest Chat'}
                  </label>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">{lang === 'ar' ? 'اسم المتجر (عربي)' : 'Store Name AR'}</label>
                    <input value={settingsForm.store_name_ar} onChange={(e) => setSettingsForm({ ...settingsForm, store_name_ar: e.target.value })} className="w-full rounded-xl border bg-transparent px-3 py-2" style={{ borderColor: 'var(--border-glass)' }} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">{lang === 'ar' ? 'اسم المتجر (إنجليزي)' : 'Store Name EN'}</label>
                    <input value={settingsForm.store_name_en} onChange={(e) => setSettingsForm({ ...settingsForm, store_name_en: e.target.value })} className="w-full rounded-xl border bg-transparent px-3 py-2" style={{ borderColor: 'var(--border-glass)' }} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">{lang === 'ar' ? 'رقم الواتساب (مع رمز الدولة)' : 'WhatsApp Number (digits with country code)'}</label>
                    <input value={settingsForm.whatsapp_number} onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp_number: e.target.value })} className="w-full rounded-xl border bg-transparent px-3 py-2" style={{ borderColor: 'var(--border-glass)' }} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">{lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</label>
                    <input value={settingsForm.phone_number} onChange={(e) => setSettingsForm({ ...settingsForm, phone_number: e.target.value })} className="w-full rounded-xl border bg-transparent px-3 py-2" style={{ borderColor: 'var(--border-glass)' }} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
                    <input value={settingsForm.email} onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })} className="w-full rounded-xl border bg-transparent px-3 py-2" style={{ borderColor: 'var(--border-glass)' }} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">{lang === 'ar' ? 'العملة' : 'Currency'}</label>
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
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">{lang === 'ar' ? 'المسؤولون المصرح لهم' : 'Authorized Admin Users'}</h3>
                {currentAdmin.role === 'super_admin' && (
                  <button
                    type="button"
                    onClick={() => setUserModalOpen(true)}
                    className="cta-luxury inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{lang === 'ar' ? 'إضافة مسؤول' : 'Add Admin'}</span>
                  </button>
                )}
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border-glass)' }}>
                {adminUsers.map((u) => (
                  <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-semibold">{u.email}</p>
                      <p className="opacity-65">
                        {u.role} • {u.is_active ? (lang === 'ar' ? 'مفعل' : 'Active') : (lang === 'ar' ? 'معطل' : 'Inactive')}
                      </p>
                    </div>
                    {currentAdmin.role === 'super_admin' && u.id !== currentAdmin.id && (
                      <div className="flex items-center gap-2">
                        <select
                          value={u.role}
                          onChange={async (e) => {
                            const nextRole = e.target.value as AdminUser['role'];
                            const supabase = createClient();
                            const { error } = await supabase.from('admin_users').update({ role: nextRole }).eq('id', u.id);
                            if (error) {
                              notify(error.message, true);
                              return;
                            }
                            setAdminUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: nextRole } : x)));
                            notify(lang === 'ar' ? 'تم تحديث الصلاحية' : 'Role updated');
                          }}
                          className="rounded-xl border bg-[var(--bg-page)] px-2.5 py-1"
                          style={{ borderColor: 'var(--border-glass)' }}
                        >
                          <option value="super_admin">super_admin</option>
                          <option value="admin">admin</option>
                          <option value="editor">editor</option>
                        </select>
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
                          {u.is_active ? (lang === 'ar' ? 'إلغاء التفعيل' : 'Deactivate') : (lang === 'ar' ? 'تفعيل' : 'Activate')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteUserTarget(u)}
                          className="rounded-xl p-1.5 text-rose-500 hover:bg-rose-500/10"
                          title={lang === 'ar' ? 'حذف' : 'Delete'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Modal
                open={userModalOpen}
                onClose={() => setUserModalOpen(false)}
                title={lang === 'ar' ? 'إضافة مسؤول جديد' : 'Add Admin User'}
              >
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const supabase = createClient();
                    const { data, error } = await supabase
                      .from('admin_users')
                      .insert({
                        email: userForm.email.trim().toLowerCase(),
                        full_name: userForm.full_name.trim() || null,
                        role: userForm.role,
                        is_active: true,
                      })
                      .select('*')
                      .single();
                    if (error || !data) {
                      notify(error?.message || 'Failed', true);
                      return;
                    }
                    setAdminUsers((prev) => [...prev, data as AdminUser]);
                    setUserModalOpen(false);
                    setUserForm({ email: '', full_name: '', role: 'editor' });
                    notify(lang === 'ar' ? 'تمت إضافة المسؤول' : 'Admin user added');
                  }}
                  className="space-y-3 text-xs"
                >
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder={lang === 'ar' ? 'البريد الإلكتروني *' : 'Email *'}
                    className="w-full rounded-xl border bg-transparent px-3 py-2.5"
                    style={{ borderColor: 'var(--border-glass)' }}
                  />
                  <input
                    value={userForm.full_name}
                    onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                    placeholder={lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                    className="w-full rounded-xl border bg-transparent px-3 py-2.5"
                    style={{ borderColor: 'var(--border-glass)' }}
                  />
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as AdminUser['role'] })}
                    className="w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2.5"
                    style={{ borderColor: 'var(--border-glass)' }}
                  >
                    <option value="editor">editor</option>
                    <option value="admin">admin</option>
                    <option value="super_admin">super_admin</option>
                  </select>
                  <button type="submit" className="cta-luxury w-full rounded-2xl py-2.5 font-semibold">
                    {lang === 'ar' ? 'حفظ المسؤول' : 'Save Admin'}
                  </button>
                </form>
              </Modal>

              <ConfirmDialog
                open={Boolean(deleteUserTarget)}
                onClose={() => setDeleteUserTarget(null)}
                onConfirm={async () => {
                  if (!deleteUserTarget) return;
                  const supabase = createClient();
                  const { error } = await supabase.from('admin_users').delete().eq('id', deleteUserTarget.id);
                  if (error) {
                    notify(error.message, true);
                    return;
                  }
                  setAdminUsers((prev) => prev.filter((x) => x.id !== deleteUserTarget.id));
                  setDeleteUserTarget(null);
                  notify(lang === 'ar' ? 'تم حذف المسؤول' : 'Admin deleted');
                }}
                title={lang === 'ar' ? 'حذف المسؤول' : 'Delete Admin'}
                message={
                  lang === 'ar'
                    ? `هل أنت متأكد من حذف ${deleteUserTarget?.email || ''}؟`
                    : `Delete ${deleteUserTarget?.email || ''}?`
                }
                confirmLabel={lang === 'ar' ? 'حذف' : 'Delete'}
                cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
                danger
              />
            </div>
          )}

          <Modal
            open={Boolean(previewBanner)}
            onClose={() => setPreviewBanner(null)}
            maxWidthClass="max-w-2xl"
            title={lang === 'ar' ? 'معاينة الإعلان' : 'Ad Banner Preview'}
          >
            {previewBanner && (
              <div className="space-y-3 text-xs">
                <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border-glass)' }}>
                  {previewBanner.media_type === 'video' && previewBanner.video_url ? (
                    <video src={previewBanner.video_url} poster={previewBanner.image_url || undefined} controls className="h-full w-full object-cover" />
                  ) : (
                    <img src={previewBanner.image_url || '/images/hero-boutique.png'} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <p className="text-sm font-bold">{lang === 'ar' ? previewBanner.title_ar : previewBanner.title_en}</p>
                <p className="opacity-80">{lang === 'ar' ? previewBanner.subtitle_ar : previewBanner.subtitle_en}</p>
              </div>
            )}
          </Modal>
        </section>
      </div>

      {/* On-demand Responsive Admin Chat Modal across all dashboard tabs */}
      <AdminChatBubble
        lang={lang}
        adminId={currentAdmin.id}
        conversationId={selectedChatId}
        conversation={conversations.find((c) => c.id === selectedChatId) || null}
        isOpen={bubbleOpen}
        isMinimized={bubbleMinimized}
        latestIncomingMessage={latestGuestMessage}
        setConversations={setConversations}
        onNotify={notify}
        onMinimize={() => setBubbleMinimized(true)}
        onClose={() => {
          setBubbleOpen(false);
          setBubbleMinimized(false);
        }}
      />
    </div>
  );
}
