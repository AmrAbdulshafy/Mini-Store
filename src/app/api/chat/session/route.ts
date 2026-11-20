import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  GUEST_COOKIE_NAME,
  generateGuestToken,
  getGuestCookieOptions,
  getGuestTokenFromCookie,
  hashGuestToken,
} from '@/lib/guest-chat-auth';

export async function POST(req: NextRequest) {
  try {
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
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('guest_chat_get_or_create', {
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
