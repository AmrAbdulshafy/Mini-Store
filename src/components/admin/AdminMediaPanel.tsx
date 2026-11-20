'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Copy, ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
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

  const handleDelete = async (item: StorageItem) => {
    if (!confirm(lang === 'ar' ? 'حذف هذا الملف؟' : 'Delete this file?')) return;
    const supabase = createClient();
    const { error } = await supabase.storage.from('boutique-media').remove([item.path]);
    if (error) {
      onNotify(error.message, true);
      return;
    }
    setItems((prev) => prev.filter((x) => x.path !== item.path));
    onNotify(lang === 'ar' ? 'تم الحذف' : 'Deleted');
  };

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    onNotify(lang === 'ar' ? 'تم نسخ الرابط' : 'URL copied');
  };

  return (
    <div className="space-y-5">
      <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-3xl p-5">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }}>
          <ImagePlus className="h-4 w-4" />
          <span>{uploading ? '...' : lang === 'ar' ? 'رفع صور جديدة' : 'Upload Images'}</span>
          <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
        </label>
        <button
          type="button"
          onClick={loadFiles}
          className="inline-flex items-center gap-1.5 rounded-2xl border px-4 py-2 text-xs font-semibold"
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
              <img src={item.url} alt={item.name} className="aspect-square w-full rounded-xl object-cover bg-[var(--bg-subtle)]" />
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className="truncate text-[11px] opacity-75">{item.name}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => handleCopy(item.url)} className="rounded-lg p-1.5 hover:bg-[var(--accent-soft)]">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => handleDelete(item)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
