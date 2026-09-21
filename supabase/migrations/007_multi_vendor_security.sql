-- ============================================================
-- 007: Multi-vendor isolation, order_items.vendor_id,
--      vendor order access, address default constraint,
--      payment least-privilege, product delete for vendors
-- Run AFTER 001–006. Preserves existing data.
-- ============================================================

-- ========================
-- ORDER ITEMS: vendor ownership snapshot
-- ========================
alter table public.order_items
  add column if not exists vendor_id uuid references public.vendors(id) on delete set null;

create index if not exists idx_order_items_vendor on public.order_items(vendor_id);

comment on column public.order_items.vendor_id is
  'Snapshot of product.vendor_id at order time for multi-vendor isolation';

-- Backfill from products where possible
update public.order_items oi
set vendor_id = p.vendor_id
from public.products p
where oi.product_id = p.id
  and oi.vendor_id is null
  and p.vendor_id is not null;

-- ========================
-- ADDRESSES: at most one default per user
-- ========================
create unique index if not exists addresses_one_default_per_user
  on public.addresses (user_id)
  where is_default = true;

-- Enforce: when setting is_default=true, clear others (security definer)
create or replace function public.ensure_single_default_address()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_default = true then
    update public.addresses
    set is_default = false
    where user_id = new.user_id
      and id is distinct from new.id
      and is_default = true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_addresses_single_default on public.addresses;
create trigger trg_addresses_single_default
  before insert or update of is_default on public.addresses
  for each row
  when (new.is_default = true)
  execute function public.ensure_single_default_address();

-- ========================
-- PRODUCTS: vendors may delete own products
-- ========================
drop policy if exists "Vendors can delete own products" on public.products;
create policy "Vendors can delete own products"
  on public.products for delete
  using (
    vendor_id is not null
    and public.owns_vendor(vendor_id)
  );

-- ========================
-- ORDER ITEMS: vendor can view only their line items
-- ========================
drop policy if exists "Vendors can view own order items" on public.order_items;
create policy "Vendors can view own order items"
  on public.order_items for select
  using (
    vendor_id is not null
    and public.owns_vendor(vendor_id)
  );

-- ========================
-- ORDERS: vendor can view orders that include their items
-- ========================
drop policy if exists "Vendors can view orders containing their items" on public.orders;
create policy "Vendors can view orders containing their items"
  on public.orders for select
  using (
    exists (
      select 1 from public.order_items oi
      where oi.order_id = orders.id
        and oi.vendor_id is not null
        and public.owns_vendor(oi.vendor_id)
    )
  );

-- ========================
-- PAYMENTS: customers may update gateway_reference on own pending payments
-- ========================
drop policy if exists "Users can update own pending payment refs" on public.payments;
create policy "Users can update own pending payment refs"
  on public.payments for update
  using (
    exists (
      select 1 from public.orders
      where orders.id = payments.order_id
        and orders.user_id = auth.uid()
    )
    and status = 'PENDING'
  )
  with check (
    exists (
      select 1 from public.orders
      where orders.id = payments.order_id
        and orders.user_id = auth.uid()
    )
  );

create or replace function public.current_vendor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.vendors where owner_id = auth.uid() limit 1;
$$;

grant execute on function public.current_vendor_id() to authenticated;
grant execute on function public.ensure_single_default_address() to authenticated;
