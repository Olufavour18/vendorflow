-- 008: Atomic stock deduction RPC + fulfillment_method + order_events for n8n
-- Run AFTER 001-007.

alter table public.orders
  add column if not exists fulfillment_method text
    default 'DELIVERY'
    check (fulfillment_method in ('DELIVERY', 'PICKUP'));

create table if not exists public.order_events (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  payload jsonb default '{}'::jsonb,
  source text default 'app',
  created_at timestamptz default now()
);

create index if not exists idx_order_events_order on public.order_events(order_id);
create index if not exists idx_order_events_type on public.order_events(event_type);

alter table public.order_events enable row level security;

drop policy if exists "Staff can view order events" on public.order_events;
create policy "Staff can view order events"
  on public.order_events for select
  using (public.is_staff());

drop policy if exists "Service role inserts order events" on public.order_events;
create policy "Service role inserts order events"
  on public.order_events for insert
  with check (true);

create or replace function public.deduct_order_stock(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_item record;
  v_stock integer;
  v_threshold integer;
  v_next integer;
  v_failures jsonb := '[]'::jsonb;
  v_remaining jsonb := '[]'::jsonb;
  v_ok boolean := true;
begin
  select id, payment_status, order_status
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'ORDER_NOT_FOUND', 'already_processed', false, 'failures', '[]'::jsonb, 'remaining', '[]'::jsonb);
  end if;

  if v_order.order_status in ('STOCK_CONFIRMED', 'ORDER_PROCESSING', 'PACKED', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED') then
    return jsonb_build_object('ok', true, 'already_processed', true, 'failures', '[]'::jsonb, 'remaining', '[]'::jsonb);
  end if;

  if v_order.payment_status is distinct from 'SUCCESS' then
    return jsonb_build_object('ok', false, 'error', 'PAYMENT_NOT_SUCCESS', 'already_processed', false, 'failures', '[]'::jsonb, 'remaining', '[]'::jsonb);
  end if;

  update public.orders set order_status = 'STOCK_CHECK' where id = p_order_id;

  for v_item in
    select id, product_id, variant_id, quantity, product_name
    from public.order_items where order_id = p_order_id
  loop
    if v_item.variant_id is not null then
      select stock_quantity, coalesce(low_stock_threshold, 5)
      into v_stock, v_threshold
      from public.product_variants where id = v_item.variant_id for update;

      if not found then
        v_ok := false;
        v_failures := v_failures || jsonb_build_array(jsonb_build_object('product_id', v_item.product_id, 'variant_id', v_item.variant_id, 'product_name', v_item.product_name, 'requested', v_item.quantity, 'available', 0, 'error', 'VARIANT_NOT_FOUND'));
        continue;
      end if;

      if v_stock < v_item.quantity then
        v_ok := false;
        v_failures := v_failures || jsonb_build_array(jsonb_build_object('product_id', v_item.product_id, 'variant_id', v_item.variant_id, 'product_name', v_item.product_name, 'requested', v_item.quantity, 'available', v_stock));
      else
        v_next := v_stock - v_item.quantity;
        update public.product_variants set stock_quantity = v_next where id = v_item.variant_id;
        v_remaining := v_remaining || jsonb_build_array(jsonb_build_object('product_id', v_item.product_id, 'variant_id', v_item.variant_id, 'product_name', v_item.product_name, 'remaining', v_next, 'low_stock', (v_next > 0 and v_next <= v_threshold), 'out_of_stock', (v_next <= 0), 'threshold', v_threshold));
      end if;
    elsif v_item.product_id is not null then
      select stock_quantity, coalesce(low_stock_threshold, 5)
      into v_stock, v_threshold
      from public.products where id = v_item.product_id for update;

      if not found then
        v_ok := false;
        v_failures := v_failures || jsonb_build_array(jsonb_build_object('product_id', v_item.product_id, 'variant_id', null, 'product_name', v_item.product_name, 'requested', v_item.quantity, 'available', 0, 'error', 'PRODUCT_NOT_FOUND'));
        continue;
      end if;

      if v_stock < v_item.quantity then
        v_ok := false;
        v_failures := v_failures || jsonb_build_array(jsonb_build_object('product_id', v_item.product_id, 'variant_id', null, 'product_name', v_item.product_name, 'requested', v_item.quantity, 'available', v_stock));
      else
        v_next := v_stock - v_item.quantity;
        update public.products
        set stock_quantity = v_next,
            status = case when v_next <= 0 then 'OUT_OF_STOCK'::product_status else status end
        where id = v_item.product_id;
        v_remaining := v_remaining || jsonb_build_array(jsonb_build_object('product_id', v_item.product_id, 'variant_id', null, 'product_name', v_item.product_name, 'remaining', v_next, 'low_stock', (v_next > 0 and v_next <= v_threshold), 'out_of_stock', (v_next <= 0), 'threshold', v_threshold));
      end if;
    end if;
  end loop;

  if v_ok then
    update public.orders set order_status = 'STOCK_CONFIRMED' where id = p_order_id;
  else
    update public.orders set order_status = 'OUT_OF_STOCK' where id = p_order_id;
  end if;

  insert into public.order_events (order_id, event_type, payload, source)
  values (p_order_id, case when v_ok then 'STOCK_DEDUCTED' else 'STOCK_INSUFFICIENT' end,
    jsonb_build_object('ok', v_ok, 'failures', v_failures, 'remaining', v_remaining), 'rpc');

  return jsonb_build_object('ok', v_ok, 'already_processed', false, 'failures', v_failures, 'remaining', v_remaining);
end;
$$;

grant execute on function public.deduct_order_stock(uuid) to service_role;
grant execute on function public.deduct_order_stock(uuid) to authenticated;
