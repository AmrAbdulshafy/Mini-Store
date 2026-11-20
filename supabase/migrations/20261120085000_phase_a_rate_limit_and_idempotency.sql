-- Phase A (Additive): Shared Rate Limiting & Atomic Inquiry Idempotency/Dedup
-- Safe to apply before application cutover (preserves existing anon grants/policies until Unit 4 lockdown).

begin;

create schema if not exists private;
-- Preserve existing authenticated USAGE required by private.is_active_admin() in RLS;
-- ensure public, anon, and service_role have no schema privileges on private.
revoke all on schema private from public, anon, service_role;

-- ============================================================================
-- Unit 1: Shared Fixed-Window Rate Limiting
-- ============================================================================
create table private.rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 1)
);

create index idx_rate_limits_window_started_at
  on private.rate_limits (window_started_at);

alter table private.rate_limits owner to postgres;
revoke all on table private.rate_limits from public, anon, authenticated, service_role;

create function private.check_rate_limit(
  p_key text,
  p_max_requests integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $fn$
declare
  v_now timestamptz;
  v_window_epoch bigint;
  v_window_start timestamptz;
  v_reset_at timestamptz;
  v_count integer;
begin
  if p_key is null or pg_catalog.length(pg_catalog.btrim(p_key)) = 0 or pg_catalog.length(p_key) > 256 then
    raise exception 'Invalid rate limit key' using errcode = '22023';
  end if;
  if p_max_requests is null or p_max_requests <= 0 or p_max_requests > 100000 then
    raise exception 'Invalid max_requests' using errcode = '22023';
  end if;
  if p_window_seconds is null or p_window_seconds <= 0 or p_window_seconds > 86400 then
    raise exception 'Invalid window_seconds' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_key, 0));

  v_now := pg_catalog.clock_timestamp();
  v_window_epoch := pg_catalog.floor(extract(epoch from v_now) / p_window_seconds)::bigint * p_window_seconds;
  v_window_start := pg_catalog.to_timestamp(v_window_epoch);
  v_reset_at := v_window_start + pg_catalog.make_interval(secs => p_window_seconds);

  insert into private.rate_limits (rate_key, window_started_at, request_count)
  values (p_key, v_window_start, 1)
  on conflict (rate_key) do update
    set
      request_count = case
        when private.rate_limits.window_started_at < v_window_start then 1
        else private.rate_limits.request_count + 1
      end,
      window_started_at = case
        when private.rate_limits.window_started_at < v_window_start then v_window_start
        else private.rate_limits.window_started_at
      end
  returning request_count into v_count;

  return pg_catalog.jsonb_build_object(
    'allowed', (v_count <= p_max_requests),
    'count', v_count,
    'limit', p_max_requests,
    'remaining', pg_catalog.greatest(0, p_max_requests - v_count),
    'reset_at', v_reset_at
  );
end;
$fn$;

alter function private.check_rate_limit(text, integer, integer) owner to postgres;
revoke all on function private.check_rate_limit(text, integer, integer) from public, anon, authenticated, service_role;

create function public.check_rate_limit(
  p_key text,
  p_max_requests integer,
  p_window_seconds integer
)
returns jsonb
language sql
security definer
set search_path = pg_catalog, pg_temp
as $fn$
  select private.check_rate_limit(p_key, p_max_requests, p_window_seconds);
$fn$;

alter function public.check_rate_limit(text, integer, integer) owner to postgres;
revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

