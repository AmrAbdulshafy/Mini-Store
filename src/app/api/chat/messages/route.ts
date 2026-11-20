import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGuestTokenFromCookie, hashGuestToken } from '@/lib/guest-chat-auth';
import { enforceRateLimit, extractTrustedClientIp, hashRateLimitKey } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const rawToken = await getGuestTokenFromCookie();
    if (!rawToken) {
      return NextResponse.json({ error: 'Missing guest chat session' }, { status: 401 });
    }

    const clientIp = extractTrustedClientIp(req);
    if (!clientIp) {
      return NextResponse.json({ error: 'Unable to verify request origin' }, { status: 403 });
    }

    const tokenHash = hashGuestToken(rawToken);

    const tokenLimit = await enforceRateLimit(hashRateLimitKey('chat_get:tok', tokenHash), 45, 60);
    if (!tokenLimit.ok) {
      return tokenLimit.response;
    }

    const ipLimit = await enforceRateLimit(hashRateLimitKey('chat_get:ip', clientIp), 120, 60);
    if (!ipLimit.ok) {
      return ipLimit.response;
    }

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.rpc('guest_chat_get_messages', {
      p_token_hash: tokenHash,
    });

    if (error) {
      return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawToken = await getGuestTokenFromCookie();
    if (!rawToken) {
      return NextResponse.json({ error: 'Missing guest chat session' }, { status: 401 });
    }

    const clientIp = extractTrustedClientIp(req);
    if (!clientIp) {
      return NextResponse.json({ error: 'Unable to verify request origin' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const text = typeof body?.body === 'string' ? body.body.trim() : '';

    if (!text || text.length > 1000) {
      return NextResponse.json(
        { error: 'Message must be between 1 and 1000 characters' },
        { status: 400 }
      );
    }

    const tokenHash = hashGuestToken(rawToken);

    const tokenLimit = await enforceRateLimit(hashRateLimitKey('chat_post:tok', tokenHash), 12, 60);
    if (!tokenLimit.ok) {
      return tokenLimit.response;
    }

    const ipLimit = await enforceRateLimit(hashRateLimitKey('chat_post:ip', clientIp), 30, 60);
    if (!ipLimit.ok) {
      return ipLimit.response;
    }

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.rpc('guest_chat_send_message', {
      p_token_hash: tokenHash,
      p_body: text,
      p_guest_name: null,
    });

    if (error) {
      const msg = error.message || '';
      if (msg.includes('Rate limit')) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
      }
      if (msg.includes('closed')) {
        return NextResponse.json({ error: 'Conversation is closed' }, { status: 403 });
      }
      return NextResponse.json({ error: 'Failed to send message' }, { status: 400 });
    }

    return NextResponse.json({ message: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
