-- =====================================================================
-- FLOREON – PHASE 1: PAGES, MEDIA LIBRARY, EDIT HISTORY
-- Run AFTER 001_base.sql. Safe to re-run.
-- Supabase > SQL Editor > New query > paste everything > Run.
--
-- Adds:
--   * pages         – every page on the public site, built from blocks
--   * media         – the image library (files live in the site-images bucket)
--   * edit_history  – a copy of every page/section before it was changed or deleted
-- Site settings and the sidebar menu are stored in the existing "content"
-- table under the keys siteSettings and siteNav (see 003_seed_pages.sql).
-- The format of pages, blocks, settings and the menu is described in docs/content-model.md.
-- =====================================================================


-- ---------- PAGES ----------
create table if not exists public.pages (
  id          uuid primary key default gen_random_uuid(),
  -- web address without the leading slash: "home" is the front page (/),
  -- "rules" is /rules, "cozymon/faq" is /cozymon/faq
  slug        text not null unique
              check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*$' and char_length(slug) <= 80),
  title       text not null check (char_length(title) between 1 and 120),
  description text not null default '',            -- shown in Google and link previews
  published   boolean not null default false,      -- drafts are only visible to staff
  blocks      jsonb not null default '[]'::jsonb   -- the page content, top to bottom
              check (jsonb_typeof(blocks) = 'array'),
  sort        int not null default 0,              -- order in the admin page list
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

alter table public.pages enable row level security;

drop policy if exists "anyone can read published pages" on public.pages;
create policy "anyone can read published pages"
  on public.pages for select to anon, authenticated
  using (published or public.is_admin());

drop policy if exists "admins can add pages" on public.pages;
create policy "admins can add pages"
  on public.pages for insert to authenticated
  with check (public.is_admin());

drop policy if exists "admins can edit pages" on public.pages;
create policy "admins can edit pages"
  on public.pages for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins can delete pages" on public.pages;
create policy "admins can delete pages"
  on public.pages for delete to authenticated
  using (public.is_admin());

create or replace function public.pages_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists pages_touch on public.pages;
create trigger pages_touch
  before insert or update on public.pages
  for each row execute function public.pages_touch();


-- ---------- MEDIA LIBRARY ----------
create table if not exists public.media (
  id          uuid primary key default gen_random_uuid(),
  path        text not null unique,                -- path inside the site-images bucket
  url         text not null,                       -- public address of the image
  name        text not null default '',            -- original file name
  alt         text not null default '',            -- description for screen readers
  folder      text not null default 'uploads',     -- e.g. faq, news, team, payments
  mime        text,
  size        int,
  width       int,
  height      int,
  created_at  timestamptz not null default now(),
  uploaded_by uuid default auth.uid() references auth.users(id) on delete set null
);

create index if not exists media_newest on public.media (created_at desc);

alter table public.media enable row level security;

drop policy if exists "anyone can read media" on public.media;
create policy "anyone can read media"
  on public.media for select to anon, authenticated
  using (true);

drop policy if exists "admins can add media" on public.media;
create policy "admins can add media"
  on public.media for insert to authenticated
  with check (public.is_admin());

drop policy if exists "admins can edit media" on public.media;
create policy "admins can edit media"
  on public.media for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins can delete media" on public.media;
create policy "admins can delete media"
  on public.media for delete to authenticated
  using (public.is_admin());


-- ---------- EDIT HISTORY (undo) ----------
-- Every time a page or content section is changed or deleted, the OLD version
-- is copied here. The admin site will use it for "Restore a previous version".
create table if not exists public.edit_history (
  id          bigint generated always as identity primary key,
  item_type   text not null check (item_type in ('page', 'content')),
  item_key    text not null,                       -- page id, or content key
  action      text not null check (action in ('update', 'delete')),
  snapshot    jsonb not null,                      -- the full row before the change
  changed_at  timestamptz not null default now(),
  changed_by  uuid default auth.uid() references auth.users(id) on delete set null
);

create index if not exists edit_history_lookup on public.edit_history (item_type, item_key, changed_at desc);

alter table public.edit_history enable row level security;

drop policy if exists "admins can read history" on public.edit_history;
create policy "admins can read history"
  on public.edit_history for select to authenticated
  using (public.is_admin());
-- No insert/update/delete policies: only the triggers below write here.

create or replace function public.keep_page_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.edit_history (item_type, item_key, action, snapshot)
  values ('page', old.id::text, lower(tg_op), to_jsonb(old));
  return coalesce(new, old);
end $$;

drop trigger if exists keep_page_history on public.pages;
create trigger keep_page_history
  after update or delete on public.pages
  for each row execute function public.keep_page_history();

create or replace function public.keep_content_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.edit_history (item_type, item_key, action, snapshot)
  values ('content', old.key, lower(tg_op), to_jsonb(old));
  return coalesce(new, old);
end $$;

drop trigger if exists keep_content_history on public.content;
create trigger keep_content_history
  after update or delete on public.content
  for each row execute function public.keep_content_history();
