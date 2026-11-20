-- Fix: GREATEST is a SQL expression in PostgreSQL, not a pg_catalog function.
begin;

create or replace function private.check_rate_limit(
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
    'remaining', greatest(0, p_max_requests - v_count),
    'reset_at', v_reset_at
  );
end;
$fn$;

commit;
