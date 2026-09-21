-- ============================================================
-- 006: Product variants, catalog fields, categories seed, RLS
-- Run AFTER 001–005. Do not re-run earlier migrations.
-- ============================================================

-- ========================
-- PRODUCT STATUS: add INACTIVE (hide without delete)
-- ========================
do $$ begin
  alter type product_status add value if not exists 'INACTIVE';
exception
  when duplicate_object then null;
end $$;

-- ========================
-- PRODUCT CONDITION (flexible; nullable on product/variant)
-- ========================
do $$ begin
  create type product_condition as enum (
    'FRESH',
    'GOOD',
    'NEAR_EXPIRY',
    'CLEARANCE',
    'EXPIRED',
    'NEW',
    'USED'
  );
exception
  when duplicate_object then null;
end $$;

-- ========================
-- EXTEND products
-- ========================
alter table public.products
  add column if not exists unit text,
  add column if not exists condition product_condition,
  add column if not exists expires_at date,
  add column if not exists discount_percent numeric(5,2)
    check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 100));

comment on column public.products.unit is 'e.g. kg, bag, piece, bottle — nullable';
comment on column public.products.expires_at is 'Best-before/expiry; null = not applicable';
comment on column public.products.discount_percent is 'Optional % off base price; sale price derived in app';

create index if not exists idx_products_expires_at on public.products(expires_at)
  where expires_at is not null;
create index if not exists idx_products_category_status on public.products(category_id, status);

-- ========================
-- PRODUCT VARIANTS
-- ========================
create table if not exists public.product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null, -- e.g. "Agege Bread — Large"
  brand text,
  size text, -- e.g. Small, Large, 5kg, 35cl
  weight_kg numeric(8,2),
  unit text,
  sku text not null,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2),
  discount_percent numeric(5,2)
    check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 100)),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer default 5,
  condition product_condition,
  expires_at date,
  is_available boolean default true,
  images jsonb default '[]'::jsonb,
  sort_order int default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (sku)
);

create index if not exists idx_variants_product on public.product_variants(product_id);
create index if not exists idx_variants_available on public.product_variants(is_available);
create index if not exists idx_variants_expires on public.product_variants(expires_at)
  where expires_at is not null;
create index if not exists idx_variants_stock on public.product_variants(stock_quantity);

create trigger set_updated_at before update on public.product_variants
  for each row execute function public.handle_updated_at();

-- ========================
-- CART / ORDER: variant support (nullable for legacy rows)
-- ========================
alter table public.cart_items
  add column if not exists variant_id uuid references public.product_variants(id) on delete cascade;

-- Drop old unique if present; allow same product with different variants
alter table public.cart_items drop constraint if exists cart_items_cart_id_product_id_key;

create unique index if not exists cart_items_cart_product_variant_uidx
  on public.cart_items (
    cart_id,
    product_id,
    coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

alter table public.order_items
  add column if not exists variant_id uuid references public.product_variants(id) on delete set null,
  add column if not exists variant_label text,
  add column if not exists variant_sku text;

create index if not exists idx_order_items_variant on public.order_items(variant_id);

-- ========================
-- RLS: product_variants
-- ========================
alter table public.product_variants enable row level security;

-- Public: available variants of ACTIVE products
create policy "Anyone can view available variants of active products"
  on public.product_variants for select
  using (
    is_available = true
    and exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and p.status = 'ACTIVE'
    )
  );

-- Staff: all variants
create policy "Staff can view all variants"
  on public.product_variants for select
  using (public.is_staff());

-- Vendors: variants of own products
create policy "Vendors can view own product variants"
  on public.product_variants for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and p.vendor_id is not null
        and public.owns_vendor(p.vendor_id)
    )
  );

create policy "Vendors can insert own product variants"
  on public.product_variants for insert
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and p.vendor_id is not null
        and public.owns_vendor(p.vendor_id)
    )
  );

create policy "Vendors can update own product variants"
  on public.product_variants for update
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and p.vendor_id is not null
        and public.owns_vendor(p.vendor_id)
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and p.vendor_id is not null
        and public.owns_vendor(p.vendor_id)
    )
  );

create policy "Vendors can delete own product variants"
  on public.product_variants for delete
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and p.vendor_id is not null
        and public.owns_vendor(p.vendor_id)
    )
  );

