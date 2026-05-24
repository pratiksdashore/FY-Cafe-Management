-- Orders table
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  token_number int not null,
  status text not null default 'PLACED' check (status in ('PLACED','PREPARING','READY','COMPLETED','CANCELLED')),
  total_amount numeric not null,
  phone text,
  estimated_ready_at timestamptz,   -- set by admin when marking as PREPARING
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Order items table
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  menu_item_id text not null,
  menu_item_data jsonb not null,
  quantity int not null,
  unit_price numeric not null,
  subtotal numeric not null
);

-- Enable Row Level Security
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Users can see their own orders
create policy "Users can view own orders" on public.orders
  for select using (auth.uid() = user_id);

create policy "Users can insert own orders" on public.orders
  for insert with check (auth.uid() = user_id);

-- Admin can see all orders (uses service role or anon with no filter)
create policy "Admins can view all orders" on public.orders
  for all using (true);

-- Order items follow order permissions
create policy "Users can view own order items" on public.order_items
  for select using (
    order_id in (select id from public.orders where user_id = auth.uid())
  );

create policy "Users can insert own order items" on public.order_items
  for insert with check (
    order_id in (select id from public.orders where user_id = auth.uid())
  );

create policy "Admins can manage order items" on public.order_items
  for all using (true);
