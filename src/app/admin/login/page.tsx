'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/components/providers/AppProvider';

export default function AdminLoginPage() {
  const router = useRouter();
  const { lang } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            ? 'هذا الحساب غير مسجل كمسؤول نشط في لوحة التحكم.'
            : 'This account is not authorized as an active administrator.'
        );
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setError(lang === 'ar' ? 'حدث خطأ أثناء تسجيل الدخول.' : 'An error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="glass-card w-full max-w-md rounded-3xl p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))' }}
          >
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl font-bold">
            {lang === 'ar' ? 'دخول لوحة تحكم البوتيك' : 'Boutique Admin Sign In'}
          </h1>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {lang === 'ar'
              ? 'الوصول مقتصر على مسؤولي المتجر المعتمدين فقط'
              : 'Restricted to authorized store administrators'}
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@lamsaboutique.eg"
              className="w-full rounded-2xl border bg-transparent px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
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
                  : 'Sign In'}
            </span>
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--accent)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{lang === 'ar' ? 'العودة إلى المتجر' : 'Back to Storefront'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