create function private.cleanup_expired_rate_limits(
  p_max_age_seconds integer default 86400,
  p_batch_size integer default 5000
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $fn$
declare
  v_cutoff timestamptz;
  v_deleted integer;
begin
  if p_max_age_seconds is null or p_max_age_seconds < 60 then
    raise exception 'Invalid max_age_seconds' using errcode = '22023';
  end if;
  if p_batch_size is null or p_batch_size <= 0 or p_batch_size > 50000 then
    raise exception 'Invalid batch_size' using errcode = '22023';
  end if;

  v_cutoff := pg_catalog.clock_timestamp() - pg_catalog.make_interval(secs => p_max_age_seconds);

  with doomed as (
    select rate_key
    from private.rate_limits
    where window_started_at < v_cutoff
    order by window_started_at asc
    limit p_batch_size
  )
  delete from private.rate_limits r
  using doomed d
  where r.rate_key = d.rate_key;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$fn$;

alter function private.cleanup_expired_rate_limits(integer, integer) owner to postgres;
revoke all on function private.cleanup_expired_rate_limits(integer, integer) from public, anon, authenticated, service_role;

-- ============================================================================
-- Unit 2: Atomic Durable Inquiry Idempotency & Duplicate Protection
-- ============================================================================
create table private.inquiry_idempotency (
  key_hash text primary key check (key_hash ~ '^[a-f0-9]{64}$'),
  inquiry_id uuid not null,
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  expires_at timestamptz not null default (pg_catalog.clock_timestamp() + interval '7 days')
);

create index idx_inquiry_idempotency_expires_at
  on private.inquiry_idempotency (expires_at);

alter table private.inquiry_idempotency owner to postgres;
revoke all on table private.inquiry_idempotency from public, anon, authenticated, service_role;

create table private.inquiry_dedup (
  dup_hash text primary key check (dup_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null
);

create index idx_inquiry_dedup_expires_at
  on private.inquiry_dedup (expires_at);

alter table private.inquiry_dedup owner to postgres;
revoke all on table private.inquiry_dedup from public, anon, authenticated, service_role;

create function public.submit_inquiry_atomic(
  p_idempotency_key_hash text,
  p_dup_key_hash text,
  p_product_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_channel text,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $fn$
declare
  v_now timestamptz;
  v_existing_id uuid;
  v_dup_expires timestamptz;
  v_new_id uuid;
begin
  if p_idempotency_key_hash is null or p_idempotency_key_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid idempotency key hash' using errcode = '22023';
  end if;
  if p_dup_key_hash is not null and p_dup_key_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid duplicate key hash' using errcode = '22023';
  end if;

  -- Acquire advisory locks FIRST before reading clock_timestamp()
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_idempotency_key_hash, 0));
  if p_dup_key_hash is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_dup_key_hash, 1));
  end if;

  v_now := pg_catalog.clock_timestamp();

  select inquiry_id into v_existing_id
  from private.inquiry_idempotency
  where key_hash = p_idempotency_key_hash;

  if v_existing_id is not null then
    return pg_catalog.jsonb_build_object('status', 'deduplicated', 'inquiry_id', v_existing_id);
  end if;

  if p_dup_key_hash is not null then
    select expires_at into v_dup_expires
    from private.inquiry_dedup
    where dup_hash = p_dup_key_hash;

    if v_dup_expires is not null and v_dup_expires > v_now then
      return pg_catalog.jsonb_build_object('status', 'duplicate_conflict');
    end if;

    insert into private.inquiry_dedup (dup_hash, expires_at)
    values (p_dup_key_hash, v_now + interval '10 minutes')
    on conflict (dup_hash) do update
      set expires_at = excluded.expires_at;
  end if;

  insert into public.inquiries (
    product_id, customer_name, customer_phone, channel, message, status
  ) values (
    p_product_id, p_customer_name, p_customer_phone, p_channel, p_message, 'new'
  )
  returning id into v_new_id;

  insert into private.inquiry_idempotency (key_hash, inquiry_id, created_at, expires_at)
  values (p_idempotency_key_hash, v_new_id, v_now, v_now + interval '7 days');

  return pg_catalog.jsonb_build_object('status', 'created', 'inquiry_id', v_new_id);
end;
$fn$;

alter function public.submit_inquiry_atomic(text, text, uuid, text, text, text, text) owner to postgres;
revoke all on function public.submit_inquiry_atomic(text, text, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_inquiry_atomic(text, text, uuid, text, text, text, text) to service_role;

commit;
