import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const customerName = typeof body?.customerName === 'string' ? body.customerName.trim().slice(0, 80) : '';
    const customerPhone = typeof body?.customerPhone === 'string' ? body.customerPhone.trim().slice(0, 40) : '';
    const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 1500) : '';
    const productId = typeof body?.productId === 'string' && /^[0-9a-f-]{36}$/i.test(body.productId)
      ? body.productId
      : null;
    const channel =
      body?.channel === 'whatsapp' || body?.channel === 'phone' || body?.channel === 'contact_form'
        ? body.channel
        : 'contact_form';

    if (!message && channel === 'contact_form') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.from('inquiries').insert({
      product_id: productId,
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      channel,
      message: message || null,
      status: 'new',
    });

    if (error) {
      return NextResponse.json({ error: 'Failed to submit inquiry' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
