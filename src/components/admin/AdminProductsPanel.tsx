'use client';

import React, { useState } from 'react';
import {
  Archive,
  Eye,
  EyeOff,
  ImagePlus,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type {
  AvailabilityStatus,
  Category,
  Collection,
  Language,
  Product,
  ProductImage,
} from '@/types/database';

interface Props {
  lang: Language;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  categories: Category[];
  collections: Collection[];
  onNotify: (msg: string, isError?: boolean) => void;
}

const emptyForm = {
  id: '',
  sku: '',
  slug: '',
  name_ar: '',
  name_en: '',
  description_ar: '',
  description_en: '',
  price: '0',
  previous_price: '',
  currency: 'EGP',
  category_id: '',
  collection_id: '',
  availability_status: 'in_stock' as AvailabilityStatus,
  stock_quantity: '10',
  colors: '',
  sizes: '',
  width_cm: '',
  is_featured: false,
  is_new_arrival: false,
  is_special_offer: false,
  is_visible: true,
  is_archived: false,
};

export function AdminProductsPanel({
  lang,
  products,
  setProducts,
  categories,
  collections,
  onNotify,
}: Props) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteImgTarget, setDeleteImgTarget] = useState<ProductImage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = products.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${p.name_ar} ${p.name_en} ${p.sku || ''}`.toLowerCase().includes(q);
  });

  const openCreate = () => {
    setForm({
      ...emptyForm,
      collection_id: collections[0]?.id || '',
      category_id: categories[0]?.id || '',
    });
    setExistingImages([]);
    setNewFiles([]);
    setEditing(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      id: p.id,
      sku: p.sku || '',
      slug: p.slug,
      name_ar: p.name_ar,
      name_en: p.name_en,
      description_ar: p.description_ar,
      description_en: p.description_en,
      price: String(p.price),
      previous_price: p.previous_price ? String(p.previous_price) : '',
      currency: p.currency || 'EGP',
      category_id: p.category_id || '',
      collection_id: p.collection_id || '',
      availability_status: p.availability_status,
      stock_quantity: String(typeof p.stock_quantity === 'number' ? p.stock_quantity : 10),
      colors: Array.isArray(p.colors) ? p.colors.join(', ') : '',
      sizes: Array.isArray(p.sizes) ? p.sizes.join(', ') : '',
      width_cm: p.width_cm || p.dimensions || '',
      is_featured: p.is_featured,
      is_new_arrival: p.is_new_arrival,
      is_special_offer: p.is_special_offer,
      is_visible: p.is_visible,
      is_archived: p.is_archived,
    });
    setExistingImages(p.product_images || []);
    setNewFiles([]);
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const supabase = createClient();
      const slugValue =
        form.slug.trim() ||
        `${form.name_en
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;

      const payload = {
        sku: form.sku.trim() || null,
        slug: slugValue,
        name_ar: form.name_ar.trim(),
        name_en: form.name_en.trim(),
        description_ar: form.description_ar.trim(),
        description_en: form.description_en.trim(),
        price: Number(form.price) || 0,
        previous_price: form.previous_price ? Number(form.previous_price) : null,
        currency: form.currency || 'EGP',
        category_id: form.category_id || null,
        collection_id: form.collection_id || null,
        availability_status: form.availability_status,
        stock_quantity: Math.max(0, parseInt(form.stock_quantity, 10) || 0),
        colors: form.colors
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        sizes: form.sizes
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        width_cm: form.width_cm.trim() || null,
        is_featured: form.is_featured,
        is_new_arrival: form.is_new_arrival,
        is_special_offer: form.is_special_offer,
        is_visible: form.is_visible,
        is_archived: form.is_archived,
        is_demo: false,
      };

      let productId = form.id;
      if (productId) {
        const { error } = await supabase.from('products').update(payload).eq('id', productId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert(payload)
          .select('id')
          .single();
        if (error || !data) throw error;
        productId = data.id;
      }

      for (let idx = 0; idx < newFiles.length; idx++) {
        const file = newFiles[idx];
        const ext = file.name.split('.').pop() || 'jpg';
        const storagePath = `products/${productId}/${Date.now()}-${idx}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('boutique-media')
          .upload(storagePath, file, { upsert: true });
        if (uploadErr) throw uploadErr;

        const { data: pub } = supabase.storage.from('boutique-media').getPublicUrl(storagePath);
        await supabase.from('product_images').insert({
          product_id: productId,
          image_url: pub.publicUrl,
          storage_path: storagePath,
          is_primary: existingImages.length === 0 && idx === 0,
          sort_order: existingImages.length + idx,
        });
      }

      const { data: refreshed } = await supabase
        .from('products')
        .select('*, product_images(*), categories(*), collections(*)')
        .order('created_at', { ascending: false });
      if (refreshed) setProducts(refreshed as Product[]);

      setEditing(false);
      onNotify(lang === 'ar' ? 'تم حفظ المنتج بنجاح' : 'Product saved successfully');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : lang === 'ar' ? 'فشل حفظ المنتج' : 'Failed to save product',
        true
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteImage = async () => {
    if (!deleteImgTarget) return;
    setDeleting(true);
    try {
      const supabase = createClient();
      if (deleteImgTarget.storage_path) {
        await supabase.storage.from('boutique-media').remove([deleteImgTarget.storage_path]);
      }
      await supabase.from('product_images').delete().eq('id', deleteImgTarget.id);
      setExistingImages((prev) => prev.filter((x) => x.id !== deleteImgTarget.id));
      setProducts((prev) =>
        prev.map((p) =>
          p.id === deleteImgTarget.product_id
            ? { ...p, product_images: (p.product_images || []).filter((x) => x.id !== deleteImgTarget.id) }
            : p
        )
      );
      setDeleteImgTarget(null);
      onNotify(lang === 'ar' ? 'تم حذف الصورة' : 'Image deleted');
    } finally {
      setDeleting(false);
    }
  };

  const handleSetPrimaryImage = async (img: ProductImage) => {
    const supabase = createClient();
    await supabase.from('product_images').update({ is_primary: false }).eq('product_id', img.product_id);
    await supabase.from('product_images').update({ is_primary: true }).eq('id', img.id);
    setExistingImages((prev) => prev.map((x) => ({ ...x, is_primary: x.id === img.id })));
    onNotify(lang === 'ar' ? 'تم تعيين الصورة الرئيسية' : 'Primary image updated');
  };

  const toggleFlag = async (
    p: Product,
    field: 'is_visible' | 'is_featured' | 'is_archived'
  ) => {
    const supabase = createClient();
    const nextVal = !p[field];
    const { error } = await supabase.from('products').update({ [field]: nextVal }).eq('id', p.id);
    if (error) {
      onNotify(error.message, true);
      return;
    }
    setProducts((prev) => prev.map((item) => (item.id === p.id ? { ...item, [field]: nextVal } : item)));
  };

  const confirmDeleteProduct = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('products').delete().eq('id', deleteTarget.id);
      if (error) {
        onNotify(error.message, true);
        return;
      }
      setProducts((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      onNotify(lang === 'ar' ? 'تم حذف المنتج' : 'Product deleted');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={lang === 'ar' ? 'ابحث في المنتجات...' : 'Search products...'}
          className="w-full max-w-xs rounded-2xl border bg-transparent px-4 py-2 text-sm outline-none focus:border-[var(--accent)]"
          style={{ borderColor: 'var(--border-glass)' }}
        />
        <button
          type="button"
          onClick={openCreate}
          className="cta-luxury inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span>{lang === 'ar' ? 'إضافة منتج' : 'Add Product'}</span>
        </button>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        maxWidthClass="max-w-3xl"
        title={
          form.id
            ? lang === 'ar'
              ? 'تعديل المنتج'
              : 'Edit Product'
            : lang === 'ar'
              ? 'إضافة منتج جديد'
              : 'New Product'
        }
      >
        <form onSubmit={handleSave} className="space-y-4 text-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold">Name AR *</label>
              <input
                required
                value={form.name_ar}
                onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                className="w-full rounded-xl border bg-transparent px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Name EN *</label>
              <input
                required
                value={form.name_en}
                onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                className="w-full rounded-xl border bg-transparent px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">SKU / Code</label>
              <input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="w-full rounded-xl border bg-transparent px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Slug</label>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="auto-generated-if-empty"
                className="w-full rounded-xl border bg-transparent px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Price (EGP) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full rounded-xl border bg-transparent px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Previous Price</label>
              <input
                type="number"
                step="0.01"
                value={form.previous_price}
                onChange={(e) => setForm({ ...form, previous_price: e.target.value })}
                className="w-full rounded-xl border bg-transparent px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Collection</label>
              <select
                value={form.collection_id}
                onChange={(e) => setForm({ ...form, collection_id: e.target.value })}
                className="w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              >
                <option value="">--</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === 'ar' ? c.name_ar : c.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Category</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              >
                <option value="">--</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === 'ar' ? c.name_ar : c.name_en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold">Description AR</label>
              <textarea
                rows={3}
                value={form.description_ar}
                onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                className="w-full rounded-xl border bg-transparent px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Description EN</label>
              <textarea
                rows={3}
                value={form.description_en}
                onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                className="w-full rounded-xl border bg-transparent px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold">Availability</label>
              <select
                value={form.availability_status}
                onChange={(e) =>
                  setForm({ ...form, availability_status: e.target.value as AvailabilityStatus })
                }
                className="w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              >
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="made_to_order">Made to Order</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-5 text-xs">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                />
                Featured
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={form.is_new_arrival}
                  onChange={(e) => setForm({ ...form, is_new_arrival: e.target.checked })}
                />
                New
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={form.is_special_offer}
                  onChange={(e) => setForm({ ...form, is_special_offer: e.target.checked })}
                />
                Offer
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={form.is_visible}
                  onChange={(e) => setForm({ ...form, is_visible: e.target.checked })}
                />
                Visible
              </label>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold">
                {lang === 'ar' ? 'الكمية المتاحة (Stock)' : 'Stock Quantity'}
              </label>
              <input
                type="number"
                min="0"
                value={form.stock_quantity}
                onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                className="w-full rounded-xl border bg-transparent px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">
                {lang === 'ar' ? 'الألوان (مفصولة بفاصلة)' : 'Colors (comma-sep)'}
              </label>
              <input
                value={form.colors}
                onChange={(e) => setForm({ ...form, colors: e.target.value })}
                placeholder="#8E3A59, #D4B483, #1A1016"
                className="w-full rounded-xl border bg-transparent px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">
                {lang === 'ar' ? 'المقاسات (مفصولة بفاصلة)' : 'Sizes (comma-sep)'}
              </label>
              <input
                value={form.sizes}
                onChange={(e) => setForm({ ...form, sizes: e.target.value })}
                placeholder="S, M, L, XL"
                className="w-full rounded-xl border bg-transparent px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">
                {lang === 'ar' ? 'العرض / الأبعاد' : 'Width / Dimensions'}
              </label>
              <input
                value={form.width_cm}
                onChange={(e) => setForm({ ...form, width_cm: e.target.value })}
                placeholder="45 × 30 cm"
                className="w-full rounded-xl border bg-transparent px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              />
            </div>
          </div>

          {/* Images */}
          <div className="space-y-2 rounded-2xl border p-4" style={{ borderColor: 'var(--border-glass)' }}>
            <label className="flex items-center gap-2 text-xs font-semibold">
              <ImagePlus className="h-4 w-4 text-[var(--accent)]" />
              <span>{lang === 'ar' ? 'صور المنتج (متعددة)' : 'Product Images (Multiple)'}</span>
            </label>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(e) => setNewFiles(Array.from(e.target.files || []))}
              className="block w-full text-xs"
            />
            {existingImages.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-2">
                {existingImages.map((img) => (
                  <div key={img.id} className="relative h-20 w-20 overflow-hidden rounded-xl border">
                    <button type="button" onClick={() => setLightboxUrl(img.image_url)} className="h-full w-full">
                      <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/65 p-1">
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(img)}
                        className={`text-[10px] ${img.is_primary ? 'text-[#FFC247]' : 'text-white/70'}`}
                        title="Primary"
                      >
                        ★
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteImgTarget(img)}
                        className="text-[10px] text-rose-300"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="w-full rounded-md border px-5 py-2.5 text-xs font-semibold sm:w-auto"
              style={{ borderColor: 'var(--border-glass)' }}
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="cta-luxury w-full rounded-md px-6 py-2.5 text-xs font-semibold disabled:opacity-50 sm:w-auto"
            >
              {saving ? '...' : lang === 'ar' ? 'حفظ المنتج' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Table */}
      <div className="glass-card overflow-x-auto rounded-3xl">
        <table className="w-full text-start text-xs sm:text-sm">
          <thead>
            <tr className="border-b text-[var(--text-secondary)]" style={{ borderColor: 'var(--border-glass)' }}>
              <th className="p-4 text-start">{lang === 'ar' ? 'المنتج' : 'Product'}</th>
              <th className="p-4 text-start">{lang === 'ar' ? 'السعر' : 'Price'}</th>
              <th className="p-4 text-start">{lang === 'ar' ? 'التوفر' : 'Status'}</th>
              <th className="p-4 text-start">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const img = p.product_images?.find((i) => i.is_primary)?.image_url || p.product_images?.[0]?.image_url;
              return (
                <tr key={p.id} className="border-b last:border-0" style={{ borderColor: 'var(--border-glass)' }}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(img || '/images/collection-women.svg')}
                        className="shrink-0 overflow-hidden rounded-xl"
                        title={lang === 'ar' ? 'معاينة الصورة' : 'Preview image'}
                      >
                        <img
                          src={img || '/images/collection-women.svg'}
                          alt=""
                          className="h-11 w-11 object-cover bg-[var(--bg-subtle)] transition-transform hover:scale-110"
                        />
                      </button>
                      <div>
                        <p className="font-semibold">{lang === 'ar' ? p.name_ar : p.name_en}</p>
                        <p className="text-[11px] opacity-65">{p.sku || p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-semibold">{p.price} {p.currency}</td>
                  <td className="p-4">
                    <span className="rounded-full bg-[var(--bg-subtle)] px-2.5 py-1 text-[11px]">
                      {p.availability_status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="rounded-xl p-2 hover:bg-[var(--accent-soft)]"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleFlag(p, 'is_featured')}
                        className={`rounded-xl p-2 hover:bg-[var(--accent-soft)] ${p.is_featured ? 'text-[#FFC247]' : 'opacity-40'}`}
                        title="Featured"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleFlag(p, 'is_visible')}
                        className="rounded-xl p-2 hover:bg-[var(--accent-soft)]"
                        title="Visibility"
                      >
                        {p.is_visible ? <Eye className="h-4 w-4 text-emerald-500" /> : <EyeOff className="h-4 w-4 opacity-50" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleFlag(p, 'is_archived')}
                        className={`rounded-xl p-2 hover:bg-[var(--accent-soft)] ${p.is_archived ? 'text-amber-500' : 'opacity-50'}`}
                        title="Archive"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                        className="rounded-xl p-2 text-rose-500 hover:bg-rose-500/10"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Image Lightbox */}
      <Modal
        open={Boolean(lightboxUrl)}
        onClose={() => setLightboxUrl(null)}
        maxWidthClass="max-w-2xl"
        title={lang === 'ar' ? 'معاينة الصورة' : 'Image Preview'}
      >
        {lightboxUrl && (
          <img
            src={lightboxUrl}
            alt="Product preview"
            className="max-h-[70vh] w-full rounded-2xl object-contain bg-[var(--bg-subtle)]"
          />
        )}
      </Modal>

      {/* Delete Product Confirm */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteProduct}
        loading={deleting}
        title={lang === 'ar' ? 'حذف المنتج' : 'Delete Product'}
        message={
          lang === 'ar'
            ? `هل أنت متأكد من حذف "${deleteTarget?.name_ar || ''}" نهائياً؟`
            : `Permanently delete "${deleteTarget?.name_en || ''}"?`
        }
        confirmLabel={lang === 'ar' ? 'حذف' : 'Delete'}
        cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
      />

      {/* Delete Image Confirm */}
      <ConfirmDialog
        open={Boolean(deleteImgTarget)}
        onClose={() => setDeleteImgTarget(null)}
        onConfirm={confirmDeleteImage}
        loading={deleting}
        title={lang === 'ar' ? 'حذف الصورة' : 'Delete Image'}
        message={lang === 'ar' ? 'هل تريد حذف هذه الصورة من المنتج؟' : 'Remove this image from the product?'}
        confirmLabel={lang === 'ar' ? 'حذف' : 'Delete'}
        cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
      />
    </div>
  );
}
