import crypto from 'node:crypto';
import net from 'node:net';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

function getRateLimitSecret(): string {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (secret && secret.length >= 16) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('RATE_LIMIT_SECRET is required in production');
  }
  return 'dev-rate-limit-secret-change-me';
}

export function hashRateLimitKey(namespace: string, value: string): string {
  const digest = crypto
    .createHmac('sha256', getRateLimitSecret())
    .update(`${namespace}:${value}`)
    .digest('hex');
  return `${namespace}:${digest}`;
}

export function hashSecretValue(namespace: string, value: string): string {
  return crypto
    .createHmac('sha256', getRateLimitSecret())
    .update(`${namespace}:${value}`)
    .digest('hex');
}

/**
 * Extracts and validates the client IP from Vercel's trusted edge header.
 * Never falls back to spoofable x-forwarded-for / x-real-ip headers.
 */
export function extractTrustedClientIp(req: NextRequest): string | null {
  const raw = req.headers.get('x-vercel-forwarded-for');
  if (raw) {
    const first = raw.split(',')[0]?.trim() ?? '';
    const normalized = first.startsWith('::ffff:') ? first.slice(7) : first;
    if (net.isIP(normalized) !== 0) {
      return normalized;
    }
    return null;
  }

  if (process.env.NODE_ENV !== 'production') {
    return '127.0.0.1';
  }

  return null;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  reset_at: string;
}

/**
 * Enforces a shared PostgreSQL fixed-window rate limit via service_role.
 * Fails closed (503) if the RPC errors or returns an unexpected payload.
 */
export async function enforceRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ ok: true; result: RateLimitResult } | { ok: false; response: NextResponse }> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
      p_key: key,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds,
    });

    if (
      error ||
      !data ||
      typeof data !== 'object' ||
      typeof (data as RateLimitResult).allowed !== 'boolean'
    ) {
      console.error('[rate-limit] check_rate_limit failed or returned malformed result');
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Service temporarily unavailable' },
          { status: 503, headers: { 'Retry-After': '30' } }
        ),
      };
    }

    const result = data as RateLimitResult;
    if (!result.allowed) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Rate limit exceeded' },
          {
            status: 429,
            headers: {
              'Retry-After': String(windowSeconds),
            },
          }
        ),
      };
    }

    return { ok: true, result };
  } catch (err) {
    console.error('[rate-limit] unexpected error:', err instanceof Error ? err.message : 'unknown');
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503, headers: { 'Retry-After': '30' } }
      ),
    };
  }
}
