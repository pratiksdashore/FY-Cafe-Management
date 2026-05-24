create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric not null,
  image_url text,
  category text default 'Other',
  is_veg boolean default true,
  is_best_seller boolean default false,
  is_today_special boolean default false,
  is_available boolean default true,
  prep_time_minutes int default 15,
  discount_percent numeric default 0,
  created_at timestamptz default now()
);
alter table menu_items enable row level security;
create policy "Public read" on menu_items for select using (true);
create policy "Admin write" on menu_items for all using (true);
