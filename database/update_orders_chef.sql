-- Add chef_id to orders
alter table public.orders 
add column if not exists chef_id uuid references public.chefs(id);

-- Updated trigger to track current_assigned_orders (only for active statuses)
create or replace function public.update_chef_order_count()
returns trigger as $$
declare
  is_new_active boolean;
  is_old_active boolean;
begin
  is_new_active := (new.status in ('PLACED', 'PREPARING'));
  is_old_active := (old.status in ('PLACED', 'PREPARING'));

  -- CASE 1: INSERT
  if (tg_op = 'INSERT') then
    if (new.chef_id is not null and is_new_active) then
      update public.chefs set current_assigned_orders = current_assigned_orders + 1 where id = new.chef_id;
    end if;
  
  -- CASE 2: UPDATE
  elsif (tg_op = 'UPDATE') then
    -- If chef changed
    if (old.chef_id is not null and is_old_active and (new.chef_id is null or old.chef_id != new.chef_id)) then
      update public.chefs set current_assigned_orders = current_assigned_orders - 1 where id = old.chef_id;
    end if;
    if (new.chef_id is not null and is_new_active and (old.chef_id is null or old.chef_id != new.chef_id)) then
      update public.chefs set current_assigned_orders = current_assigned_orders + 1 where id = new.chef_id;
    end if;

    -- If status changed but chef stayed the same
    if (old.chef_id = new.chef_id and old.chef_id is not null) then
      if (is_old_active and not is_new_active) then
        update public.chefs set current_assigned_orders = current_assigned_orders - 1 where id = new.chef_id;
      elsif (not is_old_active and is_new_active) then
        update public.chefs set current_assigned_orders = current_assigned_orders + 1 where id = new.chef_id;
      end if;
    end if;

  -- CASE 3: DELETE
  elsif (tg_op = 'DELETE') then
    if (old.chef_id is not null and is_old_active) then
      update public.chefs set current_assigned_orders = current_assigned_orders - 1 where id = old.chef_id;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists tr_update_chef_order_count on public.orders;
create trigger tr_update_chef_order_count
after insert or update or delete on public.orders
for each row execute function public.update_chef_order_count();

-- Optional: Recalculate all counts to fix existing data
update public.chefs c
set current_assigned_orders = (
  select count(*)
  from public.orders o
  where o.chef_id = c.id
  and o.status in ('PLACED', 'PREPARING')
);
