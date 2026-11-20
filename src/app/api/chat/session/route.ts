import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  GUEST_COOKIE_NAME,
  generateGuestToken,
  getGuestCookieOptions,
  getGuestTokenFromCookie,
  hashGuestToken,
} from '@/lib/guest-chat-auth';
import { enforceRateLimit, extractTrustedClientIp, hashRateLimitKey } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const clientIp = extractTrustedClientIp(req);
    if (!clientIp) {
      return NextResponse.json({ error: 'Unable to verify request origin' }, { status: 403 });
    }

    const ipLimit = await enforceRateLimit(hashRateLimitKey('chat_sess:ip', clientIp), 10, 60);
    if (!ipLimit.ok) {
      return ipLimit.response;
    }

    const body = await req.json().catch(() => ({}));
    const rawName = typeof body?.guestName === 'string' ? body.guestName.trim().slice(0, 60) : '';
    const rawPhone = typeof body?.guestPhone === 'string' ? body.guestPhone.trim().slice(0, 25) : '';
    const forceNew = body?.forceNew === true;

    const existingToken = forceNew ? null : await getGuestTokenFromCookie();
    const isCreatingNew = !existingToken;

    if (isCreatingNew && rawName.length < 2) {
      return NextResponse.json(
        { code: 'NAME_REQUIRED', error: 'Customer name (at least 2 characters) is required' },
        { status: 400 }
      );
    }

    if (rawName && rawName.length < 2) {
      return NextResponse.json(
        { code: 'NAME_REQUIRED', error: 'Customer name must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (rawPhone) {
      const digits = rawPhone.replace(/\D/g, '');
      if (!/^[+\d\s()-]{7,25}$/.test(rawPhone) || digits.length < 7 || digits.length > 20) {
        return NextResponse.json(
          { code: 'PHONE_INVALID', error: 'Invalid phone number format' },
          { status: 400 }
        );
      }
    }

    let rawToken = existingToken;
    let isNewToken = false;
    if (!rawToken) {
      rawToken = generateGuestToken();
      isNewToken = true;
    }

    const tokenHash = hashGuestToken(rawToken);
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin.rpc('guest_chat_get_or_create', {
      p_token_hash: tokenHash,
      p_guest_name: isCreatingNew ? rawName || null : null,
      p_guest_phone: isCreatingNew ? rawPhone || null : null,
    });

    if (error) {
      return NextResponse.json({ error: 'Unable to initialize chat session' }, { status: 500 });
    }

    const res = NextResponse.json({ conversation: data });
    if (isNewToken) {
      res.cookies.set(GUEST_COOKIE_NAME, rawToken, getGuestCookieOptions());
    }
    return res;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
