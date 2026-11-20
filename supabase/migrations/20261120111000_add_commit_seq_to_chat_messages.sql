-- Add transactional commit-ordered sequence (commit_seq) to public.chat_messages.
-- Uses a dedicated single-row counter table updated in a BEFORE INSERT trigger so
-- the row lock is held until COMMIT/ROLLBACK, guaranteeing strict commit ordering.
-- Preserves all existing messages, RLS policies, RPCs, grants, and Realtime publication.

begin;

create schema if not exists private;

create table if not exists private.chat_message_cursor (
  id integer primary key check (id = 1),
  last_seq bigint not null default 0
);

alter table private.chat_message_cursor owner to postgres;
revoke all on table private.chat_message_cursor from public, anon, authenticated, service_role;

-- Prevent concurrent inserts while adding, backfilling, and attaching the trigger
lock table public.chat_messages in share row exclusive mode;

alter table public.chat_messages
  add column if not exists commit_seq bigint;

with ordered as (
  select
    id,
    row_number() over (order by created_at asc, id asc) as seq
  from public.chat_messages
)
update public.chat_messages m
set commit_seq = o.seq
from ordered o
where m.id = o.id
  and m.commit_seq is null;

insert into private.chat_message_cursor (id, last_seq)
values (
  1,
  coalesce((select max(commit_seq) from public.chat_messages), 0)
)
on conflict (id) do update
  set last_seq = greatest(private.chat_message_cursor.last_seq, excluded.last_seq);

alter table public.chat_messages
  alter column commit_seq set not null;

create or replace function private.assign_chat_message_commit_seq()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
begin
  update private.chat_message_cursor
  set last_seq = last_seq + 1
  where id = 1
  returning last_seq into new.commit_seq;

  if new.commit_seq is null then
    raise exception 'chat_message_cursor row is missing';
  end if;

  return new;
end;
$$;

alter function private.assign_chat_message_commit_seq() owner to postgres;
revoke all on function private.assign_chat_message_commit_seq() from public, anon, authenticated, service_role;

drop trigger if exists trg_chat_messages_commit_seq on public.chat_messages;
create trigger trg_chat_messages_commit_seq
  before insert on public.chat_messages
  for each row
  execute function private.assign_chat_message_commit_seq();

create unique index if not exists idx_chat_messages_commit_seq
  on public.chat_messages (commit_seq);

create index if not exists idx_chat_messages_guest_commit_seq
  on public.chat_messages (commit_seq)
  where sender_type = 'guest';

commit;
