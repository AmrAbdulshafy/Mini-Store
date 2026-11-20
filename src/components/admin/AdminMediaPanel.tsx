'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Eye, ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { Language } from '@/types/database';

interface StorageItem {
  name: string;
  url: string;
  path: string;
}

export function AdminMediaPanel({
  lang,
  onNotify,
}: {
  lang: Language;
  onNotify: (msg: string, isError?: boolean) => void;
}) {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewItem, setPreviewItem] = useState<StorageItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StorageItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: rootFiles } = await supabase.storage.from('boutique-media').list('uploads', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

      const list: StorageItem[] = (rootFiles || [])
        .filter((f) => f.name && !f.name.startsWith('.'))
        .map((f) => {
          const path = `uploads/${f.name}`;
          const { data: pub } = supabase.storage.from('boutique-media').getPublicUrl(path);
          return { name: f.name, path, url: pub.publicUrl };
        });

      setItems(list);
    } catch {
      onNotify(lang === 'ar' ? 'تعذر تحميل الوسائط' : 'Failed to load media', true);
    } finally {
      setLoading(false);
    }
  }, [lang, onNotify]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadFiles();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const supabase = createClient();
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `uploads/${Date.now()}-${i}.${ext}`;
        const { error } = await supabase.storage.from('boutique-media').upload(path, file, { upsert: true });
        if (error) throw error;
      }
      await loadFiles();
      onNotify(lang === 'ar' ? 'تم رفع الملفات بنجاح' : 'Media uploaded');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Upload failed', true);
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.storage.from('boutique-media').remove([deleteTarget.path]);
      if (error) {
        onNotify(error.message, true);
        return;
      }
      setItems((prev) => prev.filter((x) => x.path !== deleteTarget.path));
      setDeleteTarget(null);
      onNotify(lang === 'ar' ? 'تم الحذف' : 'Deleted');
    } finally {
      setDeleting(false);
    }
  };

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    onNotify(lang === 'ar' ? 'تم نسخ الرابط' : 'URL copied');
  };

  return (
    <div className="space-y-5">
      <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-3xl p-5">
        <label className="cta-luxury inline-flex cursor-pointer items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-semibold">
          <ImagePlus className="h-4 w-4" />
          <span>{uploading ? '...' : lang === 'ar' ? 'رفع صور جديدة' : 'Upload Images'}</span>
          <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
        </label>
        <button
          type="button"
          onClick={loadFiles}
          className="inline-flex items-center gap-1.5 rounded-2xl border px-4 py-2 text-xs font-semibold hover:bg-[var(--accent-soft)]"
          style={{ borderColor: 'var(--border-glass)' }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{lang === 'ar' ? 'تحديث' : 'Refresh'}</span>
        </button>
      </div>

      {loading ? (
        <div className="glass-card rounded-3xl p-10 text-center text-xs opacity-70">Loading...</div>
      ) : items.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-xs opacity-70">
          {lang === 'ar' ? 'لا توجد صور مرفوعة في مجلد uploads بعد.' : 'No uploaded media files yet.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.path} className="glass-card overflow-hidden rounded-2xl p-3">
              <button
                type="button"
                onClick={() => setPreviewItem(item)}
                className="group relative block aspect-square w-full overflow-hidden rounded-xl bg-[var(--bg-subtle)]"
              >
                <img src={item.url} alt={item.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                  <Eye className="h-5 w-5 text-white" />
                </span>
              </button>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className="truncate text-[11px] opacity-75">{item.name}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => handleCopy(item.url)} className="rounded-lg p-1.5 hover:bg-[var(--accent-soft)]">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(item)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      <Modal
        open={Boolean(previewItem)}
        onClose={() => setPreviewItem(null)}
        maxWidthClass="max-w-3xl"
        title={previewItem?.name}
      >
        {previewItem && (
          <div className="space-y-4">
            <img src={previewItem.url} alt={previewItem.name} className="max-h-[70vh] w-full rounded-2xl object-contain bg-[var(--bg-subtle)]" />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleCopy(previewItem.url)}
                className="cta-luxury inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{lang === 'ar' ? 'نسخ الرابط' : 'Copy URL'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title={lang === 'ar' ? 'حذف الملف' : 'Delete Media File'}
        message={
          lang === 'ar'
            ? `هل أنت متأكد من حذف "${deleteTarget?.name || ''}"؟`
            : `Permanently delete "${deleteTarget?.name || ''}"?`
        }
        confirmLabel={lang === 'ar' ? 'حذف' : 'Delete'}
        cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
      />
    </div>
  );
}
