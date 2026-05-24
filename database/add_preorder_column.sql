-- Add pre-order scheduling support
alter table public.orders
  add column if not exists scheduled_at timestamptz default null;

-- Index for efficient querying of upcoming pre-orders
create index if not exists orders_scheduled_at_idx on public.orders (scheduled_at)
  where scheduled_at is not null;

-- Verify: run this to confirm the column exists
-- select column_name, data_type from information_schema.columns
-- where table_name = 'orders' and column_name = 'scheduled_at';
