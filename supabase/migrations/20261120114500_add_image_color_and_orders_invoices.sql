-- Add color_hex to product_images and create admin-only orders/order_items tables
-- for external financial invoice tracking and dashboard reporting.

begin;

alter table public.product_images
  add column if not exists color_hex text;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  inquiry_id uuid references public.inquiries(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  customer_address text,
  order_source text not null default 'whatsapp'
    check (order_source in ('whatsapp', 'phone', 'instagram', 'in_store', 'website_chat')),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'partial', 'paid', 'refunded')),
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  shipping_fee numeric(12, 2) not null default 0 check (shipping_fee >= 0),
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  paid_amount numeric(12, 2) not null default 0 check (paid_amount >= 0),
  currency text not null default 'EGP',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  color_hex text,
  size_label text,
  quantity integer not null default 1 check (quantity >= 1),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  line_total numeric(12, 2) not null default 0 check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_status on public.orders (status, payment_status);
create index if not exists idx_order_items_order_id on public.order_items (order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Admins can manage orders" on public.orders;
create policy "Admins can manage orders" on public.orders
  for all to authenticated
  using (private.is_active_admin())
  with check (private.is_active_admin());

drop policy if exists "Admins can manage order items" on public.order_items;
create policy "Admins can manage order items" on public.order_items
  for all to authenticated
  using (private.is_active_admin())
  with check (private.is_active_admin());

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row
  execute function public.set_updated_at();

commit;
