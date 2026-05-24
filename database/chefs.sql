-- Chefs table
create table if not exists public.chefs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  experience_years int default 0,
  specialty text,
  is_available boolean default true,
  current_assigned_orders int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.chefs enable row level security;

-- Admin can manage all chefs
create policy "Admins can manage all chefs" on public.chefs
  for all using (true);

-- Public can read chef info (e.g. for "Meet our chefs")
create policy "Everyone can view chefs" on public.chefs
  for select using (true);
