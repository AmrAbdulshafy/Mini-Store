-- Add optional guest_phone to conversations and update guest_chat_get_or_create / guest_chat_get_messages.
-- Drops the old 2-arg overload to avoid leaving an executable public overload, and preserves service_role-only EXECUTE.

begin;

alter table public.conversations
  add column if not exists guest_phone text;

drop function if exists public.guest_chat_get_or_create(text, text);

create function public.guest_chat_get_or_create(
  p_token_hash text,
  p_guest_name text default null,
  p_guest_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_conv public.conversations;
  v_clean_name text;
  v_clean_phone text;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid guest session token';
  end if;

  v_clean_name := nullif(left(trim(coalesce(p_guest_name, '')), 60), '');
  v_clean_phone := nullif(left(trim(coalesce(p_guest_phone, '')), 25), '');

  select * into v_conv
  from public.conversations
  where guest_token_hash = p_token_hash
  limit 1;

  if not found then
    insert into public.conversations (guest_token_hash, guest_name, guest_phone, status)
    values (p_token_hash, v_clean_name, v_clean_phone, 'open')
    returning * into v_conv;
  elsif (v_conv.guest_name is null and v_clean_name is not null)
     or (v_conv.guest_phone is null and v_clean_phone is not null) then
    -- Only backfill missing identity fields; never silently overwrite existing guest_name or guest_phone
    update public.conversations
    set
      guest_name = coalesce(guest_name, v_clean_name),
      guest_phone = coalesce(guest_phone, v_clean_phone)
    where id = v_conv.id
    returning * into v_conv;
  end if;

  return jsonb_build_object(
    'id', v_conv.id,
    'guest_name', v_conv.guest_name,
    'guest_phone', v_conv.guest_phone,
    'status', v_conv.status,
    'unread_by_guest', v_conv.unread_by_guest,
    'last_message_at', v_conv.last_message_at,
    'created_at', v_conv.created_at
  );
end;
$$;

revoke all on function public.guest_chat_get_or_create(text, text, text) from public, anon, authenticated;
grant execute on function public.guest_chat_get_or_create(text, text, text) to service_role;

create or replace function public.guest_chat_get_messages(
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_conv public.conversations;
  v_messages jsonb;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Unauthorized';
  end if;

  select * into v_conv
  from public.conversations
  where guest_token_hash = p_token_hash
  limit 1;

  if not found then
    return jsonb_build_object('conversation', null, 'messages', '[]'::jsonb);
  end if;

  if v_conv.unread_by_guest > 0 then
    update public.conversations
    set unread_by_guest = 0
    where id = v_conv.id;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'sender_type', m.sender_type,
        'body', m.body,
        'created_at', m.created_at
      ) order by m.created_at asc
    ),
    '[]'::jsonb
  )
  into v_messages
  from public.chat_messages m
  where m.conversation_id = v_conv.id;

  return jsonb_build_object(
    'conversation', jsonb_build_object(
      'id', v_conv.id,
      'guest_name', v_conv.guest_name,
      'guest_phone', v_conv.guest_phone,
      'status', v_conv.status,
      'last_message_at', v_conv.last_message_at
    ),
    'messages', v_messages
  );
end;
$$;

revoke all on function public.guest_chat_get_messages(text) from public, anon, authenticated;
grant execute on function public.guest_chat_get_messages(text) to service_role;

commit;
