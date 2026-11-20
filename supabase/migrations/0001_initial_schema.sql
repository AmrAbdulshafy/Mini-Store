-- 0001_initial_schema.sql (Idempotent)
create schema if not exists private;

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'admin' check (role in ('super_admin', 'admin', 'editor')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where id = (select auth.uid()) and is_active = true
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ar text not null,
  name_en text not null,
  description_ar text,
  description_en text,
  theme_key text not null default 'women' check (theme_key in ('women', 'men', 'handmade')),
  hero_image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.collections(id) on delete set null,
  slug text not null unique,
  name_ar text not null,
  name_en text not null,
  description_ar text,
  description_en text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  slug text not null unique,
  name_ar text not null,
  name_en text not null,
  description_ar text not null default '',
  description_en text not null default '',
  price numeric(12, 2) not null check (price >= 0),
  previous_price numeric(12, 2) check (previous_price is null or previous_price >= 0),
  currency text not null default 'EGP',
  category_id uuid references public.categories(id) on delete set null,
  collection_id uuid references public.collections(id) on delete set null,
  availability_status text not null default 'in_stock' check (availability_status in ('in_stock', 'low_stock', 'out_of_stock', 'made_to_order')),
  is_featured boolean not null default false,
  is_new_arrival boolean not null default false,
  is_special_offer boolean not null default false,
  is_visible boolean not null default true,
  is_archived boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  storage_path text,
  alt_ar text,
  alt_en text,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  id integer primary key default 1 check (id = 1),
  store_name_ar text not null default 'لمسة بوتيك',
  store_name_en text not null default 'Lamsa Boutique',
  tagline_ar text not null default 'أناقة المرأة، فخامة الرجل، وإبداع الحرف اليدوية',
  tagline_en text not null default 'Feminine Grace, Masculine Refinement & Artisanal Craft',
  whatsapp_number text not null default '201000000000',
  phone_number text not null default '+20 100 000 0000',
  email text not null default 'hello@lamsaboutique.eg',
  address_ar text not null default 'القاهرة، مصر',
  address_en text not null default 'Cairo, Egypt',
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  default_language text not null default 'ar' check (default_language in ('ar', 'en')),
  default_theme text not null default 'light' check (default_theme in ('light', 'dark')),
  default_collection_theme text not null default 'women' check (default_collection_theme in ('women', 'men', 'handmade')),
  currency text not null default 'EGP',
  enable_guest_chat boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.homepage_banners (
  id uuid primary key default gen_random_uuid(),
  placement text not null default 'hero' check (placement in ('hero', 'promo', 'offer')),
  collection_id uuid references public.collections(id) on delete set null,
  title_ar text not null,
  title_en text not null,
  subtitle_ar text,
  subtitle_en text,
  cta_text_ar text,
  cta_text_en text,
  cta_link text,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  customer_name text,
  customer_phone text,
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'phone', 'contact_form')),
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'resolved', 'archived')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  guest_token_hash text not null unique,
  guest_name text,
  status text not null default 'open' check (status in ('open', 'closed')),
  unread_by_admin integer not null default 0,
  unread_by_guest integer not null default 0,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('guest', 'admin')),
  sender_admin_id uuid references public.admin_users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
