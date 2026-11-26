-- Additive and rerunnable. Run in the project's Supabase SQL editor as postgres.
begin;

create table if not exists public.reward_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version = 1),
  goal_json jsonb,
  updated_at timestamptz not null check (isfinite(updated_at)),
  device_id text not null check (length(btrim(device_id)) between 1 and 200),
  check (goal_json is null or jsonb_typeof(goal_json) = 'object')
);

alter table public.reward_settings enable row level security;
revoke all on public.reward_settings from public, anon;
grant select, insert, update on public.reward_settings to authenticated;

drop policy if exists reward_settings_select_own on public.reward_settings;
create policy reward_settings_select_own on public.reward_settings
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists reward_settings_insert_own on public.reward_settings;
create policy reward_settings_insert_own on public.reward_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists reward_settings_update_own on public.reward_settings;
create policy reward_settings_update_own on public.reward_settings
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.sync_reward_settings(
  p_goal jsonb,
  p_updated_at timestamptz,
  p_device_id text
)
returns setof public.reward_settings
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  -- A missing timestamp is read-only: a new/legacy empty device cannot clear cloud data.
  if p_updated_at is not null then
    if not isfinite(p_updated_at) or p_device_id is null or
        length(btrim(p_device_id)) not between 1 and 200 then
      raise exception 'Invalid reward metadata' using errcode = '22023';
    end if;
    if p_goal is not null then
      if not coalesce(
        jsonb_typeof(p_goal) = 'object' and
        jsonb_typeof(p_goal->'id') = 'string' and length(btrim(p_goal->>'id')) > 0 and
        jsonb_typeof(p_goal->'title') = 'string' and length(btrim(p_goal->>'title')) > 0 and
        length(p_goal->>'title') <= 60 and
        jsonb_typeof(p_goal->'targetPoints') = 'number' and
        jsonb_typeof(p_goal->'createdAt') = 'string' and
        (not (p_goal ? 'note') or (jsonb_typeof(p_goal->'note') = 'string' and length(p_goal->>'note') <= 120)) and
        (not (p_goal ? 'completedAt') or jsonb_typeof(p_goal->'completedAt') = 'string'), false
      ) then
        raise exception 'Invalid reward goal' using errcode = '22023';
      end if;
      if (p_goal->>'targetPoints')::numeric <= 0 or (p_goal->>'targetPoints')::numeric > 999 or
          not isfinite((p_goal->>'createdAt')::timestamptz) or
          ((p_goal ? 'completedAt') and not isfinite((p_goal->>'completedAt')::timestamptz)) then
        raise exception 'Invalid reward values' using errcode = '22023';
      end if;
    end if;

    insert into public.reward_settings as existing (user_id, goal_json, updated_at, device_id)
      values (current_user_id, p_goal, p_updated_at, p_device_id)
    on conflict (user_id) do update set
      goal_json = excluded.goal_json,
      updated_at = excluded.updated_at,
      device_id = excluded.device_id
    where (excluded.updated_at, excluded.goal_json is null, excluded.device_id collate "C") >
          (existing.updated_at, existing.goal_json is null, existing.device_id collate "C");
  end if;

  -- A rejected stale write still receives the winner. The upsert lock lasts until commit.
  return query select * from public.reward_settings where user_id = current_user_id;
end;
$$;

revoke all on function public.sync_reward_settings(jsonb, timestamptz, text) from public, anon;
grant execute on function public.sync_reward_settings(jsonb, timestamptz, text) to authenticated;

notify pgrst, 'reload schema';
commit;
