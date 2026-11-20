-- Enable Supabase Realtime for admin guest-chat notifications (RLS remains enforced for authenticated admins only).
begin;

alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.conversations;

commit;
