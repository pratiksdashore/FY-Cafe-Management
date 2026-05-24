create table public.user_recommendations (
  user_id uuid references auth.users not null primary key,
  recommendations jsonb not null,
  updated_at timestamptz default now()
);

alter table public.user_recommendations enable row level security;

create policy "Users can see their own recommendations" on public.user_recommendations for select using (auth.uid() = user_id);
create policy "Users can insert their own recommendations" on public.user_recommendations for insert with check (auth.uid() = user_id);
create policy "Users can update their own recommendations" on public.user_recommendations for update using (auth.uid() = user_id);
