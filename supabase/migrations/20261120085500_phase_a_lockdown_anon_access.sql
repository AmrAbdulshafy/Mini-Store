-- Phase A (Unit 4 Lockdown): Restrict guest_chat_* RPCs to service_role and remove anonymous INSERT on public.inquiries.
-- Rollback (if ever needed for emergency legacy compatibility):
--   grant execute on function public.guest_chat_get_or_create(text, text), public.guest_chat_get_messages(text), public.guest_chat_send_message(text, text, text) to anon, authenticated;
--   create policy "Public can submit inquiries" on public.inquiries for insert to anon, authenticated with check ((status = 'new'::text) and (admin_notes is null) and (char_length(coalesce(message, ''::text)) <= 2000));

begin;

revoke execute on function public.guest_chat_get_or_create(text, text) from public, anon, authenticated;
grant execute on function public.guest_chat_get_or_create(text, text) to service_role;

revoke execute on function public.guest_chat_get_messages(text) from public, anon, authenticated;
grant execute on function public.guest_chat_get_messages(text) to service_role;

revoke execute on function public.guest_chat_send_message(text, text, text) from public, anon, authenticated;
grant execute on function public.guest_chat_send_message(text, text, text) to service_role;

drop policy "Public can submit inquiries" on public.inquiries;

commit;
