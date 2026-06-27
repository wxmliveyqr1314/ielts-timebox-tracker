create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wallpaper_path text,
  wallpaper_enabled boolean not null default false,
  overlay_opacity smallint not null default 42 check (overlay_opacity between 25 and 70),
  wallpaper_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "user_preferences_select_own" on public.user_preferences;
drop policy if exists "user_preferences_insert_own" on public.user_preferences;
drop policy if exists "user_preferences_update_own" on public.user_preferences;

create policy "user_preferences_select_own"
on public.user_preferences for select to authenticated
using ((select auth.uid()) = user_id);

create policy "user_preferences_insert_own"
on public.user_preferences for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "user_preferences_update_own"
on public.user_preferences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wallpapers',
  'wallpapers',
  false,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "wallpapers_select_own" on storage.objects;
drop policy if exists "wallpapers_insert_own" on storage.objects;
drop policy if exists "wallpapers_update_own" on storage.objects;
drop policy if exists "wallpapers_delete_own" on storage.objects;

create policy "wallpapers_select_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'wallpapers'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "wallpapers_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'wallpapers'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "wallpapers_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'wallpapers'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'wallpapers'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "wallpapers_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'wallpapers'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
