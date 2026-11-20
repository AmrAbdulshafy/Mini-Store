-- Indexes
create index if not exists idx_categories_collection_id on public.categories(collection_id);
create index if not exists idx_products_collection_id on public.products(collection_id);
create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_products_catalog_filter on public.products(is_visible, is_archived, is_featured, created_at desc);
create index if not exists idx_product_images_product_id on public.product_images(product_id, sort_order);
create index if not exists idx_homepage_banners_placement on public.homepage_banners(placement, is_active, sort_order);
create index if not exists idx_inquiries_status on public.inquiries(status, created_at desc);
create index if not exists idx_inquiries_product_id on public.inquiries(product_id);
create index if not exists idx_conversations_last_message_at on public.conversations(last_message_at desc);
create index if not exists idx_chat_messages_conversation_id on public.chat_messages(conversation_id, created_at asc);

-- Triggers for updated_at
create trigger trg_admin_users_updated_at before update on public.admin_users for each row execute function public.set_updated_at();
create trigger trg_collections_updated_at before update on public.collections for each row execute function public.set_updated_at();
create trigger trg_categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger trg_products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger trg_store_settings_updated_at before update on public.store_settings for each row execute function public.set_updated_at();
create trigger trg_homepage_banners_updated_at before update on public.homepage_banners for each row execute function public.set_updated_at();
create trigger trg_inquiries_updated_at before update on public.inquiries for each row execute function public.set_updated_at();
create trigger trg_conversations_updated_at before update on public.conversations for each row execute function public.set_updated_at();

-- Enable RLS on all public tables
alter table public.admin_users enable row level security;
alter table public.collections enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.store_settings enable row level security;
alter table public.homepage_banners enable row level security;
alter table public.inquiries enable row level security;
alter table public.conversations enable row level security;
alter table public.chat_messages enable row level security;

-- Grants for private schema helper
grant usage on schema private to authenticated;
grant execute on function private.is_active_admin() to authenticated;

-- RLS: admin_users (only active admins can read; super_admin can manage)
create policy "Admins can view admin_users" on public.admin_users
  for select to authenticated
  using (private.is_active_admin());

create policy "Super admins can manage admin_users" on public.admin_users
  for all to authenticated
  using (exists (select 1 from public.admin_users where id = (select auth.uid()) and is_active = true and role = 'super_admin'))
  with check (exists (select 1 from public.admin_users where id = (select auth.uid()) and is_active = true and role = 'super_admin'));

-- RLS: collections (public read active, admin full)
create policy "Public can view active collections" on public.collections
  for select to anon, authenticated
  using (is_active = true or private.is_active_admin());

create policy "Admins can manage collections" on public.collections
  for all to authenticated
  using (private.is_active_admin())
  with check (private.is_active_admin());

-- RLS: categories (public read active, admin full)
create policy "Public can view active categories" on public.categories
  for select to anon, authenticated
  using (is_active = true or private.is_active_admin());

create policy "Admins can manage categories" on public.categories
  for all to authenticated
  using (private.is_active_admin())
  with check (private.is_active_admin());

-- RLS: products (public read visible & non-archived, admin full)
create policy "Public can view visible products" on public.products
  for select to anon, authenticated
  using ((is_visible = true and is_archived = false) or private.is_active_admin());

create policy "Admins can manage products" on public.products
  for all to authenticated
  using (private.is_active_admin())
  with check (private.is_active_admin());

-- RLS: product_images (public read for visible products, admin full)
create policy "Public can view product images" on public.product_images
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and ((p.is_visible = true and p.is_archived = false) or private.is_active_admin())
    )
  );

create policy "Admins can manage product images" on public.product_images
  for all to authenticated
  using (private.is_active_admin())
  with check (private.is_active_admin());

-- RLS: store_settings (public read, admin update)
create policy "Public can view store settings" on public.store_settings
  for select to anon, authenticated
  using (true);

create policy "Admins can manage store settings" on public.store_settings
  for all to authenticated
  using (private.is_active_admin())
  with check (private.is_active_admin());

-- RLS: homepage_banners (public read active, admin full)
create policy "Public can view active banners" on public.homepage_banners
  for select to anon, authenticated
  using (is_active = true or private.is_active_admin());

create policy "Admins can manage banners" on public.homepage_banners
  for all to authenticated
  using (private.is_active_admin())
  with check (private.is_active_admin());

-- RLS: inquiries (public can insert new inquiry, only admin can read/update/delete)
create policy "Public can submit inquiries" on public.inquiries
  for insert to anon, authenticated
  with check (
    status = 'new'
    and admin_notes is null
    and char_length(coalesce(message, '')) <= 2000
  );

create policy "Admins can manage inquiries" on public.inquiries
  for all to authenticated
  using (private.is_active_admin())
  with check (private.is_active_admin());

-- RLS: conversations & chat_messages
create policy "Admins can manage conversations" on public.conversations
  for all to authenticated
  using (private.is_active_admin())
  with check (private.is_active_admin());

create policy "Admins can manage chat messages" on public.chat_messages
  for all to authenticated
  using (private.is_active_admin())
  with check (private.is_active_admin());

-- Storage bucket for boutique images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'boutique-media',
  'boutique-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

-- Storage policies
create policy "Public can view boutique media" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'boutique-media');

create policy "Admins can upload boutique media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'boutique-media' and private.is_active_admin());

create policy "Admins can update boutique media" on storage.objects
  for update to authenticated
  using (bucket_id = 'boutique-media' and private.is_active_admin())
  with check (bucket_id = 'boutique-media' and private.is_active_admin());

create policy "Admins can delete boutique media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'boutique-media' and private.is_active_admin());
