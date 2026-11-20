import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export const GUEST_COOKIE_NAME = 'boutique_guest_chat_token';

function getSecret(): string {
  return process.env.GUEST_CHAT_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'fallback-dev-secret-change-me';
}

export function hashGuestToken(rawToken: string): string {
  return crypto.createHmac('sha256', getSecret()).update(rawToken).digest('hex');
}

export function generateGuestToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function getGuestTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const val = cookieStore.get(GUEST_COOKIE_NAME)?.value;
  if (!val || !/^[a-f0-9]{64}$/.test(val)) {
    return null;
  }
  return val;
}

export function getGuestCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };
}
