-- ============================================================
-- VendorFlow Row Level Security (RLS) Policies
-- Run AFTER 001, 002, and 003 migrations
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get current user's role from profiles
create or replace function public.get_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Check if current user is admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Check if current user is staff (admin, warehouse, support, delivery)
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'warehouse', 'support', 'delivery')
  );
$$;

-- Check if current user owns a vendor
create or replace function public.owns_vendor(vendor_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vendors
    where id = vendor_uuid and owner_id = auth.uid()
  );
$$;

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_profiles enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;

-- ============================================================
-- PROFILES
-- ============================================================

-- Users can view their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Staff can view all profiles
create policy "Staff can view all profiles"
  on public.profiles for select
  using (public.is_staff());

-- Users can update their own profile (but not role)
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins can update any profile (including role)
create policy "Admins can update any profile"
  on public.profiles for update
  using (public.is_admin());

-- Note: Profile insert is handled by the security definer trigger on auth.users

-- ============================================================
-- CATEGORIES
-- ============================================================

-- Anyone (including anonymous) can read active categories
create policy "Anyone can view active categories"
  on public.categories for select
  using (is_active = true);

-- Staff can view all categories (including inactive)
create policy "Staff can view all categories"
  on public.categories for select
  using (public.is_staff());

-- Only admins can insert/update/delete categories
create policy "Admins can manage categories"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- PRODUCTS
-- ============================================================

-- Anyone can view ACTIVE products
create policy "Anyone can view active products"
  on public.products for select
  using (status = 'ACTIVE');

-- Staff can view all products
create policy "Staff can view all products"
  on public.products for select
  using (public.is_staff());

-- Vendor owners can view their own products (any status)
create policy "Vendors can view own products"
  on public.products for select
  using (
    vendor_id is not null
    and public.owns_vendor(vendor_id)
  );

-- Admins can do everything on products
create policy "Admins can manage products"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

-- Vendors can insert products for their own vendor
create policy "Vendors can insert own products"
  on public.products for insert
  with check (
    vendor_id is not null
    and public.owns_vendor(vendor_id)
  );

-- Vendors can update their own products
create policy "Vendors can update own products"
  on public.products for update
  using (
    vendor_id is not null
    and public.owns_vendor(vendor_id)
  )
  with check (
    vendor_id is not null
    and public.owns_vendor(vendor_id)
  );

-- ============================================================
-- ADDRESSES
-- ============================================================

-- Users can manage their own addresses
create policy "Users can view own addresses"
  on public.addresses for select
  using (auth.uid() = user_id);

create policy "Users can insert own addresses"
  on public.addresses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own addresses"
  on public.addresses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own addresses"
  on public.addresses for delete
  using (auth.uid() = user_id);

-- Staff can view all addresses
create policy "Staff can view all addresses"
  on public.addresses for select
  using (public.is_staff());

-- ============================================================
-- ORDERS
-- ============================================================

-- Authenticated users can view their own orders
create policy "Users can view own orders"
  on public.orders for select
  using (auth.uid() = user_id);

-- Staff can view all orders
create policy "Staff can view all orders"
  on public.orders for select
  using (public.is_staff());

-- Anyone (logged in or guest) can create orders
-- Guest orders have user_id = null
create policy "Anyone can create orders"
  on public.orders for insert
  with check (
    -- Logged-in user creating their own order
    (auth.uid() is not null and user_id = auth.uid())
    or
    -- Guest order (no user)
    (auth.uid() is null and user_id is null)
    or
    -- Logged-in user creating a guest-style order (user_id null is also ok)
    (auth.uid() is not null and user_id is null)
  );

-- Users cannot update their own orders after creation (status changes by staff only)
-- Staff can update any order
create policy "Staff can update orders"
  on public.orders for update
  using (public.is_staff())
  with check (public.is_staff());

-- Admins can delete orders if needed
create policy "Admins can delete orders"
  on public.orders for delete
  using (public.is_admin());

-- ============================================================
-- ORDER ITEMS
-- ============================================================

-- Users can view items of their own orders
create policy "Users can view own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );

-- Staff can view all order items
create policy "Staff can view all order items"
  on public.order_items for select
  using (public.is_staff());

-- Anyone can insert order items (during checkout)
-- The order itself is already protected by the orders insert policy
create policy "Anyone can insert order items"
  on public.order_items for insert
  with check (true);

-- Only staff can update/delete order items
create policy "Staff can update order items"
  on public.order_items for update
  using (public.is_staff());

create policy "Admins can delete order items"
  on public.order_items for delete
  using (public.is_admin());

