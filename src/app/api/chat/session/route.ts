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
    const guestName = typeof body?.guestName === 'string' ? body.guestName.trim().slice(0, 60) : null;
    const forceNew = body?.forceNew === true;

    let rawToken = forceNew ? null : await getGuestTokenFromCookie();
    let isNewToken = false;
    if (!rawToken) {
      rawToken = generateGuestToken();
      isNewToken = true;
    }

    const tokenHash = hashGuestToken(rawToken);
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin.rpc('guest_chat_get_or_create', {
      p_token_hash: tokenHash,
      p_guest_name: guestName,
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
