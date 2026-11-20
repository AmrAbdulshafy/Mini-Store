import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGuestTokenFromCookie, hashGuestToken } from '@/lib/guest-chat-auth';

export async function GET() {
  try {
    const rawToken = await getGuestTokenFromCookie();
    if (!rawToken) {
      return NextResponse.json({ error: 'Missing guest chat session' }, { status: 401 });
    }

    const tokenHash = hashGuestToken(rawToken);
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('guest_chat_get_messages', {
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

    const body = await req.json().catch(() => null);
    const text = typeof body?.body === 'string' ? body.body.trim() : '';
    const guestName = typeof body?.guestName === 'string' ? body.guestName.trim().slice(0, 60) : null;

    if (!text || text.length > 1000) {
      return NextResponse.json(
        { error: 'Message must be between 1 and 1000 characters' },
        { status: 400 }
      );
    }

    const tokenHash = hashGuestToken(rawToken);
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('guest_chat_send_message', {
      p_token_hash: tokenHash,
      p_body: text,
      p_guest_name: guestName,
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