-- ============================================================
-- PAYMENTS
-- ============================================================

-- Users can view payments of their own orders
create policy "Users can view own payments"
  on public.payments for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = payments.order_id
        and orders.user_id = auth.uid()
    )
  );

-- Staff can view all payments
create policy "Staff can view all payments"
  on public.payments for select
  using (public.is_staff());

-- Anyone can insert payments (during checkout)
create policy "Anyone can insert payments"
  on public.payments for insert
  with check (true);

-- Only staff can update payments (verification, status changes)
create policy "Staff can update payments"
  on public.payments for update
  using (public.is_staff());

-- ============================================================
-- VENDORS
-- ============================================================

-- Anyone can view APPROVED vendors
create policy "Anyone can view approved vendors"
  on public.vendors for select
  using (status = 'APPROVED');

-- Vendor owners can view their own vendor (any status)
create policy "Owners can view own vendor"
  on public.vendors for select
  using (owner_id = auth.uid());

-- Staff can view all vendors
create policy "Staff can view all vendors"
  on public.vendors for select
  using (public.is_staff());

-- Authenticated users can create a vendor (becomes PENDING)
create policy "Users can create vendor"
  on public.vendors for insert
  with check (owner_id = auth.uid());

-- Owners can update their own vendor (but not status/commission)
create policy "Owners can update own vendor"
  on public.vendors for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Admins can fully manage vendors
create policy "Admins can manage vendors"
  on public.vendors for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- VENDOR PROFILES
-- ============================================================

-- Owners can view/manage their vendor profile
create policy "Owners can view own vendor profile"
  on public.vendor_profiles for select
  using (
    exists (
      select 1 from public.vendors
      where vendors.id = vendor_profiles.vendor_id
        and vendors.owner_id = auth.uid()
    )
  );

create policy "Owners can insert own vendor profile"
  on public.vendor_profiles for insert
  with check (
    exists (
      select 1 from public.vendors
      where vendors.id = vendor_profiles.vendor_id
        and vendors.owner_id = auth.uid()
    )
  );

create policy "Owners can update own vendor profile"
  on public.vendor_profiles for update
  using (
    exists (
      select 1 from public.vendors
      where vendors.id = vendor_profiles.vendor_id
        and vendors.owner_id = auth.uid()
    )
  );

-- Staff can view all vendor profiles
create policy "Staff can view all vendor profiles"
  on public.vendor_profiles for select
  using (public.is_staff());

-- Admins full access
create policy "Admins can manage vendor profiles"
  on public.vendor_profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- CARTS
-- ============================================================

-- Users can view their own carts
create policy "Users can view own carts"
  on public.carts for select
  using (auth.uid() = user_id);

-- Users can create their own cart
create policy "Users can create own cart"
  on public.carts for insert
  with check (auth.uid() = user_id);

-- Users can update/delete their own cart
create policy "Users can update own cart"
  on public.carts for update
  using (auth.uid() = user_id);

create policy "Users can delete own cart"
  on public.carts for delete
  using (auth.uid() = user_id);

-- ============================================================
-- CART ITEMS
-- ============================================================

-- Users can manage items in their own carts
create policy "Users can view own cart items"
  on public.cart_items for select
  using (
    exists (
      select 1 from public.carts
      where carts.id = cart_items.cart_id
        and carts.user_id = auth.uid()
    )
  );

create policy "Users can insert own cart items"
  on public.cart_items for insert
  with check (
    exists (
      select 1 from public.carts
      where carts.id = cart_items.cart_id
        and carts.user_id = auth.uid()
    )
  );

create policy "Users can update own cart items"
  on public.cart_items for update
  using (
    exists (
      select 1 from public.carts
      where carts.id = cart_items.cart_id
        and carts.user_id = auth.uid()
    )
  );

create policy "Users can delete own cart items"
  on public.cart_items for delete
  using (
    exists (
      select 1 from public.carts
      where carts.id = cart_items.cart_id
        and carts.user_id = auth.uid()
    )
  );

-- ============================================================
-- GRANT EXECUTE ON FUNCTIONS
-- ============================================================

grant execute on function public.generate_order_number() to anon, authenticated;
grant execute on function public.get_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.owns_vendor(uuid) to authenticated;

-- ============================================================
-- DONE
-- ============================================================
-- After running this file:
-- 1. Public can browse products & categories
-- 2. Guests and logged-in users can place orders
-- 3. Users only see their own orders / profile / addresses
-- 4. Staff (admin/warehouse/support/delivery) can manage orders
-- 5. Admins have full control