-- Admins: full control
create policy "Admins can manage variants"
  on public.product_variants for all
  using (public.is_admin())
  with check (public.is_admin());

-- ========================
-- CATEGORY SEED (hierarchy examples — extendable by admin)
-- ========================
-- Parents
insert into public.categories (id, name, slug, description, parent_id, is_active, sort_order) values
  ('c1000001-0001-4000-8000-000000000001', 'Foodstuff', 'foodstuff', 'Rice, beans, grains and staples', null, true, 10),
  ('c1000001-0001-4000-8000-000000000002', 'Drinks', 'drinks', 'Water, soft drinks and beverages', null, true, 20),
  ('c1000001-0001-4000-8000-000000000003', 'Bread & Bakery', 'bread-bakery', 'Bread, cakes and pastries', null, true, 30),
  ('c1000001-0001-4000-8000-000000000004', 'Household', 'household', 'Cleaning and home supplies', null, true, 40),
  ('c1000001-0001-4000-8000-000000000005', 'Personal Care', 'personal-care', 'Body, hair and oral care', null, true, 50)
on conflict (slug) do nothing;

-- Children (Foodstuff)
insert into public.categories (name, slug, parent_id, is_active, sort_order) values
  ('Rice', 'rice', 'c1000001-0001-4000-8000-000000000001', true, 1),
  ('Beans', 'beans', 'c1000001-0001-4000-8000-000000000001', true, 2),
  ('Garri', 'garri', 'c1000001-0001-4000-8000-000000000001', true, 3),
  ('Flour', 'flour', 'c1000001-0001-4000-8000-000000000001', true, 4),
  ('Semovita', 'semovita', 'c1000001-0001-4000-8000-000000000001', true, 5),
  ('Spaghetti', 'spaghetti', 'c1000001-0001-4000-8000-000000000001', true, 6),
  ('Other Foodstuff', 'other-foodstuff', 'c1000001-0001-4000-8000-000000000001', true, 99)
on conflict (slug) do nothing;

-- Children (Drinks)
insert into public.categories (name, slug, parent_id, is_active, sort_order) values
  ('Soft Drinks', 'soft-drinks', 'c1000001-0001-4000-8000-000000000002', true, 1),
  ('Water', 'water', 'c1000001-0001-4000-8000-000000000002', true, 2),
  ('Juice', 'juice', 'c1000001-0001-4000-8000-000000000002', true, 3),
  ('Malt Drinks', 'malt-drinks', 'c1000001-0001-4000-8000-000000000002', true, 4),
  ('Energy Drinks', 'energy-drinks', 'c1000001-0001-4000-8000-000000000002', true, 5)
on conflict (slug) do nothing;

-- Children (Bread & Bakery)
insert into public.categories (name, slug, parent_id, is_active, sort_order) values
  ('Bread', 'bread', 'c1000001-0001-4000-8000-000000000003', true, 1),
  ('Cakes', 'cakes', 'c1000001-0001-4000-8000-000000000003', true, 2),
  ('Biscuits', 'biscuits', 'c1000001-0001-4000-8000-000000000003', true, 3),
  ('Pastries', 'pastries', 'c1000001-0001-4000-8000-000000000003', true, 4)
on conflict (slug) do nothing;

-- Children (Household)
insert into public.categories (name, slug, parent_id, is_active, sort_order) values
  ('Detergent', 'detergent', 'c1000001-0001-4000-8000-000000000004', true, 1),
  ('Soap', 'soap', 'c1000001-0001-4000-8000-000000000004', true, 2),
  ('Tissue', 'tissue', 'c1000001-0001-4000-8000-000000000004', true, 3),
  ('Cleaning Products', 'cleaning-products', 'c1000001-0001-4000-8000-000000000004', true, 4)
on conflict (slug) do nothing;

-- Children (Personal Care)
insert into public.categories (name, slug, parent_id, is_active, sort_order) values
  ('Body Care', 'body-care', 'c1000001-0001-4000-8000-000000000005', true, 1),
  ('Hair Care', 'hair-care', 'c1000001-0001-4000-8000-000000000005', true, 2),
  ('Oral Care', 'oral-care', 'c1000001-0001-4000-8000-000000000005', true, 3)
on conflict (slug) do nothing;

-- ========================
-- DONE
-- ========================
