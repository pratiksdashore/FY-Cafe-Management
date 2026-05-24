-- ============================================================
-- RATINGS SCHEMA - Add star ratings for food items
-- Run this file in Supabase SQL editor to update the schema
-- ============================================================

-- 1. Create the food_ratings table
create table if not exists food_ratings (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  is_anonymous boolean default false,
  created_at timestamptz default now(),
  -- Ensure one review per user per menu item per order
  unique (menu_item_id, order_id, user_id)
);

-- 2. Enable Row Level Security
alter table food_ratings enable row level security;

-- 3. RLS Policies
-- Anyone can read non-anonymous reviews (admins can read all)
create policy "Public read reviews"
  on food_ratings for select
  using (true);

-- Authenticated users can insert their own reviews
create policy "Users can insert own reviews"
  on food_ratings for insert
  with check (auth.uid() = user_id or is_anonymous = true);

-- Users can update their own reviews
create policy "Users can update own reviews"
  on food_ratings for update
  using (auth.uid() = user_id);

-- Users can delete their own reviews
create policy "Users can delete own reviews"
  on food_ratings for delete
  using (auth.uid() = user_id);

-- 4. Add aggregate rating columns to menu_items table
--    These are denormalized for fast reads
alter table menu_items
  add column if not exists avg_rating numeric(2, 1) default 0,
  add column if not exists rating_count int default 0;

-- 5. Function: Recalculate and update avg_rating + rating_count on menu_items
create or replace function update_menu_item_rating()
returns trigger as $$
declare
  new_avg numeric(2,1);
  new_count int;
begin
  -- Determine which menu_item_id to recalculate
  select
    round(avg(rating)::numeric, 1),
    count(*)
  into new_avg, new_count
  from food_ratings
  where menu_item_id = coalesce(new.menu_item_id, old.menu_item_id);

  update menu_items
  set
    avg_rating = coalesce(new_avg, 0),
    rating_count = coalesce(new_count, 0)
  where id = coalesce(new.menu_item_id, old.menu_item_id);

  return new;
end;
$$ language plpgsql security definer;

-- 6. Trigger: Fire after INSERT, UPDATE, or DELETE on food_ratings
drop trigger if exists trg_update_menu_item_rating on food_ratings;
create trigger trg_update_menu_item_rating
  after insert or update or delete on food_ratings
  for each row execute procedure update_menu_item_rating();

-- 7. Index for fast lookups
create index if not exists idx_food_ratings_menu_item on food_ratings(menu_item_id);
create index if not exists idx_food_ratings_order on food_ratings(order_id);
create index if not exists idx_food_ratings_user on food_ratings(user_id);

-- 8. Backfill: Recalculate all existing menu_item averages
--    (Run once for any pre-existing ratings data)
update menu_items mi
set
  avg_rating = coalesce(sub.avg_r, 0),
  rating_count = coalesce(sub.cnt, 0)
from (
  select menu_item_id, round(avg(rating)::numeric, 1) as avg_r, count(*) as cnt
  from food_ratings
  group by menu_item_id
) sub
where mi.id = sub.menu_item_id;
