-- =====================================================================
-- FLOREON WEBSITE – SUPABASE SCHEMA
-- Run this once in Supabase: SQL Editor > New query > paste > Run.
-- Safe to re-run: it only creates things that don't exist yet.
--
-- Security model:
--   * Everyone (even logged-out visitors) can READ site content and published posts.
--   * Only users listed in public.admins can ADD, EDIT or DELETE anything.
--   * The public "anon" key in js/config.js can't get around this.
-- =====================================================================


-- ---------- STAFF LIST ----------
-- A logged-in user is only an admin if their account id is in this table.
create table if not exists public.admins (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

alter table public.admins enable row level security;

drop policy if exists "staff can see their own admin row" on public.admins;
create policy "staff can see their own admin row"
  on public.admins for select to authenticated
  using (user_id = auth.uid());
-- No insert/update/delete policies: staff are added from the Supabase dashboard only.

-- Helper used by every write rule below.
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;


-- ---------- SITE CONTENT (FAQs, features, spawns, rules, store, team, ...) ----------
-- One row per section. "key" matches the section names in js/data.js (e.g. czFaqs).
create table if not exists public.content (
  key        text primary key check (key ~ '^[A-Za-z]{2,40}$'),
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.content enable row level security;

drop policy if exists "anyone can read content" on public.content;
create policy "anyone can read content"
  on public.content for select to anon, authenticated
  using (true);

drop policy if exists "admins can add content" on public.content;
create policy "admins can add content"
  on public.content for insert to authenticated
  with check (public.is_admin());

drop policy if exists "admins can edit content" on public.content;
create policy "admins can edit content"
  on public.content for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins can delete content" on public.content;
create policy "admins can delete content"
  on public.content for delete to authenticated
  using (public.is_admin());

-- Stamp who changed a section and when.
create or replace function public.content_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists content_touch on public.content;
create trigger content_touch
  before insert or update on public.content
  for each row execute function public.content_touch();


-- ---------- NEWS POSTS (home page) ----------
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 140),
  body        text not null default '',
  image_url   text,
  pinned      boolean not null default false,
  published   boolean not null default true,
  author_id   uuid default auth.uid() references auth.users(id) on delete set null,
  author_name text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists posts_listing on public.posts (pinned desc, created_at desc);

alter table public.posts enable row level security;

drop policy if exists "anyone can read published posts" on public.posts;
create policy "anyone can read published posts"
  on public.posts for select to anon, authenticated
  using (published or public.is_admin());

drop policy if exists "admins can add posts" on public.posts;
create policy "admins can add posts"
  on public.posts for insert to authenticated
  with check (public.is_admin());

drop policy if exists "admins can edit posts" on public.posts;
create policy "admins can edit posts"
  on public.posts for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins can delete posts" on public.posts;
create policy "admins can delete posts"
  on public.posts for delete to authenticated
  using (public.is_admin());

create or replace function public.posts_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists posts_touch on public.posts;
create trigger posts_touch
  before update on public.posts
  for each row execute function public.posts_touch();


-- ---------- IMAGE STORAGE ----------
-- Public bucket: anyone can VIEW images, only admins can upload, replace or delete them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 5242880,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

drop policy if exists "admins can upload site images" on storage.objects;
create policy "admins can upload site images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'site-images' and public.is_admin());

drop policy if exists "admins can update site images" on storage.objects;
create policy "admins can update site images"
  on storage.objects for update to authenticated
  using (bucket_id = 'site-images' and public.is_admin());

drop policy if exists "admins can delete site images" on storage.objects;
create policy "admins can delete site images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'site-images' and public.is_admin());


-- =====================================================================
-- ADDING A STAFF MEMBER (run separately, after creating their account):
--   1. Supabase > Authentication > Users > Add user (email + password).
--   2. Copy their User UID, then run:
--
--   insert into public.admins (user_id, display_name)
--   values ('PASTE-USER-UID-HERE', 'YourName');
--
-- Removing staff:  delete from public.admins where display_name = 'YourName';
-- =====================================================================
