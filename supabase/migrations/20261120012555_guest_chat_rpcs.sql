create or replace function public.guest_chat_get_or_create(
  p_token_hash text,
  p_guest_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv public.conversations;
  v_clean_name text;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid guest session token';
  end if;

  v_clean_name := nullif(left(trim(coalesce(p_guest_name, '')), 60), '');

  select * into v_conv
  from public.conversations
  where guest_token_hash = p_token_hash
  limit 1;

  if not found then
    insert into public.conversations (guest_token_hash, guest_name, status)
    values (p_token_hash, v_clean_name, 'open')
    returning * into v_conv;
  elsif v_clean_name is not null and (v_conv.guest_name is null or v_conv.guest_name <> v_clean_name) then
    update public.conversations
    set guest_name = v_clean_name
    where id = v_conv.id
    returning * into v_conv;
  end if;

  return jsonb_build_object(
    'id', v_conv.id,
    'guest_name', v_conv.guest_name,
    'status', v_conv.status,
    'unread_by_guest', v_conv.unread_by_guest,
    'last_message_at', v_conv.last_message_at,
    'created_at', v_conv.created_at
  );
end;
$$;

create or replace function public.guest_chat_get_messages(
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
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
      'status', v_conv.status,
      'last_message_at', v_conv.last_message_at
    ),
    'messages', v_messages
  );
end;
$$;

create or replace function public.guest_chat_send_message(
  p_token_hash text,
  p_body text,
  p_guest_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv public.conversations;
  v_body text;
  v_clean_name text;
  v_recent_count integer;
  v_msg public.chat_messages;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Unauthorized';
  end if;

  v_body := trim(coalesce(p_body, ''));
  if char_length(v_body) < 1 or char_length(v_body) > 1000 then
    raise exception 'Message must be between 1 and 1000 characters';
  end if;

  v_clean_name := nullif(left(trim(coalesce(p_guest_name, '')), 60), '');

  select * into v_conv
  from public.conversations
  where guest_token_hash = p_token_hash
  limit 1;

  if not found then
    raise exception 'Conversation not found';
  end if;

  if v_conv.status <> 'open' then
    raise exception 'Conversation is closed';
  end if;

  select count(*) into v_recent_count
  from public.chat_messages
  where conversation_id = v_conv.id
    and sender_type = 'guest'
    and created_at > now() - interval '60 seconds';

  if v_recent_count >= 10 then
    raise exception 'Rate limit exceeded';
  end if;

  insert into public.chat_messages (conversation_id, sender_type, body)
  values (v_conv.id, 'guest', v_body)
  returning * into v_msg;

  update public.conversations
  set
    last_message_at = v_msg.created_at,
    last_message_preview = left(v_body, 120),
    unread_by_admin = unread_by_admin + 1,
    guest_name = coalesce(v_clean_name, guest_name)
  where id = v_conv.id;

  return jsonb_build_object(
    'id', v_msg.id,
    'sender_type', v_msg.sender_type,
    'body', v_msg.body,
    'created_at', v_msg.created_at
  );
end;
$$;
