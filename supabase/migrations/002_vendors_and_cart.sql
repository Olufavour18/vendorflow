-- Phase 2: Vendors, Vendor Profiles, Cart
-- Run this AFTER 001_initial_schema.sql

-- ========================
-- VENDOR STATUS ENUM
-- ========================
create type vendor_status as enum (
  'PENDING',
  'APPROVED',
  'SUSPENDED',
  'REJECTED'
);

-- ========================
-- VENDORS
-- ========================
create table public.vendors (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  business_name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  banner_url text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  status vendor_status default 'PENDING',
  is_verified boolean default false,
  commission_rate numeric(5,2) default 0.00, -- platform commission %
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ========================
-- VENDOR PROFILES (extra details)
-- ========================
create table public.vendor_profiles (
  id uuid primary key default uuid_generate_v4(),
  vendor_id uuid not null unique references public.vendors(id) on delete cascade,
  bank_name text,
  bank_account_number text,
  bank_account_name text,
  tax_id text,
  business_registration_number text,
  website text,
  social_links jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ========================
-- ADD vendor_id TO PRODUCTS
-- ========================
alter table public.products
  add column if not exists vendor_id uuid references public.vendors(id) on delete set null;

create index if not exists idx_products_vendor on public.products(vendor_id);

-- ========================
-- UPDATE PROFILES ROLE (add vendor)
-- ========================
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('customer', 'admin', 'warehouse', 'delivery', 'support', 'vendor'));

-- ========================
-- CART (database-backed)
-- ========================
create table public.carts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  session_id text, -- for guest carts
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint carts_user_or_session check (user_id is not null or session_id is not null)
);

create table public.cart_items (
  id uuid primary key default uuid_generate_v4(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (cart_id, product_id)
);

-- ========================
-- INDEXES
-- ========================
create index idx_vendors_owner on public.vendors(owner_id);
create index idx_vendors_slug on public.vendors(slug);
create index idx_vendors_status on public.vendors(status);
create index idx_carts_user on public.carts(user_id);
create index idx_carts_session on public.carts(session_id);
create index idx_cart_items_cart on public.cart_items(cart_id);
create index idx_cart_items_product on public.cart_items(product_id);

-- ========================
-- UPDATED_AT TRIGGERS
-- ========================
create trigger set_updated_at before update on public.vendors
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.vendor_profiles
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.carts
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.cart_items
  for each row execute function public.handle_updated_at();
