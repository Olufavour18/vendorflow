-- Phase 5: Storage bucket for product images + notification log
-- Run in Supabase SQL Editor after 001–004

-- ========================
-- STORAGE BUCKET (product-images)
-- Create the bucket in Dashboard → Storage → New bucket
--   Name: product-images
--   Public: YES
-- Then run the policies below.
-- ========================

-- Allow public read of product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- Public can view
create policy "Public can view product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Staff / admins / vendors can upload
create policy "Staff and vendors can upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and (
      public.is_staff()
      or public.get_user_role() = 'vendor'
    )
  );

-- Staff / vendors can update their uploads
create policy "Staff and vendors can update product images"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and (
      public.is_staff()
      or public.get_user_role() = 'vendor'
    )
  );

-- Admins can delete
create policy "Admins can delete product images"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and public.is_admin()
  );

-- ========================
-- NOTIFICATION LOG
-- ========================
create type notification_type as enum (
  'ORDER_CONFIRMATION',
  'ORDER_STATUS_UPDATE',
  'PAYMENT_CONFIRMED',
  'LOW_STOCK',
  'VENDOR_APPROVED',
  'GENERIC'
);

create table if not exists public.notification_logs (
  id uuid primary key default uuid_generate_v4(),
  type notification_type not null default 'GENERIC',
  recipient_email text,
  recipient_user_id uuid references public.profiles(id) on delete set null,
  subject text,
  body text,
  metadata jsonb default '{}'::jsonb,
  status text default 'PENDING' check (status in ('PENDING', 'SENT', 'FAILED', 'SKIPPED')),
  error_message text,
  created_at timestamptz default now(),
  sent_at timestamptz
);

create index if not exists idx_notification_logs_user on public.notification_logs(recipient_user_id);
create index if not exists idx_notification_logs_status on public.notification_logs(status);

alter table public.notification_logs enable row level security;

create policy "Admins can view notification logs"
  on public.notification_logs for select
  using (public.is_admin());

create policy "Service role inserts notifications"
  on public.notification_logs for insert
  with check (true);

-- ========================
-- HELPER: low stock products view for staff
-- ========================
create or replace view public.low_stock_products as
select
  id,
  name,
  sku,
  stock_quantity,
  low_stock_threshold,
  vendor_id,
  status
from public.products
where stock_quantity <= low_stock_threshold
  and status in ('ACTIVE', 'OUT_OF_STOCK');
