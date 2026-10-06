# Floreon – Minecraft Server Website

Plain HTML/CSS/JS site with a Supabase backend (database, staff logins, image storage), hosted on Netlify. No build step.

## Project layout

```
site/                 PUBLIC SITE (floreon.garden) – plain HTML/CSS/JS, no build step
  index.html
  css/styles.css
  js/config.js        Settings + starting content
  js/data.js          Everything that talks to Supabase
  js/app.js           Renders the public pages
  js/admin.js         Old admin panel (#admin) – will be replaced by admin/
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
tools/build-seed.mjs  Regenerates 003_seed_pages.sql (node tools/build-seed.mjs)
docs/content-model.md Format of pages, blocks, settings and the menu
netlify.toml          Netlify settings for the public site
```

## Run it locally (VS Code)

1. Open the folder in VS Code and install the recommended extensions when prompted (Live Server, Prettier, ESLint, GitLens).
2. Right-click `site/index.html` > **Open with Live Server**. The page reloads every time you save.
3. Without Supabase keys, the site shows the built-in content from `js/config.js` and the admin login is disabled. That's expected.

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
7. Open the site, click the lock icon, log in, and you can edit everything. Sections you never edit keep showing the built-in content.

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
- [ ] Set `oneblockEnabled: true` only when the Oneblock pages are ready.
- [ ] Replace the placeholder team, vote sites and FAQ pictures.
- [ ] Download a backup from the admin panel now and then.

## Updating CSS or JS

When you change a file in `css/` or `js/`, also bump the `?v=` number on its line in `site/index.html` (for example `?v=4` to `?v=5`). That makes every visitor's browser load the new file.

## Editing content

| What | Where |
|---|---|
| News posts | Admin panel > Whole site > News posts |
| FAQs, features, spawns, legendaries, series guide, About text | Admin panel > Cozymon (or Oneblock) |
| Team, rules, vote sites, store ranks, payment methods | Admin panel > Whole site |
| Discord link, banner pictures | `js/config.js` (then push) |

Text fields that say "simple HTML allowed" are cleaned before display, so scripts and unsafe tags are removed automatically.
