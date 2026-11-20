-- Enforce guest_name immutability in guest_chat_send_message.
-- Preserves the exact (text, text, text) signature, security_definer, search_path,
-- postgres ownership, and service_role-only EXECUTE privileges, while ignoring
-- any client-supplied p_guest_name on message send.

begin;

create or replace function public.guest_chat_send_message(
  p_token_hash text,
  p_body text,
  p_guest_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_conv public.conversations;
  v_body text;
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

  -- Do NOT update guest_name here; customer identity is established at session creation.
  -- Legacy conversations with guest_name IS NULL remain accessible.
  update public.conversations
  set
    last_message_at = v_msg.created_at,
    last_message_preview = left(v_body, 120),
    unread_by_admin = unread_by_admin + 1
  where id = v_conv.id;

  return jsonb_build_object(
    'id', v_msg.id,
    'sender_type', v_msg.sender_type,
    'body', v_msg.body,
    'created_at', v_msg.created_at
  );
end;
$$;

alter function public.guest_chat_send_message(text, text, text) owner to postgres;
revoke all on function public.guest_chat_send_message(text, text, text) from public, anon, authenticated;
grant execute on function public.guest_chat_send_message(text, text, text) to service_role;

commit;
