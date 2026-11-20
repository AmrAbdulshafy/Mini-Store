'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/components/providers/AppProvider';
import { EsraaEmblem } from '@/components/brand/BrandLogo';

export function LoginModal() {
  const router = useRouter();
  const { lang } = useApp();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOpen = () => {
      setError(null);
      setOpen(true);
    };
    window.addEventListener('esraa:open-login', handleOpen);
    return () => window.removeEventListener('esraa:open-login', handleOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!open) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !data.user) {
        setError(
          lang === 'ar'
            ? 'بيانات الدخول غير صحيحة أو غير مصرح بها.'
            : 'Invalid email or password.'
        );
        return;
      }

      const { data: adminRow, error: adminErr } = await supabase
        .from('admin_users')
        .select('id, is_active')
        .eq('id', data.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (adminErr || !adminRow) {
        await supabase.auth.signOut();
        setError(
          lang === 'ar'
            ? 'هذا الحساب غير مصرح له بالدخول.'
            : 'This account is not authorized to sign in.'
        );
        return;
      }

      setOpen(false);
      setEmail('');
      setPassword('');
      router.push('/admin');
      router.refresh();
    } catch {
      setError(lang === 'ar' ? 'حدث خطأ أثناء تسجيل الدخول.' : 'An error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
    >
      <div
        className="glass-card animate-modal-in relative w-full max-w-md rounded-3xl p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute end-4 top-4 rounded-full border p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
          style={{ borderColor: 'var(--border-glass)' }}
          aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6 flex flex-col items-center text-center">
          <EsraaEmblem className="mb-4 h-14 w-14 shadow-lg" />
          <h2 className="font-display text-2xl font-bold">
            {lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {lang === 'ar' ? 'مرحباً بك في إسراء بوتيك' : 'Welcome to Esraa Boutique'}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold">
              {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-2xl border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-[var(--text-secondary)]/60 focus:border-[var(--accent)]"
              style={{ borderColor: 'var(--border-glass)' }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold">
              {lang === 'ar' ? 'كلمة المرور' : 'Password'}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border bg-transparent px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
              style={{ borderColor: 'var(--border-glass)' }}
            />
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-500/15 px-4 py-3 text-xs font-medium text-rose-600 dark:text-rose-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <Lock className="h-4 w-4" />
            <span>
              {loading
                ? lang === 'ar'
                  ? 'جاري التحقق...'
                  : 'Signing in...'
                : lang === 'ar'
                  ? 'تسجيل الدخول'
                  : 'Login'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
