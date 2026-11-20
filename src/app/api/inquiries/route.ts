import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  enforceRateLimit,
  extractTrustedClientIp,
  hashRateLimitKey,
  hashSecretValue,
} from '@/lib/rate-limit';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Honeypot: silently accept bot submissions without touching the database
    const honeypot = typeof body.website === 'string' ? body.website.trim() : '';
    if (honeypot.length > 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const clientIp = extractTrustedClientIp(req);
    if (!clientIp) {
      return NextResponse.json({ error: 'Unable to verify request origin' }, { status: 403 });
    }

    const ipLimit = await enforceRateLimit(hashRateLimitKey('inq:ip', clientIp), 10, 300);
    if (!ipLimit.ok) {
      return ipLimit.response;
    }

    const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';
    if (!UUID_REGEX.test(idempotencyKey)) {
      return NextResponse.json({ error: 'Valid idempotencyKey is required' }, { status: 400 });
    }

    const customerName = typeof body.customerName === 'string' ? body.customerName.trim().slice(0, 80) : '';
    const customerPhone = typeof body.customerPhone === 'string' ? body.customerPhone.trim().slice(0, 40) : '';
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1500) : '';
    const productId = typeof body.productId === 'string' && UUID_REGEX.test(body.productId)
      ? body.productId.toLowerCase()
      : null;
    const channel =
      body.channel === 'whatsapp' || body.channel === 'phone' || body.channel === 'contact_form'
        ? body.channel
        : 'contact_form';

    if (!message && channel === 'contact_form') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const idempotencyKeyHash = hashSecretValue('idemp', idempotencyKey.toLowerCase());

    // Consistent duplicate-inquiry rule: reliable normalized phone (>= 7 digits) + normalized message
    const normPhone = customerPhone.replace(/\D/g, '');
    const normMessage = message.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() || 'no-message';
    const dupKeyHash =
      normPhone.length >= 7
        ? hashSecretValue('dup_inq', `${normPhone}:${normMessage}`)
        : null;

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.rpc('submit_inquiry_atomic', {
      p_idempotency_key_hash: idempotencyKeyHash,
      p_dup_key_hash: dupKeyHash,
      p_product_id: productId,
      p_customer_name: customerName || null,
      p_customer_phone: customerPhone || null,
      p_channel: channel,
      p_message: message || null,
    });

    if (error || !data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Failed to submit inquiry' }, { status: 500 });
    }

    const result = data as { status?: string; inquiry_id?: string };
    if (result.status === 'duplicate_conflict') {
      return NextResponse.json(
        { error: 'A similar inquiry was recently submitted. Please wait a few minutes before resending.' },
        { status: 409 }
      );
    }

    if (result.status === 'deduplicated') {
      return NextResponse.json({ ok: true, deduplicated: true }, { status: 200 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
