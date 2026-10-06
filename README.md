# Floreon – Minecraft Server Website

Plain HTML/CSS/JS site with a Supabase backend (database, staff logins, image storage), hosted on Netlify. No build step.

## Project layout

```
site/                 PUBLIC SITE (floreon.garden) – plain HTML/CSS/JS modules, no build step
  index.html          Page shell (sidebar, top bar); pages are drawn into <main>
  css/styles.css
  js/config.js        Supabase keys
  js/main.js          Loads settings/menu/lists/news, draws pages, real page addresses
  js/blocks.js        How each block type looks on the site
  js/util.js          Small helpers (HTML cleaning, icons)
  js/fallback.js      Built-in copy of the content, used only if the database is down (generated)
  images/             Logos, favicon, link preview
admin/                ADMIN SITE (admin.floreon.garden) – plain JS modules, no build step
  index.html
  css/admin.css
  js/config.js        Supabase keys + public site address
  js/main.js          Login check, sidebar, screen switching
  js/lib/             ui.js (helpers, dialogs, icons), sb.js (all database calls)
  js/views/           One file per screen (dashboard, media, …)
  netlify.toml        Netlify settings for the admin site
supabase/sql/         Database setup, run in order in the Supabase SQL Editor
  001_base.sql          content, posts, staff, image bucket
  002_pages_media.sql   pages, media library, edit history
  003_seed_pages.sql    copies today's pages into the database (generated)
tools/build-seed.mjs  Regenerates 003_seed_pages.sql and site/js/fallback.js (node tools/build-seed.mjs)
tools/legacy/         The original built-in content the seed is made from
docs/content-model.md Format of pages, blocks, settings and the menu
netlify.toml          Netlify settings for the public site
```

## Run it locally (VS Code)

1. Open the folder in VS Code and install the recommended extensions when prompted (Live Server, Prettier, ESLint, GitLens).
2. Right-click `site/index.html` > **Open with Live Server**. The page reloads every time you save.
3. Page addresses like /cozymon/faq work in Live Server too (set up in .vscode/settings.json).

## Set up Supabase (one time)

1. Create a project at supabase.com. Pick the region closest to your players (Singapore for the Philippines).
2. **SQL Editor > New query**: run `supabase/sql/001_base.sql`, then `002_pages_media.sql`, then `003_seed_pages.sql` (one at a time: paste, **Run**, next). "Does not exist, skipping" notices are normal.
3. **Authentication > Sign In / Providers**: turn **off** "Allow new users to sign up". Only you should create accounts.
4. **Authentication > Users > Add user**: create an account for each staff member (email + password, tick "Auto confirm").
5. Copy each staff member's **User UID** and run this in the SQL Editor:
   ```sql
   insert into public.admins (user_id, display_name) values ('PASTE-USER-UID', 'YourName');
   ```
6. **Project Settings > API Keys**: copy the **Project URL** and the **Publishable key** (`sb_publishable_...`) into `SUPABASE` in `js/config.js`.
   Never use the **Secret key** (`sb_secret_...`) or the legacy `service_role` key in this project.
7. Open the staff site (admin/), log in, and edit from there. The public site has no login link on purpose.

## Deploy to Netlify

1. Push this folder to a GitHub repo.
2. Netlify > **Add new site > Import an existing project** > pick the repo. Leave the build command empty; the publish folder (`site`) is set in `netlify.toml`.
3. Every push to `main` redeploys automatically.
4. Add your domain under **Domain management**, then in Supabase **Authentication > URL Configuration** set the Site URL to it.

## Admin site (second Netlify site)

1. Netlify > **Add new site > Import an existing project** > pick the same repo.
2. Set **Base directory** to `admin`. Leave the build command empty; publish `.` is set in `admin/netlify.toml`.
3. Deploy. Log in with the same staff email and password as before.
4. Locally: right-click `admin/index.html` > **Open with Live Server**.

Each site only redeploys when its own folder changes.

## Before going public

- [x] Discord invite in `js/config.js` (set the invite to never expire in Discord).
- [x] Logo images in `images/`.
- [ ] Review the Store perks against the Minecraft Usage Guidelines (kits, extra homes and priority join are the risky ones).
- [ ] Publish the Oneblock pages (they're drafts) and add them to the Menu when they're ready.
- [ ] Replace the placeholder team, vote sites and FAQ pictures.
- [ ] Every change is kept in the staff site's History, so mistakes can be undone.

## Updating CSS or JS

When you change `css/styles.css` or `js/main.js`, bump the `?v=` number on its line in `site/index.html` (for example `?v=6` to `?v=7`). The other JS files are re-checked on every visit (see netlify.toml).

## Editing content

Everything is edited on the staff site (`admin/`, e.g. admin.floreon.garden), which only staff accounts can log in to.
Text fields with formatting are cleaned before display, so scripts and unsafe tags are removed automatically.
