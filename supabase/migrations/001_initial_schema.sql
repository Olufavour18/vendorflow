-- Phase 1: Core SQL Schema for VendorFlow
-- Run this in your Supabase SQL Editor

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ========================
-- ENUMS
-- ========================
create type order_status as enum (
  'PENDING_PAYMENT',
  'PAYMENT_CONFIRMED',
  'STOCK_CHECK',
  'STOCK_CONFIRMED',
  'ORDER_PROCESSING',
  'PACKED',
  'READY_FOR_DELIVERY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'PAYMENT_FAILED',
  'OUT_OF_STOCK',
  'ORDER_CANCELLED',
  'DELIVERY_FAILED',
  'REFUND_PENDING',
  'REFUNDED'
);

create type payment_status as enum (
  'PENDING',
  'SUCCESS',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED'
);

create type payment_method as enum (
  'PAYSTACK',
  'FLUTTERWAVE',
  'BANK_TRANSFER',
  'CASH_ON_DELIVERY'
);

create type product_status as enum (
  'ACTIVE',
  'DRAFT',
  'ARCHIVED',
  'OUT_OF_STOCK'
);

-- ========================
-- PROFILES
-- ========================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  role text default 'customer' check (role in ('customer', 'admin', 'warehouse', 'delivery', 'support')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ========================
-- CATEGORIES
-- ========================
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  parent_id uuid references public.categories(id) on delete set null,
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ========================
-- PRODUCTS
-- ========================
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  short_description text,
  sku text not null unique,
  category_id uuid references public.categories(id) on delete set null,
  brand text,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2),
  cost_price numeric(12,2),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer default 5,
  weight_kg numeric(8,2),
  status product_status default 'DRAFT',
  is_featured boolean default false,
  images jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ========================
-- ADDRESSES
-- ========================
create table public.addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  full_name text not null,
  phone text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  landmark text,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ========================
-- ORDERS
-- ========================
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_email text,
  customer_phone text not null,
  subtotal numeric(12,2) not null,
  shipping_fee numeric(12,2) default 0,
  discount_amount numeric(12,2) default 0,
  total_amount numeric(12,2) not null,
  order_status order_status default 'PENDING_PAYMENT',
  payment_status payment_status default 'PENDING',
  shipping_address jsonb not null,
  notes text,
  internal_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  paid_at timestamptz,
  delivered_at timestamptz
);

-- ========================
-- ORDER ITEMS
-- ========================
create table public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_sku text not null,
  product_image text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  total_price numeric(12,2) not null,
  created_at timestamptz default now()
);

-- ========================
-- PAYMENTS
-- ========================
create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(12,2) not null,
  currency text default 'NGN',
  payment_method payment_method not null,
  status payment_status default 'PENDING',
  gateway_reference text,
  gateway_response jsonb,
  bank_transfer_reference text,
  payment_proof_url text,
  paid_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ========================
-- INDEXES
-- ========================
create index idx_products_slug on public.products(slug);
create index idx_products_sku on public.products(sku);
create index idx_products_category on public.products(category_id);
create index idx_products_status on public.products(status);
create index idx_orders_order_number on public.orders(order_number);
create index idx_orders_user on public.orders(user_id);
create index idx_orders_status on public.orders(order_status);
create index idx_order_items_order on public.order_items(order_id);
create index idx_payments_order on public.payments(order_id);

-- ========================
-- UPDATED_AT TRIGGER
-- ========================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.profiles for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.categories for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.products for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.addresses for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.orders for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.payments for each row execute function public.handle_updated_at();

-- ========================
-- AUTO CREATE PROFILE
-- ========================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========================
-- ORDER NUMBER SEQUENCE
-- ========================
create sequence if not exists order_number_seq start 10001;

create or replace function public.generate_order_number()
returns text as $$
declare
  new_number text;
begin
  select 'ORD-' || lpad(nextval('order_number_seq')::text, 5, '0') into new_number;
  return new_number;
end;
$$ language plpgsql;
